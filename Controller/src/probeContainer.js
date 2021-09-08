const Id = require('./utils/uniqueId')
/* API for communicating with the Docker daemon */
const Docker = require('./utils/docker')
/* API for communicating with the prober container */
const probeAPI = require('./utils/probeApi')
const Pen = require('./Pen')

// const ERRORSTATUS = {
//   1: 'Manual Stopped',
//   2: 'Probing Container Startup Error',
//   3: 'Network Error',
//   4: 'Probing Container Close Error'
// }

class ProbeContainer {
  constructor (serverId, languages, percentages, country) {
    this.id = Id.makeID()
    this.name = `probe-${this.id}`
    this.createdOn = new Date().toISOString().replace(/\..+/, '')
    this.serverId = serverId // note: id of current using Nordvpn server
    this.languages = languages
    this.percentages = percentages
    this.country = country
    this.state = null
    this.errorStatus = null // note: error that causes it to be suspended
    this.setup()
  }

  async setup () {
    try {
      Pen.write('Initiating setup...', 'green')
      if (await Docker.runProbeContainer(this.name, this.id, this.serverId, this.languages, this.percentages, this.country)) { // container startup
        await this.preStartDelay() // Wait for NordVPN to setup connection
        this.state = 'ready'
        Pen.write(`ProbeContainer ${this.name} finished setup`, 'green')
      }
    } catch (e) {
      Pen.write(`Cannot finish setup, Error : ${e}, ProbeContainer ${this.name} is suspended`, 'red')
      this.state = 'suspended'
      this.errorStatus = 2
    }
  }

  async startProbing () {
    try {
      while (this.state !== 'ready') { console.log('waiting'); await new Promise(resolve => setTimeout(resolve, 1000)) }
      console.log(this.name)
      if (await probeAPI.callStart(this.name)) {
        Pen.write(`ProbeContainer ${this.name} starts running`, 'blue')
        this.state = 'running'
      }
    } catch (e) {
      Pen.write(`Cannot run Error : ${e}, ProbeContainer ${this.name} is suspended`, 'red')
      this.state = 'suspended'
      this.errorStatus = 3
    }
  }

  async close () {
    try {
      if (this.state === 'running') { //  call stop API on still running ProbeContainer to ensure transactions are written correctly
        if (await probeAPI.callStop(this.name)) { Pen.write(`Running ProbeContainer ${this.name} is stopped`, 'blue') }
      }
      await Docker.killProbeContainer(this.name)
      Pen.write(`ProbeContainer ${this.name} is killed`, 'blue')
      return true
    } catch (e) {
      Pen.write(`Cannot close container, Error : ${e}, ProbeContainer ${this.name} is suspended`, 'red')
      this.errorStatus = 4
      return false
    } finally { this.state = 'suspended' }
  }

  async preStartDelay () {
    return new Promise((resolve) => { setTimeout(resolve, 10000) })
  }

  updateErrorStatus (error) {
    this.errorStatus = error
  }

  logInfo () {
    const info = {
      id: this.id,
      name: this.name,
      createdOn: this.createdOn,
      serverId: this.serverId,
      languages: this.languages,
      percentages: this.percentages,
      state: this.state,
      errorStatus: this.errorStatus
    }
    console.log(info)
  }
}
module.exports = ProbeContainer

if (require.main === module) {
  const main = async () => {
    const probe = new ProbeContainer('tw46', 'zh')
    console.log('Setup finished')
    console.log('Start probing...')
    await probe.startProbing()
    console.log('Sleeping for 10 secs')
    await new Promise(resolve => setTimeout(resolve, 10 * 1000))
    await probe.close()
    probe.logInfo()
  }
  main()
}
