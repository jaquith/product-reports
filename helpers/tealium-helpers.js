'use strict'

const axios = require('axios')
const tealiumCdnRequests = require('../helpers/tealium-public-request-generator.js')

const getPastTimestampMs = function (daysInPast) {
  daysInPast = daysInPast || 0
  // use milliseconds because the Tealium API for volumes does
  return Date.now() - (daysInPast * 86400000)
}

const getDayFromTimestampMs = function (timestampMs) {
  const theDate = new Date(timestampMs)
  return theDate.toISOString().split('T')[0] + 'T00:00:00.000Z'
}

// lifted from the magic metrics tool to allow us to populate a table with type (it's not exposed by the library)
exports.getAccountType = function (account) {
  const ACCOUNT_TYPES = { CUSTOMER: 'customer', INVALID: 'invalid', TEALIUM: 'internal', DEMO: 'demo', TESTING: 'testing' }
  const tealiumAccounts = Object.freeze({
    aaron: 1,
    'aaron-testtesttest': 1,
    'adrian-test': 1,
    'bruno-test': 1,
    craigtest12: 1,
    'eng-ab': 1,
    'fiann-test2': 1,
    'fiann-test3': 1,
    ianhampton: 1,
    'jared-trial': 1,
    jaredtest: 1,
    'jasonbain.com': 1,
    jaytest: 1,
    jefflunsford: 1,
    lunsford123: 1,
    jh: 1,
    'josh.wolftealium.com': 1,
    jtgsandbox: 1,
    'melissa-test': 1,
    'qa-audiencestream': 1,
    simonbrowning: 1,
    stevelake: 1,
    trevorsaccount: 1,
    'tu-exam': 1,
    'utag.other.account': 1,
    walter: 1,
    zlatic: 1,
    temp1s: 1,
    'test-go-live': 1,
    'uber..': 1,
    'testing-hassan2': 1,
    'kyle-testing': 1,
    'testing-account': 1,
    'melissa-permissions-test': 1,
    'melissa-ss-permissions': 1,
    'melissa-test2': 1,
    'melissa-test4': 1,
    melissatest2: 1,
    melissatestgolive: 1,
    melissatestgolive222: 1,
    melissatestgolivecreateaccou: 1,
    melissatestgolivetake4: 1
  })

  if (!account) {
    return ACCOUNT_TYPES.INVALID
  }
  if (!/^[a-z0-9.-]{1,30}$/.test(account)) {
    return ACCOUNT_TYPES.INVALID
  }

  if (tealiumAccounts[account] ||
    ~account.indexOf('accounting-') ||
    ~account.indexOf('auto.account.bronze-') ||
    ~account.indexOf('bart.freetrial') ||
    ~account.indexOf('cting-') ||
    ~account.indexOf('dev-') ||
    ~account.indexOf('devops-') ||
    ~account.indexOf('digitalvelocity') ||
    ~account.indexOf('edu-') ||
    ~account.indexOf('education-') ||
    ~account.indexOf('eng-') ||
    ~account.indexOf('engineering-') ||
    ~account.indexOf('facilities-') ||
    ~account.indexOf('finance-') ||
    ~account.indexOf('hr-') ||
    ~account.indexOf('legal-') ||
    ~account.indexOf('marketing-') ||
    ~account.indexOf('mktg-') ||
    ~account.indexOf('nt-') ||
    ~account.indexOf('ntynen.') ||
    ~account.indexOf('prodops-') ||
    ~account.indexOf('product-') ||
    ~account.indexOf('sales-') ||
    ~account.indexOf('salesops-') ||
    ~account.indexOf('se-') ||
    ~account.indexOf('serivces-') ||
    ~account.indexOf('services-') ||
    ~account.indexOf('services.') ||
    ~account.indexOf('solutions-') ||
    ~account.indexOf('solutions.') ||
    ~account.indexOf('success-') ||
    ~account.indexOf('support-') ||
    ~account.indexOf('tealium') ||
    ~account.indexOf('testlarry') ||
    ~account.indexOf('training-') ||
    ~account.indexOf('trial.creation.') ||
    ~account.indexOf('trial.upgrade.') ||
    ~account.indexOf('puppeteertest') ||
    ~account.indexOf('tu-australia-') ||
    /-(training|tealium)$/.test(account) ||
    tealiumAccounts[account]) {
    return ACCOUNT_TYPES.TEALIUM
  }

  if (~account.indexOf('demo-') ||
    ~account.indexOf('poc-') ||
    /-demo$/.test(account) ||
    /-sandbox$/.test(account) ||
    ~account.indexOf('sbx-')
  ) {
    return ACCOUNT_TYPES.DEMO
  }

  if (~account.indexOf('testing')) {
    return ACCOUNT_TYPES.TESTING
  }

  return ACCOUNT_TYPES.CUSTOMER
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

exports.getCdhVolumesForRollingPeriod = (account, profile, getVolumesHelper, rollingDaysBack) => {
  return new Promise((resolve, reject) => {
    'use strict'
    const startDate = getDayFromTimestampMs(getPastTimestampMs(rollingDaysBack))
    const endDate = getDayFromTimestampMs(getPastTimestampMs(0))

    getVolumesHelper(account, profile, startDate, endDate)
      .then((output) => {
        const summary = {}
        const volumeMetrics = Object.keys(output)
        volumeMetrics.forEach((key) => {
          const dailyTotals = output[key]
          const sum = dailyTotals.reduce((prev, current) => {
            return prev + current.events
          }, 0)
          summary[key] = sum
        })
        resolve(summary)
      })
      .catch((error) => {
        error = error || {}
        // console.log(`ERROR: ${error.stack}`)
        reject(error)
      })
  })
}

exports.getUtagFileFromCdn = function (account, profile, environment) {
  'use strict'
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

exports.getCdhProfile = function (account, profile, revision) {
  'use strict'
  return new Promise((resolve, reject) => {
    const requestObject = tealiumCdnRequests.getCdhProfile(account, profile, revision)
    axios(requestObject)
      .then((responseString) => {
        resolve(responseString)
      })
      .catch((error) => {
        reject(error)
      })
  })
}