'use strict'

/**
 *
 *
 * But the idea is that the user shouldn't need to manage those at all, it should happen in the background.
 *
 * In this file mostly, using .env and updating it as need.
 */

require('dotenv').config()

const tealiumEmail = process.env.username || 'missing'
const tealiumPass = process.env.password || 'missing'

const axios = require('axios')
const fse = require('fs-extra')

const stateFile = '/Users/calebjaquith/.git/product-reports/.env-state'

const tealiumApiRequests = require('../helpers/tealium-api-request-generator.js')
const tealiumCdnRequests = require('../helpers/tealium-public-request-generator.js')

function waitForUnlock () {
  return new Promise(function (resolve, reject) {
    (function checkForUnlock () {
      const lockState = fse.readJsonSync(stateFile, { throw: false })
      if (lockState.lock !== 'true') return resolve()
      setTimeout(checkForUnlock, 300)
    })()
  })
}

function lockEnvFile () {
  const file = fse.readJSONSync(stateFile, { throw: false }) || {}
  file.lock = true
  fse.writeJsonSync(stateFile, file)
}

function unlockEnvFile () {
  const file = fse.readJSONSync(stateFile, { throw: false }) || {}
  file.lock = false
  fse.writeJsonSync(stateFile, file)
}

function updateTokens (utk, jsessionId) {
  const file = fse.readJSONSync(stateFile, { throw: false }) || {}
  file.utk = utk
  file.jsessionId = jsessionId
  fse.writeJsonSync(stateFile, file)
}

function getTokens () {
  const file = fse.readJSONSync(stateFile, { throw: false }) || {}
  const output = {}
  output.utk = file.utk || 'missing'
  output.jsessionId = file.jsessionId || 'missing'
  return output
}

exports.resetStateFile = function () {
  return unlockEnvFile()
}

exports.getValidTealiumUtkAndJsessionId = function (account, profile) {
  let authTokens = {}
  return new Promise((resolve, reject) => {
    const tokens = getTokens()
    let tealiumUtk = tokens.utk
    let tealiumJsessionId = tokens.jsessionId
    waitForUnlock()
      .then(() => {
        lockEnvFile()
        return axios(tealiumApiRequests.ping(account, profile, tealiumUtk, tealiumJsessionId))
      })
    // catch error responses
      .then((success) => {
        authTokens = { utk: tealiumUtk, jsessionId: tealiumJsessionId }
        unlockEnvFile()
        return authTokens
      })
      .catch(function (error) {
      // handle 401s with re-authentication), treat all errors as 401s
        if (error) {
        // console.log('ERROR: ' + error.response.status)
          return axios(tealiumApiRequests.loginUser(tealiumEmail, tealiumPass))
            .then(function (response) {
              const body = response.data
              // get the UTK
              if (body.utk) tealiumUtk = body.utk
              // get an array of the set-cookie headers to look for the JSESSION id
              const setCookies = response.headers['set-cookie'] || []
              const re = /^JSESSIONID=([^;]*);/
              for (let i = 0; i < setCookies.length; i++) {
                const match = re.exec(setCookies[i])
                if (match && match[1]) {
                  tealiumJsessionId = match[1]
                  break
                }
              }
              authTokens = { utk: tealiumUtk, jsessionId: tealiumJsessionId }
              return authTokens
            })
            .then(function (authTokens) {
              // console.log("Successfully authenticated with Tealium.")
              updateTokens(authTokens.utk, authTokens.jsessionId)
              unlockEnvFile()
              resolve(authTokens)
            })
        } else {
          throw error
        }
      })
      .catch(function (error) {
        console.error('FAILED to authenticate with Tealium: ', error)
        reject(error)
      })
  })
}

const getPastTimestampMs = function (daysInPast) {
  daysInPast = daysInPast || 0
  // use milliseconds because the Tealium API for volumes does
  return Date.now() - (daysInPast * 86400000)
}

exports.getVolumesForRollingPeriod = (account, profile, utk, jsessionId, rollingDaysBack) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    axios(tealiumApiRequests.getVolumeMetrics(account, profile, utk, jsessionId, getPastTimestampMs(rollingDaysBack), getPastTimestampMs(0)))
      .then((output) => {
        const data = output.data
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

exports.getTiqProfileData = (account, profile, utk, jsessionId, revision) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI
    axios(tealiumApiRequests.getTiqProfile(account, profile, utk, jsessionId, revision))
      .then((output) => {
        resolve(output.data)
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
