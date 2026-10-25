import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import {
  Camera, Zap, ZapOff, SwitchCamera, ChevronLeft,
  Check, X, Send, AlertTriangle, Trash2, RotateCcw, ImageIcon,
  Loader2, MapPin,
} from 'lucide-react'
import useCamera from '../hooks/useCamera'
import useGeolocation from '../hooks/useGeolocation'
import { createVehicle, uploadPhoto } from '../lib/api'
import { queueUpload } from '../lib/offlineQueue'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHECKLIST_STEPS = [
  { id: 'front', label: 'Front', hint: 'Capture the front bumper, bonnet, and windscreen' },
  { id: 'driver', label: 'Driver Side', hint: 'Capture the full driver side panels and mirrors' },
  { id: 'rear', label: 'Rear', hint: 'Capture the rear bumper, boot, and rear window' },
  { id: 'passenger', label: 'Passenger Side', hint: 'Capture the full passenger side panels' },
  { id: 'interior', label: 'Interior', hint: 'Capture the dashboard, seats, and floor mats' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Reusable off-screen canvas for timestamp burning (avoids GC churn)
let _burnCanvas = null
function getBurnCanvas() {
  if (!_burnCanvas) _burnCanvas = document.createElement('canvas')
  return _burnCanvas
}

function burnTimestamp(videoEl, lat, lng) {
  // Draw directly from video element — no intermediate Image decode needed
  const canvas = getBurnCanvas()
  const w = videoEl.videoWidth
  const h = videoEl.videoHeight
  if (!w || !h) return null

  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(videoEl, 0, 0, w, h)

  // Bottom bar
  const barHeight = Math.max(36, h * 0.035)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, h - barHeight, w, barHeight)

  // Timestamp
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = now.getFullYear()
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const ts = `${dd}/${mm}/${yy} ${hh}:${mi}:${ss}`

  const fontSize = Math.max(13, w * 0.016)
  ctx.font = `bold ${fontSize}px monospace`
  ctx.fillStyle = 'white'
  ctx.textBaseline = 'middle'
  ctx.fillText(ts, 10, h - barHeight / 2)

  if (lat && lng) {
    ctx.textAlign = 'right'
    ctx.fillText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`, w - 10, h - barHeight / 2)
  }

  return canvas.toDataURL('image/jpeg', 0.8)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Capture() {
  const navigate = useNavigate()
  const { siteId: urlSiteId } = useParams()
  const [searchParams] = useSearchParams()
  const context = useOutletContext() || {}
  const camera = useCamera()
  const geo = useGeolocation()

  // Check if resuming capture for existing vehicle (from VehicleDetail "Take After Photos")
  const resumeVehicleId = searchParams.get('vehicle')
  const resumeRego = searchParams.get('rego')
  const resumeType = searchParams.get('type') // 'after'

  const [step, setStep] = useState(resumeVehicleId ? 'capture' : 'vehicle')
  const [photoType, setPhotoType] = useState(resumeType || 'before')

  // Site state
  const siteId = urlSiteId || null
  const selectedSite = context.site || null

  // Vehicle state
  const [rego, setRego] = useState(resumeRego || '')
  const [bay, setBay] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [notes, setNotes] = useState('')
  const [currentChecklistIndex, setCurrentChecklistIndex] = useState(0)
  const [photos, setPhotos] = useState([])
  const [damageFlag, setDamageFlag] = useState(false)
  const [vehicleId, setVehicleId] = useState(resumeVehicleId || null)
  const [saving, setSaving] = useState(false)

  // Start / stop camera when entering / leaving capture step
  useEffect(() => {
    if (step === 'capture' && !camera.active) {
      camera.start()
    }
    if (step !== 'capture' && camera.active) {
      camera.stop()
    }
  }, [step])

  // ─── Handlers ─────────────────────────────────────────────────────────

  async function handleStartCapture() {
    if (!rego.trim()) return
    setSaving(true)
    try {
      const vehicle = await createVehicle({
        rego: rego.trim().toUpperCase(),
        bay: bay.trim() || undefined,
        vehicle_type: vehicleType || undefined,
        notes: notes.trim() || undefined,
        site_id: siteId || undefined,
      })
      setVehicleId(vehicle.id)
      setStep('capture')
    } catch (err) {
      alert(`Failed to create vehicle record: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleCapture() {
    if (!camera.active || !vehicleId || !camera.videoRef.current) return

    // Haptic feedback
    navigator.vibrate?.(50)

    const checklistStep = CHECKLIST_STEPS[currentChecklistIndex]

    // Burn timestamp + geo directly from video (no intermediate decode)
    const dataUrl = burnTimestamp(camera.videoRef.current, geo.lat, geo.lng)
    if (!dataUrl) return

    // Add to local state immediately
    const tempId = Date.now()
    const photo = {
      id: tempId,
      dataUrl,
      type: photoType,
      step: checklistStep.id,
      stepLabel: checklistStep.label,
      damageFlag,
      timestamp: new Date().toISOString(),
      uploading: true,
    }
    setPhotos((prev) => [...prev, photo])
    setDamageFlag(false)

    // Auto-advance checklist step
    setCurrentChecklistIndex((prev) => (prev + 1) % CHECKLIST_STEPS.length)

    // Upload in background
    try {
      const result = await uploadPhoto({
        vehicleId,
        siteId: siteId || undefined,
        type: photoType,
        step: checklistStep.id,
        stepLabel: checklistStep.label,
        damageFlag,
        fileData: dataUrl,
        fileName: `${checklistStep.id}_${Date.now()}.jpg`,
        lat: geo.lat || undefined,
        lng: geo.lng || undefined,
      })
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { ...p, id: result.id, publicUrl: result.publicUrl, uploading: false }
            : p
        )
      )
    } catch (err) {
      console.error('Photo upload failed:', err)
      // Check if it's a network error — queue for later
      if (!navigator.onLine || err.message.includes('Failed to fetch')) {
        await queueUpload({
          type: 'photo',
          payload: {
            vehicleId,
            siteId: siteId || undefined,
            type: photoType,
            step: checklistStep.id,
            stepLabel: checklistStep.label,
            damageFlag,
            fileData: dataUrl,
            fileName: `${checklistStep.id}_${Date.now()}.jpg`,
            lat: geo.lat || undefined,
            lng: geo.lng || undefined,
          },
        })
        setPhotos((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, uploading: false, queued: true } : p))
        )
      } else {
        setPhotos((prev) =>
          prev.map((p) => (p.id === tempId ? { ...p, uploading: false, error: true } : p))
        )
      }
    }
  }

  function handleDeletePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleSubmit() {
    if (!vehicleId) return
    camera.stop()
    navigate(`/site/${siteId}/vehicles/${vehicleId}`)
  }

  function handleReset() {
    setStep('vehicle')
    setRego('')
    setBay('')
    setVehicleType('')
    setNotes('')
    setPhotos([])
    setVehicleId(null)
    setCurrentChecklistIndex(0)
    setPhotoType('before')
    setDamageFlag(false)
    camera.stop()
  }

  // ─── Derived ──────────────────────────────────────────────────────────

  const beforePhotos = photos.filter((p) => p.type === 'before')
  const afterPhotos = photos.filter((p) => p.type === 'after')
  const currentStepPhotos = photos.filter((p) => p.type === photoType)
  const currentStep = CHECKLIST_STEPS[currentChecklistIndex]
  const isBefore = photoType === 'before'

  // ═══════════════════════════════════════════════════════════════════════
  //  VEHICLE ENTRY STEP
  // ═══════════════════════════════════════════════════════════════════════

  if (step === 'vehicle') {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/site/${siteId}`)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900">New Vehicle</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-slate-500">Enter vehicle details to begin</p>
              {selectedSite && (
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  <MapPin size={10} />
                  {selectedSite.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Registration */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Registration Plate <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={rego}
              onChange={(e) => setRego(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 font-mono text-lg font-bold uppercase tracking-wider text-slate-900 placeholder-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              autoFocus
            />
          </div>

          {/* Bay & Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Bay / Location
              </label>
              <input
                type="text"
                value={bay}
                onChange={(e) => setBay(e.target.value)}
                placeholder="e.g. Bay 7"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Select...</option>
                <option>Sedan</option>
                <option>SUV</option>
                <option>Wagon</option>
                <option>Ute</option>
                <option>Van</option>
                <option>Truck</option>
                <option>Other</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any initial observations..."
              rows={2}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Start Capture CTA */}
        <button
          onClick={handleStartCapture}
          disabled={!rego.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {saving ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Camera size={20} />
          )}
          {saving ? 'Creating Record...' : 'Start Capture'}
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  REVIEW STEP
  // ═══════════════════════════════════════════════════════════════════════

  if (step === 'review') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Review & Submit</h1>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono font-bold text-slate-700">{rego}</span>
              {bay && <span className="text-slate-400"> — {bay}</span>}
              {selectedSite && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-700">
                  <MapPin size={10} />
                  {selectedSite.name}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setStep('capture')}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={14} />
            Add More
          </button>
        </div>

        {/* Before Photos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-brand-600">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            Before Photos ({beforePhotos.length})
          </h3>
          {beforePhotos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No before photos captured</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {beforePhotos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} onDelete={handleDeletePhoto} />
              ))}
            </div>
          )}
        </div>

        {/* After Photos */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-600">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            After Photos ({afterPhotos.length})
          </h3>
          {afterPhotos.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No after photos captured</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {afterPhotos.map((photo) => (
                <PhotoThumb key={photo.id} photo={photo} onDelete={handleDeletePhoto} />
              ))}
            </div>
          )}
        </div>

        {/* Take After Photos CTA — shown when before photos exist but no after photos */}
        {beforePhotos.length > 0 && afterPhotos.length === 0 && (
          <button
            onClick={() => { setPhotoType('after'); setCurrentChecklistIndex(0); setStep('capture') }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.98]"
          >
            <Camera size={20} />
            Take After Photos
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Trash2 size={16} />
            Discard
          </button>
          <button
            onClick={handleSubmit}
            disabled={photos.length === 0}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none ${
              afterPhotos.length > 0
                ? 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700'
                : 'bg-slate-400 shadow-slate-400/25 hover:bg-slate-500'
            }`}
          >
            <Send size={18} />
            {afterPhotos.length > 0 ? `Done (${photos.length} photos)` : 'Save Before Only'}
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CAMERA CAPTURE STEP — Full-bleed immersive experience
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" style={{ width: '100vw', height: '100vh' }}>
      {/* ── Camera Viewport (fills entire screen) ─────────────────────── */}
      <div className="absolute inset-0">
        {camera.error ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <Camera size={48} className="text-white/20" />
            <p className="text-sm text-white/60">Camera access denied</p>
            <p className="text-xs text-white/30">{camera.error}</p>
            <button
              onClick={camera.start}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Try Again
            </button>
          </div>
        ) : (
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover"
          />
        )}
      </div>

      {/* ── Corner Guides ─────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-6 z-10">
        <div className="absolute left-0 top-0 h-10 w-10 rounded-tl-lg border-l-2 border-t-2 border-white/30" />
        <div className="absolute right-0 top-0 h-10 w-10 rounded-tr-lg border-r-2 border-t-2 border-white/30" />
        <div className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-lg border-b-2 border-l-2 border-white/30" />
        <div className="absolute bottom-0 right-0 h-10 w-10 rounded-br-lg border-b-2 border-r-2 border-white/30" />
      </div>

      {/* ── Top Bar Overlay ───────────────────────────────────────────── */}
      <div className="relative z-20 bg-black/40 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] backdrop-blur-md">
        {/* Row 1: Rego, Before/After, Review */}
        <div className="flex items-center justify-between">
          {/* Left: Back + Rego */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStep('vehicle')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-mono text-sm font-bold tracking-wider text-white">{rego}</span>
            {bay && <span className="text-xs text-white/50">{bay}</span>}
          </div>

          {/* Center: Before/After Toggle */}
          <div className="flex rounded-full bg-white/10 p-0.5">
            <button
              onClick={() => {
                setPhotoType('before')
                setCurrentChecklistIndex(0)
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                isBefore
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Before ({beforePhotos.length})
            </button>
            <button
              onClick={() => {
                setPhotoType('after')
                setCurrentChecklistIndex(0)
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                !isBefore
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              After ({afterPhotos.length})
            </button>
          </div>

          {/* Right: Review */}
          <button
            onClick={() => setStep('review')}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
          >
            Review
          </button>
        </div>

        {/* Row 2: Step progress pills + hint */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex gap-1">
              {CHECKLIST_STEPS.map((s, i) => {
                const hasPhoto = currentStepPhotos.some((p) => p.step === s.id)
                const isActive = i === currentChecklistIndex
                return (
                  <button
                    key={s.id}
                    onClick={() => setCurrentChecklistIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      isActive
                        ? `w-7 ${isBefore ? 'bg-brand-400' : 'bg-emerald-400'}`
                        : hasPhoto
                          ? 'w-1.5 bg-white/60'
                          : 'w-1.5 bg-white/20'
                    }`}
                  />
                )
              })}
            </div>
            <span className="text-xs font-semibold text-white/90">{currentStep.label}</span>
          </div>

          {/* Geo indicator */}
          {geo.lat && (
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
              <MapPin size={10} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-white/60">
                {geo.accuracy ? `${Math.round(geo.accuracy)}m` : 'GPS'}
              </span>
            </div>
          )}
        </div>

        {/* Row 3: Step hint */}
        <p className="mt-1.5 text-[11px] text-white/40">
          {currentStep.label} — {currentStep.hint}
        </p>
      </div>

      {/* ── Damage Flag Indicator ─────────────────────────────────────── */}
      {damageFlag && (
        <div className="absolute right-4 top-28 z-20">
          <span className="flex items-center gap-1 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-red-500/30 backdrop-blur-sm">
            <AlertTriangle size={12} />
            DAMAGE
          </span>
        </div>
      )}

      {/* ── Step Label Badge (on camera) ──────────────────────────────── */}
      <div className="absolute left-4 top-28 z-20">
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-sm ${
            isBefore ? 'bg-brand-500/80' : 'bg-emerald-600/80'
          }`}
        >
          {photoType.toUpperCase()} — {currentStep.label}
        </span>
      </div>

      {/* ── Photo Strip Thumbnails ────────────────────────────────────── */}
      {currentStepPhotos.length > 0 && (
        <div className="absolute bottom-48 left-0 right-0 z-20 px-4">
          <div className="flex gap-2 overflow-x-auto rounded-xl bg-black/60 p-2 backdrop-blur-md">
            {currentStepPhotos.slice(-4).map((photo) => (
              <div key={photo.id} className="relative shrink-0">
                <img
                  src={photo.dataUrl}
                  alt={photo.stepLabel}
                  className="h-14 w-14 rounded-lg border border-white/20 object-cover"
                />
                {photo.damageFlag && (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                    <AlertTriangle size={8} className="text-white" />
                  </div>
                )}
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                    <Loader2 size={14} className="animate-spin text-white" />
                  </div>
                )}
                <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white">
                  {photo.stepLabel.slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Sheet Controls ─────────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-black/40 px-6 pb-[max(env(safe-area-inset-bottom),16px)] pt-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* Flash toggle */}
          <button
            onClick={camera.toggleTorch}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              camera.torchOn
                ? 'bg-amber-500/30 text-amber-300'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {camera.torchOn ? <Zap size={20} /> : <ZapOff size={20} />}
          </button>

          {/* Damage flag toggle */}
          <button
            onClick={() => setDamageFlag(!damageFlag)}
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              damageFlag
                ? 'bg-red-500/30 text-red-300'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
            title="Flag Damage"
          >
            <AlertTriangle size={20} />
          </button>

          {/* ── CAPTURE BUTTON ────────────────────────────────────── */}
          <div className="relative flex items-center justify-center">
            {/* Pulse ring */}
            <div
              className={`absolute h-[88px] w-[88px] rounded-full opacity-40 ${
                isBefore ? 'bg-brand-500' : 'bg-emerald-600'
              }`}
              style={{
                animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
            <button
              onClick={handleCapture}
              disabled={!camera.active}
              className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/90 shadow-2xl transition-transform active:scale-90 disabled:opacity-40"
            >
              <div
                className={`flex h-[68px] w-[68px] items-center justify-center rounded-full ${
                  isBefore ? 'bg-brand-500' : 'bg-emerald-600'
                }`}
              >
                <span className="font-mono text-sm font-bold text-white">
                  {currentChecklistIndex + 1}/{CHECKLIST_STEPS.length}
                </span>
              </div>
            </button>
          </div>

          {/* Camera switch */}
          <button
            onClick={camera.switchCamera}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20"
          >
            <SwitchCamera size={20} />
          </button>

          {/* Photo count / review */}
          <button
            onClick={() => setStep('review')}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/70 transition-all hover:bg-white/20"
          >
            <ImageIcon size={20} />
            {photos.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {photos.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Pulse ring keyframes (injected once) ──────────────────────── */}
      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.1; }
        }
      `}</style>
    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function PhotoThumb({ photo, onDelete }) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200">
      <img
        src={photo.dataUrl}
        alt={photo.stepLabel}
        className="aspect-square w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-white">{photo.stepLabel}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
              photo.type === 'before'
                ? 'bg-brand-500/90 text-white'
                : 'bg-emerald-600/90 text-white'
            }`}
          >
            {photo.type}
          </span>
        </div>
      </div>
      {photo.damageFlag && (
        <div className="absolute left-2 top-2">
          <span className="flex items-center gap-0.5 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            <AlertTriangle size={8} /> DMG
          </span>
        </div>
      )}
      {photo.uploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 size={20} className="animate-spin text-white" />
        </div>
      )}
      {photo.error && (
        <div className="absolute right-2 top-2">
          <span className="rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            FAILED
          </span>
        </div>
      )}
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white/70 opacity-0 transition-opacity hover:bg-red-500 hover:text-white group-hover:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  )
}
