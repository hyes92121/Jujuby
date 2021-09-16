/**
 * This module is deprecated and is not used in any portion of the code.
 */

const { twitchAPI, hostingAPI } = require('./api.js')
const { lookupIdBeforeGet } = require('./helper.js')

export class Checker {
  // TODO: add DB and DNS check

  static hosting (channel) {
    return lookupIdBeforeGet(channel)
      .then(id => { return { include_logins: 1, host: id } })
      .then(params => hostingAPI('/hosts', params))
      .then(response => {
        const hostInfo = response.data.hosts[0]
        if (('target_login' in hostInfo) && (hostInfo.target_login.toLowerCase() !== channel)) {
          return true
        }
        return false
      })
  }

  static online (channel) {
    return twitchAPI('/helix/users', { login: channel })
      .then(response => response.data.data[0].id) // get channel id
      .then(id => twitchAPI('/helix/streams', { user_id: id }))
      .then(response => {
        const stream = response.data.data
        // TODO: stream might be undefined instead of null
        if (stream) { return true }
        return false
      })
  }
}
