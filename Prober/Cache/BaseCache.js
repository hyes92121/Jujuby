const { updateLoggerCacheInfo } = require('../src/RequestLogger')
const { Pen } = require('../src/Pen.js')

class BaseCache {
  constructor () {
    this.cache = {}
    this.childClass = null
    this.cacheHits = 0
    this.cacheMisses = 0
    this.totalLookups = 0 
  }

  lookup (entry) {
    return new Promise(async (resolve, reject) => {
      if (!this.cache[entry]) {
        this.cacheMisses += 1
        Pen.write(`${this.childClass} cache miss: ${entry}`, 'white')
        await this.onMiss(entry).catch(error => reject(error))
      } else { this.cacheHits += 1 }
      this.totalLookups += 1 
      updateLoggerCacheInfo(this.childClass, this.cacheInfo())
      
      resolve(this.cache[entry])
    })
  }

  async onMiss () {
    throw new Error('Function onMiss is not implemented')
  }

  cacheInfo() {
    return `${this.totalLookups},${this.cacheHits},${this.cacheMisses}` // total, hits, misses
  }
}

module.exports = BaseCache
