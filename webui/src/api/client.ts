import type { ScanResult, TaskStatus, MigrationTask, MigrationOptions, ZimaOSDevice } from '../types';

const API_BASE = '/api/v1';

interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (data.code !== 0) {
    throw new Error(data.message || 'Request failed');
  }

  return data.data as T;
}

export const api = {
  health: async () => {
    return request<{ status: string }>('/health');
  },

  scan: async () => {
    return request<ScanResult>('/scan');
  },

  discoverDevices: async () => {
    return request<{ devices: ZimaOSDevice[]; count: number }>('/discover');
  },

  getFolderDetails: async (path: string) => {
    return request('/folder/details', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  testConnection: async (host: string, username: string, password: string) => {
    return request<{ token: string }>('/zimaos/test', {
      method: 'POST',
      body: JSON.stringify({ host, username, password }),
    });
  },

  createMigration: async (
    sourceFolders: string[],
    zimaosHost: string,
    zimaosUsername: string,
    zimaosPassword: string,
    basePath: string,
    options: MigrationOptions
  ) => {
    return request<{ task_id: string }>('/migration', {
      method: 'POST',
      body: JSON.stringify({
        source_folders: sourceFolders,
        zimaos_host: zimaosHost,
        zimaos_username: zimaosUsername,
        zimaos_password: zimaosPassword,
        base_path: basePath,
        options,
      }),
    });
  },

  getMigrationStatus: async (taskId: string) => {
    return request<TaskStatus>(`/migration/${taskId}`);
  },

  listMigrations: async (limit = 20, offset = 0) => {
    return request<{
      tasks: MigrationTask[];
      total: number;
      limit: number;
      offset: number;
    }>(`/migrations?limit=${limit}&offset=${offset}`);
  },

  pauseMigration: async (taskId: string) => {
    return request(`/migration/${taskId}/pause`, {
      method: 'POST',
    });
  },

  resumeMigration: async (taskId: string) => {
    return request(`/migration/${taskId}/resume`, {
      method: 'POST',
    });
  },

  cancelMigration: async (taskId: string) => {
    return request(`/migration/${taskId}/cancel`, {
      method: 'POST',
    });
  },
};
