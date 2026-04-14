// ═══════════════════════════════════════════════════════════════════════
// ARGUS-X — Attack Velocity Timeline
// Canvas-based rolling 5-minute chart of threat velocity by type.
// Fed by useStats.threatVelocity — updated every poll cycle.
// ═══════════════════════════════════════════════════════════════════════

import { useRef, useEffect, memo } from 'react';
import { fonts } from '../theme';
import { THREAT_COLORS } from '../constants';

/** Maximum data points in the rolling buffer (~5 min at 3s polls) */
const MAX_POINTS = 100;

interface TimelineProps {
  /** Current velocity snapshot: { threatType: count } */
  velocity: Record<string, number>;
  /** Chart height in px */
  height?: number;
}

/** One snapshot in time */
interface Snapshot {
  ts: number;
  data: Record<string, number>;
}

export const AttackTimeline = memo(function AttackTimeline({
  velocity,
  height = 110,
}: TimelineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<Snapshot[]>([]);
  const widthRef = useRef(300);

  // Track container width via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) widthRef.current = Math.round(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Append new velocity snapshot + redraw
  useEffect(() => {
    const buf = bufferRef.current;

    // Only push a new snapshot if velocity is non-empty
    const keys = Object.keys(velocity);
    if (keys.length > 0) {
      buf.push({ ts: Date.now(), data: { ...velocity } });
      if (buf.length > MAX_POINTS) buf.splice(0, buf.length - MAX_POINTS);
    }

    // Draw
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = widthRef.current;
    const h = height;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#080d1c';
    ctx.fillRect(0, 0, w, h);

    if (buf.length < 2) {
      // Not enough data — show placeholder
      ctx.font = `9px ${fonts.mono}`;
      ctx.fillStyle = '#2a4060';
      ctx.textAlign = 'center';
      ctx.fillText('Collecting velocity data…', w / 2, h / 2);
      return;
    }

    // Collect all threat types seen across the buffer
    const allTypes = new Set<string>();
    for (const snap of buf) {
      for (const t of Object.keys(snap.data)) allTypes.add(t);
    }

    // Find max value for Y-axis scaling
    let maxVal = 1;
    for (const snap of buf) {
      for (const v of Object.values(snap.data)) {
        if (v > maxVal) maxVal = v;
      }
    }
    // Round up to nice number for gridlines
    maxVal = Math.ceil(maxVal * 1.15);

    const padLeft = 28;
    const padRight = 6;
    const padTop = 6;
    const padBottom = 16;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid lines
    const gridLines = 3;
    ctx.strokeStyle = '#0f1a30';
    ctx.lineWidth = 0.5;
    ctx.font = `7px ${fonts.mono}`;
    ctx.fillStyle = '#2a4060';
    ctx.textAlign = 'right';
    for (let i = 0; i <= gridLines; i++) {
      const y = padTop + (plotH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();
      const val = Math.round(maxVal * (1 - i / gridLines));
      ctx.fillText(String(val), padLeft - 4, y + 3);
    }

    // Time labels
    const now = Date.now();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2a4060';
    for (let sec = 0; sec <= 300; sec += 60) {
      const x = padLeft + plotW - (sec / 300) * plotW;
      ctx.fillText(sec === 0 ? 'now' : `-${sec / 60}m`, x, h - 2);
    }

    // Draw lines per threat type
    const types = Array.from(allTypes);
    for (const type of types) {
      const color = THREAT_COLORS[type] || '#5a7090';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();

      let started = false;
      for (let i = 0; i < buf.length; i++) {
        const snap = buf[i];
        const age = (now - snap.ts) / 1000; // seconds ago
        if (age > 300) continue; // outside 5-min window
        const x = padLeft + plotW - (age / 300) * plotW;
        const val = snap.data[type] || 0;
        const y = padTop + plotH - (val / maxVal) * plotH;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Glow effect
      ctx.strokeStyle = color + '30';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // Legend (bottom-right, compact)
    if (types.length > 0) {
      const legendY = padTop + 2;
      let legendX = w - padRight - 4;
      ctx.font = `7px ${fonts.mono}`;
      ctx.textAlign = 'right';
      // Show up to 4 types in legend (reverse so most recent types are shown)
      const legendTypes = types.slice(0, 4);
      for (let i = legendTypes.length - 1; i >= 0; i--) {
        const t = legendTypes[i];
        const label = t.slice(0, 8);
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = THREAT_COLORS[t] || '#5a7090';
        ctx.fillRect(legendX - tw - 10, legendY + i * 10, 5, 5);
        ctx.fillStyle = '#5a7090';
        ctx.fillText(label, legendX, legendY + i * 10 + 5);
      }
    }
  }, [velocity, height]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height,
          borderRadius: 4,
        }}
      />
    </div>
  );
});
