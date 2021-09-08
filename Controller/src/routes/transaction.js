const express = require('express')
// const middlewares = require('./middlewares')
const router = express.Router()
const { transactionDb } = require('../database/mongo')
router.get('/collection/list', (req, res) => {
  transactionDb.getAllCollections().then((collections) => {
    return res.json({
      success: true,
      collections: collections
    })
  }
  ).catch(
    (error) => {
      console.log(error)
      return res.json({
        success: false,
        message: error
      })
    }
  )
})

router.get('/collection/:name', (req, res) => {
  const collectionName = req.params.name
  const skip = parseInt(req.query.skip)
  const limit = parseInt(req.query.limit)
  var start = req.query.start
  var end = req.query.end
  if(start){
    start = start.substring(0,4) + '-' + start.substring(4,6) + '-' + start.substring(6,8)
  }
  if(end){
    end = end.substring(0,4) + '-' + end.substring(4,6) + '-' + end.substring(6,8)
  }
  // const start_string = start_number.substring(0,4) + '-' + start_number.substring(4,6) + '-' + start_number.substring(6,8)
  // const end_string = end_number.substring(0,4) + '-' + end_number.substring(4,6) + '-' + end_number.substring(6,8)
  // const startDate = req.params.startDate
  // const endDate = req.params.endDate
    transactionDb.findByQueryFromCollection(collectionName, skip, limit, start, end).then((transactions) => {
      return res.json({
        success: true,
        transactions: transactions
      })
    }
    ).catch(
      (error) => {
        return res.json({
          success: false,
          message: error
        })
      }
    )
})

router.get('/collection/:name/uniqueip', (req, res) => {
  const collectionName = req.params.name
  transactionDb.findUnqiueIpFromCollection(collectionName).then((ips) => {
    return res.json({
      success: true,
      ips: ips
    })
  }
  ).catch(
    (error) => {
      return res.json({
        success: false,
        message: error
      })
    }
  )
})

router.get('/stats', (req, res) => {
  transactionDb.getStats().then((stats) => {
    return res.json({
      success: true,
      countryList: stats[0],
      totalCount: stats[1]
    })
  }
  ).catch(
    (error) => {
      return res.json({
        success: false,
        message: error
      })
    }
  )
})

module.exports = router
