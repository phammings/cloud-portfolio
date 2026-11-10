import type { ReactNode } from 'react'
import { useContent } from '../content'

/** Page heading in the boxed, wide-tracked style of the landing name. */
export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="pt-16 pb-12 sm:pt-24">
      <title>{`${title} · Ryan Pham`}</title>
      <h1 className="text-4xl font-extrabold uppercase tracking-wide sm:text-6xl">{title}</h1>
      {intro && <p className="mt-4 max-w-2xl text-lg font-light text-muted">{intro}</p>}
    </header>
  )
}

export function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <li key={item} className="border border-line px-2 py-0.5 text-xs tracking-wide text-muted">
          {item}
        </li>
      ))}
    </ul>
  )
}

/** Renders children once content has loaded; otherwise a loading or error line. */
export function WithContent({ children }: { children: ReactNode }) {
  const { content, error } = useContent()
  if (error) return <p className="py-8 text-muted">Couldn't load content. Refresh to try again.</p>
  if (!content) return <p className="py-8 text-xs uppercase tracking-widest text-dim">Loading…</p>
  return children
}
