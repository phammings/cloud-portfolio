const API_URL = import.meta.env.VITE_API_URL
const MEDIA_URL = import.meta.env.VITE_MEDIA_URL ?? ''

export type Profile = {
  name: string
  tagline: string
  about: string
  location?: string
  email?: string
  socials?: { github?: string; linkedin?: string }
  resumeKey?: string
}

export type Project = {
  id: string
  title: string
  summary: string
  body: string
  tech: string[]
  images: string[]
  github?: string
  liveUrl?: string
  order: number
  featured?: boolean
}

export type Experience = {
  id: string
  company: string
  role: string
  start: string
  end?: string
  location?: string
  bullets: string[]
  tech: string[]
  order: number
}

export type Content = {
  profile: Profile | null
  secret: { images: string[] } | null
  projects: Project[]
  experience: Experience[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, init)
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status}`)
  return response.json()
}

export const getContent = () => request<Content>('/content')

// One count per page load, even if the landing page mounts twice (StrictMode, navigating back).
let viewsRequest: Promise<number> | undefined
export const countView = () =>
  (viewsRequest ??= request<{ views: number }>('/views', { method: 'POST' }).then((r) => r.views))

export const mediaUrl = (key: string) => `${MEDIA_URL}/${key}`

// Plain text from the admin -> paragraphs, one per line
export const paragraphs = (text = '') => text.split(/\n+/).map((p) => p.trim()).filter(Boolean)
