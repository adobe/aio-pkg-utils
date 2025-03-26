/*
 * Copyright 2025 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */


module.exports = {
    testEnvironment: 'node',
    verbose: true,
    collectCoverage: true,
    setupFilesAfterEnv: ['./test/jest.setup.js'],
    collectCoverageFrom: [
        'src/*.js'
    ],
    coverageThreshold: {
        global: {
            branches: 100,
            lines: 100,
            statements: 100,
            functions: 100
        }
    },
    reporters: [
        'default',
        ['jest-junit', { outputDirectory: 'reports/jest', outputName: 'junit.xml' }]
    ]
}
