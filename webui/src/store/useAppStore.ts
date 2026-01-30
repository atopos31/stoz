import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ScanResult, MigrationOptions, ZimaOSDevice } from '../types'

export type WorkflowStep = 'scan' | 'select' | 'config' | 'migration'

interface AppState {
  // Workflow state
  currentStep: WorkflowStep
  setCurrentStep: (step: WorkflowStep) => void

  // Selected folders
  selectedFolders: string[]
  setSelectedFolders: (folders: string[]) => void
  addSelectedFolder: (folder: string) => void
  removeSelectedFolder: (folder: string) => void
  clearSelectedFolders: () => void

  // Current task
  currentTaskId: string
  setCurrentTaskId: (taskId: string) => void

  // Scan result cache
  scanResult: ScanResult | null
  scanResultTimestamp: number | null
  setScanResult: (result: ScanResult) => void
  clearScanResult: () => void
  isScanResultValid: () => boolean

  // ZimaOS configuration
  zimaosConfig: {
    host: string
    username: string
    password: string
    basePath: string
  }
  setZimaosConfig: (config: Partial<AppState['zimaosConfig']>) => void
  clearZimaosPassword: () => void

  // Discovered devices
  discoveredDevices: ZimaOSDevice[]
  setDiscoveredDevices: (devices: ZimaOSDevice[]) => void
  selectedDevice: ZimaOSDevice | null
  setSelectedDevice: (device: ZimaOSDevice | null) => void

  // Migration options
  migrationOptions: MigrationOptions
  setMigrationOptions: (options: Partial<MigrationOptions>) => void

  // Reset all state
  reset: () => void
}

const SCAN_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const initialState = {
  currentStep: 'scan' as WorkflowStep,
  selectedFolders: [],
  currentTaskId: '',
  scanResult: null,
  scanResultTimestamp: null,
  zimaosConfig: {
    host: '',
    username: '',
    password: '',
    basePath: '/DATA',
  },
  discoveredDevices: [],
  selectedDevice: null,
  migrationOptions: {
    overwrite_existing: false,
    skip_errors: true,
    preserve_times: true,
    include_recycle: false,
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      setSelectedFolders: (folders) => set({ selectedFolders: folders }),
      addSelectedFolder: (folder) =>
        set((state) => ({ selectedFolders: [...state.selectedFolders, folder] })),
      removeSelectedFolder: (folder) =>
        set((state) => ({
          selectedFolders: state.selectedFolders.filter(f => f !== folder)
        })),
      clearSelectedFolders: () => set({ selectedFolders: [] }),

      setCurrentTaskId: (taskId) => set({ currentTaskId: taskId }),

      setScanResult: (result) =>
        set({ scanResult: result, scanResultTimestamp: Date.now() }),
      clearScanResult: () =>
        set({ scanResult: null, scanResultTimestamp: null }),
      isScanResultValid: () => {
        const { scanResult, scanResultTimestamp } = get()
        if (!scanResult || !scanResultTimestamp) return false
        return Date.now() - scanResultTimestamp < SCAN_CACHE_TTL
      },

      setZimaosConfig: (config) =>
        set((state) => ({
          zimaosConfig: { ...state.zimaosConfig, ...config }
        })),
      clearZimaosPassword: () =>
        set((state) => ({
          zimaosConfig: { ...state.zimaosConfig, password: '' }
        })),

      setDiscoveredDevices: (devices) => set({ discoveredDevices: devices }),
      setSelectedDevice: (device) => set({ selectedDevice: device }),

      setMigrationOptions: (options) =>
        set((state) => ({
          migrationOptions: { ...state.migrationOptions, ...options }
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'stoz-app-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Persist these fields
        currentStep: state.currentStep,
        selectedFolders: state.selectedFolders,
        currentTaskId: state.currentTaskId,
        scanResult: state.scanResult,
        scanResultTimestamp: state.scanResultTimestamp,
        zimaosConfig: {
          host: state.zimaosConfig.host,
          username: state.zimaosConfig.username,
          // Don't persist password for security
          password: '',
          basePath: state.zimaosConfig.basePath,
        },
        discoveredDevices: state.discoveredDevices,
        selectedDevice: state.selectedDevice,
        migrationOptions: state.migrationOptions,
      }),
    }
  )
)
