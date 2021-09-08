const axios = require('axios')

const probeAPI = Object.freeze({
  callStart: async (probeName) => {
    const result = await axios.post(`http://${probeName}:3000/api/pool/start`)
    console.log(`Called start API on ${probeName}`)
    return result.status
  },
  callStop: async (probeName) => {
    const result = await axios.post(`http://${probeName}:3000/api/pool/stop`)
    console.log(`Called stop API on ${probeName}`)
    return result.status
  },
  getStatus: async (probeName) => {
    const result = await axios.get(`http://${probeName}:3000/api/status`)
    return result
  }
})
module.exports = probeAPI
