import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import type { ZimaOSDevice } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Server } from 'lucide-react';

interface DeviceConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'discovered' | 'manual';
  device?: ZimaOSDevice | null;
  onSuccess: (config: { host: string; username: string; password: string }) => void;
}

export default function DeviceConfigDialog({
  open,
  onOpenChange,
  mode,
  device,
  onSuccess,
}: DeviceConfigDialogProps) {
  const [formData, setFormData] = useState({
    host: '',
    username: '',
    password: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<{ host?: string; username?: string; password?: string }>({});

  // Reset form when dialog opens/closes or mode changes
  useEffect(() => {
    if (open) {
      if (mode === 'discovered' && device) {
        setFormData({
          host: `http://${device.ip}:${device.port}`,
          username: '',
          password: '',
        });
      } else {
        setFormData({
          host: '',
          username: '',
          password: '',
        });
      }
      setTestResult(null);
      setErrors({});
    }
  }, [open, mode, device]);

  const validateForm = (): boolean => {
    const newErrors: { host?: string; username?: string; password?: string } = {};

    if (mode === 'manual') {
      if (!formData.host) {
        newErrors.host = 'Host is required';
      } else if (!formData.host.startsWith('http://') && !formData.host.startsWith('https://')) {
        newErrors.host = 'Host must start with http:// or https://';
      }
    }

    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      await api.testConnection(formData.host, formData.username, formData.password);
      setTestResult({ success: true, message: 'Connection successful!' });

      // Auto-save and close after 2 seconds
      setTimeout(() => {
        onSuccess({
          host: formData.host,
          username: formData.username,
          password: formData.password,
        });
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = () => {
    if (testResult?.success) {
      onSuccess({
        host: formData.host,
        username: formData.username,
        password: formData.password,
      });
      onOpenChange(false);
    } else {
      handleTestConnection();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'discovered' ? 'Connect to ZimaOS Device' : 'Add Device Manually'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'discovered'
              ? 'Enter your credentials to connect to this device'
              : 'Enter the device host and credentials to connect'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Device Info Card (Discovered Mode) */}
          {mode === 'discovered' && device && (
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Server className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="font-semibold text-lg">{device.device_name}</h3>
                    <p className="text-sm text-muted-foreground">{device.device_model}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{device.ip}:{device.port}</Badge>
                      <Badge variant="outline">{device.os_version}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Host Input (Manual Mode) */}
          {mode === 'manual' && (
            <div className="space-y-2">
              <Label htmlFor="host">
                Host <span className="text-destructive">*</span>
              </Label>
              <Input
                id="host"
                placeholder="http://192.168.1.100:80"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className={errors.host ? 'border-destructive' : ''}
              />
              {errors.host && <p className="text-sm text-destructive">{errors.host}</p>}
              <p className="text-xs text-muted-foreground">
                Example: http://192.168.1.100:80 or http://zimaos.local
              </p>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-2">
            <Label htmlFor="username">
              Username <span className="text-destructive">*</span>
            </Label>
            <Input
              id="username"
              placeholder="Enter username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={errors.username ? 'border-destructive' : ''}
            />
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Password <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className={errors.password ? 'border-destructive' : ''}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          {/* Test Connection Button */}
          <Button
            onClick={handleTestConnection}
            disabled={testing}
            variant="outline"
            className="w-full"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {/* Test Result */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-lg border ${
                  testResult.success
                    ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                }`}
              >
                <div className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <XCircle className="h-5 w-5" />
                  )}
                  <span className="font-medium">{testResult.message}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={testing}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={testing || !testResult?.success}>
            {testResult?.success ? 'Connected' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
