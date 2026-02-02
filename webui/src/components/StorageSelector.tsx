import { useEffect, useState } from 'react'
import { HardDrive, RefreshCw, AlertCircle } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'
import type { StorageDevice } from '../types'
import { formatBytes } from '../lib/format'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

// Path validation rules
const validatePath = (path: string): string | null => {
  if (path === '') return null // Empty path is allowed

  if (path.includes('..')) {
    return 'Path cannot contain ..'
  }

  if (path.length > 255) {
    return 'Path must be less than 255 characters'
  }

  return null
}

// Normalize path: add leading slash if needed, remove trailing slash
const normalizePath = (path: string): string => {
  if (path === '') return ''

  // Add leading slash if not present
  let normalized = path.startsWith('/') ? path : `/${path}`

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '')

  return normalized
}

const getStorageTypeColor = (type: string): string => {
  switch (type) {
    case 'SYSTEM':
      return 'bg-blue-500'
    case 'HDD':
      return 'bg-green-500'
    case 'SSD':
      return 'bg-purple-500'
    case 'USB':
      return 'bg-orange-500'
    case 'NETWORK':
      return 'bg-cyan-500'
    default:
      return 'bg-gray-500'
  }
}

export function StorageSelector() {
  const {
    zimaosConfig,
    storageDevices,
    setStorageDevices,
    selectedStorage,
    setSelectedStorage,
    customSubPath,
    setCustomSubPath,
  } = useAppStore()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pathError, setPathError] = useState<string | null>(null)

  // Local display value (without leading slash)
  const [displayPath, setDisplayPath] = useState('')

  // Sync display path from store on mount or when customSubPath changes externally
  useEffect(() => {
    const pathWithoutSlash = customSubPath.startsWith('/') ? customSubPath.slice(1) : customSubPath
    setDisplayPath(pathWithoutSlash)
  }, [customSubPath])

  const fetchStorageList = async () => {
    if (!zimaosConfig.host || !zimaosConfig.username || !zimaosConfig.password) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await api.getStorageList(
        zimaosConfig.host,
        zimaosConfig.username,
        zimaosConfig.password
      )
      setStorageDevices(result.storages)

      // Auto-select the first healthy storage if none selected
      if (!selectedStorage && result.storages.length > 0) {
        const healthyStorage = result.storages.find(
          (s) => s.extensions?.health === true
        )
        if (healthyStorage) {
          setSelectedStorage(healthyStorage)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch storage list')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch storage list when ZimaOS config changes
  useEffect(() => {
    if (zimaosConfig.host && zimaosConfig.username && zimaosConfig.password) {
      fetchStorageList()
    }
  }, [zimaosConfig.host, zimaosConfig.username, zimaosConfig.password])

  const handleStorageChange = (storagePath: string) => {
    const storage = storageDevices.find((s) => s.path === storagePath)
    setSelectedStorage(storage || null)
  }

  const handleSubPathChange = (value: string) => {
    // Remove leading slash from display value
    const displayValue = value.startsWith('/') ? value.slice(1) : value
    setDisplayPath(displayValue)

    // Normalize and validate the path (adds leading slash)
    const normalizedPath = normalizePath(displayValue)
    const validationError = validatePath(normalizedPath)
    setPathError(validationError)

    // Store the path with leading slash
    setCustomSubPath(normalizedPath)
  }

  const getAvailableSpace = (storage: StorageDevice): string => {
    const size = storage.extensions?.size || 0
    const used = storage.extensions?.used || 0
    const available = size - used
    return formatBytes(available)
  }

  const isStorageHealthy = (storage: StorageDevice): boolean => {
    return storage.extensions?.health === true
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="storage-select">Storage Device</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStorageList}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStorageList}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {storageDevices.length === 0 && !loading && !error && (
          <div className="flex items-center gap-2 p-3 text-sm text-gray-600 bg-gray-50 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span>No storage devices found</span>
          </div>
        )}

        {storageDevices.length > 0 && (
          <Select
            value={selectedStorage?.path || ''}
            onValueChange={handleStorageChange}
            disabled={loading}
          >
            <SelectTrigger id="storage-select">
              <SelectValue placeholder="Select a storage device">
                {selectedStorage && (
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    <span>{selectedStorage.name}</span>
                    <Badge className={getStorageTypeColor(selectedStorage.type)} variant="secondary">
                      {selectedStorage.type}
                    </Badge>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {storageDevices.map((storage) => {
                const healthy = isStorageHealthy(storage)
                return (
                  <SelectItem
                    key={storage.path}
                    value={storage.path}
                    disabled={!healthy}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <HardDrive className="h-4 w-4" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{storage.name}</span>
                          <Badge className={getStorageTypeColor(storage.type)} variant="secondary">
                            {storage.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500">
                          {healthy ? (
                            <>Available: {getAvailableSpace(storage)}</>
                          ) : (
                            <span className="text-red-500">Unhealthy</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="custom-subpath">Custom Sub-path (Optional)</Label>
        <Input
          id="custom-subpath"
          type="text"
          placeholder="backup"
          value={displayPath}
          onChange={(e) => handleSubPathChange(e.target.value)}
          disabled={!selectedStorage}
        />
        {pathError && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{pathError}</span>
          </div>
        )}
        <p className="text-sm text-gray-500">
          Enter a folder name (e.g., backup, data)
        </p>
      </div>

      {selectedStorage && (
        <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
          <Label className="text-xs text-gray-500">Final Base Path:</Label>
          <p className="mt-1 font-mono text-sm font-medium">
            {zimaosConfig.basePath || selectedStorage.path}
          </p>
        </div>
      )}
    </div>
  )
}
