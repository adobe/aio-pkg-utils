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

/* global fetch, window */

/**
 *
 * Invokes a web action
 *
 * @param  {string} actionUrl
 * @param {object} headers
 * @param  {object} params
 * @param object options
 *
 * @returns {Promise<string|object>} the response
 *
 */

async function invokeAction(actionUrl, headers = {}, params = {}, options = { method: 'POST' }) {
  const fetchUrl = new URL(actionUrl)

  const actionHeaders = {
    'Content-Type': 'application/json',
    ...headers
  }
  if (window.location.hostname === 'localhost') {
    actionHeaders['x-ow-extra-logging'] = 'on'
  }

  const fetchConfig = {
    headers: actionHeaders,
    method: options.method.toUpperCase()
  }

  if (fetchConfig.method === 'GET') {
    Object.keys(params).forEach(key => fetchUrl.searchParams.append(key, params[key]))
  } else if (fetchConfig.method === 'POST') {
    fetchConfig.body = JSON.stringify(params)
  } else {
    throw new Error(`unsuppored options.method: ${fetchConfig.method}`)
  }

  const response = await fetch(fetchUrl, fetchConfig)

  let content = await response.text()

  if (!response.ok) {
    throw new Error(`failed request to '${fetchUrl}' with status: ${response.status} and message: ${content}`)
  }
  try {
    content = JSON.parse(content)
  } catch (e) {
    // response is not json
  }
  return content
}

export default invokeAction
