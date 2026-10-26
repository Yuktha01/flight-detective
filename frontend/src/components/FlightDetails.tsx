import type { FlightResponse, FlightStatus } from '../types/flight'

interface FlightDetailsProps {
  flight: FlightResponse
  onRefresh?: () => void
  isRefreshing?: boolean
}

function formatDateTime(value: string | null | undefined) {
  if (!value?.trim()) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatFlightDate(value: string | null | undefined) {
  if (!value?.trim()) return 'Date unavailable'

  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatLiveNumber(value: number | null | undefined, format: (value: number) => string) {
  return typeof value === 'number' && Number.isFinite(value)
    ? format(value)
    : 'Not available'
}

function readableStatus(status: FlightStatus) {
  if (status === 'unknown') return 'status unavailable'
  return status.replaceAll('_', ' ')
}

function FlightLifecycleTrack({ status }: { status: FlightStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="lifecycle-track lifecycle-cancelled" aria-label="Flight lifecycle status">
        <div className="track-node node-done">
          <span className="node-marker" />
          <span className="node-name">Scheduled</span>
        </div>
        <div className="track-connector connector-cancelled" />
        <div className="track-node node-cancelled">
          <span className="node-marker" />
          <span className="node-name">Cancelled</span>
        </div>
      </div>
    )
  }

  if (status === 'diverted') {
    return (
      <div className="lifecycle-track lifecycle-diverted" aria-label="Flight lifecycle status">
        <div className="track-node node-done">
          <span className="node-marker" />
          <span className="node-name">Departed</span>
        </div>
        <div className="track-connector connector-diverted" />
        <div className="track-node node-diverted">
          <span className="node-marker" />
          <span className="node-name">Diverted</span>
        </div>
      </div>
    )
  }

  if (status === 'unknown') {
    return (
      <div className="lifecycle-track lifecycle-unknown" aria-label="Flight lifecycle status">
        <div className="track-node node-unknown">
          <span className="node-marker" />
          <span className="node-name">Flight Status Unconfirmed</span>
        </div>
      </div>
    )
  }

  const isScheduled = status === 'scheduled'
  const isInFlight = status === 'in_flight'
  const isLanded = status === 'landed'

  return (
    <div className="lifecycle-track" aria-label="Flight lifecycle progress">
      <div className={`track-node ${isScheduled || isInFlight || isLanded ? 'node-done' : ''}`}>
        <span className="node-marker" />
        <span className="node-name">Scheduled</span>
      </div>
      <div className={`track-connector ${isInFlight || isLanded ? 'connector-done' : ''}`} />
      <div className={`track-node ${isInFlight ? 'node-active' : isLanded ? 'node-done' : ''}`}>
        <span className="node-marker" />
        <span className="node-name">Airborne</span>
      </div>
      <div className={`track-connector ${isLanded ? 'connector-done' : ''}`} />
      <div className={`track-node ${isLanded ? 'node-done node-landed' : ''}`}>
        <span className="node-marker" />
        <span className="node-name">Landed</span>
      </div>
    </div>
  )
}

function FlightSummary({ flight, onRefresh, isRefreshing }: FlightDetailsProps) {
  const flightCode = flight.flight.iata || flight.flight.number

  return (
    <section className="flight-hero-card" aria-labelledby="flight-heading">
      <div className="flight-hero-top">
        <div className="hero-kicker-meta">
          <p className="section-kicker">
            FLIGHT BRIEF <span className="kicker-sep">/</span> <span>{formatFlightDate(flight.flight.date)}</span>
          </p>
          {flight.retrievedAt && (
            <span className="data-freshness-pill" title="Data retrieved via Aviationstack API">
              <span className="freshness-dot" aria-hidden="true" />
              Aviationstack · Retrieved {formatDateTime(flight.retrievedAt)}
            </span>
          )}
        </div>

        <div className="flight-hero-actions">
          <span className={`status-badge status-${flight.flight.status}`}>
            <span className="status-dot" aria-hidden="true" />
            {readableStatus(flight.flight.status)}
          </span>

          {onRefresh && (
            <button
              type="button"
              className="button-refresh"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh flight data"
              title="Query Aviationstack for the latest live status"
            >
              <span className={`refresh-glyph${isRefreshing ? ' spinning' : ''}`} aria-hidden="true">↺</span>
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      <div className="flight-hero-identity">
        <div className="identity-primary">
          <h2 id="flight-heading" className="flight-code-oversized">{flightCode}</h2>
          <div className="identity-details">
            <p className="airline-name">{flight.airline.name || 'Airline not available'}</p>
            <div className="technical-code-badges">
              {(flight.flight.iata || flight.flight.icao) && (
                <span className="record-codes">
                  Flight codes: {[
                    flight.flight.iata && `IATA ${flight.flight.iata}`,
                    flight.flight.icao && `ICAO ${flight.flight.icao}`,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
              {(flight.airline.iata || flight.airline.icao) && (
                <span className="record-codes">
                  Airline codes: {[
                    flight.airline.iata && `IATA ${flight.airline.iata}`,
                    flight.airline.icao && `ICAO ${flight.airline.icao}`,
                  ].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Operational Lifecycle Step Track */}
        <div className="lifecycle-wrapper">
          <FlightLifecycleTrack status={flight.flight.status} />
        </div>
      </div>
    </section>
  )
}

function DelayInsight({ flight }: FlightDetailsProps) {
  const delayMinutes = flight.insight.delayMinutes
  const isLanded = flight.flight.status === 'landed'

  return (
    <section className="insight-section lead-insight-card" aria-labelledby="insight-heading">
      <div className="insight-main-row">
        <div className="insight-icon-frame" aria-hidden="true">
          <span>i</span>
        </div>
        <div className="insight-copy">
          <p className="section-kicker">DELAY INSIGHT</p>
          <h3 id="insight-heading" className="insight-summary-title">
            {flight.insight.summary || 'No delay insight is available.'}
          </h3>
          <p className="insight-status-clarification">
            {isLanded && delayMinutes !== null && delayMinutes > 0
              ? `Final status: Flight arrived ${delayMinutes} minutes behind original schedule.`
              : delayMinutes !== null && delayMinutes > 0
                ? `Insight delay: ${delayMinutes} minutes`
                : delayMinutes === 0
                  ? 'Insight delay: none reported'
                  : 'Insight delay: data unavailable'}
          </p>
        </div>
        <span className={`delay-tag delay-${flight.insight.delayStatus}`}>
          {flight.insight.delayStatus.replaceAll('_', ' ')}
        </span>
      </div>

      <dl className="delay-breakdown">
        <div className="delay-metric-cell">
          <dt>Departure</dt>
          <dd>{flight.departure.delayMinutes !== null ? `${flight.departure.delayMinutes} min` : 'Unavailable'}</dd>
        </div>
        <div className="delay-metric-cell">
          <dt>Arrival</dt>
          <dd>{flight.arrival.delayMinutes !== null ? `${flight.arrival.delayMinutes} min` : 'Unavailable'}</dd>
        </div>
      </dl>
    </section>
  )
}

function FlightRoute({ flight }: FlightDetailsProps) {
  const departure = flight.route.departure
  const arrival = flight.route.arrival
  const originName = departure.airport || departure.iata || 'Origin'
  const destName = arrival.airport || arrival.iata || 'Destination'

  return (
    <section className="route-section geodesic-route-card" aria-labelledby="route-heading">
      <div className="section-heading">
        <div className="heading-with-caption">
          <p className="section-kicker">THE ROUTE</p>
          <h3 id="route-heading">Where you are headed</h3>
          <p className="route-caption-text">
            Direct corridor from {originName} to {destName}
          </p>
        </div>
      </div>

      <div className="geodesic-display">
        {/* Curved Geodesic Route Canvas */}
        <div className="route-canvas-wrapper" aria-hidden="true">
          <svg className="route-arc-svg" viewBox="0 0 800 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="routeGradientArc" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d2fc38" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                <stop offset="100%" stopColor="#d2fc38" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Navigational corridor background line */}
            <path
              d="M 50 90 Q 400 15 750 90"
              className="route-path-background"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
            {/* Active trajectory arc */}
            <path
              d="M 50 90 Q 400 15 750 90"
              className="route-path-active animate-route-path"
              fill="none"
              stroke="url(#routeGradientArc)"
              strokeWidth="3.5"
            />
            {/* Departure Anchor */}
            <g className="anchor-origin animate-anchor-origin">
              <circle cx="50" cy="90" r="8" fill="#d4fc34" opacity="0.25" />
              <circle cx="50" cy="90" r="4" fill="#d4fc34" />
            </g>
            {/* Directional Airplane Marker at Apex (Illustrative) */}
            <g className="apex-aircraft-marker animate-aircraft-marker" transform="translate(400, 48)">
              <circle cx="0" cy="0" r="15" fill="#101522" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />
              <path
                d="M -5 -2 L 0 -7 L 5 -2 L 1 -2 L 1 5 L 3 7 L 3 8 L 0 7 L -3 8 L -3 7 L -1 5 L -1 -2 Z"
                fill="#38bdf8"
                transform="rotate(90)"
              />
            </g>
            {/* Arrival Anchor */}
            <g className="anchor-dest animate-anchor-dest">
              <circle cx="750" cy="90" r="8" fill="#38bdf8" opacity="0.25" />
              <circle cx="750" cy="90" r="4" fill="#38bdf8" />
            </g>
          </svg>
        </div>

        <div className="route-terminals-grid">
          {/* Departure Terminal Block */}
          <div className="terminal-block departure-block">
            <span className="terminal-role">ORIGIN</span>
            <span className="airport-code">{departure.iata || '---'}</span>
            <span className="airport-name">{departure.airport || 'Departure airport unavailable'}</span>
            <span className="airport-detail">
              {[
                departure.icao && `ICAO ${departure.icao}`,
                departure.terminal && `Terminal ${departure.terminal}`,
                departure.gate && `Gate ${departure.gate}`,
              ].filter(Boolean).join(' · ') || 'Departure details unavailable'}
            </span>
          </div>

          {/* Central Route Corridor Tag */}
          <div className="route-connector" aria-label="Flight route">
            <span className="route-duration">GREAT-CIRCLE CORRIDOR</span>
            <span className="route-corridor-spec">FLIGHT TRAJECTORY</span>
            <span className="route-sub-note">Illustrative route · Not live radar telemetry</span>
          </div>

          {/* Arrival Terminal Block */}
          <div className="terminal-block arrival-block">
            <span className="terminal-role">DESTINATION</span>
            <span className="airport-code">{arrival.iata || '---'}</span>
            <span className="airport-name">{arrival.airport || 'Arrival airport unavailable'}</span>
            <span className="airport-detail">
              {[
                arrival.icao && `ICAO ${arrival.icao}`,
                arrival.terminal && `Terminal ${arrival.terminal}`,
                arrival.gate && `Gate ${arrival.gate}`,
              ].filter(Boolean).join(' · ') || 'Arrival details unavailable'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function FlightTimeline({ flight }: FlightDetailsProps) {
  const timings = [
    { label: 'Departure', data: flight.departure },
    { label: 'Arrival', data: flight.arrival },
  ]

  return (
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="section-heading">
        <p className="section-kicker">SCHEDULE</p>
        <h3 id="timeline-heading">Flight timeline</h3>
      </div>

      <div className="timeline-grid">
        {timings.map(({ label, data }) => (
          <div className="timing-column" key={label}>
            <div className="timing-header">
              <h4>{label}</h4>
              {data.delayMinutes !== null && data.delayMinutes > 0 && (
                <span className="timing-delta-badge delayed">+{data.delayMinutes}m</span>
              )}
              {data.delayMinutes === 0 && (
                <span className="timing-delta-badge on-time">On time</span>
              )}
            </div>
            <dl className="timing-list">
              <div className="timing-row">
                <dt>Scheduled</dt>
                <dd>{formatDateTime(data.scheduled)}</dd>
              </div>
              {data.estimated && (
                <div className="timing-row row-estimated">
                  <dt>Estimated</dt>
                  <dd>{formatDateTime(data.estimated)}</dd>
                </div>
              )}
              {data.actual && (
                <div className="timing-row row-actual">
                  <dt>Actual</dt>
                  <dd>{formatDateTime(data.actual)}</dd>
                </div>
              )}
            </dl>
          </div>
        ))}
      </div>

      <p className="timeline-data-note">
        Timings reflect carrier-reported gate and runway events. Times are shown in your local timezone.
      </p>
    </section>
  )
}

function AircraftInfo({ flight }: FlightDetailsProps) {
  const aircraft = flight.aircraft
  if (!aircraft || ![aircraft.registration, aircraft.iata, aircraft.icao].some(Boolean)) return null

  return (
    <section className="detail-section equipment-section" aria-labelledby="aircraft-heading">
      <p className="section-kicker">EQUIPMENT</p>
      <h3 id="aircraft-heading">Aircraft</h3>
      <dl className="compact-details">
        {aircraft.registration && (
          <div className="spec-item">
            <dt>Registration</dt>
            <dd className="mono-value">{aircraft.registration}</dd>
          </div>
        )}
        {aircraft.iata && (
          <div className="spec-item">
            <dt>IATA type</dt>
            <dd className="mono-value">{aircraft.iata}</dd>
          </div>
        )}
        {aircraft.icao && (
          <div className="spec-item">
            <dt>ICAO type</dt>
            <dd className="mono-value">{aircraft.icao}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}

function LiveFlightInfo({ flight }: FlightDetailsProps) {
  const live = flight.live
  if (!live) return null

  return (
    <section className="detail-section live-section" aria-labelledby="live-heading">
      <div className="live-heading-row">
        <div>
          <p className="section-kicker">LIVE POSITION</p>
          <h3 id="live-heading">In the air</h3>
        </div>
        <span className="live-indicator">
          <i aria-hidden="true" /> LIVE
        </span>
      </div>
      <dl className="compact-details live-details">
        <div className="spec-item">
          <dt>Altitude</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.altitudeMeters, (value) => `${Math.round(value).toLocaleString()} m`)}
          </dd>
        </div>
        <div className="spec-item">
          <dt>Ground speed</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.speedKmh, (value) => `${Math.round(value).toLocaleString()} km/h`)}
          </dd>
        </div>
        <div className="spec-item">
          <dt>Vertical speed</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.speedVertical, (value) => value.toLocaleString())}
          </dd>
        </div>
        <div className="spec-item">
          <dt>Heading</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.direction, (value) => `${Math.round(value)}\u00b0`)}
          </dd>
        </div>
        <div className="spec-item">
          <dt>Position</dt>
          <dd className="mono-value">
            {typeof live.latitude === 'number' && Number.isFinite(live.latitude)
              ? live.latitude.toFixed(2)
              : 'Not available'}
            ,{' '}
            {typeof live.longitude === 'number' && Number.isFinite(live.longitude)
              ? live.longitude.toFixed(2)
              : 'Not available'}
          </dd>
        </div>
        <div className="spec-item">
          <dt>Updated</dt>
          <dd className="mono-value">{formatDateTime(live.updated)}</dd>
        </div>
        <div className="spec-item">
          <dt>Aircraft state</dt>
          <dd className="mono-value">
            {typeof live.isGround === 'boolean'
              ? live.isGround
                ? 'On the ground'
                : 'Airborne'
              : 'Not available'}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export function FlightDetails({ flight, onRefresh, isRefreshing }: FlightDetailsProps) {
  const flightKey = `${flight.flight.iata || flight.flight.number}-${flight.flight.date || ''}`

  return (
    <div className="flight-details-editorial" key={flightKey}>
      {/* 1. Dominant Flight Identity Hero */}
      <div className="briefing-stage briefing-stage-1">
        <FlightSummary flight={flight} onRefresh={onRefresh} isRefreshing={isRefreshing} />
      </div>

      {/* 2. Primary Plain-English Takeaway (Delay Insight) */}
      <div className="briefing-stage briefing-stage-2">
        <DelayInsight flight={flight} />
      </div>

      {/* 3. Substantial Geodesic Route Visualization */}
      <div className="briefing-stage briefing-stage-3">
        <FlightRoute flight={flight} />
      </div>

      {/* 4. Schedule and Technical Telemetry Grid */}
      <div className="briefing-stage briefing-stage-4">
        <div className="details-editorial-grid">
          <FlightTimeline flight={flight} />
          <AircraftInfo flight={flight} />
          <LiveFlightInfo flight={flight} />
        </div>
      </div>
    </div>
  )
}