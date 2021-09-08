const mongodb = require('mongodb')
const makeTransactionDb = require('./transaction-db.js')
const MongoClient = mongodb.MongoClient
const url = `mongodb://${process.env.MONGODB}:27017`
const dbName = 'Twitch'
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true })

async function makeDb() {
  if (!client.isConnected()) {
    await client.connect()
    await client.db('admin').command({ ping: 1 })
    console.log('Connected successfully to server')
  }
  return client.db(dbName)
}

const transactionDb = makeTransactionDb({ makeDb })
module.exports = { transactionDb }
if (require.main === module) {
  // transactionDb.findUnqiueIpFromCollection('Taiwan').then(res => console.log(res))
  // transactionDb.findByDateFromCollection('Taiwan',0,5000,'2020-11-02','2020-11-09').then(res => console.log(res))
}
