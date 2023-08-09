# aio-exc-app

This helper library contains function you can use in your App Builder application.

### web example ( for browser / frontend code )

```js
import { actionWebInvoke } from '@adobe/aio-exc-app/web'
const actionResponse = await actionWebInvoke(actionUrl, headers, params)
```

### action example ( for use in your runtime actions / backend )

```js
const { errorResponse,
        getBearerToken,
        stringParameters,
        checkMissingRequestInputs } = require('@adobe/aio-exc-app/action')

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