'use strict'

// return 0 or 1 (boolean) for db compatibility
exports.checkForConsentPrompt = function (profile) {
  if (!profile) return undefined
  const promptSettings = profile.privacy_management && profile.privacy_management.explicit
  if (promptSettings && promptSettings.isEnabled === 'true' && promptSettings.selectedTargets && promptSettings.selectedTargets.prod === 'true') {
    return 1
  }
  return 0
}

// return 0 or 1 (boolean) for db compatibility
exports.checkForCcpa = function (profile) {
  if (!profile) return undefined
  const ccpaSettings = profile.privacy_management && profile.privacy_management.doNotSell
  if (ccpaSettings && ccpaSettings.isEnabled === 'true' && ccpaSettings.selectedTargets.prod === 'true') {
    return 1
  }
  return 0
}

// return the load rule string ()
exports.getCcpaLoadRule = function (profile) {
  if (!profile) return undefined
  const ccpaSettings = profile.privacy_management && profile.privacy_management.doNotSell
  if (this.checkForCcpa(profile) === 1) {
    return ccpaSettings.loadrule
  }
  return ''
}

// return 0 or 1 (boolean) for db compatibility
exports.checkForConsentPreferences = function (profile) {
  if (!profile) return undefined
  const promptSettings = profile.privacy_management && profile.privacy_management.preferences
  if (promptSettings && promptSettings.isEnabled === 'true' && promptSettings.selectedTargets && promptSettings.selectedTargets.prod === 'true') {
    return 1
  }
  return 0
}

exports.checkForConsentLogging = function (profile) {
  if (!profile) return undefined
  const parent = profile.privacy_management
  if (parent && parent.event_log === 'yes') {
    return 1
  }
  return 0
}

// return the load rule string ()
exports.getConsentManagerLoadRule = function (profile) {
  if (!profile) return undefined
  const settings = (profile.privacy_management && profile.privacy_management.explicit) || {}
  if (this.checkForConsentPreferences(profile) === 1 || this.checkForConsentPrompt(profile) === 1) {
    return settings.loadrule
  }
  return ''
}

exports.checkForPrivacyManager = function (profile) {
  if (!profile) return undefined
  let foundPrivacyManager = 0
  const extensionIds = Object.keys(profile.customizations || {})
  extensionIds.forEach((id) => {
    if (profile.customizations[id].extType === 'Privacy Manager') {
      foundPrivacyManager = 1
    }
  })
  return foundPrivacyManager
}

exports.checkForMobilePublishing = function (profile) {
  if (!profile) return undefined
  if (profile.publish && profile.publish._mobile && profile.publish._mobile['5'] && profile.publish._mobile['5']._is_enabled === 'true') return 1
  return 0
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
