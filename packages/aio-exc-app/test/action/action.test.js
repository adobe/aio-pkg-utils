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


const {
  errorResponse,
  getBearerToken,
  stringParameters,
  checkMissingRequestInputs
} = require('../../action/')

describe('api', () => {
  test('functions exist', () => {
    expect(errorResponse).toBeDefined()
    expect(typeof errorResponse).toBe('function')

    expect(getBearerToken).toBeDefined()
    expect(typeof getBearerToken).toBe('function')

    expect(stringParameters).toBeDefined()
    expect(typeof stringParameters).toBe('function')

    expect(checkMissingRequestInputs).toBeDefined()
    expect(typeof checkMissingRequestInputs).toBe('function')
  })
})


describe('errorResponse', () => {
  test('formats status code + message', () => {
    const error = new Error('test')
    const result = errorResponse(500, error.message)
    expect(result.error).toMatchObject({ statusCode: 500, body: { error: 'test' } })
  })

  test('calls logger if passed', () => {
    const info = jest.fn()
    const error = new Error('test')
    const result = errorResponse(500, error.message, { info })
    expect(info).toHaveBeenCalledWith('500: test')
  })
})

describe('stringParameters', () => {
  test('returns stringified parameters', () => {
    const params = {
      a: 1, b: 2,
      __ow_headers: {
        header1: 'header1',
        header2: 'header2'
      }
    }
    const result = stringParameters(params)
    expect(result).toBe(JSON.stringify(params))
  })
  test('hides authorization header', () => {
    const params = {
      a: 1, b: 2,
      __ow_headers: {
        header1: 'header1',
        authorization: 'Bearer some-secret-token'
      }
    }
    const result = stringParameters(params)
    params.__ow_headers.authorization = '<hidden>'
    expect(result).toBe(JSON.stringify(params))
  })
  test('returns __ow_headers even if there wasn\'t one ?!', () => {
    const params = { a: 1, b: 2 }
    const result = stringParameters(params)
    params.__ow_headers = {}
    expect(result).toBe(JSON.stringify(params))
  })
})

describe('getBearerToken', () => {
  test('returns bearer token', () => {
    const params = {
      a: 1, b: 2,
      __ow_headers: {
        header1: 'header1',
        authorization: 'Bearer some-secret-token'
      }
    }
    const result = getBearerToken(params)
    expect(result).toBe('some-secret-token')
  })
  test('returns undefined if no authorization header', () => {
    const params = {
      a: 1, b: 2,
      __ow_headers: {
        header1: 'header1'
      }
    }
    const result = getBearerToken(params)
    expect(result).toBeUndefined()
  })
})

describe('checkMissingRequestInputs', () => {

  test('returns null if you call it without anything to check against ?!', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = checkMissingRequestInputs(obj)
    expect(result).toBeNull()
  })

  test('returns null if no missing inputs', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = checkMissingRequestInputs(obj, ['a', 'b', 'c'])
    expect(result).toBeNull()
  })
  // this api is a bit dumb, but it's what we have ... -jm (and co-pilot)
  // it would be nice to just use getMissingKeys, but it is private
  test('returns missing inputs', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = checkMissingRequestInputs(obj, ['a', 'b', 'c', 'd'])
    expect(result).toBe('missing parameter(s) \'d\'')
  })
  test('and we have to include an and case ... ', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = checkMissingRequestInputs(obj, ['a', 'b', 'c', 'd'], ['e'])
    expect(result).toBe('missing header(s) \'e\' and missing parameter(s) \'d\'')
  })
  test('returns missing inputs', () => {
    const obj = { a: 1, b: 2, c: 3, e: { f: 4 } }
    const result = checkMissingRequestInputs(obj, ['e.f', 'e.g'])
    expect(result).toBe('missing parameter(s) \'e.g\'')
  })
  test('returns missing headers', () => {
    const obj = { a: 1, b: 2, c: 3, __ow_headers: { d: 4 } }
    const result = checkMissingRequestInputs(obj, [], ['d', 'e'])
    expect(result).toBe('missing header(s) \'e\'')
  })

  test('returns missing headers coverage', () => {
    const obj = { a: {} }
    const result = checkMissingRequestInputs(obj, ['a.b.c'], [])
    expect(result).toBe('missing parameter(s) \'a.b.c\'')
  })


})

