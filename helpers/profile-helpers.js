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