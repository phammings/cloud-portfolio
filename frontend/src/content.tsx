import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getContent, type Content } from './api'

type State = { content: Content | null; error: Error | null; reload: () => Promise<void> }

const ContentContext = createContext<State>({ content: null, error: null, reload: async () => {} })

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<Content | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const reload = useCallback(
    () =>
      getContent()
        .then((next) => {
          setContent(next)
          setError(null)
        })
        .catch((err: Error) => setError(err)),
    [],
  )

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo(() => ({ content, error, reload }), [content, error, reload])
  return <ContentContext value={value}>{children}</ContentContext>
}

export const useContent = () => use(ContentContext)
