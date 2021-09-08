const BaseCache = require('./BaseCache.js')
const API = require('../Api.js');

class StreamInfoCacheError extends Error {
  constructor(message) {
    super(message)
    this.name = 'StreamInfoCacheError'
  }
}

class StreamInfoCache extends BaseCache {
  constructor() { super(); this.childClass = 'StreamInfoCache' }

  getFakeAddr() { /* For testing and debugging purposes */
    const axios = require('axios')
    return axios.get('http://254.243.6.76/').then(r => r)
  }

  async onMiss(channel) {
    await Promise.all([this.getChannelId(channel), this.getChannelAccessToken(channel)])
      .then(response => {
        this.cache[channel] = { channelId: response[0], accessToken: response[1] }
      })
      .catch(error => {
        if (error.isAxiosError) {
          throw error
        } else {
          console.log(error)
          throw new StreamInfoCacheError(error.message) 
        }
      })
  }

  getChannelId(channel) {
    return API.twitchAPI('/helix/users', { login: channel })
      .then(response => response.data.data[0].id ) /* get user id */
      .catch(response => console.log(response))
  }

  getChannelAccessToken(channel) {
    return API.gqlAPI('/gql', API.buildGqlString(channel))
      .then( response => response.data.data.streamPlaybackAccessToken) 
  }

  updateChannelAccessToken(channel) {
    return this.getChannelAccessToken(channel)
      .then(token => {
        this.cache[channel].accessToken = token
        return token
      })
  }
}

const localStreamCache = new StreamInfoCache()

const lookupStreamCache = async (channel) => { return localStreamCache.lookup(channel) }
const updateChannelToken = (channel) => { return localStreamCache.updateChannelAccessToken(channel) }
const getStreamCacheInfo = () => { return localStreamCache.cacheInfo() } 

module.exports = { lookupStreamCache, updateChannelToken, getStreamCacheInfo}

if (require.main === module) {
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }
  const channel = 'lck'
  const test = async (channel) => {
    lookupStreamCache(channel).then(info => console.log(info))
    await sleep(1000)
    lookupStreamCache(channel).then(info => console.log(info))
    await sleep(1000)
    lookupStreamCache(channel).then(info => console.log(info))
    await sleep(1000)
    lookupStreamCache(channel).then(info => console.log(info))
    await sleep(1000)
    lookupStreamCache(channel).then(info => console.log(info))
  }

  test(channel)
}
