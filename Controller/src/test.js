// const Controller = require('./controller')
// const Id = require('./utils/uniqueId')
// const controller = new Controller()
// console.log(Id.makeID())
// controller.createProbeContainer('Taiwan', 'zh')
//   .then(r => controller.startProbingOnContainer(r))
// controller.startProbingOnContainer('ZMzJp_YjW').then(r => controller.startProbingOnContainer(r))
// console.log(controller.status.averageRequestCount)
var MongoClient = require('mongodb').MongoClient
// Connect to the db
MongoClient.connect('mongodb://localhost:27017/', function (err, db) {
  if (err) throw err
  console.log('mongodb is running!')
  var dbo = db.db('Twitch')
  dbo.listCollections().toArray(function (err, collectionInfos) {
    if (err) { console.log(err) }
    console.log(collectionInfos)
    db.close()
  })
})
