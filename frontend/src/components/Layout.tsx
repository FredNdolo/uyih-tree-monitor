import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, token, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-uyih-green text-white shadow">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            UYIH Tree Monitor
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {token ? (
              <>
                <Link to="/dashboard" className="hover:underline">Dashboard</Link>
                <Link to="/admin/schools" className="hover:underline">Schools</Link>
                <Link to="/admin/plots" className="hover:underline">Plots</Link>
                <Link to="/trees/register" className="hover:underline">Register Tree</Link>
                <Link to="/trees/check-in" className="hover:underline">Check-in</Link>
                <Link to="/admin/users" className="hover:underline">Users</Link>
                <Link to="/admin/nurseries" className="hover:underline">Nurseries</Link>
                <span className="opacity-80">{user?.full_name || user?.email}</span>
                <button
                  onClick={handleLogout}
                  className="bg-uyih-orange hover:bg-uyih-orange-light px-3 py-1 rounded text-white"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="bg-uyih-orange hover:bg-uyih-orange-light px-3 py-1 rounded"
              >
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="text-center text-sm text-slate-500 py-4">
        Umoja Youth Impact Hub · Green Futures Initiative
      </footer>
    </div>
  )
}