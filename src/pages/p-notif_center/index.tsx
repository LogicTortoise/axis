

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

interface NotificationItem {
  id: string;
  type: 'task-completion' | 'task-failure' | 'system-alert';
  status: 'read' | 'unread';
  title: string;
  content: string;
  taskId?: string;
  taskName?: string;
  receivedTime: string;
}

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortType, setSortType] = useState('time-desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [currentRetryTaskId, setCurrentRetryTaskId] = useState<string | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'task-failure',
      status: 'unread',
      title: '任务执行失败',
      content: '单元测试覆盖率提升任务执行失败，错误原因：测试用例执行超时',
      taskId: '5',
      taskName: '单元测试覆盖率提升',
      receivedTime: '2024-01-15 15:30'
    },
    {
      id: '2',
      type: 'task-completion',
      status: 'unread',
      title: '任务已完成',
      content: '修复登录页面样式问题任务已成功完成',
      taskId: '3',
      taskName: '修复登录页面样式问题',
      receivedTime: '2024-01-15 14:45'
    },
    {
      id: '3',
      type: 'system-alert',
      status: 'unread',
      title: '系统维护通知',
      content: '系统将于今晚23:00-01:00进行例行维护，期间可能影响服务可用性',
      receivedTime: '2024-01-15 13:20'
    },
    {
      id: '4',
      type: 'task-completion',
      status: 'read',
      title: '任务已完成',
      content: '实现用户认证模块任务已成功完成',
      taskId: '1',
      taskName: '实现用户认证模块',
      receivedTime: '2024-01-15 12:15'
    },
    {
      id: '5',
      type: 'task-failure',
      status: 'read',
      title: '任务执行失败',
      content: 'API文档生成任务执行失败，错误原因：模板文件不存在',
      taskId: '6',
      taskName: 'API文档生成',
      receivedTime: '2024-01-15 11:30'
    },
    {
      id: '6',
      type: 'system-alert',
      status: 'read',
      title: 'API配置更新',
      content: '项目Alpha的Jira API配置已更新，下次任务获取将使用新配置',
      receivedTime: '2024-01-15 10:45'
    }
  ]);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '通知中心 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                         notification.content.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchesType = !typeFilter || notification.type === typeFilter;
    const matchesStatus = !statusFilter || notification.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
  };

  const handleNotificationClick = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId && n.status === 'unread' 
        ? { ...n, status: 'read' }
        : n
      )
    );
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/wks-detail?taskId=${taskId}`);
  };

  const handleRetryClick = (taskId: string) => {
    setCurrentRetryTaskId(taskId);
    setShowRetryModal(true);
  };

  const handleRetryConfirm = () => {
    console.log('重试任务:', currentRetryTaskId);
    setShowRetryModal(false);
    setCurrentRetryTaskId(null);
    alert('任务已重新提交执行');
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId && n.status === 'unread'
        ? { ...n, status: 'read' }
        : n
      )
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task-completion':
        return 'fas fa-check-circle';
      case 'task-failure':
        return 'fas fa-exclamation-triangle';
      case 'system-alert':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-bell';
    }
  };

  const getTypeClass = (type: string) => {
    switch (type) {
      case 'task-completion':
        return styles.typeTaskCompletion;
      case 'task-failure':
        return styles.typeTaskFailure;
      case 'system-alert':
        return styles.typeSystemAlert;
      default:
        return '';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'task-completion':
        return '任务完成';
      case 'task-failure':
        return '任务失败';
      case 'system-alert':
        return '系统提醒';
      default:
        return '通知';
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
              <i className="fas fa-bell text-primary text-lg"></i>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
              )}
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

            {/* 通知中心 */}
            <Link to="/notif-center" className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}>
              <i className="fas fa-bell w-5"></i>
              <span>通知中心</span>
              {unreadCount > 0 && (
                <span className="ml-auto bg-danger text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </Link>
          </nav>
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 ml-[240px] min-w-[720px] p-6">
          {/* 页面头部 */}
          <div className="bg-surface rounded-card shadow-card p-6 mb-6">
            {/* 面包屑导航 */}
            <nav className="flex items-center space-x-2 text-sm text-textSecondary mb-4">
              <Link to="/dashboard" className="hover:text-primary transition-colors">首页</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-textPrimary">通知中心</span>
            </nav>

            {/* 标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-textPrimary mb-2">通知中心</h1>
                <p className="text-sm text-textSecondary">
                  您有 <span className="font-medium text-danger">{unreadCount}</span> 条未读通知
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button 
                  onClick={handleMarkAllAsRead}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-check-double"></i>
                  <span>全部标记为已读</span>
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
                    placeholder="搜索通知内容..." 
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all`}
                  />
                </div>

                {/* 类型筛选 */}
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部类型</option>
                  <option value="task-completion">任务完成</option>
                  <option value="task-failure">任务失败</option>
                  <option value="system-alert">系统提醒</option>
                </select>

                {/* 状态筛选 */}
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部状态</option>
                  <option value="unread">未读</option>
                  <option value="read">已读</option>
                </select>
              </div>

              {/* 排序 */}
              <div className="relative">
                <button 
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-sort"></i>
                  <span>时间排序</span>
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>
                {showSortDropdown && (
                  <div className={styles.dropdownMenu}>
                    <button 
                      onClick={() => { setSortType('time-desc'); setShowSortDropdown(false); }}
                      className={styles.dropdownItem}
                    >
                      最新在前
                    </button>
                    <button 
                      onClick={() => { setSortType('time-asc'); setShowSortDropdown(false); }}
                      className={styles.dropdownItem}
                    >
                      最旧在前
                    </button>
                    <button 
                      onClick={() => { setSortType('status'); setShowSortDropdown(false); }}
                      className={styles.dropdownItem}
                    >
                      按状态排序
                    </button>
                    <button 
                      onClick={() => { setSortType('type'); setShowSortDropdown(false); }}
                      className={styles.dropdownItem}
                    >
                      按类型排序
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 通知列表 */}
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {/* 表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-tertiary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div className="flex items-center space-x-1 cursor-pointer hover:text-primary">
                        <span>状态</span>
                        <i className="fas fa-sort text-xs"></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div className="flex items-center space-x-1 cursor-pointer hover:text-primary">
                        <span>通知标题</span>
                        <i className="fas fa-sort text-xs"></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div className="flex items-center space-x-1 cursor-pointer hover:text-primary">
                        <span>简要内容</span>
                        <i className="fas fa-sort text-xs"></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div className="flex items-center space-x-1 cursor-pointer hover:text-primary">
                        <span>关联任务</span>
                        <i className="fas fa-sort text-xs"></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div className="flex items-center space-x-1 cursor-pointer hover:text-primary">
                        <span>接收时间</span>
                        <i className="fas fa-sort text-xs"></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-textSecondary">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotifications.map((notification) => (
                    <tr 
                      key={notification.id}
                      className={`${styles.notificationRow} ${notification.status === 'unread' ? styles.notificationUnread : styles.notificationRead} border-b border-border cursor-pointer`}
                      onClick={(e) => {
                        if (!(e.target as HTMLElement).closest('button') && !(e.target as HTMLElement).closest('a')) {
                          handleNotificationClick(notification.id);
                        }
                      }}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          <div className={`w-3 h-3 rounded-full ${notification.status === 'unread' ? 'bg-danger' : 'bg-border'}`}></div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center space-x-3">
                          <i className={`${getTypeIcon(notification.type)} ${getTypeClass(notification.type)} text-lg`}></i>
                          <div>
                            <h3 
                              className="text-sm font-medium text-textPrimary hover:text-primary transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notification.taskId) {
                                  handleTaskClick(notification.taskId);
                                }
                              }}
                            >
                              {notification.title}
                            </h3>
                            <span className="text-xs text-textSecondary">{getTypeText(notification.type)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-textSecondary">{notification.content}</p>
                      </td>
                      <td className="px-4 py-4">
                        {notification.taskId ? (
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleTaskClick(notification.taskId!);
                            }}
                            className="text-sm text-primary hover:underline transition-colors"
                          >
                            {notification.taskName}
                          </button>
                        ) : (
                          <span className="text-sm text-textSecondary">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-textSecondary">{notification.receivedTime}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          {notification.type === 'task-failure' && notification.taskId ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetryClick(notification.taskId!);
                              }}
                              className={`${styles.btnDanger} px-3 py-1 rounded-button text-xs font-medium`}
                            >
                              <i className="fas fa-redo mr-1"></i>重试
                            </button>
                          ) : notification.taskId ? (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(notification.taskId!);
                              }}
                              className="p-1.5 hover:bg-tertiary rounded transition-colors"
                              title="查看任务"
                            >
                              <i className="fas fa-eye text-textSecondary text-sm"></i>
                            </button>
                          ) : (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="p-1.5 hover:bg-tertiary rounded transition-colors"
                              title="标记为已读"
                            >
                              <i className="fas fa-check text-textSecondary text-sm"></i>
                            </button>
                          )}
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
                显示 <span className="font-medium text-textPrimary">1-{filteredNotifications.length}</span> 条，共 <span className="font-medium text-textPrimary">18</span> 条
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
                  <option value="6">6</option>
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

      {/* 重试确认弹窗 */}
      {showRetryModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => setShowRetryModal(false)}></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className="bg-surface rounded-card shadow-card max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <i className="fas fa-exclamation-triangle text-warning text-xl"></i>
                  <h3 className="text-lg font-semibold text-textPrimary">确认重试任务</h3>
                </div>
                <p className="text-sm text-textSecondary mb-6">确定要重试执行失败的任务吗？</p>
                <div className="flex items-center justify-end space-x-3">
                  <button 
                    onClick={() => setShowRetryModal(false)}
                    className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleRetryConfirm}
                    className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
                  >
                    确认重试
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 点击其他地方关闭下拉菜单 */}
      {showSortDropdown && (
        <div 
          className="fixed inset-0 z-30"
          onClick={() => setShowSortDropdown(false)}
        ></div>
      )}
    </div>
  );
};

export default NotificationCenter;

