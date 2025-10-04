import apiClient from './api';

export interface Queue {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total_tasks: number;
  completed_tasks: number;
  created_at: string;
  updated_at: string;
}

export interface QueueTask {
  id: string;
  task_id: string;
  order_index: number;
  name: string;
  status: 'pending' | 'progress' | 'completed' | 'failed';
  error_reason?: string | null;
}

export interface QueueDetail extends Queue {
  tasks: QueueTask[];
}

export interface QueueListResponse {
  total: number;
  page: number;
  page_size: number;
  queues: Queue[];
}

export interface CreateQueueInput {
  name: string;
  task_ids: string[];
}

export interface AddTasksToQueueInput {
  task_ids: string[];
}

// 创建队列
export const createQueue = async (workspaceId: string, data: CreateQueueInput) => {
  const response = await apiClient.post<any>(`/queues/workspaces/${workspaceId}`, data);
  return response.data as Queue;
};

// 获取工作区的队列列表
export const getQueues = async (workspaceId: string, params?: { page?: number; page_size?: number; status?: string }) => {
  const response = await apiClient.get<any>(`/queues/workspaces/${workspaceId}`, { params });
  return response.data as QueueListResponse;
};

// 获取队列详情（包含任务列表）
export const getQueueDetail = async (queueId: string) => {
  const response = await apiClient.get<any>(`/queues/${queueId}`);
  return response.data as QueueDetail;
};

// 执行队列
export const executeQueue = async (queueId: string) => {
  const response = await apiClient.post<any>(`/queues/${queueId}/execute`);
  return response.data;
};

// 向队列添加任务
export const addTasksToQueue = async (queueId: string, data: AddTasksToQueueInput) => {
  const response = await apiClient.post<any>(`/queues/${queueId}/tasks`, data);
  return response.data;
};

// 删除队列
export const deleteQueue = async (queueId: string) => {
  const response = await apiClient.delete<any>(`/queues/${queueId}`);
  return response.data;
};
