import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import type { TaskStatus } from '@/types'

interface Props {
  status: TaskStatus
  formatBytes: (bytes: number) => string
  formatTime: (seconds: number) => string
}

export default function TaskProgress({ status, formatBytes, formatTime }: Props) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress: <span className="font-semibold text-foreground">{status.status}</span></span>
            <span className="font-semibold text-foreground">{status.progress.toFixed(1)}%</span>
          </div>
          <Progress value={status.progress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Files</p>
            <p className="text-xl font-semibold mt-1">
              {status.processed_files} / {status.total_files}
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Data</p>
            <p className="text-xl font-semibold mt-1">
              {formatBytes(status.transferred_size)} / {formatBytes(status.total_size)}
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Speed</p>
            <p className="text-xl font-semibold mt-1">{formatBytes(status.speed)}/s</p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">ETA</p>
            <p className="text-xl font-semibold mt-1">{formatTime(status.eta)}</p>
          </div>
        </div>

        {status.current_file && status.status === 'running' && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-1">Current file:</p>
            <p className="text-sm font-mono bg-muted p-2 rounded truncate">
              {status.current_file}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
