# aio-exc-app


This helper library contains function you can use in your application.

### web example

```js
import invokeAction from '@adobe/aio-exc-app/web/invokeAction'

const actionResponse = await invokeAction(actionUrl, headers, params)

```

### action example

```js
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('@adobe/aio-exc-app/action/utils')

async function main (params) {
    logger.debug(stringParameters(params))

    const errorMessage = checkMissingRequestInputs(params, requiredParams, requiredHeaders)
    if (errorMessage) {
        // return and log client errors
        return errorResponse(400, errorMessage, logger)
    }

    const token = getBearerToken(params)
    /* ... */
}
```