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
exports.checkForCcpa = function (profile) {
  try {
    const ccpaSettings = profile.privacy_management.doNotSell
    if (ccpaSettings.isEnabled === 'true' && ccpaSettings.selectedTargets.prod === 'true') {
      return 1
    } 
    return 0
  }
  catch (e) {
    return 0
  }
}

// return the load rule string ()
exports.getCcpaLoadRule = function (profile) {
  try {
    const ccpaSettings = profile.privacy_management.doNotSell
    if (this.checkForCcpa(profile) === 1) {
      return ccpaSettings.loadrule
    } 
    return ''
  }
  catch (e) {
    return ''
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

// return the load rule string ()
exports.getConsentManagerLoadRule = function (profile) {
  try {
    const settings = profile.privacy_management.explicit
    if (this.checkForConsentPreferences(profile) === 1 || this.checkForConsentPrompt(profile) === 1) {
      return settings.loadrule
    } 
    return ''
  }
  catch (e) {
    return ''
  }
}

exports.checkForPrivacyManager = function (profile) {
  let foundPrivacyManager = 0
  try {
    const extensionIds = Object.keys(profile.customizations)
    extensionIds.forEach((id) => {
      if (profile.customizations[id].extType === 'Privacy Manager') {
        foundPrivacyManager = 1
      }
    })
    return foundPrivacyManager
  }
  catch (e) {
    return foundPrivacyManager
  }
}


exports.checkForMobilePublishing = function (profile) {
  try {
    if (profile.publish._mobile['5']._is_enabled === 'true') return 1
  }
  catch (e) {
    return 0
  }
}

const checkForCodeSignatures = function (signatures, utag) {
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
  const signatures = ['usercentrics', 'uc_settings']
  return checkForCodeSignatures(signatures, utag)
}

exports.checkForOneTrustInUtag = function (utag) {
  const signatures = ['cp.OptanonConsent']
  return checkForCodeSignatures(signatures, utag)
}

exports.checkForDidomiInUtag = function (utag) {
  const signatures = ['didomi']
  return checkForCodeSignatures(signatures, utag)
}

exports.checkForCmpExtensionInUtag = function (utag) {
  const signatures = ['tealiumCmpIntegration', 'Usercentrics Vanilla App', 'Usercentrics Browser SDK']
  return checkForCodeSignatures(signatures, utag)
}

