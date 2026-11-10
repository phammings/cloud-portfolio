import { FiDownload } from 'react-icons/fi'
import { mediaUrl } from '../api'
import { PageHeader, WithContent } from '../components/ui'
import { useContent } from '../content'

export function Resume() {
  const resumeKey = useContent().content?.profile?.resumeKey

  return (
    <>
      <PageHeader title="Resume" />
      <WithContent>
        {resumeKey ? (
          <div className="pb-16">
            <a
              href={mediaUrl(resumeKey)}
              download
              className="mb-8 inline-flex items-center gap-2 bg-paper px-6 py-3 text-xs font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-80"
            >
              <FiDownload /> Download PDF
            </a>
            {/* Phones usually can't render inline PDFs, so they get the button only. */}
            <iframe src={mediaUrl(resumeKey)} title="Resume" className="hidden h-[80vh] w-full border border-line bg-paper md:block" />
          </div>
        ) : (
          <p className="pb-16 text-muted">Resume coming soon.</p>
        )}
      </WithContent>
    </>
  )
}
