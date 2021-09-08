/* eslint-disable brace-style */
/* eslint-disable space-infix-ops */
/* eslint-disable promise/param-names */
const Twitch = require('./Twitch.js')
const { Pen } = require('./Pen.js')
const { getTopKChannelsByLanguage } = require('./Aggregator.js')
const { transactionDb } = require('./DataAccess/index.js')

class ProbingPool {
  constructor (language) {
    /* Constant properties. Shouldn't change since object initialization till deletion */
    this.language = language
    this.isActive = true

    /* Variables that change across the probing period */
    // TODO: let timer interval to be settable by api
    this.liveProbes = {}
    this.cleanupInterval = 1 // minutes
    this.refreshInterval = 2 // minutes

    /* Timers */
    this.cleanUpInactiveProbesTimer = null
    this.refreshTopKChannelsTimer = null

    // this.setup()
  }

  setup () {
    /* Cleanup inactive probes can run more frequently, but refreshing topK should be settable */
    this.cleanUpInactiveProbesTimer = setInterval(() => { this.cleanUpInactiveProbes() }, this.cleanupInterval*60*1000)
    this.refreshTopKChannelsTimer = setInterval(() => { this.refreshTopKChannels() }, this.refreshInterval*60*1000)
    this.start()
  }

  run () { this.setup() }

  async start () {
    getTopKChannelsByLanguage(this.language)
      .then(async channels => {
        let initStatus = true
        for (const channel of channels) {
          if (initStatus) { await new Promise(r => setTimeout(r, 2000)); initStatus = false } // wait for cache to initialize
          else { await new Promise(r => setTimeout(r, 500)) } // prevent sending burst of requests
          this.liveProbes[channel] = new StreamProbe(channel)
        }
      })
  }

  async refreshTopKChannels () {
    Pen.write('Refreshing top k channels...', 'blue')
    const oldTopKChannels = new Set(Object.keys(this.liveProbes))
    getTopKChannelsByLanguage(this.language)
      .then(channels => {
        const newTopKChannels = new Set(channels)
        const toBeAdded = [...newTopKChannels].filter(x => !oldTopKChannels.has(x))
        const toBeDeleted = [...oldTopKChannels].filter(x => !newTopKChannels.has(x))
        if (toBeAdded.length) { Pen.write(`Adding ${toBeAdded}`, 'blue') }
        if (toBeDeleted.length) { Pen.write(`Clearing ${toBeDeleted}`, 'blue') }

        for (const channel of toBeAdded) {
          if (this.isActive) { this.liveProbes[channel] = new StreamProbe(channel) }
        }
        for (const channel of toBeDeleted) {
          if (channel in this.liveProbes) this.liveProbes[channel].clearProbingFunc()
        }
      })
  }

  cleanUpInactiveProbes () {
    Pen.write('Cleaning up inactive probes...', 'magenta')
    for (const [channel, probe] of Object.entries(this.liveProbes)) {
      if (!probe.isActive) {
        delete this.liveProbes[channel]
        Pen.write(`Deleted ${channel} from probing list`, 'magenta') }
    }
    Pen.write(`Current number of live probes: ${Object.keys(this.liveProbes).length}`, 'magenta')
  }

  stop () {
    clearInterval(this.cleanUpInactiveProbesTimer)
    clearInterval(this.refreshTopKChannelsTimer)
    while (Object.keys(this.liveProbes).length !== 0) {
      // eslint-disable-next-line no-unused-vars
      for (const [_, probe] of Object.entries(this.liveProbes)) { probe.clearProbingFunc() }
      this.cleanUpInactiveProbes()
    }
    this.isActive = false
  }

  // information reporting methods
  getLiveProbes () { return Object.keys(this.liveProbes) }
}

class StreamProbe {
  constructor (channel) {
    this.channel = channel
    // TODO: Load channel specific info from cache instead of function accessing cache directly
    this.id = null
    this.token = null
    this.probingTimer = null
    this.createdTimestamp = this.getCurrentTimeString()
    this.max = 1 // minutes
    this.min = 5 // minutes
    this.isActive = true
    this.serverPool = {}
    this.transactionBuffer = {}

    this.setup()
  }

  setup () {
    Twitch.lookupStream(this.channel)
      .then(response => { this.id = response.channelId; this.token = response.accessToken })
      .then(() => { console.log(this.id); console.log(this.token) })
      .then(() => { this.start() })
  }

  start () {
    Twitch.getEdgeAddrByChannel(this.channel)
      .then(addr => { this.onAddressHit(addr) })
      .then(() => { this.setProbingFunc() })
      .catch(error => { this.handleError(error) })
  }

  setProbingFunc () {
    this.probingTimer = setTimeout(() => {
      Twitch.getEdgeAddrByChannel(this.channel)
        .then(addr => { this.onAddressHit(addr) })
        .then(() => { this.setProbingFunc() })
        .catch(error => { this.handleError(error) })
    }, this.randomNum() * 60 * 1000)
  }

  onAddressHit (addr) {
    Pen.write(`Edge server of ${this.channel} is ${addr}`, 'white')
    if (Object.prototype.hasOwnProperty.call(this.serverPool, addr)) {
      this.serverPool[addr] += 1
      // TODO: write transaction to DB
    } else {
      this.serverPool[addr] += 1
    }
    this.transactionBuffer[this.getCurrentTimeString()] = addr
  }

  handleError (error) {
    const errorStatus = error.response.status
    const errorMessage = error.response.data[0].error
    const errorCode = error.response.data[0].error_code
    const outputErrorMsg = `Channel: "${this.channel}" returned status "${errorStatus}" with error code "${errorCode}" and message "${errorMessage}"`

    Pen.write(outputErrorMsg, 'red')

    switch (errorStatus) {
      /* 404: page not found, meaning channel is offline */
      case 404:
        this.clearProbingFunc()
        break

      /* 403: forbidden, currently I've identified two cases:
         - content_geoblocked (e.g. franchiseglobalart )
         - nauth_token_expired
      */
      case 403:
        // use switch case instead of if/else in case there are other kinds of errors in the future
        switch (errorCode) {
          case 'content_geoblocked':
            this.clearProbingFunc()
            break
          case 'nauth_token_expired':
            clearTimeout(this.probingTimer)
            Pen.write(`Updating token for channel ${this.channel}`, 'yellow')
            Twitch.updateChannelToken(this.channel)
              .then((token) => {
                this.token = token
                Pen.write(`Restarting probing for channel ${this.channel}`, 'yellow')
                this.start()
              }) // restart probing with new token
            break

          case 'nauth_sig_invalid':
            clearTimeout(this.probingTimer)
            Pen.write(`Updating token for channel ${this.channel}`, 'yellow')
            Twitch.updateChannelToken(this.channel)
              .then((token) => {
                this.token = token
                Pen.write(`Restarting probing for channel ${this.channel}`, 'yellow')
                this.start()
              }) // restart probing with new token
            break
        }
        break

      default:
        // TODO: some logic to handle other errors (e.g. server errors)
        this.clearProbingFunc()
    }
  }

  clearProbingFunc () {
    const serverList = Object.keys(this.serverPool)

    clearTimeout(this.probingTimer)
    this.isActive = false
    if (serverList.length > 0) { this.writeTransaction() }

    Pen.write(`${this.channel} cleared. All probed addresses: ${serverList}`, 'yellow')
  }

  writeTransaction () {
    const channel = this.channel
    const exitTimeStamp = this.getCurrentTimeString()
    const startTimeStamp = this.createdTimestamp
    const transaction = {
      channel: channel,
      start: startTimeStamp,
      end: exitTimeStamp,
      transactionList: this.transactionBuffer,
      serverPool: Object.keys(this.serverPool)
    }
    transactionDb.insert(transaction)
      .then(res => {
        if (res) {
          Pen.write(`Finished writing transaction for ${this.channel} to database`, 'green')
        }
      })
  }

  // TODO: set timer interval based on frequency of return edge address (exponetial backoff)
  randomNum () { return Math.random() * (this.max - this.min) + this.min }

  getCurrentTimeString () { return new Date().toISOString().replace(/\..+/, '') }

  setTimerRange (min, max) { this.min = min; this.max = max }
}

/* if (require.main === module) {
  const main = async () => {
    const pool = new ProbingPool('zh')
    await new Promise(r => setTimeout(r, 5*60*1000))
    pool.stop()
  }
  main()
}

*/

if (require.main === module) {
  const main = async () => {
    const probe = new StreamProbe('whoami1408')
  }
  main()
}

module.exports = ProbingPool
