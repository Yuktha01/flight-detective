import type { SubmitEvent } from 'react'

interface SearchFormProps {
  value: string
  loading: boolean
  error: string
  notFoundMessage?: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onSurpriseMe?: () => void
  surpriseLoading?: boolean
}

export function SearchForm({
  value,
  loading,
  error,
  notFoundMessage = '',
  onValueChange,
  onSubmit,
  onSurpriseMe,
  surpriseLoading = false,
}: SearchFormProps) {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value)
  }

  const isBusy = loading || surpriseLoading

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <div className="search-meta-bar">
        <label htmlFor="flight-number" className="search-label">
          <span className="search-radar-icon" aria-hidden="true">✈</span>
          Flight number
        </label>
        <span className="search-format-hint" aria-hidden="true">
          AIRLINE CODE + NUMBER
        </span>
      </div>

      <div className="search-command-bar">
        <div className={`input-field-wrap${error ? ' has-error' : notFoundMessage ? ' has-warning' : ''}`}>
          <span className="input-search-glyph" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            id="flight-number"
            name="flightNumber"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder="Search flight number (e.g. BA249, AI302, DL402)"
            value={value}
            disabled={isBusy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'flight-error' : notFoundMessage ? 'flight-not-found' : 'flight-hint'}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>

        <div className="search-actions">
          <button type="submit" className="button-investigate" disabled={isBusy}>
            {loading ? (
              <>
                <span className="button-spinner" aria-hidden="true" />
                Searching
              </>
            ) : (
              <>
                Investigate <span className="action-arrow" aria-hidden="true">&#8594;</span>
              </>
            )}
          </button>

          {onSurpriseMe && (
            <button
              type="button"
              className="button-surprise"
              disabled={isBusy}
              onClick={onSurpriseMe}
              title="Select an actual live flight currently tracked via Aviationstack"
            >
              {surpriseLoading ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  Picking...
                </>
              ) : (
                <>
                  <span className="live-beacon" aria-hidden="true" />
                  Surprise Me
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="form-message form-error" id="flight-error" role="alert">
          {error}
        </p>
      ) : notFoundMessage ? (
        <p className="form-message form-warning" id="flight-not-found">
          <span className="warning-dot" aria-hidden="true">!</span>
          <span>{notFoundMessage}</span>
        </p>
      ) : (
        <p className="form-message" id="flight-hint">
          Tip: Check your boarding pass or booking confirmation for your airline code and flight digits (e.g. BA249, AI302).
        </p>
      )}
    </form>
  )
}