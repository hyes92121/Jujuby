const axios = require('axios')
const CODEDIC = {
  Taiwan: 'tw',
  Albania: 'al',
  Argentina: 'ar',
  Australia: 'au',
  Austria: 'at',
  Belgium: 'be',
  Brazil: 'br',
  Bulgaria: 'bg',
  Canada: 'ca',
  Denmark: 'dk',
  France: 'fr',
  Georgia: 'ge',
  Germany: 'de',
  Greece: 'ge',
  HongKong: 'hk',
  Italy: 'it', 
  Iceland: 'is',
  Japan: 'jp',
  Mexico: 'mx',
  Poland: 'pl',
  SouthKorea: 'kr',
  Sweden: 'se',
  Singapore: 'sg',
  Spain: 'es',
  UnitedKingdom: 'uk',
  UnitedStates: 'us',
  Turkey: 'tr'
}

const longitudeMap = { /* A negative value means the western hemisphere */
  UnitedStates: { east: -120, west: -80 }, 
  Canada: { east: -115, west: -80 }, 
  Germany: { east: 9, west: 12 }

}

const NordVPN = Object.freeze({
  isValidCountry: async (country) => {
    try {
      const response = await axios.get('https://api.nordvpn.com/server')
      return response.data
        .map(server => server.country)
        .filter((x, i, a) => a.indexOf(x) === i) // x: Country String,
        .includes(country)
    } catch (error) {
      console.error(error)
      throw new Error('NordAPI-isValidCountry Fetch Failed')
    }
  },
  isValidServer: async (server) => {
    try {
      
      const response = await axios.get('https://api.nordvpn.com/server')
      return response.data
        .map((server) => server.domain.split('.')[0])
        .includes(server)
    } catch (error) {
      console.error(error)
      throw new Error('NordAPI-isValidServer Fetch Failed')
    }
  },
  getCountryIdentifierNumber: async (country) => {
    try {
      const response = await axios.get('https://api.nordvpn.com/v1/servers/countries')
      return response.data.filter(item => item.name === country)[0].id
    } catch (error) {
      console.error(error)
      throw new Error('NordAPI-isValidServer Fetch Failed')
    }
  },
  getRecommendServers: async (country, limit = 100) => {
    try {
      const countryId = await NordVPN.getCountryIdentifierNumber(country)
      const response = await axios.get(`https://api.nordvpn.com/v1/servers/recommendations?filters\[country_id\]=${countryId}&limit=${20}`)
      return response.data.map( server => server.hostname.split('.')[0])
    } catch (error) {
      console.error(error)
      throw new Error('NordAPI-getRecommendServers Fetch Failed')
    }
  },
  // returns list of available servers sorted by load in ascending order
  getLoadSortedSeversByCountry: async (country) => {
    try {
      const allServerStats = await axios.get('https://api.nordvpn.com/server/stats')
      /* */
      const filteredServerStats = Object.keys(allServerStats.data)
        .filter((server) => server.split('.')[0].includes(CODEDIC[country]) && !server.split('.')[0].includes('-'))

      const filteredServerStatsArray = filteredServerStats.map(function (key) {
        return [key.split('.')[0], allServerStats.data[key]]
      })

      filteredServerStatsArray.sort(function (first, second) {
        return second[1].percent - first[1].percent
      })

      return filteredServerStatsArray.map((server) => server[0]).reverse()
    } catch (error) {
      console.error(error)
      throw new Error('NordAPI-getLoadSortedSeversByCountry Fetch Failed')
    }
  }

})

module.exports = NordVPN

/* Testing Code */
if (require.main === module) {
  const getServer = async (targetCountry) => {
    const availableServers = await axios.get('https://api.nordvpn.com/server')
    const allServers = availableServers.data
                                      .filter(server => server.country === targetCountry)
                                      .map(server => {
                                        return {
                                          id: server.id, 
                                          ipAddress: server['ip_address'], 
                                          name: server.name, 
                                          domain: server.domain, 
                                          country: server.country, 
                                          location: server.location, 
                                          load: server.load
                                        }
                                      })
    let idx = 2 /* Choose the 3rd server */
    console.log(allServers[idx])
  }

  const getHemisphereServer = async (targetCountry, hemisphere) => {
    const availableServers = await axios.get('https://api.nordvpn.com/server')
    const allServers = availableServers.data
                                      .filter(server => server.country === targetCountry)
                                      .map(server => {
                                        return {
                                          id: server.id, 
                                          ipAddress: server['ip_address'], 
                                          name: server.name, 
                                          domain: server.domain, 
                                          country: server.country, 
                                          location: server.location, 
                                          load: server.load
                                        }
                                      })
    const eastServers = allServers.filter(server => server.location.long < longitudeMap[targetCountry].east)
    const westServers = allServers.filter(server => server.location.long > longitudeMap[targetCountry].west)
    eastServers.sort((s1, s2) => { const ld1 = s1.load; const ld2 = s2.load; return (ld1 < ld2) ? 1 : ((ld1 > ld2) ? -1 : 0) })
    westServers.sort((s1, s2) => { const ld1 = s1.load; const ld2 = s2.load; return (ld1 < ld2) ? 1 : ((ld1 > ld2) ? -1 : 0) })
                                        
    let idx = 2 /* Choose the 3rd server */
    if (process.argv[4]) { idx += 1 }
    
    (hemisphere === 'west') ? console.log('West Coast Server: ', westServers[idx]) : console.log('East Coast Server: ', eastServers[idx])
  }

  console.log('Referenced from: ' + 'https://www.worldatlas.com/webimage/countrys/usalats.htm')
  const [targetCountry, hemisphere] = [process.argv[2], process.argv[3]]
  if (hemisphere) {
    getHemisphereServer(targetCountry, hemisphere)
  } else {
    getServer(targetCountry)
  }
}
