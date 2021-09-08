const { MongoClient } = require("mongodb");
// const { makeTransactionDb } = require('./transaction-db.js')
// const url = 'mongodb://172.27.0.3:27017'
const url = 'mongodb://52.183.122.138:23234'
const dbName = 'Twitch'
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true })

async function connectToDB(database) {
  if (!client.isConnected()) {
    await client.connect()
    await client.db('admin').command({ping:1}).then(() => { console.log('Successfully connected to database!') })
  }
  return client.db(database)
}

function makeTransactionDb () {
  return Object.freeze({ insert })
  
  async function insert ({ ...transactionInfo }) {
    const twitchDatabase = await connectToDB(dbName)
    const result = await twitchDatabase
      .collection(process.env.COUNTRY)
      .insertOne({ ...transactionInfo })
    const { ...insertedInfo } = result.ops[0]
    return { ...insertedInfo }
  }
}

const transactionDb = makeTransactionDb()

if (require.main === module) {
  async function test() {
    const db = await connectToDB(dbName)
    const twData = db.collection('Taiwan')
    const r = await twData.find({'channel': 'relaxing234'})
    await r.forEach(console.dir)
  }

  async function testInsideContainer() {
    const pizzaDocument = {
      name: "Neapolitan pizza",
      shape: "round",
      toppings: [ "San Marzano tomatoes", "mozzarella di bufala cheese" ],
    }
    transactionDb.insert(pizzaDocument)
    
    // const db = await connectToDB(dbName)
    // const collection = db.collection(process.env.COUNTRY)
    // const response = await collection.find({'name': 'Neapolitan pizza'})
    // await response.forEach(console.dir)

    // await collection.deleteMany(pizzaDocument);
  }

  // test()
  testInsideContainer()
}

module.exports = { transactionDb }
