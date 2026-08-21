import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts'

const WINDOW_COLORS = { L3: '#FF6900', L7: '#3b82f6', L15: '#22c55e' }

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1a1a', border: '1px solid #2d2d2d',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ color: '#9ca3af', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.fill, margin: '2px 0', fontWeight: 500 }}>
          {p.dataKey}: <span style={{ color: 'white' }}>{typeof p.value === 'number' ? p.value.toFixed(4) : p.value} <span style={{ color: '#6b7280', fontSize: 10 }}>ppm</span></span>
        </p>
      ))}
    </div>
  )
}

export default function StatWindowBarChart({ ppmData = {}, expectedMins = 0 }) {
  const stats = [
    { key: 'pts', label: 'PTS' },
    { key: 'reb', label: 'REB' },
    { key: 'ast', label: 'AST' },
    { key: 'fg3m', label: '3PM' },
  ]

  const chartData = stats.map(({ key, label }) => ({
    stat: label,
    L3: parseFloat((ppmData?.pts ? ppmData[key]?.L3 ?? 0 : 0).toFixed(4)),
    L7: parseFloat((ppmData?.pts ? ppmData[key]?.L7 ?? 0 : 0).toFixed(4)),
    L15: parseFloat((ppmData?.pts ? ppmData[key]?.L15 ?? 0 : 0).toFixed(4)),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }} barGap={3}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
        <XAxis dataKey="stat" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fill: '#4b5563', fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,105,0,0.05)' }} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value) => <span style={{ color: WINDOW_COLORS[value] }}>{value}</span>}
        />
        <Bar dataKey="L3" fill={WINDOW_COLORS.L3} radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="L7" fill={WINDOW_COLORS.L7} radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="L15" fill={WINDOW_COLORS.L15} radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
