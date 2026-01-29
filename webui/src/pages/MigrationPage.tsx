import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { TaskStatus } from '../types';

interface Props {
  taskId: string;
  onBack: () => void;
}

export default function MigrationPage({ taskId, onBack }: Props) {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const result = await api.getMigrationStatus(taskId);
        setStatus(result);
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
  }, [taskId]);

  const handlePause = async () => {
    try {
      await api.pauseMigration(taskId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      await api.resumeMigration(taskId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this migration?')) {
      return;
    }
    try {
      await api.cancelMigration(taskId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    if (seconds === 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading migration status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back to Start
        </button>
      </div>
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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Migration Progress</h2>

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Status: <span className="font-semibold">{status.status}</span></span>
          <span>{status.progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted ? 'bg-green-600' : isFailed || isCancelled ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${status.progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600">Files</p>
          <p className="text-xl font-semibold">
            {status.processed_files} / {status.total_files}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600">Data</p>
          <p className="text-xl font-semibold">
            {formatBytes(status.transferred_size)} / {formatBytes(status.total_size)}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600">Speed</p>
          <p className="text-xl font-semibold">{formatBytes(status.speed)}/s</p>
        </div>
        <div className="bg-gray-50 p-4 rounded">
          <p className="text-sm text-gray-600">ETA</p>
          <p className="text-xl font-semibold">{formatTime(status.eta)}</p>
        </div>
      </div>

      {status.failed_files > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded mb-4">
          {status.failed_files} file(s) failed to migrate
        </div>
      )}

      {status.current_file && isRunning && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-1">Current file:</p>
          <p className="text-sm font-mono bg-gray-50 p-2 rounded truncate">
            {status.current_file}
          </p>
        </div>
      )}

      {isCompleted && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Migration completed successfully!
        </div>
      )}

      {isFailed && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          Migration failed. Please check the error logs.
        </div>
      )}

      {isCancelled && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded mb-4">
          Migration was cancelled.
        </div>
      )}

      <div className="flex justify-between">
        <div className="space-x-2">
          {isRunning && (
            <>
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Pause
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </>
          )}
          {isPaused && (
            <>
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Resume
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Cancel
              </button>
            </>
          )}
        </div>
        {(isCompleted || isFailed || isCancelled) && (
          <button
            onClick={onBack}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Start New Migration
          </button>
        )}
      </div>
    </div>
  );
}
