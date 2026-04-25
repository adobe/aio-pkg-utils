import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateConfig, buildEnvVars, formatEnvVars, fetchAioConfig, checkAioCli, checkGhCli, createGhEnvironment, uploadSecrets, createCli } from '../src/index.js'

vi.mock('execa')
vi.mock('node:fs')
vi.mock('@inquirer/prompts', () => ({ confirm: vi.fn() }))

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

  it('handles scopes as a comma-separated string', () => {
    const cfg = {
      ...stageConfig,
      ims: { contexts: { myapp_oauth: { ...stageConfig.ims.contexts.myapp_oauth, scopes: 'openid,AdobeID' } } }
    }
    expect(buildEnvVars(cfg).SCOPES_STAGE).toBe('openid,AdobeID')
  })

  it('omits suffix when noSuffix is true', () => {
    const vars = buildEnvVars(stageConfig, { noSuffix: true })
    expect(vars).toHaveProperty('CLIENTID', 'client-id-123')
    expect(vars).toHaveProperty('AIO_PROJECT_WORKSPACE_NAME', 'Stage')
    expect(Object.keys(vars).every(k => !k.endsWith('_STAGE') && !k.endsWith('_PROD'))).toBe(true)
  })

  it('uses the first client secret', () => {
    const cfg = {
      ...stageConfig,
      ims: { contexts: { myapp_oauth: { ...stageConfig.ims.contexts.myapp_oauth, client_secrets: ['first-secret', 'second-secret'] } } }
    }
    expect(buildEnvVars(cfg).CLIENTSECRET_STAGE).toBe('first-secret')
  })

  it('handles client_secrets as a JSON-encoded string', () => {
    const cfg = {
      ...stageConfig,
      ims: { contexts: { myapp_oauth: { ...stageConfig.ims.contexts.myapp_oauth, client_secrets: '["encoded-secret","other"]' } } }
    }
    expect(buildEnvVars(cfg).CLIENTSECRET_STAGE).toBe('encoded-secret')
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

describe('createGhEnvironment', () => {
  it('calls gh api PUT for the given env name', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({})
    await createGhEnvironment('production')
    expect(execa).toHaveBeenCalledWith('gh', ['api', '-X', 'PUT', 'repos/{owner}/{repo}/environments/production'])
  })

  it('calls gh api PUT for stage', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({})
    await createGhEnvironment('stage')
    expect(execa).toHaveBeenCalledWith('gh', ['api', '-X', 'PUT', 'repos/{owner}/{repo}/environments/stage'])
  })

  it('throws a gh auth switch hint on 404 (via stderr)', async () => {
    const { execa } = await import('execa')
    const err = new Error('Command failed')
    err.stderr = 'gh: Not Found (HTTP 404)'
    execa.mockRejectedValue(err)
    await expect(createGhEnvironment('production')).rejects.toThrow("Failed to create environment 'production' (HTTP 404).")
    await expect(createGhEnvironment('production')).rejects.toThrow('gh auth switch')
  })

  it('throws a gh auth switch hint on 404 (via message)', async () => {
    const { execa } = await import('execa')
    const err = new Error('Command failed with exit code 1: gh api ... 404')
    execa.mockRejectedValue(err)
    await expect(createGhEnvironment('stage')).rejects.toThrow('gh auth switch')
  })

  it('re-throws non-404 errors as-is', async () => {
    const { execa } = await import('execa')
    execa.mockRejectedValue(new Error('network timeout'))
    await expect(createGhEnvironment('stage')).rejects.toThrow('network timeout')
  })
})

describe('uploadSecrets', () => {
  it('pipes output to gh secret set', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({})
    await uploadSecrets('FOO=bar\nBAZ=qux')
    expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-'], { input: 'FOO=bar\nBAZ=qux' })
  })

  it('includes --env flag when envName is provided', async () => {
    const { execa } = await import('execa')
    execa.mockResolvedValue({})
    await uploadSecrets('FOO=bar', { envName: 'stage' })
    expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-', '--env', 'stage'], { input: 'FOO=bar' })
  })
})

describe('createCli', () => {
  it('returns a Command named ab-app-secrets-uploader', () => {
    const cli = createCli()
    expect(cli.name()).toBe('ab-app-secrets-uploader')
  })

  it('has create-env and upload subcommands', () => {
    const cli = createCli()
    const names = cli.commands.map(c => c.name())
    expect(names).toContain('create-env')
    expect(names).toContain('upload')
  })

  describe('create-env command (no prompts)', () => {
    let consoleSpy, consoleErrSpy, exitSpy

    beforeEach(async () => {
      vi.clearAllMocks()
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

    it('writes env vars to file when --output is given', async () => {
      const { writeFileSync } = await import('node:fs')
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'secrets.env'])
      expect(writeFileSync).toHaveBeenCalledWith('secrets.env', expect.stringContaining('CLIENTID_STAGE'))
      expect(consoleErrSpy).toHaveBeenCalledWith('Environment variables written to secrets.env')
    })

    it('prints to stdout when --output is not given', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env'])
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('CLIENTID_STAGE=client-id-123'))
    })

    it('prints gh secret set hint with file when --output is given', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'secrets.env'])
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh secret set -f secrets.env')
    })

    it('prints gh secret set hint without file when --output is not given', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env'])
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh secret set -f YOUR_ENV_FILE')
    })

    it('prints --env hint to stdout path when --no-suffix and no --output', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--no-suffix'])
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh secret set -f YOUR_ENV_FILE --env stage')
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh api -X PUT repos/{owner}/{repo}/environments/stage')
    })

    it('prints --env in hint and gh api command when --no-suffix is used', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'secrets.env', '--no-suffix'])
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh secret set -f secrets.env --env stage')
      expect(consoleErrSpy).toHaveBeenCalledWith("To create the 'stage' GitHub environment, run:")
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh api -X PUT repos/{owner}/{repo}/environments/stage')
    })

    it('prints production env hint for Production workspace', async () => {
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(prodConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'out.env', '--no-suffix'])
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh secret set -f out.env --env production')
      expect(consoleErrSpy).toHaveBeenCalledWith('  gh api -X PUT repos/{owner}/{repo}/environments/production')
    })

    it('shows no gh api hint when suffix is used', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'secrets.env'])
      const calls = consoleErrSpy.mock.calls.flat()
      expect(calls.some(c => c.includes('gh api'))).toBe(false)
    })

    it('shows no prompts', async () => {
      const { confirm } = await import('@inquirer/prompts')
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'create-env', '--output', 'secrets.env', '--no-suffix'])
      expect(confirm).not.toHaveBeenCalled()
    })

    it('prints error and exits on failure', async () => {
      const { execa } = await import('execa')
      execa.mockRejectedValue(new Error('aio not found'))
      const cli = createCli()
      await expect(cli.parseAsync(['node', 'cli', 'create-env'])).rejects.toThrow('process.exit')
      expect(consoleErrSpy).toHaveBeenCalledWith('Error: aio not found')
      expect(exitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('upload command (direct upload with prompts)', () => {
    let consoleErrSpy, exitSpy, confirmMock

    beforeEach(async () => {
      vi.clearAllMocks()
      consoleErrSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit') })
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const prompts = await import('@inquirer/prompts')
      confirmMock = prompts.confirm
      confirmMock.mockResolvedValue(false)
    })

    afterEach(() => {
      consoleErrSpy.mockRestore()
      exitSpy.mockRestore()
    })

    it('prompts to upload (suffix mode)', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Upload secrets to this GitHub repo?'
      }))
    })

    it('uploads when confirmed (suffix mode)', async () => {
      confirmMock.mockResolvedValue(true)
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-'], { input: expect.stringContaining('CLIENTID_STAGE') })
      expect(consoleErrSpy).toHaveBeenCalledWith('Secrets uploaded successfully.')
    })

    it('does not upload when declined', async () => {
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      const secretSetCalls = execa.mock.calls.filter(c => c[1]?.includes('set'))
      expect(secretSetCalls).toHaveLength(0)
    })

    it('prompts to create env then upload when --no-suffix', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--no-suffix'])
      expect(confirmMock).toHaveBeenNthCalledWith(1, expect.objectContaining({ message: expect.stringContaining('Create') }))
      expect(confirmMock).toHaveBeenNthCalledWith(2, expect.objectContaining({ message: expect.stringContaining("'stage' environment") }))
    })

    it('creates env and uploads when both confirmed (stage)', async () => {
      confirmMock.mockResolvedValue(true)
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--no-suffix'])
      expect(execa).toHaveBeenCalledWith('gh', ['api', '-X', 'PUT', 'repos/{owner}/{repo}/environments/stage'])
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-', '--env', 'stage'], { input: expect.stringContaining('CLIENTID=') })
      expect(consoleErrSpy).toHaveBeenCalledWith("Environment 'stage' created (or already existed).")
      expect(consoleErrSpy).toHaveBeenCalledWith('Secrets uploaded successfully.')
    })

    it('creates env and uploads when both confirmed (production)', async () => {
      confirmMock.mockResolvedValue(true)
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(prodConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--no-suffix'])
      expect(execa).toHaveBeenCalledWith('gh', ['api', '-X', 'PUT', 'repos/{owner}/{repo}/environments/production'])
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-', '--env', 'production'], { input: expect.any(String) })
    })

    it('skips env creation but uploads when only upload is confirmed', async () => {
      confirmMock.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--no-suffix'])
      const ghApiCalls = execa.mock.calls.filter(c => c[1]?.includes('-X'))
      expect(ghApiCalls).toHaveLength(0)
      expect(execa).toHaveBeenCalledWith('gh', ['secret', 'set', '-f', '-', '--env', 'stage'], { input: expect.any(String) })
    })

    it('does not write a file', async () => {
      confirmMock.mockResolvedValue(true)
      const { writeFileSync } = await import('node:fs')
      const { execa } = await import('execa')
      execa.mockResolvedValue({ stdout: JSON.stringify(stageConfig) })
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      expect(writeFileSync).not.toHaveBeenCalled()
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
