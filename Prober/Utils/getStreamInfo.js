const API = require('../src/Api.js')

function buildArgs(streams) {
  streams = streams.map(x => `user_login=${x}`)
  return streams.join('&')
}

async function batchGetStreamInfo(streams) {
  /**
   * Takes an array of channels(user logins) as input and calls the /helix/streams API.
   * The API takes up to 100 channels at a time, and returns channel info for all selected channels. 
   * This approach saves bandwidth and lessens the burden on Twitch's API servers. 
   */

  let totalStreamsInfo = []

  let start = 0
  let end   = streams.length
  let chunk = 100
  for (start; start<end; start+=chunk) {
    const queryString = buildArgs(streams.slice(start, start+chunk))
    await API.twitchAPI(`/helix/streams?${queryString}`).then(response => response.data.data.map(x => totalStreamsInfo.push(x)))
  }
  return totalStreamsInfo
}

module.exports = { batchGetStreamInfo }

if (require.main === module) {
  const { getChannels } = require('./getChannels')
  
  const main = async () => {
    const response = await getChannels('zh')
    streams = response.map(x => x.user_login)
    console.log(streams.length)
    batchGetStreamInfo(streams).then(data => data.map(x => console.log(`${x.user_login}: ${x.viewer_count}`)))
  }
  main()
}