import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface Tree {
  id: string
  qr_code: string
  status: string
  species?: string
  plot_name?: string
  school_name?: string
  planting_date?: string
  current_height_cm?: number
  last_check_in_at?: string
  created_at?: string
}

export default function Dashboard() {
  const { user, token } = useAuth()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    api<{ trees: Tree[] }>('/api/v1/trees?limit=200', {}, token)
      .then((res) => setTrees(res.trees))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  const stats = useMemo(() => {
    const total = trees.length
    const alive = trees.filter((t) =>
      ['alive', 'registered', 'stressed'].includes(t.status)
    ).length
    const dead = trees.filter((t) => t.status === 'dead').length
    const stressed = trees.filter((t) => t.status === 'stressed').length
    const checkedIn = trees.filter((t) => t.last_check_in_at).length
    const survivalRate = total > 0 ? ((alive / total) * 100).toFixed(1) : '0.0'

    return { total, alive, dead, stressed, checkedIn, survivalRate }
  }, [trees])

  const statusColor = (status: string) => {
    switch (status) {
      case 'alive':
      case 'registered':
        return 'bg-green-100 text-green-800'
      case 'stressed':
        return 'bg-yellow-100 text-yellow-800'
      case 'dead':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-slate-100 text-slate-700'
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-uyih-green">
          Welcome{user?.full_name ? `, ${user.full_name}` : ''}
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Role: {user?.role || '—'}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-uyih-slate mt-1">{stats.total}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Living</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.alive}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Stressed</p>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{stats.stressed}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Dead</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.dead}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Checked in</p>
          <p className="text-2xl font-bold text-uyih-slate mt-1">{stats.checkedIn}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Survival</p>
          <p className="text-2xl font-bold text-uyih-green mt-1">{stats.survivalRate}%</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link
          to="/trees/register"
          className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-uyih-green shadow-sm transition"
        >
          <h2 className="font-semibold text-lg">Register a Tree</h2>
          <p className="text-sm text-slate-500 mt-1">QR + GPS + species</p>
        </Link>
        <Link
          to="/trees/check-in"
          className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-uyih-green shadow-sm transition"
        >
          <h2 className="font-semibold text-lg">Check-in</h2>
          <p className="text-sm text-slate-500 mt-1">Health status & measurements</p>
        </Link>
      </div>

      {/* Trees list */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-uyih-slate">Recent Trees</h2>
          <span className="text-sm text-slate-500">{trees.length} shown</span>
        </div>

        {loading && <p className="text-slate-500 text-sm">Loading trees...</p>}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!loading && !error && trees.length === 0 && (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
            No trees registered yet.{' '}
            <Link to="/trees/register" className="text-uyih-green underline">
              Register the first one
            </Link>
          </div>
        )}

        {!loading && trees.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">QR Code</th>
                    <th className="px-4 py-3 font-medium">Species</th>
                    <th className="px-4 py-3 font-medium">Plot / School</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Height</th>
                    <th className="px-4 py-3 font-medium">Last check-in</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trees.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-medium">
                        <Link
                          to={`/trees/${t.id}`}
                          className="text-uyih-green hover:underline"
                        >
                          {t.qr_code}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{t.species || '—'}</td>
                      <td className="px-4 py-3">
                        <div>{t.plot_name || '—'}</div>
                        <div className="text-xs text-slate-500">{t.school_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(
                            t.status
                          )}`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.current_height_cm != null ? `${t.current_height_cm} cm` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {t.last_check_in_at
                          ? new Date(t.last_check_in_at).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/trees/check-in?qr=${t.qr_code}`}
                          className="text-uyih-orange hover:underline text-xs font-medium"
                        >
                          Check-in
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}