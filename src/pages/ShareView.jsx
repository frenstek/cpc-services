import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Car, Camera, CheckCircle2, Shield, Clock,
  Calendar, Loader2, Download, X, ChevronLeft, ChevronRight,
  MessageSquare, Image, AlertTriangle,
} from 'lucide-react'
import { fetchSharedVehicle } from '../lib/api'
import CompareView from '../components/CompareView'

export default function ShareView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    fetchSharedVehicle(token)
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  // Auto-refresh every 30s so customer sees live updates
  useEffect(() => {
    if (!data) return
    const interval = setInterval(() => {
      fetchSharedVehicle(token).then(d => setData(d)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [token, !!data])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 size={28} className="mx-auto animate-spin text-slate-400" />
          <p className="mt-4 text-sm text-slate-400">Loading report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6">
        <div className="max-w-sm text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-red-400" />
          <h1 className="text-lg font-bold text-slate-900">Link Expired</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'This link is no longer available.'}</p>
        </div>
      </div>
    )
  }

  const { vehicle, share } = data
  const photos = vehicle.photos || []
  const comments = vehicle.comments || []
  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')
  const allPhotos = [...beforePhotos, ...afterPhotos]

  // Build comparison pairs
  const comparePairs = []
  const afterByStep = {}
  afterPhotos.forEach(p => { if (p.step && !afterByStep[p.step]) afterByStep[p.step] = p })
  beforePhotos.forEach(p => { if (p.step && afterByStep[p.step]) comparePairs.push({ before: p, after: afterByStep[p.step], label: p.step_label || p.step }) })

  // Build timeline events
  const timeline = []
  timeline.push({ time: vehicle.created_at, icon: Car, color: 'bg-brand-500', title: 'Vehicle checked in', detail: `${vehicle.rego} — ${vehicle.vehicle_type || 'Vehicle'} ${vehicle.bay ? `at Bay ${vehicle.bay}` : ''}`.trim() })
  if (beforePhotos.length > 0) {
    const earliest = beforePhotos.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b)
    timeline.push({ time: earliest.created_at, icon: Camera, color: 'bg-brand-400', title: 'Before photos captured', detail: `${beforePhotos.length} photos documenting initial condition` })
  }
  comments.forEach(c => {
    timeline.push({ time: c.created_at, icon: MessageSquare, color: 'bg-violet-500', title: 'Note from worker', detail: c.content, author: c.author })
  })
  if (afterPhotos.length > 0) {
    const earliest = afterPhotos.reduce((a, b) => new Date(a.created_at) < new Date(b.created_at) ? a : b)
    timeline.push({ time: earliest.created_at, icon: Image, color: 'bg-emerald-500', title: 'After photos captured', detail: `${afterPhotos.length} photos documenting clean result` })
  }
  if (vehicle.status === 'completed' && vehicle.completed_at) {
    timeline.push({ time: vehicle.completed_at, icon: CheckCircle2, color: 'bg-emerald-600', title: 'Cleaning completed', detail: 'Vehicle has been cleaned and is ready for pickup' })
  }
  timeline.sort((a, b) => new Date(a.time) - new Date(b.time))

  function openLightbox(photo) { setLightbox(photo) }
  function navigateLightbox(dir) {
    if (!lightbox) return
    const idx = allPhotos.findIndex(p => p.id === lightbox.id)
    const next = (idx + dir + allPhotos.length) % allPhotos.length
    setLightbox(allPhotos[next])
  }

  async function handleDownloadPdf() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/reports?vehicle_id=${vehicle.id}`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CPC_Report_${vehicle.rego}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Failed to generate report')
    } finally {
      setDownloading(false)
    }
  }

  function formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDate(dateStr) {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function relativeTime(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const mins = Math.floor((now - d) / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return formatDate(dateStr)
  }

  const isClean = vehicle.status === 'completed'

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 cursor-pointer"><X size={20} /></button>
          {allPhotos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); navigateLightbox(-1) }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer"><ChevronLeft size={24} /></button>
              <button onClick={e => { e.stopPropagation(); navigateLightbox(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 cursor-pointer"><ChevronRight size={24} /></button>
            </>
          )}
          <img src={lightbox.public_url} alt={lightbox.step_label || ''} className="max-h-[85vh] max-w-full rounded-lg object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A1628]">
              <Shield size={14} className="text-[#3CCBFB]" />
            </div>
            <span className="text-sm font-bold text-slate-800">CPC Services</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 size={12} />
            Verified
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-5 py-8">
        {/* Vehicle card */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                <Car size={22} className="text-brand-500" />
              </div>
              <div>
                <h1 className="font-mono text-xl font-bold tracking-wider text-slate-900">{vehicle.rego}</h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  {vehicle.vehicle_type && <span>{vehicle.vehicle_type}</span>}
                  {vehicle.vehicle_type && vehicle.bay && <span> — </span>}
                  {vehicle.bay && <span>Bay {vehicle.bay}</span>}
                </p>
              </div>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              isClean ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isClean ? 'Cleaned' : 'In Progress'}
            </span>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar size={11} />
            {formatDate(vehicle.created_at)}
          </p>
        </div>

        {/* Summary row — no damage stat for customer */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl bg-slate-50 py-3">
            <p className="text-lg font-bold text-brand-600">{beforePhotos.length}</p>
            <p className="text-[10px] font-medium text-slate-400">Before</p>
          </div>
          <div className="rounded-xl bg-slate-50 py-3">
            <p className="text-lg font-bold text-emerald-600">{afterPhotos.length}</p>
            <p className="text-[10px] font-medium text-slate-400">After</p>
          </div>
        </div>

        {/* Live Timeline */}
        {timeline.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Clock size={14} />
              Live Timeline
            </h2>
            <div className="relative ml-3 border-l-2 border-slate-200 pl-6">
              {timeline.map((event, i) => {
                const Icon = event.icon
                return (
                  <div key={i} className="relative pb-6 last:pb-0">
                    {/* Dot */}
                    <div className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${event.color}`}>
                      <Icon size={10} className="text-white" />
                    </div>
                    {/* Content */}
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{event.detail}</p>
                      {event.author && (
                        <p className="mt-1 text-[11px] font-medium text-violet-600">— {event.author}</p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-300">{relativeTime(event.time)} · {formatTime(event.time)}</p>
                    </div>
                  </div>
                )
              })}
              {/* Live indicator if not completed */}
              {!isClean && (
                <div className="relative pb-0">
                  <div className="absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                  </div>
                  <p className="text-xs font-medium text-amber-600">In progress...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Worker Notes */}
        {comments.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
              <MessageSquare size={14} />
              Worker Notes
            </h2>
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-700">{c.content}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">{c.author || 'Staff'}</span>
                    <span className="text-[10px] text-slate-300">{relativeTime(c.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vehicle notes from worker entry */}
        {vehicle.notes && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Observations</h2>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm text-slate-600">{vehicle.notes}</p>
            </div>
          </div>
        )}

        {/* Before/After Comparison */}
        {comparePairs.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Before & After</h2>
            <div className="space-y-4">
              {comparePairs.slice(0, 3).map((pair, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-slate-200">
                  <CompareView beforeUrl={pair.before.public_url} afterUrl={pair.after.public_url} />
                  <p className="bg-slate-50 px-4 py-2 text-center text-xs font-medium text-slate-500">{pair.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-slate-700">Before Cleaning</h2>
            <div className="grid grid-cols-3 gap-2">
              {beforePhotos.map(p => (
                <button key={p.id} onClick={() => openLightbox(p)} className="overflow-hidden rounded-xl cursor-pointer">
                  <img src={p.public_url} alt={p.step_label || ''} className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* After Photos */}
        {afterPhotos.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-slate-700">After Cleaning</h2>
            <div className="grid grid-cols-3 gap-2">
              {afterPhotos.map(p => (
                <button key={p.id} onClick={() => openLightbox(p)} className="overflow-hidden rounded-xl cursor-pointer">
                  <img src={p.public_url} alt={p.step_label || ''} className="aspect-square w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        {photos.length === 0 && (
          <div className="mt-10 py-12 text-center">
            <Camera className="mx-auto mb-3 h-8 w-8 text-slate-200" />
            <p className="text-sm text-slate-400">Photos will appear here once captured</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t border-slate-100 pt-6 text-center">
          <p className="text-[11px] text-slate-300">
            Report by CPC Services — expires {share?.expires_at ? new Date(share.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </div>

      {/* Download button */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-center px-5 py-3">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A1628] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0F1D32] disabled:opacity-60 sm:w-auto sm:px-8 cursor-pointer"
          >
            {downloading ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Download size={16} /> Download PDF</>}
          </button>
        </div>
      </div>
    </div>
  )
}
