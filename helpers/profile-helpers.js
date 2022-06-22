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

function normalizeKey (key) {
  return String(key).split('.').slice(-1).join('')
}

function getAttributeKey (attr) {
  let key = attr.id
  if (attr.context === 'Event' && attr.dataSourceType !== 'tag') {
    key = attr.eventKey || attr.name // use the eventKey if it's present
  }
  return normalizeKey(key)
}

function getAttributeIdLookup (cdhProfileData) {
  const lookup = {}
  for (let i = 0; i < cdhProfileData.quantifiers.length; i++) {
    const attr = cdhProfileData.quantifiers[i]
    const adjustedId = getAttributeKey(attr)
    // different parts of the system use either the event name OR number, so we need ways to look up everything
    lookup[adjustedId] = String(attr.id)
    lookup[String(adjustedId)] = String(attr.id)
    lookup[String(attr.id)] = String(attr.id)
  }
  return lookup
}

function modelAttributeRelationships (cdhProfileData) {
  const attributes = {}
  const nameLookup = getAttributeIdLookup(cdhProfileData)
  const missing = []
  // build
  for (let i = 0; i < cdhProfileData.quantifiers.length; i++) {
    const attr = cdhProfileData.quantifiers[i]

    const key = `${attr.id}`
    attributes[key] = attributes[key] || {}
    attributes[key].id = attr.id
    attributes[key].context = attr.context
    attributes[key].type = attr.type.replace(/^visitor_/, '')
    attributes[key].name = attr.name
    attributes[key].dataSourceType = attr.dataSourceType
    attributes[key].is_preloaded = (attr.preloaded === true) ? 1 : 0
    attributes[key].is_db_enabled = ((attr.context === 'Event' && attr.eventDBEnabled === true) || ((attr.context === 'Visitor' || attr.context === 'Current Visit') && attr.audienceDBEnabled === true)) ? 1 : 0

    attributes[key].upstream_attributes = {}
    attributes[key].downstream_attributes = {}

    attributes[key].audience_references = {}
    attributes[key].event_feed_references = {}
    attributes[key].connector_mappings = {}
    attributes[key].event_spec_references = {}
  }

  // check enrichments for upstream and downstream
  for (let i = 0; i < cdhProfileData.transformations.length; i++) {
    const enrichment = cdhProfileData.transformations[i]

    let destinationAttribute
    const sourceAttributes = []
    const keys = Object.keys(enrichment.actionData || {})

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const attributeKey = normalizeKey(enrichment.actionData[key])
      if (key === 'quantifierId') {
        destinationAttribute = attributeKey
      } else {
        sourceAttributes.push(attributeKey)
      }
    }

    for (let i = 0; i < sourceAttributes.length; i++) {
      const sourceAttribute = sourceAttributes[i]
      if (!sourceAttribute) continue

      const source = nameLookup[sourceAttribute]
      const dest = nameLookup[destinationAttribute]
      if (!attributes[source]) {
        missing.push(sourceAttribute)
        continue
      }
      if (!attributes[dest]) {
        missing.push(destinationAttribute)
        continue
      }
      attributes[dest].upstream_attributes[source] = attributes[dest].upstream_attributes[source] || 0
      attributes[dest].upstream_attributes[source]++

      attributes[source].downstream_attributes[dest] = attributes[source].downstream_attributes[dest] || 0
      attributes[source].downstream_attributes[dest]++
    }
  }

  const audiences = Object.keys(cdhProfileData.audiences || {})
  for (let i = 0; i < audiences.length; i++) {
    const audienceId = audiences[i]
    const audienceInfo = cdhProfileData.audiences[audienceId]
    const logic = JSON.parse(audienceInfo.logic)
    for (let j = 0; j < logic.$or.length; j++) { // for each OR block
      for (let k = 0; k < logic.$or[j].$and.length; k++) { // for each AND block in the OR block
        const logicBlock = logic.$or[j].$and[k]
        const references = Object.values(logicBlock)
        for (let l = 0; l < references.length; l++) {
          const ref = references[l]
          if (typeof ref === 'string' && /.+\.[0-9]+/.test(ref)) { // recognized based on format, like 'secondary_ids.5044'
            const referencedAttribute = nameLookup[normalizeKey(ref)]
            if (!attributes[referencedAttribute]) {
              missing.push(referencedAttribute)
              continue
            }
            attributes[referencedAttribute].audience_references[audienceId] = attributes[referencedAttribute].audience_references[audienceId] || 0
            attributes[referencedAttribute].audience_references[audienceId]++
          }
        }
      }
    }
  }

  const eventSpecs = cdhProfileData.eventDefinitions || []
  eventSpecs.forEach((spec) => {
    spec.eventAttributes.forEach((attrInfo) => {
      const referencedAttribute = nameLookup[normalizeKey(attrInfo.attribute)]
      attributes[referencedAttribute].event_spec_references[spec.tealiumEvent] = attributes[referencedAttribute].event_spec_references[spec.tealiumEvent] || 0
      attributes[referencedAttribute].event_spec_references[spec.tealiumEvent]++
      // always increment tealium_event, since it's involved in each event spec
      const tealiumEvent = nameLookup.tealium_event
      attributes[tealiumEvent].event_spec_references[spec.tealiumEvent] = attributes[tealiumEvent].event_spec_references[spec.tealiumEvent] || 0
      attributes[tealiumEvent].event_spec_references[spec.tealiumEvent]++
    })
  })

  const eventFeeds = cdhProfileData.archivedFilteredStreams || []
  for (let i = 0; i < eventFeeds.length; i++) {
    const feedInfo = eventFeeds[i]
    const logic = JSON.parse(feedInfo.logic)
    if (!logic.$or) continue // all_events feed has no
    for (let j = 0; j < logic.$or.length; j++) { // for each OR block
      for (let k = 0; k < logic.$or[j].$and.length; k++) { // for each AND block in the OR block
        const logicBlock = logic.$or[j].$and[k]
        const references = Object.values(logicBlock)
        for (let l = 0; l < references.length; l++) {
          const ref = references[l]
          if (typeof ref === 'string' && /.+\..+/.test(ref)) { // recognized based on format, like 'secondary_ids.5044'
            const referencedAttribute = nameLookup[normalizeKey(ref)]
            if (!attributes[referencedAttribute]) {
              missing.push(referencedAttribute)
              continue
            }
            attributes[referencedAttribute].event_feed_references[feedInfo.id] = true
          }
        }
      }
    }
  }

  return attributes
}
exports.modelAttributeRelationships = modelAttributeRelationships

exports.summarizeAttributes = function (cdhProfileData) {
  const output = {}
  if (!cdhProfileData || !cdhProfileData.quantifiers) return output

  const model = modelAttributeRelationships(cdhProfileData)
  const attributes = Object.keys(model)
  for (let i = 0; i < attributes.length; i++) {
    const attr = model[attributes[i]]
    const key = `${attr.context} ${attr.type}`
    output[key] = output[key] || {}
    output[key].context = attr.context
    output[key].type = attr.type
    output[key].count = output[key].count || 0
    output[key].count_preloaded = output[key].count_preloaded || 0
    output[key].count_db_enabled = output[key].count_db_enabled || 0

    output[key].count_used_in_enrichments = output[key].count_used_in_enrichments || 0
    output[key].count_used_in_audiences = output[key].count_used_in_audiences || 0
    output[key].count_used_in_event_feeds = output[key].count_used_in_event_feeds || 0

    // TODO
    output[key].count_used_in_connectors = output[key].count_used_in_connectors || 0
    // output[key].count_used_in_event_specs = output[key].count_used_in_event_specs || 0

    output[key].count++

    if (attr.is_preloaded === 1) {
      output[key].count_preloaded++
    }

    if (attr.is_db_enabled === 1) {
      output[key].count_db_enabled++
    }

    if ((Object.keys(attr.downstream_attributes).length + Object.keys(attr.upstream_attributes).length) !== 0) {
      output[key].count_used_in_enrichments++
    }

    if (Object.keys(attr.audience_references).length !== 0) {
      output[key].count_used_in_audiences++
    }

    if (Object.keys(attr.event_feed_references).length !== 0) {
      output[key].count_used_in_event_feeds++
    }
  }

  return output
}

exports.summarizeActivations = function (cdhProfileData, attributeDetails) {
  const profileData = cdhProfileData || {}
  const activations = {}
  const nameLookup = getAttributeIdLookup(cdhProfileData)

  // the initial publish is sometimes missing these objects in older profiles
  if (!profileData) return {}

  Object.keys(profileData.audiences || {}).forEach((audienceId) => {
    const audienceInfo = profileData.audiences[audienceId]
    activations[audienceId] = {
      type: 'audience',
      logic: audienceInfo.logic,
      name: audienceInfo.name,
      visitor_retention_days: audienceInfo.visitorRetentionDays,
      active_connector_actions: [],
      attribute_references: {},
      mapped_attributes: {}
    }
  })

  profileData.archivedFilteredStreams && profileData.archivedFilteredStreams.forEach((feedInfo) => {
    activations[feedInfo.id] = {
      type: 'event_feed',
      logic: feedInfo.logic,
      name: feedInfo.name,
      visitor_retention_days: undefined,
      active_connector_actions: [],
      attribute_references: {},
      mapped_attributes: {}
    }
  })

  profileData.jobs && profileData.jobs.forEach((jobInfo) => {
    activations[jobInfo.id] = {
      type: 'job',
      logic: jobInfo.logic,
      name: jobInfo.name,
      visitor_retention_days: undefined,
      active_connector_actions: [],
      attribute_references: {},
      mapped_attributes: {}
    }
  })

  // make a lookup object to avoid looping every time
  const actionLookup = {}
  for (let i = 0; i < (cdhProfileData.actions || []).length; i++) {
    const action = cdhProfileData.actions[i]
    const key = `${action.connectorId}`
    actionLookup[key] = actionLookup[key] || {}
    actionLookup[key][action.type] = actionLookup[key][action.type] || {}
    actionLookup[key][action.type][action.trigger] = actionLookup[key][action.type][action.trigger] || {
      count: 0,
      count_enabled: 0
    }
    actionLookup[key][action.type][action.trigger].count++
    if (action.enabled === true && isParentConnectorEnabled(cdhProfileData.connectors, action.connectorId) === true) {
      actionLookup[key][action.type][action.trigger].count_enabled++
      action.source && activations[action.source.id] && activations[action.source.id].active_connector_actions.push(action.id)
      Object.keys(action.configurations.prod.parameters).forEach((sectionId) => {
        const section = action.configurations.prod.parameters[sectionId]
        Object.keys(section.values).forEach((valueId) => {
          // find variables that should be resolved (not hardcoded) - these are the mappings
          // NOTE that this doesn't account for connector actions that send raw events / visitor profiles (Webhook, SQS, others...)
          if (section.values[valueId] && section.values[valueId].map_value && section.values[valueId].map_value.resolve) {
            const attributeIdReferenced = nameLookup[normalizeKey(section.values[valueId].map_value.value)]
            if (action.source.id) { // sometimes this is '' in very old profiles
              activations[action.source.id].mapped_attributes[attributeIdReferenced] = activations[action.source.id].mapped_attributes[attributeIdReferenced] || 0
              activations[action.source.id].mapped_attributes[attributeIdReferenced]++
            }

            attributeDetails[attributeIdReferenced].connector_mappings[action.id] = attributeDetails[attributeIdReferenced].connector_mappings[action.id] || 0
            attributeDetails[attributeIdReferenced].connector_mappings[action.id]++
          }
        })
      })
    }
  }

  Object.keys(attributeDetails).forEach((attrId) => {
    const attrInfo = attributeDetails[attrId]
    Object.keys(attrInfo.audience_references).forEach((audienceId) => {
      activations[audienceId].attribute_references[attrId] = activations[audienceId].attribute_references[attrId] || 0
      activations[audienceId].attribute_references[attrId]++
    })

    Object.keys(attrInfo.event_feed_references).forEach((feedId) => {
      activations[feedId].attribute_references[attrId] = activations[feedId].attribute_references[attrId] || 0
      activations[feedId].attribute_references[attrId]++
    })
  })

  return {
    activations: activations,
    attributeDetails: attributeDetails
  }

  function isParentConnectorEnabled (connectors, connectorId) {
    connectors = connectors || []
    const parentConnector = connectors.find((connector) => {
      return connector.id === connectorId
    })
    return parentConnector.enabled === true
  }
}

exports.countConnectorActionsByType = function (cdhProfileData) {
  const profileData = cdhProfileData || {}
  const output = {}
  // the initial publish is sometimes missing these objects in older profiles
  if (!profileData || !profileData.actions || !profileData.connectors) return output

  function isParentConnectorEnabled (connectors, connectorId) {
    connectors = connectors || []
    const parentConnector = connectors.find((connector) => {
      return connector.id === connectorId
    })
    return parentConnector.enabled === true
  }

  // make a lookup object to avoid looping every time
  const actionLookup = {}
  for (let i = 0; i < cdhProfileData.actions.length; i++) {
    const action = cdhProfileData.actions[i]
    const key = `${action.connectorId}`
    actionLookup[key] = actionLookup[key] || {}
    actionLookup[key][action.type] = actionLookup[key][action.type] || {}
    actionLookup[key][action.type][action.trigger] = actionLookup[key][action.type][action.trigger] || {
      count: 0,
      count_enabled: 0
    }
    actionLookup[key][action.type][action.trigger].count++
    if (action.enabled === true && isParentConnectorEnabled(cdhProfileData.connectors, action.connectorId) === true) {
      actionLookup[key][action.type][action.trigger].count_enabled++
    }
  }

  cdhProfileData.connectors.forEach(function (connector) {
    // connector.configurations.prod.forEach()
    const key = `${connector.type}`
    output[key] = output[key] || {}
    output[key].action_counts = output[key].action_counts || {}
    const actions = actionLookup[connector.id] || {}
    Object.keys(actions).forEach(function (actionType) {
      output[key].action_counts[actionType] = output[key].action_counts[actionType] || {}
      output[key].action_counts[actionType] = output[key].action_counts[actionType] || {}
      output[key].action_counts[actionType] = actions[actionType] || {}
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

exports.getMobileSettings = function (profile) {
  if (!profile) return undefined
  if (profile.publish && profile.publish._mobile && profile.publish._mobile['5'] && profile.publish._mobile['5']) return profile.publish._mobile['5']
  return {
    _is_enabled: false
  }
}


exports.checkForCmpExtensionInUtag = function (utag) {
  const signatures = ['tealiumCmpIntegration']
  const utagString = utag && utag.contents && utag.contents.data
  return checkForCodeSignatures(signatures, utagString)
}

exports.getDaysSinceTiqVersion = function (versionString) {
  const formatted = `${versionString.slice(0, 4)}-${versionString.slice(4, 6)}-${versionString.slice(6, 8)}T${versionString.slice(8, 10)}:${versionString.slice(10, 12)}:00.000Z`
  const publishTime = new Date(formatted)
  const now = new Date()
  const daysSincePublish = Math.round((now - publishTime) / 86400000)
  return daysSincePublish
}

exports.getDaysSinceCdhVersion = function (versionString) {
  const publishTime = new Date(versionString)
  const now = new Date()
  const daysSincePublish = Math.round((now - publishTime) / 86400000)
  return daysSincePublish
}
