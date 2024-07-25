let batchedMetricsBulk = {}
let batchedMetrics = []
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

/**
 * Process batched metrics
 */
async function processBatchCounter() {
  batchTimerSet = false
  if (metricsURL) {
    let processPromises = []

    // Bulk processing
    processPromises = processPromises.concat(Object.keys(batchedMetricsBulk).map((metricName) => {
      console.log('Sending bulk batch metrics for ', metricName, batchedMetricsBulk[metricName])
      // ex. Sending bulk batch metrics for  request_count { '14257-chimera-stage': 2 }
      const postBody = JSON.stringify({metric: metricName, data: batchedMetricsBulk[metricName]})
      delete batchedMetricsBulk[metricName]
      const reqData = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: postBody
      }
      return fetch(metricsURL, reqData)
    }))

    // Individual processing
    processPromises = processPromises.concat(batchedMetrics.map((metric) => {
      console.log('Sending batch metrics for ', metric.metric, metric)
      // ex. Sending batch metrics for  request_count { '14257-chimera-stage': 2 }
      const postBody = JSON.stringify(metric)
      const reqData = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: postBody
      }
      return fetch(metricsURL, reqData)
    }))

    await Promise.all(processPromises)
  } else {
    console.error('error: metricsURL not set, but batchedMetrics still present')
  }
}

/**
 * Increment a counter metric with multiple labels
 * 
 * Note: If there isn't a label or only one label, this client uses a faster way of processing metrics 
 *       by posting multiple increments for the same namespace in a single request.
 * @param {string} metricName Name of the metric
 * @param {string} namespace Namespace
 * @param {string | Array<string>} labels Labels
 */
async function incBatchCounter (metricName, namespace, ...labels) {
  // TODO: Error handling using Metrics metadata
  /* if (metricsMetadata[metricName].length < (arguments.length-1)) {
    console.log(`Could not update metric ${metricName} because supplied label count did not match the label definition ${JSON.stringify(metricsMetadata[metricName])}`)
    return
  } */
  /* console.log(batchedMetricsBulk[metricName])
  console.log(`batchTimerSet: ${batchTimerSet}`)
  console.log(`batchedMetricsBulk count: ${Object.keys(batchedMetricsBulk).length}`) */
  if(!batchTimerSet || Object.keys(batchedMetricsBulk) > 0) {
    batchTimerSet = true
    setTimeout(processBatchCounter, 5000 ) // 5 seconds
  }

  batchedMetricsBulk[metricName] = batchedMetricsBulk[metricName] || {}

  // If only one label or no label, use bulk processing
  // Otherwise post metrics individually
  if (labels.length === 1) {
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] || {}
    batchedMetricsBulk[metricName][namespace][labels[0]] = batchedMetricsBulk[metricName][namespace][labels[0]] || 0
    batchedMetricsBulk[metricName][namespace][labels[0]] = batchedMetricsBulk[metricName][namespace][labels[0]] + 1
  } 
  else if (labels.length > 1) {
    batchedMetrics.push({
      metric: metricName, 
      namespace, 
      value: 1,
      ...labels
    })
  }
  else {    
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] || 0
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] + 1
  }
}

module.exports = {
    createMetric,
    setMetricsURL,
    incBatchCounter
}