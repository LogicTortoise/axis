

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';
import { TaskData, HookConfig, ToastState, ExecutionLog } from './types';
import TaskMessageStream from '../../components/TaskMessageStream';
import axios from 'axios';

const TaskDetailDrawer: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get('taskId') || '1';

  // 模态框状态
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showHooksModal, setShowHooksModal] = useState(false);
  const [showExecutionLogModal, setShowExecutionLogModal] = useState(false);

  // 执行日志状态
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  
  // Toast状态
  const [toastState, setToastState] = useState<ToastState>({
    show: false,
    message: '',
    type: 'success'
  });
  
  // 任务数据状态
  const [taskData, setTaskData] = useState<TaskData>({
    name: '实现用户认证模块',
    description: '实现完整的用户认证流程，包括登录、注册、密码重置等功能。需要集成JWT token机制，确保安全性。',
    workspace: '项目Alpha',
    priority: 'high',
    source: 'API',
    status: 'progress',
    queueStatus: '未加入队列',
    manualCheck: false,
    createdTime: '2024-01-15 10:30:25',
    updatedTime: '2024-01-15 14:22:18',
    apiData: `{
  "id": "TASK-001",
  "title": "实现用户认证模块",
  "priority": "high",
  "assignee": "developer@axis.com"
}`,
    apiStatus: '已下发',
    apiStatusTime: '2024-01-15 10:35:12',
    executionId: 'exec-sys-20240115-001',
    startHook: 'https://hooks.axis.com/task/start',
    stopHook: null
  });
  
  // Hooks配置状态
  const [startHookConfig, setStartHookConfig] = useState<HookConfig>({
    enabled: true,
    url: 'https://hooks.axis.com/task/start',
    method: 'POST',
    headers: '{"Content-Type": "application/json"}'
  });
  
  const [stopHookConfig, setStopHookConfig] = useState<HookConfig>({
    enabled: false,
    url: '',
    method: 'POST',
    headers: ''
  });

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '任务详情 - Axis';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // 字段是否可编辑（进行中的任务不可编辑）
  const isEditable = taskData.status !== 'progress';

  // 调试日志
  console.log('TaskDetailDrawer - taskId:', taskId, 'status:', taskData.status, 'isEditable:', isEditable);

  // 加载任务数据
  useEffect(() => {
    loadTaskData(taskId);
    loadExecutionLogs();
  }, [taskId]);

  // 加载执行日志
  const loadExecutionLogs = async () => {
    try {
      const response = await axios.get(`http://localhost:10101/api/tasks/${taskId}/execution-logs`);
      if (response.data.success) {
        setExecutionLogs(response.data.data || []);
      }
    } catch (error) {
      console.error('加载执行日志失败:', error);
      setExecutionLogs([]);
    }
  };

  // 查看执行日志详情
  const viewExecutionLog = (log: ExecutionLog) => {
    setSelectedLog(log);
    setShowExecutionLogModal(true);
  };

  // ESC键关闭抽屉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 显示Toast通知
  const showToast = (message: string, type: ToastState['type'] = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => {
      setToastState(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // 加载任务数据
  const loadTaskData = (taskId: string) => {
    // 模拟任务数据
    const mockTasks: Record<string, TaskData> = {
      '1': {
        name: '实现用户认证模块',
        description: '实现完整的用户认证流程，包括登录、注册、密码重置等功能。需要集成JWT token机制，确保安全性。',
        workspace: '项目Alpha',
        priority: 'high',
        source: 'API',
        status: 'progress',
        queueStatus: '未加入队列',
        manualCheck: false,
        createdTime: '2024-01-15 10:30:25',
        updatedTime: '2024-01-15 14:22:18',
        apiData: `{
  "id": "TASK-001",
  "title": "实现用户认证模块",
  "priority": "high",
  "assignee": "developer@axis.com"
}`,
        apiStatus: '已下发',
        apiStatusTime: '2024-01-15 10:35:12',
        executionId: 'exec-sys-20240115-001',
        startHook: 'https://hooks.axis.com/task/start',
        stopHook: null
      },
      '2': {
        name: '优化数据库查询性能',
        description: '对现有数据库查询进行性能优化，包括添加索引、优化SQL语句等。',
        workspace: '项目Alpha',
        priority: 'medium',
        source: '手动',
        status: 'pending',
        queueStatus: '队列中',
        manualCheck: true,
        createdTime: '2024-01-15 09:15:30',
        updatedTime: '2024-01-15 11:45:22',
        apiData: null,
        apiStatus: '未下发',
        apiStatusTime: '',
        executionId: '',
        startHook: null,
        stopHook: null
      }
    };

    const task = mockTasks[taskId] || mockTasks['1'];
    setTaskData(task);

    // 初始化Hooks配置
    if (task.startHook) {
      setStartHookConfig({
        enabled: true,
        url: task.startHook,
        method: 'POST',
        headers: '{"Content-Type": "application/json"}'
      });
    } else {
      setStartHookConfig({
        enabled: false,
        url: '',
        method: 'POST',
        headers: ''
      });
    }

    if (task.stopHook) {
      setStopHookConfig({
        enabled: true,
        url: task.stopHook,
        method: 'POST',
        headers: '{"Content-Type": "application/json"}'
      });
    } else {
      setStopHookConfig({
        enabled: false,
        url: '',
        method: 'POST',
        headers: ''
      });
    }
  };

  // 关闭抽屉
  const handleCloseDrawer = () => {
    navigate(-1);
  };

  // 保存任务
  const handleSaveTask = () => {
    console.log('保存任务数据:', taskData);
    showToast('任务已保存');
    
    // 更新更新时间
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    setTaskData(prev => ({
      ...prev,
      updatedTime: timeString
    }));
  };

  // 取消操作
  const handleCancelTask = () => {
    handleCloseDrawer();
  };

  // 删除任务
  const handleDeleteTask = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    console.log('删除任务');
    showToast('任务已删除', 'success');
    setTimeout(() => {
      navigate('/wks-detail');
    }, 1000);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  // 下发任务
  const handleDispatchTask = () => {
    setShowDispatchModal(true);
  };

  const handleConfirmDispatch = () => {
    console.log('下发任务');
    showToast('任务已下发');
    setShowDispatchModal(false);
    
    // 更新下发状态
    const now = new Date();
    const timeString = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setTaskData(prev => ({
      ...prev,
      apiStatus: '已下发',
      apiStatusTime: timeString
    }));
  };

  const handleCancelDispatch = () => {
    setShowDispatchModal(false);
  };

  // 重试任务
  const handleRetryTask = () => {
    setShowRetryModal(true);
  };

  const handleConfirmRetry = () => {
    console.log('重试任务');
    showToast('任务已重试');
    setShowRetryModal(false);
    
    // 更新状态为进行中
    setTaskData(prev => ({
      ...prev,
      status: 'progress'
    }));
  };

  const handleCancelRetry = () => {
    setShowRetryModal(false);
  };

  // 配置Hooks
  const handleConfigureHooks = () => {
    setShowHooksModal(true);
  };

  const handleCloseHooksModal = () => {
    setShowHooksModal(false);
  };

  const handleCancelHooks = () => {
    setShowHooksModal(false);
  };

  const handleSaveHooks = () => {
    const hooksData = {
      startHook: startHookConfig.enabled ? startHookConfig.url : null,
      stopHook: stopHookConfig.enabled ? stopHookConfig.url : null
    };
    
    console.log('保存Hooks配置:', hooksData);
    showToast('Hooks配置已保存');
    setShowHooksModal(false);
    
    // 更新Hooks显示
    setTaskData(prev => ({
      ...prev,
      startHook: hooksData.startHook,
      stopHook: hooksData.stopHook
    }));
  };

  // 渲染状态标签
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case '已下发':
        return <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>已下发</span>;
      case '未下发':
        return <span className={`${styles.statusPending} px-3 py-1 rounded-full text-xs font-medium`}>未下发</span>;
      case '已配置':
        return <span className={`${styles.statusCompleted} px-2 py-0.5 rounded-full text-xs`}>已配置</span>;
      case '未配置':
        return <span className={`${styles.statusPending} px-2 py-0.5 rounded-full text-xs`}>未配置</span>;
      default:
        return <span className={`${styles.statusPending} px-3 py-1 rounded-full text-xs font-medium`}>{status}</span>;
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* 任务详情抽屉 */}
      <div className="fixed inset-0 z-50">
        {/* 遮罩层 */}
        <div 
          className={`${styles.drawerOverlay} absolute inset-0`}
          onClick={handleCloseDrawer}
        ></div>

        {/* 抽屉内容 */}
        <div
          className={`${styles.drawerContent} absolute right-0 top-0 bottom-0 w-[720px] bg-surface overflow-y-auto`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 抽屉头部 */}
          <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
            <h2 className="text-lg font-semibold text-textPrimary">任务详情</h2>
            <button 
              onClick={handleCloseDrawer}
              className="p-2 hover:bg-tertiary rounded-button transition-colors"
            >
              <i className="fas fa-times text-textSecondary"></i>
            </button>
          </div>

          {/* 抽屉内容区 */}
          <div className="p-6 space-y-6">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">基本信息</h3>
              
              {/* 任务名称 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">任务名称</label>
                <input
                  type="text"
                  value={taskData.name}
                  onChange={(e) => setTaskData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditable}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} ${!isEditable ? 'bg-tertiary cursor-not-allowed' : ''}`}
                />
              </div>

              {/* 任务描述 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">任务描述</label>
                <textarea
                  rows={4}
                  value={taskData.description}
                  onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isEditable}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none ${!isEditable ? 'bg-tertiary cursor-not-allowed' : ''}`}
                  placeholder="输入任务描述..."
                />
              </div>

              {/* 所属工作区 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">所属工作区</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                  {taskData.workspace}
                </div>
              </div>

              {/* 优先级 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">优先级</label>
                <select
                  value={taskData.priority}
                  onChange={(e) => setTaskData(prev => ({ ...prev, priority: e.target.value as TaskData['priority'] }))}
                  disabled={!isEditable}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} ${!isEditable ? 'bg-tertiary cursor-not-allowed' : ''}`}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>

              {/* 任务来源 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">任务来源</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                  {taskData.source}
                </div>
              </div>

              {/* 创建时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">创建时间</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                  {taskData.createdTime}
                </div>
              </div>

              {/* 更新时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">更新时间</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                  {taskData.updatedTime}
                </div>
              </div>
            </div>

            {/* 状态与进度 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">状态与进度</h3>
              
              {/* 当前状态 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">当前状态</label>
                <select
                  value={taskData.status}
                  onChange={(e) => setTaskData(prev => ({ ...prev, status: e.target.value as TaskData['status'] }))}
                  disabled={!isEditable}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} ${!isEditable ? 'bg-tertiary cursor-not-allowed' : ''}`}
                >
                  <option value="pending">待执行</option>
                  <option value="progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
              </div>

              {/* 队列状态 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">队列状态</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                  {taskData.queueStatus}
                </div>
              </div>

              {/* 人工Check状态 */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-textPrimary">人工Check状态</label>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taskData.manualCheck}
                    onChange={(e) => setTaskData(prev => ({ ...prev, manualCheck: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* 最近执行消息 - 显示最新的执行消息流 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">最近执行消息</h3>
              <TaskMessageStream taskId={taskId} isRunning={taskData.status === 'progress'} />
            </div>

            {/* API相关信息 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">API相关信息</h3>
              
              {/* API原始数据 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">API原始数据</label>
                <div className="px-4 py-3 bg-tertiary rounded-button text-xs text-textSecondary font-mono overflow-x-auto">
                  <pre>{taskData.apiData || '无API数据'}</pre>
                </div>
              </div>

              {/* API下发状态 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">API下发状态</label>
                <div className="flex items-center space-x-2">
                  {renderStatusBadge(taskData.apiStatus)}
                  {taskData.apiStatusTime && (
                    <span className="text-xs text-textSecondary">{taskData.apiStatusTime}</span>
                  )}
                </div>
              </div>

              {/* 执行系统ID */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-textPrimary">执行系统ID</label>
                <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary font-mono">
                  {taskData.executionId || '未分配'}
                </div>
              </div>
            </div>

            {/* Hooks配置 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">Hooks配置</h3>
                <button 
                  onClick={handleConfigureHooks}
                  className="text-xs text-primary hover:underline"
                >
                  配置Hooks
                </button>
              </div>
              
              {/* Start Hook */}
              <div className="p-4 bg-tertiary rounded-button space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-textPrimary">Start Hook</span>
                  {renderStatusBadge(taskData.startHook ? '已配置' : '未配置')}
                </div>
                <div className="text-xs text-textSecondary">
                  {taskData.startHook || '点击配置按钮添加Start Hook'}
                </div>
              </div>

              {/* Stop Hook */}
              <div className="p-4 bg-tertiary rounded-button space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-textPrimary">Stop Hook</span>
                  {renderStatusBadge(taskData.stopHook ? '已配置' : '未配置')}
                </div>
                <div className="text-xs text-textSecondary">
                  {taskData.stopHook || '点击配置按钮添加Stop Hook'}
                </div>
              </div>
            </div>
          </div>

          {/* 抽屉底部操作 */}
          <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex items-center space-x-3">
            <button 
              onClick={handleSaveTask}
              className={`flex-1 ${styles.btnPrimary} px-4 py-2.5 rounded-button text-sm font-medium`}
            >
              <i className="fas fa-save mr-2"></i>
              保存
            </button>
            <button 
              onClick={handleCancelTask}
              className={`px-4 py-2.5 ${styles.btnSecondary} rounded-button text-sm font-medium`}
            >
              取消
            </button>
            <button 
              onClick={handleDeleteTask}
              className="p-2.5 hover:bg-danger hover:text-white rounded-button transition-colors" 
              title="删除任务"
            >
              <i className="fas fa-trash-alt text-danger"></i>
            </button>
          </div>
        </div>
      </div>

      {/* 删除确认弹窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCancelDelete}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div 
              className={`${styles.modalContent} bg-surface rounded-card shadow-card max-w-md w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-danger rounded-full flex items-center justify-center">
                    <i className="fas fa-exclamation-triangle text-white"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-textPrimary">确认删除任务</h3>
                </div>
                <p className="text-sm text-textSecondary mb-6">
                  确定要删除任务"{taskData.name}"吗？此操作不可撤销。
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button 
                    onClick={handleCancelDelete}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmDelete}
                    className="px-4 py-2 bg-danger text-white rounded-button text-sm font-medium hover:bg-red-600 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 下发确认弹窗 */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCancelDispatch}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div 
              className={`${styles.modalContent} bg-surface rounded-card shadow-card max-w-md w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                    <i className="fas fa-paper-plane text-white"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-textPrimary">确认下发任务</h3>
                </div>
                <p className="text-sm text-textSecondary mb-6">
                  确定要将任务"{taskData.name}"下发到执行系统吗？
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button 
                    onClick={handleCancelDispatch}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmDispatch}
                    className={`px-4 py-2 ${styles.btnPrimary} rounded-button text-sm font-medium`}
                  >
                    下发
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 重试确认弹窗 */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCancelRetry}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div 
              className={`${styles.modalContent} bg-surface rounded-card shadow-card max-w-md w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-warning rounded-full flex items-center justify-center">
                    <i className="fas fa-redo text-white"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-textPrimary">确认重试任务</h3>
                </div>
                <p className="text-sm text-textSecondary mb-6">
                  确定要重试任务"{taskData.name}"吗？
                </p>
                <div className="flex items-center justify-end space-x-3">
                  <button 
                    onClick={handleCancelRetry}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleConfirmRetry}
                    className="px-4 py-2 bg-warning text-white rounded-button text-sm font-medium hover:bg-yellow-600 transition-colors"
                  >
                    重试
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hooks配置弹窗 */}
      {showHooksModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCloseHooksModal}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div 
              className={`${styles.modalContent} bg-surface rounded-card shadow-card max-w-lg w-full max-h-[80vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-textPrimary">Hooks配置</h3>
                  <button 
                    onClick={handleCloseHooksModal}
                    className="p-2 hover:bg-tertiary rounded-button transition-colors"
                  >
                    <i className="fas fa-times text-textSecondary"></i>
                  </button>
                </div>
                
                {/* Start Hook配置 */}
                <div className="space-y-4 mb-6">
                  <h4 className="text-sm font-medium text-textPrimary">Start Hook</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={startHookConfig.enabled}
                        onChange={(e) => setStartHookConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <label className="text-sm text-textPrimary">启用Start Hook</label>
                    </div>
                    <div 
                      className="space-y-3 pl-6"
                      style={{
                        opacity: startHookConfig.enabled ? 1 : 0.5,
                        pointerEvents: startHookConfig.enabled ? 'auto' : 'none'
                      }}
                    >
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">Hook URL</label>
                        <input 
                          type="url" 
                          value={startHookConfig.url}
                          onChange={(e) => setStartHookConfig(prev => ({ ...prev, url: e.target.value }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">请求方法</label>
                        <select 
                          value={startHookConfig.method}
                          onChange={(e) => setStartHookConfig(prev => ({ ...prev, method: e.target.value as HookConfig['method'] }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">请求头</label>
                        <textarea 
                          rows={3}
                          value={startHookConfig.headers}
                          onChange={(e) => setStartHookConfig(prev => ({ ...prev, headers: e.target.value }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                          placeholder='{"Content-Type": "application/json"}'
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stop Hook配置 */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-textPrimary">Stop Hook</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={stopHookConfig.enabled}
                        onChange={(e) => setStopHookConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <label className="text-sm text-textPrimary">启用Stop Hook</label>
                    </div>
                    <div 
                      className="space-y-3 pl-6"
                      style={{
                        opacity: stopHookConfig.enabled ? 1 : 0.5,
                        pointerEvents: stopHookConfig.enabled ? 'auto' : 'none'
                      }}
                    >
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">Hook URL</label>
                        <input 
                          type="url" 
                          value={stopHookConfig.url}
                          onChange={(e) => setStopHookConfig(prev => ({ ...prev, url: e.target.value }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                          placeholder="https://hooks.axis.com/task/stop"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">请求方法</label>
                        <select 
                          value={stopHookConfig.method}
                          onChange={(e) => setStopHookConfig(prev => ({ ...prev, method: e.target.value as HookConfig['method'] }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-textPrimary mb-2">请求头</label>
                        <textarea 
                          rows={3}
                          value={stopHookConfig.headers}
                          onChange={(e) => setStopHookConfig(prev => ({ ...prev, headers: e.target.value }))}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                          placeholder='{"Content-Type": "application/json"}'
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-border">
                  <button 
                    onClick={handleCancelHooks}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleSaveHooks}
                    className={`px-4 py-2 ${styles.btnPrimary} rounded-button text-sm font-medium`}
                  >
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 执行日志详情弹窗 */}
      {showExecutionLogModal && selectedLog && (
        <div className="fixed inset-0 z-50">
          <div
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={() => setShowExecutionLogModal(false)}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div
              className={`${styles.modalContent} bg-surface rounded-card shadow-card max-w-4xl w-full max-h-[80vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-textPrimary">第 {selectedLog.execution_number} 次执行日志</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        selectedLog.response_type === 'completed' ? 'bg-green-100 text-green-700' :
                        selectedLog.response_type === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100'
                      }`}>
                        {selectedLog.response_type === 'completed' ? '成功' : selectedLog.response_type === 'failed' ? '失败' : selectedLog.response_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(selectedLog.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExecutionLogModal(false)}
                    className="p-2 hover:bg-tertiary rounded-button transition-colors"
                  >
                    <i className="fas fa-times text-textSecondary"></i>
                  </button>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-textPrimary">执行消息流</h4>
                  <div className="bg-tertiary rounded-lg p-4 max-h-96 overflow-y-auto">
                    {(() => {
                      try {
                        const messages = JSON.parse(selectedLog.response_content);
                        return messages.map((msg: any, index: number) => {
                          let bgColor = 'bg-gray-50';
                          let icon = 'fa-info-circle';
                          let iconColor = 'text-blue-500';

                          if (msg.type === 'init') {
                            bgColor = 'bg-blue-50';
                            icon = 'fa-rocket';
                            iconColor = 'text-blue-500';
                          } else if (msg.type === 'SystemMessage') {
                            bgColor = 'bg-purple-50';
                            icon = 'fa-cog';
                            iconColor = 'text-purple-500';
                          } else if (msg.type === 'AssistantMessage') {
                            bgColor = 'bg-green-50';
                            icon = 'fa-comment-dots';
                            iconColor = 'text-green-500';
                          } else if (msg.type === 'ResultMessage') {
                            if (msg.is_error) {
                              bgColor = 'bg-red-50';
                              icon = 'fa-times-circle';
                              iconColor = 'text-red-500';
                            } else {
                              bgColor = 'bg-green-100';
                              icon = 'fa-check-circle';
                              iconColor = 'text-green-600';
                            }
                          }

                          return (
                            <div key={index} className={`p-3 rounded-lg ${bgColor} mb-2`}>
                              <div className="flex items-start space-x-2">
                                <i className={`fas ${icon} ${iconColor} mt-0.5`}></i>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-600">{msg.type}</span>
                                    {msg.duration_ms && (
                                      <span className="text-xs text-gray-500">{msg.duration_ms}ms</span>
                                    )}
                                  </div>
                                  {msg.message && (
                                    <p className="text-sm text-gray-800 mb-1">{msg.message}</p>
                                  )}
                                  {msg.text && (
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.text}</p>
                                  )}
                                  {msg.cost_usd && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      成本: ${msg.cost_usd.toFixed(4)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      } catch (error) {
                        return <div className="text-red-500">解析日志失败</div>;
                      }
                    })()}
                  </div>
                </div>

                <div className="flex items-center justify-end mt-6 pt-4 border-t border-border">
                  <button
                    onClick={() => setShowExecutionLogModal(false)}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast通知 */}
      <div className={`${styles.toast} ${toastState.show ? styles.toastShow : ''} fixed top-4 right-4 bg-surface rounded-card shadow-card px-6 py-3 z-50`}>
        <div className="flex items-center space-x-3">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            toastState.type === 'success' ? 'bg-success' :
            toastState.type === 'error' ? 'bg-danger' : 'bg-warning'
          }`}>
            <i className={`fas ${
              toastState.type === 'success' ? 'fa-check' :
              toastState.type === 'error' ? 'fa-times' : 'fa-exclamation-triangle'
            } text-white text-sm`}></i>
          </div>
          <span className="text-sm text-textPrimary">{toastState.message}</span>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailDrawer;

