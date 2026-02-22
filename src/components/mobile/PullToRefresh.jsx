import { useRef, useState, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 72; // px to trigger refresh

export default function PullToRefresh({ onRefresh, children, className = '' }) {
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) { startY.current = null; return; }
    // Only trigger when scrolled to top
    const el = containerRef.current;
    if (el && el.scrollTop > 0) { startY.current = null; return; }
    e.preventDefault();
    setPulling(true);
    setDistance(Math.min(delta, THRESHOLD * 1.5));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setDistance(THRESHOLD);
      try {
        await onRefresh?.();
      } finally {
        setRefreshing(false);
      }
    }
    setPulling(false);
    setDistance(0);
    startY.current = null;
  }, [distance, refreshing, onRefresh]);

  const progress = Math.min(distance / THRESHOLD, 1);
  const showIndicator = distance > 8;

  return (
    <div className="relative overflow-hidden h-full">
      {/* Indicator */}
      {showIndicator && (
        <div
          className="ptr-indicator z-10"
          style={{ opacity: progress, transform: `translateY(${distance - 56}px)` }}
        >
          <RefreshCw
            size={24}
            className={`text-blue-400 ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      )}

      <div
        ref={containerRef}
        className={`h-full overflow-y-auto mobile-scroll ${className}`}
        style={{ transform: pulling ? `translateY(${Math.min(distance * 0.4, 28)}px)` : undefined, transition: pulling ? 'none' : 'transform 0.25s ease' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}