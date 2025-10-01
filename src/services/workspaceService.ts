import apiClient from './api';

export interface Workspace {
  id: string;
  name: string;
  description: string;
  project_goal: string;
  icon?: string;
  icon_color?: string;
  created_at: string;
  updated_at: string;
  active_tasks?: number;
  completed_tasks?: number;
}

export interface WorkspaceCreateInput {
  name: string;
  description?: string;
  project_goal: string;
  icon?: string;
  icon_color?: string;
}

export interface WorkspaceUpdateInput {
  name?: string;
  description?: string;
  project_goal?: string;
  icon?: string;
  icon_color?: string;
}

export interface WorkspaceListParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
  total: number;
  page: number;
  page_size: number;
}

// Get workspace list
export const getWorkspaces = async (params?: WorkspaceListParams) => {
  const response = await apiClient.get<any>('/workspaces', { params });
  return response.data as WorkspaceListResponse;
};

// Get workspace by ID
export const getWorkspaceById = async (workspaceId: string) => {
  const response = await apiClient.get<any>(`/workspaces/${workspaceId}`);
  return response.data as Workspace;
};

// Create workspace
export const createWorkspace = async (data: WorkspaceCreateInput) => {
  const response = await apiClient.post<any>('/workspaces', data);
  return response.data as Workspace;
};

// Update workspace
export const updateWorkspace = async (workspaceId: string, data: WorkspaceUpdateInput) => {
  const response = await apiClient.put<any>(`/workspaces/${workspaceId}`, data);
  return response.data as Workspace;
};

// Delete workspace
export const deleteWorkspace = async (workspaceId: string) => {
  const response = await apiClient.delete<any>(`/workspaces/${workspaceId}`);
  return response;
};
