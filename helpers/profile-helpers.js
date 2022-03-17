'use strict'

const cmps = {
  admiral: ['admiral'],
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
  drupal: ['Drupal.eu_cookie_', 'cookie-agreed-'],
  ensighten: ['ENSIGHTEN_'],
  iubenda: ['iubenda_'],
  ketch: ['ketchcdn.com/web/v1/consent/', '_swb'],
  legalmonster: ['legalmonster', 'legal.'],
  liveramp: ['cconsent-'],
  oil: ['oil_', 'oil-'],
  onetrust: ['OptanonConsent', 'OptanonActiveGroups'],
  osano: ['osano'],
  pandectes: ['_pandectes_'],
  piwikpro: ['ppms_privacy_'],
  privacytools: ['cookieconsent_status'],
  privacy1: ['p1-cookie-'],
  quantcast: ['addtl_consent'],
  secureprivacy: ['sp_consent'],
  securiti: ['__privaci_cookie'],
  sourcepoint: ['_sp_v1_', '_sp_'],
  termly: ['TERMLY_API_CACHE', 'termly'],
  truendo: ['truendo_cmp'],
  trustarc: ['ccmapi_cookie_privacy', 'truste.'],
  trustcommander: ['TC_'],
  uniconsent: ['uniconsent-v2', '__unic'],
  usercentrics: ['usercentrics', 'uc_settings']
}

const checkForCodeSignatures = function (signatures, string) {
  function escapeRegExp (text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  }
  signatures = signatures || []
  let foundCmp = 0
  signatures.forEach((snippet) => {
    const escapedSnippetForRegExp = escapeRegExp(snippet)
    // needs to be multiline to work correctly on the utag string
    const reMid = new RegExp(`^.*[^A-Za-z_\\-0-9]+${escapedSnippetForRegExp}`, 'm')
    const reStart = new RegExp(`^${escapedSnippetForRegExp}`, 'm')
    if ((typeof snippet === 'string' && snippet !== '' && typeof string === 'string' && reMid.test(string)) || reStart.test(string)) {
      foundCmp = 1
    }
  })
  return foundCmp
}

exports.getDetectedCmps = function (utag) {
  const cmpOutput = []
  Object.keys(cmps).forEach((name) => {
    const signatures = cmps[name]
    const utagString = utag && utag.contents && utag.contents.data
    if (typeof utagString === 'string' && checkForCodeSignatures(signatures, utagString)) {
      cmpOutput.push(name)
    }
  })
  return cmpOutput.join(' + ')
}

exports.getProfileType = function (profileData) {
  if (profileData.settings.library === 'NONE') return 'standard'
  return 'library'
}

exports.checkForIabTcf2 = function (utag) {
  const signatures = ['euconsent-v2', '__tcfapi']
  const utagString = utag && utag.contents && utag.contents.data
  if (typeof utagString === 'string' && checkForCodeSignatures(signatures, utagString)) {
    return 1
  }
  return 0
}

exports.countActiveTagsByTemplateId = function (profileData) {
  const allTagIds = Object.keys(profileData.manage || {})
  const tagCounter = {}
  const names = {}
  tagCounter.total = 0
  tagCounter.total_from_library = 0
  allTagIds.forEach(function (id) {
    const tagInfo = profileData.manage[id]
    const activeOnProd = tagInfo.selectedTargets && tagInfo.selectedTargets.prod === 'true' && tagInfo.status === 'active'
    if (activeOnProd === true) {
      tagCounter[tagInfo.tag_id] = tagCounter[tagInfo.tag_id] || {}
      tagCounter[tagInfo.tag_id].count = tagCounter[tagInfo.tag_id].count || 0
      tagCounter[tagInfo.tag_id].count_from_library = tagCounter[tagInfo.tag_id].count_from_library || 0
      tagCounter.total++
      tagCounter[tagInfo.tag_id].count++
      tagCounter[tagInfo.tag_id].name = tagInfo.tag_name
      names[tagInfo.tag_id] = tagInfo.tag_name
      if (tagInfo.settings && typeof tagInfo.settings.library === 'string') {
        tagCounter[tagInfo.tag_id].name = tagInfo.tag_name
        tagCounter.total_from_library++
        tagCounter[tagInfo.tag_id].count_from_library++
      }
    }
  })
  // to get an idea of how many tags customers are using

  const justTagsNoTotals = JSON.parse(JSON.stringify(tagCounter))
  delete justTagsNoTotals.total
  delete justTagsNoTotals.total_from_library

  tagCounter.tag_template_count = Object.keys(tagCounter).length - 2 // subtract the total and library counter

  return tagCounter
}

exports.countAttributesByType = function (cdhProfileData) {
  const output = {}
  cdhProfileData.quantifiers.forEach(function (attr) {
    const key = `${attr.context} ${attr.type}`
    output[key] = output[key] || {}
    output[key].context = attr.context
    output[key].type = attr.type
    output[key].count = output[key].count || 0
    output[key].count_preloaded = output[key].count_preloaded || 0
    output[key].count_db_enabled = output[key].count_db_enabled || 0
    output[key].count++

    if (attr.preloaded === true) {
      output[key].count_preloaded++
    }

    if ((attr.context === 'Event' && attr.eventDBEnabled === true) ||
        ((attr.context === 'Visitor' || attr.context === 'Current Visit') && attr.audienceDBEnabled === true)) {
      output[key].count_db_enabled++
    }
  })
  return output
}

exports.countConnectorActionsByType = function (cdhProfileData) {
  const output = {}

  // make a lookup object to avoid looping every time
  const actionLookup = {}
  cdhProfileData.actions.forEach(function (action) {
    if (action.enabled !== true) return // skip deactivated
    // connector.configurations.prod.forEach()
    const key = `${action.connectorId}`
    actionLookup[key] = actionLookup[key] || {}
    actionLookup[key][action.type] = actionLookup[key][action.type] || {}
    actionLookup[key][action.type][action.trigger] = actionLookup[key][action.trigger] || 0
    actionLookup[key][action.type][action.trigger]++
  })


  cdhProfileData.connectors.forEach(function (connector) {
    if (connector.enabled !== true) return // skip deactivated
    // connector.configurations.prod.forEach()
    const key = `${connector.type}`
    output[key] = output[key] || {}
    output[key].type = connector.type
    output[key].count = output[key].count || 0
    output[key].action_counts = output[key].action_counts || {}
    output[key].count++

    const actions = actionLookup[connector.id]
    Object.keys(actions).forEach(function (actionType) {
      output[key].action_counts[actionType] = output[key].action_counts[actionType] || {}
      Object.keys(actions[actionType]).forEach(function (trigger) {
        output[key].action_counts[actionType][trigger] = output[key].action_counts[actionType][trigger] || 0
        output[key].action_counts[actionType][trigger]++
      })
    })

  })
  return output
}

exports.countActiveExtensionsByTemplateId = function (profileData) {
  const allExtensionIds = Object.keys(profileData.customizations || {})
  const extensionCounter = {}
  extensionCounter.total = 0
  extensionCounter.total_from_library = 0
  allExtensionIds.forEach(function (id) {
    const info = profileData.customizations[id]
    const activeOnProd = info.selectedTargets && info.selectedTargets.prod === 'true' && info.status === 'active'
    if (activeOnProd === true) {
      extensionCounter[info.id] = extensionCounter[info.id] || {}
      extensionCounter[info.id].count = extensionCounter[info.id].count || 0
      extensionCounter[info.id].count_from_library = extensionCounter[info.id].count_from_library || 0
      extensionCounter[info.id].count++
      extensionCounter[info.id].id = info.id
      extensionCounter[info.id].name = info.extType
      extensionCounter.total++

      if (info.settings && typeof info.settings.library === 'string') {
        extensionCounter.total_from_library++
        extensionCounter[info.id].count_from_library++
      }
    }
  })
  return extensionCounter
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
  const signatures = ['tealiumCmpIntegration']
  const utagString = utag && utag.contents && utag.contents.data
  return checkForCodeSignatures(signatures, utagString)
}

exports.getDaysSinceVersion = function (versionString) {
  const formatted = `${versionString.slice(0, 4)}-${versionString.slice(4, 6)}-${versionString.slice(6, 8)}T${versionString.slice(8, 10)}:${versionString.slice(10, 12)}:00.000Z`
  const publishTime = new Date(formatted)
  const now = new Date()
  const daysSincePublish = Math.round((now - publishTime) / 86400000)
  return daysSincePublish
}
