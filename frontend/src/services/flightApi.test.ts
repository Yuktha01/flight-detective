import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getDiscoveredFlights, getFlight } from './flightApi'

describe('flightApi base URL and endpoints', () => {
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

  it('appends ?refresh=true when refresh is requested', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    await getFlight('SU1531', true)

    expect(fetchMock).toHaveBeenCalledWith('/api/flights/SU1531?refresh=true')
  })

  it('fetches discovered flights using relative URL when base URL is empty', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')

    await getDiscoveredFlights()

    expect(fetchMock).toHaveBeenCalledWith('/api/flights/discover')
  })

  it('fetches discovered flights with configured base URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com/')

    await getDiscoveredFlights()

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/api/flights/discover')
  })
})