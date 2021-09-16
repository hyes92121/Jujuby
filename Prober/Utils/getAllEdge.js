const { getEdgeAddr } = require('./getEdgeAddr.js')

function getAllEdge (channel) {
  const edges = {}
  let errorCount = 0
  let tries = 0
  return new Promise((resolve, reject) => {
    function batchGetEdgeAddr (channel) {
      // send 5 packets at a time
      for (let i = 0; i < 5; i++) {
        getEdgeAddr(channel)
          .then((ip) => {
            if (ip !== undefined) {
              if (Object.prototype.hasOwnProperty.call(edges, ip)) {
                edges[ip] += 1
                tries += 1
              } else { edges[ip] = 1 }
            }
          })
          .catch(error => {
            if (errorCount > 10) {
              // console.log('Too many errors. Rejecting...')
              reject(new Error('TooManyErrors'))
            }
            if (Object.prototype.hasOwnProperty.call(error, 'response')) { // error originated from axios
              if (error.response === undefined) {
                errorCount += 1
                console.log(`Error from get_all_edge.js: ${error.message}`)
              } else if (![403, 404].includes(error.response.status)) {
                errorCount += 1
                console.log(`Error from axios: ${error.message}`)
              }
            } else {
              errorCount += 1
              console.log(`Other error: ${error.message}`)
            }
          }) // no 'return' here to propagate error to upper level, so we handle the error locally
      }
    }

    const hrstart = process.hrtime()
    const interval = setInterval(() => {
      console.log(`Running batchGetEdgeAddr with tries ${tries}`)
      batchGetEdgeAddr(channel)
      if (tries >= 3) {
        clearInterval(interval)
        // console.info('Finshed getting all edges with execution time (hr): %ds %dms', process.hrtime(hrstart)[0], process.hrtime(hrstart)[1]/1000000)
        resolve({ time: process.hrtime(hrstart)[0], ipList: edges })
      }
    }, 10000)
  })
}

module.exports = { getAllEdge }

if (require.main === module) {
  const channel = process.argv[2]
  getAllEdge(channel)
    .then(response => console.log(response))
}
