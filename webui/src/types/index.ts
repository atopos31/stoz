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
  current_file: string;
  speed: number;
  eta: number;
  processed_files: number;
  total_files: number;
  transferred_size: number;
  total_size: number;
  progress: number;
  failed_files: number;
  started_at: string;
  updated_at: string;
}

export interface MigrationOptions {
  overwrite_existing: boolean;
  skip_errors: boolean;
  preserve_times: boolean;
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
