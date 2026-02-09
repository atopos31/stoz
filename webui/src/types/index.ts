export interface FolderInfo {
  path: string;
  name: string;
  size: number;
  file_count: number;
  modified_time: string;
  children?: FolderInfo[];
}

export interface VolumeInfo {
  name: string;
  path: string;
  folders: FolderInfo[];
}

export interface ScanResult {
  volumes: VolumeInfo[];
  scanned_at: string;
}

export interface MigrationTask {
  id: number;
  task_id: string;
  status: string;
  error: string;
  source_folders: string;
  zimaos_host: string;
  zimaos_username: string;
  base_path: string;
  total_files: number;
  processed_files: number;
  failed_files: number;
  total_size: number;
  transferred_size: number;
  progress: number;
  options: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface TaskStatus {
  task_id: string;
  status: string;
  error?: string;
  current_file: string;
  current_file_size: number;
  current_file_transferred: number;
  current_file_progress: number;
  speed: number;
  processed_files: number;
  total_files: number;
  transferred_size: number;
  total_size: number;
  progress: number;
  failed_files: number;
  // Verification progress fields
  verifying_files: number;
  verify_failed_files: number;
  started_at: string;
  updated_at: string;

  // Path information fields
  source_folders: string[];  // Source folder paths
  zimaos_host: string;       // ZimaOS host address
  base_path: string;         // Target base path
}

export interface MigrationOptions {
  overwrite_existing: boolean;
  skip_errors: boolean;
  preserve_times: boolean;
  include_recycle: boolean;
}

export interface ZimaOSDevice {
  device_model: string;
  device_name: string;
  hash: string;
  initialized: boolean;
  lan_ipv4: string[];
  os_version: string;
  port: number;
  request_ip: string;
  ip: string;
  image_url: string;
}

export interface StorageDevice {
  name: string;
  path: string;
  type: 'SYSTEM' | 'HDD' | 'SSD' | 'USB' | 'NETWORK';
  font?: string;
  extensions: {
    health: boolean;
    size: number;
    used: number;
  };
}

export interface StorageListResponse {
  storages: StorageDevice[];
  count: number;
}
