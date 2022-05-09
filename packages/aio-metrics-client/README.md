# aio-lib-metrics

This library is for enabling tracking of our App Builder services and is not expected to be used by third-parties.
This is not for customer actions and they are not expected to install it as part of their App Builder projects.

This will be used by following services/actions:

  - TVM
  - AppBuilder Catalog
  - Login 
  - Validator

## Usage
```
// Import
const { setMetricsURL, incBatchCounter } = require('../src/index')

// Setting the URL to send the batched metrics to
setMetricsURL('https://devxmetricsservice-dev-va7.stage.cloud.adobe.io/recordtvmmetrics')

// Incrementing the count of a metric for a specific namespace. eg:- 'requestCount'
await incBatchCounter('requestCount', 'mynamespace')

// Incrementing the count of a metric for a specific namespace with a label such as an error type or http response type
await incBatchCounter('errorCount', 'mynamespace', 'auth')
await incBatchCounter('responseCount', 'mynamespace', '403')
```
