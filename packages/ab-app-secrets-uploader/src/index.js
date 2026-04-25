import { writeFileSync } from 'node:fs'
import { Command } from 'commander'
import { execa } from 'execa'

export async function checkAioCli () {
  try {
    await execa('aio', ['--version'])
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'aio CLI is not installed.\n\n' +
        'To install it, run:\n' +
        '  npm install -g @adobe/aio-cli'
      )
    }
    throw err
  }
}

export async function checkGhCli () {
  try {
    await execa('gh', ['--version'])
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(
        'gh CLI is not installed.\n\n' +
        'To install it, run:\n' +
        '  brew install gh\n\n' +
        'Or visit: https://cli.github.com for other installation options.'
      )
    }
    throw err
  }
}

export async function fetchAioConfig () {
  const { stdout } = await execa('aio', ['config', 'ls', '--json'])
  return JSON.parse(stdout)
}

export function validateConfig (config) {
  const services = config?.project?.workspace?.details?.services
  if (!Array.isArray(services) || !services.some(s => s.code === 'AdobeIOManagementAPISDK')) {
    throw new Error('I/O Management API was not found in your workspace.')
  }
}

export function buildEnvVars (config, { noSuffix = false } = {}) {
  const ctx = config.project.workspace.details.credentials
    .find(c => c.integration_type === 'oauth_server_to_server')
    ?.name.toLowerCase()

  const imsCtx = config.ims.contexts[ctx]
  const suffix = noSuffix ? '' : (config.project.workspace.name === 'Production' ? '_PROD' : '_STAGE')

  return {
    [`CLIENTID${suffix}`]: imsCtx.client_id,
    [`CLIENTSECRET${suffix}`]: (Array.isArray(imsCtx.client_secrets) ? imsCtx.client_secrets : JSON.parse(imsCtx.client_secrets))[0],
    [`TECHNICALACCID${suffix}`]: imsCtx.technical_account_id,
    [`TECHNICALACCEMAIL${suffix}`]: imsCtx.technical_account_email,
    [`IMSORGID${suffix}`]: imsCtx.ims_org_id,
    [`SCOPES${suffix}`]: (Array.isArray(imsCtx.scopes) ? imsCtx.scopes : String(imsCtx.scopes).split(',')).join(','),
    [`AIO_RUNTIME_NAMESPACE${suffix}`]: config.runtime.namespace,
    [`AIO_RUNTIME_AUTH${suffix}`]: config.runtime.auth,
    [`AIO_PROJECT_ID${suffix}`]: config.project.id,
    [`AIO_PROJECT_NAME${suffix}`]: config.project.name,
    [`AIO_PROJECT_ORG_ID${suffix}`]: config.project.org.id,
    [`AIO_PROJECT_WORKSPACE_ID${suffix}`]: config.project.workspace.id,
    [`AIO_PROJECT_WORKSPACE_NAME${suffix}`]: config.project.workspace.name,
    [`AIO_PROJECT_WORKSPACE_DETAILS_SERVICES${suffix}`]: JSON.stringify(config.project.workspace.details.services)
  }
}

export function formatEnvVars (envVars) {
  return Object.entries(envVars).map(([k, v]) => `${k}=${v}`).join('\n')
}

export async function createGhEnvironment (envName) {
  try {
    await execa('gh', ['api', '-X', 'PUT', `repos/{owner}/{repo}/environments/${envName}`])
  } catch (err) {
    if (err.stderr?.includes('404') || err.message?.includes('404')) {
      throw new Error(
        `Failed to create environment '${envName}' (HTTP 404).\n\n` +
        'You may be authenticated as the wrong GitHub user. Try:\n' +
        '  gh auth switch'
      )
    }
    throw err
  }
}

export async function uploadSecrets (output, { envName = null } = {}) {
  const args = ['secret', 'set', '-f', '-']
  if (envName) args.push('--env', envName)
  await execa('gh', args, { input: output })
}

export function createCli () {
  const program = new Command()

  program
    .name('ab-app-secrets-uploader')
    .description('CLI tool for uploading App Builder app secrets')
    .version('0.1.0')

  program
    .command('upload')
    .description('Fetch secrets from aio config and upload as GitHub secrets')
    .option('--output <file>', 'write env vars to a file instead of uploading directly')
    .option('--no-suffix', 'omit the _PROD/_STAGE suffix from env var names')
    .action(async (options) => {
      try {
        await checkAioCli()
        await checkGhCli()
        const config = await fetchAioConfig()
        validateConfig(config)

        const noSuffix = !options.suffix
        const envName = noSuffix
          ? (config.project.workspace.name === 'Production' ? 'production' : 'stage')
          : null

        const envVars = buildEnvVars(config, { noSuffix })
        const output = formatEnvVars(envVars)

        if (options.output) {
          writeFileSync(options.output, output)
          console.error(`Environment variables written to ${options.output}`)
          console.error('')
          console.error('To upload these secrets to a GitHub repository, run:')
          if (noSuffix) {
            console.error(`  gh secret set -f ${options.output} --env ${envName}`)
          } else {
            console.error(`  gh secret set -f ${options.output}`)
          }
          if (noSuffix) {
            console.error('')
            console.error(`To create the '${envName}' GitHub environment, run:`)
            console.error(`  gh api -X PUT repos/{owner}/{repo}/environments/${envName}`)
          }
        } else {
          const { confirm } = await import('@inquirer/prompts')

          if (noSuffix) {
            const shouldCreate = await confirm({
              message: `Create '${envName}' environment in this GitHub repo?`,
              default: false
            })
            if (shouldCreate) {
              await createGhEnvironment(envName)
              console.error(`Environment '${envName}' created (or already existed).`)
            }
          }

          const shouldUpload = await confirm({
            message: noSuffix
              ? `Upload secrets to the '${envName}' environment in this GitHub repo?`
              : 'Upload secrets to this GitHub repo?',
            default: false
          })
          if (shouldUpload) {
            await uploadSecrets(output, { envName })
            console.error('Secrets uploaded successfully.')
          }
        }
      } catch (err) {
        console.error(`Error: ${err.message}`)
        process.exit(1)
      }
    })

  return program
}
