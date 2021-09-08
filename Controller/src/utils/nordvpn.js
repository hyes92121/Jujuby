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
  France: 'fr',
  Georgia: 'ge',
  Germany: 'ge',
  Greece: 'ge',
  HongKong: 'hk',
  Iceland: 'is',
  Japan: 'jp',
  Mexico: 'mx',
  SouthKorea: 'kr',
  // Should be "Sweden" but the frontend as a typo as in "Swedan"
  Swedan: 'se',
  Singapore: 'sg',
  UnitedKingdom: 'uk',
  UnitedStates: 'us',
  Turkey: 'tr'
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
  const vpnObj = NordVPN
  // vpnObj.isValidCountry('UnitedStates')
  //   .then(response => { console.log(response) }) // returns true
  vpnObj.getLoadSortedSeversByCountry('UnitedStates').then(response => { console.log(response) })
  // vpnObj.getRecommendServers('Taiwan').then(res => console.log(res))
  // vpnObj.getCountryIdentifierNumber('Norway').then(res => console.log(res))
}
