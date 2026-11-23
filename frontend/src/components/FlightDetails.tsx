import { useState, useRef, useEffect } from 'react'
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

function formatTicketDate(value: string | null | undefined) {
  if (!value?.trim()) return '---'
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date).toUpperCase()
}

function formatTicketTime(value: string | null | undefined) {
  if (!value?.trim()) return '---'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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
  const isDelayUnavailable =
    delayMinutes === null ||
    flight.insight.delayStatus === 'unknown' ||
    (flight.departure.delayMinutes === null && flight.arrival.delayMinutes === null)

  return (
    <section className="insight-section lead-insight-card" aria-labelledby="insight-heading">
      <div className="insight-main-row">
        <div
          className="insight-icon-frame"
          {...(isDelayUnavailable
            ? {
                tabIndex: 0,
                role: 'note',
                'aria-label': 'Delay data is not provided by the API provider',
                title: 'Not provided by API provider',
              }
            : { 'aria-hidden': 'true' })}
        >
          <span>i</span>
          {isDelayUnavailable && (
            <span className="insight-tooltip" role="tooltip">
              Not provided by API provider
            </span>
          )}
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

const W = 800
const H = 300
const PX = 600
const OY = 20
const SH = 470
const ST = 6
const N = H / ST

interface FreeState {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  vr: number
  held: boolean
  lx: number
  ly: number
  ox: number
  oy: number
  rest?: number
  end?: 'fade' | 'crumple' | 'plane'
  k?: number
  s?: number
  shaped?: number
  done?: number
}

interface Chad {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  vr: number
  s: number
  l: number
}

interface PointerSample {
  x: number
  y: number
  t: number
}

function FlightRoute({ flight }: FlightDetailsProps) {
  const [isTorn, setIsTorn] = useState(false)

  const boxRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const tRef = useRef<HTMLDivElement>(null)
  const mnRef = useRef<HTMLDivElement>(null)
  const fibRef = useRef<HTMLDivElement>(null)
  const attRef = useRef<HTMLDivElement>(null)
  const fwRef = useRef<HTMLDivElement>(null)
  const fsRef = useRef<HTMLDivElement>(null)
  const grabRef = useRef<HTMLDivElement>(null)
  const perfRef = useRef<HTMLDivElement>(null)
  const frRef = useRef<HTMLDivElement>(null)
  const friRef = useRef<HTMLDivElement>(null)
  const cvRef = useRef<HTMLCanvasElement>(null)
  const msgRef = useRef<HTMLSpanElement>(null)

  const dRef = useRef<number[]>([])
  const frontRef = useRef<number>(0)
  const angRef = useRef<number>(5)
  const angVRef = useRef<number>(0)
  const angTRef = useRef<number>(5)
  const stateRef = useRef<'idle' | 'drag' | 'auto' | 'free'>('idle')
  const freeRef = useRef<FreeState | null>(null)
  const chadYRef = useRef<number>(0)
  const lastFRef = useRef<number>(0)
  const st0Ref = useRef<{ x: number; y: number; f: number } | null>(null)
  const psRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const lastPctRef = useRef<number>(-1)
  const chRef = useRef<Chad[]>([])
  const sRef = useRef<number>(1)
  const isTornRef = useRef<boolean>(false)
  const soundOnRef = useRef<boolean>(true)
  const autoTimerRef = useRef<number | null>(null)
  const autoDispenseTimerRef = useRef<number | null>(null)
  const rafIdRef = useRef<number>(0)
  const runningRef = useRef<boolean>(true)
  const pointerHistoryRef = useRef<PointerSample[]>([])
  const releaseThrowRef = useRef<() => void>(() => {})

  const audioCtxRef = useRef<AudioContext | null>(null)
  const noiseGainRef = useRef<GainNode | null>(null)
  const bpFilterRef = useRef<BiquadFilterNode | null>(null)
  const cxRef = useRef<CanvasRenderingContext2D | null>(null)

  const initAudio = () => {
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state === 'suspended' && audioCtxRef.current.resume) {
        audioCtxRef.current.resume().catch(() => {})
      }
      return
    }
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const c = b.getChannelData(0)
      for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1
      const s = ctx.createBufferSource()
      s.buffer = b
      s.loop = true

      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 2200
      bp.Q.value = 0.7

      const g = ctx.createGain()
      g.gain.value = 0

      s.connect(bp)
      bp.connect(g)
      g.connect(ctx.destination)
      s.start()

      audioCtxRef.current = ctx
      noiseGainRef.current = g
      bpFilterRef.current = bp
    } catch {
      audioCtxRef.current = null
    }
  }

  const rip = (sp: number) => {
    const ctx = audioCtxRef.current
    const g = noiseGainRef.current
    const bp = bpFilterRef.current
    if (!ctx || !g || !bp) return
    try {
      const t = ctx.currentTime
      const on = soundOnRef.current
      g.gain.setTargetAtTime(
        on ? Math.min(0.35, sp * 0.05) * (0.4 + Math.random() * 0.8) : 0,
        t,
        0.015
      )
      bp.frequency.setTargetAtTime(1800 + Math.random() * 1500, t, 0.02)
    } catch {}
  }

  const thump = (v: number) => {
    const ctx = audioCtxRef.current
    if (!ctx || !soundOnRef.current) return
    try {
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const k = ctx.createGain()
      o.frequency.setValueAtTime(150, t)
      o.frequency.exponentialRampToValueAtTime(45, t + 0.15)
      k.gain.setValueAtTime(Math.min(0.5, v / 25), t)
      k.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
      o.connect(k)
      k.connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.2)
    } catch {}
  }

  const gen = () => {
    const d: number[] = []
    let v = 3
    for (let i = 0; i <= N; i++) {
      v += (Math.random() - 0.5) * 3.6
      v = Math.max(0.5, Math.min(7, v))
      d.push(v)
    }
    dRef.current = d
  }

  const dAt = (y: number) => {
    const d = dRef.current
    if (!d.length) return 3
    const idx = Math.min(N, Math.max(0, Math.round(y / ST)))
    return d[idx] ?? 3
  }

  const P = (a: [number, number][]) =>
    'polygon(' + a.map((p) => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')'

  const freeClip = () => {
    const fri = friRef.current
    if (!fri) return
    const a: [number, number][] = []
    for (let y = 0; y <= H; y += ST) a.push([dAt(y), y])
    a.push([200, H], [200, 0])
    fri.style.clipPath = P(a)
  }

  const chads = (x: number, y: number, n: number, p = 1) => {
    for (let i = 0; i < n; i++) {
      chRef.current.push({
        x,
        y,
        vx: (Math.random() * 3 - 0.3) * p,
        vy: -Math.random() * 3 * p,
        r: Math.random() * 6,
        vr: (Math.random() - 0.5) * 0.4,
        s: 2 + Math.random() * 3,
        l: 1,
      })
    }
  }

  const renderTear = () => {
    const f = frontRef.current
    const mn = mnRef.current
    const fib = fibRef.current
    const att = attRef.current
    const fs = fsRef.current
    const fw = fwRef.current
    const perf = perfRef.current
    const grab = grabRef.current

    if (!mn || !fib || !att || !fs || !perf || !fw) return

    const m: [number, number][] = [[0, 0]]
    const fi: [number, number][] = [[0, 0]]
    const fl: [number, number][] = []

    for (let y = 0; y < f; y += ST) {
      const j = dAt(y)
      m.push([PX + j, y])
      fi.push([PX + j + 2.5, y])
      fl.push([j, y])
    }
    if (f > 0) {
      const j = dAt(f)
      m.push([PX + j, f])
      fi.push([PX + j + 2.5, f])
      fl.push([j, f])
    }
    m.push([PX, f], [PX, H], [0, H])
    fi.push([PX, f], [PX, H], [0, H])
    fl.push([200, f], [200, 0])

    mn.style.clipPath = P(m)
    fib.style.clipPath = P(fi)
    fs.style.clipPath = P(fl)
    att.style.clipPath = P([[0, f], [200, f], [200, H], [0, H]])

    perf.style.top = `${f}px`
    perf.style.height = `${Math.max(0, H - f)}px`

    fw.style.display = f > 0 && !freeRef.current ? 'block' : 'none'
    fw.style.transformOrigin = `${PX}px ${f}px`
    fw.style.transform = `rotate(${angRef.current}deg)`
    fw.style.filter = angRef.current > 7 ? 'drop-shadow(0 6px 8px rgba(0,0,0,.45))' : 'none'

    if (grab) {
      if (f > 0) {
        grab.classList.add('used')
      } else {
        grab.classList.remove('used')
      }
    }
  }

  const detach = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    const held = stateRef.current === 'drag'
    stateRef.current = 'free'
    freeRef.current = {
      x: PX + 100,
      y: OY + 150,
      vx: 3,
      vy: -3,
      rot: angRef.current * 0.6,
      vr: (Math.random() - 0.5) * 5,
      held: false,
      lx: PX + 100,
      ly: OY + 150,
      ox: 0,
      oy: 0,
    }
    isTornRef.current = true
    setIsTorn(true)

    if (grabRef.current) {
      grabRef.current.style.opacity = '0'
      grabRef.current.style.pointerEvents = 'none'
      if (!held) {
        grabRef.current.style.display = 'none'
      }
    }
    if (attRef.current) attRef.current.style.display = 'none'
    if (frRef.current) frRef.current.style.display = 'block'

    chads(PX + 8, OY + H, 14, 1.6)
    thump(16)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25)

    if (held && freeRef.current) {
      freeRef.current.held = true
      freeRef.current.ox = freeRef.current.x - psRef.current.x
      freeRef.current.oy = freeRef.current.y - psRef.current.y
      pointerHistoryRef.current = [{ x: psRef.current.x, y: psRef.current.y, t: performance.now() }]
    }
  }

  const startEnd = (f: FreeState) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion:reduce)').matches

    f.end = prefersReducedMotion
      ? 'fade'
      : (['crumple', 'plane'] as const)[(Math.random() * 2) | 0]
    f.k = 0
    f.s = 1
    f.vx = 0
    f.vy = 0
    f.rot = ((f.rot % 360) + 360) % 360
  }

  const triggerAutoDispense = () => {
    if (autoDispenseTimerRef.current) {
      clearTimeout(autoDispenseTimerRef.current)
      autoDispenseTimerRef.current = null
    }

    if (msgRef.current) {
      msgRef.current.textContent = 'Stub flew away! Dispensing new ticket in 2s...'
    }

    autoDispenseTimerRef.current = window.setTimeout(() => {
      autoDispenseTimerRef.current = null
      handleReset()
      if (tRef.current) {
        tRef.current.classList.remove('ticket-dispensed')
        void tRef.current.offsetWidth
        tRef.current.classList.add('ticket-dispensed')
        window.setTimeout(() => {
          tRef.current?.classList.remove('ticket-dispensed')
        }, 500)
      }
    }, 2000)
  }

  const ending = (f: FreeState) => {
    if (f.done) return
    const fr = frRef.current
    const fri = friRef.current
    if (!fr || !fri) return
    const e = f.end
    if (e === 'fade') {
      f.k = (f.k || 0) + 0.03
      fr.style.opacity = `${Math.max(0, 1 - f.k)}`
      if (f.k >= 1) {
        fr.style.display = 'none'
        if (!f.done) {
          f.done = 1
          triggerAutoDispense()
        }
      }
      return
    }
    if ((f.k || 0) < 1) {
      f.k = Math.min(1, (f.k || 0) + 0.035)
      f.s = 1 - (e === 'crumple' ? 0.82 : 0.65) * f.k
      if (f.k >= 0.4 && !f.shaped) {
        f.shaped = 1
        fri.style.clipPath =
          e === 'crumple'
            ? 'circle(100px at 100px 150px)'
            : 'polygon(0% 15%,100% 50%,0% 85%,22% 50%)'
      }
      if (e === 'crumple') {
        f.rot += Math.sin(f.k * 18) * 4
        f.y += (SH - 100 * f.s - f.y) * 0.2
      } else {
        f.y -= f.k * 2
        f.rot += (((-10 - f.rot + 540) % 360) - 180) * 0.12
      }
    } else if (e === 'crumple') {
      f.vx = Math.min(9, f.vx + 0.25)
      f.x += f.vx
      f.rot += f.vx * 3.2
      f.y = SH - 100 * (f.s ?? 1)
    } else {
      f.vx = Math.min(7, f.vx + 0.15)
      f.vy -= 0.03
      f.x += f.vx
      f.y += f.vy
      f.rot +=
        (((Math.atan2(f.vy, f.vx) * 180 / Math.PI - f.rot + 540) % 360) - 180) *
        0.12
    }
    if (f.x > W + 120 || f.x < -120 || f.y < -120) {
      fr.style.display = 'none'
      if (!f.done) {
        f.done = 1
        triggerAutoDispense()
      }
    }
    fr.style.transform = `translate(${f.x - 100}px,${f.y - 150}px) rotate(${f.rot}deg) scale(${f.s ?? 1})`
  }

  const phys = () => {
    const f = freeRef.current
    const fr = frRef.current
    if (!f || !fr) return

    if (f.end) {
      ending(f)
      return
    }

    if (f.held) {
      f.x = psRef.current.x + f.ox
      f.y = psRef.current.y + f.oy
      f.vx = (f.x - f.lx) * 0.6 + f.vx * 0.4
      f.vy = (f.y - f.ly) * 0.6 + f.vy * 0.4
    } else {
      f.vy += 0.72
      f.x += f.vx
      f.y += f.vy
      f.rot += f.vr
      f.vx *= 0.992
      const a = (f.rot * Math.PI) / 180
      const c = Math.abs(Math.cos(a))
      const s = Math.abs(Math.sin(a))
      const hy = 100 * s + 150 * c
      if (f.y + hy > SH) {
        f.y = SH - hy
        if (f.vy > 2) thump(f.vy)
        f.vy *= -0.38
        if (Math.abs(f.vy) < 1.2) f.vy = 0
        f.vx *= 0.84
        f.vr *= 0.6
      }
      if (f.y + hy >= SH - 0.5) {
        const t = 90 + Math.round((f.rot - 90) / 180) * 180
        f.vr += (t - f.rot) * 0.02
        f.vr *= 0.9
        f.vx *= 0.92
      }
    }
    if (!f.held && f.y > SH - 140 && Math.abs(f.vx) < 0.4 && Math.abs(f.vr) < 0.4) {
      f.rest = (f.rest || 0) + 1
      if (f.rest > 50) startEnd(f)
    } else {
      f.rest = 0
    }
    f.lx = f.x
    f.ly = f.y
    fr.style.transform = `translate(${f.x - 100}px,${f.y - 150}px) rotate(${f.rot}deg)`
  }

  const handleReset = () => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    if (autoDispenseTimerRef.current) {
      clearTimeout(autoDispenseTimerRef.current)
      autoDispenseTimerRef.current = null
    }
    frontRef.current = 0
    angRef.current = 5
    angVRef.current = 0
    angTRef.current = 5
    stateRef.current = 'idle'
    freeRef.current = null
    chadYRef.current = 0
    lastFRef.current = 0
    chRef.current = []
    lastPctRef.current = -1

    gen()
    freeClip()

    if (grabRef.current) {
      grabRef.current.style.display = 'block'
      grabRef.current.style.opacity = '1'
      grabRef.current.style.pointerEvents = 'auto'
      grabRef.current.classList.remove('used')
    }
    if (attRef.current) attRef.current.style.display = 'block'
    if (frRef.current) {
      frRef.current.style.display = 'none'
      frRef.current.style.opacity = '1'
      frRef.current.style.transform = ''
    }
    if (noiseGainRef.current) {
      try {
        noiseGainRef.current.gain.value = 0
      } catch {}
    }
    if (msgRef.current) msgRef.current.textContent = 'Tear 0%'

    isTornRef.current = false
    setIsTorn(false)
    renderTear()
  }

  const handlePerfTear = () => {
    if (stateRef.current === 'free' || isTornRef.current) return
    initAudio()
    stateRef.current = 'auto'
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    autoTimerRef.current = window.setTimeout(() => {
      detach()
    }, 550)
  }

  useEffect(() => {
    handleReset()
  }, [flight.flight.iata, flight.flight.number])

  useEffect(() => {
    gen()
    freeClip()

    const fit = () => {
      const box = boxRef.current
      const stage = stageRef.current
      if (!box || !stage) return
      // Desktop-first: cap scale cleanly at 1.0 to eliminate excess padding/stretching,
      // while scaling down smoothly on tablets and mobile screens to prevent breakage or horizontal overflow.
      const maxScale = 1.0
      const S = Math.min(maxScale, (box.clientWidth - 16) / W)
      sRef.current = S
      stage.style.transform = `scale(${S})`
      stage.style.transformOrigin = 'center top'
      box.style.height = `${SH * S}px`
    }

    fit()
    window.addEventListener('resize', fit)

    const canvas = cvRef.current
    if (canvas && typeof canvas.getContext === 'function' && import.meta.env.MODE !== 'test') {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(2, 2)
        cxRef.current = ctx
      }
    }

    runningRef.current = true

    const loop = () => {
      if (!runningRef.current) return

      if (stateRef.current === 'auto') {
        frontRef.current = Math.min(H, frontRef.current + 9)
      }
      const tgt = stateRef.current === 'drag' ? angTRef.current : 5 + (stateRef.current === 'auto' ? 20 : 0)
      angVRef.current += (tgt - angRef.current) * 0.18
      angVRef.current *= 0.7
      angRef.current += angVRef.current

      const sp = Math.abs(frontRef.current - lastFRef.current)
      lastFRef.current = frontRef.current

      while (frontRef.current - chadYRef.current >= 12 && chadYRef.current < H) {
        chadYRef.current += 12
        chads(PX + 8, OY + Math.min(chadYRef.current, H), 1 + ((Math.random() * 2) | 0))
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(6)
      }

      if (frontRef.current >= H && !freeRef.current) {
        detach()
      }

      rip(freeRef.current ? 0 : sp)
      renderTear()
      phys()

      const cx = cxRef.current
      if (cx) {
        cx.clearRect(0, 0, W, SH)
        chRef.current = chRef.current.filter((c) => c.l > 0)
        for (const c of chRef.current) {
          c.vy += 0.25
          c.x += c.vx
          c.y += c.vy
          c.r += c.vr
          c.l -= 0.012
          cx.save()
          cx.translate(c.x, c.y)
          cx.rotate(c.r)
          cx.globalAlpha = Math.max(0, c.l)
          cx.fillStyle = '#cdd5e3'
          cx.fillRect(-c.s / 2, -c.s / 3, c.s, c.s * 0.66)
          cx.restore()
        }
      }

      const pct = freeRef.current
        ? freeRef.current.end
          ? 102
          : 101
        : Math.round((frontRef.current / H) * 100)
      if (pct !== lastPctRef.current) {
        lastPctRef.current = pct
        if (msgRef.current) {
          msgRef.current.textContent = freeRef.current
            ? freeRef.current.end
              ? 'Stub flew away! Dispensing new ticket in 2s...'
              : 'Stub is free. Pick it up and throw it.'
            : `Tear ${pct}%`
        }
      }

      rafIdRef.current = requestAnimationFrame(loop)
    }

    rafIdRef.current = requestAnimationFrame(loop)

    const handleWindowPointerMove = (e: PointerEvent) => {
      const stage = stageRef.current
      if (!stage) return
      const r = stage.getBoundingClientRect()
      const S = sRef.current || 1
      const x = (e.clientX - r.left) / S
      const y = (e.clientY - r.top) / S
      psRef.current = { x, y }
      if (freeRef.current?.held) {
        const now = performance.now()
        pointerHistoryRef.current.push({ x, y, t: now })
        if (pointerHistoryRef.current.length > 14) {
          pointerHistoryRef.current.shift()
        }
      }
    }

    const releaseThrow = () => {
      const f = freeRef.current
      if (f && f.held) {
        f.held = false
        const now = performance.now()
        const history = pointerHistoryRef.current
        let vx = f.vx
        let vy = f.vy

        // Calculate authentic throw velocity from recent pointer samples (50-120ms window)
        if (history.length >= 2) {
          const recent = history.filter((p) => now - p.t < 120)
          if (recent.length >= 2) {
            const oldest = recent[0]
            const newest = recent[recent.length - 1]
            const dt = Math.max(10, newest.t - oldest.t)
            const frameVx = ((newest.x - oldest.x) / dt) * 16.6
            const frameVy = ((newest.y - oldest.y) / dt) * 16.6
            if (Math.hypot(frameVx, frameVy) > Math.hypot(vx, vy)) {
              vx = frameVx
              vy = frameVy
            }
          }
        }

        const c = (v: number) => Math.max(-55, Math.min(55, v))
        f.vx = c(vx)
        f.vy = c(vy)
        f.vr = f.vx * 0.35
        pointerHistoryRef.current = []
      }
    }

    releaseThrowRef.current = releaseThrow

    const handleWindowPointerUp = () => {
      releaseThrow()
    }

    window.addEventListener('pointermove', handleWindowPointerMove)
    window.addEventListener('pointerup', handleWindowPointerUp)
    window.addEventListener('pointercancel', handleWindowPointerUp)

    return () => {
      runningRef.current = false
      cancelAnimationFrame(rafIdRef.current)
      window.removeEventListener('resize', fit)
      window.removeEventListener('pointermove', handleWindowPointerMove)
      window.removeEventListener('pointerup', handleWindowPointerUp)
      window.removeEventListener('pointercancel', handleWindowPointerUp)
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
      if (autoDispenseTimerRef.current) clearTimeout(autoDispenseTimerRef.current)
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
    }
  }, [])

  const handleGrabPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (freeRef.current) return
    e.preventDefault()
    initAudio()
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {}
    }
    st0Ref.current = { x: e.clientX, y: e.clientY, f: frontRef.current }
    stateRef.current = 'drag'
    angTRef.current = 6
  }

  const handleGrabPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stateRef.current !== 'drag' || freeRef.current || !st0Ref.current) return
    const S = sRef.current || 1
    const dy = (e.clientY - st0Ref.current.y) / S
    const dx = (e.clientX - st0Ref.current.x) / S
    frontRef.current = Math.max(frontRef.current, Math.min(H, st0Ref.current.f + dy))
    angTRef.current = 6 + Math.min(Math.max(dx, 0), 220) * 0.2 + frontRef.current * 0.03
    const stage = stageRef.current
    if (stage) {
      const r = stage.getBoundingClientRect()
      const px = (e.clientX - r.left) / S
      const py = (e.clientY - r.top) / S
      psRef.current = { x: px, y: py }
      const now = performance.now()
      pointerHistoryRef.current.push({ x: px, y: py, t: now })
      if (pointerHistoryRef.current.length > 14) {
        pointerHistoryRef.current.shift()
      }
    }
  }

  const handleGrabPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
    if (stateRef.current === 'drag') {
      stateRef.current = frontRef.current >= H * 0.7 ? 'auto' : 'idle'
    }
    if (freeRef.current?.held) {
      releaseThrowRef.current()
    }
    if (grabRef.current && isTornRef.current) {
      grabRef.current.style.display = 'none'
    }
  }

  const handleFrPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!freeRef.current || freeRef.current.end) return
    initAudio()
    e.preventDefault()
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {}
    }
    const stage = stageRef.current
    if (!stage) return
    const r = stage.getBoundingClientRect()
    const S = sRef.current || 1
    const x = (e.clientX - r.left) / S
    const y = (e.clientY - r.top) / S
    psRef.current = { x, y }
    const f = freeRef.current
    f.held = true
    f.ox = f.x - x
    f.oy = f.y - y
    f.vx = 0
    f.vy = 0
    f.vr = 0
    f.rest = 0
    pointerHistoryRef.current = [{ x, y, t: performance.now() }]
  }

  const handleFrPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (typeof e.currentTarget.releasePointerCapture === 'function') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
    }
    releaseThrowRef.current()
  }

  const departure = flight.route.departure
  const arrival = flight.route.arrival
  const originCity = departure.airport
    ? departure.airport.replace(/\s*(International|Airport|Airfield|Regional|Domestic).*/i, '').trim()
    : departure.iata || 'ORIGIN'
  const destCity = arrival.airport
    ? arrival.airport.replace(/\s*(International|Airport|Airfield|Regional|Domestic).*/i, '').trim()
    : arrival.iata || 'DESTINATION'
  const flightCode = flight.flight.iata || flight.flight.number || '---'
  const operatorName = flight.airline.name || 'Commercial Airline'
  const ticketDate = formatTicketDate(flight.flight.date || flight.departure.scheduled)
  const boardingTime = formatTicketTime(flight.departure.scheduled)
  const arrivalDate = formatTicketDate(flight.arrival.scheduled || flight.flight.date)
  const arrivalTime = formatTicketTime(flight.arrival.scheduled)
  const gate = departure.gate || '---'
  const terminal = departure.terminal ? `T${departure.terminal}` : '---'
  const aircraftInfo = [flight.aircraft?.iata, flight.aircraft?.registration].filter(Boolean).join(' · ') || 'SCHEDULED'

  const renderStub = (isDetached = false) => (
    <div className="sp">
      {isDetached && isTorn && <span className="sr-only">DETACHED STUB</span>}
      <div className="r1">
        <b>{departure.iata || originCity.slice(0, 3).toUpperCase()}</b>
        <i>✈</i>
        <b>{arrival.iata || destCity.slice(0, 3).toUpperCase()}</b>
      </div>
      <div className="gr">
        <div>
          <u>CARRIER</u>
          <p>{operatorName}</p>
        </div>
        <div>
          <u>DATE</u>
          <p>{ticketDate}</p>
        </div>
        <div>
          <u>FLIGHT</u>
          <p>{flightCode}</p>
        </div>
        <div>
          <u>BOARDING</u>
          <p>{boardingTime}</p>
        </div>
        <div>
          <u>GATE</u>
          <p className="a">{gate}</p>
        </div>
        <div>
          <u>TERMINAL</u>
          <p>{terminal}</p>
        </div>
      </div>
      <div className="bc"></div>
      <em>*{flightCode}*</em>
    </div>
  )

  return (
    <section className="route-section geodesic-route-card" aria-labelledby="route-heading">
      <div className="section-heading route-section-heading">
        <h3 id="route-heading" className="route-card-title">The Route</h3>
        <span className="route-mobile-corridor" aria-hidden="true">
          {departure.iata || originCity.slice(0, 3).toUpperCase()} → {arrival.iata || destCity.slice(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Dedicated Native Mobile Boarding Pass (Apple Wallet / Noir Ticket style) */}
      <div className="mobile-boarding-pass">
        <div className="mobile-pass-header">
          <div className="mobile-pass-airline">
            <span className="mobile-pass-logo-badge">
              {(departure.iata || originCity.slice(0, 2)).slice(0, 2).toUpperCase()}
            </span>
            <div className="mobile-pass-airline-text">
              <span className="mobile-pass-operator">{operatorName}</span>
              <span className="mobile-pass-flight-code">{flightCode}</span>
            </div>
          </div>
          <div className="mobile-pass-status-pill">
            {flight.flight.status?.replace('_', ' ').toUpperCase() || 'SCHEDULED'}
          </div>
        </div>

        <div className="mobile-pass-body">
          <div className="mobile-pass-route">
            <div className="mobile-pass-endpoint">
              <span className="mobile-pass-iata">{departure.iata || originCity.slice(0, 3).toUpperCase()}</span>
              <span className="mobile-pass-city">{originCity}</span>
              <span className="mobile-pass-time">{boardingTime}</span>
              <span className="mobile-pass-date">{ticketDate}</span>
            </div>

            <div className="mobile-pass-corridor-flow" aria-hidden="true">
              <span className="mobile-pass-plane-icon">✈</span>
              <div className="mobile-pass-line" />
              <span className="mobile-pass-nonstop-pill">DIRECT</span>
            </div>

            <div className="mobile-pass-endpoint end-right">
              <span className="mobile-pass-iata">{arrival.iata || destCity.slice(0, 3).toUpperCase()}</span>
              <span className="mobile-pass-city">{destCity}</span>
              <span className="mobile-pass-time">{arrivalTime}</span>
              <span className="mobile-pass-date">{arrivalDate}</span>
            </div>
          </div>

          <div className="mobile-pass-grid">
            <div className="mobile-pass-cell">
              <span className="mobile-pass-label">GATE</span>
              <span className="mobile-pass-val accent">{gate}</span>
            </div>
            <div className="mobile-pass-cell">
              <span className="mobile-pass-label">TERMINAL</span>
              <span className="mobile-pass-val">{terminal}</span>
            </div>
            <div className="mobile-pass-cell">
              <span className="mobile-pass-label">BOARDING</span>
              <span className="mobile-pass-val">{boardingTime}</span>
            </div>
            <div className="mobile-pass-cell">
              <span className="mobile-pass-label">AIRCRAFT</span>
              <span className="mobile-pass-val">{aircraftInfo}</span>
            </div>
          </div>
        </div>

      </div>

      <div id="box" ref={boxRef} className="boarding-pass-box">
        <div id="stage" ref={stageRef}>
          <div className="t" id="t" ref={tRef} style={{ top: OY }}>
            <div className="fib" id="fib" ref={fibRef} />
            <div className="m" id="mn" ref={mnRef}>
              <div className="st" />
              <div className="bcv" />
              <div className="lhr">{departure.iata || originCity.slice(0, 3).toUpperCase()}</div>
              <div className="nm" style={{ left: 76, top: 106 }}>
                {originCity.toUpperCase()}
              </div>
              <div className="dt" style={{ left: 76, top: 130 }}>
                {ticketDate} <span>{boardingTime}</span>
              </div>
              <div className="rt">
                <span />
                <i style={{ fontStyle: 'normal' }}>✈</i>
                <span />
              </div>
              <div className="gig">{arrival.iata || destCity.slice(0, 3).toUpperCase()}</div>
              <div className="nm" style={{ right: 40, top: 106, textAlign: 'right' }}>
                {destCity.toUpperCase()}
              </div>
              <div className="dt" style={{ right: 40, top: 130, textAlign: 'right' }}>
                {arrivalDate} <span>{arrivalTime}</span>
              </div>
              <div className="f" style={{ left: 76, top: 164 }}>
                <u>PASSENGER / CARRIER</u>
                <p>{operatorName}</p>
              </div>
              <div className="f" style={{ left: 300, top: 164 }}>
                <u>FLIGHT</u>
                <p className="a">{flightCode}</p>
              </div>
              <div className="hr" />
              <div className="f" style={{ left: 76, top: 216 }}>
                <u>AIRCRAFT</u>
                <p>{aircraftInfo}</p>
              </div>
              <div className="f" style={{ left: 216, top: 216 }}>
                <u>GATE</u>
                <p className="a big">{gate}</p>
              </div>
              <div className="f" style={{ left: 300, top: 216 }}>
                <u>TERMINAL</u>
                <p className="big">{terminal}</p>
              </div>
              <div className="ft">BOARDING CLOSES 15 MINUTES BEFORE SCHEDULED DEPARTURE</div>
            </div>

            <div id="perf" ref={perfRef}>
              <button
                type="button"
                className="perf-accessible-btn"
                onClick={isTorn ? handleReset : handlePerfTear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    if (isTorn) {
                      handleReset()
                    } else {
                      handlePerfTear()
                    }
                  }
                }}
                aria-label={isTorn ? 'Reattach ticket stub' : 'Tear ticket stub'}
                aria-pressed={isTorn}
              >
                {isTorn ? 'REATTACH' : 'TEAR'}
              </button>
            </div>

            <div className="s" id="att" ref={attRef}>
              {renderStub(false)}
            </div>

            <div id="fw" ref={fwRef}>
              <div className="s" id="fs" ref={fsRef}>
                {renderStub(false)}
              </div>
            </div>

            <div
              className="g"
              id="grab"
              ref={grabRef}
              onPointerDown={handleGrabPointerDown}
              onPointerMove={handleGrabPointerMove}
              onPointerUp={handleGrabPointerUp}
              onPointerCancel={handleGrabPointerUp}
            >
              <span className="pill">grab &amp; pull down</span>
            </div>

            <i className="nt" style={{ top: -12 }} />
            <i className="nt" style={{ top: 288 }} />
          </div>

          <div
            id="fr"
            ref={frRef}
            onPointerDown={handleFrPointerDown}
            onPointerUp={handleFrPointerUp}
            onPointerCancel={handleFrPointerUp}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <div className="s" id="fri" ref={friRef}>
              {renderStub(true)}
            </div>
          </div>

          <canvas id="cv" ref={cvRef} width="1600" height="940" />
        </div>
      </div>

      {/* Visually hidden screen-reader announcement for auto-dispense countdown & tests */}
      <span id="msg" ref={msgRef} className="sr-only" aria-live="polite">
        Tear 0%
      </span>
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

function getFlightLevel(altitudeMeters: number | null | undefined): { fl: string; feet: string } | null {
  if (typeof altitudeMeters !== 'number' || !Number.isFinite(altitudeMeters)) return null
  const feet = Math.round(altitudeMeters * 3.28084)
  const fl = Math.round(feet / 100)
  return { fl: `FL${fl}`, feet: `${feet.toLocaleString()} ft` }
}

function getAirspeedDetails(speedKmh: number | null | undefined): { knots: string; mach: string } | null {
  if (typeof speedKmh !== 'number' || !Number.isFinite(speedKmh)) return null
  const knots = `${Math.round(speedKmh * 0.539957)} kts`
  const mach = (speedKmh / 1060).toFixed(2)
  return { knots, mach: `~${mach} Mach` }
}

function getCardinalDirection(deg: number | null | undefined): string {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return ''
  const normalized = ((deg % 360) + 360) % 360
  const cardinals = [
    'N · North',
    'NNE · North-Northeast',
    'NE · Northeast',
    'ENE · East-Northeast',
    'E · East',
    'ESE · East-Southeast',
    'SE · Southeast',
    'SSE · South-Southeast',
    'S · South',
    'SSW · South-Southwest',
    'SW · Southwest',
    'WSW · West-Southwest',
    'W · West',
    'WNW · West-Northwest',
    'NW · Northwest',
    'NNW · North-Northwest',
  ]
  const index = Math.round(normalized / 22.5) % 16
  return cardinals[index]
}

function getVerticalStatus(speed: number | null | undefined): { label: string; sub: string; arrow: string } {
  if (typeof speed !== 'number' || !Number.isFinite(speed)) {
    return { label: 'Not available', sub: 'Vertical rate', arrow: '—' }
  }
  if (Math.abs(speed) < 0.5) {
    return { label: 'Level flight', sub: 'Stable cruise corridor', arrow: '→' }
  }
  if (speed > 0) {
    return { label: `Climbing (+${Math.round(speed)} m/s)`, sub: 'Ascending altitude', arrow: '↗' }
  }
  return { label: `Descending (${Math.round(speed)} m/s)`, sub: 'Descent / Approach', arrow: '↘' }
}

function getCoordinatesLabel(lat: number | null | undefined, lon: number | null | undefined): string {
  if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return ''
  }
  const latDir = lat >= 0 ? 'N' : 'S'
  const lonDir = lon >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`
}

function LiveFlightInfo({ flight }: FlightDetailsProps) {
  const live = flight.live
  if (!live) return null

  const flightLevelInfo = getFlightLevel(live.altitudeMeters)
  const speedInfo = getAirspeedDetails(live.speedKmh)
  const cardinalText = getCardinalDirection(live.direction)
  const verticalStatus = getVerticalStatus(live.speedVertical)
  const coordsFormatted = getCoordinatesLabel(live.latitude, live.longitude)

  const altitudePercent = typeof live.altitudeMeters === 'number' && Number.isFinite(live.altitudeMeters)
    ? Math.min(100, Math.max(4, Math.round((live.altitudeMeters / 12500) * 100)))
    : 0

  const hasHeading = typeof live.direction === 'number' && Number.isFinite(live.direction)
  const headingDeg = hasHeading ? live.direction! : 0

  // Calculate radar blip coordinates on 120x120 scope
  const rad = ((headingDeg - 90) * Math.PI) / 180
  const blipRadius = 38
  const blipX = Math.round(60 + blipRadius * Math.cos(rad))
  const blipY = Math.round(60 + blipRadius * Math.sin(rad))

  return (
    <section className="detail-section live-section" aria-labelledby="live-heading">
      <div className="live-heading-row">
        <div className="live-heading-meta">
          <div>
            <p className="section-kicker">LIVE POSITION</p>
            <h3 id="live-heading">{live.isGround ? 'On the ground' : 'In the air'}</h3>
          </div>
          <span className="live-phase-pill">
            {live.isGround
              ? 'Surface Movement · On Ground'
              : flightLevelInfo
                ? `Cruising at ${flightLevelInfo.fl} · Stable Vector`
                : 'Active Airspace Telemetry'}
          </span>
        </div>
        <div className="live-header-badges">
          <span className="live-indicator">
            <i aria-hidden="true" /> LIVE
          </span>
        </div>
      </div>

      {/* Primary Avionics Instruments HUD */}
      <div className="live-instruments-hud" aria-label="Flight telemetry instruments">
        {/* 1. Compass Rose & Directional Vector */}
        <div className="hud-instrument hud-compass-pod">
          <div className="hud-pod-header">
            <span className="hud-pod-title">HEADING VECTOR</span>
            <span className="hud-pod-badge">{hasHeading ? `${Math.round(headingDeg)}°` : '—'}</span>
          </div>
          <div className="hud-compass-stage">
            <svg className="hud-compass-svg" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" className="compass-rim" />
              <circle cx="60" cy="60" r="44" className="compass-inner-ring" />
              <text x="60" y="20" className="compass-cardinal cardinal-n" textAnchor="middle">N</text>
              <text x="104" y="64" className="compass-cardinal" textAnchor="middle">E</text>
              <text x="60" y="108" className="compass-cardinal" textAnchor="middle">S</text>
              <text x="16" y="64" className="compass-cardinal" textAnchor="middle">W</text>
              <line x1="60" y1="8" x2="60" y2="13" className="compass-tick major" />
              <line x1="60" y1="107" x2="60" y2="112" className="compass-tick major" />
              <line x1="8" y1="60" x2="13" y2="60" className="compass-tick major" />
              <line x1="107" y1="60" x2="112" y2="60" className="compass-tick major" />
              <g
                className="compass-needle"
                style={{
                  transform: `rotate(${headingDeg}deg)`,
                  transformOrigin: '60px 60px',
                  transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <line x1="60" y1="60" x2="60" y2="16" className="compass-track-line" />
                <polygon points="60,14 56,22 64,22" className="compass-heading-bug" />
                <path
                  d="M60 38 L63 50 L78 58 L78 62 L63 59 L63 74 L68 78 L68 81 L60 79 L52 81 L52 78 L57 74 L57 59 L42 62 L42 58 L57 50 Z"
                  className="compass-aircraft"
                />
              </g>
            </svg>
            <div className="hud-compass-readout">
              <div className="hud-readout-value">
                {hasHeading ? `${Math.round(headingDeg)}°` : '---'}
              </div>
              <div className="hud-readout-desc">{cardinalText || 'Track Course'}</div>
            </div>
          </div>
        </div>

        {/* 2. Altitude Profile & Airspeed Tape */}
        <div className="hud-instrument hud-profile-pod">
          <div className="hud-pod-header">
            <span className="hud-pod-title">FLIGHT PROFILE</span>
            {flightLevelInfo && <span className="hud-flight-level-badge">{flightLevelInfo.fl}</span>}
          </div>
          <div className="hud-profile-stage">
            <div className="hud-altitude-tape">
              <div className="tape-header">
                <span className="tape-label">CRUISE ALTITUDE</span>
                <span className="tape-value">
                  {typeof live.altitudeMeters === 'number' && Number.isFinite(live.altitudeMeters)
                    ? `${Math.round(live.altitudeMeters).toLocaleString()} m`
                    : '---'}
                  {flightLevelInfo && <span className="tape-subval">({flightLevelInfo.feet})</span>}
                </span>
              </div>
              <div className="tape-bar-track" aria-hidden="true">
                <div
                  className="tape-bar-fill"
                  style={{ width: `${altitudePercent}%` }}
                />
                <div className="tape-corridor-marker" style={{ left: '72%', width: '28%' }} title="Standard Cruising Corridor" />
              </div>
              <div className="tape-scale-ticks">
                <span>0 m</span>
                <span>3,000</span>
                <span>6,000</span>
                <span>9,000</span>
                <span className="corridor-tick">12,000m+ (Cruise)</span>
              </div>
            </div>

            <div className="hud-profile-metrics-split">
              <div className="hud-split-item">
                <span className="split-label">GROUND SPEED</span>
                <span className="split-value">
                  {typeof live.speedKmh === 'number' && Number.isFinite(live.speedKmh)
                    ? `${Math.round(live.speedKmh).toLocaleString()} km/h`
                    : '---'}
                </span>
                {speedInfo && <span className="split-sub">{speedInfo.knots} · {speedInfo.mach}</span>}
              </div>
              <div className="hud-split-item">
                <span className="split-label">VERTICAL RATE</span>
                <span className={`split-value split-vrate ${verticalStatus.arrow !== '—' ? 'vrate-active' : ''}`}>
                  <span className="vrate-arrow">{verticalStatus.arrow}</span>{' '}
                  {typeof live.speedVertical === 'number' && Number.isFinite(live.speedVertical)
                    ? `${live.speedVertical} m/s`
                    : '---'}
                </span>
                <span className="split-sub">{verticalStatus.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Tactical Airspace Radar Scope */}
        <div className="hud-instrument hud-radar-pod">
          <div className="hud-pod-header">
            <span className="hud-pod-title">TACTICAL RADAR</span>
            <span className="hud-radar-lock-pill">
              <span className="radar-status-dot" />
              ADS-B LOCKED
            </span>
          </div>
          <div className="hud-radar-stage">
            <svg className="hud-radar-svg" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <radialGradient id="radarSweepGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.4)" />
                  <stop offset="60%" stopColor="rgba(56, 189, 248, 0.08)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
              <circle cx="60" cy="60" r="54" className="radar-ring" />
              <circle cx="60" cy="60" r="36" className="radar-ring dashed" />
              <circle cx="60" cy="60" r="18" className="radar-ring dashed" />
              <line x1="60" y1="6" x2="60" y2="114" className="radar-crosshair" />
              <line x1="6" y1="60" x2="114" y2="60" className="radar-crosshair" />
              <text x="63" y="27" className="radar-range-text">100NM</text>
              <text x="63" y="45" className="radar-range-text">50NM</text>
              <g className="radar-sweep-arm">
                <line x1="60" y1="60" x2="60" y2="6" className="radar-sweep-line" />
                <path d="M60 60 L60 6 A54 54 0 0 1 106 28 Z" fill="url(#radarSweepGrad)" opacity="0.6" />
              </g>
              <g transform={`translate(${blipX}, ${blipY})`}>
                <circle cx="0" cy="0" r="8" className="radar-blip-pulse" />
                <circle cx="0" cy="0" r="3.5" className="radar-blip-core" />
              </g>
            </svg>
            <div className="hud-radar-readout">
              <div className="hud-coords-value">
                {coordsFormatted || (typeof live.latitude === 'number' && typeof live.longitude === 'number' ? `${live.latitude.toFixed(2)}, ${live.longitude.toFixed(2)}` : 'Position locked')}
              </div>
              <div className="hud-coords-sub">Transponder WGS-84 Fix</div>
            </div>
          </div>
        </div>
      </div>

      {/* Telemetry Metric Detail Cards */}
      <dl className="compact-details live-details">
        <div className="spec-item">
          <dt>Altitude</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.altitudeMeters, (value) => `${Math.round(value).toLocaleString()} m`)}
          </dd>
          {flightLevelInfo && <span className="spec-sub">{flightLevelInfo.fl} · {flightLevelInfo.feet}</span>}
        </div>
        <div className="spec-item">
          <dt>Ground speed</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.speedKmh, (value) => `${Math.round(value).toLocaleString()} km/h`)}
          </dd>
          {speedInfo && <span className="spec-sub">{speedInfo.knots} · {speedInfo.mach}</span>}
        </div>
        <div className="spec-item">
          <dt>Vertical speed</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.speedVertical, (value) => value.toLocaleString())}
          </dd>
          <span className="spec-sub">{verticalStatus.label}</span>
        </div>
        <div className="spec-item">
          <dt>Heading</dt>
          <dd className="mono-value">
            {formatLiveNumber(live.direction, (value) => `${Math.round(value)}\u00b0`)}
          </dd>
          {cardinalText && <span className="spec-sub">{cardinalText}</span>}
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
          {coordsFormatted && <span className="spec-sub">{coordsFormatted}</span>}
        </div>
        <div className="spec-item">
          <dt>Updated</dt>
          <dd className="mono-value">{formatDateTime(live.updated)}</dd>
          <span className="spec-sub">Live ADS-B Telemetry</span>
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
          <span className="spec-sub">{live.isGround ? 'Surface Movement' : 'Active Transponder'}</span>
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