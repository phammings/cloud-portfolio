import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import { getContent, type Content } from './api'

type State = { content: Content | null; error: Error | null }

const ContentContext = createContext<State>({ content: null, error: null })

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ content: null, error: null })

  useEffect(() => {
    getContent()
      .then((content) => setState({ content, error: null }))
      .catch((error: Error) => setState({ content: null, error }))
  }, [])

  return <ContentContext value={state}>{children}</ContentContext>
}

export const useContent = () => use(ContentContext)
