import { createBrowserRouter, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ScanPage from './pages/ScanPage'
import SelectPage from './pages/SelectPage'
import ConfigPage from './pages/ConfigPage'
import MigrationPage from './pages/MigrationPage'
import HistoryPage from './pages/HistoryPage'
import TaskDetailPage from './pages/TaskDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/workflow/scan" replace />,
      },
      {
        path: 'workflow',
        children: [
          {
            path: 'scan',
            element: <ScanPage />,
          },
          {
            path: 'select',
            element: <SelectPage />,
          },
          {
            path: 'config',
            element: <ConfigPage />,
          },
          {
            path: 'migration/:taskId',
            element: <MigrationPage />,
          },
        ],
      },
      {
        path: 'history',
        element: <HistoryPage />,
      },
      {
        path: 'task/:taskId',
        element: <TaskDetailPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
