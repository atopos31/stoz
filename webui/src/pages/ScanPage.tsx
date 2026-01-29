import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ScanResult } from '../types';

interface Props {
  onNext: () => void;
}

export default function ScanPage({ onNext }: Props) {
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string>('');

  const handleScan = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.scan();
      setScanResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleScan();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Scan Synology Volumes</h2>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Scanning volumes...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {scanResult && !loading && (
        <div>
          <div className="mb-6">
            <p className="text-gray-600">
              Found {scanResult.volumes.length} volume(s) with{' '}
              {scanResult.volumes.reduce((acc, v) => acc + v.folders.length, 0)} folder(s)
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Scanned at: {new Date(scanResult.scanned_at).toLocaleString()}
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {scanResult.volumes.map((volume) => (
              <div key={volume.name} className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{volume.name}</h3>
                <p className="text-sm text-gray-600 mb-3">Path: {volume.path}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {volume.folders.map((folder) => (
                    <div key={folder.path} className="bg-gray-50 p-3 rounded">
                      <p className="font-medium">{folder.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Modified: {new Date(folder.modified_time).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={handleScan}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            >
              Rescan
            </button>
            <button
              onClick={onNext}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Next: Select Folders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
