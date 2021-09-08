module.exports = function makeProbesDb({ makeDb }) {
  return Object.freeze({
    getAllCollections,
    findAllFromCollection,
    findUnqiueIpFromCollection,
    getStats,
    findByQueryFromCollection
  })
  async function getAllCollections() {
    const db = await makeDb()
    const result = await db.listCollections().toArray()
    const collectionList = result.map((collection) => collection.name)
    if (collectionList.length === 0) {
      return null
    }
    return collectionList
  }
  async function findAllFromCollection(collectionName) {
    const db = await makeDb()
    const result = db.collection(collectionName).find()
    const transactions = await result.toArray()
    if (transactions.length === 0) {
      return null
    }
    return transactions
  }

  async function findByQueryFromCollection(collectionName, skip, limit, start, end) {
    const db = await makeDb()
    const dateQuery = []
    const lengthQuery = []
    if (start) {
      dateQuery.push({
        "$gte": [
          { $dateFromString: { dateString: '$start' } }, { $toDate: start }
        ]
      })
    }
    if (end) {
      dateQuery.push(
        {
          "$lte": [
            { $dateFromString: { dateString: '$end' } }, { $toDate: end }
          ]
        }
      )
    }
    if(skip) {
      lengthQuery.push({
        $skip: skip
      })
    }
    if(limit){
      lengthQuery.push({
        $limit: limit
      })
    }
    const transactions = await db.collection(collectionName).aggregate([
      {
        "$match": {
          "$expr": {
            "$and":
              dateQuery

          }
        }
      },
      ...lengthQuery
    ]).toArray()
    if (transactions.length === 0) {
      return []
    }
    return transactions
  }


  async function findUnqiueIpFromCollection(collectionName) {
    const db = await makeDb()
    const result = db.collection(collectionName).find()
    const transactions = await result.toArray()
    if (transactions.length === 0) {
      return null
    }
    const uniqueIps = transactions.map((transaction) => transaction.serverPool).flat().filter((x, i, a) => a.indexOf(x) === i)
    return uniqueIps
  }
  async function getStats() {
    const db = await makeDb()
    const result = await db.listCollections().toArray()
    const collectionList = result.map((collection) => collection.name)
    if (collectionList.length === 0) {
      return null
    }
    const countList = await Promise.all(collectionList.map(collectionName => db.collection(collectionName).countDocuments()))
    return [result, countList.reduce((acc, cur) => acc + cur)]
  }
}
