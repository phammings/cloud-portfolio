import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { countView, paragraphs } from '../api'
import { SocialLinks } from '../components/Layout'
import { WaveField } from '../components/WaveField'
import { useContent } from '../content'

export function Landing() {
  const { content } = useContent()
  const [views, setViews] = useState<number | null>(null)

  useEffect(() => {
    countView().then(setViews).catch(() => {})
  }, [])

  const profile = content?.profile
  const firstName = profile?.name.split(' ')[0] ?? 'Ryan'
  const techCount = new Set(content?.projects.flatMap((p) => p.tech)).size

  return (
    <section className="relative grid min-h-[calc(100dvh-8rem)] items-center gap-12 py-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* Waves sit behind the whole hero, faded out under the text so they blend into it. */}
      <WaveField className="absolute inset-y-0 -right-4 -z-10 h-full w-[calc(100%+2rem)] [mask-image:linear-gradient(to_bottom,transparent_45%,black_80%)] sm:-right-8 lg:w-[70%] lg:[mask-image:linear-gradient(to_right,transparent,black_45%)]" />

      <title>{profile ? `${profile.name} · ${profile.tagline}` : 'Ryan Pham'}</title>

      <div>
        <div className="flex flex-wrap items-center justify-between gap-6">
          <h1 className="border-2 border-paper px-5 py-3 text-3xl font-bold uppercase tracking-wider sm:text-4xl">
            I'm {firstName}
          </h1>
          <SocialLinks size={20} />
        </div>

        <p className="mt-16 text-4xl leading-tight font-extrabold uppercase tracking-wide sm:mt-24 sm:text-5xl">
          {profile?.tagline ?? ' '}
        </p>
        <p className="mt-8 max-w-xl text-lg leading-relaxed font-light text-muted sm:text-xl">
          {paragraphs(profile?.about)[0]}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/projects" className="bg-paper px-6 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-80">
            View projects
          </Link>
          <Link to="/resume" className="border border-paper px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-paper hover:text-ink">
            Resume
          </Link>
        </div>
      </div>

      <dl className="relative flex flex-col gap-10 lg:pl-16">
        {/* Soft dark glow so the waves fade out behind the numbers instead of boxing them in. */}
        <div aria-hidden className="absolute -inset-16 -z-10 bg-[radial-gradient(closest-side,var(--color-ink)_35%,transparent)]" />
        {[
          { value: views, caption: 'Site views' },
          { value: content ? content.projects.length : null, caption: 'Projects' },
          { value: content ? techCount : null, caption: 'Technologies' },
        ].map((stat) => (
          // dt before dd in the DOM for screen readers; flipped visually so the number sits on top.
          <div key={stat.caption} className="flex flex-col-reverse">
            <dt className="mt-1 text-xs uppercase tracking-widest text-muted">{stat.caption}</dt>
            <dd className="text-4xl leading-none font-extrabold tracking-wide tabular-nums sm:text-5xl">
              {stat.value === null ? '—' : stat.value.toLocaleString()}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
