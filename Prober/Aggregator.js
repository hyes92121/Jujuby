const { getTopKChannels } = require('./Utils/getTopKChannels.js')

class Aggregator {
  static getTopKChannelsByLanguage(language = 'zh', percentage = 0.8) { return getTopKChannels(language, percentage) }
}

module.exports = Aggregator
