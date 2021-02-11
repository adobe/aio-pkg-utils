/*
 * Copyright 2021 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import Runtime, { init } from '@adobe/exc-app'

async function actionWebInvoke (actionName, headers = {}, params = {}) {
    if (!actionName || !actions[actionName]) {
      throw new Error(`Cannot fetch action '${actionName}' as it doesn't exist.`)
    }
    const response = await fetch(actions[actionName], {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(params)
    })
    let content = await response.text()
    if (!response.ok) {
      throw new Error(`failed request to '${actions[actionName]}' with status: ${response.status} and message: ${content}`)
    }
    try {
      content = JSON.parse(content)
    } catch (e) {
      // response is not json
    }
    return content
  }

  export {
    actionWebInvoke
  }
  