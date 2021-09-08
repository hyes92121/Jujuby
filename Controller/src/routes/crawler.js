const express = require('express')
const Controller = require('../controller')
const CacheFlusher = require('../cacheFlusher')
const middlewares = require('./middlewares')
const probeAPI = require('../utils/probeApi')
const router = express.Router()
const controller = new Controller()
// const cacheFlusher = new CacheFlusher()

/* Start Express API definition here */
/**
 * Start probe container with multiple languages and topK percentages(default is 0.8)
 */
router.post('/start', middlewares.auth, (req, res) => {
  try {
    if (!req.body.country) {
      throw new Error('Country must not be null')
    } else if (req.body.languages.length < 1) {
      throw new Error('Must provide at least one language')
    }
    controller.startProbeContainer(req.body.country, req.body.languages, req.body.percentages)
      .then(probeContainer => {
        res.type('json')
        res.status(201).send({ status: true, probe: probeContainer })
      })
  } catch (e) {
    console.log(e.message)
    res.type('json')
    res.status(400).send({ status: false, error: e.message })
  }
})

router.delete('/close/:id', middlewares.auth, (req, res) => {
  try {
    controller.closeProbeContainer(req.params.id)
      .then(() => {
        res.type('json')
        res.status(202).send({ status: true })
      })
  } catch (e) {
    console.log(e.message)
    res.type('json')
    res.status(400).send({ status: false, error: e.message })
  }
})

router.get('/status', middlewares.auth, (req, res) => {
  try {
    const statusInfo = controller.getHistory()
    res.type('json')
    res.status(200).send(statusInfo)
  } catch (e) {
    console.log(e.message)
    res.type('json')
    res.status(400).send({ status: false, error: e.message })
  }
})

router.get('/:id/status', middlewares.auth, (req, res) => {
  try {
    probeAPI.getStatus(`probe-${req.params.id}`).then(statusInfo => {
      res.status(200).send({ status: true, details: statusInfo.data })
    }
    )
  } catch (e) {
    console.log(e.message)
    res.type('json')
    res.status(400).send({ status: false, error: e.message })
  }
})

router.post('/error', (req, res) => {
  try {
    const error = req.body.error
    const probeContainerId = req.body.id
    if (error === 3) {
      controller.replaceErroredContainer(probeContainerId, error)
    }
  } catch (e) {
    console.log(e.message)
    res.type('json')
    res.status(400).send({ status: false, error: e.message })
  }
  // TODO: log prober error and kill container
})

module.exports = router
