import type { FlightResponse, FlightStatus } from '../types/flight'

interface FlightDetailsProps {
  flight: FlightResponse
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

function readableStatus(status: FlightStatus) {
  return status.replaceAll('_', ' ')
}

function FlightSummary({ flight }: FlightDetailsProps) {
  return (
    <section className="flight-summary" aria-labelledby="flight-heading">
      <div>
        <p className="section-kicker">FLIGHT BRIEF <span>{formatFlightDate(flight.flight.date)}</span></p>
        <h2 id="flight-heading">{flight.flight.number}</h2>
        <p className="airline-name">{flight.airline.name || 'Airline not available'}</p>
        {(flight.flight.iata || flight.flight.icao) && (
          <p className="record-codes">
            Flight codes: {[flight.flight.iata && `IATA ${flight.flight.iata}`, flight.flight.icao && `ICAO ${flight.flight.icao}`].filter(Boolean).join(' · ')}
          </p>
        )}
        {(flight.airline.iata || flight.airline.icao) && (
          <p className="record-codes">
            Airline codes: {[flight.airline.iata && `IATA ${flight.airline.iata}`, flight.airline.icao && `ICAO ${flight.airline.icao}`].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      <span className={`status-badge status-${flight.flight.status}`}>
        <span className="status-dot" />{readableStatus(flight.flight.status)}
      </span>
    </section>
  )
}

function FlightRoute({ flight }: FlightDetailsProps) {
  const departure = flight.route.departure
  const arrival = flight.route.arrival

  return (
    <section className="route-section" aria-labelledby="route-heading">
      <div className="section-heading">
        <p className="section-kicker">THE ROUTE</p>
        <h3 id="route-heading">Where you are headed</h3>
      </div>
      <div className="route-line">
        <div className="airport-block">
          <span className="airport-code">{departure.iata || '---'}</span>
          <span className="airport-name">{departure.airport || 'Departure airport unavailable'}</span>
          <span className="airport-detail">{[departure.icao && `ICAO ${departure.icao}`, departure.terminal && `Terminal ${departure.terminal}`, departure.gate && `Gate ${departure.gate}`].filter(Boolean).join(' · ') || 'Departure details unavailable'}</span>
        </div>
        <div className="route-connector" aria-label="Flight route">
          <span className="route-duration">ROUTE</span>
          <span className="route-track"><i /></span>
          <span className="route-plane" aria-hidden="true">&#8594;</span>
        </div>
        <div className="airport-block airport-arrival">
          <span className="airport-code">{arrival.iata || '---'}</span>
          <span className="airport-name">{arrival.airport || 'Arrival airport unavailable'}</span>
          <span className="airport-detail">{[arrival.icao && `ICAO ${arrival.icao}`, arrival.terminal && `Terminal ${arrival.terminal}`, arrival.gate && `Gate ${arrival.gate}`].filter(Boolean).join(' · ') || 'Arrival details unavailable'}</span>
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
            <h4>{label}</h4>
            <dl>
              <div><dt>Scheduled</dt><dd>{formatDateTime(data.scheduled)}</dd></div>
              {data.estimated && <div><dt>Estimated</dt><dd>{formatDateTime(data.estimated)}</dd></div>}
              {data.actual && <div><dt>Actual</dt><dd>{formatDateTime(data.actual)}</dd></div>}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

function DelayInsight({ flight }: FlightDetailsProps) {
  const delayMinutes = flight.insight.delayMinutes

  return (
    <section className="insight-section" aria-labelledby="insight-heading">
      <div className="insight-marker" aria-hidden="true">i</div>
      <div className="insight-copy">
        <p className="section-kicker">DELAY INSIGHT</p>
        <h3 id="insight-heading">{flight.insight.summary || 'No delay insight is available.'}</h3>
        <p>{delayMinutes > 0 ? `Insight delay: ${delayMinutes} minutes` : 'Insight delay: none reported'}</p>
      </div>
      <span className={`delay-tag delay-${flight.insight.delayStatus}`}>{flight.insight.delayStatus.replaceAll('_', ' ')}</span>
      <dl className="delay-breakdown">
        <div><dt>Departure</dt><dd>{flight.departure.delayMinutes} min</dd></div>
        <div><dt>Arrival</dt><dd>{flight.arrival.delayMinutes} min</dd></div>
      </dl>
    </section>
  )
}

function AircraftInfo({ flight }: FlightDetailsProps) {
  const aircraft = flight.aircraft
  if (!aircraft || ![aircraft.registration, aircraft.iata, aircraft.icao].some(Boolean)) return null

  return (
    <section className="detail-section" aria-labelledby="aircraft-heading">
      <p className="section-kicker">EQUIPMENT</p>
      <h3 id="aircraft-heading">Aircraft</h3>
      <dl className="compact-details">
        {aircraft.registration && <div><dt>Registration</dt><dd>{aircraft.registration}</dd></div>}
        {aircraft.iata && <div><dt>IATA type</dt><dd>{aircraft.iata}</dd></div>}
        {aircraft.icao && <div><dt>ICAO type</dt><dd>{aircraft.icao}</dd></div>}
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
        <div><p className="section-kicker">LIVE POSITION</p><h3 id="live-heading">In the air</h3></div>
        <span className="live-indicator"><i /> LIVE</span>
      </div>
      <dl className="compact-details live-details">
        <div><dt>Altitude</dt><dd>{Math.round(live.altitudeMeters).toLocaleString()} m</dd></div>
        <div><dt>Ground speed</dt><dd>{Math.round(live.speedKmh).toLocaleString()} km/h</dd></div>
        <div><dt>Vertical speed</dt><dd>{live.speedVertical.toLocaleString()}</dd></div>
        <div><dt>Heading</dt><dd>{Math.round(live.direction)}&deg;</dd></div>
        <div><dt>Position</dt><dd>{live.latitude.toFixed(2)}, {live.longitude.toFixed(2)}</dd></div>
        <div><dt>Updated</dt><dd>{formatDateTime(live.updated)}</dd></div>
        <div><dt>Aircraft state</dt><dd>{live.isGround ? 'On the ground' : 'Airborne'}</dd></div>
      </dl>
    </section>
  )
}

export function FlightDetails({ flight }: FlightDetailsProps) {
  return (
    <div className="flight-details">
      <FlightSummary flight={flight} />
      <FlightRoute flight={flight} />
      <div className="details-grid">
        <FlightTimeline flight={flight} />
        <DelayInsight flight={flight} />
        <AircraftInfo flight={flight} />
        <LiveFlightInfo flight={flight} />
      </div>
    </div>
  )
}