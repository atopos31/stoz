import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import StepIndicator from '../workflow/StepIndicator'
import { useTaskRecovery } from '@/hooks/useTaskRecovery'

export default function Layout() {
  useTaskRecovery()
  const location = useLocation()
  const isInWorkflow = location.pathname.includes('/workflow')

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {isInWorkflow ? (
        <div className="flex max-w-7xl mx-auto">
          {/* Left Sidebar */}
          <aside className="w-40 flex-shrink-0 border-r">
            <div className="sticky top-6 px-4">
              <StepIndicator />
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 py-6 px-4">
            <Outlet />
          </main>
        </div>
      ) : (
        <main className="max-w-7xl mx-auto py-6 px-4">
          <Outlet />
        </main>
      )}
    </div>
  )
}
