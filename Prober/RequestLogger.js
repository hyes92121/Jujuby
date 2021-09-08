const { Pen } = require('./Pen.js')

class RequestLogger {
  constructor() { 
    this.cacheInfoPool = {} 
    this.requestCount = 0 
    this.reportRequestCountInterval = 30 // seconds
    this.reportRequestCountTimer = setInterval(() => {
      let maxLen = [0, 0, 0]
      for (const value of Object.values(this.cacheInfoPool)) {
        value.split(',').forEach((v, i) => { maxLen[i] = Math.max(v.length, maxLen[i]) })
      }
      for (const [key, value] of Object.entries(this.cacheInfoPool)) {
        let fmtStr = value.split(',')
        fmtStr.forEach((v, i) => { fmtStr[i] = `${v}`.padEnd(maxLen[i], ' ') })
        const msg = 'Total: ' + fmtStr[0] + ' | ' + 'Hits: ' + fmtStr[1] + ' | ' + 'Misses: ' + fmtStr[2]
        Pen.write(`${key.padEnd(15, ' ')} -> ${msg}`, 'cyan')
      }
      Pen.write(`Sent requests to Twitch: ${this.requestCount}`, 'magenta')
    }, this.reportRequestCountInterval * 1000)
  }

  addRequestCount() { this.requestCount += 1 }

  getRequestCount() { return this.requestCount }

}

const rlogger = new RequestLogger()
const updateLoggerCacheInfo = (cacheType, info) => { rlogger.cacheInfoPool[cacheType] = info }
const addReqCount = () => { rlogger.addRequestCount() }
const getReqCount = () => { rlogger.getRequestCount() }

module.exports = { updateLoggerCacheInfo, addReqCount, getReqCount } 
