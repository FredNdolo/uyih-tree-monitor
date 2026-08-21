import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface School {
  id: string
  name: string
  county: string
}

interface Plot {
  id: string
  name: string
  code?: string
  area_hectares?: number
  soil_type?: string
  school_id: string
  school_name?: string
  notes?: string
}

export default function AdminPlots() {
  const { token, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const schoolIdParam = searchParams.get('school_id') || ''

  const [schools, setSchools] = useState<School[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    school_id: schoolIdParam,
    name: '',
    code: '',
    area_hectares: '',
    soil_type: '',
    notes: '',
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
    if (schoolIdParam) {
      setForm((f) => ({ ...f, school_id: schoolIdParam }))
    }
  }, [schoolIdParam])

  const loadPlots = () => {
    if (!token) return
    setLoading(true)
    const q = form.school_id || schoolIdParam
    const url = q
      ? `/api/v1/plots?school_id=${q}`
      : '/api/v1/plots'

    api<{ plots: Plot[] }>(url, {}, token)
      .then((res) => setPlots(res.plots))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadPlots()
  }, [token, form.school_id, schoolIdParam])

  const onSchoolFilterChange = (id: string) => {
    setForm((f) => ({ ...f, school_id: id }))
    if (id) {
      setSearchParams({ school_id: id })
    } else {
      setSearchParams({})
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) {
      setError('You do not have permission to create plots')
      return
    }

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      await api(
        '/api/v1/plots',
        {
          method: 'POST',
          body: JSON.stringify({
            school_id: form.school_id,
            name: form.name,
            code: form.code || undefined,
            area_hectares: form.area_hectares
              ? parseFloat(form.area_hectares)
              : undefined,
            soil_type: form.soil_type || undefined,
            notes: form.notes || undefined,
          }),
        },
        token
      )

      setSuccess('Plot created')
      setForm((f) => ({
        ...f,
        name: '',
        code: '',
        area_hectares: '',
        soil_type: '',
        notes: '',
      }))
      setShowForm(false)
      loadPlots()
    } catch (err: any) {
      setError(err.message || 'Failed to create plot')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link to="/admin/schools" className="text-sm text-uyih-green hover:underline">
            ← Schools
          </Link>
          <h1 className="text-2xl font-bold text-uyih-green mt-1">Plots</h1>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-uyih-orange hover:bg-uyih-orange-light text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : 'Add plot'}
          </button>
        )}
      </div>

      {/* School filter */}
      <div>
        <label className="block text-sm font-medium mb-1">Filter by school</label>
        <select
          value={form.school_id}
          onChange={(e) => onSchoolFilterChange(e.target.value)}
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
            <label className="block text-sm font-medium mb-1">Plot name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. Plot B – East field"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. PLOT-B"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Area (hectares)</label>
              <input
                type="number"
                step="0.01"
                value={form.area_hectares}
                onChange={(e) => setForm((f) => ({ ...f, area_hectares: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Soil type</label>
            <input
              value={form.soil_type}
              onChange={(e) => setForm((f) => ({ ...f, soil_type: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-uyih-green hover:bg-uyih-green-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Create plot'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : plots.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
          No plots found{form.school_id ? ' for this school' : ''}.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Area</th>
                <th className="px-4 py-3 font-medium">Soil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plots.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.name}</div>
                    {p.code && (
                      <div className="text-xs text-slate-500 font-mono">{p.code}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{p.school_name || '—'}</td>
                  <td className="px-4 py-3">
                    {p.area_hectares != null ? `${p.area_hectares} ha` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.soil_type || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}