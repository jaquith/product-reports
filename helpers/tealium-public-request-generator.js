
function getCachebusterValue () {
  return String(Math.round(Math.random() * 1e18))
}

// accesses the internal Tealium API used to replay the trace in the UI
exports.generateNewTraceId = function (account, profile, utk, jsessionId) {
  if (!account || !profile) return {}
  return {
    method: 'POST',
    url: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/trace?utk=${utk}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

exports.getCurrentUtagJsFromCdn = function (account, profile, environment) {
  const cb = getCachebusterValue()
  console.log(`https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.js?_cb=${cb}`)
  return {
    method: 'GET',
    url: `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.js`
  }
}

exports.getCurrentUtagSyncJsFromCdn = function (account, profile, environment) {
  const cb = getCachebusterValue()
  return {
    method: 'GET',
    url: `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.sync.js?_cb=${cb}`
  }
}

exports.getCurrentMobileHtmlFromCdn = function (account, profile, environment) {
  const cb = getCachebusterValue()
  return {
    method: 'GET',
    url: `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/mobile.html?_cb=${cb}`
  }
}

exports.getCurrentTagJsFromCdn = function (account, profile, environment, tagId, revisionString) {
  return {
    method: 'GET',
    url: `https://tags.tiqcdn.com/utag/${account}/${profile}/${environment}/utag.${tagId}.js?utv=${revisionString}`
  }
}
