import type { SubmitEvent } from 'react'

interface SearchFormProps {
  value: string
  loading: boolean
  error: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
}

export function SearchForm({ value, loading, error, onValueChange, onSubmit }: SearchFormProps) {
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value)
  }

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
            disabled={loading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'flight-error' : 'flight-hint'}
            onChange={(event) => onValueChange(event.target.value)}
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? <><span className="button-spinner" aria-hidden="true" /> Searching</> : <>Investigate <span aria-hidden="true">&#8594;</span></>}
        </button>
      </div>
      <p className={`form-message${error ? ' form-error' : ''}`} id={error ? 'flight-error' : 'flight-hint'}>
        {error || 'Enter the airline code and flight number.'}
      </p>
    </form>
  )
}