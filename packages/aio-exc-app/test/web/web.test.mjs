/*
Copyright 2023 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

import { expect, jest, test, describe, beforeEach } from '@jest/globals'
import { actionWebInvoke } from '../../web/index.mjs'

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve('hello'),
    text: () => Promise.resolve('hello')
  }))
  global.fetch.mockClear()
})

describe('api', () => {
  test('functions exist', async () => {
    expect(actionWebInvoke).toBeDefined()
    expect(typeof actionWebInvoke).toBe('function')
    // throws for invalid url ( null )
    await expect(actionWebInvoke()).rejects.toThrow()
  })

  // actionUrl, headers, params, options.method
  test('POST', async () => {
    await expect(actionWebInvoke('http://actionUrl.com')).resolves.toBe('hello')
    expect(global.fetch).toHaveBeenCalledWith(new URL('http://actionUrl.com'), {
      body: '{}',
      headers: { 'Content-Type': 'application/json', 'x-ow-extra-logging': 'on' },
      method: 'POST'
    })
  })

  test('GET', async () => {
    await expect(actionWebInvoke('http://actionUrl.com', { header1: 'header1' }, { param1: 'param1' }, { method: 'GET' }))
      .resolves.toBe('hello')
    const url = new URL('http://actionUrl.com')
    url.searchParams.append('param1', 'param1')
    expect(global.fetch).toHaveBeenCalledWith(url,
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ header1: 'header1' }) }))
  })

  test('unsuppored options.method', async () => {
    await expect(actionWebInvoke('http://actionUrl.com', {}, {}, { method: 'POUT' })).rejects.toThrow()
  })

  test('failed request', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      text: () => Promise.resolve('error')
    }))
    await expect(actionWebInvoke('http://actionUrl.com')).rejects.toThrow()
  })

  test('failed request with json', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'error' })
    }))
    await expect(actionWebInvoke('http://actionUrl.com')).rejects.toThrow()
  })

  // this test is last because it changes the global window object
  test('not localhost', async () => {
    const value = { location: { hostname: 'notlocalhost' } }
    Object.defineProperty(global, 'window', { value, writable: true })
    await expect(actionWebInvoke('http://actionUrl.com')).resolves.toBe('hello')
    expect(global.fetch).toHaveBeenCalledWith(new URL('http://actionUrl.com'), {
      body: '{}',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST'
    })
  })
})
