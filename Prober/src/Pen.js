// const fs = require('fs')
const palette = {
  black: 30,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  magenta: 35,
  cyan: 36,
  white: 37
}
const logBuffer = []
class Pen {
  static write(text, color) {
    const bufferLength = logBuffer.push(text)
    if (bufferLength > 20) {
      logBuffer.shift()
    }
    // fs.appendFile('log.txt', text + '\r\n', function (err) {
    //   if (err) throw err
    // })
    if (!(Object.prototype.hasOwnProperty.call(palette, color))) { color = palette.white }
    console.log(`\x1b[${palette[color]}m${new Date()}: %s\x1b[0m`, text)
  }
}

module.exports = { Pen, logBuffer }
