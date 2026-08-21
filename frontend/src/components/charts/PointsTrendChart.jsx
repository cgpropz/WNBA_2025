import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { formatDate } from '../../utils/formatters'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2d2d2d',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#9ca3af', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 600, margin: 0 }}>
          {p.name}: <span style={{ color: 'white' }}>{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function PointsTrendChart({ games = [], stat = 'pts', color = '#FF6900', label = 'PTS' }) {
  const chartData = [...games]
    .slice(0, 15)
    .reverse()
    .map(g => ({
      date: formatDate(g.date),
      [label]: typeof g[stat] === 'number' ? g[stat] : parseFloat(g[stat] || 0),
    }))

  if (chartData.length === 0) {
    return (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: 13 }}>
        No game data available
      </div>
    )
  }

  const avg = chartData.reduce((s, d) => s + d[label], 0) / chartData.length

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={`grad-${stat}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
            <stop offset="95%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#4b5563', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#4b5563', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={avg} stroke="#374151" strokeDasharray="4 4" label={{ value: `avg ${avg.toFixed(1)}`, fill: '#6b7280', fontSize: 10 }} />
        <Area
          type="monotone"
          dataKey={label}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#grad-${stat})`}
          dot={{ fill: color, r: 3, strokeWidth: 0 }}
          activeDot={{ fill: color, r: 5, strokeWidth: 2, stroke: '#080808' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
