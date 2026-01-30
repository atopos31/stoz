import { create } from 'zustand'
import type { MigrationTask, TaskStatus } from '../types'

interface TaskState {
  // Task list (from history/database)
  tasks: MigrationTask[]
  setTasks: (tasks: MigrationTask[]) => void
  addTask: (task: MigrationTask) => void
  updateTask: (taskId: string, updates: Partial<MigrationTask>) => void

  // Active tasks (real-time status updates)
  activeTasks: Map<string, TaskStatus>
  setActiveTaskStatus: (taskId: string, status: TaskStatus) => void
  removeActiveTask: (taskId: string) => void
  clearActiveTasks: () => void

  // Pagination
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  setPagination: (pagination: Partial<TaskState['pagination']>) => void

  // Filters
  statusFilter: string | null
  setStatusFilter: (status: string | null) => void

  // Loading states
  isLoadingTasks: boolean
  setIsLoadingTasks: (loading: boolean) => void

  // Get task by ID
  getTaskById: (taskId: string) => MigrationTask | undefined
  getActiveTaskStatus: (taskId: string) => TaskStatus | undefined
}

const initialPagination = {
  page: 0,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const useTaskStore = create<TaskState>((set, get) => ({
  // Tasks
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) =>
    set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.task_id === taskId ? { ...task, ...updates } : task
      ),
    })),

  // Active tasks
  activeTasks: new Map(),
  setActiveTaskStatus: (taskId, status) =>
    set((state) => {
      const newActiveTasks = new Map(state.activeTasks)
      newActiveTasks.set(taskId, status)
      return { activeTasks: newActiveTasks }
    }),
  removeActiveTask: (taskId) =>
    set((state) => {
      const newActiveTasks = new Map(state.activeTasks)
      newActiveTasks.delete(taskId)
      return { activeTasks: newActiveTasks }
    }),
  clearActiveTasks: () => set({ activeTasks: new Map() }),

  // Pagination
  pagination: initialPagination,
  setPagination: (pagination) =>
    set((state) => ({
      pagination: { ...state.pagination, ...pagination }
    })),

  // Filters
  statusFilter: null,
  setStatusFilter: (status) => set({ statusFilter: status }),

  // Loading
  isLoadingTasks: false,
  setIsLoadingTasks: (loading) => set({ isLoadingTasks: loading }),

  // Getters
  getTaskById: (taskId) => {
    const { tasks } = get()
    return tasks.find(task => task.task_id === taskId)
  },
  getActiveTaskStatus: (taskId) => {
    const { activeTasks } = get()
    return activeTasks.get(taskId)
  },
}))
