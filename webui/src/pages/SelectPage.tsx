import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SelectPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const scanResult = useAppStore((state) => state.scanResult);
  const setScanResult = useAppStore((state) => state.setScanResult);
  const selectedFolders = useAppStore((state) => state.selectedFolders) || [];
  const setSelectedFolders = useAppStore((state) => state.setSelectedFolders);
  const isScanResultValid = useAppStore((state) => state.isScanResultValid);
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [rescanning, setRescanning] = useState(false);

  const handleScan = async () => {
    setRescanning(true);
    setError('');
    try {
      const result = await api.scan();
      setScanResult(result);
      toast({
        title: 'Scan Complete',
        description: `Found ${result.volumes?.length || 0} volume(s)`,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to scan';
      setError(errorMsg);
      toast({
        title: 'Scan Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setRescanning(false);
    }
  };

  useEffect(() => {
    const loadScanResult = async () => {
      // Use cached scan result if available and valid
      if (isScanResultValid()) {
        setLoading(false);
        return;
      }

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
    if (selectedFolders.includes(path)) {
      setSelectedFolders(selectedFolders.filter(f => f !== path));
    } else {
      setSelectedFolders([...selectedFolders, path]);
    }
  };

  const handleNext = () => {
    if (selectedFolders.length === 0) {
      toast({
        title: 'No Folders Selected',
        description: 'Please select at least one folder',
        variant: 'destructive',
      });
      return;
    }
    setCurrentStep('config');
    navigate('/workflow/config');
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>Select Folders to Migrate</CardTitle>
          <CardDescription>
            Selected: <span className="font-semibold text-foreground">{selectedFolders.length}</span> folder(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6 max-h-[600px] overflow-y-auto">
            {scanResult?.volumes?.map((volume, volumeIndex) => (
              <motion.div
                key={volume.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: volumeIndex * 0.1 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{volume.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {volume.folders?.map((folder) => (
                        <label
                          key={folder.path}
                          className="flex items-center p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedFolders.includes(folder.path)}
                            onCheckedChange={() => toggleFolder(folder.path)}
                          />
                          <div className="ml-3 flex-1">
                            <p className="font-medium">{folder.name}</p>
                            <p className="text-sm text-muted-foreground">{folder.path}</p>
                          </div>
                        </label>
                      )) || <p className="text-sm text-muted-foreground">No folders found</p>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )) || <p className="text-sm text-muted-foreground">No volumes found</p>}
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={handleScan}
              disabled={rescanning || loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${rescanning ? 'animate-spin' : ''}`} />
              {rescanning ? 'Scanning...' : 'Rescan'}
            </Button>
            <Button onClick={handleNext} disabled={selectedFolders.length === 0}>
              Next: Configure
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
