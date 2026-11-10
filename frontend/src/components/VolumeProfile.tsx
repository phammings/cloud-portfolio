import { useRef } from 'react'
import { seededRandom, useCanvas } from '../canvas'

export type ProfileStat = { tag: 'POC' | 'VAH' | 'VAL'; value: number | null; caption: string }

const ROWS = 44
const GROW_MS = 1800

type Dot = { row: number; x: number; y: number; alpha: number; phase: number }

/**
 * A volume profile shape: two high-volume nodes with noise, the point of control (POC)
 * and the 70% value area (VAH/VAL), like a market profile on a price axis.
 */
const profile = (() => {
  const random = seededRandom(3057797)
  const bell = (i: number, center: number, spread: number) => Math.exp(-(((i / ROWS - center) / spread) ** 2))
  const volume = Array.from({ length: ROWS }, (_, i) =>
    bell(i, 0.36, 0.13) + 0.72 * bell(i, 0.7, 0.1) + 0.12 + 0.18 * random(),
  )
  const max = Math.max(...volume)
  const widths = volume.map((v) => v / max)

  const poc = widths.indexOf(1)
  const total = volume.reduce((a, b) => a + b, 0)
  let high = poc // top row of the value area (smaller index = higher price)
  let low = poc
  let inArea = volume[poc]
  while (inArea < total * 0.7) {
    const above = high > 0 ? volume[high - 1] : -1
    const below = low < ROWS - 1 ? volume[low + 1] : -1
    if (above >= below) inArea += volume[--high]
    else inArea += volume[++low]
  }

  // Dots are stored as fractions so they scale with the canvas; denser near the axis.
  const dots: Dot[] = []
  widths.forEach((width, row) => {
    const brightness = row === poc ? 1 : row >= high && row <= low ? 0.75 : 0.35
    for (let i = 0; i < Math.round(width * 150); i++) {
      dots.push({
        row,
        x: width * random() ** 1.4,
        y: 0.1 + random() * 0.8,
        alpha: brightness * (0.35 + 0.65 * random()),
        phase: random() * Math.PI * 2,
      })
    }
  })

  return { rows: { POC: poc, VAH: high, VAL: low }, dots }
})()

const rowCenter = (row: number) => (row + 0.5) / ROWS
const LABEL_GAP = 0.12 // min vertical distance between labels, as a fraction of the height

/** Label positions at their levels, pushed apart top-to-bottom so they never overlap. */
function labelTops(stats: ProfileStat[]) {
  const sorted = [...stats].sort((a, b) => profile.rows[a.tag] - profile.rows[b.tag])
  const tops = new Map<string, number>()
  let previous = -Infinity
  for (const stat of sorted) {
    previous = Math.max(rowCenter(profile.rows[stat.tag]), previous + LABEL_GAP)
    tops.set(stat.tag, previous)
  }
  return tops
}

export function VolumeProfile({ stats }: { stats: ProfileStat[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const start = useRef<number | null>(null)
  const tops = labelTops(stats)

  useCanvas(ref, (ctx, width, height, time, still) => {
    start.current ??= time
    const rowHeight = height / ROWS
    const grown = still ? 1 : 1 - (1 - Math.min((time - start.current) / GROW_MS, 1)) ** 3

    ctx.clearRect(0, 0, width, height)

    // Key levels as faint dashed lines across the profile.
    ctx.setLineDash([2, 6])
    ctx.lineWidth = 1
    for (const stat of stats) {
      const y = Math.round(rowCenter(profile.rows[stat.tag]) * height) + 0.5
      ctx.strokeStyle = stat.tag === 'POC' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Bars grow leftward from the price axis on the right edge.
    for (const dot of profile.dots) {
      if (dot.x > grown) continue
      const twinkle = still ? 1 : 0.7 + 0.3 * Math.sin(time * 0.002 + dot.phase)
      ctx.fillStyle = `rgba(255,255,255,${dot.alpha * twinkle})`
      ctx.fillRect(width - dot.x * width, (dot.row + dot.y) * rowHeight, 1.6, 1.6)
    }
  })

  return (
    <figure className="flex h-full w-full" aria-label="Site statistics drawn as a volume profile">
      {/* Absolutely positioned so the canvas's pixel size never feeds back into the layout. */}
      <div className="relative min-w-0 flex-1">
        <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />
      </div>
      <div className="relative w-36 shrink-0 border-l border-line sm:w-40">
        {stats.map((stat) => (
          <div
            key={stat.tag}
            className="absolute left-0 flex -translate-y-1/2 items-center gap-2 pl-3"
            style={{ top: `${tops.get(stat.tag)! * 100}%` }}
          >
            <span
              className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${
                stat.tag === 'POC' ? 'bg-paper text-ink' : 'border border-line text-muted'
              }`}
            >
              {stat.tag}
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-bold tabular-nums">
                {stat.value === null ? '—' : stat.value.toLocaleString()}
              </span>
              <span className="block text-[11px] uppercase tracking-wider text-muted">{stat.caption}</span>
            </span>
          </div>
        ))}
      </div>
    </figure>
  )
}
