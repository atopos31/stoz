import { useState } from 'react';
import { api } from '../api/client';
import type { MigrationOptions, ZimaOSDevice } from '../types';
import DeviceCard from '../components/DeviceCard';

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

  const [discovering, setDiscovering] = useState(false);
  const [devices, setDevices] = useState<ZimaOSDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<ZimaOSDevice | null>(null);
  const [discoveryError, setDiscoveryError] = useState<string>('');

  const [options, setOptions] = useState<MigrationOptions>({
    overwrite_existing: false,
    skip_errors: true,
    preserve_times: true,
  });

  const handleDiscoverDevices = async () => {
    setDiscovering(true);
    setDiscoveryError('');
    setDevices([]);

    try {
      const result = await api.discoverDevices();
      setDevices(result.devices || []);
      if (result.devices.length === 0) {
        setDiscoveryError('No ZimaOS devices found on the network');
      }
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSelectDevice = (device: ZimaOSDevice) => {
    setSelectedDevice(device);
    setHost(`http://${device.ip}:${device.port}`);
    setTestResult(null);
  };

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

      <div className="mb-6 border-b pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Auto Discover ZimaOS Devices</h3>
          <button
            onClick={handleDiscoverDevices}
            disabled={discovering}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 flex items-center gap-2"
          >
            {discovering ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Discovering...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Auto Discover
              </>
            )}
          </button>
        </div>

        {discoveryError && (
          <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded mb-3">
            {discoveryError}
          </div>
        )}

        {devices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {devices.map((device) => (
              <DeviceCard
                key={`${device.ip}:${device.port}`}
                device={device}
                onSelect={handleSelectDevice}
                selected={selectedDevice?.ip === device.ip && selectedDevice?.port === device.port}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ZimaOS Host (e.g., http://192.168.1.100:80)
          </label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="http://192.168.1.100:80"
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
