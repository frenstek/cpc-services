import { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  fetchVehicle, deleteVehicle, createShareLink, updateVehicle,
  uploadSignature, fetchSignatures, deleteSignature, uploadPhoto,
  createComment, deleteComment,
} from '../lib/api'
import {
  ArrowLeft, Car, Camera, CheckCircle2, Clock, AlertTriangle,
  Loader2, Trash2, Share2, ExternalLink, Copy, Check, X,
  Calendar, MapPin, FileText, QrCode, Image, PenTool,
  Plus, User, Briefcase, ChevronRight, History, Pencil, MessageSquare,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import Lightbox from '../components/Lightbox'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import CompareView from '../components/CompareView'
import SignaturePad from '../components/SignaturePad'
import PhotoAnnotator from '../components/PhotoAnnotator'

// ─── Tab definitions ────────────────────────────────────────────────────
const TABS = [
  { key: 'photos', label: 'Photos', icon: Image },
  { key: 'timeline', label: 'Timeline', icon: Clock },
  { key: 'signatures', label: 'Signatures', icon: PenTool },
]

// ─── Helpers ────────────────────────────────────────────────────────────
function photoUrl(p) {
  return p.public_url || p.publicUrl || ''
}

function relativeTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateTime(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function groupByDate(items) {
  const groups = {}
  items.forEach(item => {
    const key = new Date(item.date).toLocaleDateString('en-AU', {
      day: 'numeric', month: 'long', year: 'numeric',
    })
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })
  return groups
}

// ─── Main component ─────────────────────────────────────────────────────
export default function VehicleDetail() {
  const { id, siteId } = useParams()
  const navigate = useNavigate()
  const vehiclesPath = siteId ? `/site/${siteId}/vehicles` : '/'
  const capturePath = siteId ? `/site/${siteId}/capture` : '/'

  // Core state
  const [vehicle, setVehicle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Tabs
  const [activeTab, setActiveTab] = useState('photos')

  // Actions
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)

  // Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Signatures
  const [signatures, setSignatures] = useState([])
  const [signaturesLoading, setSignaturesLoading] = useState(false)
  const [signaturesLoaded, setSigLoaded] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [sigStep, setSigStep] = useState('info') // 'info' | 'draw'
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('staff')
  const [sigUploading, setSigUploading] = useState(false)
  const [deletingSigId, setDeletingSigId] = useState(null)

  // Comments
  const [newComment, setNewComment] = useState('')
  const [addingComment, setAddingComment] = useState(false)

  // Photo Annotator
  const [annotatingPhoto, setAnnotatingPhoto] = useState(null)
  const [annotationUploading, setAnnotationUploading] = useState(false)

  // ─── Fetch vehicle ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetchVehicle(id)
      .then(data => setVehicle(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  // ─── Lazy-load signatures when tab activates ─────────────────────────
  useEffect(() => {
    if (activeTab === 'signatures' && !signaturesLoaded) {
      setSignaturesLoading(true)
      fetchSignatures(id)
        .then(data => {
          setSignatures(data)
          setSigLoaded(true)
        })
        .catch(() => setSigLoaded(true))
        .finally(() => setSignaturesLoading(false))
    }
  }, [activeTab, id, signaturesLoaded])

  // Also fetch for timeline tab
  useEffect(() => {
    if (activeTab === 'timeline' && !signaturesLoaded) {
      fetchSignatures(id)
        .then(data => {
          setSignatures(data)
          setSigLoaded(true)
        })
        .catch(() => setSigLoaded(true))
    }
  }, [activeTab, id, signaturesLoaded])

  // ─── Derived data ────────────────────────────────────────────────────
  const photos = vehicle?.photos || []
  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')
  const damagePhotos = photos.filter(p => p.damage_flag)
  const isCompleted = vehicle?.status === 'completed'

  const allPhotos = useMemo(() =>
    photos.map(p => ({
      ...p,
      url: photoUrl(p),
      label: p.step_label || p.step,
    })),
    [photos]
  )

  // Find before/after pairs for CompareView
  const comparePair = useMemo(() => {
    for (const bp of beforePhotos) {
      const step = bp.step_label || bp.step
      const match = afterPhotos.find(ap => (ap.step_label || ap.step) === step)
      if (match) return { before: bp, after: match, step }
    }
    return null
  }, [beforePhotos, afterPhotos])

  // ─── Actions ─────────────────────────────────────────────────────────
  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteVehicle(id)
      navigate(vehiclesPath)
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

  function openLightbox(photo) {
    const idx = allPhotos.findIndex(p => p.id === photo.id)
    setLightboxIndex(idx >= 0 ? idx : 0)
    setLightboxOpen(true)
  }

  // ─── Signature handlers ──────────────────────────────────────────────
  function openSignatureModal() {
    setSigStep('info')
    setSignerName('')
    setSignerRole('staff')
    setShowSignatureModal(true)
  }

  function handleSignatureInfoNext() {
    if (!signerName.trim()) return
    setSigStep('draw')
  }

  async function handleSignatureSave(dataUrl) {
    setSigUploading(true)
    try {
      await uploadSignature({
        vehicleId: id,
        siteId,
        signerName: signerName.trim(),
        signerRole,
        fileData: dataUrl,
      })
      // Refresh signatures
      const fresh = await fetchSignatures(id)
      setSignatures(fresh)
      setShowSignatureModal(false)
    } catch (err) {
      alert(`Signature upload failed: ${err.message}`)
    } finally {
      setSigUploading(false)
    }
  }

  async function handleDeleteSignature(sigId) {
    if (!confirm('Delete this signature?')) return
    setDeletingSigId(sigId)
    try {
      await deleteSignature(sigId)
      setSignatures(prev => prev.filter(s => s.id !== sigId))
    } catch (err) {
      alert(`Delete failed: ${err.message}`)
    } finally {
      setDeletingSigId(null)
    }
  }

  // ─── Photo annotation handler ───────────────────────────────────────
  async function handleAnnotationSave(dataUrl) {
    setAnnotationUploading(true)
    try {
      await uploadPhoto({
        vehicleId: id,
        siteId,
        type: 'after',
        step: annotatingPhoto.step || 'annotated',
        stepLabel: `${annotatingPhoto.step_label || annotatingPhoto.step || 'Photo'} (Annotated)`,
        damageFlag: true,
        notes: 'Annotated damage photo',
        fileData: dataUrl,
        fileName: `annotated_${Date.now()}.jpg`,
      })
      // Refresh vehicle data
      const fresh = await fetchVehicle(id)
      setVehicle(fresh)
      setAnnotatingPhoto(null)
    } catch (err) {
      alert(`Upload annotated photo failed: ${err.message}`)
    } finally {
      setAnnotationUploading(false)
    }
  }

  // ─── Comment handlers ──────────────────────────────────────────────
  async function handleAddComment() {
    if (!newComment.trim()) return
    setAddingComment(true)
    try {
      await createComment({ vehicleId: id, content: newComment.trim(), author: 'Staff' })
      setNewComment('')
      const updated = await fetchVehicle(id)
      setVehicle(updated)
    } catch (err) {
      alert(`Failed to add note: ${err.message}`)
    } finally {
      setAddingComment(false)
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(commentId)
      const updated = await fetchVehicle(id)
      setVehicle(updated)
    } catch {}
  }

  // ─── Loading / Error states ──────────────────────────────────────────
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
          to={vehiclesPath}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft size={14} />
          Back to Vehicles
        </Link>
      </div>
    )
  }

  // ─── Build timeline entries ──────────────────────────────────────────
  function buildTimeline() {
    const entries = []

    // Vehicle created
    entries.push({
      date: vehicle.created_at,
      type: 'created',
      icon: Car,
      color: 'bg-brand-500',
      title: 'Vehicle record created',
      detail: `${vehicle.rego} registered${vehicle.bay ? ` — Bay ${vehicle.bay}` : ''}`,
    })

    // Photos
    const sortedPhotos = [...photos].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    sortedPhotos.forEach(p => {
      const isDamage = p.damage_flag
      entries.push({
        date: p.created_at,
        type: isDamage ? 'damage' : p.type,
        icon: isDamage ? AlertTriangle : Camera,
        color: isDamage ? 'bg-red-500' : p.type === 'before' ? 'bg-blue-500' : 'bg-emerald-500',
        title: isDamage
          ? `Damage flagged — ${p.step_label || p.step}`
          : `${p.type === 'before' ? 'Before' : 'After'} photo — ${p.step_label || p.step}`,
        detail: p.notes || null,
        thumbnail: photoUrl(p),
      })
    })

    // Signatures
    signatures.forEach(s => {
      entries.push({
        date: s.created_at,
        type: 'signature',
        icon: PenTool,
        color: 'bg-purple-500',
        title: `Signature — ${s.signer_name || s.signerName}`,
        detail: `Role: ${s.signer_role || s.signerRole}`,
      })
    })

    // Completed
    if (vehicle.completed_at) {
      entries.push({
        date: vehicle.completed_at,
        type: 'completed',
        icon: CheckCircle2,
        color: 'bg-green-500',
        title: 'Vehicle marked complete',
        detail: null,
      })
    }

    entries.sort((a, b) => new Date(a.date) - new Date(b.date))
    return entries
  }

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Photo Annotator */}
      {annotatingPhoto && (
        <PhotoAnnotator
          photoUrl={photoUrl(annotatingPhoto)}
          onSave={handleAnnotationSave}
          onCancel={() => setAnnotatingPhoto(null)}
        />
      )}

      {/* Annotation uploading indicator */}
      {annotationUploading && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow-xl">
            <Loader2 size={20} className="animate-spin text-brand-500" />
            <span className="text-sm font-semibold text-slate-700">Uploading annotated photo...</span>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <Lightbox
        photos={allPhotos}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            to={vehiclesPath}
            className="mt-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold text-slate-900">{vehicle.rego}</h1>
              <Badge color={isCompleted ? 'emerald' : 'amber'}>
                {isCompleted ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDateTime(vehicle.created_at)}
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

        <div className="flex flex-wrap items-center gap-2">
          {beforePhotos.length > 0 && afterPhotos.length === 0 && !isCompleted && (
            <Link to={`/site/${siteId}/capture?vehicle=${vehicle.id}&rego=${encodeURIComponent(vehicle.rego)}&type=after`}>
              <Button variant="primary" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                <Camera size={14} />
                Take After Photos
              </Button>
            </Link>
          )}
          {vehicle.rego && (
            <Link to={`/site/${siteId}/vehicles/history?rego=${encodeURIComponent(vehicle.rego)}`}>
              <Button variant="secondary" size="sm" type="button">
                <History size={14} />
                History
              </Button>
            </Link>
          )}
          {!isCompleted && (
            <Button variant="primary" size="sm" onClick={handleMarkComplete} className="bg-emerald-600 hover:bg-emerald-700">
              <CheckCircle2 size={14} />
              Mark Complete
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={handleShare} loading={sharing}>
            <Share2 size={14} />
            Share
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(true)} className="border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      </div>

      {/* Share URL */}
      {shareUrl && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
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
              <div className="mt-4 flex items-center gap-2 overflow-hidden rounded-lg border border-brand-200 bg-white px-3 py-2">
                <ExternalLink size={12} className="shrink-0 text-brand-600" />
                <p className="min-w-0 flex-1 truncate font-mono text-[11px] text-brand-700">{shareUrl}</p>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md bg-brand-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-600 cursor-pointer"
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
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              <Trash2 size={14} />
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
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

      {/* Worker Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
          <MessageSquare size={14} />
          Notes
        </h3>

        {/* Existing notes */}
        {(vehicle.comments || []).length > 0 && (
          <div className="mb-4 space-y-2">
            {(vehicle.comments || []).map(c => (
              <div key={c.id} className="flex items-start gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{c.content}</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {c.author || 'Staff'} &mdash; {relativeTime(c.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteComment(c.id)}
                  className="shrink-0 text-slate-300 hover:text-red-500 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add note form */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="Add a note..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            onKeyDown={e => e.key === 'Enter' && handleAddComment()}
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim() || addingComment}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40 cursor-pointer"
          >
            {addingComment ? <Loader2 size={14} className="animate-spin" /> : 'Add'}
          </button>
        </div>
      </div>

      {/* ─── Tab Bar ───────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex gap-1 rounded-t-xl border-b border-slate-200 bg-white">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors cursor-pointer ${
                active
                  ? 'border-b-2 border-brand-500 text-brand-600'
                  : 'border-b-2 border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ─── Photos Tab ────────────────────────────────────────────────── */}
      {activeTab === 'photos' && (
        <div className="space-y-6">
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

          {/* Compare View */}
          {comparePair && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
                <ChevronRight size={16} className="text-brand-500" />
                Compare Before / After
                <span className="font-normal text-slate-400">({comparePair.step})</span>
              </h3>
              <CompareView
                beforeUrl={photoUrl(comparePair.before)}
                afterUrl={photoUrl(comparePair.after)}
                beforeLabel="Before"
                afterLabel="After"
              />
            </div>
          )}

          {/* Before Photos */}
          <PhotoSection
            title="Before Photos"
            photos={beforePhotos}
            color="brand"
            onPhotoClick={openLightbox}
            onAnnotate={setAnnotatingPhoto}
          />

          {/* After Photos */}
          <PhotoSection
            title="After Photos"
            photos={afterPhotos}
            color="emerald"
            onPhotoClick={openLightbox}
            onAnnotate={setAnnotatingPhoto}
          />

          {/* Damage Flagged */}
          {damagePhotos.length > 0 && (
            <PhotoSection
              title="Damage Flagged"
              photos={damagePhotos}
              color="red"
              onPhotoClick={openLightbox}
              onAnnotate={setAnnotatingPhoto}
            />
          )}

          {/* No photos */}
          {photos.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <EmptyState
                icon={Camera}
                title="No photos captured yet"
                subtitle="Start a capture session to add before and after photos."
                action={
                  <Link
                    to={capturePath}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    <Camera size={14} />
                    Start Capture
                  </Link>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* ─── Timeline Tab ──────────────────────────────────────────────── */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {(() => {
            const entries = buildTimeline()
            if (entries.length === 0) {
              return (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <EmptyState
                    icon={Clock}
                    title="No activity yet"
                    subtitle="Activity will appear here as photos are captured and actions are taken."
                  />
                </div>
              )
            }

            const grouped = groupByDate(entries)

            return Object.entries(grouped).map(([dateLabel, items]) => (
              <div key={dateLabel}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {dateLabel}
                </p>
                <div className="relative ml-4 border-l-2 border-slate-200 pl-6 space-y-4">
                  {items.map((entry, i) => {
                    const Icon = entry.icon
                    return (
                      <div key={`${entry.date}-${i}`} className="relative">
                        {/* Dot */}
                        <div className={`absolute -left-[31px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${entry.color} ring-4 ring-white`} />

                        {/* Content card */}
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            {entry.thumbnail && (
                              <img
                                src={entry.thumbnail}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Icon size={14} className="shrink-0 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-800">{entry.title}</p>
                              </div>
                              {entry.detail && (
                                <p className="mt-0.5 text-xs text-slate-500">{entry.detail}</p>
                              )}
                              <p className="mt-1 text-[11px] text-slate-400">
                                {relativeTime(entry.date)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          })()}
        </div>
      )}

      {/* ─── Signatures Tab ────────────────────────────────────────────── */}
      {activeTab === 'signatures' && (
        <div className="space-y-6">
          {/* Add Signature button */}
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={openSignatureModal}>
              <Plus size={14} />
              Add Signature
            </Button>
          </div>

          {signaturesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : signatures.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <EmptyState
                icon={PenTool}
                title="No signatures yet"
                subtitle="Add a signature to confirm the vehicle inspection."
                action={
                  <Button variant="primary" size="sm" onClick={openSignatureModal}>
                    <Plus size={14} />
                    Add Signature
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {signatures.map(sig => (
                <div
                  key={sig.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  {/* Signature image */}
                  {(sig.public_url || sig.publicUrl || sig.file_url || sig.fileUrl) && (
                    <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <img
                        src={sig.public_url || sig.publicUrl || sig.file_url || sig.fileUrl}
                        alt={`Signature by ${sig.signer_name || sig.signerName}`}
                        className="mx-auto h-24 w-auto object-contain"
                      />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        <User size={14} className="text-slate-400" />
                        {sig.signer_name || sig.signerName}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge color={
                          (sig.signer_role || sig.signerRole) === 'client' ? 'amber'
                          : (sig.signer_role || sig.signerRole) === 'driver' ? 'purple'
                          : 'brand'
                        }>
                          {sig.signer_role || sig.signerRole}
                        </Badge>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(sig.created_at)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSignature(sig.id)}
                      disabled={deletingSigId === sig.id}
                      className="rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 cursor-pointer disabled:opacity-40"
                      title="Delete signature"
                    >
                      {deletingSigId === sig.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Signature Modal ───────────────────────────────────────────── */}
      <Modal
        open={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title={sigStep === 'info' ? 'Add Signature' : `Sign — ${signerName}`}
        className={sigStep === 'draw' ? 'max-w-lg' : ''}
      >
        {sigStep === 'info' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Signer Name
              </label>
              <input
                type="text"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
                placeholder="Enter full name"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSignatureInfoNext()}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Role
              </label>
              <div className="flex gap-2">
                {['staff', 'driver', 'client'].map(role => (
                  <button
                    key={role}
                    onClick={() => setSignerRole(role)}
                    className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition-colors cursor-pointer ${
                      signerRole === role
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={handleSignatureInfoNext}
                disabled={!signerName.trim()}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {sigUploading && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
                <Loader2 size={16} className="animate-spin" />
                Uploading signature...
              </div>
            )}
            <SignaturePad
              signerLabel={`${signerName} (${signerRole})`}
              onSave={handleSignatureSave}
              onCancel={() => setSigStep('info')}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─── PhotoSection sub-component ─────────────────────────────────────────
function PhotoSection({ title, photos, color, onPhotoClick, onAnnotate }) {
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
          <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md">
            <button
              onClick={() => onPhotoClick(photo)}
              className="w-full cursor-pointer"
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
            </button>
            {photo.damage_flag && (
              <div className="absolute left-2 top-2">
                <span className="flex items-center gap-0.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  <AlertTriangle size={8} /> DMG
                </span>
              </div>
            )}
            {/* Annotate button */}
            {onAnnotate && (
              <button
                onClick={(e) => { e.stopPropagation(); onAnnotate(photo) }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 hover:bg-black/70 cursor-pointer"
                title="Annotate photo"
              >
                <Pencil size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
