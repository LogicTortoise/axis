import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ErrorBoundary } from '../components/ErrorBoundary';

import P_dashboard from '../pages/p-dashboard';
import P_wks_list from '../pages/p-wks_list';
import P_wks_detail from '../pages/p-wks_detail';
import P_wks_settings from '../pages/p-wks_settings';
import P_queue_manage from '../pages/p-queue_manage';
import P_task_detail_drawer from '../pages/p-task_detail_drawer';
import P_notif_center from '../pages/p-notif_center';
import NotFoundPage from './NotFoundPage';
import ErrorPage from './ErrorPage';

// 使用 createBrowserRouter 创建路由实例
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to='/dashboard' replace={true} />,
  },
  {
    path: '/dashboard',
    element: (
      <ErrorBoundary>
        <P_dashboard />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/wks-list',
    element: (
      <ErrorBoundary>
        <P_wks_list />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/wks-detail',
    element: (
      <ErrorBoundary>
        <P_wks_detail />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/wks-settings',
    element: (
      <ErrorBoundary>
        <P_wks_settings />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/queue-manage',
    element: (
      <ErrorBoundary>
        <P_queue_manage />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/task-detail-drawer',
    element: (
      <ErrorBoundary>
        <P_task_detail_drawer />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '/notif-center',
    element: (
      <ErrorBoundary>
        <P_notif_center />
      </ErrorBoundary>
    ),
    errorElement: <ErrorPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export default router;