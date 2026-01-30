import { Outlet } from 'react-router-dom'
import Header from './Header'
import { useTaskRecovery } from '@/hooks/useTaskRecovery'

export default function Layout() {
  useTaskRecovery()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  )
}
