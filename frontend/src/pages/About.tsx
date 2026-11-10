import type { ReactNode } from 'react'
import { paragraphs } from '../api'
import { SocialLinks } from '../components/Layout'
import { PageHeader, WithContent } from '../components/ui'
import { useContent } from '../content'

export function About() {
  const profile = useContent().content?.profile

  return (
    <>
      <PageHeader title="About me" intro={profile?.tagline} />
      <WithContent>
        <div className="grid gap-12 pb-16 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6 text-lg leading-relaxed font-light text-muted">
            {paragraphs(profile?.about).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
          <dl className="space-y-6 border-l border-line pl-6 text-sm">
            {profile?.location && <Detail label="Based in" value={profile.location} />}
            {profile?.email && <Detail label="Email" value={<a href={`mailto:${profile.email}`} className="hover:underline">{profile.email}</a>} />}
            <Detail label="Elsewhere" value={<SocialLinks />} />
          </dl>
        </div>
      </WithContent>
    </>
  )
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="mb-2 text-xs uppercase tracking-widest text-dim">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
