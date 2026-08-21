import { useEffect, useState } from 'react'
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
  school_id: string
  school_name?: string
}

interface Species {
  id: string
  common_name: string
  scientific_name: string
}

export default function RegisterTree() {
  const { token } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [plots, setPlots] = useState<Plot[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<any>(null)

  const [form, setForm] = useState({
    school_id: '',
    plot_id: '',
    species_id: '',
    latitude: '',
    longitude: '',
    accuracy_m: '',
    notes: '',
  })

  // Load schools + species on mount
  useEffect(() => {
    if (!token) return

    Promise.all([
      api<{ schools: School[] }>('/api/v1/schools', {}, token),
      api<{ species: Species[] }>('/api/v1/species', {}, token),
    ])
      .then(([schoolsRes, speciesRes]) => {
        setSchools(schoolsRes.schools)
        setSpecies(speciesRes.species)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  // Load plots when school changes
  useEffect(() => {
    if (!token || !form.school_id) {
      setPlots([])
      return
    }

    api<{ plots: Plot[] }>(`/api/v1/plots?school_id=${form.school_id}`, {}, token)
      .then((res) => setPlots(res.plots))
      .catch((err) => setError(err.message))
  }, [token, form.school_id])

  const captureGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser')
      return
    }

    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
          accuracy_m: pos.coords.accuracy ? pos.coords.accuracy.toFixed(1) : '',
        }))
      },
      (err) => setError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)

    try {
      const body = {
        plot_id: form.plot_id,
        species_id: form.species_id,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        accuracy_m: form.accuracy_m ? parseFloat(form.accuracy_m) : undefined,
        notes: form.notes || undefined,
      }

      const res = await api<{ tree: any }>('/api/v1/trees', {
        method: 'POST',
        body: JSON.stringify(body),
      }, token)

      setSuccess(res.tree)
      // Reset form partially
      setForm((f) => ({
        ...f,
        notes: '',
        latitude: '',
        longitude: '',
        accuracy_m: '',
      }))
    } catch (err: any) {
      setError(err.message || 'Failed to register tree')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-uyih-green mb-6">Register Tree</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="font-semibold text-green-800">Tree registered!</p>
          <p className="text-sm mt-1">
            QR Code: <span className="font-mono font-bold">{success.qr_code}</span>
          </p>
          <p className="text-sm text-green-700">
            {success.species} · {success.plot_name} · {success.school_name}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-xl shadow-sm border">
        {/* School */}
        <div>
          <label className="block text-sm font-medium mb-1">School</label>
          <select
            required
            value={form.school_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, school_id: e.target.value, plot_id: '' }))
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select school...</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.county})
              </option>
            ))}
          </select>
        </div>

        {/* Plot */}
        <div>
          <label className="block text-sm font-medium mb-1">Plot</label>
          <select
            required
            value={form.plot_id}
            onChange={(e) => setForm((f) => ({ ...f, plot_id: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
            disabled={!form.school_id}
          >
            <option value="">Select plot...</option>
            {plots.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Species */}
        <div>
          <label className="block text-sm font-medium mb-1">Species</label>
          <select
            required
            value={form.species_id}
            onChange={(e) => setForm((f) => ({ ...f, species_id: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select species...</option>
            {species.map((s) => (
              <option key={s.id} value={s.id}>
                {s.common_name} ({s.scientific_name})
              </option>
            ))}
          </select>
        </div>

        {/* GPS */}
        <div>
          <label className="block text-sm font-medium mb-1">Location (GPS)</label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={captureGps}
              className="bg-uyih-green hover:bg-uyih-green-dark text-white px-4 py-2 rounded-lg text-sm"
            >
              Capture GPS
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Latitude"
              required
              value={form.latitude}
              onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Longitude"
              required
              value={form.longitude}
              onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {form.accuracy_m && (
            <p className="text-xs text-slate-500 mt-1">Accuracy: ±{form.accuracy_m} m</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            rows={2}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-uyih-orange hover:bg-uyih-orange-light text-white font-medium py-3 rounded-lg disabled:opacity-50"
        >
          {submitting ? 'Registering...' : 'Register Tree'}
        </button>
      </form>
    </div>
  )
}