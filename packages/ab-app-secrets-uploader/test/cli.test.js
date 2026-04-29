import { describe, it, expect, vi } from 'vitest'

const parseMock = vi.fn()
const createCliMock = vi.fn(() => ({ parse: parseMock }))

vi.mock('../src/index.js', () => ({ createCli: createCliMock }))

describe('bin/cli.js', () => {
  it('creates the CLI and parses process.argv', async () => {
    await import('../bin/cli.js')
    expect(createCliMock).toHaveBeenCalledOnce()
    expect(parseMock).toHaveBeenCalledWith(process.argv)
  })
})
