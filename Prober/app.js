const express = require('express')
// const readLastLines = require('read-last-lines')
const assert = require('assert')
const AssertionError = require('assert').AssertionError
const ProbingPool = require('./src/Probe.js')
const API = require('./src/Api.js')
const { logBuffer } = require('./src/Pen.js')

const app = express()
const port = 3000
const languages = process.env.LANGUAGE.split(',')
const percentages = process.env.PERCENTAGES.split(',')
const poolParams = languages.map((lang, idx) => { return [lang, percentages[idx]] })

const pools = []
poolParams.forEach((poolParam) =>  {
  const [lang, percentageStr] = poolParam
  const percentage = parseInt(percentageStr) / 100
  pools.push(new ProbingPool(lang, percentage)) 
})

app.get('/api/status', (req, res) => {
  res.send({
    requestCount: API.getRequestCount(),
    liveProbes: pools.reduce((accumulator, currentPool) => accumulator.concat(currentPool.getLiveProbes()), []),
    latestLogs: logBuffer
  })
})

app.post('/api/pool/start', (req, res) => {
  pools.forEach(pool => pool.run())
  // pool.run()
  res.send({ status: true, msg: 'Probing pool started' })
})

app.post('/api/pool/stop', (req, res) => {
  try {
    pools.forEach(pool => {
      assert(pool.isActive)
      pool.stop()
    })
  } catch (e) {
    if (e instanceof AssertionError) { res.send({ status: false, msg: 'pool already stopped' }) }
  }
  res.send({ status: true, msg: 'probingPool stopped' })
})

app.listen(port, () => {
  console.log(`ProbingPool listening at http://localhost:${port}`)
})
