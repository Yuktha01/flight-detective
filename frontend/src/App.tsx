import { useState } from 'react'
import { FlightApiError, getFlight } from './services/flightApi'
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

const flightNumberPattern = /^[A-Z]{2}\d{1,4}$/

function App() {
  const [flightNumber, setFlightNumber] = useState('')
  const [searchState, setSearchState] = useState<SearchState>({ status: 'initial' })

  async function handleSearch(value: string) {
    const normalizedFlightNumber = value.trim().toUpperCase()

    if (!flightNumberPattern.test(normalizedFlightNumber)) {
      setSearchState({
        status: 'invalid',
        message: 'Enter a flight number with 2 letters followed by 1 to 4 digits.',
      })
      return
    }

    setFlightNumber(normalizedFlightNumber)
    setSearchState({ status: 'loading' })

    try {
      const flight = await getFlight(normalizedFlightNumber)
      setSearchState({ status: 'success', flight })
    } catch (error) {
      if (error instanceof FlightApiError && error.status === 404) {
        setSearchState({ status: 'notFound', message: error.message })
      } else if (error instanceof FlightApiError && error.status === 400) {
        setSearchState({ status: 'invalid', message: error.message })
      } else {
        setSearchState({
          status: 'error',
          message: error instanceof FlightApiError
            ? error.message
            : 'Could not reach Flight Detective. Check your connection and try again.',
        })
      }
    }
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
      <header className="masthead">
        <a className="brand" href="/" aria-label="Flight Detective home">
          <span className="brand-mark" aria-hidden="true">FD</span>
          <span>Flight Detective</span>
        </a>
        <span className="masthead-note">FLIGHT STATUS, MADE CLEAR</span>
      </header>

      <main>
        <section className="search-hero" aria-labelledby="page-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="signal-dot" /> YOUR FLIGHT BRIEFING</p>
            <h1 id="page-title">Know before<br />you <span>go.</span></h1>
            <p className="hero-description">
              Get a clear read on your flight: its status, timing, route, and the details that matter.
            </p>
          </div>
          <div className="search-panel">
            <SearchForm
              value={flightNumber}
              loading={isLoading}
              error={searchState.status === 'invalid' ? message : ''}
              onValueChange={setFlightNumber}
              onSubmit={handleSearch}
            />
            <div className="search-footnote">
              <span>TRY</span> SU1531 <i /> AI302 <i /> BA249
            </div>
          </div>
          <div className="hero-index" aria-hidden="true">01 <span>/</span> TRACK</div>
        </section>

        <section className="results-area" aria-live="polite" aria-busy={isLoading}>
          {searchState.status === 'initial' && (
            <div className="empty-state">
              <div className="radar-mark" aria-hidden="true"><span /><span /><span /></div>
              <div>
                <p className="section-kicker">YOUR NEXT MOVE</p>
                <h2>Start with a flight number</h2>
                <p>Search above to see a live briefing and a plain-language delay insight.</p>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="feedback-state" role="status">
              <span className="loading-indicator" aria-hidden="true" />
              <div>
                <p className="section-kicker">CHECKING {flightNumber}</p>
                <h2>Putting your flight brief together</h2>
                <p>Looking up the latest available flight information.</p>
              </div>
            </div>
          )}

          {searchState.status === 'success' && <FlightDetails flight={searchState.flight} />}

          {(searchState.status === 'notFound' || searchState.status === 'error') && (
            <div className="feedback-state error-state" role="alert">
              <span className="feedback-symbol" aria-hidden="true">!</span>
              <div>
                <p className="section-kicker">
                  {searchState.status === 'notFound' ? 'NO MATCH FOUND' : 'FLIGHT DATA UNAVAILABLE'}
                </p>
                <h2>{searchState.status === 'notFound' ? 'We could not locate that flight' : 'We hit a delay on our end'}</h2>
                <p>{message}</p>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="page-footer">
        <span>FLIGHT DETECTIVE <span className="footer-dot">/</span> FLIGHT INTELLIGENCE</span>
        <span>Flight times are shown in your local time zone.</span>
      </footer>
    </div>
  )
}

export default App
