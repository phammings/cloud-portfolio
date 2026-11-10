import { Link } from 'react-router'
import { mediaUrl } from '../api'
import { PageHeader, Tags, WithContent } from '../components/ui'
import { useContent } from '../content'

export function Projects() {
  const projects = useContent().content?.projects ?? []

  return (
    <>
      <PageHeader title="Projects" intro="Things I've designed, built and shipped." />
      <WithContent>
        <ul className="grid gap-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id} className="border border-line bg-ink/60 transition-colors hover:border-dim">
              <Link to={`/projects/${project.id}`} className="group flex h-full flex-col p-6 transition-colors hover:bg-panel">
                {project.images[0] && (
                  <img
                    src={mediaUrl(project.images[0])}
                    alt=""
                    loading="lazy"
                    className="mb-6 aspect-video w-full object-contain opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                )}
                <h2 className="text-lg font-bold uppercase tracking-wide">{project.title}</h2>
                <p className="mt-2 mb-6 flex-1 text-sm leading-relaxed text-muted">{project.summary}</p>
                <Tags items={project.tech.slice(0, 4)} />
              </Link>
            </li>
          ))}
        </ul>
      </WithContent>
    </>
  )
}
