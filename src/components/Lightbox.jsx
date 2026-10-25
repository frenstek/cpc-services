import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Badge from "./Badge";

function getUrl(photo) {
  return photo?.url || photo?.public_url || photo?.publicUrl || "";
}

export default function Lightbox({
  photos = [],
  initialIndex = 0,
  open,
  onClose,
}) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef(null);

  // Reset index when opening or when initialIndex changes
  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const prev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const prev2 = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKey(e) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = prev2;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose, prev, next]);

  if (!open || photos.length === 0) return null;

  const photo = photos[index];
  const src = getUrl(photo);

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta > 0) prev();
      else next();
    }
    touchStartX.current = null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
      style={{ animation: "lb-fade 0.2s ease-out" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Counter — top left */}
      <div className="absolute top-4 left-4 text-white/60 text-sm font-mono z-10">
        {index + 1} / {photos.length}
      </div>

      {/* Close — top right */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center h-10 w-10 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer z-10"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Previous */}
      {photos.length > 1 && (
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors cursor-pointer z-10"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full p-3 text-white transition-colors cursor-pointer z-10"
          aria-label="Next photo"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Main image */}
      <img
        key={index}
        src={src}
        alt={photo?.label || `Photo ${index + 1}`}
        className="max-h-[85vh] max-w-[90vw] object-contain select-none"
        draggable={false}
      />

      {/* Bottom info bar */}
      {(photo?.type || photo?.label || photo?.damage_flag) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full bg-black/60 backdrop-blur px-5 py-2.5 text-white text-sm z-10">
          {photo.type && <Badge color="brand">{photo.type}</Badge>}
          {photo.label && (
            <span className="text-white/80 truncate max-w-[240px]">
              {photo.label}
            </span>
          )}
          {photo.damage_flag && (
            <Badge color="red">Damage</Badge>
          )}
        </div>
      )}

      <style>{`
        @keyframes lb-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );
}
