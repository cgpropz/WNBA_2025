import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { fmt1 } from '../utils/formatters'

// ── Color helpers ─────────────────────────────────────────────────────────────
function ratingColor(r) {
  if (r == null) return '#4b5563'
  const from30 = [239, 68, 68], mid50 = [229, 229, 229], to70 = [34, 197, 94]
  const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
  const [from, to, t] = r <= 50
    ? [from30, mid50, (r - 30) / 20]
    : [mid50, to70, (r - 50) / 20]
  return `rgb(${lerp(from[0], to[0], t)},${lerp(from[1], to[1], t)},${lerp(from[2], to[2], t)})`
}

function spreadColor(spread) {
  if (spread == null) return '#4b5563'
  // |3|=green, |5|=neutral, |7|=red — based on absolute value
  const abs = Math.abs(spread)
  const to3 = [34, 197, 94], mid5 = [229, 229, 229], from7 = [239, 68, 68]
  const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
  const [f, t_, pct] = abs <= 5 ? [to3, mid5, (abs - 3) / 2] : [mid5, from7, (abs - 5) / 2]
  return `rgb(${lerp(f[0], t_[0], pct)},${lerp(f[1], t_[1], pct)},${lerp(f[2], t_[2], pct)})`
}

function minsColor(mins) {
  if (mins == null) return '#4b5563'
  const from20 = [239, 68, 68], mid25 = [229, 229, 229], to30 = [34, 197, 94]
  const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
  const [f, t_, pct] = mins <= 25 ? [from20, mid25, (mins - 20) / 5] : [mid25, to30, (mins - 25) / 5]
  return `rgb(${lerp(f[0], t_[0], pct)},${lerp(f[1], t_[1], pct)},${lerp(f[2], t_[2], pct)})`
}

function hitRateColor(pct) {
  if (pct == null) return '#4b5563'
  // 0%=red, 50%=neutral, 100%=green
  const from = [239, 68, 68], mid = [180, 180, 180], to = [34, 197, 94]
  const lerp = (a, b, t) => Math.round(a + (b - a) * Math.max(0, Math.min(1, t)))
  const [f, t_, pct_] = pct <= 50 ? [from, mid, pct / 50] : [mid, to, (pct - 50) / 50]
  return `rgb(${lerp(f[0], t_[0], pct_)},${lerp(f[1], t_[1], pct_)},${lerp(f[2], t_[2], pct_)})`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function HitCell({ value }) {
  if (value == null) return <td style={TD}>—</td>
  const color = hitRateColor(value)
  return (
    <td style={{ ...TD, color, fontWeight: 700 }}>
      {value.toFixed(0)}%
    </td>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ color: '#333', marginLeft: 3 }}>⇅</span>
  return <span style={{ color: '#FF6900', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
}

const TD = { padding: '9px 10px', borderBottom: '1px solid #161616', whiteSpace: 'nowrap', fontSize: 12 }
const TH_BASE = {
  padding: '10px 10px', fontSize: 11, fontWeight: 700, color: '#6b7280',
  textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '2px solid #1f1f1f',
  background: '#0d0d0d', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, zIndex: 2,
}

const STAT_LABELS = ['All', 'Points', 'Rebounds', 'Assists', '3-PT Made', 'Steals', 'Blocks']
const POSITIONS   = ['All', 'Guard', 'Forward', 'Center']

export default function Edge() {
  const navigate = useNavigate()
  const { data, loading, error } = useApi('/api/edge')

  const [search,   setSearch]   = useState('')
  const [posFilt,  setPosFilt]  = useState('All')
  const [statFilt, setStatFilt] = useState('All')
  const [teamFilt, setTeamFilt] = useState('All')
  const [valueFilt,setValueFilt]= useState('All')   // All | OVER | UNDER
  const [sortCol,  setSortCol]  = useState('rating')
  const [sortDir,  setSortDir]  = useState('desc')

  const teams = useMemo(() => {
    if (!data) return []
    return ['All', ...Array.from(new Set(data.map(r => r.team).filter(Boolean))).sort()]
  }, [data])

  function toggleSort(col) {
    setSortCol(prev => {
      if (prev === col) { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); return col }
      setSortDir('desc'); return col
    })
  }

  const filtered = useMemo(() => {
    if (!data) return []
    return data
      .filter(r => {
        if (posFilt  !== 'All' && r.position !== posFilt)       return false
        if (statFilt !== 'All' && r.stat     !== statFilt)      return false
        if (teamFilt !== 'All' && r.team     !== teamFilt)      return false
        if (valueFilt!== 'All' && r.value    !== valueFilt)     return false
        if (search.trim()) {
          const q = search.trim().toLowerCase()
          if (!r.name.toLowerCase().includes(q)) return false
        }
        return true
      })
      .sort((a, b) => {
        const av = a[sortCol] ?? -Infinity
        const bv = b[sortCol] ?? -Infinity
        return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1)
      })
  }, [data, posFilt, statFilt, teamFilt, valueFilt, search, sortCol, sortDir])

  function Th({ col, children }) {
    return (
      <th style={{ ...TH_BASE, textAlign: col === 'name' ? 'left' : 'center' }}
          onClick={() => toggleSort(col)}>
        {children}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </th>
    )
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900, color: 'white' }}>
          Props Edge Board
        </h2>
        <p style={{ margin: 0, fontSize: 12, color: '#4b5563' }}>
          Standard PrizePicks lines · sorted by highest rating · {filtered.length} props
        </p>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14,
        padding: '12px 14px', background: '#0d0d0d',
        border: '1px solid #1f1f1f', borderRadius: 10,
      }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search player…"
          style={{
            background: '#131313', border: '1px solid #222', borderRadius: 6,
            color: 'white', fontSize: 12, padding: '6px 10px', width: 160,
            outline: 'none',
          }}
        />

        {/* Stat type */}
        <select value={statFilt} onChange={e => setStatFilt(e.target.value)} className="edge-select" style={{ fontSize: 12 }}>
          {STAT_LABELS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Props' : s}</option>)}
        </select>

        {/* Position */}
        <select value={posFilt} onChange={e => setPosFilt(e.target.value)} className="edge-select" style={{ fontSize: 12 }}>
          {POSITIONS.map(p => <option key={p} value={p}>{p === 'All' ? 'All Positions' : p}</option>)}
        </select>

        {/* Team */}
        <select value={teamFilt} onChange={e => setTeamFilt(e.target.value)} className="edge-select" style={{ fontSize: 12 }}>
          {teams.map(t => <option key={t} value={t}>{t === 'All' ? 'All Teams' : t}</option>)}
        </select>

        {/* Value */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {['All', 'OVER', 'UNDER'].map(v => (
            <button
              key={v}
              onClick={() => setValueFilt(v)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', border: '1px solid',
                borderColor: valueFilt === v
                  ? (v === 'OVER' ? '#22c55e' : v === 'UNDER' ? '#ef4444' : '#FF6900')
                  : '#222',
                background: valueFilt === v
                  ? (v === 'OVER' ? '#22c55e18' : v === 'UNDER' ? '#ef444418' : '#FF690018')
                  : 'transparent',
                color: valueFilt === v
                  ? (v === 'OVER' ? '#22c55e' : v === 'UNDER' ? '#ef4444' : '#FF6900')
                  : '#6b7280',
              }}
            >{v}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60, color: '#4b5563' }}>
          Loading edge data…
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 60, color: '#ef4444' }}>Error: {error}</div>
      )}
      {!loading && !error && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #1f1f1f' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#0a0a0a' }}>
            <thead>
              <tr>
                <th style={{ ...TH_BASE, textAlign: 'left', minWidth: 160 }} onClick={() => toggleSort('name')}>
                  Player<SortIcon col="name" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('team')}>
                  Team<SortIcon col="team" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('spread')}>
                  Spread<SortIcon col="spread" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('opponent')}>
                  Opp<SortIcon col="opponent" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('position')}>
                  Pos<SortIcon col="position" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('stat')}>
                  Prop<SortIcon col="stat" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('avgMins')}>
                  Avg MIN<SortIcon col="avgMins" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('seasonAvg')}>
                  2026 Avg<SortIcon col="seasonAvg" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('l5')}>
                  L5<SortIcon col="l5" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('l10')}>
                  L10<SortIcon col="l10" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('l15')}>
                  L15<SortIcon col="l15" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('full')}>
                  Full<SortIcon col="full" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('line')}>
                  Line<SortIcon col="line" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('projection')}>
                  Proj<SortIcon col="projection" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('rating')}>
                  Rating<SortIcon col="rating" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th style={{ ...TH_BASE, textAlign: 'center' }} onClick={() => toggleSort('value')}>
                  Value<SortIcon col="value" sortCol={sortCol} sortDir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={15} style={{ ...TD, textAlign: 'center', padding: 40, color: '#4b5563' }}>
                    No props match the current filters.
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => {
                const rc = ratingColor(row.rating)
                const isOver = row.value === 'OVER'
                const isUnder = row.value === 'UNDER'
                const projColor = row.projection > row.line ? '#22c55e' : row.projection < row.line ? '#ef4444' : '#e5e5e5'

                return (
                  <tr
                    key={`${row.name}-${row.stat}-${i}`}
                    style={{ background: i % 2 === 0 ? '#0a0a0a' : '#0d0d0d', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#131313'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#0a0a0a' : '#0d0d0d'}
                    onClick={() => navigate(`/players/${encodeURIComponent(row.name)}`)}
                  >
                    {/* Player */}
                    <td style={{ ...TD, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: row.teamColor + '22', border: `1px solid ${row.teamColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          overflow: 'hidden', fontSize: 9, fontWeight: 700, color: row.teamColor,
                        }}>
                          {row.image
                            ? <img src={row.image} alt={row.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                            : row.name.split(' ').map(w => w[0]).join('').slice(0, 2)
                          }
                        </div>
                        <span style={{ color: 'white', fontWeight: 600, fontSize: 13 }}>{row.name}</span>
                      </div>
                    </td>

                    {/* Team */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{
                        color: row.teamColor, fontWeight: 700, fontSize: 11,
                        background: row.teamColor + '18', padding: '2px 7px', borderRadius: 20,
                      }}>{row.team}</span>
                    </td>

                    {/* Spread */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {row.spread != null ? (
                        <span style={{
                          fontWeight: 800, fontSize: 12,
                          color: spreadColor(row.spread),
                        }}>
                          {row.spread > 0 ? `+${row.spread}` : row.spread}
                        </span>
                      ) : <span style={{ color: '#2a2a2a' }}>—</span>}
                    </td>

                    {/* Opp */}
                    <td style={{ ...TD, textAlign: 'center', color: '#e5e5e5', fontWeight: 600 }}>
                      {row.opponent || '—'}
                    </td>

                    {/* Pos */}
                    <td style={{ ...TD, textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>
                      {row.position}
                    </td>

                    {/* Prop */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#a78bfa',
                        background: '#a78bfa18', padding: '2px 8px', borderRadius: 20,
                      }}>{row.stat}</span>
                    </td>

                    {/* Avg MIN */}
                    <td style={{ ...TD, textAlign: 'center', color: minsColor(row.avgMins), fontWeight: 700 }}>
                      {row.avgMins != null ? fmt1(row.avgMins) : '—'}
                    </td>

                    {/* 2026 Avg */}
                    <td style={{ ...TD, textAlign: 'center', color: '#e5e5e5', fontWeight: 600 }}>
                      {row.seasonAvg != null ? fmt1(row.seasonAvg) : '—'}
                    </td>

                    {/* Hit rates */}
                    <HitCell value={row.l5} />
                    <HitCell value={row.l10} />
                    <HitCell value={row.l15} />
                    <HitCell value={row.full} />

                    {/* Line */}
                    <td style={{ ...TD, textAlign: 'center', color: '#FF6900', fontWeight: 800, fontSize: 13 }}>
                      {row.line}
                    </td>

                    {/* Projection */}
                    <td style={{ ...TD, textAlign: 'center', color: projColor, fontWeight: 700 }}>
                      {row.projection != null ? fmt1(row.projection) : '—'}
                    </td>

                    {/* Rating */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      <span style={{
                        fontSize: 14, fontWeight: 900, color: rc,
                      }}>
                        {row.rating != null ? row.rating.toFixed(1) : '—'}
                      </span>
                    </td>

                    {/* Value */}
                    <td style={{ ...TD, textAlign: 'center' }}>
                      {row.value ? (
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px', borderRadius: 20,
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.6px',
                          color:       isOver ? '#22c55e' : isUnder ? '#ef4444' : '#e5e5e5',
                          background:  isOver ? '#22c55e18' : isUnder ? '#ef444418' : '#e5e5e518',
                          border: `1px solid ${isOver ? '#22c55e40' : isUnder ? '#ef444440' : '#33333340'}`,
                        }}>{row.value}</span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
