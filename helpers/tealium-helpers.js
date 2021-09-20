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

function waitForUnlock() {
  return new Promise(function (resolve, reject) {
      (function checkForUnlock(){
          const lockState = fse.readJsonSync(stateFile, {throw: false})
          if (lockState.lock !== 'true') return resolve();
          setTimeout(checkForUnlock, 300);
      })();
  });
}

function lockEnvFile () {
  let file = fse.readJSONSync(stateFile, {throw: false}) || {}
  file.lock = true
  fse.writeJsonSync(stateFile, file)
}

function unlockEnvFile () {
  let file = fse.readJSONSync(stateFile, {throw: false}) || {}
  file.lock = false
  fse.writeJsonSync(stateFile, file)
}

function updateTokens (utk, jsessionId) {
  let file = fse.readJSONSync(stateFile, {throw: false}) || {}
  file.utk = utk
  file.jsessionId = jsessionId
  fse.writeJsonSync(stateFile, file)
}

function getTokens () {
  let file = fse.readJSONSync(stateFile, {throw: false}) || {}
  let output = {}
  output.utk = file.utk || 'missing'
  output.jsessionId = file.jsessionId || 'missing'
  return output
}

exports.resetStateFile = function () {
  return unlockEnvFile()
}

const getValidTealiumUtkAndJsessionId = function (account, profile) {
  let authTokens = {}
  return new Promise((resolve, reject) => {
    let tokens = getTokens()
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
        console.log('ERROR: ' + error.response.status)
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


exports.getVolumesForRollingPeriod = (account, profile, rollingDaysBack) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens

    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
    // get the revision from the profile
    .then((tealiumAuth) => {
      authTokens = tealiumAuth
      return axios(tealiumApiRequests.getVolumeMetrics(account, profile, authTokens.utk, authTokens.jsessionId, getPastTimestampMs(rollingDaysBack), getPastTimestampMs(0)))
    })
    .then((output) => {
      const data = output.data
      let totals = {
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

// response like ["profile.loader", "revision.2", "profile.mobile", "profile.2", "profile.sync", "profile.1", "profile.3", "revision.sync"]
exports.getTemplateListForCurrentVersion = (account, profile) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens
    let latestRevision

    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
      // get the revision from the profile
      .then(function (tealiumAuth) {
        authTokens = tealiumAuth
        return axios(tealiumApiRequests.getTiqProfile(account, profile, authTokens.utk, authTokens.jsessionId))
      })
      // get the template list from the latest revision of the profile
      .then((profileInfo) => {
        profileInfo = JSON.parse(profileInfo)
        latestRevision = profileInfo.settings.revision
        return axios(tealiumApiRequests.getTagTemplateList(account, profile, authTokens.utk, authTokens.jsessionId, latestRevision))
      })
      .then((output) => {
        output = JSON.parse(output)
        output.revision = latestRevision
        resolve(output)
      })
      .catch((error) => {
        error = error || {}
        console.log(`ERROR: ${error.stack}`)
        reject(error)
      })
  })
}

exports.getTiqProfileData = (account, profile, revision) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens

    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
    // get the revision from the profile
    .then((tealiumAuth) => {
      authTokens = tealiumAuth
      return axios(tealiumApiRequests.getTiqProfile(account, profile, authTokens.utk, authTokens.jsessionId, revision))
    })
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

exports.getTemplateListForCurrentVersion = (account, profile) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens
    let revision

    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
    // get the revision from the profile
      .then((tealiumAuth) => {
        authTokens = tealiumAuth
        return axios(tealiumApiRequests.getTiqProfile(account, profile, authTokens.utk, authTokens.jsessionId))
      })
    // get the template list from the latest revision of the profile
      .then((profileInfo) => {
        profileInfo = JSON.parse(profileInfo)
        revision = profileInfo.settings.revision
        return axios(tealiumApiRequests.getTagTemplateList(account, profile, authTokens.utk, authTokens.jsessionId, revision))
      })
      .then((output) => {
        output = JSON.parse(output)
        output.revision = revision
        resolve(output)
      })
      .catch((error) => {
        error = error || {}
        console.log(`ERROR: ${error.stack}`)
        reject(error)
      })
  })
}

exports.getTagTemplateByRevisionAndKey = (account, profile, revision, tagKey) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens
    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
    // get the revision from the profile
      .then((tealiumAuth) => {
        authTokens = tealiumAuth
        return axios(tealiumApiRequests.getTagTemplate(account, profile, authTokens.utk, authTokens.jsessionId, revision, tagKey))
      })
    // get the template list from the latest revision of the profile
      .then((templateInfo) => {
        templateInfo = JSON.parse(templateInfo)
        resolve(templateInfo.content)
      })
      .catch((error) => {
        error = error || {}
        console.log(`ERROR: ${error.stack}`)
        reject(error)
      })
  })
}

exports.saveTagTemplateByRevisionAndKey = (account, profile, revision, tagKey, templateString) => {
  return new Promise((resolve, reject) => {
    'use strict'
    // accesses the internal Tealium API used to replay the trace in the UI

    // persist more globally
    let authTokens

    // get Tealium auth tokens
    getValidTealiumUtkAndJsessionId(account, profile)
    // get the revision from the profile
      .then((tealiumAuth) => {
        authTokens = tealiumAuth
        return axios(tealiumApiRequests.saveTagTemplate(account, profile, authTokens.utk, authTokens.jsessionId, revision, tagKey, templateString))
      })
    // get the template list from the latest revision of the profile
      .then((successMessage) => {
        successMessage = JSON.parse(successMessage)
        const output = {}
        output.template = successMessage.template
        output.message = successMessage.message
        resolve(output)
      })
      .catch((error) => {
        error = error || {}
        console.error(`${error.stack}`)
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

exports.getTagFileFromCdn = function (account, profile, environment, tagId, revisionString) {
  return new Promise((resolve, reject) => {
    if (!account || !profile || !environment || !tagId || !revisionString) {
      console.error(`Missing parameter in getTagFileFromCdn
      - account        : ${account}
      - profile        : ${profile}
      - environment    : ${environment}
      - tagId          : ${tagId}
      - revisionString : ${revisionString}
      
      `)
      resolve({ link: '', contents: '', label: `utag.${'MISSING-CONFIG-ERROR'}.js` })
    }
    const requestObject = tealiumCdnRequests.getCurrentTagJsFromCdn(account, profile, environment, tagId, revisionString)
    axios(requestObject)
      .then((responseString) => {
        const responseObject = { link: requestObject.url, contents: responseString, label: `utag.${tagId}.js` }
        resolve(responseObject)
      })
      .catch((error) => {
        if (error && error.statusCode === 404 ) {
          resolve({link: requestObject.url, contents: '', label: `utag.${tagId}.js`})
        } 
        reject(error)
      })
  })
}

exports.getTagRevisionsFromUtag = function (utagString) {
  const tagRevisions = {}
  const tagInfoMatch = utagString.match(/utag\.loader\.cfg={(.*)};/)
  // it's not valid JSON, annoyingly, so we need to treat it like strings
  // examples: ""10":{load:1,send:1,v:201812030812,wait:1,tid:4046"
  //           "20":{load:utag.cond[5],send:1,v:201803121116,wait:1,tid:12047"
  //           "43":{load:utag.cond[18],send:1,v:202002101550,wait:1,tid:1178}"
  const tagInfoArray = tagInfoMatch && tagInfoMatch !== null && tagInfoMatch[1] && tagInfoMatch[1].split('},"')

  // versions below 4.46 will return '0' here because of a longstanding bug that was fixed in 4.46, which will return '46'
  const utagVersionMatch = utagString.match(/^\/\/\s?tealium universal tag - utag\.loader (ut\d+\.\d+\.)/)

  // this is how we find the correct version in versions below
  const templateMatch = utagString.match(/{template:"(ut\d+\.\d+\.)",/)

  const utagVersionLegacy = templateMatch && templateMatch[1]
  const utagVersionNew = utagVersionMatch && utagVersionMatch[1]
  const utagVersion = utagVersionLegacy && utagVersionLegacy !== null ? utagVersionLegacy : (utagVersionNew || 'missing')

  Array.isArray(tagInfoArray) && tagInfoArray.forEach((tagString) => {
    const matches = tagString.match(/"?(\d+)"+:+.*,v:(\d+),+/)
    const tagUid = matches && matches[1]
    const tagRevision = matches && matches[2]
    if (tagUid && tagRevision) {
      tagRevisions[tagUid] = utagVersion + tagRevision
    } else {
      console.error(`Failed to get info from ${tagString}`)
    }
  })
  return tagRevisions
}

// returns source first, then target
exports.getBothTagFilesFromCdn = function (config) {
  return Promise.all([
    this.getTagFileFromCdn(config.source.account, config.source.profile, config.source.environment, config.source.tagId, config.source.tagRevisionString),
    this.getTagFileFromCdn(config.target.account, config.target.profile, config.target.environment, config.target.tagId, config.target.tagRevisionString)
  ])
}

exports.getTagInfoFromTagString = function (tagString) {
  const tagInfoMatch = tagString.match(/^\/\/tealium universal tag - (.*), Copyright/)
  const tagInfo = tagInfoMatch && tagInfoMatch[1]
  return tagInfo
}


