import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getFlight } from './flightApi'

describe('getFlight API base URL', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('uses the relative API path when the base URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    await getFlight('W24979')

    expect(fetchMock).toHaveBeenCalledWith('/api/flights/W24979')
  })

  it('prefixes the API path with the configured base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')

    await getFlight('GEC8387')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/api/flights/GEC8387',
    )
  })
})