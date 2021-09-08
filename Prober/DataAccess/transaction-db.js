function makeTransactionDb ({ makeDb }) {
  return Object.freeze({
    insert
  })
  
  async function insert ({ ...transactionInfo }) {
    const db = await makeDb()
    const result = await db
      .collection(process.env.COUNTRY)
      .insertOne({ ...transactionInfo })
    const { ...insertedInfo } = result.ops[0]
    return { ...insertedInfo }
  }
}
module.exports = { makeTransactionDb }
