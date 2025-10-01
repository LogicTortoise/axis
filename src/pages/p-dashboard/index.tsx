

import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const originalTitle = document.title;
    document.title = '仪表盘 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  const handleWorkspaceCardClick = (workspaceId: string) => {
    navigate(`/wks-detail?workspaceId=${workspaceId}`);
  };

  const handleQuickActionCreateWorkspace = () => {
    navigate('/wks-list');
  };

  const handleQuickActionAddTask = () => {
    navigate('/wks-list');
  };

  const handleQuickActionManageQueues = () => {
    navigate('/queue-manage');
  };

  const handleQuickActionViewNotifications = () => {
    navigate('/notif-center');
  };

  const handleActivityItemClick = () => {
    navigate('/notif-center');
  };

  const handleNotificationButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate('/notif-center');
  };

  const handleRetryTask = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 实现重试逻辑
    console.log('重试任务');
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
            <a 
              href="/notif-center" 
              className="relative p-2 hover:bg-tertiary rounded-button transition-colors"
              onClick={handleNotificationButtonClick}
            >
              <i className="far fa-bell text-textSecondary text-lg"></i>
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            </a>

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
              className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}
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
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-textPrimary mb-2">仪表盘</h1>
            <p className="text-textSecondary">欢迎回来，开发者！今天是新的一天，让我们开始高效工作吧。</p>
          </div>

          {/* 工作区概览卡片 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">工作区概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 工作区卡片 1 */}
              <div 
                className={`${styles.workspaceCard} bg-surface rounded-card shadow-card p-6 cursor-pointer transition-all duration-200`}
                onClick={() => handleWorkspaceCardClick('1')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                    <i className="fas fa-rocket text-white"></i>
                  </div>
                  <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>活跃</span>
                </div>
                <h3 className="text-lg font-semibold text-textPrimary mb-2">项目Alpha</h3>
                <p className="text-sm text-textSecondary mb-4">核心功能开发与系统测试</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">待处理任务</span>
                    <span className="font-medium text-textPrimary">3</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">进行中任务</span>
                    <span className="font-medium text-textPrimary">2</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">已完成任务</span>
                    <span className="font-medium text-success">8</span>
                  </div>
                </div>
              </div>

              {/* 工作区卡片 2 */}
              <div 
                className={`${styles.workspaceCard} bg-surface rounded-card shadow-card p-6 cursor-pointer transition-all duration-200`}
                onClick={() => handleWorkspaceCardClick('2')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
                    <i className="fas fa-database text-white"></i>
                  </div>
                  <span className={`${styles.statusPending} px-3 py-1 rounded-full text-xs font-medium`}>准备中</span>
                </div>
                <h3 className="text-lg font-semibold text-textPrimary mb-2">数据分析平台</h3>
                <p className="text-sm text-textSecondary mb-4">构建实时数据处理和可视化系统</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">待处理任务</span>
                    <span className="font-medium text-textPrimary">5</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">进行中任务</span>
                    <span className="font-medium text-textPrimary">1</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">已完成任务</span>
                    <span className="font-medium text-success">2</span>
                  </div>
                </div>
              </div>

              {/* 工作区卡片 3 */}
              <div 
                className={`${styles.workspaceCard} bg-surface rounded-card shadow-card p-6 cursor-pointer transition-all duration-200`}
                onClick={() => handleWorkspaceCardClick('3')}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
                    <i className="fas fa-mobile-alt text-white"></i>
                  </div>
                  <span className={`${styles.statusCompleted} px-3 py-1 rounded-full text-xs font-medium`}>已完成</span>
                </div>
                <h3 className="text-lg font-semibold text-textPrimary mb-2">移动应用重构</h3>
                <p className="text-sm text-textSecondary mb-4">使用新架构重写移动端应用</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">待处理任务</span>
                    <span className="font-medium text-textPrimary">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">进行中任务</span>
                    <span className="font-medium text-textPrimary">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textSecondary">已完成任务</span>
                    <span className="font-medium text-success">15</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 近期活动 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-textPrimary">近期活动</h2>
              <Link to="/notif-center" className="text-sm text-primary hover:underline">查看全部</Link>
            </div>
            <div className="bg-surface rounded-card shadow-card overflow-hidden">
              {/* 活动项 1 */}
              <div 
                className={`${styles.activityItem} flex items-center p-4 border-b border-border transition-colors cursor-pointer`}
                onClick={handleActivityItemClick}
              >
                <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-check text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-textPrimary">任务"实现用户认证模块"已完成</div>
                  <div className="text-xs text-textSecondary">2小时前 · 项目Alpha</div>
                </div>
                <div className="text-right">
                  <span className={`${styles.statusCompleted} px-3 py-1 rounded-full text-xs font-medium`}>已完成</span>
                </div>
              </div>

              {/* 活动项 2 */}
              <div 
                className={`${styles.activityItem} flex items-center p-4 border-b border-border transition-colors cursor-pointer`}
                onClick={handleActivityItemClick}
              >
                <div className="w-10 h-10 bg-danger rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-exclamation text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-textPrimary">任务"单元测试覆盖率提升"执行失败</div>
                  <div className="text-xs text-textSecondary">4小时前 · 项目Alpha</div>
                </div>
                <div className="text-right">
                  <button className="text-xs text-primary hover:underline" onClick={handleRetryTask}>重试</button>
                </div>
              </div>

              {/* 活动项 3 */}
              <div 
                className={`${styles.activityItem} flex items-center p-4 border-b border-border transition-colors cursor-pointer`}
                onClick={handleActivityItemClick}
              >
                <div className="w-10 h-10 bg-info rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-plus text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-textPrimary">从API获取了3个新任务</div>
                  <div className="text-xs text-textSecondary">6小时前 · 数据分析平台</div>
                </div>
                <div className="text-right">
                  <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>已添加</span>
                </div>
              </div>

              {/* 活动项 4 */}
              <div 
                className={`${styles.activityItem} flex items-center p-4 border-b border-border transition-colors cursor-pointer`}
                onClick={handleActivityItemClick}
              >
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-play text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-textPrimary">任务队列"数据处理流程"已启动</div>
                  <div className="text-xs text-textSecondary">1天前 · 数据分析平台</div>
                </div>
                <div className="text-right">
                  <span className={`${styles.statusProgress} px-3 py-1 rounded-full text-xs font-medium`}>执行中</span>
                </div>
              </div>

              {/* 活动项 5 */}
              <div 
                className={`${styles.activityItem} flex items-center p-4 transition-colors cursor-pointer`}
                onClick={handleActivityItemClick}
              >
                <div className="w-10 h-10 bg-warning rounded-full flex items-center justify-center mr-4">
                  <i className="fas fa-edit text-white text-sm"></i>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-textPrimary">工作区"移动应用重构"项目目标已更新</div>
                  <div className="text-xs text-textSecondary">2天前</div>
                </div>
                <div className="text-right">
                  <span className={`${styles.statusCompleted} px-3 py-1 rounded-full text-xs font-medium`}>已更新</span>
                </div>
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="bg-surface rounded-card shadow-card p-6">
            <h2 className="text-xl font-semibold text-textPrimary mb-4">快速操作</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                className="flex items-center space-x-3 p-4 border border-border rounded-button hover:bg-tertiary transition-colors text-left"
                onClick={handleQuickActionCreateWorkspace}
              >
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-plus text-white"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-textPrimary">创建工作区</div>
                  <div className="text-xs text-textSecondary">开始新项目</div>
                </div>
              </button>

              <button 
                className="flex items-center space-x-3 p-4 border border-border rounded-button hover:bg-tertiary transition-colors text-left"
                onClick={handleQuickActionAddTask}
              >
                <div className="w-10 h-10 bg-info rounded-lg flex items-center justify-center">
                  <i className="fas fa-tasks text-white"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-textPrimary">添加任务</div>
                  <div className="text-xs text-textSecondary">快速创建待办事项</div>
                </div>
              </button>

              <button 
                className="flex items-center space-x-3 p-4 border border-border rounded-button hover:bg-tertiary transition-colors text-left"
                onClick={handleQuickActionManageQueues}
              >
                <div className="w-10 h-10 bg-warning rounded-lg flex items-center justify-center">
                  <i className="fas fa-list-ol text-white"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-textPrimary">管理队列</div>
                  <div className="text-xs text-textSecondary">查看任务队列状态</div>
                </div>
              </button>

              <button 
                className="flex items-center space-x-3 p-4 border border-border rounded-button hover:bg-tertiary transition-colors text-left"
                onClick={handleQuickActionViewNotifications}
              >
                <div className="w-10 h-10 bg-danger rounded-lg flex items-center justify-center">
                  <i className="fas fa-bell text-white"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-textPrimary">查看通知</div>
                  <div className="text-xs text-textSecondary">3条未读消息</div>
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;

