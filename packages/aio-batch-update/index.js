/*
 * Copyright 2024 Adobe Inc. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const fs = require('fs').promises
const execa = require('execa')
const { repos: appBuilderRepos } = require('../aio-app-builder-repos/index')
const config = require('./update-config.json')
const ora = require('ora')
const inquirer = require('inquirer')

const executable = 'git-xargs'

const main = async () => {
    const spinner = ora('Running batch update with patch ${config.patch}...').start()

    // check if git-xargs is installed
    try {
        spinner.text = 'Checking if git-xargs is installed...'
        await execa(executable, { stdio: 'ignore' })
        spinner.info('git-xargs is installed')
    } catch (err) {
        if (err.message.includes('ENOENT')) {
            spinner.fail('git-xargs not found. Please install it by using the instructions in the README.md')
            process.exit(1)
        }
    }

    // check if update patch exists 
    spinner.text = 'Checking if patch exists...'
    try {
        await fs.access(`${__dirname}/patches/${config.patch}`)
        spinner.info(`Patch ${config.patch} found`)
    } catch (err) {
        if (err.code === 'ENOENT') {
            spinner.fail(`Patch ${config.patch} not found. Exiting...`)
            process.exit(1)
        }
    }

    spinner.text = 'Getting list of repos...'
    let reposToOperateOn
    if (config?.repos.length > 0) {
        spinner.info("Using repos from config...")
        reposToOperateOn = config.repos
    } else {
        spinner.info("No repos specified in config. Using all active and non-documentation repos from aio-app-builder-repos...")
        reposToOperateOn = appBuilderRepos
            .filter(repo => !repo.archived && !repo.documentation)
            .map(repo => repo.repo)
    }

    await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: `This patch will be applied to ${reposToOperateOn.length} repos. Do you want to continue?`
        }
    ]).then(answers => {
        if (!answers.confirm) {
            spinner.fail('Patch not applied. Exiting...')
            process.exit(1)
        }
    })

    spinner.text = 'Writing repos to repos.txt...'
    await fs.writeFile('repos.txt', reposToOperateOn.join('\n'))
    spinner.info('Repos written to repos.txt')

    spinner.text = 'Creating commits and pull requests...'
    await execa('git-xargs', [
        '--repos',
        'repos.txt',
        "--branch-name",
        `${config.branch}`,
        '--commit-message',
        `${config.commitMessage}`,
        '--no-skip-ci',
        '--seconds-between-prs',
        '30',
        '--seconds-to-wait-when-rate-limited',
        '60',
        'git',
        'apply',
        `${__dirname}/patches/${config.patch}`,
    ], {
        stdio: 'inherit'
    })
    spinner.info('Commits and pull requests created')
}

main()
    .catch(console.error)
