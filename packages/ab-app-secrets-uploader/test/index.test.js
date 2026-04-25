import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateConfig, buildEnvVars, formatEnvVars, fetchAioConfig, checkAioCli, checkGhCli, createCli } from '../src/index.js'

vi.mock('execa')
vi.mock('node:fs')

const stageConfig = {
  project: {
    id: 'proj-123',
    name: 'my-project',
    org: { id: 'org-456' },
    workspace: {
      id: 'ws-789',
      name: 'Stage',
      details: {
        credentials: [{ integration_type: 'oauth_server_to_server', name: 'MyApp_OAuth' }],
        services: [{ code: 'AdobeIOManagementAPISDK' }]
      }
    }
  },
  ims: {
    contexts: {
      myapp_oauth: {
        client_id: 'client-id-123',
        client_secrets: ['secret-abc'],
        technical_account_id: 'tech-acc-id',
        technical_account_email: 'tech@example.com',
        ims_org_id: 'org@AdobeOrg',
        scopes: ['openid', 'AdobeID']
      }
    }
  },
  runtime: {
    namespace: 'runtime-ns',
    auth: 'runtime-auth-token'
  }
}

const prodConfig = {
  ...stageConfig,
  project: {
    ...stageConfig.project,
    workspace: { ...stageConfig.project.workspace, name: 'Production' }
  }
}

describe('validateConfig', () => {
  it('passes when AdobeIOManagementAPISDK is present', () => {
    expect(() => validateConfig(stageConfig)).not.toThrow()
  })

  it('throws when AdobeIOManagementAPISDK is missing', () => {
    const cfg = { project: { workspace: { details: { services: [{ code: 'SomeOtherSDK' }] } } } }
    expect(() => validateConfig(cfg)).toThrow('I/O Management API was not found in your workspace.')
  })

  it('throws when services array is empty', () => {
    const cfg = { project: { workspace: { details: { services: [] } } } }
    expect(() => validateConfig(cfg)).toThrow('I/O Management API was not found in your workspace.')
  })

  it('throws when services is missing', () => {
    expect(() => validateConfig({})).toThrow('I/O Management API was not found in your workspace.')
  })
})

describe('buildEnvVars', () => {
  it('uses _STAGE suffix for non-Production workspace', () => {
    const vars = buildEnvVars(stageConfig)
    expect(vars).toHaveProperty('CLIENTID_STAGE', 'client-id-123')
    expect(vars).toHaveProperty('CLIENTSECRET_STAGE', 'secret-abc')
    expect(vars).toHaveProperty('TECHNICALACCID_STAGE', 'tech-acc-id')
    expect(vars).toHaveProperty('TECHNICALACCEMAIL_STAGE', 'tech@example.com')
    expect(vars).toHaveProperty('IMSORGID_STAGE', 'org@AdobeOrg')
    expect(vars).toHaveProperty('SCOPES_STAGE', 'openid,AdobeID')
    expect(vars).toHaveProperty('AIO_RUNTIME_NAMESPACE_STAGE', 'runtime-ns')
    expect(vars).toHaveProperty('AIO_RUNTIME_AUTH_STAGE', 'runtime-auth-token')
    expect(vars).toHaveProperty('AIO_PROJECT_ID_STAGE', 'proj-123')
    expect(vars).toHaveProperty('AIO_PROJECT_NAME_STAGE', 'my-project')
    expect(vars).toHaveProperty('AIO_PROJECT_ORG_ID_STAGE', 'org-456')
    expect(vars).toHaveProperty('AIO_PROJECT_WORKSPACE_ID_STAGE', 'ws-789')
    expect(vars).toHaveProperty('AIO_PROJECT_WORKSPACE_NAME_STAGE', 'Stage')
    expect(vars).toHaveProperty('AIO_PROJECT_WORKSPACE_DETAILS_SERVICES_STAGE',
      JSON.stringify(stageConfig.project.workspace.details.services))
  })

  it('uses _PROD suffix for Production workspace', () => {
    const vars = buildEnvVars(prodConfig)
    expect(vars).toHaveProperty('CLIENTID_PROD')
    expect(vars).toHaveProperty('AIO_PROJECT_WORKSPACE_NAME_PROD', 'Production')
  })

  it('joins scopes with comma', () => {
    const vars = buildEnvVars(stageConfig)
    expect(vars.SCOPES_STAGE).toBe('openid,AdobeID')
  })

  it('uses the first client secret', () => {
    const cfg = {
      ...stageConfig,
      ims: {
        contexts: {
          myapp_oauth: {
            ...stageConfig.ims.contexts.myapp_oauth,
            client_secrets: ['first-secret', 'second-secret']
          }
        }
      }
    }
    expect(buildEnvVars(cfg).CLIENTSECRET_STAGE).toBe('first-secret')
  })
})

describe('formatEnvVars', () => {
  it('formats as KEY=VALUE lines', () => {
    const result = formatEnvVars({ FOO: 'bar', BAZ: 'qux' })
    expect(result).toBe('FOO=bar\nBAZ=qux')
  })
})

describe('fetchAioConfig', () => {
  it('calls aio config ls --json and parses the result', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
    const result = await fetchAioConfig()
    expect(execa).toHaveBeenCalledWith('aio', ['config', 'ls', '--json'])
    expect(result).toEqual(stageConfig)
  })
})

describe('checkAioCli', () => {
  it('resolves when aio is installed', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({ stdout: '10.0.0' })
    await expect(checkAioCli()).resolves.toBeUndefined()
    expect(execa).toHaveBeenCalledWith('aio', ['--version'])
  })

  it('throws install instructions when aio is not found', async () => {
    const { execa } = await import('execa')
    const err = new Error('spawn aio ENOENT')
    err.code = 'ENOENT'
    execa.mockRejectedValue(err)
    await expect(checkAioCli()).rejects.toThrow('aio CLI is not installed.')
    await expect(checkAioCli()).rejects.toThrow('npm install -g @adobe/aio-cli')
  })

  it('re-throws non-ENOENT errors', async () => {
    const { execa } = await import('execa')
    execa.mockRejectedValue(new Error('permission denied'))
    await expect(checkAioCli()).rejects.toThrow('permission denied')
  })
})

describe('checkGhCli', () => {
  it('resolves when gh is installed', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({ stdout: 'gh version 2.0.0' })
    await expect(checkGhCli()).resolves.toBeUndefined()
    expect(execa).toHaveBeenCalledWith('gh', ['--version'])
  })

  it('throws install instructions when gh is not found', async () => {
    const { execa } = await import('execa')
    const err = new Error('spawn gh ENOENT')
    err.code = 'ENOENT'
    execa.mockRejectedValue(err)
    await expect(checkGhCli()).rejects.toThrow('gh CLI is not installed.')
    await expect(checkGhCli()).rejects.toThrow('brew install gh')
  })

  it('re-throws non-ENOENT errors', async () => {
    const { execa } = await import('execa')
    execa.mockRejectedValue(new Error('permission denied'))
    await expect(checkGhCli()).rejects.toThrow('permission denied')
  })
})

describe('createCli', () => {
  it('returns a Command named ab-app-secrets-uploader', () => {
    const cli = createCli()
    expect(cli.name()).toBe('ab-app-secrets-uploader')
  })

  it('has the upload subcommand', () => {
    const cli = createCli()
    expect(cli.commands.map(c => c.name())).toContain('upload')
  })

  describe('upload command', () => {
    let consoleSpy, consoleErrSpy, exitSpy

    beforeEach(async () => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit') })
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
    })

    afterEach(() => {
      consoleSpy.mockRestore()
      consoleErrSpy.mockRestore()
      exitSpy.mockRestore()
    })

    it('prints env vars to stdout when no output file given', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CLIENTID_STAGE=client-id-123'))
    })

    it('writes to file and prints guidance when output file given', async () => {
      const { writeFileSync } = await import('node:fs')
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', 'secrets.env'])
      expect(writeFileSync).toHaveBeenCalledWith('secrets.env', expect.stringContaining('CLIENTID_STAGE'))
      expect(consoleErrSpy).toHaveBeenCalledWith('Environment variables written to secrets.env')
    })

    it('prints error and exits on failure', async () => {
      const { execa } = await import('execa')
      execa.mockRejectedValue(new Error('aio not found'))
      const cli = createCli()
      await expect(cli.parseAsync(['node', 'cli', 'upload'])).rejects.toThrow('process.exit')
      expect(consoleErrSpy).toHaveBeenCalledWith('Error: aio not found')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })
})
