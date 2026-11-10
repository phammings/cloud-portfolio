import { useState } from 'react'
import { FaGithub, FaLinkedinIn } from 'react-icons/fa6'
import { FiFileText, FiMail, FiMenu, FiX } from 'react-icons/fi'
import { Link, NavLink, Outlet } from 'react-router'
import { mediaUrl } from '../api'
import { useContent } from '../content'
import { Starfield } from './Starfield'

const YEAR = new Date().getFullYear()

const LINKS = [
  { to: '/about', label: 'About' },
  { to: '/projects', label: 'Projects' },
  { to: '/experience', label: 'Experience' },
  { to: '/resume', label: 'Resume' },
]

export function Layout() {
  const [open, setOpen] = useState(false)
  const { content } = useContent()
  const name = content?.profile?.name ?? 'Ryan Pham'

  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <Starfield />

      <header className="sticky top-0 z-20 border-b border-line/60 bg-ink/80 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link to="/" className="grid size-10 place-items-center border-2 border-paper pl-[0.16em] text-sm font-bold tracking-wider" onClick={() => setOpen(false)}>
            {initials(name)}
          </Link>

          <button
            type="button"
            className="p-1 text-muted hover:text-paper sm:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          <ul
            className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-full flex-col gap-1 border-b border-line bg-ink px-4 pb-4 sm:static sm:flex sm:flex-row sm:gap-8 sm:border-0 sm:bg-transparent sm:p-0`}
          >
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block py-2 text-xs font-semibold uppercase tracking-widest underline-offset-8 transition-colors sm:py-1 ${
                      isActive ? 'text-paper underline' : 'text-muted hover:text-paper'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-8">
        <Outlet />
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-xs tracking-wider text-dim sm:flex-row sm:px-8">
        <span>© {YEAR} {name.toUpperCase()}</span>
        <SocialLinks />
      </footer>
    </div>
  )
}

export function SocialLinks({ size = 18 }: { size?: number }) {
  const profile = useContent().content?.profile
  const links = [
    { href: profile?.socials?.github, label: 'GitHub', icon: <FaGithub size={size} /> },
    { href: profile?.socials?.linkedin, label: 'LinkedIn', icon: <FaLinkedinIn size={size} /> },
    { href: profile?.email && `mailto:${profile.email}`, label: 'Email', icon: <FiMail size={size} /> },
    { href: profile?.resumeKey && mediaUrl(profile.resumeKey), label: 'Resume (PDF)', icon: <FiFileText size={size} /> },
  ].filter((link) => link.href)

  return (
    <ul className="flex items-center gap-5">
      {links.map((link) => (
        <li key={link.label}>
          <a href={link.href} target="_blank" rel="noreferrer" aria-label={link.label} className="text-muted transition-colors hover:text-paper">
            {link.icon}
          </a>
        </li>
      ))}
    </ul>
  )
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
