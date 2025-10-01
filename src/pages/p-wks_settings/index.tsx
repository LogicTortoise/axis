

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './styles.module.css';

interface WorkspaceData {
  name: string;
  description: string;
  goal: string;
}

interface ApiConfig {
  id: string;
  name: string;
  type: 'fetch' | 'dispatch';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  authType: 'none' | 'api-key' | 'bearer' | 'basic';
  authKey?: string;
  autoFetchEnabled: boolean;
  fetchInterval: string;
  params?: string;
  headers?: string;
}

interface HookConfig {
  id: string;
  name: string;
  type: 'start' | 'stop';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  trigger: 'always' | 'success' | 'failure';
  enabled: boolean;
  params?: string;
  headers?: string;
  lastExecution?: string;
}

const WorkspaceSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId') || 'default';

  // 页面标题设置
  useEffect(() => {
    const originalTitle = document.title;
    document.title = '工作区设置 - Axis';
    return () => { document.title = originalTitle; };
  }, []);

  // 工作区数据状态
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>({
    name: '项目Alpha',
    description: '这是一个重要的开发项目，包含用户认证、数据管理和API集成等核心功能模块。',
    goal: '完成核心功能开发并进行系统测试，确保产品质量达到上线标准。'
  });

  // 模态框状态
  const [showApiModal, setShowApiModal] = useState(false);
  const [showHookModal, setShowHookModal] = useState(false);
  const [currentApiId, setCurrentApiId] = useState<string | null>(null);
  const [currentHookId, setCurrentHookId] = useState<string | null>(null);
  const [isEditingApi, setIsEditingApi] = useState(false);
  const [isEditingHook, setIsEditingHook] = useState(false);

  // API配置列表
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([
    {
      id: '1',
      name: 'Jira任务获取API',
      type: 'fetch',
      url: 'https://api.jira.com/tasks',
      method: 'GET',
      authType: 'api-key',
      authKey: 'mock-api-key',
      autoFetchEnabled: true,
      fetchInterval: '0 * * * *',
      params: '',
      headers: ''
    },
    {
      id: '2',
      name: '任务下发执行API',
      type: 'dispatch',
      url: 'https://api.executor.com/tasks',
      method: 'POST',
      authType: 'bearer',
      authKey: 'mock-bearer-token',
      autoFetchEnabled: false,
      fetchInterval: '0 * * * *',
      params: '',
      headers: ''
    }
  ]);

  // Hook配置列表
  const [hookConfigs, setHookConfigs] = useState<HookConfig[]>([
    {
      id: '1',
      name: '任务开始通知Hook',
      type: 'start',
      url: 'https://hooks.axis.com/task/start',
      method: 'POST',
      trigger: 'always',
      enabled: true,
      params: '',
      headers: '',
      lastExecution: '2024-01-15 14:30'
    },
    {
      id: '2',
      name: '任务完成通知Hook',
      type: 'stop',
      url: 'https://hooks.axis.com/task/complete',
      method: 'POST',
      trigger: 'always',
      enabled: true,
      params: '',
      headers: '',
      lastExecution: '2024-01-15 13:45'
    }
  ]);

  // API表单状态
  const [apiFormData, setApiFormData] = useState({
    name: '',
    type: '',
    url: '',
    method: 'GET',
    authType: 'none',
    authKey: '',
    autoFetchEnabled: false,
    fetchInterval: '0 * * * *',
    params: '',
    headers: ''
  });

  // Hook表单状态
  const [hookFormData, setHookFormData] = useState({
    name: '',
    type: '',
    url: '',
    method: 'POST',
    trigger: 'always',
    enabled: true,
    params: '',
    headers: ''
  });

  // 加载工作区数据
  useEffect(() => {
    const mockWorkspaceData: Record<string, WorkspaceData> = {
      'default': {
        name: '项目Alpha',
        description: '这是一个重要的开发项目，包含用户认证、数据管理和API集成等核心功能模块。',
        goal: '完成核心功能开发并进行系统测试，确保产品质量达到上线标准。'
      },
      'workspace1': {
        name: '项目Beta',
        description: '移动端应用开发项目，包含前端界面和后端API。',
        goal: '完成MVP版本开发并上线应用商店。'
      }
    };

    const data = mockWorkspaceData[workspaceId] || mockWorkspaceData['default'];
    setWorkspaceData(data);
  }, [workspaceId]);

  // 处理工作区数据变化
  const handleWorkspaceDataChange = (field: keyof WorkspaceData, value: string) => {
    setWorkspaceData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 保存工作区设置
  const handleSaveSettings = () => {
    console.log('保存工作区设置:', workspaceData);
    alert('设置已保存！');
    navigate(`/wks-detail?workspaceId=${workspaceId}`);
  };

  // 取消操作
  const handleCancel = () => {
    navigate(`/wks-detail?workspaceId=${workspaceId}`);
  };

  // 打开API模态框
  const openApiModal = (mode: 'add' | 'edit', apiId?: string) => {
    setIsEditingApi(mode === 'edit');
    setCurrentApiId(apiId || null);
    
    if (mode === 'add') {
      setApiFormData({
        name: '',
        type: '',
        url: '',
        method: 'GET',
        authType: 'none',
        authKey: '',
        autoFetchEnabled: false,
        fetchInterval: '0 * * * *',
        params: '',
        headers: ''
      });
    } else if (apiId) {
      const apiConfig = apiConfigs.find(api => api.id === apiId);
      if (apiConfig) {
        setApiFormData({
          name: apiConfig.name,
          type: apiConfig.type,
          url: apiConfig.url,
          method: apiConfig.method,
          authType: apiConfig.authType,
          authKey: apiConfig.authKey || '',
          autoFetchEnabled: apiConfig.autoFetchEnabled,
          fetchInterval: apiConfig.fetchInterval,
          params: apiConfig.params || '',
          headers: apiConfig.headers || ''
        });
      }
    }
    
    setShowApiModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭API模态框
  const closeApiModal = () => {
    setShowApiModal(false);
    document.body.style.overflow = 'auto';
  };

  // 保存API配置
  const handleSaveApi = () => {
    if (isEditingApi && currentApiId) {
      setApiConfigs(prev => prev.map(api => 
        api.id === currentApiId 
          ? {
              ...api,
              name: apiFormData.name,
              type: apiFormData.type as 'fetch' | 'dispatch',
              url: apiFormData.url,
              method: apiFormData.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
              authType: apiFormData.authType as 'none' | 'api-key' | 'bearer' | 'basic',
              authKey: apiFormData.authKey,
              autoFetchEnabled: apiFormData.autoFetchEnabled,
              fetchInterval: apiFormData.fetchInterval,
              params: apiFormData.params,
              headers: apiFormData.headers
            }
          : api
      ));
    } else {
      const newApi: ApiConfig = {
        id: Date.now().toString(),
        name: apiFormData.name,
        type: apiFormData.type as 'fetch' | 'dispatch',
        url: apiFormData.url,
        method: apiFormData.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        authType: apiFormData.authType as 'none' | 'api-key' | 'bearer' | 'basic',
        authKey: apiFormData.authKey,
        autoFetchEnabled: apiFormData.autoFetchEnabled,
        fetchInterval: apiFormData.fetchInterval,
        params: apiFormData.params,
        headers: apiFormData.headers
      };
      setApiConfigs(prev => [...prev, newApi]);
    }
    
    console.log('保存API配置:', apiFormData);
    alert('API配置已保存！');
    closeApiModal();
  };

  // 删除API配置
  const handleDeleteApi = (apiId: string) => {
    if (confirm('确定要删除这个API配置吗？')) {
      setApiConfigs(prev => prev.filter(api => api.id !== apiId));
    }
  };

  // 打开Hook模态框
  const openHookModal = (mode: 'add' | 'edit', hookId?: string) => {
    setIsEditingHook(mode === 'edit');
    setCurrentHookId(hookId || null);
    
    if (mode === 'add') {
      setHookFormData({
        name: '',
        type: '',
        url: '',
        method: 'POST',
        trigger: 'always',
        enabled: true,
        params: '',
        headers: ''
      });
    } else if (hookId) {
      const hookConfig = hookConfigs.find(hook => hook.id === hookId);
      if (hookConfig) {
        setHookFormData({
          name: hookConfig.name,
          type: hookConfig.type,
          url: hookConfig.url,
          method: hookConfig.method,
          trigger: hookConfig.trigger,
          enabled: hookConfig.enabled,
          params: hookConfig.params || '',
          headers: hookConfig.headers || ''
        });
      }
    }
    
    setShowHookModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭Hook模态框
  const closeHookModal = () => {
    setShowHookModal(false);
    document.body.style.overflow = 'auto';
  };

  // 保存Hook配置
  const handleSaveHook = () => {
    if (isEditingHook && currentHookId) {
      setHookConfigs(prev => prev.map(hook => 
        hook.id === currentHookId 
          ? {
              ...hook,
              name: hookFormData.name,
              type: hookFormData.type as 'start' | 'stop',
              url: hookFormData.url,
              method: hookFormData.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
              trigger: hookFormData.trigger as 'always' | 'success' | 'failure',
              enabled: hookFormData.enabled,
              params: hookFormData.params,
              headers: hookFormData.headers
            }
          : hook
      ));
    } else {
      const newHook: HookConfig = {
        id: Date.now().toString(),
        name: hookFormData.name,
        type: hookFormData.type as 'start' | 'stop',
        url: hookFormData.url,
        method: hookFormData.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
        trigger: hookFormData.trigger as 'always' | 'success' | 'failure',
        enabled: hookFormData.enabled,
        params: hookFormData.params,
        headers: hookFormData.headers,
        lastExecution: '从未执行'
      };
      setHookConfigs(prev => [...prev, newHook]);
    }
    
    console.log('保存Hook配置:', hookFormData);
    alert('Hook配置已保存！');
    closeHookModal();
  };

  // 删除Hook配置
  const handleDeleteHook = (hookId: string) => {
    if (confirm('确定要删除这个Hook配置吗？')) {
      setHookConfigs(prev => prev.filter(hook => hook.id !== hookId));
    }
  };

  // 处理API表单变化
  const handleApiFormChange = (field: string, value: string | boolean) => {
    setApiFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理Hook表单变化
  const handleHookFormChange = (field: string, value: string | boolean) => {
    setHookFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 阻止模态框内容点击事件冒泡
  const handleModalContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // ESC键关闭模态框
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeApiModal();
        closeHookModal();
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
              <Link to={`/wks-detail?workspaceId=${workspaceId}`} className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
                <i className="fas fa-tasks w-5"></i>
                <span>项目Alpha</span>
              </Link>
              <div className={`${styles.sidebarItem} ${styles.sidebarItemActive} flex items-center space-x-3 px-4 py-3 rounded-button transition-all`}>
                <i className="fas fa-cog w-5"></i>
                <span>工作区设置</span>
              </div>
              <Link to={`/queue-manage?workspaceId=${workspaceId}`} className={`${styles.sidebarItem} flex items-center space-x-3 px-4 py-3 rounded-button text-textSecondary transition-all`}>
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
              <Link to={`/wks-detail?workspaceId=${workspaceId}`} className="hover:text-primary transition-colors">项目Alpha</Link>
              <i className="fas fa-chevron-right text-xs"></i>
              <span className="text-textPrimary">工作区设置</span>
            </nav>

            {/* 标题 */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-textPrimary mb-2">{`工作区设置：${workspaceData.name}`}</h1>
                <p className="text-sm text-textSecondary">配置工作区的基本信息、API集成和Hooks设置</p>
              </div>
            </div>
          </div>

          {/* 设置内容 */}
          <div className="space-y-6">
            {/* 基本信息设置 */}
            <div className={`${styles.settingSection} bg-surface rounded-card shadow-card p-6`}>
              <h2 className="text-lg font-semibold text-textPrimary mb-4 flex items-center">
                <i className="fas fa-info-circle text-primary mr-2"></i>
                基本信息
              </h2>
              
              <form className="space-y-4">
                {/* 工作区名称 */}
                <div className="space-y-2">
                  <label htmlFor="workspace-name" className="block text-sm font-medium text-textPrimary">工作区名称 *</label>
                  <input 
                    type="text" 
                    id="workspace-name" 
                    value={workspaceData.name}
                    onChange={(e) => handleWorkspaceDataChange('name', e.target.value)}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all`}
                    required
                  />
                </div>

                {/* 项目描述 */}
                <div className="space-y-2">
                  <label htmlFor="workspace-description" className="block text-sm font-medium text-textPrimary">项目描述</label>
                  <textarea 
                    id="workspace-description" 
                    rows={3}
                    value={workspaceData.description}
                    onChange={(e) => handleWorkspaceDataChange('description', e.target.value)}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all resize-none`}
                    placeholder="输入项目的详细描述..."
                  />
                </div>

                {/* 项目目标 */}
                <div className="space-y-2">
                  <label htmlFor="workspace-goal" className="block text-sm font-medium text-textPrimary">项目目标 *</label>
                  <textarea 
                    id="workspace-goal" 
                    rows={2}
                    value={workspaceData.goal}
                    onChange={(e) => handleWorkspaceDataChange('goal', e.target.value)}
                    className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} transition-all resize-none`}
                    placeholder="描述项目的主要目标和预期成果..."
                    required
                  />
                </div>
              </form>
            </div>

            {/* API配置设置 */}
            <div className={`${styles.settingSection} bg-surface rounded-card shadow-card p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-textPrimary flex items-center">
                  <i className="fas fa-plug text-primary mr-2"></i>
                  API配置
                </h2>
                <button 
                  onClick={() => openApiModal('add')}
                  className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-plus"></i>
                  <span>新增API</span>
                </button>
              </div>

              {/* API配置列表 */}
              <div className="space-y-4">
                {apiConfigs.map((api) => (
                  <div key={api.id} className="p-4 border border-border rounded-button space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <i className={`fas ${api.type === 'fetch' ? 'fa-code-branch' : 'fa-paper-plane'} text-primary`}></i>
                        <div>
                          <h3 className="font-medium text-textPrimary">{api.name}</h3>
                          <p className="text-sm text-textSecondary">{`类型：${api.type === 'fetch' ? '获取任务' : '下发任务'} | 状态：已启用`}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openApiModal('edit', api.id)}
                          className={`${styles.btnSecondary} px-3 py-1.5 rounded-button text-xs font-medium`}
                        >
                          编辑
                        </button>
                        <button 
                          onClick={() => handleDeleteApi(api.id)}
                          className={`${styles.btnDanger} px-3 py-1.5 rounded-button text-xs font-medium`}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-textSecondary">URL:</span>
                        <span className="text-textPrimary ml-2">{api.url}</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">方法:</span>
                        <span className="text-textPrimary ml-2">{api.method}</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">认证:</span>
                        <span className="text-textPrimary ml-2">{api.authType === 'none' ? '无' : api.authType === 'api-key' ? 'API Key' : api.authType === 'bearer' ? 'Bearer Token' : 'Basic Auth'}</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">自动获取:</span>
                        <span className={`${api.autoFetchEnabled ? 'text-success' : 'text-textSecondary'} ml-2`}>
                          {api.autoFetchEnabled ? `已启用 (${api.fetchInterval === '0 * * * *' ? '每小时' : api.fetchInterval === '*/30 * * * *' ? '每30分钟' : '自定义'})` : '已禁用'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hooks配置设置 */}
            <div className={`${styles.settingSection} bg-surface rounded-card shadow-card p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-textPrimary flex items-center">
                  <i className="fas fa-link text-primary mr-2"></i>
                  Hooks配置
                </h2>
                <button 
                  onClick={() => openHookModal('add')}
                  className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-plus"></i>
                  <span>新增Hook</span>
                </button>
              </div>

              {/* Hooks配置列表 */}
              <div className="space-y-4">
                {hookConfigs.map((hook) => (
                  <div key={hook.id} className="p-4 border border-border rounded-button space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <i className={`fas ${hook.type === 'start' ? 'fa-play-circle text-success' : 'fa-stop-circle text-info'}`}></i>
                        <div>
                          <h3 className="font-medium text-textPrimary">{hook.name}</h3>
                          <p className="text-sm text-textSecondary">{`类型：${hook.type === 'start' ? 'Start Hook' : 'Stop Hook'} | 状态：已启用`}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => openHookModal('edit', hook.id)}
                          className={`${styles.btnSecondary} px-3 py-1.5 rounded-button text-xs font-medium`}
                        >
                          编辑
                        </button>
                        <button 
                          onClick={() => handleDeleteHook(hook.id)}
                          className={`${styles.btnDanger} px-3 py-1.5 rounded-button text-xs font-medium`}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-textSecondary">URL:</span>
                        <span className="text-textPrimary ml-2">{hook.url}</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">方法:</span>
                        <span className="text-textPrimary ml-2">{hook.method}</span>
                      </div>
                      <div>
                        <span className="text-textSecondary">触发条件:</span>
                        <span className="text-textPrimary ml-2">
                          {hook.trigger === 'always' ? '总是触发' : hook.trigger === 'success' ? '仅成功时' : '仅失败时'}
                        </span>
                      </div>
                      <div>
                        <span className="text-textSecondary">最近执行:</span>
                        <span className="text-textPrimary ml-2">{hook.lastExecution || '从未执行'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 底部操作按钮 */}
          <div className="mt-8 flex items-center justify-end space-x-4">
            <button 
              onClick={handleCancel}
              className={`${styles.btnSecondary} px-6 py-2.5 rounded-button text-sm font-medium`}
            >
              取消
            </button>
            <button 
              onClick={handleSaveSettings}
              className={`${styles.btnPrimary} px-6 py-2.5 rounded-button text-sm font-medium flex items-center space-x-2`}
            >
              <i className="fas fa-save"></i>
              <span>保存设置</span>
            </button>
          </div>
        </main>
      </div>

      {/* API配置模态框 */}
      {showApiModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeApiModal}></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className={`${styles.modalContent} bg-surface rounded-card w-full max-w-2xl max-h-[90vh] overflow-y-auto`} onClick={handleModalContentClick}>
              {/* 模态框头部 */}
              <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-textPrimary">
                  {isEditingApi ? '编辑API配置' : '新增API配置'}
                </h3>
                <button onClick={closeApiModal} className="p-2 hover:bg-tertiary rounded-button transition-colors">
                  <i className="fas fa-times text-textSecondary"></i>
                </button>
              </div>

              {/* 模态框内容 */}
              <div className="p-6">
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="api-name" className="block text-sm font-medium text-textPrimary">API名称 *</label>
                      <input 
                        type="text" 
                        id="api-name" 
                        value={apiFormData.name}
                        onChange={(e) => handleApiFormChange('name', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        placeholder="输入API名称"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="api-type" className="block text-sm font-medium text-textPrimary">API类型 *</label>
                      <select 
                        id="api-type" 
                        value={apiFormData.type}
                        onChange={(e) => handleApiFormChange('type', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        required
                      >
                        <option value="">选择类型</option>
                        <option value="fetch">获取任务</option>
                        <option value="dispatch">下发任务</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="api-url" className="block text-sm font-medium text-textPrimary">API URL *</label>
                    <input 
                      type="url" 
                      id="api-url" 
                      value={apiFormData.url}
                      onChange={(e) => handleApiFormChange('url', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      placeholder="https://api.example.com/tasks"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="api-method" className="block text-sm font-medium text-textPrimary">请求方法 *</label>
                      <select 
                        id="api-method" 
                        value={apiFormData.method}
                        onChange={(e) => handleApiFormChange('method', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        required
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="api-auth-type" className="block text-sm font-medium text-textPrimary">认证类型</label>
                      <select 
                        id="api-auth-type" 
                        value={apiFormData.authType}
                        onChange={(e) => handleApiFormChange('authType', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      >
                        <option value="none">无认证</option>
                        <option value="api-key">API Key</option>
                        <option value="bearer">Bearer Token</option>
                        <option value="basic">Basic Auth</option>
                      </select>
                    </div>
                  </div>

                  {apiFormData.authType !== 'none' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="api-auth-key" className="block text-sm font-medium text-textPrimary">认证密钥 *</label>
                        <input 
                          type="text" 
                          id="api-auth-key" 
                          value={apiFormData.authKey}
                          onChange={(e) => handleApiFormChange('authKey', e.target.value)}
                          className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                          placeholder="输入认证密钥"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="api-params" className="block text-sm font-medium text-textPrimary">请求参数 (JSON)</label>
                    <textarea 
                      id="api-params" 
                      rows={4}
                      value={apiFormData.params}
                      onChange={(e) => handleApiFormChange('params', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                      placeholder='{"key1": "value1", "key2": "value2"}'
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="api-headers" className="block text-sm font-medium text-textPrimary">请求头 (JSON)</label>
                    <textarea 
                      id="api-headers" 
                      rows={3}
                      value={apiFormData.headers}
                      onChange={(e) => handleApiFormChange('headers', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                      placeholder='{"Content-Type": "application/json"}'
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={apiFormData.autoFetchEnabled}
                        onChange={(e) => handleApiFormChange('autoFetchEnabled', e.target.checked)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm font-medium text-textPrimary">启用自动获取</span>
                    </label>
                  </div>

                  {apiFormData.autoFetchEnabled && (
                    <div className="space-y-2">
                      <label htmlFor="fetch-interval" className="block text-sm font-medium text-textPrimary">自动获取频率</label>
                      <select 
                        id="fetch-interval" 
                        value={apiFormData.fetchInterval}
                        onChange={(e) => handleApiFormChange('fetchInterval', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      >
                        <option value="*/5 * * * *">每5分钟</option>
                        <option value="*/15 * * * *">每15分钟</option>
                        <option value="*/30 * * * *">每30分钟</option>
                        <option value="0 * * * *">每小时</option>
                        <option value="0 */2 * * *">每2小时</option>
                        <option value="0 0 * * *">每天</option>
                      </select>
                    </div>
                  )}
                </form>
              </div>

              {/* 模态框底部 */}
              <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex items-center justify-end space-x-3">
                <button onClick={closeApiModal} className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium`}>
                  取消
                </button>
                <button onClick={handleSaveApi} className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hook配置模态框 */}
      {showHookModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeHookModal}></div>
          <div className="relative flex items-center justify-center min-h-screen p-4">
            <div className={`${styles.modalContent} bg-surface rounded-card w-full max-w-2xl max-h-[90vh] overflow-y-auto`} onClick={handleModalContentClick}>
              {/* 模态框头部 */}
              <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-textPrimary">
                  {isEditingHook ? '编辑Hook配置' : '新增Hook配置'}
                </h3>
                <button onClick={closeHookModal} className="p-2 hover:bg-tertiary rounded-button transition-colors">
                  <i className="fas fa-times text-textSecondary"></i>
                </button>
              </div>

              {/* 模态框内容 */}
              <div className="p-6">
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="hook-name" className="block text-sm font-medium text-textPrimary">Hook名称 *</label>
                      <input 
                        type="text" 
                        id="hook-name" 
                        value={hookFormData.name}
                        onChange={(e) => handleHookFormChange('name', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        placeholder="输入Hook名称"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hook-type" className="block text-sm font-medium text-textPrimary">Hook类型 *</label>
                      <select 
                        id="hook-type" 
                        value={hookFormData.type}
                        onChange={(e) => handleHookFormChange('type', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        required
                      >
                        <option value="">选择类型</option>
                        <option value="start">Start Hook</option>
                        <option value="stop">Stop Hook</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hook-url" className="block text-sm font-medium text-textPrimary">Hook URL *</label>
                    <input 
                      type="url" 
                      id="hook-url" 
                      value={hookFormData.url}
                      onChange={(e) => handleHookFormChange('url', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      placeholder="https://hooks.example.com/endpoint"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="hook-method" className="block text-sm font-medium text-textPrimary">请求方法 *</label>
                      <select 
                        id="hook-method" 
                        value={hookFormData.method}
                        onChange={(e) => handleHookFormChange('method', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                        required
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="hook-trigger" className="block text-sm font-medium text-textPrimary">触发条件</label>
                      <select 
                        id="hook-trigger" 
                        value={hookFormData.trigger}
                        onChange={(e) => handleHookFormChange('trigger', e.target.value)}
                        className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      >
                        <option value="always">总是触发</option>
                        <option value="success">仅成功时</option>
                        <option value="failure">仅失败时</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hook-params" className="block text-sm font-medium text-textPrimary">请求参数 (JSON)</label>
                    <textarea 
                      id="hook-params" 
                      rows={4}
                      value={hookFormData.params}
                      onChange={(e) => handleHookFormChange('params', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                      placeholder='{"task_id": "{{task.id}}", "status": "{{task.status}}"}'
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="hook-headers" className="block text-sm font-medium text-textPrimary">请求头 (JSON)</label>
                    <textarea 
                      id="hook-headers" 
                      rows={3}
                      value={hookFormData.headers}
                      onChange={(e) => handleHookFormChange('headers', e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none font-mono text-xs`}
                      placeholder='{"Content-Type": "application/json"}'
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={hookFormData.enabled}
                        onChange={(e) => handleHookFormChange('enabled', e.target.checked)}
                        className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                      />
                      <span className="ml-2 text-sm font-medium text-textPrimary">启用Hook</span>
                    </label>
                  </div>
                </form>
              </div>

              {/* 模态框底部 */}
              <div className="sticky bottom-0 bg-surface border-t border-border px-6 py-4 flex items-center justify-end space-x-3">
                <button onClick={closeHookModal} className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium`}>
                  取消
                </button>
                <button onClick={handleSaveHook} className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettingsPage;

