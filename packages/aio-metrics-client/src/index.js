const batchedMetricsBulk = {}
const batchedMetrics = []
const metricsMetadata = {}
let batchTimerSet = false
let metricsURL = ''

const fetch = require('node-fetch')

/**
 * Creates a metric with the specified name and labels.
 *
 * @param {string} metricName - The name of the metric to create.
 * @param {object} labels - An object containing label key-value pairs for the metric.
 */
function createMetric (metricName, labels) {
  metricsMetadata[metricName] = labels
  console.log('createMetric ', metricsMetadata)
}

/**
 * Sets the URL to which metrics will be posted.
 *
 * @param {string} metricsPostURL - The URL to set for posting metrics.
 */
function setMetricsURL (metricsPostURL) {
  metricsURL = metricsPostURL
}

/**
 * Process batched metrics
 */
async function processBatchCounter () {
  batchTimerSet = false
  if (metricsURL) {
    let processPromises = []

    // Bulk processing
    processPromises = processPromises.concat(Object.keys(batchedMetricsBulk).map((metricName) => {
      console.log('Sending bulk batch metrics for ', metricName, batchedMetricsBulk[metricName])
      // ex. Sending bulk batch metrics for  request_count { '14257-chimera-stage': 2 }
      const postBody = JSON.stringify({ metric: metricName, data: batchedMetricsBulk[metricName] })
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
    processPromises = processPromises.concat(batchedMetrics.map((metric, i) => {
      console.log('Sending batch metrics for ', JSON.stringify(metric))
      // ex. Sending batch metrics for  request_count { '14257-chimera-stage': 2 }
      const postBody = JSON.stringify(metric)
      batchedMetrics.splice(i, 1)
      const reqData = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: postBody
      }
      return fetch(metricsURL, reqData)
    }))

    await Promise.allSettled(processPromises)
  } else {
    console.error('error: metricsURL not set, but batchedMetrics still present')
  }
}

/**
 * Increment a counter metric
 * Note: If you only have one label for your metric, use this function. It will batch the counter increments and send them in bulk.
 * @param {string} metricName Name of the metric
 * @param {string} namespace Namespace
 * @param {string} label Label string (ex. 'GET /templates')
 */
async function incBatchCounter (metricName, namespace, label) {
  if (label && typeof label !== 'string') {
    console.error('incBatchCounter error: label must be a string')
    return
  }

  // TODO: Error handling using Metrics metadata
  /* if (metricsMetadata[metricName].length < (arguments.length-1)) {
    console.log(`Could not update metric ${metricName} because supplied label count did not match the label definition ${JSON.stringify(metricsMetadata[metricName])}`)
    return
  } */
  /* console.log(batchedMetricsBulk[metricName])
  console.log(`batchTimerSet: ${batchTimerSet}`)
  console.log(`batchedMetricsBulk count: ${Object.keys(batchedMetricsBulk).length}`) */
  if (!batchTimerSet || Object.keys(batchedMetricsBulk) > 0) {
    batchTimerSet = true
    setTimeout(processBatchCounter, 5000) // 5 seconds
  }

  batchedMetricsBulk[metricName] = batchedMetricsBulk[metricName] || {}

  // If only one label or no label, use bulk processing
  // Otherwise post metrics individually
  if (label) {
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] || {}
    batchedMetricsBulk[metricName][namespace][label] = batchedMetricsBulk[metricName][namespace][label] || 0
    batchedMetricsBulk[metricName][namespace][label] = batchedMetricsBulk[metricName][namespace][label] + 1
  } else {
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] || 0
    batchedMetricsBulk[metricName][namespace] = batchedMetricsBulk[metricName][namespace] + 1
  }
}

/**
 * Increment a counter metric with multiple labels
 *
 * Note: This function will send metrics in individual network requests, not in bulk.
 *
 * @param {string} metricName Name of the metric
 * @param {string} namespace Name of the namespace
 * @param {object} labels Labels, ex. { api: 'GET /templates', errorCategory: '500' }
 */
async function incBatchCounterMultiLabel (metricName, namespace, labels) {
  if (!batchTimerSet || batchedMetrics.length > 0) {
    batchTimerSet = true
    setTimeout(processBatchCounter, 5000) // 5 seconds
  }

  if (typeof labels !== 'object') {
    console.error('incBatchCounterMultiLabel error: labels must be an object')
    return
  }

  batchedMetrics.push({
    metric: metricName,
    namespace,
    value: 1,
    ...labels
  })
}

module.exports = {
  createMetric,
  setMetricsURL,
  incBatchCounter,
  incBatchCounterMultiLabel
}
