import { useCallback, useEffect, useRef, useState } from 'react'
import { FiX } from 'react-icons/fi'
import { mediaUrl } from '../api'

const SLIDE_MS = 4500
const FADE_MS = 700

/** Fullscreen easter-egg slideshow: dims the page, then crossfades through the images with a slow zoom. */
export function SecretSlideshow({ images, onClose }: { images: string[]; onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const openedAt = useRef(0)

  // Fade out before unmounting so closing mirrors the dim-in.
  const close = useCallback(() => {
    setShown(false)
    setTimeout(onClose, FADE_MS)
  }, [onClose])

  useEffect(() => {
    openedAt.current = performance.now()
    const frame = requestAnimationFrame(() => setShown(true))
    closeButton.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
      if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [close, images.length])

  // Restart the timer whenever the slide changes, so arrow keys don't get skipped right after.
  useEffect(() => {
    if (images.length < 2) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % images.length), SLIDE_MS)
    return () => clearTimeout(timer)
  }, [index, images.length])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Secret slideshow"
      onClick={() => {
        // Ignore stray clicks from the logo triple-click (e.g. a 4th fast click) landing on the new overlay.
        if (performance.now() - openedAt.current > FADE_MS) close()
      }}
      className="fixed inset-0 z-50 cursor-pointer bg-black transition-opacity ease-out"
      style={{ opacity: shown ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
    >
      {images.map((image, i) => (
        <img
          key={image}
          src={mediaUrl(image)}
          alt={`Slide ${i + 1} of ${images.length}`}
          aria-hidden={i !== index}
          className={`absolute inset-0 h-full w-full object-contain p-6 sm:p-16 ${
            i === index ? 'opacity-100 motion-safe:scale-105' : 'opacity-0'
          }`}
          // Crossfade quickly, zoom slowly across the whole slide.
          style={{ transition: `opacity 1.2s ease, scale ${SLIDE_MS + 1200}ms linear` }}
        />
      ))}

      <button
        ref={closeButton}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          close()
        }}
        aria-label="Close slideshow"
        className="absolute top-4 right-4 p-2 text-muted transition-colors hover:text-paper"
      >
        <FiX size={24} />
      </button>

      {images.length > 1 && (
        <ol className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center gap-2" aria-hidden>
          {images.map((image, i) => (
            <li key={image} className={`h-1 w-6 transition-colors ${i === index ? 'bg-paper' : 'bg-paper/25'}`} />
          ))}
        </ol>
      )}
    </div>
  )
}
