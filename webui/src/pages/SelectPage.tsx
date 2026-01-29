import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { ScanResult } from '../types';

interface Props {
  onNext: (folders: string[]) => void;
  onBack: () => void;
}

export default function SelectPage({ onNext, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadScanResult = async () => {
      try {
        const result = await api.scan();
        setScanResult(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load scan result');
      } finally {
        setLoading(false);
      }
    };
    loadScanResult();
  }, []);

  const toggleFolder = (path: string) => {
    const newSelected = new Set(selectedFolders);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFolders(newSelected);
  };

  const handleNext = () => {
    if (selectedFolders.size === 0) {
      alert('Please select at least one folder');
      return;
    }
    onNext(Array.from(selectedFolders));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Select Folders to Migrate</h2>
      <p className="text-gray-600 mb-6">
        Selected: {selectedFolders.size} folder(s)
      </p>

      <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
        {scanResult?.volumes.map((volume) => (
          <div key={volume.name} className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">{volume.name}</h3>
            <div className="space-y-2">
              {volume.folders.map((folder) => (
                <label
                  key={folder.path}
                  className="flex items-center p-3 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFolders.has(folder.path)}
                    onChange={() => toggleFolder(folder.path)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium">{folder.name}</p>
                    <p className="text-sm text-gray-500">{folder.path}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={selectedFolders.size === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next: Configure
        </button>
      </div>
    </div>
  );
}
