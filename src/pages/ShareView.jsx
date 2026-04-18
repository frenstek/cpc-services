import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Car, Camera, CheckCircle2, Clock, AlertTriangle, Shield,
  Calendar, MapPin, Loader2, X, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { fetchSharedVehicle } from '../lib/api'

export default function ShareView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    fetchSharedVehicle(token)
      .then(d => setData(d))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto animate-spin text-brand-500" />
          <p className="mt-4 text-sm text-slate-500">Loading vehicle report...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Link Invalid or Expired</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'This share link is no longer available.'}</p>
        </div>
      </div>
    )
  }

  const { vehicle, share } = data
  const photos = vehicle.photos || []
  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')
  const damagePhotos = photos.filter(p => p.damage_flag)
  const allPhotos = [...beforePhotos, ...afterPhotos]

  function openLightbox(photo) {
    setLightbox(photo)
  }

  function navigateLightbox(dir) {
    if (!lightbox) return
    const idx = allPhotos.findIndex(p => p.id === lightbox.id)
    const next = (idx + dir + allPhotos.length) % allPhotos.length
    setLightbox(allPhotos[next])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          {allPhotos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); navigateLightbox(-1) }} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                <ChevronLeft size={24} />
              </button>
              <button onClick={e => { e.stopPropagation(); navigateLightbox(1) }} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20">
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <img
            src={lightbox.public_url}
            alt={lightbox.step_label || lightbox.step}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full bg-black/60 px-5 py-2.5 backdrop-blur">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase text-white ${
                lightbox.type === 'before' ? 'bg-brand-500' : 'bg-emerald-600'
              }`}>{lightbox.type}</span>
              <span className="text-sm font-medium text-white">{lightbox.step_label || lightbox.step}</span>
              {lightbox.damage_flag && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                  <AlertTriangle size={10} /> Damage Flagged
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A1628]">
              <Shield size={18} className="text-[#3CCBFB]" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">CPC Services</p>
              <p className="text-[11px] text-slate-400">Vehicle Cleaning Report</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Verified Report</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Vehicle Info */}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                <Car size={24} className="text-brand-600" />
              </div>
              <div>
                <h1 className="font-mono text-2xl font-bold tracking-wider text-slate-900">{vehicle.rego}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {vehicle.vehicle_type && <span className="rounded bg-slate-100 px-2 py-0.5 font-medium">{vehicle.vehicle_type}</span>}
                  {vehicle.bay && (
                    <span className="flex items-center gap-1"><MapPin size={10} /> Bay {vehicle.bay}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                vehicle.status === 'completed'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {vehicle.status === 'completed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                {vehicle.status === 'completed' ? 'Completed' : 'In Progress'}
              </span>
              <p className="mt-2 flex items-center justify-end gap-1 text-xs text-slate-400">
                <Calendar size={10} />
                {new Date(vehicle.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {vehicle.notes && (
            <div className="mt-6 rounded-lg bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-700">{vehicle.notes}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-brand-600">{beforePhotos.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Before Photos</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-emerald-600">{afterPhotos.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">After Photos</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
            <p className={`text-2xl font-bold ${damagePhotos.length > 0 ? 'text-red-600' : 'text-slate-300'}`}>{damagePhotos.length}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Damage Flagged</p>
          </div>
        </div>

        {/* Before Photos */}
        {beforePhotos.length > 0 && (
          <div className="mt-10">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-brand-500" />
              <h2 className="text-lg font-bold text-slate-900">Before Cleaning</h2>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-600">{beforePhotos.length} photos</span>
            </div>
            <p className="mb-4 text-sm text-slate-500">Photos taken before the vehicle cleaning process began.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {beforePhotos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onClick={() => openLightbox(photo)} />
              ))}
            </div>
          </div>
        )}

        {/* After Photos */}
        {afterPhotos.length > 0 && (
          <div className="mt-10">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-lg font-bold text-slate-900">After Cleaning</h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">{afterPhotos.length} photos</span>
            </div>
            <p className="mb-4 text-sm text-slate-500">Photos taken after the vehicle cleaning was completed.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {afterPhotos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onClick={() => openLightbox(photo)} />
              ))}
            </div>
          </div>
        )}

        {/* Damage section */}
        {damagePhotos.length > 0 && (
          <div className="mt-10">
            <div className="mb-5 flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <h2 className="text-lg font-bold text-slate-900">Damage Flagged</h2>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">{damagePhotos.length} photos</span>
            </div>
            <p className="mb-4 text-sm text-slate-500">These photos were flagged for existing damage observed during the inspection.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {damagePhotos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onClick={() => openLightbox(photo)} isDamage />
              ))}
            </div>
          </div>
        )}

        {photos.length === 0 && (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Camera className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">No photos have been captured yet</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-slate-200 pt-8 text-center">
          <p className="text-xs text-slate-400">
            This report was generated by <strong className="text-slate-600">CPC Services</strong> vehicle cleaning documentation system.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            All photos are timestamped and stored securely. This link expires on{' '}
            {share?.expires_at ? new Date(share.expires_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}.
          </p>
        </div>
      </div>
    </div>
  )
}

function PhotoCard({ photo, onClick, isDamage }) {
  return (
    <button onClick={onClick} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <img
        src={photo.public_url}
        alt={photo.step_label || photo.step}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white">{photo.step_label || photo.step}</span>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white ${
            isDamage ? 'bg-red-500/90' : photo.type === 'before' ? 'bg-brand-500/90' : 'bg-emerald-600/90'
          }`}>{isDamage ? 'DMG' : photo.type}</span>
        </div>
      </div>
      {photo.damage_flag && !isDamage && (
        <div className="absolute left-2 top-2">
          <span className="flex items-center gap-0.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <AlertTriangle size={8} /> DMG
          </span>
        </div>
      )}
    </button>
  )
}
