import { useState, type FormEvent } from 'react'
import { useContent } from '../content'
import { clearSession, loadSession, login, SessionExpired, type Session } from './adminApi'
import { ExperienceEditor, ProfileEditor, ProjectsEditor } from './editors'
import { buttonClass, inputClass, type Act } from './styles'

const TABS = ['Profile', 'Projects', 'Experience'] as const
type Tab = (typeof TABS)[number]
type Notice = { kind: 'ok' | 'error'; text: string }

export default function Admin() {
  const { content, reload } = useContent()
  const [session, setSession] = useState<Session | null>(loadSession)
  const [tab, setTab] = useState<Tab>('Profile')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  /** Runs an admin action, refreshes content and reports the result; logs out if the token expired. */
  const act: Act = async (success, action) => {
    if (!session) return false
    setBusy(true)
    setNotice(null)
    try {
      await action(session)
      await reload()
      setNotice({ kind: 'ok', text: success })
      return true
    } catch (error) {
      if (error instanceof SessionExpired) {
        clearSession()
        setSession(null)
      }
      setNotice({ kind: 'error', text: (error as Error).message })
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pt-12 pb-16">
      <title>Admin · Ryan Pham</title>
      <meta name="robots" content="noindex" />

      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold uppercase tracking-wide sm:text-4xl">Admin</h1>
        {session && (
          <button
            type="button"
            className={buttonClass('ghost')}
            onClick={() => {
              clearSession()
              setSession(null)
              setNotice(null)
            }}
          >
            Log out
          </button>
        )}
      </header>

      {notice && (
        <p
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`mb-8 border px-4 py-3 text-sm ${notice.kind === 'error' ? 'border-red-400/60 text-red-300' : 'border-line text-muted'}`}
        >
          {notice.text}
        </p>
      )}

      {!session ? (
        <LoginForm onLogin={setSession} />
      ) : !content ? (
        <p className="text-xs uppercase tracking-widest text-dim">Loading…</p>
      ) : (
        <>
          <nav className="mb-10 flex gap-8 border-b border-line" aria-label="Admin sections">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-current={tab === name ? 'page' : undefined}
                className={`-mb-px border-b-2 pb-3 text-xs font-semibold uppercase tracking-widest transition-colors ${
                  tab === name ? 'border-paper text-paper' : 'border-transparent text-muted hover:text-paper'
                }`}
              >
                {name}
              </button>
            ))}
          </nav>

          <fieldset disabled={busy} className="disabled:opacity-60">
            {tab === 'Profile' && <ProfileEditor profile={content.profile} act={act} />}
            {tab === 'Projects' && <ProjectsEditor projects={content.projects} act={act} />}
            {tab === 'Experience' && <ExperienceEditor experience={content.experience} act={act} />}
          </fieldset>
        </>
      )}
    </div>
  )
}

function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      onLogin(await login(String(form.get('email')), String(form.get('password'))))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">Email</span>
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending} className={buttonClass('primary')}>
        {pending ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}
