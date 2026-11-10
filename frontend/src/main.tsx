import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Layout } from './components/Layout'
import { ContentProvider } from './content'
import './index.css'
import { Experience } from './pages/Experience'
import { Landing } from './pages/Landing'
import { NotFound } from './pages/NotFound'
import { ProjectDetail } from './pages/ProjectDetail'
import { Projects } from './pages/Projects'
import { Resume } from './pages/Resume'

// Admin code is split into its own chunk so public visitors never download it.
const Admin = lazy(() => import('./admin/Admin'))

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'projects', element: <Projects /> },
      { path: 'projects/:id', element: <ProjectDetail /> },
      { path: 'experience', element: <Experience /> },
      { path: 'resume', element: <Resume /> },
      {
        path: 'admin',
        element: (
          <Suspense fallback={<p className="py-12 text-xs uppercase tracking-widest text-dim">Loading…</p>}>
            <Admin />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ContentProvider>
      <RouterProvider router={router} />
    </ContentProvider>
  </StrictMode>,
)
