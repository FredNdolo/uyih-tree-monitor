import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface UserRow {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: string
  is_active: boolean
  last_login_at?: string
  created_at?: string
}

const ROLES = [
  { value: 'donor', label: 'Donor' },
  { value: 'field_team', label: 'Field team' },
  { value: 'admin', label: 'Admin' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'super_admin', label: 'Super admin' },
]

export default function AdminUsers() {
  const { token, user: me } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const isAdmin = me?.role === 'admin' || me?.role === 'super_admin'

  const load = () => {
    if (!token) return
    setLoading(true)
    api<{ users: UserRow[] }>('/api/v1/users', {}, token)
      .then((res) => setUsers(res.users))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token])

  const updateRole = async (id: string, role: string) => {
    setError(null)
    setMessage(null)
    setSavingId(id)
    try {
      const res = await api<{ user: UserRow }>(
        `/api/v1/users/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role }),
        },
        token
      )
      setUsers((list) => list.map((u) => (u.id === id ? res.user : u)))
      setMessage(`Updated ${res.user.email} → ${res.user.role}`)
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    } finally {
      setSavingId(null)
    }
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    setError(null)
    setMessage(null)
    setSavingId(id)
    try {
      const res = await api<{ user: UserRow }>(
        `/api/v1/users/${id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ is_active }),
        },
        token
      )
      setUsers((list) => list.map((u) => (u.id === id ? res.user : u)))
      setMessage(`${res.user.email} is now ${is_active ? 'active' : 'inactive'}`)
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    } finally {
      setSavingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="max-w-lg mx-auto p-6 bg-white border rounded-xl text-center">
        <p className="text-slate-600">Admin access required to manage user roles.</p>
        <p className="text-sm text-slate-500 mt-2">
          Your role: <strong>{me?.role || '—'}</strong>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-uyih-green">User roles</h1>
      <p className="text-sm text-slate-500">
        Change roles for people who have signed in with Google. Users must log out and back in for a new role to apply to their token.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading users...</p>
      ) : users.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
          No users yet. Someone must sign in with Google first.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Active</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.full_name || '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                      {u.id === me?.id && (
                        <span className="text-xs text-uyih-orange">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) => updateRole(u.id, e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={savingId === u.id || u.id === me?.id}
                        onClick={() => toggleActive(u.id, !u.is_active)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          u.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleString()
                        : '—'}
                    </td>
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