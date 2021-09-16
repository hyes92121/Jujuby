/* eslint-disable brace-style */
/* eslint-disable space-infix-ops */
/* eslint-disable promise/param-names */
const Twitch = require('./Twitch.js')
const controllerApi = require('../Utils/controllerApi')
const { Pen } = require('./Pen.js')
const { getTopKChannelsByLanguage } = require('./Aggregator.js')
const { transactionDb } = require('../DataAccess/index.js')
const intervalGenerator = require("../Utils/intervalGenerator.js")

class ProbingPool {
  constructor(language, percentage = 0.8) {
    /* Constant properties. Shouldn't change since object initialization till deletion */
    this.language = language
    this.percentage = percentage
    this.isActive = true

    /* Variables that change across the probing period */
    this.liveProbes = {}
    this.refreshViewerInterval = 3  // minutes
    this.cleanupInterval       = 5  // minutes
    this.refreshInterval       = 19 // minutes

    /* Timers */
    this.cleanUpInactiveProbesTimer = null
    this.refreshTopKChannelsTimer   = null
    this.refreshViewerCountTimer    = null

    /* Network related variables */
    this.networkErrorProbes = 0
    this.refreshFailCount   = 0
  }

  run() { this.setup() }

  setup() {
    /* Cleanup inactive probes can run more frequently, but refreshing topK should be settable */
    this.cleanUpInactiveProbesTimer = setInterval(() => { this.cleanUpInactiveProbes() }, this.cleanupInterval * 60 * 1000)
    this.refreshTopKChannelsTimer = setInterval(() => { this.refreshTopKChannels() }, this.refreshInterval * 60 * 1000)
    this.refreshViewerCountTimer = setInterval(() => { this.refreshViewerCount() }, this.refreshViewerInterval * 60 * 1000)

    this.start()
  }

  async start() {
    getTopKChannelsByLanguage(this.language, this.percentage)
      .then(async channels => {
        const liveViewerCount = {} 
        await Twitch.getStreamInfoBatch(channels).then(data => data.map(x => liveViewerCount[x.user_login] = x.viewer_count ))
        /* After obtaining viewer count for each channel, then start probing for each channel */
        let initStatus = true
        for (const channel of channels) {
          if (initStatus) { await new Promise(r => setTimeout(r, 2000)); initStatus = false } // wait for cache to initialize
          else { await new Promise(r => setTimeout(r, 1500)) } // prevent sending burst of requests
          this.liveProbes[channel] = new StreamProbe(channel, this.language)
          this.liveProbes[channel].updateViewerCount(liveViewerCount[channel])
        }
      })
  }

  async refreshTopKChannels() {
    Pen.write('Refreshing top k channels...', 'blue')
    const oldTopKChannels = new Set(Object.keys(this.liveProbes))
    getTopKChannelsByLanguage(this.language, this.percentage)
      .then(async (channels) => {
        const newTopKChannels = new Set(channels)
        const toBeAdded = [...newTopKChannels].filter(x => !oldTopKChannels.has(x))
        const toBeDeleted = [...oldTopKChannels].filter(x => !newTopKChannels.has(x))
        if (toBeAdded.length) { Pen.write(`Adding ${toBeAdded}`, 'blue') }
        if (toBeDeleted.length) { Pen.write(`Clearing ${toBeDeleted}`, 'blue') }

        for (const channel of toBeAdded) {
          if (this.isActive) { 
            this.liveProbes[channel] = new StreamProbe(channel, this.language) 
            await new Promise(r => setTimeout(r, 1500)) /* Prevent burst of packets */
          }
        }
        for (const channel of toBeDeleted) {
          if (channel in this.liveProbes) this.liveProbes[channel].clearProbingFunc()
        }
      })
      .catch((error) => {
        this.refreshFailCount += 1
        Pen.write(`${error.message}. Retry getting all channels. Refresh failed ${this.refreshFailCount} times`, 'red')
        if (this.refreshFailCount > 3) {
          controllerApi.reportError(3)
          Pen.write('Reported error to controller')
        }
      })
  }

  async refreshViewerCount() {
    Pen.write('Refreshing viewer count...', 'blue')
    Twitch.getStreamInfoBatch(Object.keys(this.liveProbes))
      .then(data => data.map(x => { 
        if (this.liveProbes[x.user_login].isActive) { 
          const oldViewerCount = this.liveProbes[x.user_login].getViewerCount()
          this.liveProbes[x.user_login].updateViewerCount(x.viewer_count) 
          Pen.write(`Channel ${x.user_login} viewer updated from ${oldViewerCount} to ${this.liveProbes[x.user_login].getViewerCount()}`, 'white')
        }
      }))
  }

  cleanUpInactiveProbes() {
    Pen.write('Cleaning up inactive probes...', 'magenta')
    for (const [channel, probe] of Object.entries(this.liveProbes)) {
      if (!probe.isActive) {
        if (!probe.networkIsUp) {
          this.networkErrorProbes += 1
          Pen.write(`Prober "${probe.channel} cannot connect to the Internet."`, 'red')
        }
        delete this.liveProbes[channel]
        Pen.write(`Deleted ${channel} from probing list`, 'magenta')
      }
    }
    if (this.networkErrorProbes > 15) {
      this.stop()
      Pen.write(`VPN connection ${process.env.CONNECT} is down. Reporting incident to controller...`, 'red')
      // TODO: report incident to controller and output log file
      /*
       * axios.post({CONTROLLER_CONTAINER_ID}/${APIRoot}/error/{THIS_CONTAINER_ID})
       */
      controllerApi.reportError(3)
    } else { Pen.write(`Current number of live probes: ${Object.keys(this.liveProbes).length}`, 'magenta') }
  }

  async stop() {
    clearInterval(this.cleanUpInactiveProbesTimer)
    clearInterval(this.refreshTopKChannelsTimer)
    clearInterval(this.refreshViewerCountTimer)
    
    while (Object.keys(this.liveProbes).length !== 0) {
      // eslint-disable-next-line no-unused-vars
      for (const [_, probe] of Object.entries(this.liveProbes)) { probe.clearProbingFunc(); await new Promise(r => setTimeout(r, 300)) }
      this.cleanUpInactiveProbes()
    }
    this.isActive = false
  }

  // information reporting methods
  getLiveProbes() { return Object.keys(this.liveProbes) }
}

class StreamProbe {
  constructor(channel, language) {
    this.channel = channel
    this.language = language
    // TODO: Load channel specific info from cache instead of function accessing cache directly
    this.id = null
    this.token = null
    this.probingTimer = null
    this.createdTimestamp = this.getCurrentTimeString()
    this.max = 5 // minutes
    this.min = 1 // minutes
    this.isActive = true
    this.addrPool = {}
    this.currentViewerCount = null 

    this.transactionBuffer = {}
    this.viewerBuffer = {}
    // modes: 'random', 'backoff-strict', 'exp-backoff'
    this.intervalGenerator = new intervalGenerator('random' ,this.max, this.min)

    // network connection related variables
    this.networkErrorCount = 0
    this.networkIsUp = true

    this.setup()
  }

  setup() {
    Twitch.lookupStream(this.channel)
      .then(response => { this.id = response.channelId; this.token = response.accessToken })
      .then(() => { this.start() })
      .catch(error => { this.handleError(error) })
  }

  start() {
    Twitch.getEdgeAddrByChannel(this.channel)
      .then(addr => { this.onAddressHit(addr) })
      .then(() => { this.setProbingFunc() })
      .catch(error => { this.handleError(error) })
  }

  setProbingFunc() {
    this.probingTimer = setTimeout(() => {
      Twitch.getEdgeAddrByChannel(this.channel)
        .then(addr => { this.onAddressHit(addr) })
        .then(() => { this.setProbingFunc() })
        .catch(error => { this.handleError(error) })
    }, this.intervalGenerator.generateInterval() * 60 * 1000)
  }

  onAddressHit(addr) {
    Pen.write(`Edge server of ${this.channel}(${this.language}) is ${addr}`, 'white')
    if (Object.prototype.hasOwnProperty.call(this.addrPool, addr)) {
      this.addrPool[addr] += 1
      // TODO: write transaction to DB
    } else {
      this.addrPool[addr] += 1
    }
    this.intervalGenerator.updateServerCount(Object.keys(this.addrPool).length)
    
    const timestamp = this.getCurrentTimeString()
    this.transactionBuffer[timestamp] = addr
    this.viewerBuffer[timestamp] = this.currentViewerCount
  }

  async handleError(originalError) {
    try {
      if (originalError.isAxiosError) { /* Error was generated by axios */
        const axiosError = originalError
        if (axiosError.response === undefined) { /* request never got a server response */ 
          const errorCode = axiosError.code
          switch(errorCode) {
            case 'ETIMEDOUT':
            case 'ECONNRESET':
            case 'EAI_AGAIN':
            case 'ECONNABORTED': 
              Pen.write(`${axiosError.message}. Pause probing for ${this.channel} for ten minutes.`, 'red')
              clearTimeout(this.probingTimer)
              await new Promise(r => setTimeout(r, 10 * 60 * 1000))
              this.start()
              break 
 
            default:
              Pen.write('Unknown network error occured. Printing full error object.', 'red')
              Pen.write('Wait ten minutes before re-starting.', 'red')
              console.log(axiosError)

              clearTimeout(this.probingTimer)
              await new Promise(r => setTimeout(r, 10 * 60 * 1000))
              this.start()
          }
        } else {
          const errorStatus = axiosError.response.status
          const errorMessage = axiosError.response.data[0].error
          const errorCode = axiosError.response.data[0].error_code
          const outputErrorMsg = `Channel: "${this.channel}" returned status "${errorStatus}" with error code "${errorCode}" and message "${errorMessage}"`
          Pen.write(outputErrorMsg, 'red')
            
          switch (errorStatus) {
            /* 404: page not found, meaning channel is offline */
            case 404:
              Pen.write(`Channel ${this.channel} is offline. Clearing probe...`, 'yellow')
              this.clearProbingFunc()
              break
  
            /* 403: forbidden. Currently identified two cases:
              - content_geoblocked (e.g. franchiseglobalart )
              - nauth_token_expired
             */
            case 403:
              switch (errorCode) {
                case 'content_geoblocked': /* Simply ignore these channels */
                  this.clearProbingFunc()
                  break
                case 'nauth_token_expired': /* More complex to deal with. Details below.  */
                  clearTimeout(this.probingTimer)
  
                  let updateSuccess = false /* May recieve timeout while getting new token */
                  while (!updateSuccess) {
                    try {
                      Pen.write(`Updating token for channel ${this.channel}`, 'yellow')
                      this.token = await Twitch.updateChannelToken(this.channel)
                      updateSuccess = true 
                    } catch (renewTokenError) {
                      switch (renewTokenError.code) {
                        case 'ETIMEDOUT':
                        case 'ECONNRESET':
                          Pen.write(`${renewTokenError.message}. Pause probing for ${this.channel} for ten minutes.`, 'red')
                          break
              
                        default:
                          Pen.write(`Unknown error occured while renewing token. Pause probing for ${this.channel} for ten minutes.`, 'red')
                          console.log(renewTokenError)
                      }
                      /* No matter what the error is, wait for a period of time before renewing token again */
                      await new Promise(r => setTimeout(r, 10 * 60 * 1000))
                    }
                  }
                  /* 
                   * 'while' loop breaks on a successful token update.
                   * Else it will stuck waiting forever. 
                   * This is to prevent send requests to an already over-loaded server.
                   */
                  Pen.write(`Restarting probing for channel ${this.channel}`, 'yellow')
                  this.start() 
                  break
              }
              break
  
            case 502: 
              Pen.write(`502 bad gateway for ${this.channel}`, 'red') 
  
            default:
              this.clearProbingFunc()
          }
        } 

      } else { /* Error didn't originate from axios. Examine furthurmore */
        switch(originalError.name) {
          case 'getAddrError':
            Pen.write(`Error from getEdgeAddr.js: ${originalError.message}`, 'red')
            break
          case 'StreamInfoCacheError':
            Pen.write(`Error from streamInfoCache.js: ${originalError.message}`, 'red')
            break
          default:
            Pen.write(`CAUTION: Cannot determine what kind of error this is!!`, 'red')
            Pen.write(`${originalError}`, 'red')
        }
      }
    } catch (unknownError) {
      /* 
       * Not sure how to handle error here 
       */
      this.networkErrorCount += 1
      if (this.networkErrorCount > 10) {
        this.networkIsUp = false
        this.clearProbingFunc()
      } else {
        Pen.write(`Logging unknown error...\n`, 'red')
        console.log(unknownError)
        Pen.write(`Logging original error...\n`, 'red')
        console.log(originalError)

        Pen.write(`Nord is probally changing its servers. Probe for ${this.channel} temporarily sleeping for 60 seconds...`, 'red')
        clearTimeout(this.probingTimer)
        await new Promise(r => setTimeout(r, 60 * 1000))
        this.start()
      }
    }
  }

  clearProbingFunc() {
    const serverList = Object.keys(this.addrPool)

    clearTimeout(this.probingTimer)
    this.isActive = false
    if (serverList.length > 0) { this.writeTransaction() }

    Pen.write(`${this.channel} cleared. All probed addresses: ${serverList}`, 'yellow')
  }

  writeTransaction() {
    const transaction = {
      vpnServerId: process.env.CONNECT,
      channel: this.channel,
      language: process.env.LANGUAGE,
      start: this.createdTimestamp,
      end: this.getCurrentTimeString(),
      transactionList: this.transactionBuffer,
      viewerList: this.viewerBuffer,
      addrPool: Object.keys(this.addrPool)
    }
    transactionDb.insert(transaction)
      .then(res => {
        if (res) { Pen.write(`Finished writing transaction for ${this.channel} to database`, 'green') }
      })
  }

  // TODO: set timer interval based on frequency of return edge address (exponetial backoff)
  randomNum() { return Math.random() * (this.max - this.min) + this.min }

  getCurrentTimeString() { return new Date().toISOString().replace(/\..+/, '') }

  setTimerRange(min, max) { this.min = min; this.max = max }
  
  updateViewerCount(vc) { this.currentViewerCount = vc }
  getViewerCount() { return this.currentViewerCount }
}

module.exports = ProbingPool

if (require.main === module) {
  const axios = require('axios')
  // const probe = new StreamProbe('loltyler1')
  // const probingPool = new ProbingPool('zh')
  // probingPool.run()

  class MyCustomError extends Error {
    constructor(message) {
      super(message)
      this.name = 'MyCustomError'
    }
  }

  function getFakeAddr() {
    return axios.get('http://254.243.6.76/')
      .then(r => r )
  }

  async function x(xx) {
    await Promise.all([getFakeAddr(), getFakeAddr()]) 
      .then(r => console.log(r))
      .catch(error => {
        if (error.isAxiosError && (typeof xx === 'string')) {
          throw error
        } else {
          throw new MyCustomError(error.message) 
        }
      })
  }

  function run(xx) {
    x(xx)
    .then(r => console.log(r)) 
    .catch(e => { 
      console.log('Catched inside function "run" ')
      console.log(`Error: ${e.code} | Message: ${e.message}`) 
    }) 
  }

  run('123')
}
