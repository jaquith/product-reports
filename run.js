'use strict'

const {
  reportHandler,
  constants: {DATABASE_TYPES},
  utils: {isEmpty, date, size}
} = require("magic-metrics-tool");

const tealiumHelper = require('./helpers/tealium-helpers.js')
const profileHelper = require('./helpers/profile-helpers.js');
const { checkForConsentLogging } = require("./helpers/profile-helpers.js");

function profileChecker({iQ, record, error, account, profile, profileData, resolve, reject}){
  try {
    // we only care about the latest production profile, NOT the latest profile save (which is what we start with)
    const revisions = profileData.publish_history
    const revisionList = Object.keys(revisions).sort()
    let prodRevision

    for (let i = revisionList.length - 1; i >= 0; i--) {
      let thisRevision = revisions[revisionList[i]]
      if (thisRevision && thisRevision.status && thisRevision.status.indexOf('prod') !== -1) {
        prodRevision = revisionList[i]
        break
      }
    }

    const arrayOfPromises = [
      tealiumHelper.getUtagFileFromCdn(account, profile, 'prod'),
      tealiumHelper.getUtagSyncFileFromCdn(account, profile, 'prod'),
      tealiumHelper.getMobileHtmlFileFromCdn(account, profile, 'prod'),
      tealiumHelper.getTiqProfileData(account, profile, prodRevision),
      tealiumHelper.getVolumesForRollingPeriod(account, profile, 30),
      tealiumHelper.getVolumesForRollingPeriod(account, profile, 180)
    ]

    Promise.all(arrayOfPromises)
    .catch(function(err) {
      // log that I have an error, return the entire array;
      console.log('A promise failed to resolve', err);
      return arrayOfPromises;
    })
    .then((responseArray) => {
      const utag = responseArray[0]
      const utagSync = responseArray[1]
      const mobileHtml = responseArray[2]
      const prodProfileData = responseArray[3]
      const volumesOneMonth = responseArray[4]
      const volumesSixMonths = responseArray[5]

      const prodVersion = prodProfileData && prodProfileData.settings && prodProfileData.settings.revision

      // we only care about prod for now
      record({
        account, 
        profile,
        consent_prompt_in_prod: profileHelper.checkForConsentPrompt(prodProfileData),
        consent_preferences_in_prod: profileHelper.checkForConsentPreferences(prodProfileData),
        consent_logging_in_prod: profileHelper.checkForConsentLogging(prodProfileData),
        loader_past_month: volumesOneMonth.loader,
        loader_past_six_months: volumesSixMonths.loader,
        prod_version: prodVersion,
        tag_count : size(prodProfileData.manage),
      });
      
      resolve();

    })
  } catch (e) {
    reject(e);
  }
  
}

reportHandler({
    logName : "consentManagementView",
    checkProfile : profileChecker,
    dbDataTypes : {
      consent_prompt_in_prod: DATABASE_TYPES.INTEGER,
      consent_preferences_in_prod: DATABASE_TYPES.INTEGER,
      consent_logging_in_prod: DATABASE_TYPES.INTEGER,
      loader_past_month: DATABASE_TYPES.INTEGER,
      loader_past_six_months: DATABASE_TYPES.INTEGER,
      prod_version: DATABASE_TYPES.TEXT,
      tag_count: DATABASE_TYPES.INTEGER
    },
    getProfileData: true,
    dropDB: true,
    accountList: ['services-caleb']
    //accountProfileList: [{account: 'services-caleb', profile: 'fashionid-staging'}]
  }
);