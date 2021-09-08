const mongoose = require('mongoose')
const autoIncrementFactory = require('mongoose-sequence')
const HOST = `${process.env.MONGODB}:27017`
const DBNAME = 'nslab'
mongoose.connect(`mongodb://${HOST}/${DBNAME}`, {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  useCreateIndex: true
}).then(() => console.log('DB Connected'))
  .catch(err => {
    console.log(`DB Connection Error: ${err.message}`)
  })
mongoose.Promise = global.Promise
const AutoIncrement = autoIncrementFactory(mongoose)
exports.mongoose = mongoose
exports.autoincrement = AutoIncrement
