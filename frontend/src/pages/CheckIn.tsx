import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

interface Tree {
  id: string
  qr_code: string
  status: string
  species?: string
  scientific_name?: string
  plot_name?: string
  school_name?: string
  current_height_cm?: number
  current_dbh_cm?: number
  last_check_in_at?: string
}

const HEALTH_OPTIONS = [
  { value: 'healthy', label: 'Healthy' },
  { value: 'stressed', label: 'Stressed' },
  { value: 'diseased', label: 'Diseased' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'dead', label: 'Dead' },
  { value: 'missing', label: 'Missing' },
]

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export default function CheckIn() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)

  const [qrInput, setQrInput] = useState('')
  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    health_status: 'healthy',
    height_cm: '',
    dbh_cm: '',
    notes: '',
    latitude: '',
    longitude: '',
    accuracy_m: '',
  })

  // Auto-lookup from ?qr=
  useEffect(() => {
    const qr = searchParams.get('qr')
    if (!qr || !token) return

    setQrInput(qr)
    setLoading(true)
    setError(null)

    const code = qr.trim().toUpperCase()
    api<{ tree: Tree }>(`/api/v1/trees/qr/${code}`, {}, token)
      .then((res) => setTree(res.tree))
      .catch((err) => setError(err.message || 'Tree not found'))
      .finally(() => setLoading(false))
  }, [searchParams, token])

  const lookupTree = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!qrInput.trim()) return

    setError(null)
    setSuccess(false)
    setTree(null)
    setPhotoPreview(null)
    setPhotoUrl(null)
    setLoading(true)

    try {
      const code = qrInput.trim().toUpperCase()
      const res = await api<{ tree: Tree }>(`/api/v1/trees/qr/${code}`, {}, token)
      setTree(res.tree)
    } catch (err: any) {
      setError(err.message || 'Tree not found')
    } finally {
      setLoading(false)
    }
  }

  const captureGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported')
      return
    }
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

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return

    // Local preview
    const preview = URL.createObjectURL(file)
    setPhotoPreview(preview)
    setPhotoUrl(null)
    setError(null)
    setUploading(true)

    try {
      const body = new FormData()
      body.append('photo', file)

      const res = await fetch(`${API_BASE}/api/v1/uploads`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error || 'Upload failed')
      }

      const data = await res.json()
      setPhotoUrl(data.url)
    } catch (err: any) {
      setError(err.message || 'Photo upload failed')
      setPhotoPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tree) return

    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      const body: any = {
        tree_id: tree.id,
        health_status: form.health_status,
        notes: form.notes || undefined,
        client_id: crypto.randomUUID(),
        photo_urls: photoUrl ? [photoUrl] : [],
      }

      if (form.height_cm) body.height_cm = parseFloat(form.height_cm)
      if (form.dbh_cm) body.dbh_cm = parseFloat(form.dbh_cm)
      if (form.latitude) body.latitude = parseFloat(form.latitude)
      if (form.longitude) body.longitude = parseFloat(form.longitude)
      if (form.accuracy_m) body.accuracy_m = parseFloat(form.accuracy_m)

      await api('/api/v1/check-ins', {
        method: 'POST',
        body: JSON.stringify(body),
      }, token)

      setSuccess(true)

      const refreshed = await api<{ tree: Tree }>(
        `/api/v1/trees/qr/${tree.qr_code}`,
        {},
        token
      )
      setTree(refreshed.tree)

      setForm((f) => ({
        ...f,
        height_cm: '',
        dbh_cm: '',
        notes: '',
      }))
      setPhotoPreview(null)
      setPhotoUrl(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err: any) {
      setError(err.message || 'Check-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-uyih-green">Tree Check-in</h1>

      <form onSubmit={lookupTree} className="bg-white p-4 rounded-xl border shadow-sm space-y-3">
        <label className="block text-sm font-medium">Tree QR Code</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            placeholder="e.g. UYIH-A1B2C3D4"
            className="flex-1 border rounded-lg px-3 py-2 font-mono text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-uyih-green hover:bg-uyih-green-dark text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? '...' : 'Find'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm font-medium">
          Check-in saved successfully
        </div>
      )}

      {tree && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <p className="font-mono font-bold text-lg">{tree.qr_code}</p>
            <p className="text-sm text-slate-600">
              {tree.species || tree.scientific_name} · {tree.plot_name} · {tree.school_name}
            </p>
            <p className="text-sm mt-1">
              Status: <span className="font-medium">{tree.status}</span>
              {tree.current_height_cm != null && (
                <> · Height: {tree.current_height_cm} cm</>
              )}
            </p>
            {tree.last_check_in_at && (
              <p className="text-xs text-slate-500 mt-1">
                Last check-in: {new Date(tree.last_check_in_at).toLocaleString()}
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-xl border shadow-sm space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-1">Health status</label>
              <select
                required
                value={form.health_status}
                onChange={(e) => setForm((f) => ({ ...f, health_status: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2"
              >
                {HEALTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Photo */}
            <div>
              <label className="block text-sm font-medium mb-1">Photo</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhotoSelected}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-uyih-green file:text-white
                  hover:file:bg-uyih-green-dark"
              />
              {uploading && (
                <p className="text-xs text-slate-500 mt-1">Uploading...</p>
              )}
              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mt-2 rounded-lg max-h-48 object-cover border"
                />
              )}
              {photoUrl && !uploading && (
                <p className="text-xs text-green-700 mt-1">Photo uploaded</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.height_cm}
                  onChange={(e) => setForm((f) => ({ ...f, height_cm: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">DBH (cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.dbh_cm}
                  onChange={(e) => setForm((f) => ({ ...f, dbh_cm: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">GPS (optional)</label>
              <button
                type="button"
                onClick={captureGps}
                className="mb-2 text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
              >
                Capture GPS
              </button>
              {(form.latitude || form.longitude) && (
                <p className="text-xs text-slate-500">
                  {form.latitude}, {form.longitude}
                  {form.accuracy_m && ` (±${form.accuracy_m} m)`}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                rows={2}
                placeholder="Optional observations"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || uploading}
              className="w-full bg-uyih-orange hover:bg-uyih-orange-light text-white font-medium py-3 rounded-lg disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Submit Check-in'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}