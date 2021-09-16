const { Pen } = require('../src/Pen.js')

class intervalGenerator {
  constructor(mode, max, min) {
    this.mode = mode
    this.max = max
    this.min = min
    this.serverCount = 0
    this.base = (this.max - this.min) / 10
    this.totalIntervals = 0
    this.epsilon = (this.max - this.min) / 10
  }
  // TODO: need to introduce randomness for backoff-strict and exp-backoff. Else there will be 
  // bursts of packets in the lower viewer count region. 
  generateInterval() {
      this.totalIntervals += 1
      let interval
      if (this.mode == 'backoff-strict'){
          if (this.serverCount == 0) {
            // irregular behavior, an Error might have happened
            interval = this.min
          } else {
          // Server Count - Total Request Ratio
          var SCTR = this.serverCount/this.totalIntervals
          // interval strictly between max and min
          interval = this.min + (this.max - this.min) * ((1 - SCTR + this.epsilon) ** SCTR)
          }
      } else if (this.mode == 'exp-backoff') {
          if (this.serverCount == 0) {
            // irregular behavior, an Error might have happened
            interval = this.min
          } else {
            // exponential backoff 
            interval = this.min + this.base * (2**(this.totalIntervals/this.serverCount))
          }
      } else {
        // Default random
        interval = Math.random() * (this.max - this.min) + this.min 
      }
      Pen.write(`Interval: ${interval}`, 'blue')
      return interval
  }

  updateServerCount(serverCount) {
      this.serverCount = serverCount
  }
}

if (require.main === module) {
  ig = new intervalGenerator('backoff-strict' ,5, 1)
  ig.generateInterval() 
}

module.exports = intervalGenerator
