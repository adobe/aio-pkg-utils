let batchedMetrics = {}
let metricsMetadata = {}
let batchTimerSet = false
let metricsURL = ''

const fetch = require('node-fetch')

function createMetric (metricName, labels) {
  metricsMetadata[metricName] = labels
  console.log('createMetric ', metricsMetadata)
}

function setMetricsURL (metricsPostURL) {
  metricsURL = metricsPostURL
}

async function processBatchCounter() {
  batchTimerSet = false
  if (metricsURL) {
    Object.keys(batchedMetrics).forEach(async (metricName) => {
      console.log('Sending Batch metrics for ', metricName, batchedMetrics[metricName])
      // ex. Sending Batch metrics for  request_count { '14257-chimera-stage': 2 }
      const postBody = JSON.stringify({metric: metricName, data: batchedMetrics[metricName]})
      delete batchedMetrics[metricName]
      const reqData = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: postBody
      }
      await fetch(metricsURL, reqData)
    })
  } else {
    console.error('error: metricsURL not set, but batchedMetrics still present')
  }
}

async function incBatchCounter (metricName, namespace, label) {
  // TODO: Error handling using Metrics metadata
  /* if (metricsMetadata[metricName].length < (arguments.length-1)) {
    console.log(`Could not update metric ${metricName} because supplied label count did not match the label definition ${JSON.stringify(metricsMetadata[metricName])}`)
    return
  } */
  /* console.log(batchedMetrics[metricName])
  console.log(`batchTimerSet: ${batchTimerSet}`)
  console.log(`batchedMetrics count: ${Object.keys(batchedMetrics).length}`) */
  if(!batchTimerSet || Object.keys(batchedMetrics) > 0) {
    batchTimerSet = true
    setTimeout(processBatchCounter, 5000 ) // 5 seconds
  }
  batchedMetrics[metricName] = batchedMetrics[metricName] || {}
  if (label) {
    batchedMetrics[metricName][namespace] = batchedMetrics[metricName][namespace] || {}
    batchedMetrics[metricName][namespace][label] = batchedMetrics[metricName][namespace][label] || 0
    batchedMetrics[metricName][namespace][label] = batchedMetrics[metricName][namespace][label] + 1
  } else {    
    batchedMetrics[metricName][namespace] = batchedMetrics[metricName][namespace] || 0
    batchedMetrics[metricName][namespace] = batchedMetrics[metricName][namespace] + 1
  }
}

module.exports = {
    createMetric,
    setMetricsURL,
    incBatchCounter
}