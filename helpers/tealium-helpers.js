'use strict'


const axios = require('axios')
const tealiumCdnRequests = require('../helpers/tealium-public-request-generator.js')

const getPastTimestampMs = function (daysInPast) {
  daysInPast = daysInPast || 0
  // use milliseconds because the Tealium API for volumes does
  return Date.now() - (daysInPast * 86400000)
}

exports.getVolumesForRollingPeriod = (account, profile, getVolumesHelper, rollingDaysBack) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    getVolumesHelper(account, profile, getPastTimestampMs(rollingDaysBack), getPastTimestampMs(0))
      .then((output) => {
        const data = output
        const totals = {
          loader: 0,
          mobile: 0,
          vendor: 0,
          sync: 0,
          visit: 0
        }
        data.forEach((entry) => {
          ['LOADER', 'MOBILE', 'SYNC', 'VISIT', 'VENDOR'].forEach((key) => {
            if (entry.metrics[key]) totals[key.toLowerCase()] += entry.metrics[key]
          })
        })
        resolve(totals)
      })
      .catch((error) => {
        error = error || {}
        console.log(`ERROR: ${error.stack}`)
        reject(error)
      })
  })
}

exports.getUtagFileFromCdn = function (account, profile, environment) {
  return new Promise((resolve, reject) => {
    const requestObject = tealiumCdnRequests.getCurrentUtagJsFromCdn(account, profile, environment)
    axios(requestObject)
      .then((responseString) => {
        const responseObject = { link: requestObject.url, contents: responseString, label: 'utag.js' }
        resolve(responseObject)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

exports.getUtagSyncFileFromCdn = function (account, profile, environment) {
  return new Promise((resolve, reject) => {
    const requestObject = tealiumCdnRequests.getCurrentUtagSyncJsFromCdn(account, profile, environment)
    axios(requestObject)
      .then((responseString) => {
        const responseObject = { link: requestObject.url, contents: responseString, label: 'utag.sync.js' }
        resolve(responseObject)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

exports.getMobileHtmlFileFromCdn = function (account, profile, environment) {
  return new Promise((resolve, reject) => {
    const requestObject = tealiumCdnRequests.getCurrentMobileHtmlFromCdn(account, profile, environment)
    axios(requestObject)
      .then((responseString) => {
        const responseObject = { link: requestObject.url, contents: responseString, label: 'mobile.html' }
        resolve(responseObject)
      })
      .catch((error) => {
        reject(error)
      })
  })
}
