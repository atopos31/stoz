import { useState } from 'react';
import { api } from '../api/client';
import type { MigrationOptions } from '../types';

interface Props {
  selectedFolders: string[];
  onNext: (taskId: string) => void;
  onBack: () => void;
}

export default function ConfigPage({ selectedFolders, onNext, onBack }: Props) {
  const [host, setHost] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [basePath, setBasePath] = useState('/DATA');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');

  const [options, setOptions] = useState<MigrationOptions>({
    overwrite_existing: false,
    skip_errors: true,
    preserve_times: true,
  });

  const handleTestConnection = async () => {
    if (!host || !username || !password) {
      alert('Please fill in all ZimaOS connection details');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      await api.testConnection(host, username, password);
      setTestResult({ success: true, message: 'Connection successful!' });
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleStartMigration = async () => {
    if (!testResult?.success) {
      alert('Please test the connection first');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const result = await api.createMigration(
        selectedFolders,
        host,
        username,
        password,
        basePath,
        options
      );
      onNext(result.task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create migration task');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Configure Migration</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Selected Folders ({selectedFolders.length})</h3>
        <div className="bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
          {selectedFolders.map((folder) => (
            <p key={folder} className="text-sm text-gray-700 py-1">{folder}</p>
          ))}
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZimaOS Host (e.g., http://192.168.1.100:8080)
          </label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://192.168.1.100:8080"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base Path on ZimaOS
          </label>
          <input
            type="text"
            value={basePath}
            onChange={(e) => setBasePath(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300"
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <div
              className={`mt-2 px-3 py-2 rounded ${
                testResult.success
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      <div className="border-t pt-6 mb-6">
        <h3 className="font-semibold mb-3">Migration Options</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.overwrite_existing}
              onChange={(e) => setOptions({ ...options, overwrite_existing: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Overwrite existing files</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.skip_errors}
              onChange={(e) => setOptions({ ...options, skip_errors: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Skip errors and continue</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={options.preserve_times}
              onChange={(e) => setOptions({ ...options, preserve_times: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Preserve file timestamps</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleStartMigration}
          disabled={!testResult?.success || creating}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {creating ? 'Creating...' : 'Start Migration'}
        </button>
      </div>
    </div>
  );
}
