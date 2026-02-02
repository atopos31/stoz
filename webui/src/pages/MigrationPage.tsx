import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import type { TaskStatus } from '../types';
import { useTaskStore } from '../store/useTaskStore';
import { useAppStore } from '../store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import TaskProgress from '../components/migration/TaskProgress';
import TaskStatusBadge from '../components/migration/TaskStatusBadge';
import { Pause, Play, X, Home, Loader2, FolderOpen, FolderInput } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatBytes, formatTime } from '@/lib/format';

export default function MigrationPage() {
  const navigate = useNavigate();
  const { taskId } = useParams<{ taskId: string }>();
  const { toast } = useToast();
  const setActiveTaskStatus = useTaskStore((state) => state.setActiveTaskStatus);
  const reset = useAppStore((state) => state.reset);
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!taskId) return;

    const fetchStatus = async () => {
      try {
        const result = await api.getMigrationStatus(taskId);
        setStatus(result);
        setActiveTaskStatus(taskId, result);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);

    return () => clearInterval(interval);
  }, [taskId, setActiveTaskStatus]);

  const handlePause = async () => {
    if (!taskId) return;
    try {
      await api.pauseMigration(taskId);
      toast({
        title: 'Migration Paused',
        description: 'The migration has been paused successfully',
      });
    } catch (err) {
      toast({
        title: 'Failed to Pause',
        description: err instanceof Error ? err.message : 'Failed to pause',
        variant: 'destructive',
      });
    }
  };

  const handleResume = async () => {
    if (!taskId) return;
    try {
      await api.resumeMigration(taskId);
      toast({
        title: 'Migration Resumed',
        description: 'The migration has been resumed successfully',
      });
    } catch (err) {
      toast({
        title: 'Failed to Resume',
        description: err instanceof Error ? err.message : 'Failed to resume',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async () => {
    if (!taskId) return;
    if (!confirm('Are you sure you want to cancel this migration?')) {
      return;
    }
    try {
      await api.cancelMigration(taskId);
      toast({
        title: 'Migration Cancelled',
        description: 'The migration has been cancelled',
      });
    } catch (err) {
      toast({
        title: 'Failed to Cancel',
        description: err instanceof Error ? err.message : 'Failed to cancel',
        variant: 'destructive',
      });
    }
  };

  const handleBackToStart = () => {
    reset();
    navigate('/workflow/select');
  };

  if (!taskId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
            Invalid task ID
          </div>
          <Button variant="outline" onClick={handleBackToStart}>
            <Home className="mr-2 h-4 w-4" />
            Back to Start
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5 text-primary" />
              </motion.div>
              Loading Migration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
          <Button variant="outline" onClick={handleBackToStart}>
            <Home className="mr-2 h-4 w-4" />
            Back to Start
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const isCompleted = status.status === 'completed';
  const isFailed = status.status === 'failed';
  const isCancelled = status.status === 'cancelled';
  const isPaused = status.status === 'paused';
  const isRunning = status.status === 'running';

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
            <CardTitle>Migration Progress</CardTitle>
            <TaskStatusBadge status={status.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Path Information Section */}
          <div className="border-b pb-4 space-y-3">
            {/* From Directory */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                From (Source Folders)
              </h4>
              <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                {status.source_folders && status.source_folders.length > 0 ? (
                  status.source_folders.map((folder, index) => (
                    <p key={index} className="text-sm text-gray-700 py-1 font-mono">
                      {folder}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No source folders</p>
                )}
              </div>
            </div>

            {/* To Directory */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <FolderInput className="h-4 w-4" />
                To (Destination)
              </h4>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm font-mono text-gray-700">
                  {status.zimaos_host}
                  <span className="text-blue-600 font-semibold">{status.base_path}</span>
                </p>
              </div>
            </div>
          </div>

          <TaskProgress status={status} formatBytes={formatBytes} formatTime={formatTime} />

          {status.failed_files > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg"
            >
              {status.failed_files} file(s) failed to migrate
            </motion.div>
          )}

          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg"
            >
              Migration completed successfully!
            </motion.div>
          )}

          {isFailed && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              Migration failed. Please check the error logs.
            </div>
          )}

          {isCancelled && (
            <div className="bg-muted border px-4 py-3 rounded-lg">
              Migration was cancelled.
            </div>
          )}

          <div className="flex justify-between">
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
            {(isCompleted || isFailed || isCancelled) && (
              <Button onClick={handleBackToStart}>
                <Home className="mr-2 h-4 w-4" />
                Start New Migration
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
