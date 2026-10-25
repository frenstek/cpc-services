import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, Car, Image } from 'lucide-react'
import Badge from './Badge'

export default function SearchModal({ open, onClose, siteId }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const navigate = useNavigate()

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults(null)
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ q: q.trim() })
      if (siteId) params.append('site_id', siteId)
      const res = await fetch(`/api/search?${params}`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error('Search error:', err)
      setResults({ vehicles: [], photos: [] })
    } finally {
      setLoading(false)
    }
  }, [siteId])

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => doSearch(val), 300)
  }

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function handleVehicleClick(vehicle) {
    const sid = siteId || vehicle.site_id
    if (sid) {
      navigate(`/site/${sid}/vehicles/${vehicle.id}`)
    }
    onClose()
  }

  function handlePhotoClick(photo) {
    const sid = siteId || photo.site_id
    if (sid && photo.vehicle_id) {
      navigate(`/site/${sid}/vehicles/${photo.vehicle_id}`)
    }
    onClose()
  }

  // Enter key navigates to first result
  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Enter' && results) {
      if (results.vehicles?.length > 0) {
        handleVehicleClick(results.vehicles[0])
      } else if (results.photos?.length > 0) {
        handlePhotoClick(results.photos[0])
      }
    }
  }

  const hasResults = results && (results.vehicles?.length > 0 || results.photos?.length > 0)
  const noResults = results && !hasResults && query.trim().length >= 2

  const statusColor = {
    checked_in: 'emerald',
    in_progress: 'amber',
    completed: 'brand',
    checked_out: 'slate',
  }

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'search-in 0.15s ease-out' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={20} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search vehicles, photos..."
            className="flex-1 text-lg text-slate-800 placeholder:text-slate-300 outline-none bg-transparent"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          )}

          {/* Results list */}
          {!loading && hasResults && (
            <div className="py-2">
              {/* Vehicles */}
              {results.vehicles?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2">
                    <Car size={14} className="text-slate-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vehicles</span>
                    <span className="text-[11px] text-slate-300">{results.vehicles.length}</span>
                  </div>
                  {results.vehicles.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleVehicleClick(v)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                        <Car size={16} className="text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-slate-800">{v.rego}</span>
                          <Badge color={statusColor[v.status] || 'slate'}>
                            {v.status?.replace('_', ' ') || 'unknown'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {v.bay && `Bay ${v.bay} · `}
                          {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Photos */}
              {results.photos?.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-5 py-2 mt-1">
                    <Image size={14} className="text-slate-400" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Photos</span>
                    <span className="text-[11px] text-slate-300">{results.photos.length}</span>
                  </div>
                  {results.photos.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePhotoClick(p)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {p.public_url ? (
                        <img
                          src={p.public_url}
                          alt={p.step_label}
                          className="h-9 w-9 shrink-0 rounded-lg object-cover bg-slate-100"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                          <Image size={16} className="text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-800 truncate">{p.step_label || `Step ${p.step}`}</span>
                          <Badge color={p.type === 'before' ? 'amber' : p.type === 'after' ? 'emerald' : 'slate'}>
                            {p.type || 'photo'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {p.damage_flag && 'Damage · '}
                          {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No results */}
          {!loading && noResults && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Search size={32} className="text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">No results found</p>
              <p className="text-[12px] text-slate-400 mt-1">
                No matches for "<span className="font-medium text-slate-500">{query.trim()}</span>"
              </p>
            </div>
          )}

          {/* Initial state */}
          {!loading && !results && query.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Search size={32} className="text-slate-200 mb-3" />
              <p className="text-sm text-slate-400">Type to search vehicles and photos</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes search-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  )
}
