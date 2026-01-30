import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

/**
 * Hook to automatically recover to migration page if there's an active task
 * Use this in the main app or layout to enable task recovery
 */
export function useTaskRecovery() {
  const navigate = useNavigate()
  const currentTaskId = useAppStore((state) => state.currentTaskId)
  const currentStep = useAppStore((state) => state.currentStep)

  useEffect(() => {
    // If we have a task ID and we're in migration step, recover to migration page
    if (currentTaskId && currentStep === 'migration') {
      // Check if we're not already on the migration page
      if (!window.location.pathname.includes('/migration/')) {
        navigate(`/workflow/migration/${currentTaskId}`, { replace: true })
      }
    }
  }, [])
}
