import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { CollectionDashboard } from '@/pages/CollectionDashboard'
import { NotFound } from '@/pages/NotFound'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <CollectionDashboard />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
