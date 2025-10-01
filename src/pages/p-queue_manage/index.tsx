

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

interface Task {
  id: string;
  order: number;
  name: string;
  status: 'pending' | 'progress' | 'completed' | 'failed';
  errorReason?: string;
  tooltip?: string;
}

interface Queue {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
  tasks: Task[];
}

interface ConfirmAction {
  type: 'start-queue' | 'pause-queue' | 'delete-queue' | 'retry-task';
  queueId?: string;
  taskId?: string;
}

const QueueManagePage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [queues, setQueues] = useState<Queue[]>([
    {
      id: '1',
      name: 'API接口开发队列',
      status: 'running',
      progress: 60,
      totalTasks: 5,
      completedTasks: 3,
      createdAt: '2024-01-15 10:30',
      tasks: [
        { id: '1', order: 1, name: '实现用户认证模块', status: 'completed' },
        { id: '2', order: 2, name: '优化数据库查询性能', status: 'progress' },
        { id: '3', order: 3, name: '编写API文档', status: 'pending' },
        { id: '4', order: 4, name: '单元测试覆盖率提升', status: 'failed', errorReason: '超时错误', tooltip: '测试用例执行超时' },
        { id: '5', order: 5, name: '部署到测试环境', status: 'pending' }
      ]
    },
    {
      id: '2',
      name: '前端页面开发队列',
      status: 'pending',
      progress: 0,
      totalTasks: 3,
      completedTasks: 0,
      createdAt: '2024-01-15 14:20',
      tasks: []
    },
    {
      id: '3',
      name: 'Bug修复队列',
      status: 'completed',
      progress: 100,
      totalTasks: 2,
      completedTasks: 2,
      createdAt: '2024-01-14 16:45',
      tasks: []
    }
  ]);

  const [expandedQueues, setExpandedQueues] = useState<Set<string>>(new Set());
  const [showCreateQueueModal, setShowCreateQueueModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [queueName, setQueueName] = useState('');

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
  const handleQueueToggle = (queueId: string) => {
    const newExpanded = new Set(expandedQueues);
    if (newExpanded.has(queueId)) {
      newExpanded.delete(queueId);
    } else {
      newExpanded.add(queueId);
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
      case 'pause':
        showConfirmDialog('暂停队列', '确定要暂停这个队列吗？', { type: 'pause-queue', queueId });
        break;
      case 'delete':
        showConfirmDialog('删除队列', '确定要删除这个队列吗？删除后无法恢复。', { type: 'delete-queue', queueId });
        break;
      case 'view':
        handleQueueToggle(queueId);
        break;
    }
  };

  // 处理任务操作
  const handleTaskAction = (action: string, queueId: string, taskId: string) => {
    switch (action) {
      case 'retry-task':
        showConfirmDialog('重试任务', '确定要重试这个失败的任务吗？', { type: 'retry-task', queueId, taskId });
        break;
      case 'view-task':
        navigate(`/wks-detail?taskId=${taskId}`);
        break;
    }
  };

  // 处理确认操作
  const handleConfirmAction = () => {
    if (confirmAction) {
      console.log('执行操作:', confirmAction);
      
      switch (confirmAction.type) {
        case 'start-queue':
          // 启动队列逻辑
          console.log('启动队列:', confirmAction.queueId);
          break;
        case 'pause-queue':
          // 暂停队列逻辑
          console.log('暂停队列:', confirmAction.queueId);
          break;
        case 'delete-queue':
          // 删除队列逻辑
          setQueues(prev => prev.filter(q => q.id !== confirmAction.queueId));
          console.log('删除队列:', confirmAction.queueId);
          break;
        case 'retry-task':
          // 重试任务逻辑
          console.log('重试任务:', confirmAction.taskId);
          break;
      }
      
      setShowConfirmModal(false);
      setConfirmAction(null);
      alert('操作执行成功！');
    }
  };

  // 处理创建队列
  const handleCreateQueue = (e: React.FormEvent) => {
    e.preventDefault();
    if (queueName.trim()) {
      const newQueue: Queue = {
        id: Date.now().toString(),
        name: queueName.trim(),
        status: 'pending',
        progress: 0,
        totalTasks: 0,
        completedTasks: 0,
        createdAt: new Date().toLocaleString(),
        tasks: []
      };
      
      setQueues(prev => [...prev, newQueue]);
      setQueueName('');
      setShowCreateQueueModal(false);
      alert('队列创建成功！');
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
            <div className="mt-6">
              <div className="px-4 py-2 text-xs text-textSecondary uppercase tracking-wider">当前工作区</div>
              <Link to="/wks-detail" className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
                <i className="fas fa-tasks w-5"></i>
                <span>项目Alpha</span>
              </Link>
              <Link to="/wks-settings" className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
                <i className="fas fa-cog w-5"></i>
                <span>工作区设置</span>
              </Link>
              <Link to="/queue-manage" className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}>
                <i className="fas fa-list-ol w-5"></i>
                <span>任务队列</span>
              </Link>
            </div>

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
        <main className="flex-1 ml-[240px] min-w-[720px] p-6">
          {/* 页面头部 */}
          <div className="bg-surface rounded-card shadow-card p-6 mb-6">
            {/* 面包屑导航 */}
            <nav className="flex items-center space-x-2 text-sm text-textSecondary mb-4">
              <Link to="/wks-list" className="hover:text-primary transition-colors">工作区</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <Link to="/wks-detail" className="hover:text-primary transition-colors">项目Alpha</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-textPrimary">任务队列管理</span>
            </nav>

            {/* 标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-textPrimary mb-2">任务队列管理</h1>
                <p className="text-sm text-textSecondary">创建和管理任务队列，批量执行任务</p>
              </div>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => setShowCreateQueueModal(true)}
                  className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-plus"></i>
                  <span>创建队列</span>
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
                    placeholder="搜索队列名称..." 
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
                  <option value="running">执行中</option>
                  <option value="completed">已完成</option>
                  <option value="failed">失败</option>
                </select>
              </div>
            </div>
          </div>

          {/* 队列列表 */}
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-tertiary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">队列名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">状态</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">进度</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">任务数</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">创建时间</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-textSecondary">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueues.map((queue) => (
                    <React.Fragment key={queue.id}>
                      {/* 队列行 */}
                      <tr 
                        className={`${styles.tableRow} border-b border-border cursor-pointer ${expandedQueues.has(queue.id) ? styles.queueExpanded : ''}`}
                        onClick={(e) => {
                          // 如果点击的是操作按钮，不展开/折叠
                          if ((e.target as HTMLElement).closest('button')) {
                            return;
                          }
                          handleQueueToggle(queue.id);
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <i className="fas fa-layer-group text-primary text-sm"></i>
                            <span className="text-sm text-textPrimary font-medium hover:text-primary transition-colors">{queue.name}</span>
                            <i className={`fas ${expandedQueues.has(queue.id) ? 'fa-chevron-down' : 'fa-chevron-right'} text-xs text-textSecondary ml-2`}></i>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`${getQueueStatusClass(queue.status)} px-3 py-1 rounded-full text-xs font-medium`}>
                            {getQueueStatusText(queue.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <div className={`${styles.progressBar} w-24 h-2`}>
                              <div className={styles.progressFill} style={{ width: `${queue.progress}%` }}></div>
                            </div>
                            <span className="text-xs text-textSecondary">{queue.completedTasks}/{queue.totalTasks}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-textPrimary">{queue.totalTasks}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-textSecondary">{queue.createdAt}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center space-x-2">
                            {queue.status === 'pending' ? (
                              <button 
                                className="p-1.5 hover:bg-primary rounded transition-colors" 
                                title="启动"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQueueAction('start', queue.id);
                                }}
                              >
                                <i className="fas fa-play text-primary text-sm"></i>
                              </button>
                            ) : queue.status === 'running' ? (
                              <button 
                                className="p-1.5 hover:bg-tertiary rounded transition-colors" 
                                title="暂停"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQueueAction('pause', queue.id);
                                }}
                              >
                                <i className="fas fa-pause text-warning text-sm"></i>
                              </button>
                            ) : null}
                            <button 
                              className="p-1.5 hover:bg-tertiary rounded transition-colors" 
                              title="查看"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQueueAction('view', queue.id);
                              }}
                            >
                              <i className="fas fa-eye text-textSecondary text-sm"></i>
                            </button>
                            <button 
                              className="p-1.5 hover:bg-tertiary rounded transition-colors" 
                              title="删除"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQueueAction('delete', queue.id);
                              }}
                            >
                              <i className="fas fa-trash-alt text-danger text-sm"></i>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 队列任务列表（展开时显示） */}
                      {expandedQueues.has(queue.id) && queue.tasks.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-0">
                            <div className="bg-tertiary p-4">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-border">
                                      <th className="text-left py-2 text-xs font-medium text-textSecondary">顺序</th>
                                      <th className="text-left py-2 text-xs font-medium text-textSecondary">任务名称</th>
                                      <th className="text-left py-2 text-xs font-medium text-textSecondary">状态</th>
                                      <th className="text-left py-2 text-xs font-medium text-textSecondary">失败原因</th>
                                      <th className="text-center py-2 text-xs font-medium text-textSecondary">操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {queue.tasks.map((task) => (
                                      <tr key={task.id} className="border-b border-border">
                                        <td className="py-2">
                                          <div className="flex items-center space-x-2">
                                            <i className={`fas fa-grip-vertical ${styles.dragHandle} text-textSecondary text-sm`}></i>
                                            <span className="text-sm text-textPrimary">{task.order}</span>
                                          </div>
                                        </td>
                                        <td className="py-2">
                                          <span 
                                            className="text-sm text-textPrimary hover:text-primary cursor-pointer"
                                            onClick={() => navigate(`/wks-detail?taskId=${task.id}`)}
                                          >
                                            {task.name}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          <span className={`${getTaskStatusClass(task.status)} px-2 py-1 rounded-full text-xs font-medium`}>
                                            {getTaskStatusText(task.status)}
                                          </span>
                                        </td>
                                        <td className="py-2">
                                          {task.errorReason ? (
                                            <span className={`text-sm text-textSecondary ${styles.tooltip}`} data-tooltip={task.tooltip}>
                                              {task.errorReason}
                                            </span>
                                          ) : (
                                            <span className="text-sm text-textSecondary">-</span>
                                          )}
                                        </td>
                                        <td className="py-2">
                                          <div className="flex items-center justify-center space-x-1">
                                            {task.status === 'failed' && (
                                              <button 
                                                className="p-1 hover:bg-warning rounded transition-colors" 
                                                title="重试"
                                                onClick={() => handleTaskAction('retry-task', queue.id, task.id)}
                                              >
                                                <i className="fas fa-redo text-warning text-xs"></i>
                                              </button>
                                            )}
                                            <button 
                                              className="p-1 hover:bg-tertiary rounded transition-colors" 
                                              title="查看"
                                              onClick={() => handleTaskAction('view-task', queue.id, task.id)}
                                            >
                                              <i className="fas fa-eye text-textSecondary text-xs"></i>
                                            </button>
                                          </div>
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
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-textSecondary">
                显示 <span className="font-medium text-textPrimary">1-3</span> 条，共 <span className="font-medium text-textPrimary">8</span> 条
              </div>

              <div className="flex items-center space-x-2">
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <button className="px-3 py-1.5 bg-primary text-white rounded-button text-sm font-medium">1</button>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">2</button>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">3</button>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-textSecondary">每页</span>
                <select className={`px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus}`}>
                  <option value="5">5</option>
                  <option value="10" selected>10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
                <span className="text-sm text-textSecondary">条</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* 创建队列模态框 */}
      {showCreateQueueModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={() => {
              setShowCreateQueueModal(false);
              setQueueName('');
            }}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className="bg-surface rounded-card shadow-card w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-textPrimary mb-4">创建新队列</h3>
                <form onSubmit={handleCreateQueue} className="space-y-4">
                  <div>
                    <label htmlFor="queue-name" className="block text-sm font-medium text-textPrimary mb-2">队列名称</label>
                    <input 
                      type="text" 
                      id="queue-name" 
                      value={queueName}
                      onChange={(e) => setQueueName(e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      placeholder="请输入队列名称" 
                      required 
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowCreateQueueModal(false);
                        setQueueName('');
                      }}
                      className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                    >
                      取消
                    </button>
                    <button 
                      type="submit" 
                      className={`px-4 py-2 ${styles.btnPrimary} rounded-button text-sm font-medium`}
                    >
                      创建
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 确认操作模态框 */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-30"
            onClick={() => {
              setShowConfirmModal(false);
              setConfirmAction(null);
            }}
          ></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className="bg-surface rounded-card shadow-card w-full max-w-md">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-textPrimary mb-2">{confirmTitle}</h3>
                <p className="text-sm text-textSecondary mb-6">{confirmMessage}</p>
                <div className="flex items-center justify-end space-x-3">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmAction(null);
                    }}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    type="button" 
                    onClick={handleConfirmAction}
                    className={`px-4 py-2 ${styles.btnDanger} rounded-button text-sm font-medium`}
                  >
                    确认
                  </button>
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

