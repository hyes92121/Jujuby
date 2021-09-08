const shortid = require('shortid')

const ID = Object.freeze({
  makeID: shortid.generate,
  isValid: shortid.isValid
})

module.exports = ID
