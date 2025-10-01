
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';
import { getWorkspaceById, Workspace } from '../../services/workspaceService';
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

  const [taskDrawerData, setTaskDrawerData] = useState<Task | null>(null);

  // 删除所有 mock 数据，将使用真实API
  // 初始化：从URL获取工作区ID并加载数据
  useEffect(() => {
    const workspaceId = searchParams.get('workspaceId');
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    } else {
      // 如果没有workspaceId，跳转到工作区列表
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

  // 旧的 mockTasks 数据已删除，替换为上面的API调用
  const mockTasks_DELETED: Task[] = [
    {
      id: 'task-1',
      title: '实现用户认证模块',
      description: '实现完整的用户认证流程，包括登录、注册、密码重置等功能。需要集成JWT token机制，确保安全性。',
      priority: 'high',
      status: 'progress',
      queue_status: '-',
      manual_check: false,
      source: 'api',
      created_at: '2024-01-15 10:30',
      updated_at: '2024-01-15 14:22',
      api_data: {
        id: 'TASK-001',
        title: '实现用户认证模块',
        priority: 'high',
        assignee: 'developer@axis.com'
      },
      execution_id: 'exec-sys-20240115-001',
      dispatch_time: '2024-01-15 10:35:12',
      start_hook: 'https://hooks.axis.com/task/start',
      stop_hook: null
    },
    {
      id: 'task-2',
      title: '优化数据库查询性能',
      description: '分析并优化现有数据库查询，提升系统响应速度。重点关注用户列表和任务查询接口。',
      priority: 'medium',
      status: 'pending',
      queue_status: 'queue',
      manual_check: true,
      source: 'manual',
      created_at: '2024-01-15 09:15',
      updated_at: '2024-01-15 09:15',
      api_data: null,
      execution_id: null,
      dispatch_time: null,
      start_hook: null,
      stop_hook: null
    },
    {
      id: 'task-3',
      title: '修复登录页面样式问题',
      description: '修复登录页面在移动端的样式错乱问题，确保响应式布局正常工作。',
      priority: 'high',
      status: 'completed',
      queue_status: '-',
      manual_check: true,
      source: 'api',
      created_at: '2024-01-14 16:45',
      updated_at: '2024-01-15 11:30',
      api_data: {
        id: 'TASK-003',
        title: '修复登录页面样式问题',
        priority: 'high',
        assignee: 'developer@axis.com'
      },
      execution_id: 'exec-sys-20240114-003',
      dispatch_time: '2024-01-14 16:50:23',
      start_hook: null,
      stop_hook: 'https://hooks.axis.com/task/complete'
    },
    {
      id: 'task-4',
      title: '编写API文档',
      description: '为所有API接口编写详细的文档，包括请求参数、响应格式、错误处理等。',
      priority: 'low',
      status: 'pending',
      queue_status: '-',
      manual_check: false,
      source: 'manual',
      created_at: '2024-01-15 11:20',
      updated_at: '2024-01-15 11:20',
      api_data: null,
      execution_id: null,
      dispatch_time: null,
      start_hook: null,
      stop_hook: null
    },
    {
      id: 'task-5',
      title: '单元测试覆盖率提升',
      description: '增加单元测试用例，将代码覆盖率从当前的70%提升到85%以上。',
      priority: 'medium',
      status: 'failed',
      queue_status: '-',
      manual_check: false,
      source: 'api',
      created_at: '2024-01-14 14:30',
      updated_at: '2024-01-15 09:45',
      api_data: {
        id: 'TASK-005',
        title: '单元测试覆盖率提升',
        priority: 'medium',
        assignee: 'developer@axis.com'
      },
      execution_id: 'exec-sys-20240114-005',
      dispatch_time: '2024-01-14 14:35:18',
      start_hook: null,
      stop_hook: null
    }
  ];

  const mockWorkspaces: Record<string, Workspace> = {
    'workspace-1': {
      id: 'workspace-1',
      name: '项目Alpha',
      description: '核心业务系统开发',
      project_goal: '完成核心功能开发并进行系统测试',
      task_count: 23
    },
    'workspace-2': {
      id: 'workspace-2',
      name: '项目Beta',
      description: '移动端应用开发',
      project_goal: '开发并发布移动端应用1.0版本',
      task_count: 15
    }
  };

  // 设置页面标题
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '工作区详情 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  // 初始化页面数据
  useEffect(() => {
    const workspaceId = searchParams.get('workspaceId');
    if (workspaceId) {
      setCurrentWorkspaceId(workspaceId);
    }
    setFilteredTasks([...mockTasks]);
  }, [searchParams]);

  // 获取当前工作区信息
  const currentWorkspace = mockWorkspaces[currentWorkspaceId] || mockWorkspaces['workspace-1'];

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

  // 应用筛选
  const applyFilters = () => {
    let filtered = [...mockTasks];
    
    if (searchTerm) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter) {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    if (priorityFilter) {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }
    
    if (sourceFilter) {
      filtered = filtered.filter(task => task.source === sourceFilter);
    }
    
    // 应用排序
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortField) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
          aValue = priorityOrder[a.priority];
          bValue = priorityOrder[b.priority];
          break;
        case 'status':
          const statusOrder: Record<string, number> = { completed: 4, progress: 3, pending: 2, failed: 1 };
          aValue = statusOrder[a.status];
          bValue = statusOrder[b.status];
          break;
        case 'source':
          aValue = a.source;
          bValue = b.source;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    setFilteredTasks(filtered);
    setCurrentPage(1);
  };

  // 监听筛选条件变化
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, priorityFilter, sourceFilter, sortField, sortOrder]);

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
  const totalPages = Math.ceil(filteredTasks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageTasks = filteredTasks.slice(startIndex, endIndex);

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

  // 打开任务详情抽屉
  const openTaskDrawer = (taskId: string) => {
    setCurrentTaskId(taskId);
    const task = mockTasks.find(t => t.id === taskId);
    if (task) {
      setTaskDrawerData({ ...task });
    }
    setShowTaskDrawer(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭任务详情抽屉
  const closeTaskDrawer = () => {
    setShowTaskDrawer(false);
    document.body.style.overflow = 'auto';
    setCurrentTaskId(null);
    setTaskDrawerData(null);
  };

  // 保存任务
  const saveTask = () => {
    if (!taskDrawerData || !currentTaskId) return;

    // 更新任务数据
    const updatedTask = {
      ...taskDrawerData,
      updated_at: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    // 更新mockTasks（在实际项目中会调用API）
    const taskIndex = mockTasks.findIndex(t => t.id === currentTaskId);
    if (taskIndex !== -1) {
      const updatedTasks = [...mockTasks];
      updatedTasks[taskIndex] = updatedTask;
      // 这里应该调用API更新，暂时用本地数据模拟
    }

    applyFilters();
    closeTaskDrawer();
    showSuccessMessage('任务保存成功');
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
  const submitAddTaskForm = () => {
    if (!addTaskForm.title.trim()) {
      showErrorMessage('请输入任务名称');
      return;
    }

    const newTask: Task = {
      id: 'task-' + Date.now(),
      title: addTaskForm.title,
      description: addTaskForm.description,
      priority: addTaskForm.priority as 'high' | 'medium' | 'low',
      status: 'pending',
      queue_status: '-',
      manual_check: false,
      source: 'manual',
      created_at: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      updated_at: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }),
      api_data: null,
      execution_id: null,
      dispatch_time: null,
      start_hook: null,
      stop_hook: null
    };

    // 添加到任务列表（实际项目中会调用API）
    const updatedTasks = [newTask, ...mockTasks];
    // 这里应该调用API添加，暂时用本地数据模拟

    applyFilters();
    closeAddTaskModal();
    showSuccessMessage('任务添加成功');
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
  const confirmDeleteTask = () => {
    if (!currentTaskId) return;

    // 删除任务（实际项目中会调用API）
    const taskIndex = mockTasks.findIndex(t => t.id === currentTaskId);
    if (taskIndex !== -1) {
      const updatedTasks = [...mockTasks];
      updatedTasks.splice(taskIndex, 1);
      // 这里应该调用API删除，暂时用本地数据模拟
    }

    applyFilters();
    closeDeleteConfirmModal();
    closeTaskDrawer();
    showSuccessMessage('任务删除成功');
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
  const confirmDispatchTask = () => {
    if (!dispatchTaskId) return;

    const task = mockTasks.find(t => t.id === dispatchTaskId);
    if (task) {
      const updatedTask = {
        ...task,
        status: 'progress' as const,
        dispatch_time: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      };

      if (!updatedTask.execution_id) {
        updatedTask.execution_id = 'exec-sys-' + Date.now();
      }

      // 更新任务（实际项目中会调用API）
      const taskIndex = mockTasks.findIndex(t => t.id === dispatchTaskId);
      if (taskIndex !== -1) {
        const updatedTasks = [...mockTasks];
        updatedTasks[taskIndex] = updatedTask;
        // 这里应该调用API更新，暂时用本地数据模拟
      }

      applyFilters();
      showSuccessMessage(isRetryDispatch ? '任务重试成功' : '任务下发成功');
    }

    closeDispatchConfirmModal();
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
    // 创建通知元素
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
    
    // 显示通知
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
            <Link 
              to="/notif-center" 
              className="relative p-2 hover:bg-tertiary rounded-button transition-colors"
            >
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
            <Link 
              to="/dashboard" 
              className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
            >
              <i className="fas fa-chart-line w-5"></i>
              <span>仪表盘</span>
            </Link>

            {/* 工作区列表 */}
            <Link 
              to="/wks-list" 
              className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}
            >
              <i className="fas fa-folder w-5"></i>
              <span>工作区列表</span>
            </Link>

            {/* 当前工作区 */}
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

            {/* 通知中心 */}
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
            {/* 面包屑导航 */}
            <nav className="flex items-center space-x-2 text-sm text-textSecondary mb-4">
              <Link to="/wks-list" className="hover:text-primary transition-colors">工作区</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-textPrimary">{currentWorkspace.name}</span>
            </nav>

            {/* 标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-textPrimary mb-2">{currentWorkspace.name}</h1>
                <p className="text-sm text-textSecondary">项目目标：{currentWorkspace.project_goal}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => {
                    console.log('手动获取任务');
                    showSuccessMessage('任务获取成功');
                  }}
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
              {/* 搜索和筛选 */}
              <div className="flex items-center space-x-3 flex-1">
                {/* 搜索框 */}
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

                {/* 状态筛选 */}
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

                {/* 优先级筛选 */}
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

                {/* 来源筛选 */}
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

              {/* 批量操作 */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    showSuccessMessage('已将 0 个任务添加到队列');
                  }}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-layer-group"></i>
                  <span>添加到队列</span>
                </button>
                <button 
                  onClick={() => {
                    showSuccessMessage('已删除 0 个任务');
                  }}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2 text-danger`}
                >
                  <i className="fas fa-trash-alt"></i>
                  <span>批量删除</span>
                </button>
              </div>
            </div>
          </div>

          {/* 任务列表 */}
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-tertiary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input type="checkbox" className={`${styles.checkboxCustom} w-4 h-4 rounded border-border`} />
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('queue_status')}
                      >
                        <span>队列状态</span>
                        <i className={`fas ${sortField === 'queue_status' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('manual_check')}
                      >
                        <span>人工Check</span>
                        <i className={`fas ${sortField === 'manual_check' ? (sortOrder === 'asc' ? 'fa-sort-up' : 'fa-sort-down') : 'fa-sort'} text-xs`}></i>
                      </div>
                    </th>
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
                  {currentPageTasks.map((task) => (
                    <tr 
                      key={task.id}
                      className={`${styles.tableRow} border-b border-border cursor-pointer`}
                      onClick={() => openTaskDrawer(task.id)}
                    >
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className={`${styles.checkboxCustom} w-4 h-4 rounded border-border`}
                          onClick={(e) => e.stopPropagation()}
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
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-textSecondary">
                显示 <span className="font-medium text-textPrimary">{startIndex + 1}-{Math.min(endIndex, filteredTasks.length)}</span> 条，共 <span className="font-medium text-textPrimary">{currentWorkspace.task_count}</span> 条
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button 
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={page === currentPage 
                        ? 'px-3 py-1.5 bg-primary text-white rounded-button text-sm font-medium'
                        : 'px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors'
                      }
                    >
                      {page}
                    </button>
                  ))}
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
          </div>
        </main>
      </div>

      {/* 任务详情抽屉 */}
      {showTaskDrawer && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={styles.drawerOverlay}
            onClick={closeTaskDrawer}
          ></div>

          {/* 抽屉内容 */}
          <div 
            className={styles.drawerContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 抽屉头部 */}
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-textPrimary">任务详情</h2>
              <button 
                onClick={closeTaskDrawer}
                className="p-2 hover:bg-tertiary rounded-button transition-colors"
              >
                <i className="fas fa-times text-textSecondary"></i>
              </button>
            </div>

            {/* 抽屉内容区 */}
            {taskDrawerData && (
              <div className="p-6 space-y-6">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">基本信息</h3>
                  
                  {/* 任务名称 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">任务名称</label>
                    <input 
                      type="text" 
                      value={taskDrawerData.title}
                      onChange={(e) => setTaskDrawerData({...taskDrawerData, title: e.target.value})}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                    />
                  </div>

                  {/* 任务描述 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">任务描述</label>
                    <textarea 
                      rows={4}
                      value={taskDrawerData.description}
                      onChange={(e) => setTaskDrawerData({...taskDrawerData, description: e.target.value})}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                      placeholder="输入任务描述..."
                    />
                  </div>

                  {/* 所属工作区 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">所属工作区</label>
                    <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                      {currentWorkspace.name}
                    </div>
                  </div>

                  {/* 优先级 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">优先级</label>
                    <select 
                      value={taskDrawerData.priority}
                      onChange={(e) => setTaskDrawerData({...taskDrawerData, priority: e.target.value as 'high' | 'medium' | 'low'})}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
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
                      {taskDrawerData.source === 'api' ? 'API' : '手动'}
                    </div>
                  </div>

                  {/* 创建时间 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">创建时间</label>
                    <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                      {taskDrawerData.created_at}
                    </div>
                  </div>

                  {/* 更新时间 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">更新时间</label>
                    <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary">
                      {taskDrawerData.updated_at}
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
                      value={taskDrawerData.status}
                      onChange={(e) => setTaskDrawerData({...taskDrawerData, status: e.target.value as 'pending' | 'progress' | 'completed' | 'failed'})}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
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
                      {taskDrawerData.queue_status === 'queue' ? '队列中' : '未加入队列'}
                    </div>
                  </div>

                  {/* 人工Check状态 */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-textPrimary">人工Check状态</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={taskDrawerData.manual_check}
                        onChange={(e) => setTaskDrawerData({...taskDrawerData, manual_check: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>

                {/* API相关信息 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">API相关信息</h3>
                  
                  {/* API原始数据 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">API原始数据</label>
                    <div className="px-4 py-3 bg-tertiary rounded-button text-xs text-textSecondary font-mono overflow-x-auto">
                      <pre>{JSON.stringify(taskDrawerData.api_data || {}, null, 2)}</pre>
                    </div>
                  </div>

                  {/* API下发状态 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">API下发状态</label>
                    <div className="flex items-center space-x-2">
                      <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>
                        {taskDrawerData.dispatch_time ? '已下发' : '未下发'}
                      </span>
                      <span className="text-xs text-textSecondary">
                        {taskDrawerData.dispatch_time || '未下发'}
                      </span>
                    </div>
                  </div>

                  {/* 执行系统ID */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-textPrimary">执行系统ID</label>
                    <div className="px-4 py-2 bg-tertiary rounded-button text-sm text-textSecondary font-mono">
                      {taskDrawerData.execution_id || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Hooks配置 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-textSecondary uppercase tracking-wider">Hooks配置</h3>
                    <button 
                      onClick={() => showInfoMessage('Hooks配置功能将在模态框中实现')}
                      className="text-xs text-primary hover:underline"
                    >
                      配置Hooks
                    </button>
                  </div>
                  
                  {/* Start Hook */}
                  <div className="p-4 bg-tertiary rounded-button space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-textPrimary">Start Hook</span>
                      <span className={`${taskDrawerData.start_hook ? styles.statusCompleted : styles.statusPending} px-2 py-0.5 rounded-full text-xs`}>
                        {taskDrawerData.start_hook ? '已配置' : '未配置'}
                      </span>
                    </div>
                    <div className="text-xs text-textSecondary">
                      {taskDrawerData.start_hook || '点击配置按钮添加Start Hook'}
                    </div>
                  </div>

                  {/* Stop Hook */}
                  <div className="p-4 bg-tertiary rounded-button space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-textPrimary">Stop Hook</span>
                      <span className={`${taskDrawerData.stop_hook ? styles.statusCompleted : styles.statusPending} px-2 py-0.5 rounded-full text-xs`}>
                        {taskDrawerData.stop_hook ? '已配置' : '未配置'}
                      </span>
                    </div>
                    <div className="text-xs text-textSecondary">
                      {taskDrawerData.stop_hook || '点击配置按钮添加Stop Hook'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 抽屉底部操作 */}
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

      {/* 添加任务模态框 */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={styles.modalOverlay}
            onClick={closeAddTaskModal}
          ></div>

          {/* 模态框内容 */}
          <div 
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">添加任务</h3>
            </div>

            {/* 模态框内容区 */}
            <div className="px-6 py-4 space-y-4">
              <form className="space-y-4">
                {/* 任务名称 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-textPrimary">任务名称 *</label>
                  <input 
                    type="text" 
                    value={addTaskForm.title}
                    onChange={(e) => setAddTaskForm({...addTaskForm, title: e.target.value})}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                    placeholder="请输入任务名称"
                    required
                  />
                </div>

                {/* 任务描述 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-textPrimary">任务描述</label>
                  <textarea 
                    rows={3}
                    value={addTaskForm.description}
                    onChange={(e) => setAddTaskForm({...addTaskForm, description: e.target.value})}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                    placeholder="请输入任务描述..."
                  />
                </div>

                {/* 优先级 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-textPrimary">优先级</label>
                  <select 
                    value={addTaskForm.priority}
                    onChange={(e) => setAddTaskForm({...addTaskForm, priority: e.target.value})}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  >
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </form>
            </div>

            {/* 模态框底部 */}
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

      {/* 删除确认模态框 */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={styles.modalOverlay}
            onClick={closeDeleteConfirmModal}
          ></div>

          {/* 模态框内容 */}
          <div 
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">确认删除</h3>
            </div>

            {/* 模态框内容区 */}
            <div className="px-6 py-4">
              <p className="text-sm text-textSecondary">
                确定要删除任务 "<span className="font-medium text-textPrimary">{deleteTaskName}</span>" 吗？此操作无法撤销。
              </p>
            </div>

            {/* 模态框底部 */}
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

      {/* 下发任务确认模态框 */}
      {showDispatchConfirmModal && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={styles.modalOverlay}
            onClick={closeDispatchConfirmModal}
          ></div>

          {/* 模态框内容 */}
          <div 
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 模态框头部 */}
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">确认下发</h3>
            </div>

            {/* 模态框内容区 */}
            <div className="px-6 py-4">
              <p className="text-sm text-textSecondary">
                确定要下发任务 "<span className="font-medium text-textPrimary">{dispatchTaskName}</span>" 到执行系统吗？
              </p>
            </div>

            {/* 模态框底部 */}
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
    </div>
  );
};

export default WorkspaceDetailPage;
