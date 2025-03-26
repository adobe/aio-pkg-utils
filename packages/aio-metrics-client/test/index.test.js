/*
 * Copyright 2025 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
const lib = require('../src/index')
const fetch = require('node-fetch')
jest.mock('node-fetch')

beforeEach(() => {
    jest.resetAllMocks()
    jest.resetModules()
    jest.clearAllTimers()
})

describe('index', () => {
    test('functions should be defined', () => {
        expect(lib.createMetric).toBeInstanceOf(Function)
        expect(lib.setMetricsURL).toBeInstanceOf(Function)
        expect(lib.incBatchCounter).toBeInstanceOf(Function)
        expect(lib.incBatchCounterMultiLabel).toBeInstanceOf(Function)
    })
})

describe('createMetric', () => {

    test('should create a metric', () => {
        const logSpy = jest.spyOn(console, 'log')
        lib.createMetric('metricName', { test: 'label' })

        // expect the new metric to be logged
        expect(logSpy).toHaveBeenCalledWith('createMetric ', { metricName: { test: 'label' } })
    })

    test('should create a metric with an empty list', () => {
        const logSpy = jest.spyOn(console, 'log')
        lib.createMetric('metricName', {})

        // expect the new metric to be logged
        expect(logSpy).toHaveBeenCalledWith('createMetric ', { metricName: {} })
    })
})

describe('incBatchCounter', () => {
    test('should process batched metrics', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounter('metricName', 'namespace', 'label')
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: 'metricName', data: { namespace: { label: 1 } } })
        })
    })

    test('should process individual metrics', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounterMultiLabel('metricName', 'namespace', { one: 1, two: 2 })
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: "metricName", namespace: "namespace", value: 1, one: 1, two: 2 })
        })
    })

    test('should process metrics if no labels', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounter('metricName', 'namespace')
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: 'metricName', data: { namespace: 1 } })
        })
    })

    test('should process multiple batched metrics in the same batch', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounter('metricName', 'namespace', 'label')
        lib.incBatchCounter('metricName', 'namespace', 'label')
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: 'metricName', data: { namespace: { label: 2 } } })
        })
    })

    test('should process multiple individual metrics in the same time period', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounterMultiLabel('metricName', 'namespace', { one: 1, two: 2 })
        lib.incBatchCounterMultiLabel('metricName', 'namespace', { one: 1, two: 2 })
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(1)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: "metricName", namespace: "namespace", value: 1, one: 1, two: 2 })
        })
    })

    test('should process multiple individual metrics in separate time periods', () => {
        lib.setMetricsURL('http://localhost:3000')
        lib.incBatchCounterMultiLabel('metricName', 'namespace', { one: 1 })
        jest.advanceTimersByTime(5000)

        lib.incBatchCounterMultiLabel('metricName', 'namespace', { one: 1 })
        jest.advanceTimersByTime(5000)

        expect(fetch).toHaveBeenCalledTimes(2)
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ metric: "metricName", namespace: "namespace", value: 1, one: 1 })
        })
    })

    test('should not add non-object multi label metric', () => {
        const logSpy = jest.spyOn(console, 'error')
        lib.incBatchCounterMultiLabel('metricName', 'namespace', 'label')
        jest.advanceTimersByTime(5000)

        expect(logSpy).toHaveBeenCalledWith('incBatchCounterMultiLabel error: labels must be an object')
    })

    test('should log to error if non-string label', () => {
        const logSpy = jest.spyOn(console, 'error')
        lib.incBatchCounter('metricName', 'namespace', 1)
        jest.advanceTimersByTime(5000)

        expect(logSpy).toHaveBeenCalledWith('incBatchCounter error: label must be a string')
    })

    test('no metrics url set, should not process batch counter', () => {
        const lib = require('../src/index')
        const logSpy = jest.spyOn(console, 'error')
        lib.incBatchCounter('metricName', 'namespace', 'label')
        jest.advanceTimersByTime(5000)

        expect(logSpy).toHaveBeenCalledWith('error: metricsURL not set, but batchedMetrics still present')
    })
})
