import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import type { TaskStatus, MigrationTask } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import TaskStatusBadge from '../components/migration/TaskStatusBadge'
import TaskProgress from '../components/migration/TaskProgress'
import { ArrowLeft, Pause, Play, X } from 'lucide-react'
import { useTaskStore } from '../store/useTaskStore'

export default function TaskDetailPage() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()
  const getTaskById = useTaskStore((state) => state.getTaskById)

  const [status, setStatus] = useState<TaskStatus | null>(null)
  const [task, setTask] = useState<MigrationTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0s'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  useEffect(() => {
    if (!taskId) return

    const loadTask = async () => {
      try {
        // Try to get from store first
        const cachedTask = getTaskById(taskId)
        if (cachedTask) {
          setTask(cachedTask)
        }

        // Fetch current status
        const statusResult = await api.getMigrationStatus(taskId)
        setStatus(statusResult)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task')
      } finally {
        setLoading(false)
      }
    }

    loadTask()

    // Poll for updates if task is active
    const interval = setInterval(async () => {
      if (!taskId) return
      try {
        const statusResult = await api.getMigrationStatus(taskId)
        setStatus(statusResult)
      } catch (err) {
        // Ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [taskId])

  const handlePause = async () => {
    if (!taskId) return
    try {
      await api.pauseMigration(taskId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to pause')
    }
  }

  const handleResume = async () => {
    if (!taskId) return
    try {
      await api.resumeMigration(taskId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resume')
    }
  }

  const handleCancel = async () => {
    if (!taskId) return
    if (!confirm('Are you sure you want to cancel this migration?')) {
      return
    }
    try {
      await api.cancelMigration(taskId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
          <Button variant="outline" onClick={() => navigate('/history')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const isRunning = status.status === 'running'
  const isPaused = status.status === 'paused'
  const isCompleted = status.status === 'completed'
  const isFailed = status.status === 'failed'
  const isCancelled = status.status === 'cancelled'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Task Details</CardTitle>
              <CardDescription>Task ID: {taskId}</CardDescription>
            </div>
            <TaskStatusBadge status={status.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Status</h3>
            <TaskProgress status={status} formatBytes={formatBytes} formatTime={formatTime} />
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Created:</span>{' '}
                <span className="font-medium">{task?.created_at ? new Date(task.created_at).toLocaleString() : 'N/A'}</span>
              </div>
              {status.started_at && (
                <div>
                  <span className="text-muted-foreground">Started:</span>{' '}
                  <span className="font-medium">{new Date(status.started_at).toLocaleString()}</span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Updated:</span>{' '}
                <span className="font-medium">{new Date(status.updated_at).toLocaleString()}</span>
              </div>
              {status.failed_files > 0 && (
                <div>
                  <span className="text-muted-foreground">Failed Files:</span>{' '}
                  <span className="font-medium text-destructive">{status.failed_files}</span>
                </div>
              )}
            </div>
          </div>

          {status.failed_files > 0 && (
            <>
              <Separator />
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg">
                {status.failed_files} file(s) failed to migrate
              </div>
            </>
          )}

          {isCompleted && (
            <>
              <Separator />
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
                Migration completed successfully!
              </div>
            </>
          )}

          {isFailed && (
            <>
              <Separator />
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                Migration failed. Please check the error logs.
              </div>
            </>
          )}

          {isCancelled && (
            <>
              <Separator />
              <div className="bg-muted border px-4 py-3 rounded-lg">
                Migration was cancelled.
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" onClick={() => navigate('/history')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to History
            </Button>

            <div className="space-x-2">
              {isRunning && (
                <>
                  <Button variant="outline" onClick={handlePause}>
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                  <Button variant="destructive" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
              {isPaused && (
                <>
                  <Button onClick={handleResume}>
                    <Play className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                  <Button variant="destructive" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
