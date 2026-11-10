import { FaGithub } from 'react-icons/fa6'
import { FiArrowLeft, FiExternalLink } from 'react-icons/fi'
import { Link, useParams } from 'react-router'
import { mediaUrl, paragraphs } from '../api'
import { PageHeader, Tags, WithContent } from '../components/ui'
import { useContent } from '../content'
import { NotFound } from './NotFound'

export function ProjectDetail() {
  const { id } = useParams()
  const { content } = useContent()
  const project = content?.projects.find((p) => p.id === id)

  if (content && !project) return <NotFound />

  return (
    <WithContent>
      {project && (
        <article className="pb-16">
          <Link to="/projects" className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-muted hover:text-paper">
            <FiArrowLeft /> All projects
          </Link>
          <PageHeader title={project.title} intro={project.summary} />

          <div className="grid gap-12 md:grid-cols-[2fr_1fr]">
            <div className="space-y-5 text-lg leading-relaxed font-light text-muted">
              {paragraphs(project.body).map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <aside className="space-y-8 border-l border-line pl-6">
              <Tags items={project.tech} />
              <div className="flex flex-col gap-3 text-sm">
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                    <FiExternalLink /> View live
                  </a>
                )}
                {project.github && (
                  <a href={project.github} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 hover:underline">
                    <FaGithub /> Source code
                  </a>
                )}
              </div>
            </aside>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {project.images.map((image) => (
              <img key={image} src={mediaUrl(image)} alt={`${project.title} screenshot`} loading="lazy" className="w-full border border-line bg-panel object-contain" />
            ))}
          </div>
        </article>
      )}
    </WithContent>
  )
}
