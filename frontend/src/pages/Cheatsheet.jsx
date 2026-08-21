import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { fmt1, ratingColor, teamColor } from '../utils/formatters'

const TOP_LIMIT = 10
const MIN_MINUTES = 28
const MIN_L10 = 60
const MIN_DVP = 1

function playerKey(name) {
  return String(name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

function initials(name) {
  return String(name || '?').split(' ').map(word => word[0]).join('').slice(0, 2)
}

function numberOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function factorStatus(passes) {
  return passes ? { color: '#22c55e', mark: 'Pass' } : { color: '#ef4444', mark: 'Miss' }
}

function Metric({ label, value, passes, accent }) {
  const status = factorStatus(passes)
  return (
    <div style={{ minWidth: 68 }}>
      <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, letterSpacing: '0.7px', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ color: accent || status.color, fontSize: 15, fontWeight: 800, marginTop: 3 }}>
        {value}
      </div>
    </div>
  )
}

function Rule({ children }) {
  return (
    <span style={{ border: '1px solid #1d402a', borderRadius: 5, background: '#22c55e12', color: '#86efac', fontSize: 11, fontWeight: 700, padding: '4px 7px' }}>
      {children}
    </span>
  )
}

export default function Cheatsheet() {
  const edgeRequest = useApi('/api/edge')
  const projectionRequest = useApi('/api/projections/v2?lineType=standard')
  const loading = edgeRequest.loading || projectionRequest.loading
  const error = edgeRequest.error || projectionRequest.error

  const ranked = useMemo(() => {
    if (!edgeRequest.data || !projectionRequest.data) return []

    const projectionsByPlayer = new Map(
      projectionRequest.data.map(player => [playerKey(player.name), player])
    )

    return edgeRequest.data
      .map(prop => {
        const projection = projectionsByPlayer.get(playerKey(prop.name))
        return {
          ...prop,
          dvpFactor: numberOrNull(projection?.dvpFactor),
          dvpOpponent: projection?.dvpOpponent || prop.opponent,
          image: projection?.image || null,
        }
      })
      .filter(prop => {
        const rating = numberOrNull(prop.rating)
        const line = numberOrNull(prop.line)
        const projection = numberOrNull(prop.projection)
        const minutes = numberOrNull(prop.avgMins)
        const l10 = numberOrNull(prop.l10)
        return prop.value === 'OVER'
          && rating != null
          && line != null
          && projection != null
          && minutes >= MIN_MINUTES
          && l10 >= MIN_L10
          && prop.dvpFactor >= MIN_DVP
      })
      .sort((a, b) => (
        numberOrNull(b.rating) - numberOrNull(a.rating)
        || numberOrNull(b.l10) - numberOrNull(a.l10)
        || numberOrNull(b.avgMins) - numberOrNull(a.avgMins)
        || numberOrNull(b.dvpFactor) - numberOrNull(a.dvpFactor)
        || String(a.name).localeCompare(String(b.name))
      ))
  }, [edgeRequest.data, projectionRequest.data])

  const topProps = ranked.slice(0, TOP_LIMIT)
  const slateDate = topProps[0]?.gameDate || ranked[0]?.gameDate

  return (
    <div style={{ paddingBottom: 44 }}>
      <header style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <p style={{ color: '#FF6900', fontSize: 11, fontWeight: 800, letterSpacing: '1px', margin: '0 0 6px', textTransform: 'uppercase' }}>
            Personal slate board
          </p>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, margin: 0 }}>Top 10 Cheatsheet</h1>
          <p style={{ color: '#6b7280', fontSize: 12, margin: '7px 0 0' }}>
            Standard PrizePicks OVERs only{slateDate ? ` · ${slateDate}` : ''}
          </p>
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'right' }}>
          <strong style={{ color: '#fff', fontSize: 24 }}>{ranked.length}</strong> qualifying props
          <div style={{ marginTop: 3 }}>Ranked by model rating</div>
        </div>
      </header>

      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 7, padding: '12px 14px', border: '1px solid #1f1f1f', borderRadius: 8, background: '#0d0d0d', marginBottom: 18 }}>
        <Rule>OVER only</Rule>
        <Rule>MIN {MIN_MINUTES}+</Rule>
        <Rule>L10 {MIN_L10}%+</Rule>
        <Rule>DVP {MIN_DVP.toFixed(2)}x+</Rule>
        <span style={{ color: '#4b5563', fontSize: 11, alignSelf: 'center', marginLeft: 3 }}>Rating resolves the final order.</span>
      </section>

      {loading && <div style={stateStyle}>Building the slate cheatsheet...</div>}
      {error && <div style={{ ...stateStyle, color: '#fca5a5' }}>Could not load cheatsheet data: {error}</div>}
      {!loading && !error && ranked.length === 0 && (
        <div style={stateStyle}>No current props meet every fixed qualification rule.</div>
      )}
      {!loading && !error && ranked.length > 0 && (
        <>
          {ranked.length < TOP_LIMIT && (
            <div style={{ borderLeft: '3px solid #f59e0b', background: '#f59e0b10', color: '#fcd34d', fontSize: 12, padding: '10px 12px', marginBottom: 12 }}>
              Thin slate: only {ranked.length} props qualify. The board will not fill remaining slots with props that miss a rule.
            </div>
          )}
          <div style={{ display: 'grid', gap: 10 }}>
            {topProps.map((prop, index) => {
              const rating = numberOrNull(prop.rating)
              const minutes = numberOrNull(prop.avgMins)
              const l10 = numberOrNull(prop.l10)
              const dvp = numberOrNull(prop.dvpFactor)
              const color = teamColor(prop.team)
              return (
                <article className="cheatsheet-prop" key={`${prop.name}-${prop.stat}-${prop.line}`} style={{ display: 'grid', alignItems: 'center', gap: 16, border: '1px solid #222', borderRadius: 8, background: '#0d0d0d', boxShadow: 'inset 3px 0 0 #22c55e', padding: '14px 16px' }}>
                  <div style={{ color: '#4b5563', fontSize: 18, fontWeight: 900 }}>#{index + 1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {prop.image ? (
                      <img
                        src={prop.image}
                        alt={prop.name}
                        loading="lazy"
                        style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', background: '#12231f', border: `1px solid ${color}55` }}
                      />
                    ) : (
                      <div style={{ width: 42, height: 42, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#12231f', border: `1px solid ${color}55`, color, fontSize: 13, fontWeight: 800 }}>
                        {initials(prop.name)}
                      </div>
                    )}
                    <div>
                      <Link to={`/players/${encodeURIComponent(prop.name)}`} style={{ color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none' }}>
                        {prop.name}
                      </Link>
                      <div style={{ color: '#6b7280', fontSize: 11, marginTop: 4 }}>
                        <span style={{ color, fontWeight: 800 }}>{prop.team}</span> vs {prop.dvpOpponent || prop.opponent || '—'} · {prop.position || '—'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#86efac', fontSize: 11, fontWeight: 800, letterSpacing: '0.7px' }}>OVER · {prop.stat}</div>
                    <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, marginTop: 4 }}>{fmt1(prop.line)}</div>
                    <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Proj {fmt1(prop.projection)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                    <Metric label="Rating" value={fmt1(rating)} passes accent={ratingColor(rating)} />
                    <Metric label="Avg MIN" value={fmt1(minutes)} passes={minutes >= MIN_MINUTES} />
                    <Metric label="L10" value={`${Math.round(l10)}%`} passes={l10 >= MIN_L10} />
                    <Metric label="DVP" value={`${fmt1(dvp)}x`} passes={dvp >= MIN_DVP} />
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 11, textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {prop.spread == null ? 'Spread —' : `Spread ${Number(prop.spread) > 0 ? '+' : ''}${fmt1(prop.spread)}`}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const stateStyle = {
  border: '1px solid #222',
  borderRadius: 8,
  color: '#9ca3af',
  fontSize: 13,
  padding: 34,
  textAlign: 'center',
}