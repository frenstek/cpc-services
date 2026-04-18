import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Zap, ZapOff, SwitchCamera, ChevronLeft, ChevronRight,
  Check, X, Send, Car, AlertTriangle, Trash2, RotateCcw, ImageIcon,
  Loader2,
} from 'lucide-react'
import useCamera from '../hooks/useCamera'
import { createVehicle, uploadPhoto, updateVehicle } from '../lib/api'

const CHECKLIST_STEPS = [
  { id: 'front', label: 'Front', hint: 'Capture the front bumper, bonnet, and windscreen' },
  { id: 'driver', label: 'Driver Side', hint: 'Capture the full driver side panels and mirrors' },
  { id: 'rear', label: 'Rear', hint: 'Capture the rear bumper, boot, and rear window' },
  { id: 'passenger', label: 'Passenger Side', hint: 'Capture the full passenger side panels' },
  { id: 'interior', label: 'Interior', hint: 'Capture the dashboard, seats, and floor mats' },
]

export default function Capture() {
  const navigate = useNavigate()
  const camera = useCamera()
  const [step, setStep] = useState('vehicle') // vehicle | capture | review
  const [photoType, setPhotoType] = useState('before')
  const [rego, setRego] = useState('')
  const [bay, setBay] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [notes, setNotes] = useState('')
  const [currentChecklistIndex, setCurrentChecklistIndex] = useState(0)
  const [photos, setPhotos] = useState([]) // { dataUrl, type, step, timestamp }
  const [damageFlag, setDamageFlag] = useState(false)
  const [flash, setFlash] = useState(false)
  const [vehicleId, setVehicleId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')

  // Start camera when entering capture step
  useEffect(() => {
    if (step === 'capture' && !camera.active) {
      camera.start()
    }
    if (step !== 'capture' && camera.active) {
      camera.stop()
    }
  }, [step])

  async function handleStartCapture() {
    if (!rego.trim()) return
    setSaving(true)
    try {
      const vehicle = await createVehicle({
        rego: rego.trim().toUpperCase(),
        bay: bay.trim() || undefined,
        vehicle_type: vehicleType || undefined,
        notes: notes.trim() || undefined,
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
    const dataUrl = camera.capture()
    if (!dataUrl || !vehicleId) return

    const checklistStep = CHECKLIST_STEPS[currentChecklistIndex]

    // Add to local state immediately for UI feedback
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
    setPhotos(prev => [...prev, photo])
    setDamageFlag(false)

    // Auto-advance to next checklist step (wraps around)
    setCurrentChecklistIndex(prev => (prev + 1) % CHECKLIST_STEPS.length)

    // Upload in background
    try {
      const result = await uploadPhoto({
        vehicleId,
        type: photoType,
        step: checklistStep.id,
        stepLabel: checklistStep.label,
        damageFlag,
        fileData: dataUrl,
        fileName: `${checklistStep.id}_${Date.now()}.jpg`,
      })
      // Update local state with server data
      setPhotos(prev => prev.map(p =>
        p.id === tempId
          ? { ...p, id: result.id, publicUrl: result.publicUrl, uploading: false }
          : p
      ))
    } catch (err) {
      console.error('Photo upload failed:', err)
      // Mark as failed but keep in UI
      setPhotos(prev => prev.map(p =>
        p.id === tempId ? { ...p, uploading: false, error: true } : p
      ))
    }
  }

  function handleDeletePhoto(id) {
    setPhotos(prev => prev.filter(p => p.id !== id))
  }

  async function handleSubmit() {
    if (!vehicleId) return
    setSubmitting(true)
    try {
      await updateVehicle(vehicleId, { status: 'completed' })
      camera.stop()
      navigate(`/vehicles/${vehicleId}`)
    } catch (err) {
      alert(`Failed to submit: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
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

  const beforePhotos = photos.filter(p => p.type === 'before')
  const afterPhotos = photos.filter(p => p.type === 'after')
  const currentStepPhotos = photos.filter(p => p.type === photoType)

  // ─── VEHICLE ENTRY ──────────────────────────────────────────
  if (step === 'vehicle') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">New Vehicle</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the vehicle details to begin documentation</p>
        </div>

        <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Registration Plate <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={rego}
              onChange={e => setRego(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-lg font-mono font-bold tracking-wider text-slate-900 placeholder-slate-300 uppercase focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Bay / Location</label>
              <input
                type="text"
                value={bay}
                onChange={e => setBay(e.target.value)}
                placeholder="e.g. Bay 7"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Vehicle Type</label>
              <select
                value={vehicleType}
                onChange={e => setVehicleType(e.target.value)}
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

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any initial observations..."
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 resize-none focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>

        <button
          onClick={handleStartCapture}
          disabled={!rego.trim() || saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-4 text-base font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          {saving ? 'Creating Record...' : 'Start Capture'}
        </button>
      </div>
    )
  }

  // ─── REVIEW / SUBMIT ────────────────────────────────────────
  if (step === 'review') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Review & Submit</h1>
            <p className="mt-1 text-sm text-slate-500">
              <span className="font-mono font-bold text-slate-700">{rego}</span>
              {bay && <span className="text-slate-400"> — {bay}</span>}
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
              {beforePhotos.map(photo => (
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
              {afterPhotos.map(photo => (
                <PhotoThumb key={photo.id} photo={photo} onDelete={handleDeletePhoto} />
              ))}
            </div>
          )}
        </div>

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
            disabled={photos.length === 0 || submitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {submitting ? 'Submitting...' : `Submit (${photos.length} photos)`}
          </button>
        </div>
      </div>
    )
  }

  // ─── CAMERA CAPTURE ─────────────────────────────────────────
  const currentStep = CHECKLIST_STEPS[currentChecklistIndex]

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStep('vehicle')}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="font-mono text-sm font-bold text-slate-900">{rego}</p>
            {bay && <p className="text-[11px] text-slate-400">{bay}</p>}
          </div>
        </div>

        {/* Before/After Toggle */}
        <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => { setPhotoType('before'); setCurrentChecklistIndex(0) }}
            className={`rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
              photoType === 'before'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            Before ({beforePhotos.length})
          </button>
          <button
            onClick={() => { setPhotoType('after'); setCurrentChecklistIndex(0) }}
            className={`rounded-md px-4 py-1.5 text-xs font-bold transition-colors ${
              photoType === 'after'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500'
            }`}
          >
            After ({afterPhotos.length})
          </button>
        </div>

        <button
          onClick={() => setStep('review')}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          Review
        </button>
      </div>

      {/* Checklist Step Indicator */}
      <div className="border-b border-slate-100 bg-white px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {CHECKLIST_STEPS.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentChecklistIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentChecklistIndex
                      ? `w-6 ${photoType === 'before' ? 'bg-brand-500' : 'bg-emerald-500'}`
                      : currentStepPhotos.some(p => p.step === s.id)
                        ? 'w-1.5 bg-slate-400'
                        : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-700">{currentStep.label}</span>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentChecklistIndex(Math.max(0, currentChecklistIndex - 1))}
              disabled={currentChecklistIndex === 0}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentChecklistIndex(Math.min(CHECKLIST_STEPS.length - 1, currentChecklistIndex + 1))}
              disabled={currentChecklistIndex === CHECKLIST_STEPS.length - 1}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">{currentStep.hint}</p>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 bg-black">
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
          <>
            <video
              ref={camera.videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />

            {/* Corner Guides */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute left-0 top-0 h-8 w-8 border-l-2 border-t-2 border-white/50 rounded-tl" />
              <div className="absolute right-0 top-0 h-8 w-8 border-r-2 border-t-2 border-white/50 rounded-tr" />
              <div className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-white/50 rounded-bl" />
              <div className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-white/50 rounded-br" />
            </div>

            {/* Step Label Overlay */}
            <div className="absolute left-4 top-4">
              <span className={`rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg ${
                photoType === 'before' ? 'bg-brand-500' : 'bg-emerald-600'
              }`}>
                {photoType.toUpperCase()} — {currentStep.label}
              </span>
            </div>

            {/* Damage Flag */}
            {damageFlag && (
              <div className="absolute right-4 top-4">
                <span className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                  <AlertTriangle size={12} />
                  DAMAGE
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Photo Strip (thumbnails of current session) */}
      {currentStepPhotos.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-800 bg-black/90 px-4 py-2.5">
          {currentStepPhotos.map(photo => (
            <div key={photo.id} className="relative shrink-0">
              <img
                src={photo.dataUrl}
                alt={photo.stepLabel}
                className="h-14 w-14 rounded-lg object-cover border border-white/10"
              />
              {photo.damageFlag && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500">
                  <AlertTriangle size={8} className="text-white" />
                </div>
              )}
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[8px] font-bold text-white">
                {photo.stepLabel.slice(0, 3)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Camera Controls */}
      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Flash */}
          <button
            onClick={() => { camera.toggleTorch(); setFlash(!flash) }}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
              flash
                ? 'border-amber-300 bg-amber-50 text-amber-600'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
          >
            {flash ? <Zap size={20} /> : <ZapOff size={20} />}
          </button>

          {/* Damage Flag Toggle */}
          <button
            onClick={() => setDamageFlag(!damageFlag)}
            className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
              damageFlag
                ? 'border-red-300 bg-red-50 text-red-500'
                : 'border-slate-200 bg-white text-slate-400'
            }`}
            title="Flag Damage"
          >
            <AlertTriangle size={18} />
          </button>

          {/* Capture Button */}
          <button
            onClick={handleCapture}
            disabled={!camera.active}
            className={`flex h-[72px] w-[72px] items-center justify-center rounded-full shadow-xl transition-all active:scale-90 disabled:opacity-40 ${
              photoType === 'before'
                ? 'bg-brand-500 shadow-brand-500/30'
                : 'bg-emerald-600 shadow-emerald-600/30'
            }`}
          >
            <div className="flex h-[62px] w-[62px] items-center justify-center rounded-full border-[3px] border-white/30">
              <Camera size={26} className="text-white" />
            </div>
          </button>

          {/* Switch Camera */}
          <button
            onClick={camera.switchCamera}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition-colors hover:text-slate-600"
          >
            <SwitchCamera size={20} />
          </button>

          {/* Photo count / Review */}
          <button
            onClick={() => setStep('review')}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400"
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
    </div>
  )
}

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
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
            photo.type === 'before' ? 'bg-brand-500/90 text-white' : 'bg-emerald-600/90 text-white'
          }`}>
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
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white/70 opacity-0 transition-opacity hover:bg-red-500 hover:text-white group-hover:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  )
}
