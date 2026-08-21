import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: '#080808' }}>
      <Navbar />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 24px 48px' }}>
        <Outlet />
      </main>
    </div>
  )
}
