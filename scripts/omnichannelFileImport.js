
'use strict'
// modified / combined from two Adrian scripts

const {
  reportHandler,
  constants: { DATABASE_TYPES },
  utils: { isEmpty }
} = require('magic-metrics-tool')

const [startDate, endDate] = getRollingDates(14)

const profileChecker = async function checkProfile (
  { CDH, record, error, account, profile, profileData, resolve, reject, sessionRequest }) {
  try {
    const cdhProfileData = await CDH.getProfile(account, profile)
    if (cdhProfileData.bulk_augmentation_definitions || cdhProfileData.dataSources) {
      // omnichannel
      const omniChannels = cdhProfileData.bulk_augmentation_definitions.filter(dataSource => dataSource.enabled === true) || []

      const omnichannelPromises = []
      omniChannels.forEach(oc => {
        oc.csv_definitions.forEach(csv => {
          if (!csv.file_prefix) return
          omnichannelPromises.push(
          // CDH.getOmniChannelData(account, profile, csv.file_prefix, startDate, endDate)
            getOmniChannelData(sessionRequest, account, profile, csv.file_prefix, startDate, endDate)
              .then(r => [null, r])
              .catch(e => [e]))
        })
      })

      const omniChannelResults = await Promise.all(omnichannelPromises)

      for (const [errorData, result] of omniChannelResults) {
        if (errorData) {
          error({ account, profile, reason: JSON.stringify(errorData) })
          continue
        }
        if (isEmpty(result)) continue
        for (const resultElement of result) {
          const [stateCount, unexpectedStateCount] = getStateCounters(resultElement)
          record('file_import_and_omnichannel_use', {
            account,
            profile,
            createdAt: resultElement.created_at.$date,
            day: resultElement.created_at.$date.split('T')[0],
            month: `${resultElement.created_at.$date.split('-')[0]}-${resultElement.created_at.$date.split('-')[1]}`,
            dataSource: '',
            name: resultElement.file.name,
            lineCount: resultElement.file.line_count,
            type: 'omnichannel',
            size: resultElement.file.size,
            linesProcessedByVp: resultElement.lines_processed_by_vp,
            downloadingStateCount: stateCount.DOWNLOADING || 0,
            downloadedStateCount: stateCount.DOWNLOADED || 0,
            processingStateCount: stateCount.PROCESSING || 0,
            processedStateCount: stateCount.PROCESSED || 0,
            failedProcessingStateCount: stateCount.FAILED_PROCESSING || 0,
            otherStateCount: JSON.stringify(unexpectedStateCount),
            fullStatus: JSON.stringify(resultElement.status),
            timeToProcess: (
              resultElement?.status?.length > 1
                ? (new Date(resultElement.status[resultElement.status.length - 1].timestamp.$date).getTime() - new Date(resultElement.status[0].timestamp.$date).getTime()) / 1000
                : 0)
          })
        }
      }
      // file import

      const fileImports = cdhProfileData.dataSources.filter(dataSource => dataSource.category === 'fileImport')

      const fileImportWithPrefix = fileImports.map(fi => {
        const fDef = cdhProfileData.fileDefinitions.find(fd => fd.id === fi.platformConfigId)
        if (!fDef) {
          error({ account, profile, reason: `Found FI ${fi.platformConfigId} | ${fi.id}, but no definitions` })
          return null
        }
        if (!fDef.enabled) return null

        return {
          filePrefix: fDef.filePrefix,
          ...fi
        }
      }).filter(Boolean)

      const promises = []
      for (const fiWithPrefix of fileImportWithPrefix) {
        promises.push(
          // CDH.getFileImportData(account, profile, fiWithPrefix.filePrefix, startDate, endDate, fiWithPrefix.id)
          getFileImportData(sessionRequest, account, profile, fiWithPrefix.filePrefix, startDate, endDate, fiWithPrefix.id)
            .then(r => [null, r])
            .catch(e => [e])
        )
      }

      const results = await Promise.all(promises)
      for (const [errorData, result] of results) {
        if (errorData) {
          error({
            account,
            profile,
            reason: JSON.stringify(errorData)
          })
          continue
        }
        if (isEmpty(result)) continue
        for (const resultElement of result) {
          const [stateCount, unexpectedStateCount] = getStateCounters(resultElement)
          record('file_import_and_omnichannel_use', {
            account,
            profile,
            name: resultElement.file.name,
            createdAt: resultElement.created_at,
            day: resultElement.created_at.split('T')[0],
            month: `${resultElement.created_at.split('-')[0]}-${resultElement.created_at.split('-')[1]}`,
            dataSource: resultElement.dataSourceId,
            type: 'file_import',
            lineCount: resultElement.file.line_count,
            downloadingStateCount: stateCount.DOWNLOADING || 0,
            downloadedStateCount: stateCount.DOWNLOADED || 0,
            processingStateCount: stateCount.PROCESSING || 0,
            processedStateCount: stateCount.PROCESSED || 0,
            failedProcessingStateCount: stateCount.FAILED_PROCESSING || 0,
            otherStateCount: JSON.stringify(unexpectedStateCount),
            size: resultElement.file.size,
            linesProcessedByVp: resultElement.lines_processed_by_vp,
            fullStatus: JSON.stringify(resultElement.status),
            timeToProcess: (
              resultElement?.status?.length > 1
                ? (new Date(resultElement.status[resultElement.status.length - 1].timestamp).getTime() - new Date(resultElement.status[0].timestamp).getTime()) / 1000
                : 0)
          })
        }
      }
    }

    resolve()
  } catch (e) {
    return reject(e)
  }
}
reportHandler({
  logName: 'cdh-fileimport',
  checkProfile: profileChecker,
  dbDataTypes: [{
    name: 'file_import_and_omnichannel_use',
    definition: {
      createdAt: DATABASE_TYPES.TEXT,
      day: DATABASE_TYPES.TEXT,
      name: DATABASE_TYPES.TEXT,
      month: DATABASE_TYPES.TEXT,
      type: DATABASE_TYPES.TEXT,
      dataSource: DATABASE_TYPES.TEXT,
      lineCount: DATABASE_TYPES.INTEGER,
      size: DATABASE_TYPES.INTEGER,
      linesProcessedByVp: DATABASE_TYPES.INTEGER,
      timeToProcess: DATABASE_TYPES.INTEGER,
      downloadingStateCount: DATABASE_TYPES.INTEGER,
      downloadedStateCount: DATABASE_TYPES.INTEGER,
      processingStateCount: DATABASE_TYPES.INTEGER,
      processedStateCount: DATABASE_TYPES.INTEGER,
      failedProcessingStateCount: DATABASE_TYPES.INTEGER,
      otherStateCount: DATABASE_TYPES.TEXT,
      fullStatus: DATABASE_TYPES.TEXT
    }
  }],
  dropDB: true,
  getProfileData: false,
  cacheRequests: false
  // accountProfileList: [{ account: '1und1', profile: 'main' }, { account: 'hse', profile: 'main' }]
  // accountList: ['1und1']
  // useRequestCache: true
}
)

function getRollingDates (days) {
  days = days || 1
  const today = new Date()
  today.setHours(0)
  today.setMinutes(0)
  today.setSeconds(0)
  today.setMilliseconds(0)

  today.setDate(today.getDate() + 1)

  const pastDate = new Date(today.getTime())
  pastDate.setDate(pastDate.getMonth() - (days))

  return [pastDate, today]
  // var now = moment__WEBPACK_IMPORTED_MODULE_0___default()().startOf("day").add(1, "day");
  // return [now.clone().subtract(31, "day").utc(), now.clone().utc()]
}
/*
function getRollingMonth () {
  const today = new Date()
  today.setHours(0)
  today.setMinutes(0)
  today.setSeconds(0)
  today.setMilliseconds(0)

  today.setDate(today.getDate() + 1)

  const minusMonth = new Date(today.getTime())
  minusMonth.setDate(minusMonth.getMonth() - 31)

  return [minusMonth, today]
  // var now = moment__WEBPACK_IMPORTED_MODULE_0___default()().startOf("day").add(1, "day");
  // return [now.clone().subtract(31, "day").utc(), now.clone().utc()]
}
*/

function getFileImportData (sessionRequest, account, profile, filePrefix, startDate, endDate, dataSourceId) {
  if (startDate instanceof Date) {
    startDate.setHours(0)
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    startDate.setMilliseconds(0)
    startDate = startDate.toISOString()
  }

  if (endDate instanceof Date) {
    endDate.setHours(23)
    endDate.setMinutes(0)
    endDate.setSeconds(0)
    endDate.setMilliseconds(0)
    endDate = endDate.toISOString()
  }

  return sessionRequest.get(`/urest/datacloud/${account}/${profile}/bulk-download/search`, { filePrefix, startDate, endDate, dataSourceId: '' })
}

function getOmniChannelData (sessionRequest, account, profile, filePrefix, startDate, endDate) {
  if (startDate instanceof Date) {
    startDate.setHours(0)
    startDate.setMinutes(0)
    startDate.setSeconds(0)
    startDate.setMilliseconds(0)
    startDate = startDate.toISOString().replace(/:00\.000Z$/, 'Z')
  }

  if (endDate instanceof Date) {
    endDate.setHours(23)
    endDate.setMinutes(0)
    endDate.setSeconds(0)
    endDate.setMilliseconds(0)
    endDate = endDate.toISOString().replace(/:00\.000Z$/, 'Z')
  }

  return sessionRequest.get(`/urest/v1/omnichannel/accounts/${account}/profiles/${profile}/files/search`, { filePrefix, startDate, endDate })
}

function getStateCounters (resultElement) {
  const stateCount = {}
  resultElement.status.forEach((statusObject) => {
    stateCount[statusObject.state] = stateCount[statusObject.state] || 0
    stateCount[statusObject.state]++
  })
  const unexpectedStateCount = {}
  const expectedStates = ['DOWNLOADING', 'DOWNLOADED', 'PROCESSING', 'PROCESSED', 'FAILED_PROCESSING']
  Object.keys(stateCount).forEach((key) => {
    if (expectedStates.indexOf(key) === -1) {
      unexpectedStateCount[key] = stateCount[key]
    }
  })
  return [stateCount, unexpectedStateCount]
}
