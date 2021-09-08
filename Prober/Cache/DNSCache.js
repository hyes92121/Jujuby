const dns = require('dns')
const util = require('util')
const BaseCache = require('./BaseCache.js')

class DnsCache extends BaseCache {
  constructor() {
    super()
    this.childClass = 'DnsCache'
    this.dnsLookup = util.promisify(dns.lookup)
  }

  async onMiss(hostname) {
    await this.dnsLookup(hostname).then(response => { this.cache[hostname] = response.address })
  }
}

const localDnsCache = new DnsCache()

const lookupDNSCache = async (hostname) => { return localDnsCache.lookup(hostname) }
const getDNSCacheInfo = () => { return localDnsCache.cacheInfo() } 

module.exports = { lookupDNSCache, getDNSCacheInfo }
