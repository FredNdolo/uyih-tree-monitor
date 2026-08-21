import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface School {
  id: string
  name: string
  code?: string
  county: string
  sub_county?: string
  contact_name?: string
  contact_phone?: string
  is_active?: boolean
  project_name?: string
}

export default function AdminSchools() {
  const { token, user } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
    county: 'Narok',
    sub_county: '',
    contact_name: '',
    contact_phone: '',
    project_id: '',
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const loadSchools = () => {
    if (!token) return
    setLoading(true)
    api<{ schools: School[] }>('/api/v1/schools', {}, token)
      .then((res) => setSchools(res.schools))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSchools()
  }, [token])

  // Load first project id for create form (from existing school or we need a project)
  useEffect(() => {
    if (!token || form.project_id) return
    // Get project from first school if available; otherwise user must set in DB
    api<{ schools: any[] }>('/api/v1/schools', {}, token)
      .then(async (res) => {
        if (res.schools.length > 0) {
          // fetch full school for project_id
          const full = await api<{ school: any }>(
            `/api/v1/schools/${res.schools[0].id}`,
            {},
            token
          )
          if (full.school?.project_id) {
            setForm((f) => ({ ...f, project_id: full.school.project_id }))
          }
        }
      })
      .catch(() => {})
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) {
      setError('Only admins can create schools')
      return
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      if (!form.project_id) {
        throw new Error(
          'No project_id found. Ensure at least one school exists from seed data, or set project_id in the form.'
        )
      }

      await api(
        '/api/v1/schools',
        {
          method: 'POST',
          body: JSON.stringify({
            project_id: form.project_id,
            name: form.name,
            code: form.code || undefined,
            county: form.county,
            sub_county: form.sub_county || undefined,
            contact_name: form.contact_name || undefined,
            contact_phone: form.contact_phone || undefined,
          }),
        },
        token
      )

      setSuccess('School created')
      setForm((f) => ({
        ...f,
        name: '',
        code: '',
        sub_county: '',
        contact_name: '',
        contact_phone: '',
      }))
      setShowForm(false)
      loadSchools()
    } catch (err: any) {
      setError(err.message || 'Failed to create school')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-uyih-green">Schools</h1>
        {isAdmin && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-uyih-orange hover:bg-uyih-orange-light text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : 'Add school'}
          </button>
        )}
      </div>

      {!isAdmin && (
        <p className="text-sm text-slate-500">
          You can view schools. Only admins can create new ones.
          {user?.role === 'field_team' && (
            <> To become admin, run in Neon: <code className="text-xs bg-slate-100 px-1 rounded">UPDATE users SET role = 'admin' WHERE email = 'your@email.com';</code></>
          )}
        </p>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {success}
        </div>
      )}

      {showForm && isAdmin && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-xl p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Narok Girls Secondary"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. NAROK-02"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">County *</label>
              <input
                required
                value={form.county}
                onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Sub-county</label>
            <input
              value={form.sub_county}
              onChange={(e) => setForm((f) => ({ ...f, sub_county: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Contact name</label>
              <input
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact phone</label>
              <input
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-uyih-green hover:bg-uyih-green-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Create school'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : schools.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
          No schools yet.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">County</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schools.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    {s.code && (
                      <div className="text-xs text-slate-500 font-mono">{s.code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.county}
                    {s.sub_county ? ` / ${s.sub_county}` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.contact_name || '—'}
                    {s.contact_phone && (
                      <div className="text-xs">{s.contact_phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/plots?school_id=${s.id}`}
                      className="text-uyih-orange hover:underline text-xs font-medium"
                    >
                      Plots
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}