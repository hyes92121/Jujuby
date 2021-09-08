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

class Pen {
  static write (text, color) {
    if (!(Object.prototype.hasOwnProperty.call(palette, color))) { color = palette.white }
    console.log(`\x1b[${palette[color]}m${new Date()}: %s\x1b[0m`, text)
  }
}

module.exports = Pen
