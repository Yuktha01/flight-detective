import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { FlightDetails } from './FlightDetails'
import type { FlightResponse } from '../types/flight'

const mockFlight: FlightResponse = {
  flight: {
    number: '101',
    iata: 'BA101',
    icao: 'BAW101',
    status: 'scheduled',
    date: '2026-11-20',
  },
  airline: {
    name: 'British Airways',
    iata: 'BA',
    icao: 'BAW',
  },
  route: {
    departure: {
      airport: 'Heathrow Airport',
      iata: 'LHR',
      icao: 'EGLL',
      terminal: '5',
      gate: 'A10',
    },
    arrival: {
      airport: 'John F Kennedy International Airport',
      iata: 'JFK',
      icao: 'KJFK',
      terminal: '7',
      gate: 'B2',
    },
  },
  departure: {
    scheduled: '2026-11-20T10:00:00Z',
    estimated: null,
    actual: null,
    delayMinutes: null,
  },
  arrival: {
    scheduled: '2026-11-20T14:00:00Z',
    estimated: null,
    actual: null,
    delayMinutes: null,
  },
  live: null,
  aircraft: {
    registration: 'G-XWBA',
    iata: 'A35K',
    icao: 'A35K',
  },
  insight: {
    summary: 'On time departure expected.',
    delayStatus: 'on_time',
    delayMinutes: 0,
  },
  retrievedAt: '2026-11-20T10:05:00Z',
}

describe('FlightDetails - Route Ticket Tear Interaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the boarding pass with an interactive perforation divider', () => {
    render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    expect(tearButton).toBeInTheDocument()
    expect(tearButton).toHaveTextContent('TEAR')
  })

  it('tears the ticket stub when clicking the perforation divider and allows reattaching', () => {
    render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    expect(tearButton).toHaveAttribute('aria-pressed', 'false')

    // Click dotted line to tear
    fireEvent.click(tearButton)

    // Advance animation timer (550ms)
    act(() => {
      vi.advanceTimersByTime(600)
    })

    // Now ticket is torn
    const reattachButton = screen.getByRole('button', { name: /reattach ticket stub/i })
    expect(reattachButton).toBeInTheDocument()
    expect(reattachButton).toHaveAttribute('aria-pressed', 'true')
    expect(reattachButton).toHaveTextContent('REATTACH')
    expect(screen.getByText('DETACHED STUB')).toBeInTheDocument()

    // Click again to reattach
    fireEvent.click(reattachButton)

    // Should be untorn immediately
    const resetTearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    expect(resetTearButton).toBeInTheDocument()
    expect(resetTearButton).toHaveAttribute('aria-pressed', 'false')
    expect(resetTearButton).toHaveTextContent('TEAR')
    expect(screen.queryByText('DETACHED STUB')).not.toBeInTheDocument()
  })

  it('does not reattach when clicking or grabbing the detached stub so throw works reliably', () => {
    const { container } = render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    fireEvent.click(tearButton)

    act(() => {
      vi.advanceTimersByTime(600)
    })

    const fr = container.querySelector('#fr') as HTMLElement
    expect(fr).toBeInTheDocument()
    expect(screen.getByText('DETACHED STUB')).toBeInTheDocument()

    // Clicking the detached stub must NOT reattach it; stub remains active for throwing
    fireEvent.click(fr)

    expect(screen.getByText('DETACHED STUB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reattach ticket stub/i })).toBeInTheDocument()
  })

  it('supports keyboard interaction to tear the ticket using Enter', () => {
    render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    fireEvent.keyDown(tearButton, { key: 'Enter', code: 'Enter' })

    act(() => {
      vi.advanceTimersByTime(600)
    })

    expect(screen.getByRole('button', { name: /reattach ticket stub/i })).toBeInTheDocument()
  })

  it('renders the route card and heading without extra clutter chips', () => {
    render(<FlightDetails flight={mockFlight} />)

    expect(screen.getByRole('heading', { name: /the route/i })).toBeInTheDocument()
    expect(screen.queryByText(/where you are headed/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Ends as a paper ball or a paper plane')).not.toBeInTheDocument()
    expect(screen.queryByText('INTERACTIVE BOARDING PASS')).not.toBeInTheDocument()
  })

  it('crumples the detached stub into a paper ball and rolls it away, then auto-dispenses fresh ticket', () => {
    // Force crumple selection
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    const { container } = render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    fireEvent.click(tearButton)

    // Advance 4500ms: stub lands, morphs into circle ball, and exits stage
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const fri = container.querySelector('#fri') as HTMLElement
    expect(fri).toBeInTheDocument()
    expect(fri.style.clipPath).toBe('circle(100px at 100px 150px)')

    // Check status message indicating auto-dispense countdown
    const msg = container.querySelector('#msg')
    expect(msg).toHaveTextContent('Stub flew away! Dispensing new ticket in 2s...')

    // Container should be hidden after leaving stage
    const fr = container.querySelector('#fr') as HTMLElement
    expect(fr.style.display).toBe('none')

    // Advance 2100ms for auto-dispenser to trigger and restore fresh ticket
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(msg).toHaveTextContent('Tear 0%')
    const resetTearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    expect(resetTearButton).toHaveAttribute('aria-pressed', 'false')

    vi.restoreAllMocks()
  })

  it('folds the detached stub into a paper airplane and flies it away, then auto-dispenses fresh ticket', () => {
    // Force plane selection
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    const { container } = render(<FlightDetails flight={mockFlight} />)

    const tearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    fireEvent.click(tearButton)

    // Advance 4500ms: stub lands, morphs into airplane polygon, and flies away
    act(() => {
      vi.advanceTimersByTime(4500)
    })

    const fri = container.querySelector('#fri') as HTMLElement
    expect(fri).toBeInTheDocument()
    expect(fri.style.clipPath).toBe('polygon(0% 15%,100% 50%,0% 85%,22% 50%)')

    // Check status message indicating auto-dispense countdown
    const msg = container.querySelector('#msg')
    expect(msg).toHaveTextContent('Stub flew away! Dispensing new ticket in 2s...')

    // Container should be hidden after flying off stage
    const fr = container.querySelector('#fr') as HTMLElement
    expect(fr.style.display).toBe('none')

    // Advance 2100ms for auto-dispenser to trigger and restore fresh ticket
    act(() => {
      vi.advanceTimersByTime(2100)
    })

    expect(msg).toHaveTextContent('Tear 0%')
    const resetTearButton = screen.getByRole('button', { name: /tear ticket stub/i })
    expect(resetTearButton).toHaveAttribute('aria-pressed', 'false')

    vi.restoreAllMocks()
  })
})
