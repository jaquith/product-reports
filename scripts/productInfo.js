'use strict'

const {
  reportHandler,
  constants: { DATABASE_TYPES }
} = require('magic-metrics-tool')

const tealiumHelper = require('../helpers/tealium-helpers.js')
const profileHelper = require('../helpers/profile-helpers.js')

function boolToInt (theBool) {
  if (theBool === 'true') return 1
  if (theBool === 'false') return 0
  if (typeof theBool !== 'boolean') {
    return 0 // err on the side of false negatives
  }
  return theBool ? 1 : 0
}

async function getVolumes (account, profile, iQ, CDH) {
  function getIqDefaults () {
    return {
      loader: 0,
      mobile: 0,
      sync: 0,
      vendor: 0,
      visit: 0
    }
  }

  function getCdhDefaults () {
    return {
      all_inbound_events: 0,
      audiencedb_visitors: 0,
      audiencestore_visitors: 0,
      audiencestream_filtered_events: 0,
      cloud_connector_all: 0,
      cloud_connector_audiences: 0,
      cloud_connector_events: 0,
      data_access_all: 0,
      eventdb_events: 0,
      eventstore_events: 0,
      omnichannel_events: 0,
      predict_enrichments: 0,
      realtime_events: 0,
      viewthrough_reads: 0,
      viewthrough_writes: 0,
      visitor_dle: 0
    }
  }

  const volumes = {
    iq: {
      '30days': getIqDefaults(),
      '180days': getIqDefaults()
    },
    cdh: {
      '30days': getCdhDefaults(),
      '180days': getCdhDefaults()
    }
  }

  try {
    volumes.iq['30days'] = await tealiumHelper.getVolumesForRollingPeriod(account, profile, iQ.getReportingData, 30)
    volumes.iq['180days'] = await tealiumHelper.getVolumesForRollingPeriod(account, profile, iQ.getReportingData, 180)
  } catch (e) {
    // only report on unexpected errors (this happens when the CDH profile doesn't exist)
    if (e.returnCode !== 1469) {
      console.log(e)
    }
  }

  try {
    volumes.cdh['30days'] = await tealiumHelper.getCdhVolumesForRollingPeriod(account, profile, CDH.getReportingData, 30)
    volumes.cdh['180days'] = await tealiumHelper.getCdhVolumesForRollingPeriod(account, profile, CDH.getReportingData, 180)
  } catch (e) {
    // only report on unexpected errors (this happens when the CDH profile doesn't exist)
    if (e.returnCode !== 1469) {
      console.log(e)
    }
  }

  return volumes
}

reportHandler({
  logName: 'productInfo',
  checkProfile: profileChecker,
  dbDataTypes: [
    {
      name: 'iq_profiles',
      definition: {
        prod_version: DATABASE_TYPES.TEXT,
        days_since_prod_publish: DATABASE_TYPES.REAL,

        loader_30_days: DATABASE_TYPES.INTEGER,
        loader_180_days: DATABASE_TYPES.INTEGER,

        mobile_30_days: DATABASE_TYPES.INTEGER,
        mobile_180_days: DATABASE_TYPES.INTEGER,

        sync_30_days: DATABASE_TYPES.INTEGER,
        sync_180_days: DATABASE_TYPES.INTEGER,

        vendor_30_days: DATABASE_TYPES.INTEGER,
        vendor_180_days: DATABASE_TYPES.INTEGER,

        visit_30_days: DATABASE_TYPES.INTEGER,
        visit_180_days: DATABASE_TYPES.INTEGER,

        mobile_publishing: DATABASE_TYPES.INTEGER,
        mobile_to_loader_ratio_30_days: DATABASE_TYPES.REAL,
        mobile_to_loader_ratio_180_days: DATABASE_TYPES.REAL,

        privacy_manager: DATABASE_TYPES.INTEGER,

        ccpa: DATABASE_TYPES.INTEGER,
        ccpa_load_rule: DATABASE_TYPES.TEXT,

        consent_prompt: DATABASE_TYPES.INTEGER,
        consent_preferences: DATABASE_TYPES.INTEGER,
        consent_manager: DATABASE_TYPES.INTEGER,
        consent_manager_load_rule: DATABASE_TYPES.TEXT,
        consent_logging: DATABASE_TYPES.INTEGER,

        cmp_extension: DATABASE_TYPES.INTEGER,
        cmp_detected: DATABASE_TYPES.TEXT,
        all_consent_tools: DATABASE_TYPES.TEXT,

        ext_count_total: DATABASE_TYPES.INTEGER,
        ext_count_from_library: DATABASE_TYPES.INTEGER,

        tag_count_tealium_collect_tag: DATABASE_TYPES.INTEGER,
        tag_count_tealium_custom_container: DATABASE_TYPES.INTEGER,
        tag_count_tealium_generic_tag: DATABASE_TYPES.INTEGER,
        tag_count_tealium_pixel_iframe_container: DATABASE_TYPES.INTEGER,

        tag_count_unique_templates: DATABASE_TYPES.INTEGER,
        tag_count_total: DATABASE_TYPES.INTEGER,
        tag_count_from_library: DATABASE_TYPES.INTEGER,

        custom_environment_setting: DATABASE_TYPES.TEXT,
        custom_environment_count: DATABASE_TYPES.INTEGER,
        custom_environment_list: DATABASE_TYPES.TEXT

        // iab_tcf_2: DATABASE_TYPES.INTEGER,

        // prodProfileData: DATABASE_TYPES.TEXT,
        // utagFromCdn: DATABASE_TYPES.TEXT
      }
    },
    {
      name: 'iq_extensions',
      definition: {
        // standard data
        extension_name: DATABASE_TYPES.TEXT,
        extension_id: DATABASE_TYPES.INTEGER,
        count: DATABASE_TYPES.INTEGER,
        count_from_library: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'cdh_profiles',
      definition: {

        prod_version: DATABASE_TYPES.TEXT,
        days_since_prod_publish: DATABASE_TYPES.TEXT,

        audience_count: DATABASE_TYPES.INTEGER,
        event_feed_count: DATABASE_TYPES.INTEGER,
        event_spec_count: DATABASE_TYPES.INTEGER,
        connector_action_count: DATABASE_TYPES.INTEGER,

        audienceStreamEnabled: DATABASE_TYPES.INTEGER,
        audienceStoreEnabled: DATABASE_TYPES.INTEGER,
        audienceDBEnabled: DATABASE_TYPES.INTEGER,
        eventDBEnabled: DATABASE_TYPES.INTEGER,
        eventStoreEnabled: DATABASE_TYPES.INTEGER,
        eventStreamEnabled: DATABASE_TYPES.INTEGER,
        region: DATABASE_TYPES.TEXT,
        dataAccessDBExpirationDays: DATABASE_TYPES.INTEGER,
        eventStoreRetentionDays: DATABASE_TYPES.INTEGER,
        visitorRetentionDays: DATABASE_TYPES.INTEGER,

        volume_all_inbound_events_30_days: DATABASE_TYPES.INTEGER,
        volume_audiencedb_visitors_30_days: DATABASE_TYPES.INTEGER,
        volume_audiencestore_visitors_30_days: DATABASE_TYPES.INTEGER,
        volume_audiencestream_filtered_events_30_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_all_30_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_audiences_30_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_events_30_days: DATABASE_TYPES.INTEGER,
        volume_data_access_all_30_days: DATABASE_TYPES.INTEGER,
        volume_eventdb_events_30_days: DATABASE_TYPES.INTEGER,
        volume_eventstore_events_30_days: DATABASE_TYPES.INTEGER,
        volume_omnichannel_events_30_days: DATABASE_TYPES.INTEGER,
        volume_predict_enrichments_30_days: DATABASE_TYPES.INTEGER,
        volume_realtime_events_30_days: DATABASE_TYPES.INTEGER,
        volume_viewthrough_reads_30_days: DATABASE_TYPES.INTEGER,
        volume_viewthrough_writes_30_days: DATABASE_TYPES.INTEGER,
        volume_visitor_dle_30_days: DATABASE_TYPES.INTEGER,

        volume_all_inbound_events_180_days: DATABASE_TYPES.INTEGER,
        volume_audiencedb_visitors_180_days: DATABASE_TYPES.INTEGER,
        volume_audiencestore_visitors_180_days: DATABASE_TYPES.INTEGER,
        volume_audiencestream_filtered_events_180_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_all_180_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_audiences_180_days: DATABASE_TYPES.INTEGER,
        volume_cloud_connector_events_180_days: DATABASE_TYPES.INTEGER,
        volume_data_access_all_180_days: DATABASE_TYPES.INTEGER,
        volume_eventdb_events_180_days: DATABASE_TYPES.INTEGER,
        volume_eventstore_events_180_days: DATABASE_TYPES.INTEGER,
        volume_omnichannel_events_180_days: DATABASE_TYPES.INTEGER,
        volume_predict_enrichments_180_days: DATABASE_TYPES.INTEGER,
        volume_realtime_events_180_days: DATABASE_TYPES.INTEGER,
        volume_viewthrough_reads_180_days: DATABASE_TYPES.INTEGER,
        volume_viewthrough_writes_180_days: DATABASE_TYPES.INTEGER,
        volume_visitor_dle_180_days: DATABASE_TYPES.INTEGER

        // cdhEntry: DATABASE_TYPES.TEXT
      }
    },
    {
      name: 'iq_attributes',
      definition: {
        name: DATABASE_TYPES.TEXT,
        id: DATABASE_TYPES.TEXT,
        description: DATABASE_TYPES.TEXT,
        type: DATABASE_TYPES.TEXT,
        is_preloaded: DATABASE_TYPES.INTEGER,
        mapping_references: DATABASE_TYPES.INTEGER,
        extension_references: DATABASE_TYPES.INTEGER,
        load_rule_references: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'iq_load_rules',
      definition: {
        name: DATABASE_TYPES.TEXT,
        id: DATABASE_TYPES.TEXT,
        logic: DATABASE_TYPES.TEXT,
        from_library: DATABASE_TYPES.INTEGER,
        active_tag_count: DATABASE_TYPES.INTEGER,
        inactive_tag_count: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'account_and_profile_types',
      definition: {
        account_type: DATABASE_TYPES.TEXT,
        profile_type: DATABASE_TYPES.TEXT
      }
    },
    {
      name: 'cdh_attributes',
      definition: {
        name: DATABASE_TYPES.TEXT,
        id: DATABASE_TYPES.TEXT,
        context: DATABASE_TYPES.TEXT,
        type: DATABASE_TYPES.TEXT,
        is_preloaded: DATABASE_TYPES.INTEGER,
        is_db_enabled: DATABASE_TYPES.INTEGER,
        enriched_downstream_attributes: DATABASE_TYPES.INTEGER,
        enriched_upstream_attributes: DATABASE_TYPES.INTEGER,
        audiences_referencing: DATABASE_TYPES.INTEGER,
        event_feeds_referencing: DATABASE_TYPES.INTEGER,
        connectors_referencing: DATABASE_TYPES.INTEGER,
        event_specs_referencing: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'mobile_settings',
      definition: {
        enabled: DATABASE_TYPES.INTEGER,
        battery_saver: DATABASE_TYPES.INTEGER,
        dispatch_expiration: DATABASE_TYPES.INTEGER,
        enable_collect: DATABASE_TYPES.INTEGER,
        enable_s2s_legacy: DATABASE_TYPES.INTEGER,
        enable_tag_management: DATABASE_TYPES.INTEGER,
        event_batch_size: DATABASE_TYPES.INTEGER,
        minutes_between_refresh: DATABASE_TYPES.INTEGER,
        offline_dispatch_limit: DATABASE_TYPES.INTEGER,
        override_log: DATABASE_TYPES.INTEGER,
        wifi_only_sending: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'all_products',
      definition: {
        product_name: DATABASE_TYPES.TEXT,
        enabled: DATABASE_TYPES.INTEGER,
        retention_days: DATABASE_TYPES.INTEGER,
        volume_30_days: DATABASE_TYPES.INTEGER,
        volume_180_days: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'event_feeds_and_audiences',
      definition: {
        id: DATABASE_TYPES.TEXT,
        name: DATABASE_TYPES.TEXT,
        type: DATABASE_TYPES.TEXT,
        activation_count: DATABASE_TYPES.INTEGER,
        activation_ids: DATABASE_TYPES.TEXT,
        referenced_attribute_count: DATABASE_TYPES.INTEGER,
        referenced_attribute_ids: DATABASE_TYPES.TEXT,
        mapped_attribute_count: DATABASE_TYPES.INTEGER,
        mapped_attribute_ids: DATABASE_TYPES.TEXT
      }
    },
    {
      name: 'tag_templates',
      definition: {
        template_name: DATABASE_TYPES.TEXT,
        template_id: DATABASE_TYPES.INTEGER,
        count: DATABASE_TYPES.INTEGER,
        count_from_library: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'cdh_attribute_summary',
      definition: {
        context: DATABASE_TYPES.TEXT,
        type: DATABASE_TYPES.TEXT,
        count: DATABASE_TYPES.INTEGER,
        count_preloaded: DATABASE_TYPES.INTEGER,
        count_db_enabled: DATABASE_TYPES.INTEGER,
        count_used_in_enrichments: DATABASE_TYPES.INTEGER,
        count_used_in_connectors: DATABASE_TYPES.INTEGER,
        count_used_in_audiences: DATABASE_TYPES.INTEGER,
        count_used_in_event_feeds: DATABASE_TYPES.INTEGER,
        count_used_in_event_specs: DATABASE_TYPES.INTEGER
      }
    },
    {
      name: 'cdh_connector_actions_and_triggers',
      definition: {
        connector_type: DATABASE_TYPES.TEXT,
        action_type: DATABASE_TYPES.TEXT,
        trigger: DATABASE_TYPES.TEXT,
        count: DATABASE_TYPES.INTEGER,
        count_enabled: DATABASE_TYPES.INTEGER
      }
    }
  ],
  getProfileData: false,
  cacheRequests: false,
  useRequestCache: false,
  retryErrors: false,
  dropDB: true,
  allAccounts: false // 'true' disables the automatic filter to allow accurate account and profile counts
  // accountList: ['1und1', 'pro7', 'abn-amro', 'tealium', 'royalmail']
  // accountList: ['abn-amro']
  // accountList: ['pro7', 'deutschebahn', 'bahnx', 'axelspringer', 'mbcc-group', 'al-h', 'immoweltgroup', 'abn-amro']
  // accountProfileList: [{ account: 'axelspringer', profile: 'ikiosk' }]
  // accountProfileList: [{ account: 'services-caleb', profile: 'main' }]
})

async function profileChecker ({ iQ, CDH, record, error, account, profile, sessionRequest, resolve, reject }) {
  try {
    const volumes = await getVolumes(account, profile, iQ, CDH)

    const iqVolumes30Days = volumes.iq['30days']
    const iqVolumes180Days = volumes.iq['180days']

    const cdhVolumes30Days = volumes.cdh['30days']
    const cdhVolumes180Days = volumes.cdh['180days']

    const iqInProd = true // record all for now
    const cdhInProd = true // record all for now

    if (iqInProd === true) {
      // we only care about the latest production profile, NOT the latest profile save (which is what we start with)
      const profileData = await iQ.getProfile(account, profile)

      const accountType = tealiumHelper.getAccountType(account)
      const profileType = profileHelper.getProfileType(profileData)

      record('account_and_profile_types', {
        account,
        profile,
        account_type: accountType,
        profile_type: profileType
      })

      const revisions = profileData.publish_history
      const revisionList = Object.keys(revisions).sort()

      let prodRevision

      for (let i = revisionList.length - 1; i >= 0; i--) {
        const thisRevision = revisions[revisionList[i]]
        if (thisRevision && thisRevision.status && thisRevision.status.indexOf('prod') !== -1) {
          prodRevision = revisionList[i]
          break
        }
      }

      const utag = await tealiumHelper.getUtagFileFromCdn(account, profile, 'prod')
      const prodProfileData = await iQ.getProfile(account, profile, prodRevision)

      const prodVersion = prodProfileData && prodProfileData.settings && prodProfileData.settings.revision

      // consent management
      const detectedCmps = profileHelper.getDetectedCmps(utag)

      // not working right yet, confused by our Collect tag IAB logic
      // const foundIabTcf2 = profileHelper.checkForIabTcf2(utag)

      const foundPrivacyManager = profileHelper.checkForPrivacyManager(prodProfileData)
      const foundConsentPrompt = profileHelper.checkForConsentPrompt(prodProfileData)
      const foundConsentPreferences = profileHelper.checkForConsentPreferences(prodProfileData)
      const foundConsentManager = foundConsentPrompt || foundConsentPreferences

      const allConsentToolsArray = []
      if (detectedCmps) allConsentToolsArray.push(detectedCmps)
      if (foundPrivacyManager) allConsentToolsArray.push('teal_pm')
      if (foundConsentManager) allConsentToolsArray.push('teal_cm')
      const allConsentTools = allConsentToolsArray.join(' + ')

      const extensionCounter = profileHelper.countActiveExtensionsByTemplateId(prodProfileData)
      const tagCounter = profileHelper.countActiveTagsByTemplateId(prodProfileData)

      const tiqSummaries = profileHelper.getTiqSummaries(prodProfileData)
      const tiqAttributes = tiqSummaries.attributes
      // const tiqLoadRules = tiqSummaries.loadRules

      const mobilePublishing = profileHelper.checkForMobilePublishing(prodProfileData)
      const mobileSettings = profileHelper.getMobileSettings(prodProfileData)

      const customEnvironments = Object.keys((prodProfileData.publish && prodProfileData.publish.smartFTP) || []).filter((environmentName) => {
        return ['dev', 'qa', 'prod'].indexOf(environmentName) === -1
      })

      const iqRecord = {
        account,
        profile,
        prod_version: prodVersion,
        days_since_prod_publish: profileHelper.getDaysSinceTiqVersion(prodVersion),

        loader_30_days: iqVolumes30Days.loader,
        loader_180_days: iqVolumes180Days.loader,

        mobile_30_days: iqVolumes30Days.mobile,
        mobile_180_days: iqVolumes180Days.mobile,

        sync_30_days: iqVolumes30Days.sync,
        sync_180_days: iqVolumes180Days.sync,

        vendor_30_days: iqVolumes30Days.vendor,
        vendor_180_days: iqVolumes180Days.vendor,

        visit_30_days: iqVolumes30Days.visit,
        visit_180_days: iqVolumes180Days.visit,

        mobile_publishing: mobilePublishing,
        mobile_to_loader_ratio_30_days: (iqVolumes30Days.loader > 0 ? iqVolumes30Days.mobile / iqVolumes30Days.loader : 0).toFixed(2),
        mobile_to_loader_ratio_180_days: (iqVolumes180Days.loader > 0 ? iqVolumes180Days.mobile / iqVolumes180Days.loader : 0).toFixed(2),

        privacy_manager: foundPrivacyManager,

        ccpa: profileHelper.checkForCcpa(prodProfileData),
        ccpa_load_rule: profileHelper.getCcpaLoadRule(prodProfileData),

        consent_prompt: foundConsentPrompt,
        consent_preferences: foundConsentPreferences,
        consent_logging: profileHelper.checkForConsentLogging(prodProfileData),
        consent_manager: foundConsentManager,
        consent_manager_load_rule: profileHelper.getConsentManagerLoadRule(prodProfileData),

        cmp_extension: profileHelper.checkForCmpExtensionInUtag(utag),
        cmp_detected: detectedCmps,
        all_consent_tools: allConsentTools,

        ext_count_total: extensionCounter.total || 0,
        ext_count_from_library: extensionCounter.from_library || 0,

        tag_count_tealium_collect_tag: (tagCounter['20064'] && tagCounter['20064'].count) || 0,
        tag_count_tealium_custom_container: (tagCounter['20010'] && tagCounter['20010'].count) || 0,
        tag_count_tealium_generic_tag: (tagCounter['20067'] && tagCounter['20067'].count) || 0,
        tag_count_tealium_pixel_iframe_container: (tagCounter['20011'] && tagCounter['20011'].count) || 0,

        tag_count_unique_templates: tagCounter.tag_template_count,
        tag_count_total: tagCounter.total,
        tag_count_from_library: tagCounter.total_from_library,

        custom_environment_setting: prodProfileData.publish.enable_custom_targets || '',
        custom_environment_count: customEnvironments.length,
        custom_environment_list: customEnvironments.join(',')
      }

      record('iq_profiles', iqRecord)

      tiqAttributes.forEach((attr) => {
        if (!attr || !attr._id) return
        record('iq_attributes', {
          account,
          profile,
          name: attr.name,
          id: attr._id,
          description: attr.description,
          type: attr.type,
          is_preloaded: boolToInt(attr.is_preloaded),
          mapping_references: attr.mapping_references,
          extension_references: attr.extension_references,
          load_rule_references: attr.load_rule_references
        })
      })

      record('mobile_settings', {
        account,
        profile,
        enabled: boolToInt(mobileSettings._is_enabled),
        battery_saver: boolToInt(mobileSettings.battery_saver),
        dispatch_expiration: boolToInt(mobileSettings.dispatch_expiration),
        enable_collect: boolToInt(mobileSettings.enable_collect),
        enable_s2s_legacy: boolToInt(mobileSettings.enable_s2s_legacy),
        enable_tag_management: boolToInt(mobileSettings.enable_tag_management),
        event_batch_size: mobileSettings.event_batch_size,
        minutes_between_refresh: mobileSettings.minutes_between_refresh,
        offline_dispatch_limit: mobileSettings.offline_dispatch_limit,
        override_log: mobileSettings.override_log,
        wifi_only_sending: boolToInt(mobileSettings.wifi_only_sending)
      })

      Object.keys(tagCounter).forEach(function (tagId) {
        // only generate entries for tag templates, not summary keys
        const nonTagKeys = ['total_from_library', 'total', 'tag_template_count']
        if (nonTagKeys.indexOf(tagId) !== -1) return
        record('tag_templates', {
          account,
          profile,
          template_name: tagCounter[tagId].name,
          template_id: tagId,
          count: tagCounter[tagId].count,
          count_from_library: tagCounter[tagId].count_from_library
        })
      })

      Object.keys(extensionCounter).forEach(function (id) {
        // only generate entries for tag templates, not summary keys
        const totals = ['total_from_library', 'total']
        if (totals.indexOf(id) !== -1) return
        record('iq_extensions', {
          account,
          profile,
          extension_name: extensionCounter[id].name,
          extension_id: id,
          count: extensionCounter[id].count,
          count_from_library: extensionCounter[id].count_from_library
        })
      })

      record('all_products', {
        account,
        profile,
        product_name: 'Tealium iQ',
        retention_days: undefined,
        enabled: 1,
        volume_30_days: iqVolumes30Days.loader > iqVolumes30Days.mobile ? iqVolumes30Days.loader : iqVolumes30Days.mobile,
        volume_180_days: iqVolumes180Days.loader > iqVolumes180Days.mobile ? iqVolumes180Days.loader : iqVolumes180Days.mobile
      })
    }

    if (cdhInProd === true) {
      let cdhProfileData = await CDH.getProfile(account, profile)
      let prodRevision = cdhProfileData.version_info.revision

      // go back to the latest published vesion (not just saved)
      while (cdhProfileData.version_info.hasBeenPublished === false) {
        prodRevision = cdhProfileData.previousVersionInfo.revision
        cdhProfileData = await sessionRequest.get(`/urest/datacloud/${account}/${profile}/profile/revision/${prodRevision}`)
      }

      const {
        accountEnabled,
        audienceDBEnabled,
        audienceStoreEnabled,
        eventDBEnabled,
        eventStoreEnabled,
        eventStreamEnabled,
        region,
        dataAccessDBExpirationDays,
        eventStoreRetentionDays,
        visitorRetentionDays,
        machineLearningEnabled
      } = cdhProfileData.settings

      const attributeModel = profileHelper.modelAttributeRelationships(cdhProfileData)
      const activationSummaryAndAugumentedAttributeDetails = profileHelper.summarizeActivations(cdhProfileData, attributeModel)
      const attributeDetails = activationSummaryAndAugumentedAttributeDetails.attributeDetails
      const activationSummary = activationSummaryAndAugumentedAttributeDetails.activations

      const audienceCount = Object.keys(cdhProfileData.audiences || {}).length
      const eventFeedCount = (cdhProfileData.archivedFilteredStreams && cdhProfileData.archivedFilteredStreams.length) || 0
      const eventSpecCount = (cdhProfileData.eventDefinitions && cdhProfileData.eventDefinitions.length) || 0
      const connectorActionCount = Object.keys(activationSummary || {}).length

      const cdhRecord = {
        account,
        profile,

        prod_version: prodRevision,
        days_since_prod_publish: profileHelper.getDaysSinceCdhVersion(prodRevision),

        audienceStreamEnabled: boolToInt(accountEnabled),
        audienceDBEnabled: boolToInt(audienceDBEnabled),
        audienceStoreEnabled: boolToInt(audienceStoreEnabled),
        eventDBEnabled: boolToInt(eventDBEnabled),
        eventStoreEnabled: boolToInt(eventStoreEnabled),
        eventStreamEnabled: boolToInt(eventStreamEnabled),
        predictPremiumEnabled: boolToInt(machineLearningEnabled),
        region: region,
        dataAccessDBExpirationDays: dataAccessDBExpirationDays || 90,
        eventStoreRetentionDays: eventStoreRetentionDays,
        visitorRetentionDays: visitorRetentionDays,

        audience_count: audienceCount,
        event_feed_count: eventFeedCount,
        event_spec_count: eventSpecCount,
        connector_action_count: connectorActionCount,

        volume_all_inbound_events_30_days: cdhVolumes30Days.all_inbound_events,
        volume_audiencedb_visitors_30_days: cdhVolumes30Days.audiencedb_visitors,
        volume_audiencestore_visitors_30_days: cdhVolumes30Days.audiencestore_visitors,
        volume_audiencestream_filtered_events_30_days: cdhVolumes30Days.audiencestream_filtered_events,
        volume_cloud_connector_all_30_days: cdhVolumes30Days.cloud_connector_all,
        volume_cloud_connector_audiences_30_days: cdhVolumes30Days.cloud_connector_audiences,
        volume_cloud_connector_events_30_days: cdhVolumes30Days.cloud_connector_events,
        volume_data_access_all_30_days: cdhVolumes30Days.data_access_all,
        volume_eventdb_events_30_days: cdhVolumes30Days.eventdb_events,
        volume_eventstore_events_30_days: cdhVolumes30Days.eventstore_events,
        volume_omnichannel_events_30_days: cdhVolumes30Days.omnichannel_events,
        volume_predict_enrichments_30_days: cdhVolumes30Days.predict_enrichments,
        volume_realtime_events_30_days: cdhVolumes30Days.realtime_events,
        volume_viewthrough_reads_30_days: cdhVolumes30Days.viewthrough_reads,
        volume_viewthrough_writes_30_days: cdhVolumes30Days.viewthrough_writes,
        volume_visitor_dle_30_days: cdhVolumes30Days.visitor_dle,

        volume_all_inbound_events_180_days: cdhVolumes180Days.all_inbound_events,
        volume_audiencedb_visitors_180_days: cdhVolumes180Days.audiencedb_visitors,
        volume_audiencestore_visitors_180_days: cdhVolumes180Days.audiencestore_visitors,
        volume_audiencestream_filtered_events_180_days: cdhVolumes180Days.audiencestream_filtered_events,
        volume_cloud_connector_all_180_days: cdhVolumes180Days.cloud_connector_all,
        volume_cloud_connector_audiences_180_days: cdhVolumes180Days.cloud_connector_audiences,
        volume_cloud_connector_events_180_days: cdhVolumes180Days.cloud_connector_events,
        volume_data_access_all_180_days: cdhVolumes180Days.data_access_all,
        volume_eventdb_events_180_days: cdhVolumes180Days.eventdb_events,
        volume_eventstore_events_180_days: cdhVolumes180Days.eventstore_events,
        volume_omnichannel_events_180_days: cdhVolumes180Days.omnichannel_events,
        volume_predict_enrichments_180_days: cdhVolumes180Days.predict_enrichments,
        volume_realtime_events_180_days: cdhVolumes180Days.realtime_events,
        volume_viewthrough_reads_180_days: cdhVolumes180Days.viewthrough_reads,
        volume_viewthrough_writes_180_days: cdhVolumes180Days.viewthrough_writes,
        volume_visitor_dle_180_days: cdhVolumes180Days.visitor_dle

        // cdhEntry: JSON.stringify(cdhProfileData)
      }
      record('cdh_profiles', cdhRecord)

      Object.keys(activationSummary).forEach((id) => {
        record('event_feeds_and_audiences', {
          account,
          profile,
          id: id,
          type: activationSummary[id].type,
          name: activationSummary[id].name,
          // logic: activationSummary[id].logic,
          activation_count: activationSummary[id].active_connector_actions.length,
          activation_ids: '|' + activationSummary[id].active_connector_actions.join('|') + '|',
          referenced_attribute_count: Object.keys(activationSummary[id].attribute_references).length,
          referenced_attribute_ids: '|' + Object.keys(activationSummary[id].attribute_references).join('|') + '|',
          mapped_attribute_count: Object.keys(activationSummary[id].mapped_attributes).length,
          mapped_attribute_ids: '|' + Object.keys(activationSummary[id].mapped_attributes).join('|') + '|'
        })
      })

      Object.keys(attributeDetails).forEach(function (key) {
        record('cdh_attributes', {
          account,
          profile,
          name: attributeDetails[key].name,
          id: key,
          context: attributeDetails[key].context,
          type: attributeDetails[key].type,
          is_preloaded: attributeDetails[key].is_preloaded,
          is_db_enabled: attributeDetails[key].is_db_enabled,
          enriched_downstream_attributes: Object.keys(attributeDetails[key].downstream_attributes).length || 0,
          enriched_upstream_attributes: Object.keys(attributeDetails[key].upstream_attributes).length || 0,
          audiences_referencing: Object.keys(attributeDetails[key].audience_references).length || 0,
          event_feeds_referencing: Object.keys(attributeDetails[key].event_feed_references).length || 0,
          connectors_referencing: Object.keys(attributeDetails[key].connector_mappings).length || 0,
          event_specs_referencing: Object.keys(attributeDetails[key].event_spec_references).length || 0
        })
      })

      const attributeSummary = profileHelper.summarizeAttributes(cdhProfileData)
      Object.keys(attributeSummary).forEach(function (key) {
        record('cdh_attribute_summary', {
          account,
          profile,
          context: attributeSummary[key].context,
          type: attributeSummary[key].type,
          count: attributeSummary[key].count,
          count_preloaded: attributeSummary[key].count_preloaded,
          count_db_enabled: attributeSummary[key].count_db_enabled,
          count_used_in_enrichments: attributeSummary[key].count_used_in_enrichments,
          count_used_in_connectors: attributeSummary[key].count_used_in_connectors,
          count_used_in_audiences: attributeSummary[key].count_used_in_audiences,
          count_used_in_event_feeds: attributeSummary[key].count_used_in_event_feeds,
          count_used_in_event_specs: attributeSummary[key].count_used_in_event_specs
        })
      })

      const connectorActionSummary = profileHelper.countConnectorActionsByType(cdhProfileData)
      Object.keys(connectorActionSummary).forEach(function (connectorType) {
        Object.keys(connectorActionSummary[connectorType].action_counts).forEach(function (action) {
          Object.keys(connectorActionSummary[connectorType].action_counts[action]).forEach(function (trigger) {
            record('cdh_connector_actions_and_triggers', {
              account,
              profile,
              connector_type: connectorType,
              action_type: action,
              trigger: trigger,
              count: connectorActionSummary[connectorType].action_counts[action][trigger].count,
              count_enabled: connectorActionSummary[connectorType].action_counts[action][trigger].count_enabled
            })
          })
        })
      })

      record('all_products', {
        account,
        profile,
        product_name: 'EventStream',
        enabled: cdhRecord.eventStreamEnabled,
        retention_days: undefined,
        volume_30_days: cdhRecord.volume_all_inbound_events_30_days,
        volume_180_days: cdhRecord.volume_all_inbound_events_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'EventStore',
        enabled: cdhRecord.eventStoreEnabled,
        retention_days: cdhRecord.eventStoreRetentionDays,
        volume_30_days: cdhRecord.volume_eventstore_events_30_days,
        volume_180_days: cdhRecord.volume_eventstore_events_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'EventDB',
        enabled: cdhRecord.eventDBEnabled,
        retention_days: cdhRecord.dataAccessDBExpirationDays,
        volume_30_days: cdhRecord.volume_eventdb_events_30_days,
        volume_180_days: cdhRecord.volume_eventdb_events_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'AudienceStream',
        enabled: cdhRecord.audienceStreamEnabled,
        retention_days: cdhRecord.visitorRetentionDays,
        volume_30_days: cdhRecord.volume_audiencestream_filtered_events_30_days,
        volume_180_days: cdhRecord.volume_audiencestream_filtered_events_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'AudienceStore',
        enabled: cdhRecord.audienceStoreEnabled,
        retention_days: cdhRecord.visitorRetentionDays, // AudienceStore uses the AudienceStream retetion time - no separate setting
        volume_30_days: cdhRecord.volume_audiencestore_visitors_30_days,
        volume_180_days: cdhRecord.volume_audiencestore_visitors_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'AudienceDB',
        retention_days: cdhRecord.visitorRetentionDays,
        enabled: cdhRecord.audienceDBEnabled,
        volume_30_days: cdhRecord.volume_audiencedb_visitors_30_days,
        volume_180_days: cdhRecord.volume_audiencedb_visitors_180_days
      })

      record('all_products', {
        account,
        profile,
        product_name: 'Predict',
        retention_days: undefined,
        enabled: cdhRecord.predictPremiumEnabled,
        volume_30_days: cdhRecord.volume_predict_enrichments_30_days,
        volume_180_days: cdhRecord.volume_predict_enrichments_180_days
      })
    }

    resolve()
  } catch (e) {
    reject(e.stack)
  }
}
