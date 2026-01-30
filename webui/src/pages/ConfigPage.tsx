import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import DeviceCard from '../components/DeviceCard';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

export default function ConfigPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const selectedFolders = useAppStore((state) => state.selectedFolders);
  const zimaosConfig = useAppStore((state) => state.zimaosConfig);
  const setZimaosConfig = useAppStore((state) => state.setZimaosConfig);
  const migrationOptions = useAppStore((state) => state.migrationOptions);
  const setMigrationOptions = useAppStore((state) => state.setMigrationOptions);
  const discoveredDevices = useAppStore((state) => state.discoveredDevices);
  const setDiscoveredDevices = useAppStore((state) => state.setDiscoveredDevices);
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const setSelectedDevice = useAppStore((state) => state.setSelectedDevice);
  const setCurrentTaskId = useAppStore((state) => state.setCurrentTaskId);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>('');
  const [discovering, setDiscovering] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string>('');

  const handleDiscoverDevices = async () => {
    setDiscovering(true);
    setDiscoveryError('');
    setDiscoveredDevices([]);

    try {
      const result = await api.discoverDevices();
      setDiscoveredDevices(result.devices || []);
      if (result.devices.length === 0) {
        setDiscoveryError('No ZimaOS devices found on the network');
      }
    } catch (err) {
      setDiscoveryError(err instanceof Error ? err.message : 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleSelectDevice = (device: typeof selectedDevice) => {
    if (device) {
      setSelectedDevice(device);
      setZimaosConfig({ host: `http://${device.ip}:${device.port}` });
      setTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    if (!zimaosConfig.host || !zimaosConfig.username || !zimaosConfig.password) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all ZimaOS connection details',
        variant: 'destructive',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError('');

    try {
      await api.testConnection(zimaosConfig.host, zimaosConfig.username, zimaosConfig.password);
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
      toast({
        title: 'Connection Not Tested',
        description: 'Please test the connection first',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    setError('');

    try {
      const result = await api.createMigration(
        selectedFolders,
        zimaosConfig.host,
        zimaosConfig.username,
        zimaosConfig.password,
        zimaosConfig.basePath,
        migrationOptions
      );
      setCurrentTaskId(result.task_id);
      setCurrentStep('migration');
      navigate(`/workflow/migration/${result.task_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create migration task');
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('select');
    navigate('/workflow/select');
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

        {discoveredDevices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {discoveredDevices.map((device) => (
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
            value={zimaosConfig.host}
            onChange={(e) => setZimaosConfig({ host: e.target.value })}
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
            value={zimaosConfig.username}
            onChange={(e) => setZimaosConfig({ username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={zimaosConfig.password}
            onChange={(e) => setZimaosConfig({ password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Base Path on ZimaOS
          </label>
          <input
            type="text"
            value={zimaosConfig.basePath}
            onChange={(e) => setZimaosConfig({ basePath: e.target.value })}
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
              checked={migrationOptions.overwrite_existing}
              onChange={(e) => setMigrationOptions({ overwrite_existing: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Overwrite existing files</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={migrationOptions.skip_errors}
              onChange={(e) => setMigrationOptions({ skip_errors: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Skip errors and continue</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={migrationOptions.preserve_times}
              onChange={(e) => setMigrationOptions({ preserve_times: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Preserve file timestamps</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={migrationOptions.include_recycle}
              onChange={(e) => setMigrationOptions({ include_recycle: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="ml-2 text-sm">Include recycle bin (#recycle folders)</span>
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
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleStartMigration}
          disabled={!testResult?.success || creating}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {creating && <Loader2 className="h-4 w-4 animate-spin" />}
          {creating ? 'Creating...' : 'Start Migration'}
        </button>
      </div>

      {/* Creating Migration Dialog */}
      <Dialog open={creating} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Preparing Migration
            </DialogTitle>
            <DialogDescription>
              Please wait while we prepare your migration task...
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
                Scanning selected folders
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
                Calculating total size
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
                Creating migration task
              </div>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
