import { useRef, useState, useCallback, useEffect } from "react";
import { Undo2, Eraser, Check, X } from "lucide-react";

export default function SignaturePad({ onSave, onCancel, signerLabel = "Signature" }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [strokes, setStrokes] = useState([]); // array of point arrays
  const currentStroke = useRef([]);

  // Resize canvas to match container
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // Redraw all strokes after resize
    redrawAll(strokes, rect.width, rect.height);
  }, [strokes]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // Draw the dashed signature guideline
  function drawGuideline(ctx, width, height) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const y = height * 0.7;
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
    ctx.restore();
  }

  // Redraw all saved strokes
  function redrawAll(savedStrokes, width, height) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Clear
    ctx.clearRect(0, 0, width || canvas.offsetWidth, height || canvas.offsetHeight);

    // Draw guideline
    drawGuideline(ctx, width || canvas.offsetWidth, height || canvas.offsetHeight);

    // Redraw each stroke
    savedStrokes.forEach((stroke) => {
      drawStroke(ctx, stroke);
    });
  }

  // Draw a single stroke (array of points)
  function drawStroke(ctx, points) {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const pressure = curr.pressure || 0.5;
      ctx.lineWidth = 1 + pressure * 3; // 1-4px based on pressure

      if (i === 1) {
        ctx.lineTo(curr.x, curr.y);
      } else {
        // Smooth curve using midpoints
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  function getPointerPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5,
    };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    const canvas = canvasRef.current;
    canvas.setPointerCapture(e.pointerId);

    setIsDrawing(true);
    setHasContent(true);

    const point = getPointerPos(e);
    currentStroke.current = [point];
  }

  function handlePointerMove(e) {
    if (!isDrawing) return;
    e.preventDefault();

    const point = getPointerPos(e);
    currentStroke.current.push(point);

    // Draw current stroke in real time
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const points = currentStroke.current;
    if (points.length < 2) return;

    const prev = points[points.length - 2];
    const curr = points[points.length - 1];
    const pressure = curr.pressure || 0.5;

    ctx.save();
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 1 + pressure * 3;
    ctx.beginPath();

    if (points.length === 2) {
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
    } else {
      const prevPrev = points[points.length - 3];
      const midPrevX = (prevPrev.x + prev.x) / 2;
      const midPrevY = (prevPrev.y + prev.y) / 2;
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      ctx.moveTo(midPrevX, midPrevY);
      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    ctx.stroke();
    ctx.restore();
  }

  function handlePointerUp(e) {
    if (!isDrawing) return;
    e.preventDefault();

    setIsDrawing(false);

    if (currentStroke.current.length > 1) {
      setStrokes((prev) => [...prev, currentStroke.current]);
    }
    currentStroke.current = [];
  }

  function handleUndo() {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0) setHasContent(false);

      // Schedule redraw
      requestAnimationFrame(() => {
        const canvas = canvasRef.current;
        if (canvas) redrawAll(next, canvas.offsetWidth, canvas.offsetHeight);
      });

      return next;
    });
  }

  function handleClear() {
    setStrokes([]);
    setHasContent(false);
    currentStroke.current = [];

    const canvas = canvasRef.current;
    if (canvas) {
      redrawAll([], canvas.offsetWidth, canvas.offsetHeight);
    }
  }

  function handleDone() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create an export canvas without the guideline
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const ctx = exportCanvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Draw only strokes (no guideline)
    strokes.forEach((stroke) => drawStroke(ctx, stroke));

    const dataUrl = exportCanvas.toDataURL("image/png");
    onSave?.(dataUrl);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900">{signerLabel}</p>
        <p className="text-xs text-slate-400">Sign below</p>
      </div>

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="relative h-[300px] cursor-crosshair"
        style={{ touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {/* Placeholder text */}
        {!hasContent && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-slate-300 text-lg font-medium select-none">
              Sign here
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Eraser className="h-4 w-4" />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={!hasContent}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="h-4 w-4" />
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
