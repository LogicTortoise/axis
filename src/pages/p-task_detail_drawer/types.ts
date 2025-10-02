

export interface TaskData {
  name: string;
  description: string;
  workspace: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
  status: 'pending' | 'progress' | 'completed' | 'failed';
  queueStatus: string;
  manualCheck: boolean;
  createdTime: string;
  updatedTime: string;
  apiData: string | null;
  apiStatus: string;
  apiStatusTime: string;
  executionId: string;
  startHook: string | null;
  stopHook: string | null;
}

export interface HookConfig {
  enabled: boolean;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: string;
}

export interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'warning';
}

export interface ExecutionLog {
  id: string;
  task_id: string;
  execution_number: number;
  response_type: string;
  response_content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

