import { useRef, useState, useCallback } from "react";
import { ArrowLeftRight } from "lucide-react";

export default function CompareView({
  beforeUrl,
  afterUrl,
  beforeLabel = "Before",
  afterLabel = "After",
}) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  function handlePointerDown(e) {
    e.preventDefault();
    const container = containerRef.current;
    if (container) container.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updatePosition(e.clientX);
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    updatePosition(e.clientX);
  }

  function handlePointerUp(e) {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden aspect-[4/3] select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* After image (full, behind) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image (clipped) */}
      <img
        src={beforeUrl}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none">
          <ArrowLeftRight className="h-4 w-4 text-slate-600" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="bg-black/50 backdrop-blur rounded px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
          {beforeLabel}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20 pointer-events-none">
        <span className="bg-black/50 backdrop-blur rounded px-2 py-1 text-[10px] font-bold text-white uppercase tracking-wide">
          {afterLabel}
        </span>
      </div>
    </div>
  );
}
