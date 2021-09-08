const API = require('../Api.js')

const getChannels = async (language = 'zh') => {
  const records = []
  /**
   * Cursor for forward pagination.
   * Tells the server where to start fetching the next set of results, in a multi-page response.
   * The cursor value specified here is from the pagination response field of a prior query.
   */
  let cursor = ''
  while (true) {
    const response = await API.twitchAPI('/helix/streams', { language: language, first: 100, after: cursor })
    const liveChannels = response.data.data
    if ((liveChannels.length === 0) || (records.length > 99000)) { break } // calls api no more than 990 times
    liveChannels.map(data => { records.push(data) })
    cursor = response.data.pagination.cursor
  }
  return records
}

module.exports = { getChannels }
if (require.main === module) {
  getChannels(language = "zh").then(res => console.log(res))
}
