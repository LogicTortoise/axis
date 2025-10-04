import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';
import { getQueues, getQueueDetail, executeQueue, deleteQueue, QueueDetail, Queue as QueueType } from '../../services/queueService';
import { getWorkspaceById, Workspace } from '../../services/workspaceService';
import { dispatchTask, getTaskById, Task, updateTask } from '../../services/taskService';
import axios from 'axios';

interface QueueTask {
  id: string;
  task_id: string;
  order_index: number;
  name: string;
  status: 'pending' | 'progress' | 'completed' | 'failed';
  error_reason?: string | null;
}

interface ConfirmAction {
  type: 'start-queue' | 'pause-queue' | 'delete-queue' | 'dispatch-queue';
  queueId?: string;
}

const QueueManagePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 获取工作区ID
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  // 状态管理
  const [queues, setQueues] = useState<QueueType[]>([]);
  const [expandedQueues, setExpandedQueues] = useState<Set<string>>(new Set());
  const [queueDetails, setQueueDetails] = useState<Record<string, QueueDetail>>({});
  const [taskDetails, setTaskDetails] = useState<Record<string, Task[]>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // 任务详情抽屉
  const [showTaskDrawer, setShowTaskDrawer] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [taskDrawerData, setTaskDrawerData] = useState<Task | null>(null);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [showExecutionLogModal, setShowExecutionLogModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // 初始化：获取工作区ID和数据
  useEffect(() => {
    const workspaceId = searchParams.get('workspaceId');
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
      loadWorkspace(workspaceId);
      loadQueues(workspaceId);
    }
  }, [searchParams]);

  // 加载工作区信息
  const loadWorkspace = async (workspaceId: string) => {
    try {
      const workspace = await getWorkspaceById(workspaceId);
      setCurrentWorkspace(workspace);
    } catch (error) {
      console.error('Failed to load workspace:', error);
    }
  };

  // 加载队列列表
  const loadQueues = async (workspaceId: string) => {
    try {
      setLoading(true);
      const response = await getQueues(workspaceId, { page: 1, page_size: 100 });
      setQueues(response.queues);
    } catch (error) {
      console.error('Failed to load queues:', error);
    } finally {
      setLoading(false);
    }
  };

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '任务队列管理 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  // 过滤队列
  const filteredQueues = queues.filter(queue => {
    const matchesSearch = queue.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || queue.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // 处理队列展开/折叠
  const handleQueueToggle = async (queueId: string) => {
    const newExpanded = new Set(expandedQueues);
    if (newExpanded.has(queueId)) {
      newExpanded.delete(queueId);
    } else {
      newExpanded.add(queueId);
      // 加载队列详情
      if (!queueDetails[queueId]) {
        try {
          const detail = await getQueueDetail(queueId);
          setQueueDetails(prev => ({ ...prev, [queueId]: detail }));

          // 加载每个任务的完整信息
          const tasks = await Promise.all(
            detail.tasks.map(task => getTaskById(task.task_id))
          );
          setTaskDetails(prev => ({ ...prev, [queueId]: tasks }));
        } catch (error) {
          console.error('Failed to load queue detail:', error);
        }
      }
    }
    setExpandedQueues(newExpanded);
  };

  // 显示确认模态框
  const showConfirmDialog = (title: string, message: string, action: ConfirmAction) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  // 处理队列操作
  const handleQueueAction = (action: string, queueId: string) => {
    switch (action) {
      case 'start':
        showConfirmDialog('启动队列', '确定要启动这个队列吗？', { type: 'start-queue', queueId });
        break;
      case 'delete':
        showConfirmDialog('删除队列', '确定要删除这个队列吗？删除后无法恢复。', { type: 'delete-queue', queueId });
        break;
      case 'view':
        handleQueueToggle(queueId);
        break;
      case 'dispatch':
        showConfirmDialog('下发队列', '确定要下发这个队列中的所有任务吗？', { type: 'dispatch-queue', queueId });
        break;
    }
  };

  // 处理确认操作
  const handleConfirmAction = async () => {
    if (confirmAction) {
      try {
        switch (confirmAction.type) {
          case 'start-queue':
            if (confirmAction.queueId) {
              await executeQueue(confirmAction.queueId);
              // 刷新队列列表
              if (currentWorkspaceId) {
                await loadQueues(currentWorkspaceId);
              }
              alert('队列开始执行！');
            }
            break;
          case 'delete-queue':
            if (confirmAction.queueId) {
              await deleteQueue(confirmAction.queueId);
              // 刷新队列列表
              if (currentWorkspaceId) {
                await loadQueues(currentWorkspaceId);
              }
              alert('队列删除成功！');
            }
            break;
          case 'dispatch-queue':
            if (confirmAction.queueId) {
              // 获取队列详情
              const detail = queueDetails[confirmAction.queueId] || await getQueueDetail(confirmAction.queueId);
              // 下发所有任务
              for (const task of detail.tasks) {
                await dispatchTask(task.task_id, { execution_system: 'default' });
              }
              // 刷新队列列表
              if (currentWorkspaceId) {
                await loadQueues(currentWorkspaceId);
              }
              alert('队列任务已全部下发！');
            }
            break;
        }
      } catch (error) {
        console.error('操作失败:', error);
        alert('操作失败，请重试');
      }

      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };

  // 获取状态样式类名
  const getQueueStatusClass = (status: string) => {
    const statusMap = {
      pending: styles.queueStatusPending,
      running: styles.queueStatusRunning,
      completed: styles.queueStatusCompleted,
      failed: styles.queueStatusFailed
    };
    return statusMap[status as keyof typeof statusMap] || '';
  };

  const getTaskStatusClass = (status: string) => {
    const statusMap = {
      pending: styles.taskStatusPending,
      progress: styles.taskStatusProgress,
      completed: styles.taskStatusCompleted,
      failed: styles.taskStatusFailed
    };
    return statusMap[status as keyof typeof statusMap] || '';
  };

  // 获取状态显示文本
  const getQueueStatusText = (status: string) => {
    const statusText = {
      pending: '待执行',
      running: '执行中',
      completed: '已完成',
      failed: '失败'
    };
    return statusText[status as keyof typeof statusText] || status;
  };

  const getTaskStatusText = (status: string) => {
    const statusText = {
      pending: '待执行',
      progress: '进行中',
      completed: '已完成',
      failed: '失败'
    };
    return statusText[status as keyof typeof statusText] || status;
  };

  const getPriorityText = (priority: string) => {
    const priorityText = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return priorityText[priority as keyof typeof priorityText] || priority;
  };

  const getSourceText = (source: string) => {
    return source === 'api' ? 'API' : '手动';
  };

  // 打开任务详情抽屉
  const openTaskDrawer = async (taskId: string) => {
    try {
      const task = await getTaskById(taskId);
      setCurrentTaskId(taskId);
      setTaskDrawerData(task);
      setShowTaskDrawer(true);
      document.body.style.overflow = 'hidden';
      // 加载执行日志
      await loadExecutionLogs(taskId);
    } catch (error) {
      console.error('Failed to load task details:', error);
      alert('加载任务详情失败');
    }
  };

  // 关闭任务详情抽屉
  const closeTaskDrawer = () => {
    setShowTaskDrawer(false);
    document.body.style.overflow = 'auto';
    setCurrentTaskId(null);
    setTaskDrawerData(null);
    setExecutionLogs([]);
    setSelectedLog(null);
    setShowExecutionLogModal(false);
  };

  // 加载执行日志
  const loadExecutionLogs = async (taskId: string) => {
    try {
      const response = await axios.get(`http://localhost:10101/api/tasks/${taskId}/execution-logs`);
      if (response.data.code === 200 && response.data.data) {
        setExecutionLogs(response.data.data);
      } else {
        setExecutionLogs([]);
      }
    } catch (error) {
      console.error('Failed to load execution logs:', error);
      setExecutionLogs([]);
    }
  };

  // 打开执行日志模态框
  const openExecutionLogModal = (log: any) => {
    setSelectedLog(log);
    setShowExecutionLogModal(true);
  };

  // 保存任务
  const saveTask = async () => {
    if (!taskDrawerData || !currentTaskId) return;

    try {
      await updateTask(currentTaskId, {
        title: taskDrawerData.title,
        description: taskDrawerData.description,
        priority: taskDrawerData.priority,
        status: taskDrawerData.status,
        manual_check: taskDrawerData.manual_check,
      });
      alert('任务保存成功');
      // 刷新队列列表
      if (currentWorkspaceId) {
        await loadQueues(currentWorkspaceId);
      }
      closeTaskDrawer();
    } catch (error) {
      console.error('Failed to save task:', error);
      alert('任务保存失败');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* 顶部导航栏 */}
      <header className="bg-surface border-b border-border h-[60px] fixed top-0 left-0 right-0 z-40">
        <div className="h-full px-6 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-layer-group text-white text-sm"></i>
            </div>
            <span className="text-xl font-semibold text-textPrimary">Axis</span>
          </div>

          {/* 右侧功能区 */}
          <div className="flex items-center space-x-4">
            {/* 通知 */}
            <Link to="/notif-center" className="relative p-2 hover:bg-tertiary rounded-button transition-colors">
              <i className="far fa-bell text-textSecondary text-lg"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            </Link>

            {/* 用户头像 */}
            <div className="flex items-center space-x-2 cursor-pointer hover:bg-tertiary px-3 py-2 rounded-button transition-colors">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-sm"></i>
              </div>
              <span className="text-sm text-textPrimary">开发者</span>
              <i className="fas fa-chevron-down text-xs text-textSecondary"></i>
            </div>
          </div>
        </div>
      </header>

      {/* 主体布局 */}
      <div className="flex pt-[60px]">
        {/* 左侧菜单 */}
        <aside className="w-[240px] bg-surface border-r border-border fixed left-0 top-[60px] bottom-0 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {/* 仪表盘 */}
            <Link to="/dashboard" className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
              <i className="fas fa-chart-line w-5"></i>
              <span>仪表盘</span>
            </Link>

            {/* 工作区列表 */}
            <Link to="/wks-list" className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
              <i className="fas fa-folder w-5"></i>
              <span>工作区列表</span>
            </Link>

            {/* 当前工作区 */}
            {currentWorkspace && (
              <div className="mt-6">
                <div className="px-4 py-2 text-xs text-textSecondary uppercase tracking-wider">当前工作区</div>
                <Link
                  to={`/wks-detail?workspaceId=${currentWorkspaceId}`}
                  className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
                >
                  <i className="fas fa-tasks w-5"></i>
                  <span>{currentWorkspace.name}</span>
                </Link>
                <Link
                  to={`/wks-settings?workspaceId=${currentWorkspaceId}`}
                  className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
                >
                  <i className="fas fa-cog w-5"></i>
                  <span>工作区设置</span>
                </Link>
                <Link
                  to={`/queue-manage?workspaceId=${currentWorkspaceId}`}
                  className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}
                >
                  <i className="fas fa-list-ol w-5"></i>
                  <span>任务队列</span>
                </Link>
              </div>
            )}

            {/* 通知中心 */}
            <div className="mt-6">
              <Link to="/notif-center" className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
                <i className="fas fa-bell w-5"></i>
                <span>通知中心</span>
                <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">3</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-[240px] p-8">
          {/* 面包屑导航 */}
          <nav className="mb-6 text-sm">
            <Link to="/wks-list" className="text-textSecondary hover:text-primary transition-colors">
              工作区
            </Link>
            <i className="fas fa-chevron-right text-xs text-textSecondary mx-2"></i>
            <Link to={`/wks-detail?workspaceId=${currentWorkspaceId}`} className="text-textSecondary hover:text-primary transition-colors">
              {currentWorkspace?.name || '项目'}
            </Link>
            <i className="fas fa-chevron-right text-xs text-textSecondary mx-2"></i>
            <span className="text-textPrimary">任务队列管理</span>
          </nav>

          {/* 页面标题 */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-textPrimary mb-2">任务队列管理</h1>
                <p className="text-textSecondary">创建和管理任务队列，批量执行任务</p>
              </div>
            </div>
          </div>

          {/* 搜索和筛选栏 */}
          <div className="bg-surface border border-border rounded-lg p-4 mb-6 flex items-center space-x-4">
            {/* 搜索框 */}
            <div className="flex-1 relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary"></i>
              <input
                type="text"
                placeholder="搜索队列名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-button text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-button text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">全部状态</option>
              <option value="pending">待执行</option>
              <option value="running">执行中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
            </select>
          </div>

          {/* 队列列表 - 表格布局 */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-12"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">队列名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-32">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-48">进度</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-24">任务数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-48">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider w-32">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-textSecondary">加载中...</td>
                  </tr>
                ) : filteredQueues.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-textSecondary">暂无队列</td>
                  </tr>
                ) : (
                  <>
                    {filteredQueues.map((queue) => (
                      <React.Fragment key={queue.id}>
                        <tr className="hover:bg-tertiary transition-colors">
                          {/* 展开/折叠按钮 */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleQueueToggle(queue.id)}
                              className="w-6 h-6 flex items-center justify-center rounded hover:bg-border transition-colors"
                            >
                              <i className={`fas fa-chevron-${expandedQueues.has(queue.id) ? 'down' : 'right'} text-textSecondary text-xs`}></i>
                            </button>
                          </td>

                          {/* 队列名称 */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <i className="fas fa-layer-group text-primary text-sm"></i>
                              <span className="text-sm font-medium text-textPrimary">{queue.name}</span>
                            </div>
                          </td>

                          {/* 状态 */}
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium inline-block ${getQueueStatusClass(queue.status)}`}>
                              {getQueueStatusText(queue.status)}
                            </span>
                          </td>

                          {/* 进度 */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-tertiary rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-primary h-full transition-all duration-300"
                                  style={{ width: `${queue.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-textSecondary whitespace-nowrap">{queue.progress}%</span>
                            </div>
                          </td>

                          {/* 任务数 */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-textPrimary">{queue.completed_tasks}/{queue.total_tasks}</span>
                          </td>

                          {/* 创建时间 */}
                          <td className="px-6 py-4">
                            <span className="text-sm text-textSecondary">
                              {new Date(queue.created_at).toLocaleString('zh-CN')}
                            </span>
                          </td>

                          {/* 操作 */}
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-1">
                              {queue.status === 'pending' && (
                                <button
                                  onClick={() => handleQueueAction('start', queue.id)}
                                  className="p-2 text-success hover:bg-tertiary rounded transition-colors"
                                  title="启动队列"
                                >
                                  <i className="fas fa-play text-xs"></i>
                                </button>
                              )}

                              <button
                                onClick={() => handleQueueAction('dispatch', queue.id)}
                                className="p-2 text-textSecondary hover:bg-tertiary rounded transition-colors"
                                title="下发队列"
                              >
                                <i className="fas fa-paper-plane text-xs"></i>
                              </button>

                              {queue.status !== 'running' && (
                                <button
                                  onClick={() => handleQueueAction('delete', queue.id)}
                                  className="p-2 text-danger hover:bg-tertiary rounded transition-colors"
                                  title="删除队列"
                                >
                                  <i className="fas fa-trash text-xs"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* 展开的任务列表 */}
                        {expandedQueues.has(queue.id) && queueDetails[queue.id] && taskDetails[queue.id] && (
                          <tr>
                            <td colSpan={7} className="px-6 py-4 bg-background">
                              <div className="pl-12">
                                <h4 className="text-xs font-medium text-textSecondary uppercase mb-3">任务列表</h4>
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-tertiary">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">序号</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">任务名称</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">优先级</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">状态</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">队列状态</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">人工Check</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">来源</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-textSecondary uppercase tracking-wider">创建时间</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {taskDetails[queue.id].map((task, index) => (
                                        <tr
                                          key={task.id}
                                          className="hover:bg-tertiary transition-colors cursor-pointer"
                                          onClick={() => openTaskDrawer(task.id)}
                                        >
                                          <td className="px-4 py-3">
                                            <span className="text-xs text-textSecondary">{index + 1}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex items-center space-x-2">
                                              <i className="fas fa-code text-primary text-sm"></i>
                                              <span className="text-sm text-textPrimary font-medium">{task.title}</span>
                                            </div>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]}`}>
                                              {getPriorityText(task.priority)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTaskStatusClass(task.status)}`}>
                                              {getTaskStatusText(task.status)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3">
                                            {task.queue_status === 'queue' ?
                                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles.statusProgress}`}>队列中</span> :
                                              <span className="text-sm text-textSecondary">-</span>
                                            }
                                          </td>
                                          <td className="px-4 py-3">
                                            <input
                                              type="checkbox"
                                              className={`${styles.checkboxCustom} w-4 h-4 rounded border-border`}
                                              checked={task.manual_check}
                                              readOnly
                                            />
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-textSecondary">{getSourceText(task.source)}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <span className="text-sm text-textSecondary">{task.created_at}</span>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* 确认模态框 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-textPrimary mb-4">{confirmTitle}</h3>
            <p className="text-textSecondary mb-6">{confirmMessage}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-textSecondary hover:bg-tertiary rounded-button transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 bg-primary text-white rounded-button hover:bg-blue-600 transition-colors"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 任务详情抽屉 */}
      {showTaskDrawer && taskDrawerData && (
        <div className="fixed inset-0 z-50">
          <div className={styles.drawerOverlay} onClick={closeTaskDrawer}></div>
          <div className={styles.drawerContent} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-textPrimary">任务详情</h2>
              <button onClick={closeTaskDrawer} className="p-2 hover:bg-tertiary rounded-button transition-colors">
                <i className="fas fa-times text-textSecondary"></i>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">基本信息</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-textPrimary">任务名称</label>
                  <input
                    type="text"
                    value={taskDrawerData.title}
                    onChange={(e) => setTaskDrawerData({ ...taskDrawerData, title: e.target.value })}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-textPrimary">任务描述</label>
                  <textarea
                    rows={4}
                    value={taskDrawerData.description || ''}
                    onChange={(e) => setTaskDrawerData({ ...taskDrawerData, description: e.target.value })}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-textPrimary">优先级</label>
                  <select
                    value={taskDrawerData.priority}
                    onChange={(e) => setTaskDrawerData({ ...taskDrawerData, priority: e.target.value as any })}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  >
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-textPrimary">当前状态</label>
                  <select
                    value={taskDrawerData.status}
                    onChange={(e) => setTaskDrawerData({ ...taskDrawerData, status: e.target.value as any })}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  >
                    <option value="pending">待执行</option>
                    <option value="progress">进行中</option>
                    <option value="completed">已完成</option>
                    <option value="failed">失败</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-textPrimary">人工Check状态</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={taskDrawerData.manual_check}
                      onChange={(e) => setTaskDrawerData({ ...taskDrawerData, manual_check: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* 执行历史记录 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">执行历史记录</h3>
                  <button
                    onClick={() => currentTaskId && loadExecutionLogs(currentTaskId)}
                    className="text-xs text-primary hover:underline"
                  >
                    刷新
                  </button>
                </div>

                {executionLogs.length === 0 ? (
                  <div className="text-sm text-textSecondary text-center py-4">暂无执行记录</div>
                ) : (
                  <div className="space-y-2">
                    {executionLogs.map((log) => (
                      <div
                        key={log.id}
                        onClick={() => openExecutionLogModal(log)}
                        className="p-3 bg-tertiary hover:bg-border rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-textPrimary">第 {log.execution_number} 次执行</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              log.response_type === 'completed' ? 'bg-success text-white' :
                              log.response_type === 'failed' ? 'bg-danger text-white' :
                              'bg-warning text-white'
                            }`}>
                              {log.response_type === 'completed' ? '成功' :
                               log.response_type === 'failed' ? '失败' :
                               log.response_type}
                            </span>
                          </div>
                          <span className="text-xs text-textSecondary">{log.created_at}</span>
                        </div>
                        <div className="text-xs text-textSecondary line-clamp-2">
                          {(() => {
                            try {
                              const messages = JSON.parse(log.response_content);
                              return `${messages.length} 条消息`;
                            } catch {
                              return '点击查看详情';
                            }
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex items-center space-x-3">
              <button
                onClick={saveTask}
                className={`flex-1 ${styles.btnPrimary} px-4 py-2.5 rounded-button text-sm font-medium`}
              >
                <i className="fas fa-save mr-2"></i>
                保存
              </button>
              <button
                onClick={closeTaskDrawer}
                className={`px-4 py-2.5 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 执行日志详情模态框 */}
      {showExecutionLogModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowExecutionLogModal(false)}>
          <div className="bg-surface rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-textPrimary">执行日志详情 - 第 {selectedLog.execution_number} 次</h3>
              <button
                onClick={() => setShowExecutionLogModal(false)}
                className="p-2 hover:bg-tertiary rounded-button transition-colors"
              >
                <i className="fas fa-times text-textSecondary"></i>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-textPrimary mb-2 block">执行时间</label>
                <p className="text-sm text-textSecondary">{selectedLog.created_at}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-textPrimary mb-2 block">执行结果</label>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedLog.response_type === 'completed' ? 'bg-success text-white' :
                  selectedLog.response_type === 'failed' ? 'bg-danger text-white' :
                  'bg-warning text-white'
                }`}>
                  {selectedLog.response_type === 'completed' ? '成功' :
                   selectedLog.response_type === 'failed' ? '失败' :
                   selectedLog.response_type}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-textPrimary mb-2 block">执行内容</label>
                <div className="bg-background border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs text-textSecondary whitespace-pre-wrap">{selectedLog.response_content}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueueManagePage;
