const NordVPN = require('./utils/nordvpn')
const ProbeContainer = require('./probeContainer')
const Pen = require('./Pen')

class Controller {
  constructor() {
    this.status = {
      aliveContainers: {},
      averageRequestCount: 0
    }
    this.history = {} // store execution information of all containers
    this.setup()
  }

  setup() {
    // setInterval(() => { this.cleanUpSuspendedProbeContainer() }, 0.5 * 60 * 1000)
  }

  async startProbeContainer(country, languages, percentages) {
    const aliveContainers = this.status.aliveContainers
    const historyContainers = Object.values(this.history)
    const serverSortedByLoad = await NordVPN.getRecommendServers(country)

    let serverId

    if (Object.keys(aliveContainers).length > 0) {
      const currentlyUsingServerIds = Object.values(aliveContainers).map((probeContainer) => probeContainer.serverId)
      const pastErroredServerIds = historyContainers.filter((probeContainer) => probeContainer.exitStatus !== 1).map((probeContainer) => probeContainer.serverId)
      serverId = serverSortedByLoad.find(server => !currentlyUsingServerIds.includes(server) && !pastErroredServerIds.includes(server))
    } else { serverId = serverSortedByLoad[0] }

    const newProbeContainer = new ProbeContainer(serverId, languages, percentages, country)
    await newProbeContainer.startProbing()

    aliveContainers[newProbeContainer.id] = newProbeContainer
    return newProbeContainer
  }

  async replaceErroredContainer(id, error) {
    const targetContainer = this.status.aliveContainers[id]
    const languages = targetContainer.languages
    const percentages = targetContainer.percentages
    const country = targetContainer.country
    targetContainer.updateErrorStatus(error)
    if (await this.closeProbeContainer(id)) {
      await this.startProbeContainer(country, languages, percentages)
      Pen.write(`Finished replacing errored ProbeContainers ${id}`, 'green')
    } else {
      Pen.write(`Cannot replace errored ProbeContainers ${id}`, 'red')
    }
  }

  async closeProbeContainer(id) {
    const targetContainer = this.status.aliveContainers[id]
    if (await targetContainer.close()) { // close prober container using Docker daemon
      delete this.status.aliveContainers[id]
      this.history[id] = { ...targetContainer, exitStatus: targetContainer.errorStatus ? targetContainer.errorStatus : 1 }
      return true
    } else {
      return false
    }
  }

  async cleanUpSuspendedProbeContainer() { // clean up the "ProbeContinaer" object, not the container itself
    const suspendedContainers = Object.values(this.status.aliveContainers)
      .filter(probeContainer => probeContainer.state === 'suspended')
    await Promise.all(
      suspendedContainers.map(async container => {
        this.closeProbeContainer(container.id)
        return true
      })
    )
    Pen.write('Finished Cleaning Suspended ProbeContainers', 'blue')
  }

  logProbeContainerInfo() {
    Object.values(this.status.aliveContainers)
      .forEach(container => { container.logInfo() })
  }

  getHistory() {
    return { status: { aliveContainers: Object.values(this.status.aliveContainers), averageRequestCount: this.status.averageRequestCount }, history: this.history }
  }
}

module.exports = Controller

if (require.main === module) {
  const main = async () => {
    const controller = new Controller()
    setInterval(() => { controller.logProbeContainerInfo() }, 5 * 1000)

    const zhId = await controller.startProbeContainer('Taiwan', ['zh', 'es'], [0.7, 0.6])
    // const esId = await controller.startProbeContainer('Taiwan', 'es')
    // const koId = await controller.startProbeContainer('Taiwan', 'ko')

    // eslint-disable-next-line promise/param-names
    await new Promise(r => setTimeout(r, 20 * 1000))

    await controller.closeProbeContainer(zhId)
    // await controller.closeProbeContainer(esId)
    // await controller.closeProbeContainer(koId)

    console.log(controller.getHistory())
  }

  main()
}
