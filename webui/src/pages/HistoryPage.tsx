import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../api/client'
import { useTaskStore } from '../store/useTaskStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TaskStatusBadge from '../components/migration/TaskStatusBadge'
import { Eye, RefreshCw } from 'lucide-react'

export default function HistoryPage() {
  const navigate = useNavigate()
  const tasks = useTaskStore((state) => state.tasks)
  const setTasks = useTaskStore((state) => state.setTasks)
  const pagination = useTaskStore((state) => state.pagination)
  const setPagination = useTaskStore((state) => state.setPagination)
  const statusFilter = useTaskStore((state) => state.statusFilter)
  const setStatusFilter = useTaskStore((state) => state.setStatusFilter)
  const isLoadingTasks = useTaskStore((state) => state.isLoadingTasks)
  const setIsLoadingTasks = useTaskStore((state) => state.setIsLoadingTasks)

  const [error, setError] = useState<string>('')

  const loadTasks = async () => {
    setIsLoadingTasks(true)
    setError('')
    try {
      const result = await api.listMigrations(pagination.pageSize, pagination.page * pagination.pageSize)
      setTasks(result.tasks)
      setPagination({
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoadingTasks(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [pagination.page])

  const filteredTasks = statusFilter
    ? tasks.filter((task) => task.status === statusFilter)
    : tasks

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleViewTask = (taskId: string) => {
    navigate(`/task/${taskId}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Migration History</CardTitle>
              <CardDescription>View all your migration tasks</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadTasks} disabled={isLoadingTasks}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingTasks ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" onClick={() => setStatusFilter(null)}>
                All
              </TabsTrigger>
              <TabsTrigger value="running" onClick={() => setStatusFilter('running')}>
                Running
              </TabsTrigger>
              <TabsTrigger value="completed" onClick={() => setStatusFilter('completed')}>
                Completed
              </TabsTrigger>
              <TabsTrigger value="failed" onClick={() => setStatusFilter('failed')}>
                Failed
              </TabsTrigger>
              <TabsTrigger value="cancelled" onClick={() => setStatusFilter('cancelled')}>
                Cancelled
              </TabsTrigger>
            </TabsList>
            <TabsContent value={statusFilter || 'all'} className="space-y-4 mt-4">
              {isLoadingTasks && (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              )}

              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {!isLoadingTasks && filteredTasks.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No tasks found
                </div>
              )}

              {!isLoadingTasks && filteredTasks.map((task, index) => (
                <motion.div
                  key={task.task_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <TaskStatusBadge status={task.status} />
                            <span className="text-sm text-muted-foreground">
                              {new Date(task.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            Task ID: {task.task_id}
                          </p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Files:</span>{' '}
                              <span className="font-semibold">{task.processed_files}/{task.total_files}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Data:</span>{' '}
                              <span className="font-semibold">
                                {formatBytes(task.transferred_size)}/{formatBytes(task.total_size)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Progress:</span>{' '}
                              <span className="font-semibold">{task.progress.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleViewTask(task.task_id)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {!isLoadingTasks && filteredTasks.length > 0 && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPagination({ page: pagination.page - 1 })}
                    disabled={pagination.page === 0}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page + 1} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPagination({ page: pagination.page + 1 })}
                    disabled={pagination.page >= pagination.totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  )
}
