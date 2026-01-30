import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ArrowRight } from 'lucide-react';

export default function ScanPage() {
  const navigate = useNavigate();
  const scanResult = useAppStore((state) => state.scanResult);
  const setScanResult = useAppStore((state) => state.setScanResult);
  const isScanResultValid = useAppStore((state) => state.isScanResultValid);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const [loading, setLoading] = useState(false);
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
    // Use cached scan result if it's still valid (within 5 minutes)
    if (!isScanResultValid()) {
      handleScan();
    }
  }, []);

  const handleNext = () => {
    setCurrentStep('select');
    navigate('/workflow/select');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Scan Synology Volumes</CardTitle>
          <CardDescription>
            Scanning your Synology NAS to discover available volumes and folders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Scanning volumes...</p>
              </div>
              <div className="space-y-3">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {scanResult && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="mb-6">
                <p className="text-foreground">
                  Found <span className="font-semibold">{scanResult.volumes.length}</span> volume(s) with{' '}
                  <span className="font-semibold">
                    {scanResult.volumes.reduce((acc, v) => acc + v.folders.length, 0)}
                  </span>{' '}
                  folder(s)
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Scanned at: {new Date(scanResult.scanned_at).toLocaleString()}
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {scanResult.volumes.map((volume, index) => (
                  <motion.div
                    key={volume.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{volume.name}</CardTitle>
                        <CardDescription>Path: {volume.path}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {volume.folders.map((folder) => (
                            <div key={folder.path} className="bg-muted p-3 rounded-lg">
                              <p className="font-medium truncate">{folder.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Modified: {new Date(folder.modified_time).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={handleScan}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rescan
                </Button>
                <Button onClick={handleNext}>
                  Next: Select Folders
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
