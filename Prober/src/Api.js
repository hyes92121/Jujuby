const axios = require('axios')
const http = require('http')
const https = require('https')
const { MongoTimeoutError } = require('mongodb')
const { URL } = require('url') // (native) provides utilities for URL resolution and parsing
const { lookupDNSCache } = require('../Cache/DNSCache.js')
const { addReqCount, getReqCount } = require('./RequestLogger.js')
const { Pen } = require('./Pen.js')

/* Not sure where this is still used. Leaving it here for reference */
const clientIdForOldApi = 'kimne78kx3ncx6brgo4mv6wki5h1ko'
/**
   * The following arguments are required for a successful request to Twitch's helix API: Client ID, Client secret, Access token.
   * The access token is obtained from api: https://id.twitch.tv/oauth2/token taking client_id, client_secret, and grant_type as arguments.
   * Client credentials are listed below. The "grant_type" variable should always be "client_credentials". 
   * The access token has a valid duration in which it will expire once exceeded and requires obtaining a new one.
   * We can know when the token expires if we get an 401 response from the helix api. 
   * See https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#oauth-client-credentials-flow for more reference.  
   * There is a renewal method that takes the grant_type as "refresh_token" as opposed to "client_credentials".
   * That is for a separate token type, and does not work in our case.
   */
const clientIdForHelixApi = '4q2n7zlq4tvwngsh0102dl649camkt'
const clientSecret = 'cce6pbnf5h0b0gpieg4zj28anmnkl2'
const accessToken = 'c98538gkrt1xsiibqxqpwtcr3ew2i0'

/* Add axios interceptor to do address replacement before every request */
const axiosLookupBeforeRequest = axios.create({
  // 30 sec timeout
  timeout: 30 * 1000,

  //keepAlive pools and reuses TCP connections, so it's faster
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
  
  //follow up to 10 HTTP 3xx redirects
  maxRedirects: 10,
  
  //cap the maximum content length we'll accept to 50MBs, just in case
  maxContentLength: 50 * 1000 * 1000
})

// Axios REQUEST interceptor 
axiosLookupBeforeRequest.interceptors.request.use(async (config) => {
  addReqCount()

  const urlObj = new URL(config.url)
  const addr = await lookupDNSCache(urlObj.hostname)

  config.headers.Host = urlObj.hostname // need original host name for TLS certificate
  urlObj.host = addr
  config.url = urlObj.toString()

  // Start time counter for measuring RTT
  config.metadata = {startTime: new Date()}
  return config
})

// Axios RESPONSE interceptor 
axiosLookupBeforeRequest.interceptors.response.use(async (response) => {
  response.config.metadata.endTime = new Date()
  response.duration = response.config.metadata.endTime - response.config.metadata.startTime
  Pen.write(`RTT for hostname: ${response.request.connection.servername}: ${response.duration}`, 'white')
  return response 
})

const buildOptions = (api, args) => {
  /**
   * Builds request arguments based on API type
   * Public APIs have different argument format than private ones
   */
  const options = {}
  const acceptType = 'application/vnd.twitchtv.v5+json'
  const urlObj = new URL(api)
  switch (urlObj.hostname) {
    case 'api.twitch.tv':
      if (urlObj.pathname.split('/').slice(-1)[0] === 'access_token') {
        // console.log('Using old api token')
        options.headers = { Accept: acceptType, 'Client-Id': clientIdForOldApi }
      } else {
        // console.log('Using helix token')
        options.headers = { 
          Accept: acceptType, 
          Authorization: `Bearer ${accessToken}`, 
          'Client-Id': clientIdForHelixApi 
        }
      }
      options.params = { ...{ as3: 't' }, ...args }
      break
    case 'id.twitch.tv':
      options.headers = { Authorization: `OAuth ${accessToken}` }
      break
    case 'gql.twitch.tv':
      options.headers = { 'Client-ID': clientIdForOldApi, 'User-Agent': 'Mozilla/4.0; (UserAgent/1.0)' }
    case 'usher.ttvnw.net':
    case 'tmi.twitch.tv':
      options.params = { ...{ client_id: clientIdForHelixApi }, ...args }
      break
  }

  return options
}

class API {
  static axiosLookupBeforeGet(api, args) { return axiosLookupBeforeRequest.get(api, args) }

  /**
   * Code template to renew access token.
   */

  static authAPI(type, args) {
    const api = 'https://id.twitch.tv'
    if (type === 'request') { // request for api token
      return axiosLookupBeforeRequest.post(api + `/oauth2/token?client_id=${clientIdForHelixApi}&client_secret=${clientSecret}&grant_type=client_credentials`, buildOptions(api, args))
    } else if (type === 'validate') { // validate current token
      return axiosLookupBeforeRequest.get(api + '/oauth2/validate', buildOptions(api, args))
    }
  }

  static twitchAPI(path, args) {
    const api = `https://api.twitch.tv${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static usherAPI(path, args) {
    const api = `https://usher.ttvnw.net${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static hostingAPI(path, args) {
    const api = `https://tmi.twitch.tv${path}`
    return axiosLookupBeforeRequest.get(api, buildOptions(api, args))
  }

  static gqlAPI(path, data, args) {
    const api = `https://gql.twitch.tv${path}`
    return axiosLookupBeforeRequest.post(api, data, buildOptions(api, args))
  }

  static buildGqlString(channel) {
    const gqlData = {
      "operationName":"PlaybackAccessToken_Template",
      "query":"query PlaybackAccessToken_Template($login: String!, $isLive: Boolean!, $vodID: ID!, $isVod: Boolean!, $playerType: String!) {  streamPlaybackAccessToken(channelName: $login, params: {platform: \"web\", playerBackend: \"mediaplayer\", playerType: $playerType}) @include(if: $isLive) {    value    signature    __typename  }  videoPlaybackAccessToken(id: $vodID, params: {platform: \"web\", playerBackend: \"mediaplayer\", playerType: $playerType}) @include(if: $isVod) {    value    signature    __typename  }}",
      "variables":{
          "isLive":true,
          "login":channel,
          "isVod":false,
          "vodID":"",
          "playerType":"site"
      }
    }
    return JSON.stringify(gqlData)
  }

  static clearReportTimer() { clearInterval(reportRequestCountTimer) }

  static getRequestCount() { return getReqCount() }
}

/* For testing */
if (require.main === module) {
  const channel = 'lck'
  const sleep = async (ms) => {
    return new Promise(resolve => {
      setTimeout(resolve, ms)
    })
  }

  const test = async () => {
    await API.twitchAPI(`/api/channels/lck/access_token`)
      .then(response => console.log(response.data))
  }

  const testUsherToken = async () => {
    API.gqlAPI('/gql', API.buildGqlString('lck'))
      .then( (response) => {
        console.log(response.data.data.streamPlaybackAccessToken)
      }) 
  }
  

  function onError(e) {
    console.log(e)
    console.log(e.name)
    console.log(e.message)
    console.log((e instanceof TypeError))
    console.log('Dealing with timeout error....')
  } 
  function foo() {
    return axiosLookupBeforeRequest.get("http://254.243.6.76/")
  }
  function bar() {
    return foo()
      .then(r => r.data)
  }
  function baz() {
    bar()
      .then(r => r.data)
      .catch(e => onError(e))
  }

  async function inputTypeError(x) {
    if (typeof x === "string") {
      console.log('Valid input')
    } else {
      console.log(typeof x)
      throw TypeError('Wrong input type!') 
    }
  }

  function rtnPromise(x) {
    return new Promise(async (resolve, reject) => {
      await inputTypeError(x).catch(error => { reject(error) })
      resolve('Great guess!')
    })
  }

  function rtnPromise2(x) { return rtnPromise(x).then(x => x) } 

  function run(x) {
    rtnPromise2(x)
      .then(r => { console.log(r) })
      .catch(error => { console.log(`Uh-oh, encountered error: ${error.message}!!`)})
  }
  
  // run(123)
  testUsherToken()
  // baz()
}

module.exports = API
