const path = require('path')
const { Worker } = require('worker_threads')
const { Pen } = require('../Pen.js')
const Twitch = require('../Twitch.js')

function runService(workerData) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, 'service.js'), { workerData })
    worker.on('message', resolve)
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) { reject(new Error(`Worker stopped with exit code ${code}`)) }
    })
  })
}

const getTopKChannels = async (language = 'es', percentage = 0.8) => {
  const allChannels = await Twitch.getChannelsByLanguage(language)
  const topKChannels = await runService({ data: allChannels, percentage: percentage })
  Pen.write(`Returning ${topKChannels.length} out of ${allChannels.length} for ${language} channels`, 'green')
  return topKChannels
}

module.exports = { getTopKChannels }

if (require.main === module) {
  getTopKChannels(language='zh') // .then(result => { console.log(result) })
}
