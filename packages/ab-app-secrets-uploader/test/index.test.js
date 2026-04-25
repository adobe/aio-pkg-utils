import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCli } from '../src/index.js'

describe('createCli', () => {
  it('returns a Command instance', () => {
    const cli = createCli()
    expect(cli).toBeDefined()
    expect(cli.name()).toBe('ab-app-secrets-uploader')
  })

  it('has the upload subcommand', () => {
    const cli = createCli()
    const commands = cli.commands.map(c => c.name())
    expect(commands).toContain('upload')
  })

  describe('upload command', () => {
    let consoleSpy

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleSpy.mockRestore()
    })

    it('defaults --env to .env', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload'])
      expect(consoleSpy).toHaveBeenCalledWith(
        'upload command - not yet implemented',
        expect.objectContaining({ env: '.env' })
      )
    })

    it('accepts --env option', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--env', '.env.prod'])
      expect(consoleSpy).toHaveBeenCalledWith(
        'upload command - not yet implemented',
        expect.objectContaining({ env: '.env.prod' })
      )
    })

    it('accepts --app-id option', async () => {
      const cli = createCli()
      await cli.parseAsync(['node', 'cli', 'upload', '--app-id', 'my-app'])
      expect(consoleSpy).toHaveBeenCalledWith(
        'upload command - not yet implemented',
        expect.objectContaining({ appId: 'my-app' })
      )
    })
  })
})
