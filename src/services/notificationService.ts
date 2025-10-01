import apiClient from './api';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  related_task_id?: string | null;
  related_workspace_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListParams {
  page?: number;
  page_size?: number;
  type?: string;
  is_read?: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  page: number;
  page_size: number;
}

export interface BatchReadRequest {
  notification_ids: string[];
}

// Get notification list
export const getNotifications = async (params?: NotificationListParams) => {
  const response = await apiClient.get<any>('/notifications', { params });
  return response.data as NotificationListResponse;
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  const response = await apiClient.put<any>(`/notifications/${notificationId}/read`);
  return response.data as Notification;
};

// Batch mark notifications as read
export const batchMarkAsRead = async (notificationIds: string[]) => {
  const response = await apiClient.post<any>('/notifications/batch-read', {
    notification_ids: notificationIds,
  });
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await apiClient.post<any>('/notifications/read-all');
  return response.data;
};

// Get unread notification count
export const getUnreadCount = async () => {
  const response = await apiClient.get<any>('/notifications/unread-count');
  return response.data.unread_count as number;
};
