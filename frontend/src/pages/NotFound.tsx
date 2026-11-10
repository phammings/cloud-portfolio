import { Link } from 'react-router'
import { PageHeader } from '../components/ui'

export function NotFound() {
  return (
    <div className="pb-16">
      <PageHeader title="404" intro="This page doesn't exist." />
      <Link to="/" className="border border-paper px-6 py-3 text-xs font-bold uppercase tracking-widest transition-colors hover:bg-paper hover:text-ink">
        Back home
      </Link>
    </div>
  )
}
