const qs = require('qs')

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

exports.getCollectRequest = function (body) {
  return {
    method: 'POST',
    url: 'https://collect.tealiumiq.com/event',
    body: body || {},
    json: true // automatically stringifies the body to JSON
  }
}

exports.getTraceStep = function (account, profile, utk, jsessionId, traceId) {
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/trace/${traceId}/step?utk=${utk}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

exports.getProfileAttributeNames = function (account, profile, utk, jsessionId) {
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/datacloud/${account}/${profile}/profile/?utk=${utk}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

exports.loginUser = function (email, pass) {
  if (!email || !pass) return {}
  return {
    method: 'POST',
    url: 'https://api.tealiumiq.com/v1/login',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: qs.stringify({
      username: email,
      password: pass
    })
  }
}

exports.ping = function (account, profile, utk, jsessionId) {
  return {
    method: 'POST',
    url: `https://my.tealiumiq.com/urest/ping?utk=${utk}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    },
    body: {
      account: account,
      profile: profile
    },
    json: true // automatically stringifies the body to JSON for the POST reqest
  }
}

// response with 'revision' in body - needed this to pull the current templates
exports.getTiqProfile = function (account, profile, utk, jsessionId, revision) {
  // revision is optional, defaults to latest version
  const revisionString = typeof revision === 'string' ? `&revision=${revision}` : '&r=getProfile'
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/legacy/getProfile?account=${account}&profile=${profile}&utk=${utk}${revisionString}&cb=${Math.random()}&_=${Date.now()}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

// response like { "templates" : { "profile.1" : "Tealium Collect: Tealium Collect: Tag (Profile)" , "profile.loader" : "uTag Loader (Profile)" , "profile.mobile" : "Mobile Template (Profile)" , "profile.3" : "Facebook Pixel: Facebook Pixel: Tag (Profile)" , "profile.sync" : "uTag Sync (Profile)" , "profile.2" : "Sovendus: Sovendus: Tag (Profile)" , "revision.sync" : "uTag Sync (Version)"}}
exports.getTagTemplateList = function (account, profile, utk, jsessionId, revision) {
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/legacy/getTemplateList?account=${account}&profile=${profile}&utk=${utk}&revision=${revision}&cb=${Math.random()}&_=${Date.now()}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

// tagKey like profile.4
exports.getTagTemplate = function (account, profile, utk, jsessionId, revision, tagKey) {
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/legacy/getTemplate?account=${account}&profile=${profile}&utk=${utk}&revision=${revision}&template=${tagKey}&cb=${Math.random()}&_=${Date.now()}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

exports.getVolumeMetrics = function (account, profile, utk, jsessionId, startTimestampMs, endTimestampMs) {
  return {
    method: 'GET',
    url: `https://my.tealiumiq.com/urest/tag_usage/${account}/${profile}/${startTimestampMs}/${endTimestampMs}?utk=${utk}&_=${Math.random()}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    }
  }
}

exports.saveTagTemplate = function (account, profile, utk, jsessionId, revision, tagKey, templateString) {
  const profileOrRevision = tagKey.split('.')[0] === 'profile' ? 'profile' : 'revision'
  const formData = {
    account: account,
    profile: profile,
    type: profileOrRevision,
    template: tagKey, // like 'profile.2'
    code: templateString
  }
  if (profileOrRevision !== 'profile') formData.revision = revision // only included in non-profile template updates
  return {
    method: 'POST',
    url: `https://my.tealiumiq.com/urest/legacy/saveTemplate?utk=${utk}`,
    headers: {
      Cookie: `JSESSIONID=${jsessionId}`,
      Accept: 'application/json'
    },
    form: formData
  }
}
