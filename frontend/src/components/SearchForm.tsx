import { useEffect, useRef, useState, type KeyboardEvent, type SubmitEvent } from 'react'

interface RouteSuggestion {
  code: string
  corridor: string
  details: string
  network: string
}

const POPULAR_CORRIDORS: RouteSuggestion[] = [
  {
    code: 'BA249',
    corridor: 'LHR → GIG',
    details: 'London to Rio',
    network: 'Atlantic Corridor',
  },
  {
    code: 'EK202',
    corridor: 'DXB → JFK',
    details: 'Dubai to New York',
    network: 'Desert Express',
  },
  {
    code: 'AI302',
    corridor: 'DEL → SYD',
    details: 'Delhi to Sydney',
    network: 'Kangaroo Route',
  },
  {
    code: 'W24979',
    corridor: 'CPH → BLL',
    details: 'Copenhagen to Billund',
    network: 'Nordic Corridor',
  },
]

interface SearchFormProps {
  value: string
  loading: boolean
  error: string
  notFoundMessage?: string
  onValueChange: (value: string) => void
  onSubmit: (value: string) => void
  onSurpriseMe?: () => void
  surpriseLoading?: boolean
  onQuickRouteSelect?: (code: string) => void
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
  onQuickRouteSelect,
}: SearchFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [routeIndex, setRouteIndex] = useState(0)
  const currentRoute = POPULAR_CORRIDORS[routeIndex]
  const fullText = `${currentRoute.code} · ${currentRoute.corridor}`

  // Start with full code typed on mount so it is immediately visible and reliable
  const [charCount, setCharCount] = useState(currentRoute.code.length)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (value !== '') return

    const typingSpeed = 55
    const deletingSpeed = 30
    const pauseDelay = 3200

    let timer: ReturnType<typeof setTimeout>

    if (!isDeleting && charCount < fullText.length) {
      timer = setTimeout(() => {
        setCharCount((prev) => prev + 1)
      }, typingSpeed)
    } else if (!isDeleting && charCount === fullText.length) {
      timer = setTimeout(() => {
        setIsDeleting(true)
      }, pauseDelay)
    } else if (isDeleting && charCount > 0) {
      timer = setTimeout(() => {
        setCharCount((prev) => prev - 1)
      }, deletingSpeed)
    } else if (isDeleting && charCount === 0) {
      timer = setTimeout(() => {
        setIsDeleting(false)
        setRouteIndex((prev) => (prev + 1) % POPULAR_CORRIDORS.length)
      }, deletingSpeed)
    }

    return () => clearTimeout(timer)
  }, [value, charCount, isDeleting, fullText.length])

  const codeLen = currentRoute.code.length
  const displayedCode = charCount <= codeLen ? fullText.slice(0, charCount) : currentRoute.code
  const displayedDesc = charCount > codeLen ? fullText.slice(codeLen, charCount) : ''

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    onSubmit(value)
  }

  function handleSelectGhost() {
    const code = currentRoute.code
    onValueChange(code)
    if (onQuickRouteSelect) {
      onQuickRouteSelect(code)
    } else {
      onSubmit(code)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Tab' && !event.shiftKey && value === '') {
      event.preventDefault()
      handleSelectGhost()
    }
  }

  const isBusy = loading || surpriseLoading

  return (
    <form className="search-form" onSubmit={handleSubmit} noValidate>
      <div className="search-meta-bar">
        <label htmlFor="flight-number" className="search-label">
          <span className="search-radar-icon" aria-hidden="true">✈</span>
          Enter Flight Number
        </label>
      </div>

      <div className="search-command-bar">
        <div
          className={`input-field-wrap${error ? ' has-error' : notFoundMessage ? ' has-warning' : ''}`}
          onClick={() => {
            if (value === '') {
              inputRef.current?.focus()
            }
          }}
        >
          <span className="input-search-glyph" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>

          <input
            ref={inputRef}
            id="flight-number"
            name="flightNumber"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            value={value}
            disabled={isBusy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'flight-error' : notFoundMessage ? 'flight-not-found' : undefined}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          {value === '' && (
            <div className="ghost-typing-layer" aria-hidden="true">
              <span className="ghost-code">{displayedCode}</span>
              <span className="ghost-caret" />
              <span className="ghost-desc">{displayedDesc}</span>
            </div>
          )}

          {value === '' && !isBusy && (
            <button
              type="button"
              className="ghost-tab-trigger"
              aria-label={currentRoute.code}
              title={`Auto-fill ${currentRoute.code} (${currentRoute.corridor})`}
              onClick={(e) => {
                e.stopPropagation()
                handleSelectGhost()
              }}
            >
              <span className="ghost-route-code">{currentRoute.code}</span>
              <kbd className="tactile-keycap">
                <span>Tab</span>
                <span className="keycap-arrow" aria-hidden="true">⇥</span>
              </kbd>
            </button>
          )}
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
            <div className="button-surprise-wrap">
              <button
                type="button"
                className="button-surprise"
                disabled={isBusy}
                onClick={onSurpriseMe}
                title="Tracks a random flight"
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
              <span className="surprise-tooltip" role="tooltip">
                Tracks a random flight
              </span>
            </div>
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
      ) : null}
    </form>
  )
}