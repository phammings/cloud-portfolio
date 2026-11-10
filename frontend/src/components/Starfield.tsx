import { useRef } from 'react'
import { useCanvas } from '../canvas'

type Star = { x: number; y: number; size: number; alpha: number; speed: number; phase: number }

/** Sparse, slowly drifting white dots behind every page. */
export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null)
  const stars = useRef<Star[]>([])
  const size = useRef({ width: 0, height: 0 })

  useCanvas(ref, (ctx, width, height, time, still) => {
    if (size.current.width !== width || size.current.height !== height) {
      size.current = { width, height }
      stars.current = Array.from({ length: Math.round((width * height) / 9000) }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.6 + Math.random() * 1.4,
        alpha: 0.15 + Math.random() * 0.6,
        speed: 0.002 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    ctx.clearRect(0, 0, width, height)
    for (const star of stars.current) {
      const y = still ? star.y : (((star.y - time * star.speed) % height) + height) % height
      const twinkle = still ? 1 : 0.6 + 0.4 * Math.sin(time * 0.0015 + star.phase)
      ctx.fillStyle = `rgba(255,255,255,${star.alpha * twinkle})`
      ctx.fillRect(star.x, y, star.size, star.size)
    }
  })

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />
}
