import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { CollectionDashboard } from '@/pages/CollectionDashboard'
import { LoginPage } from '@/pages/LoginPage'
import { RequireAuth } from '@/components/RequireAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <RequireAuth>
            <CollectionDashboard />
          </RequireAuth>
        ),
      },
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
])
