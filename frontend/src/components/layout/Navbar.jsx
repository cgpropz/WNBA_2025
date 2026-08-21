import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', exact: true },
  { to: '/players', label: 'Player Map' },
  { to: '/projections', label: 'Projections' },
  { to: '/edge', label: 'Edge Board' },
  { to: '/teams', label: 'Teams & DVP' },
  { to: '/lineups', label: 'Lineups' },
]

const TEAM_COLORS = {
  LVA:'#C9A84C', MIN:'#236192', IND:'#C8102E', PHX:'#E56020',
  NYL:'#6ECEB2', SEA:'#2C5234', GSV:'#FFC72C', CON:'#F47321',
  DAL:'#C4D600', LAS:'#702F8A', ATL:'#418FDE', CHI:'#5D76A9',
}

export default function Navbar() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  function handleSearch(e) {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/players?q=${encodeURIComponent(search.trim())}`)
      setSearch('')
    }
  }

  return (
    <nav style={{
      background: '#0d0d0d',
      borderBottom: '1px solid #1f1f1f',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, #FF6900, #FF9500)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, color: 'white',
            letterSpacing: '-1px',
          }}>W</div>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'white', letterSpacing: '-0.2px' }}>
            WNBA <span style={{ color: '#FF6900' }}>Projections</span>
          </span>
        </NavLink>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
          {NAV_LINKS.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                textDecoration: 'none',
                padding: '6px 12px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#FF6900' : '#9ca3af',
                background: isActive ? 'rgba(255,105,0,0.1)' : 'transparent',
                transition: 'all 0.15s',
                letterSpacing: '0.1px',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <svg
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none' }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search players..."
              style={{
                background: '#161616',
                border: '1px solid #222',
                borderRadius: 8,
                padding: '7px 12px 7px 32px',
                color: '#e5e5e5',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                width: 200,
                transition: 'border-color 0.18s',
              }}
              onFocus={e => e.target.style.borderColor = '#FF6900'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />
          </div>
        </form>

        {/* Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span className="pulse-dot" style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#22c55e', display: 'inline-block',
          }} />
          <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>2026 Season</span>
        </div>
      </div>
    </nav>
  )
}
