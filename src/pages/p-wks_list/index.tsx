

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './styles.module.css';
import {
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  Workspace,
  WorkspaceCreateInput,
  WorkspaceUpdateInput
} from '../../services/workspaceService';

interface WorkspaceFormData {
  name: string;
  description: string;
  project_goal: string;
  path: string;
}

const WorkspaceListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 状态管理
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEditingWorkspaceId, setCurrentEditingWorkspaceId] = useState<string | null>(null);
  const [currentDeletingWorkspaceId, setCurrentDeletingWorkspaceId] = useState<string | null>(null);
  const [currentDeletingWorkspaceName, setCurrentDeletingWorkspaceName] = useState('');
  const [workspaceFormData, setWorkspaceFormData] = useState<WorkspaceFormData>({
    name: '',
    description: '',
    project_goal: '',
    path: ''
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // 获取工作区列表
  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const response = await getWorkspaces();
      setWorkspaces(response.workspaces);
    } catch (error) {
      console.error('Failed to fetch workspaces:', error);
      setErrorMessage('加载工作区列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 显示成功消息
  const showSuccessMessage = (message: string) => {
    alert(message);
  };

  // 显示错误消息
  const showErrorMessage = (message: string) => {
    alert(message);
  };

  // 设置页面标题和加载数据
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '工作区列表 - Axis';
    fetchWorkspaces();
    return () => { document.title = originalTitle; };
  }, []);

  // 筛选和搜索工作区
  const filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchTerm.toLowerCase());
    // 这里简化处理，实际应该根据真实的状态字段进行筛选
    const matchesStatus = !filterStatus || true;
    return matchesSearch && matchesStatus;
  });

  // 处理搜索输入
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // 处理状态筛选
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value);
  };

  // 处理表格排序
  const handleSort = (field: string) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    console.log(`排序字段: ${field}, 方向: ${newDirection}`);
    // 实际应用中这里会实现排序逻辑
  };

  // 打开创建工作区模态框
  const handleOpenCreateModal = () => {
    setCurrentEditingWorkspaceId(null);
    setWorkspaceFormData({
      name: '',
      description: '',
      project_goal: '',
      path: ''
    });
    setShowWorkspaceModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 打开编辑工作区模态框
  const handleOpenEditModal = (workspaceId: string) => {
    setCurrentEditingWorkspaceId(workspaceId);
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setWorkspaceFormData({
        name: workspace.name,
        description: workspace.description || '',
        project_goal: workspace.project_goal,
        path: workspace.path || ''
      });
    }
    setShowWorkspaceModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭工作区模态框
  const handleCloseWorkspaceModal = () => {
    setShowWorkspaceModal(false);
    document.body.style.overflow = 'auto';
    setCurrentEditingWorkspaceId(null);
  };

  // 打开删除确认模态框
  const handleOpenDeleteModal = (workspaceId: string, workspaceName: string) => {
    setCurrentDeletingWorkspaceId(workspaceId);
    setCurrentDeletingWorkspaceName(workspaceName);
    setShowDeleteModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭删除确认模态框
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    document.body.style.overflow = 'auto';
    setCurrentDeletingWorkspaceId(null);
    setCurrentDeletingWorkspaceName('');
  };

  // 保存工作区
  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!workspaceFormData.name.trim()) {
      showErrorMessage('请输入工作区名称');
      return;
    }

    if (!workspaceFormData.project_goal.trim()) {
      showErrorMessage('请输入项目目标');
      return;
    }

    try {
      if (currentEditingWorkspaceId) {
        // 编辑现有工作区
        const updateData: WorkspaceUpdateInput = {
          name: workspaceFormData.name,
          description: workspaceFormData.description,
          project_goal: workspaceFormData.project_goal,
          path: workspaceFormData.path
        };
        await updateWorkspace(currentEditingWorkspaceId, updateData);
        showSuccessMessage('工作区更新成功');
      } else {
        // 创建新工作区
        const createData: WorkspaceCreateInput = {
          name: workspaceFormData.name,
          description: workspaceFormData.description,
          project_goal: workspaceFormData.project_goal,
          path: workspaceFormData.path
        };
        await createWorkspace(createData);
        showSuccessMessage('工作区创建成功');
      }

      handleCloseWorkspaceModal();
      await fetchWorkspaces();
    } catch (error) {
      console.error('Failed to save workspace:', error);
      showErrorMessage('保存工作区失败');
    }
  };

  // 删除工作区
  const handleDeleteWorkspace = async () => {
    if (currentDeletingWorkspaceId) {
      try {
        await deleteWorkspace(currentDeletingWorkspaceId);
        showSuccessMessage('工作区删除成功');
        handleCloseDeleteModal();
        await fetchWorkspaces();
      } catch (error) {
        console.error('Failed to delete workspace:', error);
        showErrorMessage('删除工作区失败');
      }
    }
  };

  // 处理工作区名称点击
  const handleWorkspaceNameClick = (workspaceId: string) => {
    navigate(`/wks-detail?workspaceId=${workspaceId}`);
  };

  // 处理表单输入变化
  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWorkspaceFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // 处理ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseWorkspaceModal();
        handleCloseDeleteModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 阻止模态框内容点击事件冒泡
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
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
            <Link to="/wks-list" className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}>
              <i className="fas fa-folder w-5"></i>
              <span>工作区列表</span>
            </Link>

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
              <span className="text-textPrimary">工作区</span>
            </nav>

            {/* 标题和操作 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-textPrimary mb-2">工作区列表</h1>
                <p className="text-sm text-textSecondary">管理和组织您的项目工作区</p>
              </div>

              <div>
                <button 
                  onClick={handleOpenCreateModal}
                  className={`${styles.btnPrimary} px-6 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-plus"></i>
                  <span>创建工作区</span>
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
                    placeholder="搜索工作区名称..." 
                    value={searchTerm}
                    onChange={handleSearchInputChange}
                    className={`w-full pl-10 pr-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all`}
                  />
                </div>

                {/* 状态筛选 */}
                <select 
                  value={filterStatus}
                  onChange={handleStatusFilterChange}
                  className={`px-4 py-2 border border-border rounded-button text-sm text-textSecondary ${styles.inputFocus} transition-all`}
                >
                  <option value="">全部状态</option>
                  <option value="active">活跃</option>
                  <option value="completed">已完成</option>
                  <option value="archived">已归档</option>
                </select>
              </div>
            </div>
          </div>

          {/* 错误消息 */}
          {errorMessage && (
            <div className="bg-danger text-white px-4 py-3 rounded-card mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {errorMessage}
            </div>
          )}

          {/* 工作区列表 */}
          <div className="bg-surface rounded-card shadow-card overflow-hidden">
            {/* 加载状态 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
                  <p className="text-textSecondary">加载中...</p>
                </div>
              </div>
            ) : filteredWorkspaces.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <i className="fas fa-folder-open text-4xl text-textSecondary mb-4"></i>
                  <p className="text-textSecondary">暂无工作区</p>
                </div>
              </div>
            ) : (
              <>
                {/* 表格 */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                <thead className="bg-tertiary border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('name')}
                      >
                        <span>工作区名称</span>
                        <i className={`fas fa-sort text-xs ${sortField === 'name' ? styles.sortActive : ''}`}></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <span>项目目标</span>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('active-tasks')}
                      >
                        <span>活跃任务</span>
                        <i className={`fas fa-sort text-xs ${sortField === 'active-tasks' ? styles.sortActive : ''}`}></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('completed-tasks')}
                      >
                        <span>已完成任务</span>
                        <i className={`fas fa-sort text-xs ${sortField === 'completed-tasks' ? styles.sortActive : ''}`}></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-textSecondary">
                      <div 
                        className="flex items-center space-x-1 cursor-pointer hover:text-primary"
                        onClick={() => handleSort('created-at')}
                      >
                        <span>创建时间</span>
                        <i className={`fas fa-sort text-xs ${sortField === 'created-at' ? styles.sortActive : ''}`}></i>
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-textSecondary">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkspaces.map((workspace) => (
                    <tr key={workspace.id} className={`${styles.tableRow} border-b border-border`}>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center space-x-3 cursor-pointer hover:text-primary transition-colors"
                          onClick={() => handleWorkspaceNameClick(workspace.id)}
                        >
                          <div className={`w-10 h-10 ${workspace.icon_color || 'bg-primary'} rounded-lg flex items-center justify-center`}>
                            <i className={`${workspace.icon || 'fas fa-folder'} text-white text-sm`}></i>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-textPrimary">{workspace.name}</div>
                            <div className="text-xs text-textSecondary">{workspace.description || '无描述'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="text-sm text-textPrimary max-w-xs truncate"
                          title={workspace.project_goal}
                        >
                          {workspace.project_goal}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-textPrimary">{workspace.active_tasks || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-textPrimary">{workspace.completed_tasks || 0}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-textSecondary">{new Date(workspace.created_at).toLocaleString('zh-CN')}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            className="p-1.5 hover:bg-tertiary rounded transition-colors" 
                            title="编辑"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(workspace.id);
                            }}
                          >
                            <i className="fas fa-edit text-textSecondary text-sm"></i>
                          </button>
                          <button 
                            className="p-1.5 hover:bg-danger hover:text-white rounded transition-colors" 
                            title="删除"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDeleteModal(workspace.id, workspace.name);
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
                显示 <span className="font-medium text-textPrimary">1-{filteredWorkspaces.length}</span> 条，共 <span className="font-medium text-textPrimary">18</span> 条
              </div>

              <div className="flex items-center space-x-2">
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                <button className="px-3 py-1.5 bg-primary text-white rounded-button text-sm font-medium">1</button>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">2</button>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">3</button>
                <span className="px-2 text-textSecondary">...</span>
                <button className="px-3 py-1.5 border border-border rounded-button text-sm text-textSecondary hover:bg-tertiary transition-colors">4</button>
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
              </>
            )}
          </div>
        </main>
      </div>

      {/* 创建/编辑工作区模态框 */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCloseWorkspaceModal}
          ></div>

          {/* 模态框内容 */}
          <div 
            className={`${styles.modalContent} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-4 bg-surface rounded-card overflow-hidden`}
            onClick={handleModalContentClick}
          >
            {/* 模态框头部 */}
            <div className="bg-tertiary px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-textPrimary">
                {currentEditingWorkspaceId ? '编辑工作区' : '创建工作区'}
              </h2>
            </div>

            {/* 模态框内容区 */}
            <div className="p-6">
              <form onSubmit={handleSaveWorkspace} className="space-y-4">
                {/* 工作区名称 */}
                <div className="space-y-2">
                  <label htmlFor="workspace-name" className="block text-sm font-medium text-textPrimary">
                    工作区名称 *
                  </label>
                  <input
                    type="text"
                    id="workspace-name"
                    name="name"
                    value={workspaceFormData.name}
                    onChange={handleFormInputChange}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                    placeholder="请输入工作区名称"
                    required
                  />
                </div>

                {/* 项目目标 */}
                <div className="space-y-2">
                  <label htmlFor="project-goal" className="block text-sm font-medium text-textPrimary">
                    项目目标 *
                  </label>
                  <textarea
                    id="project-goal"
                    name="project_goal"
                    rows={3}
                    value={workspaceFormData.project_goal}
                    onChange={handleFormInputChange}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                    placeholder="请描述项目的主要目标..."
                    required
                  ></textarea>
                </div>

                {/* 描述 */}
                <div className="space-y-2">
                  <label htmlFor="description" className="block text-sm font-medium text-textPrimary">
                    描述
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    value={workspaceFormData.description}
                    onChange={handleFormInputChange}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                    placeholder="请输入描述..."
                  ></textarea>
                </div>

                {/* 工作目录 */}
                <div className="space-y-2">
                  <label htmlFor="workspace-path" className="block text-sm font-medium text-textPrimary">
                    工作目录
                  </label>
                  <input
                    type="text"
                    id="workspace-path"
                    name="path"
                    value={workspaceFormData.path}
                    onChange={handleFormInputChange}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                    placeholder="请输入工作目录路径，例如：/Users/your-name/projects/my-project"
                  />
                  <p className="text-xs text-textSecondary">
                    指定 Claude Code 执行任务的本地文件夹路径
                  </p>
                </div>
              </form>
            </div>

            {/* 模态框底部 */}
            <div className="px-6 py-4 border-t border-border bg-tertiary">
              <div className="flex items-center justify-end space-x-3">
                <button 
                  onClick={handleCloseWorkspaceModal}
                  className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                >
                  取消
                </button>
                <button 
                  onClick={handleSaveWorkspace}
                  className={`px-4 py-2 ${styles.btnPrimary} rounded-button text-sm font-medium`}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50">
          {/* 遮罩层 */}
          <div 
            className={`${styles.modalOverlay} absolute inset-0`}
            onClick={handleCloseDeleteModal}
          ></div>

          {/* 模态框内容 */}
          <div 
            className={`${styles.modalContent} absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-sm mx-4 bg-surface rounded-card overflow-hidden`}
            onClick={handleModalContentClick}
          >
            {/* 模态框头部 */}
            <div className="bg-tertiary px-6 py-4 border-b border-border">
              <h2 className="text-lg font-semibold text-textPrimary">确认删除</h2>
            </div>

            {/* 模态框内容区 */}
            <div className="p-6">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-danger rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fas fa-exclamation-triangle text-white text-sm"></i>
                </div>
                <div>
                  <p className="text-sm text-textPrimary font-medium mb-2">删除工作区</p>
                  <p className="text-sm text-textSecondary">
                    {'确定要删除工作区 "'}<span className="font-medium text-textPrimary">{currentDeletingWorkspaceName}</span>{'" 吗？此操作不可撤销，将删除该工作区下的所有任务和配置。'}
                  </p>
                </div>
              </div>
            </div>

            {/* 模态框底部 */}
            <div className="px-6 py-4 border-t border-border bg-tertiary">
              <div className="flex items-center justify-end space-x-3">
                <button 
                  onClick={handleCloseDeleteModal}
                  className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                >
                  取消
                </button>
                <button 
                  onClick={handleDeleteWorkspace}
                  className="px-4 py-2 bg-danger text-white rounded-button text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceListPage;

