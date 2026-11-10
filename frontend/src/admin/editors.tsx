import { useState, type FormEvent, type ReactNode } from 'react'
import { FiArrowDown, FiArrowLeft, FiArrowRight, FiArrowUp, FiTrash2, FiUpload } from 'react-icons/fi'
import { mediaUrl, spotifyTrackId, type Experience, type Profile, type Project } from '../api'
import { deleteItem, saveItem, slugify, uploadFile, UPLOAD_TYPES, type ItemType } from './adminApi'
import { buttonClass, inputClass, type Act } from './styles'

const list = (text: string, separator: RegExp) =>
  text
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)

/* ---------- Profile ---------- */

export function ProfileEditor({ profile, act }: { profile: Profile | null; act: Act }) {
  const [resumeKey, setResumeKey] = useState(profile?.resumeKey ?? '')

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    const next = {
      name: text('name'),
      tagline: text('tagline'),
      about: text('about'),
      location: text('location'),
      email: text('email'),
      socials: { github: text('github'), linkedin: text('linkedin') },
      resumeKey,
    }
    act('Profile saved', (session) => saveItem(session, 'profile', 'me', next))
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={profile?.name} className={inputClass} />
        </Field>
        <Field label="Tagline" hint="The big headline on the landing page">
          <input name="tagline" required defaultValue={profile?.tagline} className={inputClass} />
        </Field>
      </div>
      <Field label="About" hint="One paragraph per line. The first paragraph is the intro on the landing page.">
        <textarea name="about" rows={8} defaultValue={profile?.about} className={inputClass} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Location">
          <input name="location" defaultValue={profile?.location} className={inputClass} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={profile?.email} className={inputClass} />
        </Field>
        <Field label="GitHub URL">
          <input name="github" type="url" defaultValue={profile?.socials?.github} className={inputClass} />
        </Field>
        <Field label="LinkedIn URL">
          <input name="linkedin" type="url" defaultValue={profile?.socials?.linkedin} className={inputClass} />
        </Field>
      </div>
      <Field group label="Resume (PDF)" hint="Uploading replaces the resume once you save the profile.">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {resumeKey ? (
            <a href={mediaUrl(resumeKey)} target="_blank" rel="noreferrer" className="underline">
              {resumeKey.split('/').pop()}
            </a>
          ) : (
            <span className="text-dim">No resume yet</span>
          )}
          <UploadButton accept="application/pdf" label="Upload PDF" act={act} onUploaded={setResumeKey} />
        </div>
      </Field>
      <div>
        <button type="submit" className={buttonClass('primary')}>
          Save profile
        </button>
      </div>
    </form>
  )
}

/* ---------- Projects ---------- */

type ProjectDraft = Omit<Project, 'tech'> & { tech: string; isNew: boolean }

export function ProjectsEditor({ projects, act }: { projects: Project[]; act: Act }) {
  const [draft, setDraft] = useState<ProjectDraft | null>(null)

  if (draft) {
    return (
      <ProjectForm
        draft={draft}
        taken={projects.map((p) => p.id)}
        act={act}
        onDone={() => setDraft(null)}
      />
    )
  }

  return (
    <ItemList
      type="project"
      noun="project"
      items={projects}
      label={(p) => p.title}
      detail={(p) => p.tech.slice(0, 4).join(' · ')}
      act={act}
      onEdit={(p) => setDraft({ ...p, tech: p.tech.join(', '), isNew: false })}
      onNew={() =>
        setDraft({
          id: '',
          title: '',
          summary: '',
          body: '',
          tech: '',
          images: [],
          github: '',
          liveUrl: '',
          featured: false,
          order: nextOrder(projects),
          isNew: true,
        })
      }
    />
  )
}

function ProjectForm({ draft: initial, taken, act, onDone }: { draft: ProjectDraft; taken: string[]; act: Act; onDone: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [idEdited, setIdEdited] = useState(!initial.isNew)
  const set = (changes: Partial<ProjectDraft>) => setDraft((d) => ({ ...d, ...changes }))
  const idTaken = draft.isNew && taken.includes(draft.id)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const { id, isNew: _isNew, tech, ...rest } = draft
    const saved = await act(`Saved “${draft.title}”`, (session) =>
      saveItem(session, 'project', id, { ...rest, tech: list(tech, /,/) }),
    )
    if (saved) onDone()
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6">
      <FormHeader title={draft.isNew ? 'New project' : `Edit ${initial.title}`} onCancel={onDone} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Title">
          <input
            required
            value={draft.title}
            onChange={(e) => set({ title: e.target.value, ...(idEdited ? {} : { id: slugify(e.target.value) }) })}
            className={inputClass}
          />
        </Field>
        <Field label="URL id" hint={draft.isNew ? `/projects/${draft.id || '…'}` : 'Fixed once created'}>
          <input
            required
            pattern="[a-z0-9][a-z0-9\-]{0,63}"
            readOnly={!draft.isNew}
            value={draft.id}
            onChange={(e) => {
              setIdEdited(true)
              set({ id: slugify(e.target.value) })
            }}
            className={`${inputClass} read-only:text-dim`}
          />
          {idTaken && <span className="mt-1 block text-xs text-red-300">Another project already uses this id</span>}
        </Field>
      </div>
      <Field label="Summary" hint="One or two sentences for the project card">
        <textarea required rows={2} value={draft.summary} onChange={(e) => set({ summary: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Description" hint="One paragraph per line">
        <textarea rows={8} value={draft.body} onChange={(e) => set({ body: e.target.value })} className={inputClass} />
      </Field>
      <Field label="Technologies" hint="Comma separated. The first four show on the card.">
        <input value={draft.tech} onChange={(e) => set({ tech: e.target.value })} className={inputClass} />
      </Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Live URL">
          <input type="url" value={draft.liveUrl ?? ''} onChange={(e) => set({ liveUrl: e.target.value })} className={inputClass} />
        </Field>
        <Field label="GitHub URL">
          <input type="url" value={draft.github ?? ''} onChange={(e) => set({ github: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field group label="Images" hint="The first image is the card cover.">
        <div className="grid gap-4 sm:grid-cols-3">
          {draft.images.map((image, i) => (
            <figure key={image} className="border border-line bg-panel p-2">
              <img src={mediaUrl(image)} alt="" className="aspect-video w-full object-contain" />
              <figcaption className="mt-2 flex justify-between gap-2 text-xs">
                {i === 0 ? (
                  <span className="text-dim">Cover</span>
                ) : (
                  <button type="button" className="text-muted hover:text-paper" onClick={() => set({ images: [image, ...draft.images.filter((x) => x !== image)] })}>
                    Make cover
                  </button>
                )}
                <button type="button" className="text-red-300 hover:underline" onClick={() => set({ images: draft.images.filter((x) => x !== image) })}>
                  Remove
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-4">
          <UploadButton
            accept={UPLOAD_TYPES.filter((t) => t.startsWith('image/')).join(',')}
            label="Add image"
            act={act}
            onUploaded={(key) => setDraft((d) => ({ ...d, images: [...d.images, key] }))}
          />
        </div>
      </Field>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={!!draft.featured} onChange={(e) => set({ featured: e.target.checked })} className="size-4 accent-paper" />
        Featured
      </label>
      <div className="flex gap-4">
        <button type="submit" disabled={idTaken} className={buttonClass('primary')}>
          {draft.isNew ? 'Create project' : 'Save project'}
        </button>
        <button type="button" onClick={onDone} className={buttonClass('ghost')}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ---------- Experience ---------- */

type ExperienceDraft = Omit<Experience, 'tech' | 'bullets'> & { tech: string; bullets: string; isNew: boolean }

export function ExperienceEditor({ experience, act }: { experience: Experience[]; act: Act }) {
  const [draft, setDraft] = useState<ExperienceDraft | null>(null)

  if (draft) {
    return <ExperienceForm draft={draft} taken={experience.map((e) => e.id)} act={act} onDone={() => setDraft(null)} />
  }

  return (
    <ItemList
      type="experience"
      noun="role"
      items={experience}
      label={(e) => `${e.role} · ${e.company}`}
      detail={(e) => `${e.start} – ${e.end || 'Present'}`}
      act={act}
      onEdit={(e) => setDraft({ ...e, tech: e.tech.join(', '), bullets: e.bullets.join('\n'), isNew: false })}
      onNew={() =>
        setDraft({ id: '', company: '', role: '', start: '', end: '', location: '', bullets: '', tech: '', order: nextOrder(experience), isNew: true })
      }
    />
  )
}

function ExperienceForm({ draft: initial, taken, act, onDone }: { draft: ExperienceDraft; taken: string[]; act: Act; onDone: () => void }) {
  const [draft, setDraft] = useState(initial)
  const set = (changes: Partial<ExperienceDraft>) => setDraft((d) => ({ ...d, ...changes }))
  // New roles get an id from company + role; existing ids never change.
  const id = draft.isNew ? slugify(`${draft.company} ${draft.role}`) : draft.id
  const idTaken = draft.isNew && taken.includes(id)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const { id: _id, isNew: _isNew, tech, bullets, ...rest } = draft
    const saved = await act(`Saved “${draft.role}”`, (session) =>
      saveItem(session, 'experience', id, { ...rest, tech: list(tech, /,/), bullets: list(bullets, /\n/) }),
    )
    if (saved) onDone()
  }

  return (
    <form onSubmit={submit} className="grid max-w-3xl gap-6">
      <FormHeader title={draft.isNew ? 'New role' : `Edit ${initial.role}`} onCancel={onDone} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Role">
          <input required value={draft.role} onChange={(e) => set({ role: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Company">
          <input required value={draft.company} onChange={(e) => set({ company: e.target.value })} className={inputClass} />
          {idTaken && <span className="mt-1 block text-xs text-red-300">This role at this company already exists</span>}
        </Field>
        <Field label="Start" hint="e.g. Jan 2024">
          <input required value={draft.start} onChange={(e) => set({ start: e.target.value })} className={inputClass} />
        </Field>
        <Field label="End" hint="Leave empty for Present">
          <input value={draft.end ?? ''} onChange={(e) => set({ end: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Location">
          <input value={draft.location ?? ''} onChange={(e) => set({ location: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Technologies" hint="Comma separated">
          <input value={draft.tech} onChange={(e) => set({ tech: e.target.value })} className={inputClass} />
        </Field>
      </div>
      <Field label="Highlights" hint="One bullet per line">
        <textarea rows={6} value={draft.bullets} onChange={(e) => set({ bullets: e.target.value })} className={inputClass} />
      </Field>
      <div className="flex gap-4">
        <button type="submit" disabled={idTaken || !id} className={buttonClass('primary')}>
          {draft.isNew ? 'Create role' : 'Save role'}
        </button>
        <button type="button" onClick={onDone} className={buttonClass('ghost')}>
          Cancel
        </button>
      </div>
    </form>
  )
}

/* ---------- Secret ---------- */

export function SecretEditor({ secret, act }: { secret: { images: string[]; spotifyUrl?: string } | null; act: Act }) {
  const [images, setImages] = useState(secret?.images ?? [])
  const [spotifyUrl, setSpotifyUrl] = useState(secret?.spotifyUrl ?? '')
  const spotifyInvalid = spotifyUrl.trim() !== '' && !spotifyTrackId(spotifyUrl.trim())
  const move = (index: number, offset: -1 | 1) =>
    setImages((list) => {
      const next = [...list]
      ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
      return next
    })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    act('Slideshow saved', (session) => saveItem(session, 'secret', 'me', { images, spotifyUrl: spotifyUrl.trim() }))
  }

  return (
    <form onSubmit={submit} className="grid max-w-4xl gap-6">
      <p className="text-sm text-muted">
        Click the site logo 3 times quickly to play these images as a fullscreen slideshow. Changes apply once you save.
      </p>
      {images.length === 0 ? (
        <p className="text-dim">No images yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, i) => (
            <li key={image} className="border border-line bg-panel p-2">
              <img src={mediaUrl(image)} alt={`Slide ${i + 1}`} className="aspect-square w-full object-cover" />
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-dim">#{i + 1}</span>
                <span className="flex gap-1">
                  <IconButton label="Move earlier" disabled={i === 0} onClick={() => move(i, -1)}>
                    <FiArrowLeft />
                  </IconButton>
                  <IconButton label="Move later" disabled={i === images.length - 1} onClick={() => move(i, 1)}>
                    <FiArrowRight />
                  </IconButton>
                  <IconButton label={`Remove slide ${i + 1}`} onClick={() => setImages((list) => list.filter((x) => x !== image))}>
                    <FiTrash2 className="text-red-300" />
                  </IconButton>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Field label="Spotify track link" hint="Plays in Spotify's player during the slideshow. Leave empty for no music.">
        <input
          type="url"
          placeholder="https://open.spotify.com/track/…"
          value={spotifyUrl}
          onChange={(e) => setSpotifyUrl(e.target.value)}
          className={inputClass}
        />
        {spotifyInvalid && <span className="mt-1 block text-xs text-red-300">Paste a Spotify track link (open.spotify.com/track/…)</span>}
      </Field>
      <div className="flex flex-wrap gap-4">
        <UploadButton
          multiple
          accept={UPLOAD_TYPES.filter((t) => t.startsWith('image/')).join(',')}
          label="Add images"
          act={act}
          onUploaded={(key) => setImages((list) => [...list, key])}
        />
        <button type="submit" disabled={spotifyInvalid} className={buttonClass('primary')}>
          Save slideshow
        </button>
      </div>
    </form>
  )
}

/* ---------- Shared ---------- */

type Ordered = { id: string; order: number }

const nextOrder = (items: Ordered[]) => Math.max(0, ...items.map((i) => i.order ?? 0)) + 1

function ItemList<T extends Ordered>({
  type,
  noun,
  items,
  label,
  detail,
  act,
  onEdit,
  onNew,
}: {
  type: ItemType
  noun: string
  items: T[]
  label: (item: T) => string
  detail: (item: T) => string
  act: Act
  onEdit: (item: T) => void
  onNew: () => void
}) {
  // Swap order values with the neighbour; the API sorts by order.
  const move = (index: number, offset: -1 | 1) => {
    const a = items[index]
    const b = items[index + offset]
    act('Order updated', (session) =>
      Promise.all([
        saveItem(session, type, a.id, withoutId({ ...a, order: b.order })),
        saveItem(session, type, b.id, withoutId({ ...b, order: a.order })),
      ]),
    )
  }

  return (
    <div className="max-w-3xl">
      <button type="button" onClick={onNew} className={`${buttonClass('primary')} mb-6`}>
        New {noun}
      </button>
      {items.length === 0 ? (
        <p className="text-muted">No {noun}s yet.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {items.map((item, i) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              <div className="flex flex-col">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <FiArrowUp />
                </IconButton>
                <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>
                  <FiArrowDown />
                </IconButton>
              </div>
              <button type="button" onClick={() => onEdit(item)} className="min-w-0 flex-1 text-left">
                <span className="block truncate font-semibold hover:underline">{label(item)}</span>
                <span className="block truncate text-xs text-dim">{detail(item)}</span>
              </button>
              <IconButton
                label={`Delete ${label(item)}`}
                onClick={() => {
                  if (confirm(`Delete “${label(item)}”? This can't be undone.`)) {
                    act(`Deleted “${label(item)}”`, (session) => deleteItem(session, type, item.id))
                  }
                }}
              >
                <FiTrash2 className="text-red-300" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const withoutId = <T extends { id: string }>({ id: _id, ...rest }: T) => rest

function UploadButton({
  accept,
  label,
  multiple,
  act,
  onUploaded,
}: {
  accept: string
  label: string
  multiple?: boolean
  act: Act
  onUploaded: (key: string) => void
}) {
  return (
    <label className={`${buttonClass('ghost')} cursor-pointer`}>
      <FiUpload /> {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = '' // allow picking the same file again
          if (files.length === 0) return
          const done = files.length === 1 ? `Uploaded ${files[0].name}` : `Uploaded ${files.length} files`
          act(done, async (session) => {
            for (const file of files) onUploaded(await uploadFile(session, file))
          })
        }}
      />
    </label>
  )
}

/** A labelled input. Use `group` when the content has several controls (a <label> may only wrap one). */
function Field({ label, hint, group, children }: { label: string; hint?: string; group?: boolean; children: ReactNode }) {
  const Wrapper = group ? 'div' : 'label'
  return (
    <Wrapper className="block" {...(group && { role: 'group', 'aria-label': label })}>
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-dim">{hint}</span>}
    </Wrapper>
  )
}

function FormHeader({ title, onCancel }: { title: string; onCancel: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-xl font-bold uppercase tracking-wide">{title}</h2>
      <button type="button" onClick={onCancel} className="text-xs uppercase tracking-widest text-muted hover:text-paper">
        ← Back
      </button>
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="p-1 text-muted hover:text-paper disabled:opacity-25">
      {children}
    </button>
  )
}
