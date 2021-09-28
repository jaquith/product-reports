'use strict'

const cmps = {
  adopt: ['AdoptConsent'],
  adzapier: ['az-cookie-consent'],
  axeptio: ['axeptio_'],
  baycloud: ['__cq'],
  ccm19: ['ccm_consent', 'CCM.'],
  clym: ['Clym'],
  complianz: ['cmplz_'],
  consentmanagernet: ['__cmpc'],
  cookieassistant: ['cookie-assistant-'],
  cookiecontrol: ['CookieControl'],
  cookieinformation: ['CookieInformationConsent'],
  cookiescript: ['CookieScriptConsent'],
  cookiebot: ['CookieConsent'],
  cookiehub: ['cookiehub'],
  cookieyes: ['cky-consent', 'cookieyes', 'CookieLawInfoConsent', 'cookielawinfo-'],
  crownpeak: ['_evidon_consent_cookie'],
  didomi: ['didomi'],
  ensighten: ['ENSIGHTEN_'],
  iubenda: ['iubenda_'],
  ketch: ['ketchcdn.com/web/v1/consent/', '_swb'],
  legalmonster: ['legalmonster'],
  liveramp: ['cconsent-'],
  onetrust: ['OptanonConsent'],
  osano: ['osano'],
  pandectes: ['_pandectes_'],
  piwikpro: ['ppms_privacy_'],
  privacytools: ['cookieconsent_status'],
  privacy1: ['p1-cookie-'],
  quantcast: ['addtl_consent'],
  secureprivacy: ['sp_consent'],
  securiti: ['__privaci_cookie'],
  sourcepoint: ['_sp_v1_'],
  termly: ['TERMLY_API_CACHE', 'termly'],
  truendo: ['truendo_cmp'],
  trustarc: ['ccmapi_cookie_privacy'],
  trustcommander: ['TC_'],
  uniconsent: ['uniconsent-v2', '__unic'],
  usercentrics: ['usercentrics', 'uc_settings']
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

exports.getDetectedCmps = function (utag) {
  const cmpOutput = []
  Object.keys(cmps).forEach((name) => {
    const signatures = cmps[name]
    if (checkForCodeSignatures(signatures, utag)) {
      cmpOutput.push(name)
    }
  })
  return cmpOutput.join(' + ')
}

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
  if (!profile) return ''
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
    if (profile.customizations[id].extType === 'Privacy Manager' && profile.customizations[id].status === 'active') {
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

exports.checkForCmpExtensionInUtag = function (utag) {
  const signatures = ['tealiumCmpIntegration', 'Usercentrics Vanilla App', 'Usercentrics Browser SDK']
  return checkForCodeSignatures(signatures, utag)
}
