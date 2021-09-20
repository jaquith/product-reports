'use strict'

// return 0 or 1 (boolean) for db compatibility
exports.checkForConsentPrompt = function (profile) {
  try {
    const promptSettings = profile.privacy_management.explicit
    if (promptSettings.isEnabled === 'true' && promptSettings.selectedTargets.prod === 'true') {
      return 1
    } 
    return 0
  }
  catch (e) {
    return 0
  }
}

// return 0 or 1 (boolean) for db compatibility
exports.checkForConsentPreferences = function (profile) {
  try {
    const promptSettings = profile.privacy_management.preferences
    if (promptSettings.isEnabled === 'true' && promptSettings.selectedTargets.prod === 'true') {
      return 1
    } 
    return 0
  }
  catch (e) {
    return 0
  }
}

exports.checkForConsentLogging = function (profile) {
  try {
    const parent = profile.privacy_management
    if (parent.event_log === 'yes') {
      return 1
    } 
    return 0
  }
  catch (e) {
    return 0
  }
}

const checkForCmp = function (signatures, utag) {
  signatures = signatures || []
  let foundCmp = 0
  signatures.forEach((snippet) => {
    if (typeof snippet === 'string' && snippet !== '' && utag && utag.contents && utag.contents.data.indexOf(snippet) !== -1) {
      foundCmp = 1
    }
  })
  return foundCmp
}

exports.checkForUsercentricsInUtag = function (utag) {
  const signatures = ['Usercentrics Vanilla App', 'Usercentrics Browser SDK', 'usercentrics', 'uc_settings']
  return checkForCmp(signatures, utag)
}

exports.checkForOneTrustInUtag = function (utag) {
  const signatures = ['cp.OptanonConsent']
  return checkForCmp(signatures, utag)
}

exports.checkForDidomiInUtag = function (utag) {
  const signatures = ['didomi_token', 'didomi']
  return checkForCmp(signatures, utag)
}

exports.checkForCmpExtensionInUtag = function (utag) {
  const signatures = ['tealiumCmpIntegration']
  return checkForCmp(signatures, utag)
}

