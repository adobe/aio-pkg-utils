let batchedMetrics = {}
let metricsMetadata = {}
let batchTimerSet = false
let metricsURL = ''

const fetch = require('node-fetch')

function createMetric (metricName, labels) {
  metricsMetadata[metricName] = labels
  console.log(metricsMetadata)
}

function setMetricsConfig (metricsPostURL, endpoint) {
  console.log('setting metrics config')
  metricsURL = metricsPostURL + endpoint
}

async function processBatchCounter() {
  batchTimerSet = false
  if (metricsURL) {
    //get action namespace and auth
    const namespace = process.env.__OW_NAMESPACE
    const auth = process.env.__OW_API_KEY
    
    Object.keys(batchedMetrics).forEach(async (metricName) => {
      console.log('Sending Batch metrics for ' + metricName)
      const postBody = JSON.stringify({ metric: metricName, data: batchedMetrics[metricName] })
      delete batchedMetrics.metricName
      const reqData = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: postBody
      }
      // console.log(reqData)
      const response = await fetch(metricsURL, reqData)
      // console.log(response)
    })
  } else {
    console.log('metricsURL not set, batchedMetrics still present')
  }
}

async function incBatchCounter (metricName, namespace, label) {
  console.log(metricName)
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
    console.log('started timer')
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
    setMetricsConfig,
    incBatchCounter
}
