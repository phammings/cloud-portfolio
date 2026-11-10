const API_URL = import.meta.env.VITE_API_URL
const SESSION_KEY = 'portfolio-admin-session'

export type Session = { token: string; expiresAt: number }
export type ItemType = 'profile' | 'project' | 'experience'

/** The access token has expired or was rejected; the user has to log in again. */
export class SessionExpired extends Error {}

// sessionStorage keeps you logged in across reloads but not across browser restarts.
export function loadSession(): Session | null {
  try {
    const session: Session | null = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null')
    return session && session.expiresAt > Date.now() ? session : null
  } catch {
    return null
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // storage unavailable: nothing to clear
  }
}

export async function login(email: string, password: string): Promise<Session> {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? `Login failed (${response.status})`)

  // Treat the token as expired a minute early so a request never races the expiry.
  const session = { token: body.accessToken, expiresAt: Date.now() + (body.expiresIn - 60) * 1000 }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // storage unavailable: the session just won't survive a reload
  }
  return session
}

async function authed<T>(session: Session, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${session.token}`, 'content-type': 'application/json' },
  })
  if (response.status === 401) throw new SessionExpired('Your session expired. Log in again.')
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? `Request failed (${response.status})`)
  return body
}

export const saveItem = (session: Session, type: ItemType, id: string, data: object) =>
  authed(session, `/items/${type}/${id}`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteItem = (session: Session, type: ItemType, id: string) =>
  authed(session, `/items/${type}/${id}`, { method: 'DELETE' })

export const UPLOAD_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** Uploads straight to S3 with a presigned POST and returns the stored key (e.g. media/<id>/resume.pdf). */
export async function uploadFile(session: Session, file: File): Promise<string> {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Only PDF, PNG, JPEG, WebP or GIF files can be uploaded')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Files must be 10 MB or smaller')

  const { key, url, fields } = await authed<{ key: string; url: string; fields: Record<string, string> }>(
    session,
    '/uploads',
    { method: 'POST', body: JSON.stringify({ filename: file.name, contentType: file.type }) },
  )
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  form.append('file', file) // S3 requires the file to be the last field
  const response = await fetch(url, { method: 'POST', body: form })
  if (!response.ok) throw new Error(`Upload failed (${response.status})`)
  return key
}

export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
