import axios from 'axios'

const xml2js = require('xml2js')

const apiKey = '7c176178e335ad8ef2ebfe770f987e50'

const fetchXml = (lon, lat) => {
  const config = {
    transformResponse: [(data) => {
      let jsonData
      const parser = new xml2js.Parser({
        async: false,
        explicitArray: false,
      })
      parser.parseString(data, (error, json) => {
        jsonData = json
      })
      return jsonData
    }],
  }
  return axios.get(
    `https://www.flickr.com/services/rest/?method=flickr.photos.search&api_key=${apiKey}&lon=${lon}&lat=${lat}&extras=url_t&format=rest`,
    config,
  )
}

export default fetchXml
