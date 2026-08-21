import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface Nursery {
  id: string
  name: string
  school_name?: string
}

interface Species {
  id: string
  common_name: string
  scientific_name: string
}

interface SeedBatch {
  id: string
  batch_code: string
  species_name?: string
  nursery_name?: string
  quantity_sown?: number
  germination_count?: number
  germination_rate?: number
  status?: string
  sowing_date?: string
}

export default function AdminSeedBatches() {
  const { token, user } = useAuth()
  const [searchParams] = useSearchParams()
  const nurseryIdParam = searchParams.get('nursery_id') || ''

  const [nurseries, setNurseries] = useState<Nursery[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [batches, setBatches] = useState<SeedBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    nursery_id: nurseryIdParam,
    species_id: '',
    batch_code: '',
    quantity_sown: '',
    germination_count: '',
    sowing_date: '',
    status: 'sown',
  })

  const canEdit =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'field_team'

  useEffect(() => {
    if (!token) return
    Promise.all([
      api<{ nurseries: Nursery[] }>('/api/v1/nurseries', {}, token),
      api<{ species: Species[] }>('/api/v1/species', {}, token),
    ])
      .then(([n, s]) => {
        setNurseries(n.nurseries)
        setSpecies(s.species)
      })
      .catch((err) => setError(err.message))
  }, [token])

  useEffect(() => {
    if (nurseryIdParam) setForm((f) => ({ ...f, nursery_id: nurseryIdParam }))
  }, [nurseryIdParam])

  const load = () => {
    if (!token) return
    setLoading(true)
    const q = form.nursery_id || nurseryIdParam
    const url = q
      ? `/api/v1/seed-batches?nursery_id=${q}`
      : '/api/v1/seed-batches'

    api<{ seed_batches: SeedBatch[] }>(url, {}, token)
      .then((res) => setBatches(res.seed_batches))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [token, form.nursery_id, nurseryIdParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      await api(
        '/api/v1/seed-batches',
        {
          method: 'POST',
          body: JSON.stringify({
            nursery_id: form.nursery_id,
            species_id: form.species_id,
            batch_code: form.batch_code,
            quantity_sown: form.quantity_sown
              ? parseInt(form.quantity_sown, 10)
              : undefined,
            germination_count: form.germination_count
              ? parseInt(form.germination_count, 10)
              : undefined,
            sowing_date: form.sowing_date || undefined,
            status: form.status,
          }),
        },
        token
      )
      setSuccess('Seed batch created')
      setForm((f) => ({
        ...f,
        batch_code: '',
        quantity_sown: '',
        germination_count: '',
        sowing_date: '',
      }))
      setShowForm(false)
      load()
    } catch (err: any) {
      setError(err.message || 'Failed to create batch')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/admin/nurseries" className="text-sm text-uyih-green hover:underline">
            ← Nurseries
          </Link>
          <h1 className="text-2xl font-bold text-uyih-green mt-1">Seed batches</h1>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-uyih-orange hover:bg-uyih-orange-light text-white text-sm px-4 py-2 rounded-lg"
          >
            {showForm ? 'Cancel' : 'Add batch'}
          </button>
        )}
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
            <label className="block text-sm font-medium mb-1">Nursery *</label>
            <select
              required
              value={form.nursery_id}
              onChange={(e) => setForm((f) => ({ ...f, nursery_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select nursery...</option>
              {nurseries.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                  {n.school_name ? ` (${n.school_name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Species *</label>
            <select
              required
              value={form.species_id}
              onChange={(e) => setForm((f) => ({ ...f, species_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select species...</option>
              {species.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.common_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Batch code *</label>
            <input
              required
              value={form.batch_code}
              onChange={(e) => setForm((f) => ({ ...f, batch_code: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="e.g. CROTON-2026-01"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Quantity sown</label>
              <input
                type="number"
                value={form.quantity_sown}
                onChange={(e) => setForm((f) => ({ ...f, quantity_sown: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Germination count</label>
              <input
                type="number"
                value={form.germination_count}
                onChange={(e) =>
                  setForm((f) => ({ ...f, germination_count: e.target.value }))
                }
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Sowing date</label>
              <input
                type="date"
                value={form.sowing_date}
                onChange={(e) => setForm((f) => ({ ...f, sowing_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="sown">Sown</option>
                <option value="germinating">Germinating</option>
                <option value="ready">Ready</option>
                <option value="transplanted">Transplanted</option>
                <option value="depleted">Depleted</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-uyih-green hover:bg-uyih-green-dark text-white font-medium py-2.5 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Saving...' : 'Create batch'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : batches.length === 0 ? (
        <div className="bg-white border rounded-xl p-6 text-center text-slate-500">
          No seed batches yet.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Species</th>
                <th className="px-4 py-3 font-medium">Nursery</th>
                <th className="px-4 py-3 font-medium">Germination</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{b.batch_code}</td>
                  <td className="px-4 py-3">{b.species_name || '—'}</td>
                  <td className="px-4 py-3">{b.nursery_name || '—'}</td>
                  <td className="px-4 py-3">
                    {b.germination_count != null && b.quantity_sown != null
                      ? `${b.germination_count}/${b.quantity_sown}`
                      : '—'}
                    {b.germination_rate != null && (
                      <span className="text-xs text-slate-500 ml-1">
                        ({b.germination_rate}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{b.status || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}