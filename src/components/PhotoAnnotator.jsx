import { useRef, useState, useCallback, useEffect } from 'react'
import { Pencil, Circle, ArrowRight, Undo2, Eraser, Check, X } from 'lucide-react'

const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'White', value: '#FFFFFF' },
]

const WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Med', value: 4 },
  { label: 'Thick', value: 6 },
]

const TOOLS = [
  { key: 'freehand', icon: Pencil, label: 'Draw' },
  { key: 'circle', icon: Circle, label: 'Circle' },
  { key: 'arrow', icon: ArrowRight, label: 'Arrow' },
]

export default function PhotoAnnotator({ photoUrl, onSave, onCancel }) {
  const bgCanvasRef = useRef(null)
  const fgCanvasRef = useRef(null)
  const containerRef = useRef(null)

  const [tool, setTool] = useState('freehand')
  const [color, setColor] = useState('#EF4444')
  const [lineWidth, setLineWidth] = useState(4)
  const [annotations, setAnnotations] = useState([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Current drawing state
  const currentPoints = useRef([])
  const startPoint = useRef(null)
  const imageRef = useRef(null)
  const imgDimensions = useRef({ w: 0, h: 0, offsetX: 0, offsetY: 0, scale: 1 })

  // Load image and draw on background canvas
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }
    img.onerror = () => {
      // Try without crossOrigin for same-origin images
      const img2 = new Image()
      img2.onload = () => {
        imageRef.current = img2
        setImageLoaded(true)
      }
      img2.src = photoUrl
    }
    img.src = photoUrl
  }, [photoUrl])

  // Resize and draw when image loaded or window resizes
  const setupCanvases = useCallback(() => {
    const container = containerRef.current
    const bgCanvas = bgCanvasRef.current
    const fgCanvas = fgCanvasRef.current
    const img = imageRef.current
    if (!container || !bgCanvas || !fgCanvas || !img) return

    const dpr = window.devicePixelRatio || 1
    const cw = container.clientWidth
    const ch = container.clientHeight

    // Calculate image scaling to fit
    const imgAspect = img.width / img.height
    const containerAspect = cw / ch
    let drawW, drawH, offsetX, offsetY

    if (imgAspect > containerAspect) {
      // Image wider than container
      drawW = cw
      drawH = cw / imgAspect
      offsetX = 0
      offsetY = (ch - drawH) / 2
    } else {
      // Image taller than container
      drawH = ch
      drawW = ch * imgAspect
      offsetX = (cw - drawW) / 2
      offsetY = 0
    }

    imgDimensions.current = { w: drawW, h: drawH, offsetX, offsetY, scale: drawW / img.width }

    // Setup both canvases
    for (const canvas of [bgCanvas, fgCanvas]) {
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      canvas.style.width = `${cw}px`
      canvas.style.height = `${ch}px`
    }

    // Draw image on background canvas
    const bgCtx = bgCanvas.getContext('2d')
    bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bgCtx.clearRect(0, 0, cw, ch)
    bgCtx.drawImage(img, offsetX, offsetY, drawW, drawH)

    // Redraw annotations on foreground
    redrawAnnotations(annotations)
  }, [imageLoaded, annotations])

  useEffect(() => {
    if (imageLoaded) {
      setupCanvases()
      window.addEventListener('resize', setupCanvases)
      return () => window.removeEventListener('resize', setupCanvases)
    }
  }, [imageLoaded, setupCanvases])

  // Redraw all annotations on the foreground canvas
  function redrawAnnotations(annots) {
    const fgCanvas = fgCanvasRef.current
    if (!fgCanvas) return
    const dpr = window.devicePixelRatio || 1
    const ctx = fgCanvas.getContext('2d')
    const cw = fgCanvas.offsetWidth
    const ch = fgCanvas.offsetHeight
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)

    annots.forEach(a => drawAnnotation(ctx, a))
  }

  function drawAnnotation(ctx, annotation) {
    ctx.save()
    ctx.strokeStyle = annotation.color
    ctx.lineWidth = annotation.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (annotation.tool === 'freehand') {
      const pts = annotation.points
      if (pts.length < 2) { ctx.restore(); return }
      ctx.beginPath()
      ctx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) {
        if (i === 1) {
          ctx.lineTo(pts[i].x, pts[i].y)
        } else {
          const prev = pts[i - 1]
          const curr = pts[i]
          const midX = (prev.x + curr.x) / 2
          const midY = (prev.y + curr.y) / 2
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY)
        }
      }
      ctx.stroke()
    } else if (annotation.tool === 'circle') {
      const { cx, cy, rx, ry } = annotation.geometry
      ctx.beginPath()
      ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (annotation.tool === 'arrow') {
      const { x1, y1, x2, y2 } = annotation.geometry
      // Draw line
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Draw arrowhead
      const angle = Math.atan2(y2 - y1, x2 - x1)
      const headLen = 12 + annotation.width * 2
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - headLen * Math.cos(angle - Math.PI / 6),
        y2 - headLen * Math.sin(angle - Math.PI / 6)
      )
      ctx.moveTo(x2, y2)
      ctx.lineTo(
        x2 - headLen * Math.cos(angle + Math.PI / 6),
        y2 - headLen * Math.sin(angle + Math.PI / 6)
      )
      ctx.stroke()
    }
    ctx.restore()
  }

  function getPointerPos(e) {
    const canvas = fgCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  function handlePointerDown(e) {
    e.preventDefault()
    const canvas = fgCanvasRef.current
    canvas.setPointerCapture(e.pointerId)
    setIsDrawing(true)

    const pos = getPointerPos(e)

    if (tool === 'freehand') {
      currentPoints.current = [pos]
    } else {
      startPoint.current = pos
    }
  }

  function handlePointerMove(e) {
    if (!isDrawing) return
    e.preventDefault()

    const pos = getPointerPos(e)
    const dpr = window.devicePixelRatio || 1
    const fgCanvas = fgCanvasRef.current
    const ctx = fgCanvas.getContext('2d')
    const cw = fgCanvas.offsetWidth
    const ch = fgCanvas.offsetHeight

    if (tool === 'freehand') {
      currentPoints.current.push(pos)

      // Draw incrementally
      const pts = currentPoints.current
      if (pts.length < 2) return
      const prev = pts[pts.length - 2]
      const curr = pts[pts.length - 1]

      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(prev.x, prev.y)
      ctx.lineTo(curr.x, curr.y)
      ctx.stroke()
      ctx.restore()
    } else {
      // Circle or Arrow — redraw preview
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cw, ch)
      // Redraw existing annotations
      annotations.forEach(a => drawAnnotation(ctx, a))

      const sp = startPoint.current
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (tool === 'circle') {
        const cx = (sp.x + pos.x) / 2
        const cy = (sp.y + pos.y) / 2
        const rx = Math.abs(pos.x - sp.x) / 2
        const ry = Math.abs(pos.y - sp.y) / 2
        if (rx > 0 && ry > 0) {
          ctx.beginPath()
          ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      } else if (tool === 'arrow') {
        ctx.beginPath()
        ctx.moveTo(sp.x, sp.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()

        const angle = Math.atan2(pos.y - sp.y, pos.x - sp.x)
        const headLen = 12 + lineWidth * 2
        ctx.beginPath()
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(
          pos.x - headLen * Math.cos(angle - Math.PI / 6),
          pos.y - headLen * Math.sin(angle - Math.PI / 6)
        )
        ctx.moveTo(pos.x, pos.y)
        ctx.lineTo(
          pos.x - headLen * Math.cos(angle + Math.PI / 6),
          pos.y - headLen * Math.sin(angle + Math.PI / 6)
        )
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  function handlePointerUp(e) {
    if (!isDrawing) return
    e.preventDefault()
    setIsDrawing(false)

    const pos = getPointerPos(e)

    if (tool === 'freehand') {
      if (currentPoints.current.length > 1) {
        const newAnnotation = {
          tool: 'freehand',
          color,
          width: lineWidth,
          points: [...currentPoints.current],
        }
        setAnnotations(prev => {
          const next = [...prev, newAnnotation]
          redrawAnnotations(next)
          return next
        })
      }
      currentPoints.current = []
    } else if (tool === 'circle') {
      const sp = startPoint.current
      if (sp) {
        const cx = (sp.x + pos.x) / 2
        const cy = (sp.y + pos.y) / 2
        const rx = Math.abs(pos.x - sp.x) / 2
        const ry = Math.abs(pos.y - sp.y) / 2
        if (rx > 2 && ry > 2) {
          const newAnnotation = {
            tool: 'circle',
            color,
            width: lineWidth,
            geometry: { cx, cy, rx, ry },
          }
          setAnnotations(prev => {
            const next = [...prev, newAnnotation]
            redrawAnnotations(next)
            return next
          })
        }
      }
      startPoint.current = null
    } else if (tool === 'arrow') {
      const sp = startPoint.current
      if (sp) {
        const dist = Math.hypot(pos.x - sp.x, pos.y - sp.y)
        if (dist > 5) {
          const newAnnotation = {
            tool: 'arrow',
            color,
            width: lineWidth,
            geometry: { x1: sp.x, y1: sp.y, x2: pos.x, y2: pos.y },
          }
          setAnnotations(prev => {
            const next = [...prev, newAnnotation]
            redrawAnnotations(next)
            return next
          })
        }
      }
      startPoint.current = null
    }
  }

  function handleUndo() {
    setAnnotations(prev => {
      const next = prev.slice(0, -1)
      requestAnimationFrame(() => redrawAnnotations(next))
      return next
    })
  }

  function handleClear() {
    setAnnotations([])
    requestAnimationFrame(() => redrawAnnotations([]))
  }

  function handleSave() {
    const bgCanvas = bgCanvasRef.current
    const fgCanvas = fgCanvasRef.current
    if (!bgCanvas || !fgCanvas) return

    // Composite both canvases
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = bgCanvas.width
    exportCanvas.height = bgCanvas.height
    const ctx = exportCanvas.getContext('2d')
    ctx.drawImage(bgCanvas, 0, 0)
    ctx.drawImage(fgCanvas, 0, 0)

    const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.92)
    onSave?.(dataUrl)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Top Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-black/80 px-3 py-2 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
        {/* Tools */}
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {TOOLS.map(t => {
            const Icon = t.icon
            const active = tool === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTool(t.key)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-brand-500 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/10'
                }`}
                title={t.label}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                color === c.value
                  ? 'scale-110 border-white shadow-lg'
                  : 'border-white/20 hover:border-white/50'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Line Width */}
        <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
          {WIDTHS.map(w => (
            <button
              key={w.value}
              onClick={() => setLineWidth(w.value)}
              className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                lineWidth === w.value
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/10'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Undo / Clear */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={annotations.length === 0}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 size={14} />
            <span className="hidden sm:inline">Undo</span>
          </button>
          <button
            onClick={handleClear}
            disabled={annotations.length === 0}
            className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Clear All"
          >
            <Eraser size={14} />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <canvas
          ref={bgCanvasRef}
          className="absolute inset-0 h-full w-full"
        />
        <canvas
          ref={fgCanvasRef}
          className="absolute inset-0 h-full w-full cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Loading indicator */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <X size={16} />
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!imageLoaded}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={16} />
          Save
        </button>
      </div>
    </div>
  )
}
