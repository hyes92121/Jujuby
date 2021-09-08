const Docker = require('./utils/docker')
class CacheFlusher {
    constructor() {
      this.setup()
    }
  
    setup() {
      setInterval(() => { Docker.flushCache() }, 60 * 60 * 1000)
    }
}

module.exports = CacheFlusher