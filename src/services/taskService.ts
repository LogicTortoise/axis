import apiClient from './api';

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'progress' | 'completed' | 'failed';
  source: 'api' | 'manual';
  manual_check: boolean;
  queue_status: string;
  execution_id?: string | null;
  dispatch_time?: string | null;
  start_hook_curl?: string | null;
  stop_hook_curl?: string | null;
  api_data?: any;
  created_at: string;
  updated_at: string;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  manual_check?: boolean;
}

export interface TaskUpdateInput {
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  status?: 'pending' | 'progress' | 'completed' | 'failed';
  manual_check?: boolean;
}

export interface TaskListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: string;
  priority?: string;
  source?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  page_size: number;
}

export interface TaskDispatchInput {
  execution_system: string;
}

export interface TaskDispatchResponse {
  execution_id: string;
  status: string;
  message: string;
}

// Get task list for a workspace
export const getTasks = async (workspaceId: string, params?: TaskListParams) => {
  const response = await apiClient.get<any>(`/workspaces/${workspaceId}/tasks`, { params });
  return response.data as TaskListResponse;
};

// Get task by ID
export const getTaskById = async (taskId: string) => {
  const response = await apiClient.get<any>(`/tasks/${taskId}`);
  return response.data as Task;
};

// Create task
export const createTask = async (workspaceId: string, data: TaskCreateInput) => {
  const response = await apiClient.post<any>(`/workspaces/${workspaceId}/tasks`, data);
  return response.data as Task;
};

// Update task
export const updateTask = async (taskId: string, data: TaskUpdateInput) => {
  const response = await apiClient.put<any>(`/tasks/${taskId}`, data);
  return response.data as Task;
};

// Delete task
export const deleteTask = async (taskId: string) => {
  const response = await apiClient.delete<any>(`/tasks/${taskId}`);
  return response;
};

// Dispatch task to execution system
export const dispatchTask = async (taskId: string, data: TaskDispatchInput) => {
  const response = await apiClient.post<any>(`/tasks/${taskId}/dispatch`, data);
  return response.data as TaskDispatchResponse;
};

// Retry failed task
export const retryTask = async (taskId: string, data: TaskDispatchInput) => {
  const response = await apiClient.post<any>(`/tasks/${taskId}/retry`, data);
  return response.data as TaskDispatchResponse;
};

// Get task status
export const getTaskStatus = async (taskId: string) => {
  const response = await apiClient.get<any>(`/tasks/${taskId}/status`);
  return response.data;
};

// Generate tasks using AI
export const generateTasks = async (workspaceId: string, description: string) => {
  const response = await apiClient.post<any>(`/workspaces/${workspaceId}/generate-tasks`, {
    description
  });
  return response.data as TaskCreateInput[];
};
