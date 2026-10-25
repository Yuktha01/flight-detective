import type { SubmitEvent } from 'react'

interface SearchFormProps {
  value: string
  loading: boolean
  error: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onSurpriseMe?: () => void
  surpriseLoading?: boolean
}

export function SearchForm({
  value,
  loading,
  error,
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
    <form className="search-form" onSubmit={handleSubmit}>
      <label htmlFor="flight-number">Flight number</label>
      <div className="search-controls">
        <div className={`input-wrap${error ? ' has-error' : ''}`}>
          <span className="input-search-icon" aria-hidden="true" />
          <input
            id="flight-number"
            name="flightNumber"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder="e.g. SU1531"
            value={value}
            disabled={isBusy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'flight-error' : 'flight-hint'}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>
        <button type="submit" disabled={isBusy}>
          {loading ? (
            <><span className="button-spinner" aria-hidden="true" /> Searching</>
          ) : (
            <>Investigate <span aria-hidden="true">&#8594;</span></>
          )}
        </button>
        {onSurpriseMe && (
          <button
            type="button"
            className="button-surprise"
            disabled={isBusy}
            onClick={onSurpriseMe}
          >
            {surpriseLoading ? (
              <><span className="button-spinner" aria-hidden="true" /> Picking...</>
            ) : (
              'Surprise Me'
            )}
          </button>
        )}
      </div>
      <p className={`form-message${error ? ' form-error' : ''}`} id={error ? 'flight-error' : 'flight-hint'}>
        {error || 'Enter the airline code and flight number.'}
      </p>
    </form>
  )
}