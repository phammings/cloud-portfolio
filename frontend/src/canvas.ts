import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

export type Frame = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number, still: boolean) => void

/**
 * Sizes a canvas to its CSS box at device pixel ratio and calls `frame` every animation frame.
 * With prefers-reduced-motion it draws once per resize instead of animating.
 */
export function useCanvas(ref: RefObject<HTMLCanvasElement | null>, frame: Frame) {
  // Latest frame without restarting the loop when props change.
  const frameRef = useRef(frame)
  useLayoutEffect(() => {
    frameRef.current = frame
  })

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let raf = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (still) frameRef.current(ctx, width, height, 0, true)
    }
    const loop = (time: number) => {
      frameRef.current(ctx, width, height, time, false)
      raf = requestAnimationFrame(loop)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    if (!still) raf = requestAnimationFrame(loop)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [ref])
}

/** Small seeded PRNG so generated shapes look the same on every load. */
export function seededRandom(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
