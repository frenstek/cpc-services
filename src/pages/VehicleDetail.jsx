import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { fetchVehicle, deleteVehicle, createShareLink, updateVehicle } from '../lib/api'
import {
  ArrowLeft, Car, Camera, CheckCircle2, Clock, AlertTriangle,
  Loader2, Trash2, Share2, ExternalLink, Copy, Check, X,
  Calendar, MapPin, FileText, QrCode,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function VehicleDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetchVehicle(id)
      .then(data => setVehicle(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteVehicle(id)
      navigate('/vehicles')
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  async function handleShare() {
    setSharing(true)
    try {
      const result = await createShareLink(id)
      const url = `${window.location.origin}/share/${result.token}`
      setShareUrl(url)
    } catch (err) {
      alert(`Share failed: ${err.message}`)
    } finally {
      setSharing(false)
    }
  }

  async function handleMarkComplete() {
    try {
      await updateVehicle(id, { status: 'completed' })
      setVehicle(prev => ({ ...prev, status: 'completed' }))
    } catch (err) {
      alert(`Failed: ${err.message}`)
    }
  }

  function handleCopy() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (error || !vehicle) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">Vehicle not found</p>
        <p className="mt-1 text-xs text-slate-400">{error}</p>
        <Link
          to="/vehicles"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft size={14} />
          Back to Vehicles
        </Link>
      </div>
    )
  }

  const photos = vehicle.photos || []
  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')
  const damagePhotos = photos.filter(p => p.damage_flag)
  const isCompleted = vehicle.status === 'completed'

  return (
    <div className="space-y-6">
      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxPhoto.public_url || lightboxPhoto.publicUrl}
            alt={lightboxPhoto.step_label || lightboxPhoto.step}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${
                lightboxPhoto.type === 'before' ? 'bg-brand-500' : 'bg-emerald-600'
              }`}>
                {lightboxPhoto.type}
              </span>
              <span className="text-xs font-medium text-white">
                {lightboxPhoto.step_label || lightboxPhoto.step}
              </span>
              {lightboxPhoto.damage_flag && (
                <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                  <AlertTriangle size={10} /> Damage
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to="/vehicles"
            className="mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-slate-900">{vehicle.rego}</h1>
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                isCompleted
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {new Date(vehicle.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {vehicle.bay && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  Bay {vehicle.bay}
                </span>
              )}
              {vehicle.vehicle_type && (
                <span className="flex items-center gap-1">
                  <Car size={12} />
                  {vehicle.vehicle_type}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <button
              onClick={handleMarkComplete}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} />
              Mark Complete
            </button>
          )}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
            Share
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </div>

      {/* Share URL (shown after generating) */}
      {shareUrl && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            {/* QR Code */}
            <div className="shrink-0 rounded-xl bg-white p-4 shadow-sm">
              <QRCodeSVG value={shareUrl} size={160} level="M" />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <QrCode size={16} className="text-brand-600" />
                <p className="text-sm font-bold text-slate-900">Share Report with Client</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Scan the QR code or share the link below with the client to view the vehicle cleaning report.
              </p>

              {/* Link + Copy */}
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-3 py-2 overflow-hidden">
                <ExternalLink size={12} className="shrink-0 text-brand-600" />
                <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-brand-700">{shareUrl}</p>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            Delete this vehicle record and all {photos.length} photos? This cannot be undone.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Notes */}
      {vehicle.notes && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FileText size={12} /> Notes
          </p>
          <p className="text-sm text-slate-700">{vehicle.notes}</p>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-brand-600">{beforePhotos.length}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Before Photos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-emerald-600">{afterPhotos.length}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">After Photos</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
          <p className={`text-2xl font-bold ${damagePhotos.length > 0 ? 'text-red-600' : 'text-slate-300'}`}>
            {damagePhotos.length}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">Damage Flagged</p>
        </div>
      </div>

      {/* Before Photos */}
      <PhotoSection
        title="Before Photos"
        photos={beforePhotos}
        color="brand"
        onPhotoClick={setLightboxPhoto}
      />

      {/* After Photos */}
      <PhotoSection
        title="After Photos"
        photos={afterPhotos}
        color="emerald"
        onPhotoClick={setLightboxPhoto}
      />

      {/* Damage Flagged */}
      {damagePhotos.length > 0 && (
        <PhotoSection
          title="Damage Flagged"
          photos={damagePhotos}
          color="red"
          onPhotoClick={setLightboxPhoto}
        />
      )}

      {/* No photos */}
      {photos.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Camera className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No photos captured yet</p>
          <Link
            to="/capture"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <Camera size={14} />
            Start Capture
          </Link>
        </div>
      )}
    </div>
  )
}

function PhotoSection({ title, photos, color, onPhotoClick }) {
  if (photos.length === 0) return null

  const colorMap = {
    brand: { dot: 'bg-brand-500', text: 'text-brand-600', badge: 'bg-brand-500/90' },
    emerald: { dot: 'bg-emerald-500', text: 'text-emerald-600', badge: 'bg-emerald-600/90' },
    red: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-500/90' },
  }
  const c = colorMap[color]

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className={`mb-4 flex items-center gap-2 text-sm font-bold ${c.text}`}>
        <div className={`h-2 w-2 rounded-full ${c.dot}`} />
        {title} ({photos.length})
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {photos.map(photo => (
          <button
            key={photo.id}
            onClick={() => onPhotoClick(photo)}
            className="group relative overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"
          >
            <img
              src={photo.public_url || photo.publicUrl}
              alt={photo.step_label || photo.step}
              className="aspect-square w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-white">
                  {photo.step_label || photo.step}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase text-white ${c.badge}`}>
                  {photo.type}
                </span>
              </div>
            </div>
            {photo.damage_flag && (
              <div className="absolute left-2 top-2">
                <span className="flex items-center gap-0.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <AlertTriangle size={8} /> DMG
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
