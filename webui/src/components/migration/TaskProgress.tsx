import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import type { TaskStatus } from '@/types'

interface Props {
  status: TaskStatus
  formatBytes: (bytes: number) => string
  formatTime: (seconds: number) => string
}

export default function TaskProgress({ status, formatBytes, formatTime }: Props) {
  const isVerifying = status.status === 'verifying'

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

        {isVerifying ? (
          <>
            <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-purple-700 dark:text-purple-300">Verifying Files</span>
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  {status.verifying_files || 0} / {status.total_files}
                </span>
              </div>
              <Progress
                value={((status.verifying_files || 0) / status.total_files) * 100}
                className="h-2"
              />
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Checking file integrity (size + time + MD5)...
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Uploaded Files</p>
                <p className="text-xl font-semibold mt-1">
                  {status.processed_files} / {status.total_files}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">Uploaded Data</p>
                <p className="text-xl font-semibold mt-1">
                  {formatBytes(status.transferred_size)} / {formatBytes(status.total_size)}
                </p>
              </div>
            </div>
          </>
        ) : (
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
        )}

        {status.current_file && (status.status === 'running' || status.status === 'verifying') && (
          <div className="mt-6">
            <p className="text-sm text-muted-foreground mb-1">
              {isVerifying ? 'Verifying file:' : 'Current file:'}
            </p>
            <p className="text-sm font-mono bg-muted p-2 rounded truncate">
              {status.current_file}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
