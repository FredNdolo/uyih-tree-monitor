import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
  planting_date?: string
  last_check_in_at?: string
  latitude?: number
  longitude?: number
  notes?: string
}

interface CheckIn {
  id: string
  checked_at: string
  health_status: string
  height_cm?: number
  dbh_cm?: number
  notes?: string
  photo_urls?: string[] | string
  checked_by_name?: string
  latitude?: number
  longitude?: number
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function photoSrc(url: string) {
  if (url.startsWith('http')) return url
  return `${API_BASE}${url}`
}

function parsePhotoUrls(raw: string[] | string | undefined): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function TreeDetail() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const qrParam = searchParams.get('qr')
  const { token } = useAuth()

  const [tree, setTree] = useState<Tree | null>(null)
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        let treeData: Tree

        if (id) {
          const res = await api<{ tree: Tree }>(`/api/v1/trees/${id}`, {}, token)
          treeData = res.tree
        } else if (qrParam) {
          const res = await api<{ tree: Tree }>(
            `/api/v1/trees/qr/${qrParam.toUpperCase()}`,
            {},
            token
          )
          treeData = res.tree
        } else {
          throw new Error('No tree id or QR provided')
        }

        setTree(treeData)

        const ci = await api<{ check_ins: CheckIn[] }>(
          `/api/v1/check-ins?tree_id=${treeData.id}&limit=50`,
          {},
          token
        )
        setCheckIns(ci.check_ins)
      } catch (err: any) {
        setError(err.message || 'Failed to load tree')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, qrParam, token])

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading tree...</div>
  }

  if (error || !tree) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error || 'Tree not found'}
        </div>
        <Link to="/dashboard" className="text-uyih-green text-sm mt-4 inline-block">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-uyih-green hover:underline">
          ← Dashboard
        </Link>
        <Link
          to={`/trees/check-in?qr=${tree.qr_code}`}
          className="bg-uyih-orange hover:bg-uyih-orange-light text-white text-sm px-4 py-2 rounded-lg"
        >
          New Check-in
        </Link>
      </div>

      {/* Tree summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <p className="font-mono text-xl font-bold text-uyih-green">{tree.qr_code}</p>
        <p className="text-slate-600 mt-1">
          {tree.species || tree.scientific_name}
          {tree.scientific_name && tree.species ? ` (${tree.scientific_name})` : ''}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {tree.plot_name} · {tree.school_name}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Status</p>
            <p className="font-medium capitalize">{tree.status}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Height</p>
            <p className="font-medium">
              {tree.current_height_cm != null ? `${tree.current_height_cm} cm` : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">DBH</p>
            <p className="font-medium">
              {tree.current_dbh_cm != null ? `${tree.current_dbh_cm} cm` : '—'}
            </p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Planted</p>
            <p className="font-medium">
              {tree.planting_date
                ? new Date(tree.planting_date).toLocaleDateString()
                : '—'}
            </p>
          </div>
        </div>

        {tree.latitude != null && tree.longitude != null && (
          <p className="text-xs text-slate-500 mt-3">
            GPS: {tree.latitude}, {tree.longitude}
          </p>
        )}
      </div>

      {/* Check-in history */}
      <section>
        <h2 className="text-lg font-semibold mb-3">
          Check-in history ({checkIns.length})
        </h2>

        {checkIns.length === 0 && (
          <div className="bg-white border rounded-xl p-6 text-center text-slate-500 text-sm">
            No check-ins yet.{' '}
            <Link
              to={`/trees/check-in?qr=${tree.qr_code}`}
              className="text-uyih-green underline"
            >
              Record the first one
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {checkIns.map((c) => {
            const photos = parsePhotoUrls(c.photo_urls)
            return (
              <div
                key={c.id}
                className="bg-white border rounded-xl p-4 shadow-sm space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium capitalize">{c.health_status}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(c.checked_at).toLocaleString()}
                      {c.checked_by_name ? ` · ${c.checked_by_name}` : ''}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {c.height_cm != null && <span>H: {c.height_cm} cm</span>}
                    {c.dbh_cm != null && (
                      <span className="ml-2">DBH: {c.dbh_cm} cm</span>
                    )}
                  </div>
                </div>

                {c.notes && (
                  <p className="text-sm text-slate-600">{c.notes}</p>
                )}

                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {photos.map((url) => (
                      <a
                        key={url}
                        href={photoSrc(url)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={photoSrc(url)}
                          alt="Check-in"
                          className="h-28 w-28 object-cover rounded-lg border hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}