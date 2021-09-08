const { execSync } = require('child_process')
const os = require('os')
const Pen = require('../Pen')
const Docker = Object.freeze({
  runProbeContainer: async (containerName, containerId, serverId, languages, percentages, country) => {
    /* Cannot use -it flag here */
    const cmd = [
      `docker run -itd --rm --cap-add=NET_ADMIN --cap-add=SYS_MODULE --device /dev/net/tun --name ${containerName}`,
      '--sysctl net.ipv4.conf.all.rp_filter=2',
      '--ulimit memlock=-1:-1',
      `--network ${process.env.DOCKER_NETWORK}`,
      `-e USER=${process.env.NORD_USER} -e PASS='${process.env.NORD_PWD}'`,
      `-e CONNECT=${serverId} -e LANGUAGE=${languages.join(',')} -e PERCENTAGES=${percentages.join(',')}`,
      '-e TECHNOLOGY=NordLynx',
      `-e COUNTRY=${country.replace(/ /g, '_')}`,
      `-e CONTROLLER_IP=${os.networkInterfaces().eth0[0].address}`,
      `-e ID=${containerId}`,
      `-e CACHE_URL=${process.env.CACHE_URL}`,
      `-v ${process.env.PROJECT_ROOT}/Prober:/home/Prober`,
      `-v ${process.env.PROJECT_ROOT}/.envFiles/resolv.conf:/etc/resolv.conf`,
      'nslab/prober:2.0'].join(' ')
    try {
      await execSync(cmd)
      const stdout = await execSync('docker ps')
      console.log(stdout.toString())
      console.log(`Country list: ${country.replace(/ /g, '_')}`)
      console.log(`Language list: ${languages.join(',')}`)
      console.log(`Percentages: ${percentages.join(',')}`)
      if (stdout.toString().includes(containerName)) {
        return true
      }
      return false
    } catch (e) {
      console.log(e)
      throw e
    }
  },
  killProbeContainer: async (containerName) => {
    try {
      let stdout = await execSync('docker ps')
      if (stdout.toString().includes(containerName)) {
        await execSync(`docker stop ${containerName}`)
        stdout = await execSync('docker ps')
        if (!stdout.toString().includes(containerName)) {
          return true
        }
        return false
      }
      return true
    } catch (e) {
      console.log(e)
      throw e
    }
  },
  listProbeContainers: async () => {
    // const list = await promisified_exec( `docker ps`)
    try {
      const stdout = await execSync('docker ps')
      return stdout.toString().match(/(probe-)\w{9}/g)
    } catch (e) {
      console.log(e)
      throw e
    }
  },
  flushCache: async () => {
    try {
      await execSync(`docker exec ${process.env.CACHE_NAME} redis-cli FLUSHALL`)
      Pen.write(`Redis cache is flushed`, 'yellow')
    } catch (e) {
      console.log(e)
      throw e
    }
  }
})
module.exports = Docker

if (require.main === module) {
  const docker = Docker
  Docker.flushCache()
  // docker.runProbeContainer('test', 'tw46', 'zh')
  // console.log(os.networkInterfaces().eth0[0].address)
}
