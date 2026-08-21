import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import { fetchApi } from '../hooks/useApi'
import PointsTrendChart from '../components/charts/PointsTrendChart'
import StatWindowBarChart from '../components/charts/StatWindowBarChart'
import { fmt1, fmt2, posBadgeClass, teamColor, dvpLabel, formatDate, ratingLabel, ratingColor } from '../utils/formatters'

const PROP_COLOR_MAP = {
  'Points': '#FF6900',
  'Rebounds': '#3b82f6',
  'Assists': '#22c55e',
  '3-PT Made': '#a855f7',
  'Steals': '#10b981',
  'Blocks': '#14b8a6',
  'Turnovers': '#ef4444',
  'Offensive Rebounds': '#38bdf8',
  'Defensive Rebounds': '#2563eb',
  'Fantasy Score': '#f59e0b',
  'Reb+Asts': '#60a5fa',
  'Rebs+Asts': '#60a5fa',
  'Pts+Rebs': '#fb7185',
  'Pts+Asts': '#f97316',
  'Pts+Rebs+Asts': '#f43f5e',
  'Double-Double': '#34d399',
  'Triple-Double': '#a3e635',
}

const CORE_PROP_ORDER = [
  'Points', 'Rebounds', 'Assists', '3-PT Made',
  'Steals', 'Blocks', 'Turnovers', 'Offensive Rebounds', 'Defensive Rebounds', 'Fantasy Score',
  'Reb+Asts', 'Rebs+Asts', 'Pts+Rebs', 'Pts+Asts', 'Pts+Rebs+Asts',
  'Double-Double', 'Triple-Double',
]

function projectionForLabel(projData, label) {
  if (!projData) return null
  switch (label) {
    case 'Points': return projData.projPts
    case 'Rebounds': return projData.projReb
    case 'Assists': return projData.projAst
    case '3-PT Made': return projData.projFg3m
    case 'Steals': return projData.projStl
    case 'Blocks': return projData.projBlk
    case 'Turnovers': return projData.projTov
    case 'Offensive Rebounds': return projData.projOreb
    case 'Defensive Rebounds': return projData.projDreb
    case 'Fantasy Score': return projData.projFantasy
    case 'Reb+Asts':
    case 'Rebs+Asts': return projData.projRebAst
    case 'Pts+Rebs': return projData.projPtsReb
    case 'Pts+Asts': return projData.projPtsAst
    case 'Pts+Rebs+Asts': return projData.projPtsRebAst
    case 'Double-Double': return projData.projDoubleDouble
    case 'Triple-Double': return projData.projTripleDouble
    default: return null
  }
}

function ratingForLabel(projData, label) {
  if (!projData?.ppRating) return null
  switch (label) {
    case 'Points': return projData.ppRating.pts
    case 'Rebounds': return projData.ppRating.reb
    case 'Assists': return projData.ppRating.ast
    case '3-PT Made': return projData.ppRating.fg3m
    case 'Steals': return projData.ppRating.stl
    case 'Blocks': return projData.ppRating.blk
    case 'Turnovers': return projData.ppRating.tov
    case 'Offensive Rebounds': return projData.ppRating.oreb
    case 'Defensive Rebounds': return projData.ppRating.dreb
    case 'Fantasy Score': return projData.ppRating.fantasy
    case 'Reb+Asts':
    case 'Rebs+Asts': return projData.ppRating.rebAst
    case 'Pts+Rebs': return projData.ppRating.ptsReb
    case 'Pts+Asts': return projData.ppRating.ptsAst
    case 'Pts+Rebs+Asts': return projData.ppRating.ptsRebAst
    case 'Double-Double': return projData.ppRating.doubleDouble
    case 'Triple-Double': return projData.ppRating.tripleDouble
    default: return null
  }
}

function ratingScaleColor(rating) {
  if (rating == null) return '#e5e5e5'
  // 30=red, 50=neutral white, 70=green
  const r30 = [239, 68, 68]
  const r50 = [229, 229, 229]
  const r70 = [34, 197, 94]
  let [from, to, t] =
    rating <= 50
      ? [r30, r50, Math.max(0, (rating - 30) / 20)]
      : [r50, r70, Math.min(1, (rating - 50) / 20)]
  const lerp = (a, b, t) => Math.round(a + (b - a) * t)
  return `rgb(${lerp(from[0], to[0], t)}, ${lerp(from[1], to[1], t)}, ${lerp(from[2], to[2], t)})`
}

function StatPill({ label, value, color = 'white', ppLine = null, ppRating = null }) {
  const ratingColor = ratingScaleColor(ppRating)
  return (
    <div className="card" style={{ padding: '12px 14px', textAlign: 'center' }}>
      <p className="stat-value" style={{ color, fontSize: 22, marginBottom: 2 }}>{value}</p>
      <p className="stat-label" style={{ marginTop: 2 }}>{label}</p>
      {ppLine != null ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1f1f1f' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 800, color: '#aaa' }}>{ppLine}</p>
          <p className="stat-label" style={{ marginBottom: 6 }}>PP Line</p>
          <p style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 900, color: ratingColor, lineHeight: 1 }}>
            {ppRating?.toFixed(1)}
          </p>
          <p className="stat-label">Rating</p>
        </div>
      ) : (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #1f1f1f' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#2a2a2a' }}>No line</p>
        </div>
      )}
    </div>
  )
}

function FormulaCard({ ppmData, avgMins, dvpFactor, projPts }) {
  const l3 = ppmData?.pts?.L3 ?? 0
  const l7 = ppmData?.pts?.L7 ?? 0
  const l15 = ppmData?.pts?.L15 ?? 0
  const weighted = l3 * 0.5 + l7 * 0.3 + l15 * 0.2

  return (
    <div className="card" style={{ padding: '18px 20px' }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'white' }}>
        Points Projection Breakdown
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ color: '#FF6900', fontWeight: 700 }}>({l3.toFixed(4)}<span style={{ color: '#6b7280', fontSize: 11 }}>×0.5</span></span>
        <span style={{ color: '#6b7280' }}>+</span>
        <span style={{ color: '#3b82f6', fontWeight: 700 }}>{l7.toFixed(4)}<span style={{ color: '#6b7280', fontSize: 11 }}>×0.3</span></span>
        <span style={{ color: '#6b7280' }}>+</span>
        <span style={{ color: '#22c55e', fontWeight: 700 }}>{l15.toFixed(4)}<span style={{ color: '#6b7280', fontSize: 11 }}>×0.2)</span></span>
        <span style={{ color: '#6b7280' }}>×</span>
        <span style={{ color: '#e5e5e5', fontWeight: 600 }}>{fmt1(avgMins)} MIN</span>
        <span style={{ color: '#6b7280' }}>×</span>
        <span style={{ color: dvpLabel(dvpFactor).color, fontWeight: 600 }}>{dvpFactor?.toFixed(3)} DVP</span>
        <span style={{ color: '#6b7280' }}>=</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#FF6900' }}>{fmt1(projPts)} PTS</span>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
        {[['L3 PPM', l3, '#FF6900'], ['L7 PPM', l7, '#3b82f6'], ['L15 PPM', l15, '#22c55e'], ['Weighted', weighted, '#e5e5e5']].map(([lbl, val, clr]) => (
          <div key={lbl}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: clr }}>{val.toFixed(4)}</p>
            <p className="stat-label">{lbl}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const CHART_STATS = [
  { key: 'pts', label: 'PTS', color: '#FF6900' },
  { key: 'reb', label: 'REB', color: '#3b82f6' },
  { key: 'ast', label: 'AST', color: '#22c55e' },
  { key: 'fg3m', label: '3PM', color: '#a855f7' },
]

const LINE_TYPES = ['standard', 'demon', 'goblin']

function PPRatingCard({ propRows, lineType, setLineType }) {
  const hasAnyLine = propRows.some(s => s.line != null)

  return (
    <div className="card" style={{ padding: '20px 24px', marginBottom: 20, borderColor: '#22c55e22' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>
            PrizePicks Rating
          </h3>
          <span style={{ fontSize: 11, color: '#4b5563' }}>
            Formula: (Projection ÷ PP Line) × 50 &nbsp;·&nbsp; 50 = even with line
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 11, color: '#6b7280', alignSelf: 'center' }}>Lines:</span>
          {LINE_TYPES.map(type => (
            <button
              key={type}
              className={`btn-ghost${lineType === type ? ' active' : ''}`}
              onClick={() => setLineType(type)}
              style={{ textTransform: 'capitalize', padding: '6px 10px' }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {!hasAnyLine ? (
        <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>
          No PrizePicks lines found for this player today.
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {propRows.map(({ key, label, color, proj, line, rating }) => {
            const rl = ratingLabel(rating)
            return (
              <div key={key} style={{
                background: '#0a0a0a',
                border: `1px solid ${line != null ? color + '30' : '#1a1a1a'}`,
                borderRadius: 10, padding: '14px 16px', textAlign: 'center',
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>

                {/* Formula row */}
                {line != null ? (
                  <>
                    <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 8 }}>
                      ({fmt1(proj)} ÷ {line}) × 50
                    </div>

                    {/* Rating score */}
                    <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 900, color: rl.color, lineHeight: 1 }}>
                      {rating?.toFixed(1)}
                    </p>

                    {/* Label badge */}
                    <span style={{
                      display: 'inline-block', fontSize: 9, fontWeight: 800,
                      color: rl.color, background: rl.color + '18',
                      padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase',
                      letterSpacing: '0.8px', marginBottom: 8,
                    }}>{rl.label}</span>

                    {/* Proj vs Line bar */}
                    <div style={{ position: 'relative', height: 4, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        position: 'absolute', left: 0, top: 0, height: '100%',
                        width: `${Math.min((proj / (line * 1.5)) * 100, 100)}%`,
                        background: `linear-gradient(90deg, ${color}80, ${color})`,
                        borderRadius: 4,
                      }} />
                      {/* Line marker */}
                      <div style={{
                        position: 'absolute', top: -2, height: 8, width: 2,
                        background: '#ffffff80',
                        left: `${Math.min((line / (line * 1.5)) * 100, 100)}%`,
                        borderRadius: 1,
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#6b7280' }}>
                      <span>Proj: <strong style={{ color: 'white' }}>{fmt1(proj)}</strong></span>
                      <span>Line: <strong style={{ color }}>{line}</strong></span>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '12px 0', color: '#333', fontSize: 12 }}>No line</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PlayerDetail() {
  const { playerName } = useParams()
  const navigate = useNavigate()
  const name = decodeURIComponent(playerName)

  const [lineType, setLineType] = useState('standard')
  const [ppmData, setPpmData] = useState(null)
  const [bioData, setBioData] = useState(null)
  const [projData, setProjData] = useState(null)
  const [activeStat, setActiveStat] = useState('pts')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      fetchApi(`/api/players/${encodeURIComponent(name)}/ppm`),
      fetchApi(`/api/players`),
      fetchApi(`/api/projections/v2?lineType=${lineType}`),
    ]).then(([ppm, allPlayers, allProj]) => {
      setPpmData(ppm)
      setBioData(allPlayers?.find(p => p.name?.toLowerCase() === name.toLowerCase()) ?? null)
      setProjData(allProj?.find(p => p.name?.toLowerCase() === name.toLowerCase()) ?? null)
      setLoading(false)
    }).catch(err => { setError(err.message); setLoading(false) })
  }, [name, lineType])

  const propRows = useMemo(() => {
    if (!projData) return []
    const ppMap = new Map((projData.ppAllProps || []).map(prop => [prop?.stat, prop]))
    const labelSet = new Set([
      ...CORE_PROP_ORDER,
      ...(projData.ppAllProps || []).map(prop => prop?.stat).filter(Boolean),
    ])

    const rows = [...labelSet].map(label => {
      const pp = ppMap.get(label)
      const proj = pp?.projection ?? projectionForLabel(projData, label)
      const rating = pp?.rating ?? ratingForLabel(projData, label)
      return {
        key: label,
        label,
        color: PROP_COLOR_MAP[label] || '#e5e5e5',
        proj,
        line: pp?.line ?? null,
        rating,
      }
    }).filter(row => row.proj != null || row.line != null)

    rows.sort((a, b) => {
      const ai = CORE_PROP_ORDER.indexOf(a.label)
      const bi = CORE_PROP_ORDER.indexOf(b.label)
      const aRank = ai === -1 ? 999 : ai
      const bRank = bi === -1 ? 999 : bi
      if (aRank !== bRank) return aRank - bRank
      return String(a.label).localeCompare(String(b.label))
    })

    return rows
  }, [projData])

  if (loading) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: '#4b5563' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
        Loading player data...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#ef4444' }}>
        Error: {error}
        <br /><button className="btn-ghost" style={{ marginTop: 14 }} onClick={() => navigate(-1)}>← Back</button>
      </div>
    )
  }

  const tc = teamColor(bioData?.team || projData?.team || '')
  const position = bioData?.position || projData?.position || 'N/A'
  const games = ppmData?.recentGames ?? []
  const avgMins = ppmData?.avgMins ?? 0

  const activeStat_ = CHART_STATS.find(s => s.key === activeStat)

  return (
    <div className="fade-in">
      {/* Back button */}
      <button className="btn-ghost" style={{ marginBottom: 20 }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* Hero */}
      <div className="card" style={{
        padding: '28px 28px 24px',
        marginBottom: 20,
        background: `linear-gradient(135deg, ${tc}10 0%, #111 60%)`,
        borderColor: tc + '30',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background team color blob */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: tc + '08', pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: tc + '20', border: `3px solid ${tc}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, fontWeight: 800, color: tc, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {bioData?.image
              ? <img src={bioData.image} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              : name.split(' ').map(w => w[0]).join('').slice(0, 2)
            }
          </div>

          {/* Name + team info */}
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1 }}>{name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                color: tc, fontWeight: 800, fontSize: 13,
                background: tc + '18', padding: '4px 12px', borderRadius: 20,
              }}>{bioData?.teamFull || bioData?.team || projData?.team}</span>
              <span className={posBadgeClass(position)}>{position}</span>
              {bioData?.age && <span style={{ color: '#6b7280', fontSize: 12 }}>Age {bioData.age}</span>}
              {bioData?.height && <span style={{ color: '#6b7280', fontSize: 12 }}>{bioData.height}</span>}
              {bioData?.college && <span style={{ color: '#6b7280', fontSize: 12 }}>{bioData.college}</span>}
            </div>
          </div>

          {/* Games count */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: 'white' }}>{ppmData?.games ?? 0}</p>
            <p className="stat-label">Games Logged</p>
          </div>
        </div>

        {/* Season stats row */}
        {bioData && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            {[['PTS', bioData.pts], ['REB', bioData.reb], ['AST', bioData.ast],
              ['USG%', bioData.usg], ['TS%', bioData.ts], ['NetRtg', bioData.netRtg],
              ['Avg MIN', fmt1(avgMins)],
            ].filter(([, v]) => v != null && v !== '').map(([lbl, val]) => (
              <div key={lbl} className="card" style={{ padding: '10px 16px', textAlign: 'center', background: '#0e0e0e' }}>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'white' }}>{val}</p>
                <p className="stat-label" style={{ marginTop: 3 }}>{lbl}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formula breakdown */}
      {projData && (
        <div style={{ marginBottom: 20 }}>
          <FormulaCard
            ppmData={ppmData?.ppm}
            avgMins={avgMins}
            dvpFactor={projData.dvpFactor ?? 1}
            projPts={projData.projPts ?? 0}
          />
        </div>
      )}

      {/* Projections grid */}
      {projData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          {propRows.map(row => (
            <StatPill
              key={row.key}
              label={`PROJ ${row.label}`}
              value={row.proj != null ? fmt1(row.proj) : '—'}
              color={row.color}
              ppLine={row.line}
              ppRating={row.rating}
            />
          ))}
        </div>
      )}

      {/* PrizePicks rating card */}
      <PPRatingCard propRows={propRows} lineType={lineType} setLineType={setLineType} />

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Trend chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>Recent Game Trend (L15)</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {CHART_STATS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setActiveStat(s.key)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    border: `1px solid ${activeStat === s.key ? s.color : '#222'}`,
                    background: activeStat === s.key ? s.color + '20' : 'transparent',
                    color: activeStat === s.key ? s.color : '#6b7280',
                    cursor: 'pointer',
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <PointsTrendChart
            games={games}
            stat={activeStat_?.key}
            color={activeStat_?.color}
            label={activeStat_?.label}
          />
        </div>

        {/* L3/L7/L15 bar chart */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 700, color: 'white' }}>
            Per-Minute by Window (L3 / L7 / L15)
          </h3>
          <StatWindowBarChart ppmData={ppmData?.ppm} expectedMins={avgMins} />
          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#4b5563', textAlign: 'center' }}>
            Values are per-minute rates multiplied by expected minutes to yield projected stats
          </p>
        </div>
      </div>

      {/* Recent games log */}
      {games.length > 0 && (
        <div className="card" style={{ padding: '20px', overflow: 'hidden' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'white' }}>Recent Games</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  {['Date', 'Matchup', 'MIN', 'PTS', 'REB', 'AST', '3PM', 'STL', 'BLK', 'TOV', 'FGM', 'FGA'].map(h => (
                    <th key={h} style={{ cursor: 'default' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.slice(0, 15).map((g, i) => (
                  <tr key={i}>
                    <td style={{ color: '#9ca3af' }}>{formatDate(g.date)}</td>
                    <td style={{ color: '#6b7280', fontSize: 12 }}>{g.matchup}</td>
                    <td>{fmt1(g.min)}</td>
                    <td style={{ fontWeight: 700, color: g.pts >= 20 ? '#FF6900' : 'white' }}>{g.pts}</td>
                    <td>{g.reb}</td>
                    <td>{g.ast}</td>
                    <td style={{ color: '#a855f7' }}>{g.fg3m}</td>
                    <td style={{ color: '#22c55e' }}>{g.stl}</td>
                    <td style={{ color: '#3b82f6' }}>{g.blk}</td>
                    <td style={{ color: '#ef4444' }}>{g.tov}</td>
                    <td style={{ color: '#6b7280' }}>{g.fgm}</td>
                    <td style={{ color: '#4b5563' }}>{g.fga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
