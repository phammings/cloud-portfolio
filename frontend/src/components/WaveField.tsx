import { useRef } from 'react'
import { useCanvas } from '../canvas'

const COLUMN_GAP = 14 // px between strands
const DOT_GAP = 6 // px between dots in a strand
const FADE = 0.18 // top/bottom fraction that fades out

/** Background of dot columns swaying sideways in slow, overlapping sine waves. */
export function WaveField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useCanvas(ref, (ctx, width, height, time, still) => {
    const t = still ? 0 : time
    const columns = Math.floor(width / COLUMN_GAP)
    const margin = (width - (columns - 1) * COLUMN_GAP) / 2

    ctx.clearRect(0, 0, width, height)
    for (let c = 0; c < columns; c++) {
      const across = c / Math.max(columns - 1, 1) // 0..1 left to right
      const amplitude = 4 + 16 * Math.sin(Math.PI * across) // calmer at the edges, wider in the middle
      const baseX = margin + c * COLUMN_GAP

      for (let y = 0; y <= height; y += DOT_GAP) {
        const x =
          baseX +
          amplitude * Math.sin(y * 0.011 + t * 0.0006 + c * 0.32) +
          amplitude * 0.4 * Math.sin(y * 0.029 - t * 0.0004 + c * 0.85)

        const edge = Math.min(y / height, 1 - y / height) / FADE
        const fade = Math.min(edge, 1) * (0.35 + 0.65 * Math.sin(Math.PI * across))
        // A soft band of brightness travelling down each strand.
        const shimmer = Math.sin(y * 0.018 - t * 0.0012 + c * 0.45) ** 2
        ctx.fillStyle = `rgba(255,255,255,${fade * (0.12 + 0.7 * shimmer)})`
        ctx.fillRect(x, y, 1.6, 1.6)
      }
    }
  })

  return <canvas ref={ref} aria-hidden className={`pointer-events-none ${className}`} />
}
