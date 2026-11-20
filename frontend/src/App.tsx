import { useEffect, useRef, useState } from 'react'
import {
  FlightApiError,
  getDiscoveredFlights,
  getFlight,
} from './services/flightApi'
import type { FlightResponse } from './types/flight'
import { FlightDetails } from './components/FlightDetails'
import { SearchForm } from './components/SearchForm'
import heroAircraft4k from './assets/hero-aircraft.jpg'
import heroAircraft2k from './assets/hero-aircraft-2k.jpg'
import heroAircraft1080 from './assets/hero-aircraft-1080p.jpg'
import './App.css'

type SearchState =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'success'; flight: FlightResponse }
  | { status: 'notFound'; message: string }
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string }

const flightNumberPattern = /^[A-Z][A-Z0-9]{1,2}\d{1,4}$/

function App() {
  const [flightNumber, setFlightNumber] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ status: 'initial' })
  const [surpriseLoading, setSurpriseLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const mastheadRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let lastScrollY = window.scrollY
    let accumulatedUp = 0
    let isHidden = false
    let ticking = false
    const threshold = 60
    const upTolerance = 8

    function update() {
      const currentScrollY = window.scrollY
      const delta = currentScrollY - lastScrollY
      const masthead = mastheadRef.current
      if (!masthead) {
        lastScrollY = currentScrollY
        ticking = false
        return
      }

      if (currentScrollY <= 15) {
        masthead.classList.remove('nav-hidden')
        masthead.classList.remove('nav-scrolled')
        isHidden = false
        accumulatedUp = 0
      } else {
        masthead.classList.add('nav-scrolled')

        if (delta > 4) {
          accumulatedUp = 0
          if (!isHidden && currentScrollY > threshold) {
            masthead.classList.add('nav-hidden')
            isHidden = true
          }
        } else if (delta < -4) {
          accumulatedUp += Math.abs(delta)
          if (isHidden && accumulatedUp >= upTolerance) {
            masthead.classList.remove('nav-hidden')
            isHidden = false
          }
        }
      }

      lastScrollY = currentScrollY
      ticking = false
    }

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

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
      <header ref={mastheadRef} className="masthead">
        <a className="brand" href="/" aria-label="Flight Detective home">
          <span className="brand-mark" aria-hidden="true">FD</span>
          <span className="brand-text">
            Flight Detective
            <span className="brand-sub">AIRSPACE INTELLIGENCE</span>
          </span>
        </a>

        <nav className="masthead-nav" aria-label="Primary navigation">
          <a
            href="#search-hero"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault()
              heroRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <span>Search</span>
          </a>
          <a
            href="#results-section"
            className="nav-link"
            onClick={(e) => {
              e.preventDefault()
              document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <span>Flight Briefing</span>
          </a>
          <div className="nav-social-actions">
            <a
              href="https://github.com/Yuktha01/flight-detective"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-btn nav-github-btn"
              aria-label="GitHub Repository"
              title="GitHub Repository"
            >
              <svg
                className="github-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span className="nav-link-text">GitHub</span>
            </a>
            <a
              href="https://www.linkedin.com/in/yuktha-kb/"
              target="_blank"
              rel="noopener noreferrer"
              className="nav-icon-btn nav-linkedin-btn"
              aria-label="LinkedIn Profile"
              title="LinkedIn Profile"
            >
              <svg
                className="linkedin-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63 1.63-.73 1.63-1.63-.73-1.63-1.63-1.63Z" />
              </svg>
              <span className="nav-link-text">LinkedIn</span>
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Cinematic Hero: Atmospheric Aircraft Backdrop + Oversized Typography */}
        <section
          id="search-hero"
          ref={heroRef}
          onMouseMove={handleHeroMouseMove}
          onMouseLeave={handleHeroMouseLeave}
          className="search-hero cinematic-hero"
          aria-labelledby="page-title"
        >
          <div className="hero-backdrop" aria-hidden="true">
            <div className="hero-atmosphere-grid" />
            <div className="hero-warmth-glow" />
            <div className="hero-aircraft-cinematic-stage">
              <img
                src={heroAircraft4k}
                srcSet={`${heroAircraft1080} 1920w, ${heroAircraft2k} 2560w, ${heroAircraft4k} 3840w`}
                sizes="100vw"
                alt=""
                className="hero-aircraft-img"
                loading="eager"
                decoding="async"
              />
              <div className="hero-beacon-strobe" />
            </div>
            <div className="hero-gradient-overlay" />
          </div>

          <div className="hero-container">
            <div className="hero-editorial-lead">
              <h1 id="page-title" className="hero-heading-editorial">
                Know before<br />you <span className="accent-glow">go.</span>
              </h1>
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
                onQuickRouteSelect={handleQuickSelect}
              />
            </div>
          </div>
        </section>

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
                  <p>Search a flight number above to view real-time flight status, route progress, and timing.</p>
                </div>
              </div>

              {/* Core Journey Editorial Narrative */}
              <div className="journey-editorial-grid">
                <div className="journey-step-card">
                  <span className="step-numeral">01</span>
                  <h3>Live Discovery</h3>
                  <p>Direct lookup against airline operating networks via Aviationstack.</p>
                </div>
                <div className="journey-step-card">
                  <span className="step-numeral">02</span>
                  <h3>Accurate Delays</h3>
                  <p>Missing delay data is never turned into zero. Unconfirmed statuses remain unknown.</p>
                </div>
                <div className="journey-step-card">
                  <span className="step-numeral">03</span>
                  <h3>Plain-English Insights</h3>
                  <p>Clear explanations of what operational timestamps actually mean.</p>
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
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand-title">
              <span className="brand-mark" style={{ width: 22, height: 22, fontSize: 9, borderRadius: 4 }}>FD</span>
              <span>Flight Detective</span>
            </div>
            <p className="footer-brand-desc">
              Real-time flight tracking, route analysis, and delay breakdown powered by the Aviationstack API.
            </p>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <span className="footer-col-title">Navigation</span>
              <a
                href="#search-hero"
                className="footer-link"
                onClick={(e) => {
                  e.preventDefault()
                  heroRef.current?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Search Flights
              </a>
              <a
                href="#results-section"
                className="footer-link"
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Flight Briefing
              </a>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Project &amp; Author</span>
              <a
                href="https://github.com/Yuktha01/flight-detective"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-github-link"
              >
                <svg
                  className="footer-github-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>GitHub Repository</span>
              </a>
              <a
                href="https://www.linkedin.com/in/yuktha-kb/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link footer-linkedin-link"
              >
                <svg
                  className="footer-linkedin-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.64c-.9 0-1.63.73-1.63 1.63s.73 1.63 1.63 1.63 1.63-.73 1.63-1.63-.73-1.63-1.63-1.63Z" />
                </svg>
                <span>LinkedIn Profile</span>
              </a>
              <a
                href="https://github.com/Yuktha01/flight-detective#architecture"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Architecture Specs
              </a>
            </div>
            <div className="footer-col">
              <span className="footer-col-title">Status</span>
              <span className="footer-link footer-status-live">● API Operational</span>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Flight times are displayed in your device's local timezone.</span>
          <span>Open Source · MIT License</span>
        </div>
      </footer>
    </div>
  )
}

export default App
