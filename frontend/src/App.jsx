import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import PlayerMap from './pages/PlayerMap'
import PlayerDetail from './pages/PlayerDetail'
import Projections from './pages/Projections'
import Teams from './pages/Teams'
import Edge from './pages/Edge'
import Lineups from './pages/Lineups'
import Cheatsheet from './pages/Cheatsheet'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="players" element={<PlayerMap />} />
        <Route path="players/:playerName" element={<PlayerDetail />} />
        <Route path="projections" element={<Projections />} />
        <Route path="teams" element={<Teams />} />
        <Route path="edge" element={<Edge />} />
        <Route path="lineups" element={<Lineups />} />
        <Route path="cheatsheet" element={<Cheatsheet />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
