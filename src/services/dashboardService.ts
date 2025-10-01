import apiClient from './api';

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  pending_tasks: number;
  progress_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
}

export interface RecentActivity {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
}

export interface DashboardOverview {
  workspace_summary: WorkspaceSummary[];
  recent_activities: RecentActivity[];
}

// Get dashboard overview data
export const getDashboardOverview = async () => {
  const response = await apiClient.get<any>('/dashboard/overview');
  return response.data as DashboardOverview;
};
