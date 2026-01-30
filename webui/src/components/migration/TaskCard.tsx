import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import TaskStatusBadge from './TaskStatusBadge'
import { Eye } from 'lucide-react'
import type { MigrationTask } from '@/types'
import { formatBytes } from '@/lib/format'

interface Props {
  task: MigrationTask
  index: number
  onView: (taskId: string) => void
}

export default function TaskCard({ task, index, onView }: Props) {
  return (
    <motion.div
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
            <Button variant="outline" size="sm" onClick={() => onView(task.task_id)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
