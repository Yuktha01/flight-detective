import { useRef, useState } from 'react'
import {
  FlightApiError,
  getDiscoveredFlights,
  getFlight,
} from './services/flightApi'
import type { FlightResponse } from './types/flight'
import { FlightDetails } from './components/FlightDetails'
import { SearchForm } from './components/SearchForm'
import './App.css'

type SearchState =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'success'; flight: FlightResponse }
  | { status: 'notFound'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string }

const flightNumberPattern = /^[A-Z][A-Z0-9]{1,2}\d{1,4}$/

const QUICK_EXAMPLES = [
  {
    code: 'SU1531',
    corridor: 'TOF → SVO',
    network: 'Eurasian Corridor',
    badge: 'Continental',
    details: 'Tomsk to Moscow',
  },
  {
    code: 'AI302',
    corridor: 'DEL → SYD',
    network: 'Indo-Pacific Corridor',
    badge: 'Long-Haul',
    details: 'Delhi to Sydney',
  },
  {
    code: 'BA249',
    corridor: 'LHR → GIG',
    network: 'Atlantic Corridor',
    badge: 'Transatlantic',
    details: 'London to Rio',
  },
  {
    code: 'W24979',
    corridor: 'CPH → BLL',
    network: 'Nordic Corridor',
    badge: 'Regional',
    details: 'Copenhagen to Billund',
  },
]

function App() {
  const [flightNumber, setFlightNumber] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ status: 'initial' })
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  function handleHeroMouseMove(event: React.MouseEvent<HTMLElement>) {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2
    heroRef.current.style.setProperty('--hero-parallax-x', x.toFixed(3))
    heroRef.current.style.setProperty('--hero-parallax-y', y.toFixed(3))
  }

  function handleHeroMouseLeave() {
    if (!heroRef.current) return
    heroRef.current.style.setProperty('--hero-parallax-x', '0')
    heroRef.current.style.setProperty('--hero-parallax-y', '0')
  }

  async function handleSearch(value: string, refresh = false) {
    const normalizedFlightNumber = value.trim().toUpperCase()

    if (!flightNumberPattern.test(normalizedFlightNumber)) {
      setSearchState({
        status: 'invalid',
        message: 'Enter a flight number with a 2- or 3-character airline code followed by 1 to 4 digits.',
      })
      return
    }

    setFlightNumber(normalizedFlightNumber)

    if (refresh) {
      setIsRefreshing(true)
    } else {
      setSearchState({ status: 'loading' })
    }

    try {
      const flight = refresh
        ? await getFlight(normalizedFlightNumber, true)
        : await getFlight(normalizedFlightNumber)
      setSearchState({ status: 'success', flight })
    } catch (error) {
      if (error instanceof FlightApiError && error.status === 404) {
        setSearchState({ status: 'notFound', message: error.message })
      } else if (error instanceof FlightApiError && error.status === 400) {
        setSearchState({ status: 'invalid', message: error.message })
      } else {
        setSearchState({
          status: 'error',
          message:
            error instanceof FlightApiError
              ? error.message
              : 'Could not reach Flight Detective. Check your connection and try again.',
        })
      }
    } finally {
      if (refresh) {
        setIsRefreshing(false)
      }
    }
  }

  async function handleSurpriseMe() {
    setSurpriseLoading(true)
    try {
      const discovery = await getDiscoveredFlights()
      if (!discovery.flights || discovery.flights.length === 0) {
        setSearchState({
          status: 'notFound',
          message: 'No live flights currently discovered. Please search for a specific flight number.',
        })
        return
      }

      // Pick a random real flight from the discovered set
      const randomIndex = Math.floor(Math.random() * discovery.flights.length)
      const chosenFlight = discovery.flights[randomIndex]

      setFlightNumber(chosenFlight.flightNumber)
      await handleSearch(chosenFlight.flightNumber)
    } catch (error) {
      setSearchState({
        status: 'error',
        message:
          error instanceof FlightApiError
            ? error.message
            : 'Could not discover live flights. Check your connection and try again.',
      })
    } finally {
      setSurpriseLoading(false)
    }
  }

  function handleQuickSelect(code: string) {
    setFlightNumber(code)
    handleSearch(code)
  }

  const isLoading = searchState.status === 'loading'
  const message =
    searchState.status === 'invalid' ||
    searchState.status === 'notFound' ||
    searchState.status === 'error'
      ? searchState.message
      : ''

  return (
    <div className="app-shell">
      {/* Editorial Navigation Masthead */}
      <header className="masthead">
        <a className="brand" href="/" aria-label="Flight Detective home">
          <span className="brand-mark" aria-hidden="true">FD</span>
          <span className="brand-text">
            Flight Detective
            <span className="brand-sub">AIRSPACE INTELLIGENCE</span>
          </span>
        </a>

        <div className="masthead-badge">
          <span className="pulse-indicator" aria-hidden="true" />
          <span className="masthead-note">FLIGHT STATUS, MADE CLEAR</span>
        </div>
      </header>

      <main>
        {/* Cinematic Hero: Atmospheric Aircraft Backdrop + Oversized Typography */}
        <section
          ref={heroRef}
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
          className="search-hero cinematic-hero"
          aria-labelledby="page-title"
        >
          <div className="hero-backdrop" aria-hidden="true">
            <div className="hero-atmosphere-grid" />
            <div className="hero-aircraft-cinematic-stage">
              <img
                src="/hero-aircraft.jpg"
                alt=""
                className="hero-aircraft-img"
                loading="eager"
              />
              <div className="hero-beacon-strobe" />
            </div>
            <div className="hero-gradient-overlay" />
          </div>

          <div className="hero-container">
            <div className="hero-editorial-lead">
              <div className="eyebrow">
                <span className="signal-dot" aria-hidden="true" />
                <span>FLIGHT INVESTIGATION BRIEF</span>
                <span className="eyebrow-divider">/</span>
                <span className="eyebrow-sub">GLOBAL AIRSPACE MONITOR</span>
              </div>

              <h1 id="page-title" className="hero-heading-editorial">
                Know before<br />you <span className="accent-glow">go.</span>
              </h1>

              <p className="hero-description">
                Enter a flight number. Find out what’s happening with your flight: its status, timing, route, and delay insights.
              </p>
            </div>

            {/* Seamless Search Command Integration */}
            <div className="hero-search-area">
              <SearchForm
                value={flightNumber}
                loading={isLoading}
                error={searchState.status === 'invalid' ? message : ''}
                notFoundMessage={
                  searchState.status === 'notFound'
                    ? `Flight "${flightNumber}" wasn't found in today's active schedule. Double-check your flight number, or try an active corridor below.`
                    : ''
                }
                onValueChange={setFlightNumber}
                onSubmit={handleSearch}
                onSurpriseMe={handleSurpriseMe}
                surpriseLoading={surpriseLoading}
              />

              {/* Creative Airspace Corridor Showcase */}
              <div className="featured-corridors-section">
                <div className="corridors-header-row">
                  <span className="corridors-label">FEATURED AIRSPACE CORRIDORS</span>
                  <span className="corridors-hint">Select a corridor to preview real flight briefing</span>
                </div>
                <div className="corridor-cards-grid">
                  {QUICK_EXAMPLES.map((item) => {
                    const isSelected = flightNumber.toUpperCase() === item.code
                    return (
                      <button
                        type="button"
                        key={item.code}
                        className={`corridor-card${isSelected ? ' is-selected' : ''}`}
                        aria-label={item.code}
                        onClick={() => handleQuickSelect(item.code)}
                        disabled={isLoading || surpriseLoading}
                        title={`Investigate ${item.code}: ${item.details}`}
                      >
                        <div className="corridor-card-header">
                          <span className="corridor-airline">{item.network}</span>
                          <span className="corridor-badge">{item.badge}</span>
                        </div>
                        <div className="corridor-card-body">
                          <div className="corridor-code-row">
                            <span className="corridor-code">{item.code}</span>
                            <span className="corridor-dot" aria-hidden="true" />
                          </div>
                          <div className="corridor-route-row">
                            <span className="corridor-corridor-text">{item.corridor}</span>
                            <span className="corridor-details-text">{item.details}</span>
                          </div>
                        </div>
                        <div className="corridor-card-footer">
                          <span className="inspect-action">
                            Investigate Corridor <span className="inspect-arrow">→</span>
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="discovery-clarification-banner">
                <span className="discovery-spark" aria-hidden="true">✦</span>
                <p>
                  <strong>Surprise Me</strong> discovers an active flight currently operating across global airspace via Aviationstack.
                </p>
              </div>
            </div>
          </div>

          <div className="hero-bottom-bar" aria-hidden="true">
            <span className="hero-index-mark">01 <span>/</span> FLIGHT INVESTIGATION</span>
            <div className="hero-source-tag">
              <span className="hero-source-bullet" aria-hidden="true">◆</span>
              <span>GLOBAL AIRSPACE INTELLIGENCE</span>
            </div>
          </div>
        </section>

        {/* Compact Flight Briefing Ribbon */}
        <div className="briefing-ticker-ribbon" aria-hidden="true">
          <div className="ticker-cell">
            <span className="ticker-dot">●</span>
            <span>WORLDWIDE AIRPORT SCHEDULES</span>
          </div>
          <div className="ticker-cell">
            <span className="ticker-dot">●</span>
            <span>ACCURATE DELAY BREAKDOWN</span>
          </div>
          <div className="ticker-cell">
            <span className="ticker-dot">●</span>
            <span>SCHEDULED VS ACTUAL TIMING</span>
          </div>
          <div className="ticker-cell">
            <span className="ticker-dot">●</span>
            <span>AUTOMATIC TIMEZONE CONVERSION</span>
          </div>
        </div>

        {/* Dynamic Results & Investigation Area */}
        <section
          id="results-section"
          className="results-area"
          aria-live="polite"
          aria-busy={isLoading}
        >
          {searchState.status === 'initial' && (
            <div className="empty-state-editorial">
              <div className="empty-state-top">
                <div className="radar-visual" aria-hidden="true">
                  <div className="radar-circle radar-c1" />
                  <div className="radar-circle radar-c2" />
                  <div className="radar-circle radar-c3" />
                  <div className="radar-sweep" />
                  <div className="radar-blip blip-1" />
                  <div className="radar-blip blip-2" />
                  <span className="radar-reticle" />
                </div>

                <div className="empty-copy">
                  <p className="section-kicker">YOUR NEXT MOVE</p>
                  <h2>Start with a flight number</h2>
                  <p>Search above to see a live briefing and a plain-language delay insight.</p>
                </div>
              </div>

              {/* Core Journey Editorial Narrative */}
              <div className="journey-editorial-grid">
                <div className="journey-step-card">
                  <span className="step-numeral">01</span>
                  <h3>Real Flight Discovery</h3>
                  <p>Direct lookup against airline operating networks. No synthetic records.</p>
                </div>
                <div className="journey-step-card">
                  <span className="step-numeral">02</span>
                  <h3>Honest Delay Truth</h3>
                  <p>Missing delay data is never turned into zero. Unconfirmed statuses remain unknown.</p>
                </div>
                <div className="journey-step-card">
                  <span className="step-numeral">03</span>
                  <h3>Plain-English Insights</h3>
                  <p>Clear, trustworthy explanations of what the operational timestamps actually mean.</p>
                </div>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="feedback-state loading-state" role="status">
              <div className="scanner-graphic" aria-hidden="true">
                <span className="loading-indicator" />
              </div>
              <div className="feedback-copy">
                <p className="section-kicker">CHECKING {flightNumber}</p>
                <h2>Putting your flight brief together</h2>
                <p>Looking up the latest available flight information.</p>
              </div>
            </div>
          )}

          {searchState.status === 'success' && (
            <FlightDetails
              flight={searchState.flight}
              onRefresh={() => handleSearch(flightNumber, true)}
              isRefreshing={isRefreshing}
            />
          )}

          {(searchState.status === 'notFound' || searchState.status === 'error') && (
            <div className="feedback-state error-state" role="alert">
              <span className="feedback-symbol" aria-hidden="true">!</span>
              <div className="feedback-copy">
                <p className="section-kicker">
                  {searchState.status === 'notFound' ? 'NO MATCH FOUND' : 'FLIGHT DATA UNAVAILABLE'}
                </p>
                <h2>
                  {searchState.status === 'notFound'
                    ? 'We could not locate that flight'
                    : 'We hit a delay on our end'}
                </h2>
                <p className="error-body-text">{message}</p>

                {searchState.status === 'notFound' && (
                  <div className="error-actions-row">
                    <span className="action-hint">Need inspiration?</span>
                    <button
                      type="button"
                      className="error-action-button"
                      onClick={handleSurpriseMe}
                      disabled={surpriseLoading}
                    >
                      Surprise Me with a live flight
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Technical Editorial Footer */}
      <footer className="page-footer">
        <div className="footer-line">
          <span>FLIGHT DETECTIVE <span className="footer-dot">/</span> AIRSPACE INTELLIGENCE</span>
          <span>Flight times are shown in your local time zone.</span>
        </div>
        <div className="footer-subline">
          <span>Powered by Aviationstack Global Flight Intelligence</span>
          <span>Global Carrier &amp; Airport Operations Data</span>
        </div>
      </footer>
    </div>
  )
}

export default App
