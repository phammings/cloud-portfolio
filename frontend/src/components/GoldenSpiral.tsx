import { useRef } from 'react'
import { seededRandom, useCanvas } from '../canvas'

export type SpiralStat = { value: number | null; caption: string }

const DOTS = 720
const PHI = (1 + Math.sqrt(5)) / 2
const ARMS = 3 // golden spirals lit up through the seed field
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ≈ 137.5°, the angle between successive sunflower seeds
const GROW_MS = 2200
const SPIN_PER_MS = 0.00004

/** Seed n sits at angle n·φ and radius √n (Vogel's model), which forms the Fibonacci spiral arms. */
const seeds = (() => {
  const random = seededRandom(1618)
  return Array.from({ length: DOTS }, (_, n) => {
    const radius = Math.sqrt(n / DOTS) // 0 at the center, 1 at the edge
    const angle = n * GOLDEN_ANGLE
    // A golden spiral grows by φ every quarter turn: θ = (π/2)·log_φ(r). Seeds near one of its arms glow.
    const spiralAngle = (Math.PI / 2) * (Math.log(Math.max(radius, 0.02)) / Math.log(PHI))
    const onArm = ((Math.cos(ARMS * (angle - spiralAngle)) + 1) / 2) ** 4
    return {
      angle,
      radius,
      size: 1.4 + radius * 4,
      alpha: (0.16 + 0.84 * onArm) * (1 - radius * 0.25) * (0.8 + 0.2 * random()),
      phase: random() * Math.PI * 2,
    }
  })
})()

export function GoldenSpiral({ stats }: { stats: SpiralStat[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const start = useRef<number | null>(null)

  useCanvas(ref, (ctx, width, height, time, still) => {
    start.current ??= time
    const elapsed = time - start.current
    const grown = still ? 1 : 1 - (1 - Math.min(elapsed / GROW_MS, 1)) ** 3
    const visible = Math.round(DOTS * grown)
    const spin = still ? 0 : elapsed * SPIN_PER_MS
    const maxRadius = (Math.min(width, height) / 2) * 0.94
    const cx = width / 2
    const cy = height / 2

    ctx.clearRect(0, 0, width, height)
    for (let i = 0; i < visible; i++) {
      const seed = seeds[i]
      const angle = seed.angle + spin
      const r = seed.radius * maxRadius
      const twinkle = still ? 1 : 0.7 + 0.3 * Math.sin(elapsed * 0.002 + seed.phase)
      ctx.fillStyle = `rgba(255,255,255,${seed.alpha * twinkle})`
      ctx.beginPath()
      ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), seed.size / 2, 0, Math.PI * 2)
      ctx.fill()
    }
  })

  return (
    <figure className="flex h-full w-full items-center gap-6" aria-label="Site statistics beside a golden-angle spiral">
      {/* Absolutely positioned so the canvas's pixel size never feeds back into the layout. */}
      <div className="relative h-full min-w-0 flex-1">
        <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />
      </div>
      <dl className="flex shrink-0 flex-col gap-8 border-l border-line pl-6">
        {stats.map((stat) => (
          // dt before dd in the DOM for screen readers; flipped visually so the number sits on top.
          <div key={stat.caption} className="flex flex-col-reverse">
            <dt className="mt-1 text-[11px] uppercase tracking-widest text-muted">{stat.caption}</dt>
            <dd className="text-3xl font-extrabold tabular-nums sm:text-4xl">
              {stat.value === null ? '—' : stat.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  )
}
