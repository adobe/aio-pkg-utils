# aio-metrics-client

This library is for enabling tracking of our App Builder services.

[![Version](https://img.shields.io/npm/v/@adobe/aio-metrics-client.svg)](https://npmjs.org/package/@adobe/aio-metrics-client)


## Usage
```
// Import
const { setMetricsURL, incBatchCounter } = require('../src/index')

// Setting the URL to send the batched metrics to
setMetricsURL('https://...<your server>...')

// Incrementing the count of a metric for a specific namespace. eg:- 'requestCount'
await incBatchCounter('requestCount', 'mynamespace')

// Incrementing the count of a metric for a specific namespace with a label such as an error type or http response type
await incBatchCounter('errorCount', 'mynamespace', 'auth')
await incBatchCounter('responseCount', 'mynamespace', '403')
```
