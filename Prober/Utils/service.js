const { workerData, parentPort } = require('worker_threads')

// You can do any heavy stuff here, in a synchronous way
// without blocking the "main thread"
// console.log(`Number of live streams: ${workerData.data.length}`)

const records = []

const getTotalViewers = () => {
  let count = 0
  for (const stream of workerData.data) { count += stream.viewer_count }
  return count
}

const totalViewers = getTotalViewers()
let accuViewers = 0

for (const stream of workerData.data) {
  accuViewers += stream.viewer_count
  // console.log(`${stream.user_login}:`.padEnd(20, ' ') + `${stream.viewer_count}`.padEnd(10, ' ') + `${accuViewers}/${totalViewers}`)
  records.push(stream.user_login)
  /* Streams that have less than 10 viewers are discarded to avoid excessive # of channels being returned. */
  if ( ((accuViewers / totalViewers) > workerData.percentage) || (stream.viewer_count < 10) || (records.length > 999))  { break }
}

parentPort.postMessage(records)
