'use strict'

const {
  reportHandler,
  constants: { DATABASE_TYPES },
  utils: { size }
} = require('magic-metrics-tool')

const tealiumHelper = require('./helpers/tealium-helpers.js')
const profileHelper = require('./helpers/profile-helpers.js')

reportHandler({
  logName: 'consentManagementView',
  checkProfile: profileChecker,
  dbDataTypes: {
    prod_version: DATABASE_TYPES.TEXT,

    privacy_manager: DATABASE_TYPES.INTEGER,

    ccpa: DATABASE_TYPES.INTEGER,
    ccpa_load_rule: DATABASE_TYPES.TEXT,

    consent_prompt: DATABASE_TYPES.INTEGER,
    consent_preferences: DATABASE_TYPES.INTEGER,
    consent_manager_load_rule: DATABASE_TYPES.TEXT,
    consent_logging: DATABASE_TYPES.INTEGER,

    cmp_extension: DATABASE_TYPES.INTEGER,
    cmp_detected: DATABASE_TYPES.TEXT,
    all_consent_tools: DATABASE_TYPES.TEXT,

    mobile_publishing: DATABASE_TYPES.INTEGER,
    mobile_to_loader_ratio_past_month: DATABASE_TYPES.REAL,
    mobile_to_loader_ratio_past_six_months: DATABASE_TYPES.REAL,

    visits_past_month: DATABASE_TYPES.INTEGER,
    visits_past_six_months: DATABASE_TYPES.INTEGER,
    loader_past_month: DATABASE_TYPES.INTEGER,
    loader_past_six_months: DATABASE_TYPES.INTEGER,
    mobile_past_month: DATABASE_TYPES.INTEGER,
    mobile_past_six_months: DATABASE_TYPES.INTEGER,

    volume_per_visit_one_month: DATABASE_TYPES.REAL,
    volume_per_visit_six_months: DATABASE_TYPES.REAL,

    tag_count: DATABASE_TYPES.INTEGER
  },
  getProfileData: true,
  retryErrors: false,
  dropDB: true
  //accountList: ['pro7', 'axelspringer', 'stepstone', 'lbg', 'mbcc-group', 'basf', 'immoweltgroup', 'immobilienscout', '1und1', '3m', 'accenture', 'zweipunkt', 'fashionid', 'elililly']
  //accountProfileList: [{ account: 'lbg', profile: 'main' }]
})

function profileChecker ({ iQ, record, error, account, profile, profileData, resolve, reject }) {
  try {
    // we only care about the latest production profile, NOT the latest profile save (which is what we start with)
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

    const arrayOfPromises = [
      tealiumHelper.getUtagFileFromCdn(account, profile, 'prod'),
      iQ.getProfile(account, profile, prodRevision),
      tealiumHelper.getVolumesForRollingPeriod(account, profile, iQ.getReportingData, 30),
      tealiumHelper.getVolumesForRollingPeriod(account, profile, iQ.getReportingData, 180)
    ]
    Promise.all(arrayOfPromises)
      .catch(function (err) {
      // log that I have an error, return the entire array;
        console.log('A promise failed to resolve', err)
        return arrayOfPromises
      })
      .then((responseArray) => {
        const utag = responseArray[0]
        const prodProfileData = responseArray[1]
        const volumesOneMonth = responseArray[2]
        const volumesSixMonths = responseArray[3]

        const prodVersion = prodProfileData && prodProfileData.settings && prodProfileData.settings.revision

        const detectedCmps = profileHelper.getDetectedCmps(utag)
        const foundPrivacyManager = profileHelper.checkForPrivacyManager(prodProfileData)
        const foundConsentPrompt = profileHelper.checkForConsentPrompt(prodProfileData)
        const foundConsentPreferences = profileHelper.checkForConsentPreferences(prodProfileData)
        const foundConsentManager = foundConsentPrompt || foundConsentPreferences

        const allToolsArray = []
        if (foundPrivacyManager) allToolsArray.push('teal_pm')
        if (foundConsentManager) allToolsArray.push('teal_cm')
        if (detectedCmps) allToolsArray.push(detectedCmps)
        const allTools = allToolsArray.join(' + ')

        // we only care about prod for now
        record({
          account,
          profile,
          prod_version: prodVersion,
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
          all_consent_tools: allTools,

          mobile_publishing: profileHelper.checkForMobilePublishing(prodProfileData),
          mobile_to_loader_ratio_past_month: volumesOneMonth.loader > 0 ? volumesOneMonth.mobile / volumesOneMonth.loader : 0,
          mobile_to_loader_ratio_past_six_months: volumesSixMonths.loader > 0 ? volumesSixMonths.mobile / volumesSixMonths.loader : 0,

          visits_past_month: volumesOneMonth.visit,
          visits_past_six_months: volumesSixMonths.visit,
          loader_past_month: volumesOneMonth.loader,
          loader_past_six_months: volumesSixMonths.loader,
          mobile_past_month: volumesOneMonth.mobile,
          mobile_past_six_months: volumesSixMonths.mobile,

          volume_per_visit_one_month: (volumesOneMonth.loader + volumesOneMonth.mobile) / (volumesOneMonth.visit || 1),
          volume_per_visit_six_months: (volumesSixMonths.loader + volumesSixMonths.mobile) / (volumesSixMonths.visit || 1),

          tag_count: size(prodProfileData.manage)
        })
        resolve()
      })

    // make sure we have a valid UTK and JSESSIONID first
  } catch (e) {
    reject(e)
  }
}
