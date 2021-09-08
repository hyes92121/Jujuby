const express = require('express')
const https = require('https')
const fs = require('fs');
const bodyParser = require('body-parser')
const dotenv = require('dotenv')
const path = require('path')
const cookieParser = require('cookie-parser')
// const Controller = require('./controller')
// const build_options = {
//   key: fs.readFileSync('../secret/server-key.pem'),
//   ca: [fs.readFileSync('../secret/cert.pem')],
//   cert: fs.readFileSync('../secret/server-cert.pem')
// };
const cors = require('cors')
const userRouter = require('./routes/user.js')
const transactionRouter = require('./routes/transaction.js')
const crawlerRouter = require('./routes/crawler.js')

const app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(bodyParser.json())
console.log(path.join(__dirname, 'public'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(cors({
  credentials: true,
  origin: 'http://localhost:8080'
}))

dotenv.config()
const APIRoot = process.env.API_ROOT
// const controller = new Controller()

// /* Start Express API definition here */

// app.post(`${APIRoot}/crawler/start`, (req, res) => {
//   try {
//     if (!req.body.country || !req.body.language) {
//       console.log('failed')
//       throw new Error('Either country or language must not be null')
//     }
//     controller.startProbeContainer(req.body.country, req.body.language)
//       .then(probeContainer => {
//         res.type('json')
//         res.status(201).send({ status: true, probe: probeContainer })
//       })
//   } catch (e) {
//     console.log(e.message)
//     res.type('json')
//     res.status(400).send({ status: false, error: e.message })
//   }
// })

// app.delete(`${APIRoot}/crawler/close/:id`, (req, res) => {
//   try {
//     controller.closeProbeContainer(req.params.id)
//       .then(() => {
//         res.type('json')
//         res.status(202).send({ status: true })
//       })
//   } catch (e) {
//     console.log(e.message)
//     res.type('json')
//     res.status(400).send({ status: false, error: e.message })
//   }
// })

// app.get(`${APIRoot}/crawler/status`, (req, res) => {
//   try {
//     const statusInfo = controller.getHistory()
//     res.type('json')
//     res.status(200).send(statusInfo)
//   } catch (e) {
//     console.log(e.message)
//     res.type('json')
//     res.status(400).send({ status: false, error: e.message })
//   }
// })

// app.post(`${APIRoot}/crawler/error/:id`, (req, res) => {
//   // TODO: log prober error and kill container
//   controller.killProbeContainer(res.params.id)
// })

/* Crawler API */
app.use(`${APIRoot}/crawler`, crawlerRouter)
/* User API */
app.use(`${APIRoot}/user`, userRouter)
/* DB query API */
app.use(`${APIRoot}/database`, transactionRouter)

// https.createServer(options, function (req, res) {
//   console.log('Server is listening on port 22222')
//   res.writeHead(200);
// }).listen(22222);

app.listen(22222, () => {
  console.log('Server is listening on port 22222')
})
