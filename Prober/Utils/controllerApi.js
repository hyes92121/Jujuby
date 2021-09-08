const axios = require('axios')

const controllerAPI = Object.freeze({
  reportError: async (error) => {
    await axios.post(`http://${process.env.CONTROLLER_IP}:22222/nslab/crawler/error`, {
      id: process.env.ID,
      error: error
    })
  }
})
module.exports = controllerAPI

if (require.main === module) {
  console.log(process.env.ID, process.env.CONTROLLER_IP)
  controllerAPI.reportError(3).then(res => console.log(res))
}
