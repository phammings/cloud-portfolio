import { PageHeader, Tags, WithContent } from '../components/ui'
import { useContent } from '../content'

export function Experience() {
  const experience = useContent().content?.experience ?? []

  return (
    <>
      <PageHeader title="Experience" intro="Where I've worked and what I built there." />
      <WithContent>
        {experience.length === 0 ? (
          <p className="pb-16 text-muted">Coming soon.</p>
        ) : (
          <ol className="border-l border-line pb-16">
            {experience.map((job) => (
              <li key={job.id} className="relative pb-12 pl-8 last:pb-0">
                <span className="absolute top-2 -left-[5px] size-[9px] bg-paper" aria-hidden />
                <p className="text-xs uppercase tracking-widest text-dim">
                  {job.start} – {job.end || 'Present'}
                  {job.location && ` · ${job.location}`}
                </p>
                <h2 className="mt-2 text-xl font-bold uppercase tracking-wide">{job.role}</h2>
                <p className="text-muted">{job.company}</p>
                {job.bullets.length > 0 && (
                  <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed font-light text-muted marker:text-dim">
                    {job.bullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                )}
                {job.tech.length > 0 && (
                  <div className="mt-4">
                    <Tags items={job.tech} />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </WithContent>
    </>
  )
}
