import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface School {
  id: string
  name: string
  county: string
}

interface Nursery {
  id: string
  name: string
  code?: string
  capacity?: number
  school_id: string
  school_name?: string
  is_active?: boolean
}

export default function AdminNurseries() {
  const { token, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const schoolIdParam = searchParams.get('school_id') || ''

  const [schools, setSchools] = useState<School[]>([])
  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    school_id: schoolIdParam,
    name: '',
    code: '',
    capacity: '',
  })

  const canEdit =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'field_team'

  useEffect(() => {
    if (!token) return
    api<{ schools: School[] }>('/api/v1/schools', {}, token)
      .then((res) => setSchools(res.schools))
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (schoolIdParam) setForm((f) => ({ ...f, school_id: schoolIdParam }))
  }, [schoolIdParam])

  const load = () => {
    if (!token) return
    setLoading(true)
    const q = form.school_id || schoolIdParam
    const url = q ? `/api/v1/nurseries?school_id=${q}` : '/api/v1/nurseries'

    api<{ nurseries: Nursery[] }>(url, {}, token)
      .then((res) => setNurseries(res.nurseries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token, form.school_id, schoolIdParam])

  const onSchoolFilter = (id: string) => {
    setForm((f) => ({ ...f, school_id: id }))
    if (id) setSearchParams({ school_id: id })
    else setSearchParams({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      await api(
        '/api/v1/nurseries',
        {
          method: 'POST',
          body: JSON.stringify({
            school_id: form.school_id,
            name: form.name,
            code: form.code || undefined,
            capacity: form.capacity ? parseInt(form.capacity, 10) : undefined,
          }),
        },
        token
      )
      setSuccess('Nursery created')
      setForm((f) => ({ ...f, name: '', code: '', capacity: '' }))
      setShowForm(false)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create nursery')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-uyih-green">Nurseries</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-uyih-orange hover:bg-uyih-orange-light text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : 'Add nursery'}
          </button>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Filter by school</label>
        <select
          value={form.school_id}
          onChange={(e) => onSchoolFilter(e.target.value)}
          className="w-full sm:w-80 border rounded-lg px-3 py-2"
        >
          <option value="">All schools</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.county})
            </option>
          ))}
        </select>
      </div>

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

      {showForm && canEdit && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border rounded-xl p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium mb-1">School *</label>
            <select
              required
              value={form.school_id}
              onChange={(e) => setForm((f) => ({ ...f, school_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select school...</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Main school nursery"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Capacity</label>
              <input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-uyih-green hover:bg-uyih-green-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Create nursery'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : nurseries.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
          No nurseries yet.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Capacity</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nurseries.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{n.name}</div>
                    {n.code && (
                      <div className="text-xs font-mono text-slate-500">{n.code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{n.school_name || '—'}</td>
                  <td className="px-4 py-3">{n.capacity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/seed-batches?nursery_id=${n.id}`}
                      className="text-uyih-orange hover:underline text-xs font-medium"
                    >
                      Batches
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