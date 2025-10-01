import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';
import { getWorkspaceById, Workspace, updateWorkspace, WorkspaceUpdateInput } from '../../services/workspaceService';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  dispatchTask,
  retryTask,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskListParams
} from '../../services/taskService';

const WorkspaceDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 状态管理
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string>('');
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortField, setSortField] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalTasks, setTotalTasks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // UI状态
  const [showTaskDrawer, setShowTaskDrawer] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [showDispatchConfirmModal, setShowDispatchConfirmModal] = useState<boolean>(false);
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState<boolean>(false);
  const [deleteTaskName, setDeleteTaskName] = useState<string>('');
  const [dispatchTaskName, setDispatchTaskName] = useState<string>('');
  const [dispatchTaskId, setDispatchTaskId] = useState<string>('');
  const [isRetryDispatch, setIsRetryDispatch] = useState<boolean>(false);

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [sourceFilter, setSourceFilter] = useState<string>('');

  // 表单状态
  const [addTaskForm, setAddTaskForm] = useState<TaskCreateInput>({
    title: '',
    description: '',
    priority: 'medium'
  });

  const [editWorkspaceForm, setEditWorkspaceForm] = useState<WorkspaceUpdateInput>({
    name: '',
    description: '',
    project_goal: ''
  });

  const [taskDrawerData, setTaskDrawerData] = useState<Task | null>(null);

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '工作区详情 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  // 初始化：从URL获取工作区ID
  useEffect(() => {
    const workspaceId = searchParams.get('workspaceId');
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    } else {
      navigate('/wks-list');
    }
  }, [searchParams, navigate]);

  // 加载工作区信息
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchWorkspace();
    }
  }, [currentWorkspaceId]);

  // 加载任务列表
  useEffect(() => {
    if (currentWorkspaceId) {
      fetchTasks();
    }
  }, [currentWorkspaceId, currentPage, pageSize, sortField, sortOrder, searchTerm, statusFilter, priorityFilter, sourceFilter]);

  const fetchWorkspace = async () => {
    try {
      const workspace = await getWorkspaceById(currentWorkspaceId);
      setCurrentWorkspace(workspace);
    } catch (error) {
      console.error('Failed to fetch workspace:', error);
      showErrorMessage('加载工作区信息失败');
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params: TaskListParams = {
        page: currentPage,
        page_size: pageSize,
        sort_by: sortField,
        sort_order: sortOrder,
      };

      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (sourceFilter) params.source = sourceFilter;

      const data = await getTasks(currentWorkspaceId, params);
      setTasks(data.tasks || []);
      setTotalTasks(data.total || 0);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      showErrorMessage('加载任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取优先级文本
  const getPriorityText = (priority: string): string => {
    const map: Record<string, string> = { high: '高', medium: '中', low: '低' };
    return map[priority] || priority;
  };

  // 获取状态文本
  const getStatusText = (status: string): string => {
    const map: Record<string, string> = {
      pending: '待执行',
      progress: '进行中',
      completed: '已完成',
      failed: '失败'
    };
    return map[status] || status;
  };

  // 处理排序
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 处理分页
  const totalPages = Math.ceil(totalTasks / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalTasks);

  // 处理页面大小变化
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  // 处理页面切换
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // 选择/取消选择任务
  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(t => t.id));
    }
  };

  // 打开任务详情抽屉
  const openTaskDrawer = async (taskId: string) => {
    try {
      const task = await getTaskById(taskId);
      setCurrentTaskId(taskId);
      setTaskDrawerData(task);
      setShowTaskDrawer(true);
      document.body.style.overflow = 'hidden';
    } catch (error) {
      console.error('Failed to fetch task:', error);
      showErrorMessage('加载任务详情失败');
    }
  };

  // 关闭任务详情抽屉
  const closeTaskDrawer = () => {
    setShowTaskDrawer(false);
    document.body.style.overflow = 'auto';
    setCurrentTaskId(null);
    setTaskDrawerData(null);
  };

  // 保存任务
  const saveTask = async () => {
    if (!taskDrawerData || !currentTaskId) return;

    try {
      const updateData: TaskUpdateInput = {
        title: taskDrawerData.title,
        description: taskDrawerData.description,
        priority: taskDrawerData.priority,
        status: taskDrawerData.status,
        manual_check: taskDrawerData.manual_check
      };

      await updateTask(currentTaskId, updateData);
      await fetchTasks();
      closeTaskDrawer();
      showSuccessMessage('任务保存成功');
    } catch (error) {
      console.error('Failed to update task:', error);
      showErrorMessage('任务保存失败');
    }
  };

  // 打开添加任务模态框
  const openAddTaskModal = () => {
    setAddTaskForm({
      title: '',
      description: '',
      priority: 'medium'
    });
    setShowAddTaskModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭添加任务模态框
  const closeAddTaskModal = () => {
    setShowAddTaskModal(false);
    document.body.style.overflow = 'auto';
  };

  // 提交添加任务表单
  const submitAddTaskForm = async () => {
    if (!addTaskForm.title.trim()) {
      showErrorMessage('请输入任务名称');
      return;
    }

    try {
      await createTask(currentWorkspaceId, addTaskForm);
      await fetchTasks();
      closeAddTaskModal();
      showSuccessMessage('任务添加成功');
    } catch (error) {
      console.error('Failed to create task:', error);
      showErrorMessage('任务添加失败');
    }
  };

  // 打开删除确认模态框
  const openDeleteConfirmModal = (taskName: string, taskId?: string) => {
    setDeleteTaskName(taskName);
    if (taskId) {
      setCurrentTaskId(taskId);
    }
    setShowDeleteConfirmModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭删除确认模态框
  const closeDeleteConfirmModal = () => {
    setShowDeleteConfirmModal(false);
    document.body.style.overflow = 'auto';
  };

  // 确认删除任务
  const confirmDeleteTask = async () => {
    if (!currentTaskId) return;

    try {
      await deleteTask(currentTaskId);
      await fetchTasks();
      closeDeleteConfirmModal();
      closeTaskDrawer();
      showSuccessMessage('任务删除成功');
    } catch (error) {
      console.error('Failed to delete task:', error);
      showErrorMessage('任务删除失败');
    }
  };

  // 批量删除任务
  const handleBatchDelete = async () => {
    if (selectedTaskIds.length === 0) {
      showErrorMessage('请先选择要删除的任务');
      return;
    }

    try {
      await Promise.all(selectedTaskIds.map(id => deleteTask(id)));
      await fetchTasks();
      setSelectedTaskIds([]);
      showSuccessMessage(`已删除 ${selectedTaskIds.length} 个任务`);
    } catch (error) {
      console.error('Failed to batch delete tasks:', error);
      showErrorMessage('批量删除失败');
    }
  };

  // 打开下发确认模态框
  const openDispatchConfirmModal = (taskName: string, taskId: string, isRetry: boolean = false) => {
    setDispatchTaskName(taskName);
    setDispatchTaskId(taskId);
    setIsRetryDispatch(isRetry);
    setShowDispatchConfirmModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭下发确认模态框
  const closeDispatchConfirmModal = () => {
    setShowDispatchConfirmModal(false);
    document.body.style.overflow = 'auto';
  };

  // 确认下发任务
  const confirmDispatchTask = async () => {
    if (!dispatchTaskId) return;

    try {
      const dispatchData = { execution_system: 'default-system' };

      if (isRetryDispatch) {
        await retryTask(dispatchTaskId, dispatchData);
        showSuccessMessage('任务重试成功');
      } else {
        await dispatchTask(dispatchTaskId, dispatchData);
        showSuccessMessage('任务下发成功');
      }

      await fetchTasks();
      closeDispatchConfirmModal();
    } catch (error) {
      console.error('Failed to dispatch task:', error);
      showErrorMessage(isRetryDispatch ? '任务重试失败' : '任务下发失败');
    }
  };

  // 手动获取任务（从API获取新任务）
  const handleManualFetchTasks = async () => {
    try {
      // 这里可以调用一个特殊的API来从外部系统获取任务
      // 目前只是重新加载任务列表
      await fetchTasks();
      showSuccessMessage('任务获取成功');
    } catch (error) {
      console.error('Failed to fetch tasks manually:', error);
      showErrorMessage('任务获取失败');
    }
  };

  // 打开编辑workspace模态框
  const openEditWorkspaceModal = () => {
    if (currentWorkspace) {
      setEditWorkspaceForm({
        name: currentWorkspace.name,
        description: currentWorkspace.description || '',
        project_goal: currentWorkspace.project_goal
      });
      setShowEditWorkspaceModal(true);
      document.body.style.overflow = 'hidden';
    }
  };

  // 关闭编辑workspace模态框
  const closeEditWorkspaceModal = () => {
    setShowEditWorkspaceModal(false);
    document.body.style.overflow = 'auto';
  };

  // 保存workspace
  const submitEditWorkspaceForm = async () => {
    if (!editWorkspaceForm.name?.trim()) {
      showErrorMessage('请输入工作区名称');
      return;
    }

    try {
      await updateWorkspace(currentWorkspaceId, editWorkspaceForm);
      await fetchWorkspace();
      closeEditWorkspaceModal();
      showSuccessMessage('工作区信息已更新');
    } catch (error) {
      console.error('Failed to update workspace:', error);
      showErrorMessage('更新工作区信息失败');
    }
  };

  // 显示成功消息
  const showSuccessMessage = (message: string) => {
    showNotification(message, 'success');
  };

  // 显示错误消息
  const showErrorMessage = (message: string) => {
    showNotification(message, 'error');
  };

  // 显示信息消息
  const showInfoMessage = (message: string) => {
    showNotification(message, 'info');
  };

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-6 px-6 py-3 rounded-button shadow-card z-50 transform translate-x-full transition-transform duration-300 ${
      type === 'success' ? 'bg-success text-white' :
      type === 'error' ? 'bg-danger text-white' :
      'bg-info text-white'
    }`;

    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);

    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  // 处理键盘事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeTaskDrawer();
        closeAddTaskModal();
        closeDeleteConfirmModal();
        closeDispatchConfirmModal();
        closeEditWorkspaceModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!currentWorkspace) {
    return <div className="flex items-center justify-center h-screen">加载中...</div>;
  }

  return (
    <div className={styles.pageWrapper}>
      {/* 顶部导航栏 */}
      <header className="bg-surface border-b border-border h-[60px] fixed top-0 left-0 right-0 z-40">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <i className="fas fa-layer-group text-white text-sm"></i>
            </div>
            <span className="text-xl font-semibold text-textPrimary">Axis</span>
          </div>

          <div className="flex items-center space-x-4">
            <Link
              to="/notif-center"
              className="relative p-2 hover:bg-tertiary rounded-button transition-colors"
            >
              <i className="far fa-bell text-textSecondary text-lg"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            </Link>

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
            <Link
              to="/dashboard"
              className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
            >
              <i className="fas fa-chart-line w-5"></i>
              <span>仪表盘</span>
            </Link>

            <Link
              to="/wks-list"
              className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
            >
              <i className="fas fa-folder w-5"></i>
              <span>工作区列表</span>
            </Link>

            <div className="mt-6">
              <div className="px-4 py-2 text-xs text-textSecondary uppercase tracking-wider">当前工作区</div>
              <div className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}>
                <i className="fas fa-tasks w-5"></i>
                <span>{currentWorkspace.name}</span>
              </div>
              <Link
                to={`/wks-settings?workspaceId=${currentWorkspaceId}`}
                className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
              >
                <i className="fas fa-cog w-5"></i>
                <span>工作区设置</span>
              </Link>
              <Link
                to={`/queue-manage?workspaceId=${currentWorkspaceId}`}
                className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
              >
                <i className="fas fa-list-ol w-5"></i>
                <span>任务队列</span>
              </Link>
            </div>

            <div className="mt-6">
              <Link
                to="/notif-center"
                className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
              >
                <i className="fas fa-bell w-5"></i>
                <span>通知中心</span>
                <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">3</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-[240px] min-w-[720px] p-6">
          {/* 页面头部 */}
          <div className="bg-surface rounded-card shadow-card p-6 mb-6">
            <nav className="flex items-center space-x-2 text-sm text-textSecondary mb-4">
              <Link to="/wks-list" className="hover:text-primary transition-colors">工作区</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-textPrimary">{currentWorkspace.name}</span>
            </nav>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-semibold text-textPrimary">{currentWorkspace.name}</h1>
                  <button
                    onClick={openEditWorkspaceModal}
                    className="p-2 hover:bg-tertiary rounded-button transition-colors"
                    title="编辑工作区"
                  >
                    <i className="fas fa-edit text-textSecondary text-sm"></i>
                  </button>
                </div>
                <p className="text-sm text-textSecondary">项目目标：{currentWorkspace.project_goal}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleManualFetchTasks}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-sync-alt"></i>
                  <span>手动获取任务</span>
                </button>
                <button
                  onClick={openAddTaskModal}
                  className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-plus"></i>
                  <span>添加任务</span>
                </button>
              </div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="bg-surface rounded-card shadow-card p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <div className="relative flex-1 max-w-md">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-textSecondary text-sm"></i>
                  <input
                    type="text"
                    placeholder="搜索任务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部状态</option>
                  <option value="pending">待执行</option>
                  <option value="progress">进行中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部优先级</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>

                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部来源</option>
                  <option value="api">API</option>
                  <option value="manual">手动</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => showInfoMessage('添加到队列功能待实现')}
                  disabled={selectedTaskIds.length === 0}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2 disabled:opacity-50`}
                >
                  <i className="fas fa-layer-group"></i>
                  <span>添加到队列</span>
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedTaskIds.length === 0}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2 text-danger disabled:opacity-50`}
                >
                  <i className="fas fa-trash-alt"></i>
                  <span>批量删除</span>
                </button>
              </div>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {loading ? (
              <div className="text-center py-8 text-textSecondary">加载中...</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-tertiary border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.length === tasks.length && tasks.length > 0}
                            onChange={handleSelectAll}
                            className={`${styles.checkboxCustom} w-4 h-4 rounded border-border`}
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                          <div
                            className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                            onClick={() => handleSort('title')}
                          >
                            <span>任务名称</span>
                            <i className={`fas ${sortField === 'title' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                          <div
                            className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                            onClick={() => handleSort('priority')}
                          >
                            <span>优先级</span>
                            <i className={`fas ${sortField === 'priority' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                          <div
                            className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                            onClick={() => handleSort('status')}
                          >
                            <span>当前状态</span>
                            <i className={`fas ${sortField === 'status' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">队列状态</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">人工Check</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                          <div
                            className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                            onClick={() => handleSort('source')}
                          >
                            <span>来源</span>
                            <i className={`fas ${sortField === 'source' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                          <div
                            className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                            onClick={() => handleSort('created_at')}
                          >
                            <span>创建时间</span>
                            <i className={`fas ${sortField === 'created_at' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-textSecondary">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-textSecondary">
                            暂无任务
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => (
                          <tr
                            key={task.id}
                            className={`${styles.tableRow} border-b border-border cursor-pointer`}
                            onClick={() => openTaskDrawer(task.id)}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedTaskIds.includes(task.id)}
                                onChange={() => handleTaskSelect(task.id)}
                                onClick={(e) => e.stopPropagation()}
                                className={`${styles.checkboxCustom} w-4 h-4 rounded border-border`}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-code text-primary text-sm"></i>
                                <span className="text-sm text-textPrimary font-medium hover:text-primary transition-colors">{task.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`${styles[`priority${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}`]} px-3 py-1 rounded-full text-xs font-medium`}>
                                {getPriorityText(task.priority)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`]} px-3 py-1 rounded-full text-xs font-medium`}>
                                {getStatusText(task.status)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {task.queue_status === 'queue' ?
                                <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>队列中</span> :
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
                              <span className="text-sm text-textSecondary">{task.source === 'api' ? 'API' : '手动'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm text-textSecondary">{task.created_at}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  className="p-1.5 hover:bg-tertiary rounded transition-colors"
                                  title="编辑"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTaskDrawer(task.id);
                                  }}
                                >
                                  <i className="fas fa-edit text-textSecondary text-sm"></i>
                                </button>
                                {task.status === 'failed' ?
                                  <button
                                    className="p-1.5 hover:bg-warning rounded transition-colors"
                                    title="重试"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDispatchConfirmModal(task.title, task.id, true);
                                    }}
                                  >
                                    <i className="fas fa-redo text-warning text-sm"></i>
                                  </button> :
                                  <button
                                    className="p-1.5 hover:bg-tertiary rounded transition-colors"
                                    title="下发"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDispatchConfirmModal(task.title, task.id);
                                    }}
                                  >
                                    <i className="fas fa-paper-plane text-textSecondary text-sm"></i>
                                  </button>
                                }
                                <button
                                  className="p-1.5 hover:bg-tertiary rounded transition-colors"
                                  title="删除"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteConfirmModal(task.title, task.id);
                                  }}
                                >
                                  <i className="fas fa-trash-alt text-danger text-sm"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 分页 */}
                {totalTasks > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                    <div className="text-sm text-textSecondary">
                      显示 <span className="font-medium text-textPrimary">{startIndex + 1}-{endIndex}</span> 条，共 <span className="font-medium text-textPrimary">{totalTasks}</span> 条
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-left text-xs"></i>
                      </button>
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum = i + 1;
                          if (totalPages > 5) {
                            if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={pageNum === currentPage
                                ? 'px-3 py-1.5 bg-primary text-white rounded-button text-sm font-medium'
                                : 'px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors'
                              }
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-right text-xs"></i>
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-textSecondary">每页</span>
                      <select
                        value={pageSize}
                        onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                        className={`px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus}`}
                      >
                        <option value="5">5</option>
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                      <span className="text-sm text-textSecondary">条</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Task Drawer - 简化版，完整版会太长 */}
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
              <button
                onClick={() => openDeleteConfirmModal(taskDrawerData?.title || '')}
                className="p-2.5 hover:bg-danger hover:text-white rounded-button transition-colors"
                title="删除任务"
              >
                <i className="fas fa-trash-alt text-danger"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeAddTaskModal}></div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">添加任务</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">任务名称 *</label>
                <input
                  type="text"
                  value={addTaskForm.title}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, title: e.target.value })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  placeholder="请输入任务名称"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">任务描述</label>
                <textarea
                  rows={3}
                  value={addTaskForm.description || ''}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, description: e.target.value })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                  placeholder="请输入任务描述..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">优先级</label>
                <select
                  value={addTaskForm.priority}
                  onChange={(e) => setAddTaskForm({ ...addTaskForm, priority: e.target.value as any })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                >
                  <option value="medium">中</option>
                  <option value="high">高</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
              <button
                onClick={submitAddTaskForm}
                className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
              >
                <i className="fas fa-plus mr-2"></i>
                添加
              </button>
              <button
                onClick={closeAddTaskModal}
                className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeDeleteConfirmModal}></div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">确认删除</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-textSecondary">
                确定要删除任务 "<span className="font-medium text-textPrimary">{deleteTaskName}</span>" 吗？此操作无法撤销。
              </p>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
              <button
                onClick={confirmDeleteTask}
                className="flex-1 bg-danger text-white px-4 py-2 rounded-button text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <i className="fas fa-trash-alt mr-2"></i>
                删除
              </button>
              <button
                onClick={closeDeleteConfirmModal}
                className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Confirm Modal */}
      {showDispatchConfirmModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeDispatchConfirmModal}></div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">确认下发</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-textSecondary">
                确定要下发任务 "<span className="font-medium text-textPrimary">{dispatchTaskName}</span>" 到执行系统吗？
              </p>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
              <button
                onClick={confirmDispatchTask}
                className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
              >
                <i className="fas fa-paper-plane mr-2"></i>
                下发
              </button>
              <button
                onClick={closeDispatchConfirmModal}
                className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Workspace Modal */}
      {showEditWorkspaceModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeEditWorkspaceModal}></div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">编辑工作区</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">工作区名称 *</label>
                <input
                  type="text"
                  value={editWorkspaceForm.name}
                  onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, name: e.target.value })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  placeholder="请输入工作区名称"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">项目目标 *</label>
                <textarea
                  rows={3}
                  value={editWorkspaceForm.project_goal}
                  onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, project_goal: e.target.value })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                  placeholder="请输入项目目标..."
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">描述</label>
                <textarea
                  rows={2}
                  value={editWorkspaceForm.description || ''}
                  onChange={(e) => setEditWorkspaceForm({ ...editWorkspaceForm, description: e.target.value })}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                  placeholder="请输入描述..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
              <button
                onClick={submitEditWorkspaceForm}
                className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
              >
                <i className="fas fa-save mr-2"></i>
                保存
              </button>
              <button
                onClick={closeEditWorkspaceModal}
                className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetailPage;
