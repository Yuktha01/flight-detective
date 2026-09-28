import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FlightApiError, getFlight } from './services/flightApi'
import type { FlightResponse } from './types/flight'
import App from './App'

vi.mock('./services/flightApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./services/flightApi')>()
  return { ...actual, getFlight: vi.fn() }
})

const mockedGetFlight = vi.mocked(getFlight)

const flightResponse: FlightResponse = {
  flight: {
    number: 'SU1531',
    iata: 'SU1531',
    icao: 'AFL1531',
    status: 'in_flight',
    date: '2026-09-28',
  },
  airline: { name: 'Aeroflot', iata: 'SU', icao: 'AFL' },
  route: {
    departure: {
      airport: 'Sheremetyevo International Airport',
      iata: 'SVO',
      icao: 'UUEE',
      terminal: 'C',
      gate: '12',
    },
    arrival: {
      airport: 'Pulkovo Airport',
      iata: 'LED',
      icao: 'ULLI',
      terminal: '1',
      gate: '4',
    },
  },
  departure: {
    scheduled: '2026-09-28T10:00:00+03:00',
    estimated: '2026-09-28T10:15:00+03:00',
    actual: null,
    delayMinutes: 15,
  },
  arrival: {
    scheduled: '2026-09-28T11:30:00+03:00',
    estimated: null,
    actual: null,
    delayMinutes: 8,
  },
  aircraft: { registration: 'RA-12345', iata: 'A320', icao: 'A320' },
  live: {
    updated: '2026-09-28T10:45:00+03:00',
    latitude: 59.93,
    longitude: 30.36,
    altitudeMeters: 10000,
    direction: 180,
    speedKmh: 800,
    speedVertical: 2,
    isGround: false,
  },
  insight: {
    delayMinutes: 15,
    delayStatus: 'delayed',
    summary: 'This flight is delayed by 15 minutes.',
  },
}

describe('Flight Detective app', () => {
  beforeEach(() => {
    mockedGetFlight.mockReset()
  })

  it('shows the initial empty state', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Start with a flight number' })).toBeInTheDocument()
  })

  it('shows loading while a valid flight request is pending', async () => {
    let resolveFlight!: (flight: FlightResponse) => void
    mockedGetFlight.mockReturnValue(new Promise((resolve) => {
      resolveFlight = resolve
    }))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Flight number' }), ' su1531 ')
    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(screen.getByRole('status')).toHaveTextContent('CHECKING SU1531')
    expect(mockedGetFlight).toHaveBeenCalledWith('SU1531')
    expect(screen.getByRole('textbox', { name: 'Flight number' })).toBeDisabled()

    await act(async () => {
      resolveFlight(flightResponse)
    })
  })

  it('renders flight details after a successful response', async () => {
    mockedGetFlight.mockResolvedValue(flightResponse)
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Flight number' }), 'su1531')
    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(await screen.findByRole('heading', { name: 'SU1531' })).toBeInTheDocument()
    expect(screen.getByText('Aeroflot')).toBeInTheDocument()
    expect(screen.getByText('SVO')).toBeInTheDocument()
    expect(screen.getByText('LED')).toBeInTheDocument()
    expect(screen.getByText('This flight is delayed by 15 minutes.')).toBeInTheDocument()
    expect(screen.getByText('RA-12345')).toBeInTheDocument()
    expect(screen.getByText('Ground speed')).toBeInTheDocument()
  })

  it('shows the not-found state for a 404 response', async () => {
    mockedGetFlight.mockRejectedValue(new FlightApiError("We couldn't find that flight.", 404, 'FLIGHT_NOT_FOUND'))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Flight number' }), 'AI302')
    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(await screen.findByRole('heading', { name: 'We could not locate that flight' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't find that flight.")
  })

  it('shows invalid-input feedback for a 400 response', async () => {
    mockedGetFlight.mockRejectedValue(new FlightApiError('Please enter a valid flight number.', 400, 'INVALID_FLIGHT_NUMBER'))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Flight number' }), 'AI302')
    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(await screen.findByText('Please enter a valid flight number.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Flight number' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows the unavailable state for other API failures', async () => {
    mockedGetFlight.mockRejectedValue(new FlightApiError('Flight information is temporarily unavailable.', 503))
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByRole('textbox', { name: 'Flight number' }), 'AI302')
    await user.click(screen.getByRole('button', { name: /investigate/i }))

    expect(await screen.findByRole('heading', { name: 'We hit a delay on our end' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Flight information is temporarily unavailable.')
  })
})