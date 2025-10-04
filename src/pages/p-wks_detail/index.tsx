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
  generateTasks,
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskListParams
} from '../../services/taskService';
import { createQueue, CreateQueueInput } from '../../services/queueService';
import ProgressBar from '../../components/ProgressBar';
import axios from 'axios';
import { API_BASE_URL } from '../../services/api';

interface ExecutionLog {
  id: string;
  task_id: string;
  execution_number: number;
  response_type: string;
  response_content: string;
  status: string;
  created_at: string;
  updated_at: string;
  thread_id?: string;
  thread_number?: number;
}

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
  const [taskProgress, setTaskProgress] = useState<Record<string, number>>({});

  // UI状态
  const [showTaskDrawer, setShowTaskDrawer] = useState<boolean>(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState<boolean>(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);
  const [showDispatchConfirmModal, setShowDispatchConfirmModal] = useState<boolean>(false);
  const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState<boolean>(false);
  const [showGenerateTaskModal, setShowGenerateTaskModal] = useState<boolean>(false);
  const [showAddToQueueModal, setShowAddToQueueModal] = useState<boolean>(false);
  const [deleteTaskName, setDeleteTaskName] = useState<string>('');
  const [dispatchTaskName, setDispatchTaskName] = useState<string>('');
  const [dispatchTaskId, setDispatchTaskId] = useState<string>('');
  const [isRetryDispatch, setIsRetryDispatch] = useState<boolean>(false);
  const [queueName, setQueueName] = useState<string>('');

  // 生成任务相关状态
  const [generateTaskDescription, setGenerateTaskDescription] = useState<string>('');
  const [generatedTasks, setGeneratedTasks] = useState<TaskCreateInput[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showGeneratedTasksConfirm, setShowGeneratedTasksConfirm] = useState<boolean>(false);

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

  // 执行日志相关状态
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);
  const [showExecutionLogModal, setShowExecutionLogModal] = useState<boolean>(false);

  // IDE模式展开状态
  const [showIDEMode, setShowIDEMode] = useState<boolean>(false);
  const [activeLeftTab, setActiveLeftTab] = useState<'files' | 'diff'>('files');
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [taskDiff, setTaskDiff] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threadNumber, setThreadNumber] = useState<number>(1);
  const [currentExecutionNumber, setCurrentExecutionNumber] = useState<number | null>(null);

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

  // 订阅进行中任务的SSE流，实时更新进度
  useEffect(() => {
    const eventSources: EventSource[] = [];

    // 找到所有进行中的任务
    const progressTasks = tasks.filter(task => task.status === 'progress');

    // 为每个进行中的任务订阅SSE流
    progressTasks.forEach(task => {
      const eventSource = new EventSource(`${API_BASE_URL}/tasks/${task.id}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // 如果消息包含进度信息，更新进度状态
          if (message.progress !== undefined) {
            setTaskProgress(prev => ({
              ...prev,
              [task.id]: message.progress
            }));
          }

          // 如果任务结束（ResultMessage），刷新任务列表并关闭连接
          if (message.type === 'ResultMessage') {
            eventSource.close();
            fetchTasks();
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        eventSource.close();
      };

      eventSources.push(eventSource);
    });

    // 清理函数：关闭所有EventSource连接
    return () => {
      eventSources.forEach(es => es.close());
    };
  }, [tasks]);

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
      console.error('加载执行日志失败:', error);
      setExecutionLogs([]);
    }
  };

  // 加载workspace文件列表
  const loadWorkspaceFiles = async () => {
    try {
      const response = await axios.get(`http://localhost:10101/api/workspaces/${currentWorkspaceId}/files`);
      if (response.data.code === 200) {
        setWorkspaceFiles(response.data.data || []);
      }
    } catch (error) {
      console.error('加载文件列表失败:', error);
      setWorkspaceFiles([]);
    }
  };

  // 加载task diff
  const loadTaskDiff = async (taskId: string) => {
    try {
      const response = await axios.get(`http://localhost:10101/api/tasks/${taskId}/diff`);
      if (response.data.code === 200) {
        setTaskDiff(response.data.data || '');
      }
    } catch (error) {
      console.error('加载diff失败:', error);
      setTaskDiff('');
    }
  };

  // 打开IDE模式
  const handleOpenIDEMode = async () => {
    if (!currentTaskId) return;
    setShowIDEMode(true);
    // 加载数据
    await loadWorkspaceFiles();
    await loadTaskDiff(currentTaskId);
    await loadExecutionLogs(currentTaskId);
  };

  // 发送聊天消息（流式）
  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentTaskId || isSending) return;

    // 如果是新对话（聊天消息为空）或thread_id不存在，生成新的thread id
    let threadId = currentThreadId;
    if (chatMessages.length === 0 || !threadId) {
      threadId = `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentThreadId(threadId);
    }

    const userMessage = { role: 'user', content: chatInput, threadId, threadNumber };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsSending(true);

    // 添加一个空的assistant消息，用于流式更新
    const assistantMessageIndex = chatMessages.length + 1;
    setChatMessages(prev => [...prev, { role: 'assistant', content: '', threadId, threadNumber }]);

    try {
      const response = await fetch(`http://localhost:10101/api/tasks/${currentTaskId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...chatMessages, userMessage],
          thread_id: threadId,
          thread_number: threadNumber,
          ...(currentExecutionNumber !== null && { execution_number: currentExecutionNumber })
        })
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                accumulatedText += data.text;
                setChatMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[assistantMessageIndex] = {
                    role: 'assistant',
                    content: accumulatedText
                  };
                  return newMessages;
                });
              } else if (data.done) {
                // 对话完成，递增thread number并刷新执行历史
                setThreadNumber(prev => prev + 1);
                if (currentTaskId) {
                  await loadExecutionLogs(currentTaskId);
                }
                break;
              } else if (data.error) {
                showErrorMessage(`对话错误: ${data.error}`);
                break;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      showErrorMessage('发送消息失败');
    } finally {
      setIsSending(false);
    }
  };

  // 从执行历史apply对话
  const applyExecutionLog = (log: ExecutionLog) => {
    try {
      // 解析response_content
      const messages = JSON.parse(log.response_content);
      if (!Array.isArray(messages)) {
        setChatMessages([{ role: 'assistant', content: log.response_content }]);
        return;
      }

      // 提取UserMessage和AssistantMessage的文本内容
      const chatHistory: any[] = [];
      messages.forEach((msg: any) => {
        if (msg.type === 'UserMessage' && msg.text) {
          chatHistory.push({
            role: 'user',
            content: msg.text
          });
        } else if (msg.type === 'AssistantMessage' && msg.text) {
          chatHistory.push({
            role: 'assistant',
            content: msg.text
          });
        }
      });

      if (chatHistory.length > 0) {
        setChatMessages(chatHistory);
        // 设置thread信息，以便后续对话在同一thread中继续
        if (log.thread_id) {
          setCurrentThreadId(log.thread_id);
        }
        if (log.thread_number !== null && log.thread_number !== undefined) {
          setThreadNumber(log.thread_number);
        }
        // 设置当前执行记录号，以便后续对话更新该记录而非创建新记录
        if (log.execution_number !== null && log.execution_number !== undefined) {
          setCurrentExecutionNumber(log.execution_number);
        }
      } else {
        // 如果没有提取到消息，使用原始内容
        setChatMessages([{ role: 'assistant', content: log.response_content }]);
      }
    } catch (e) {
      // 解析失败，直接作为文本添加
      setChatMessages([{ role: 'assistant', content: log.response_content }]);
    }
  };

  // 开始新对话
  const startNewThread = () => {
    setChatMessages([]);
    setCurrentThreadId(null);
    setThreadNumber(prev => prev + 1);
    setCurrentExecutionNumber(null);
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
    setExecutionLogs([]);
    setSelectedLog(null);
    setShowExecutionLogModal(false);
  };

  // 打开执行日志详情模态框
  const openExecutionLogModal = (log: ExecutionLog) => {
    setSelectedLog(log);
    setShowExecutionLogModal(true);
  };

  // 关闭执行日志详情模态框
  const closeExecutionLogModal = () => {
    setShowExecutionLogModal(false);
    setSelectedLog(null);
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

  // 打开生成任务模态框
  const openGenerateTaskModal = () => {
    setGenerateTaskDescription('');
    setGeneratedTasks([]);
    setShowGeneratedTasksConfirm(false);
    setShowGenerateTaskModal(true);
    document.body.style.overflow = 'hidden';
  };

  // 关闭生成任务模态框
  const closeGenerateTaskModal = () => {
    setShowGenerateTaskModal(false);
    document.body.style.overflow = 'auto';
  };

  // 提交生成任务
  const submitGenerateTask = async () => {
    if (!generateTaskDescription.trim()) {
      showErrorMessage('请输入任务描述');
      return;
    }

    try {
      setIsGenerating(true);
      const tasks = await generateTasks(currentWorkspaceId, generateTaskDescription);
      setGeneratedTasks(tasks);
      setShowGeneratedTasksConfirm(true);
      showSuccessMessage(`成功生成 ${tasks.length} 个任务`);
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      showErrorMessage('生成任务失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 确认创建生成的任务
  const confirmCreateGeneratedTasks = async () => {
    try {
      // 批量创建任务
      await Promise.all(
        generatedTasks.map(task => createTask(currentWorkspaceId, task))
      );
      await fetchTasks();
      closeGenerateTaskModal();
      showSuccessMessage(`成功创建 ${generatedTasks.length} 个任务`);
    } catch (error) {
      console.error('Failed to create tasks:', error);
      showErrorMessage('创建任务失败');
    }
  };

  // 添加到队列
  const handleAddToQueue = async () => {
    if (!queueName.trim()) {
      showErrorMessage('请输入队列名称');
      return;
    }

    if (selectedTaskIds.length === 0) {
      showErrorMessage('请先选择要添加的任务');
      return;
    }

    try {
      const queueData: CreateQueueInput = {
        name: queueName,
        task_ids: selectedTaskIds
      };
      await createQueue(currentWorkspaceId, queueData);
      setShowAddToQueueModal(false);
      setQueueName('');
      setSelectedTaskIds([]);
      showSuccessMessage(`成功创建队列，已添加 ${selectedTaskIds.length} 个任务`);
    } catch (error) {
      console.error('Failed to create queue:', error);
      showErrorMessage('创建队列失败');
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
        closeGenerateTaskModal();
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
                  <span>刷新</span>
                </button>
                <button
                  onClick={openGenerateTaskModal}
                  className={`${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium flex items-center space-x-2`}
                >
                  <i className="fas fa-magic"></i>
                  <span>一键生成任务</span>
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
                  onClick={() => setShowAddToQueueModal(true)}
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
                              <div className="flex flex-col gap-2">
                                <span className={`${styles[`status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`]} px-3 py-1 rounded-full text-xs font-medium`}>
                                  {getStatusText(task.status)}
                                </span>
                                {task.status === 'progress' && (
                                  <ProgressBar
                                    progress={taskProgress[task.id] || 0}
                                    showText={true}
                                    height="12px"
                                  />
                                )}
                              </div>
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
              <div className="flex items-center space-x-2">
                {/* 展开按钮 - 只对非待执行状态的任务显示 */}
                {taskDrawerData && taskDrawerData.status !== 'pending' && (
                  <button
                    onClick={handleOpenIDEMode}
                    className="p-2 hover:bg-tertiary rounded-button transition-colors border-2 border-pink-300"
                    title="展开IDE模式"
                  >
                    <i className="fas fa-expand text-textSecondary"></i>
                  </button>
                )}
                <button onClick={closeTaskDrawer} className="p-2 hover:bg-tertiary rounded-button transition-colors">
                  <i className="fas fa-times text-textSecondary"></i>
                </button>
              </div>
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
              <div className="space-y-4 border-2 border-pink-300 rounded-lg p-4">
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

      {/* Add to Queue Modal */}
      {showAddToQueueModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={() => setShowAddToQueueModal(false)}></div>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">添加到队列</h3>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-textPrimary">队列名称 *</label>
                <input
                  type="text"
                  value={queueName}
                  onChange={(e) => setQueueName(e.target.value)}
                  className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                  placeholder="请输入队列名称"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && queueName.trim()) {
                      handleAddToQueue();
                    }
                  }}
                />
              </div>
              <div className="text-sm text-textSecondary">
                将 {selectedTaskIds.length} 个任务添加到此队列
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
              <button
                onClick={handleAddToQueue}
                className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
              >
                <i className="fas fa-layer-group mr-2"></i>
                确认添加
              </button>
              <button
                onClick={() => {
                  setShowAddToQueueModal(false);
                  setQueueName('');
                }}
                className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Tasks Modal */}
      {showGenerateTaskModal && (
        <div className="fixed inset-0 z-50">
          <div className={styles.modalOverlay} onClick={closeGenerateTaskModal}></div>
          <div className={`${styles.modalContent} ${showGeneratedTasksConfirm ? 'max-w-4xl' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-textPrimary">一键生成任务</h3>
            </div>

            {!showGeneratedTasksConfirm ? (
              <>
                <div className="px-6 py-4 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-textPrimary">任务描述 *</label>
                    <textarea
                      rows={6}
                      value={generateTaskDescription}
                      onChange={(e) => setGenerateTaskDescription(e.target.value)}
                      className={`w-full px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus} resize-none`}
                      placeholder="请描述您想要完成的任务，AI将帮您自动分解为多个子任务..."
                      disabled={isGenerating}
                    />
                  </div>
                  <div className="bg-tertiary rounded-lg p-3">
                    <p className="text-xs text-textSecondary">
                      <i className="fas fa-info-circle mr-1"></i>
                      提示：描述越详细，生成的任务越准确。例如："实现用户登录功能，包括表单验证、API调用和错误处理"
                    </p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
                  <button
                    onClick={submitGenerateTask}
                    disabled={isGenerating}
                    className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isGenerating ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        生成中...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-magic mr-2"></i>
                        生成任务
                      </>
                    )}
                  </button>
                  <button
                    onClick={closeGenerateTaskModal}
                    disabled={isGenerating}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium disabled:opacity-50`}
                  >
                    取消
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-textSecondary">已生成 {generatedTasks.length} 个任务，请确认：</p>
                    </div>
                    {generatedTasks.map((task, index) => (
                      <div key={index} className="p-4 bg-tertiary rounded-lg border border-border">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-sm font-medium text-textPrimary">{task.title}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            task.priority === 'high' ? 'bg-danger text-white' :
                            task.priority === 'medium' ? 'bg-warning text-white' :
                            'bg-info text-white'
                          }`}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                        <p className="text-sm text-textSecondary">{task.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-border flex items-center space-x-3">
                  <button
                    onClick={confirmCreateGeneratedTasks}
                    className={`flex-1 ${styles.btnPrimary} px-4 py-2 rounded-button text-sm font-medium`}
                  >
                    <i className="fas fa-check mr-2"></i>
                    确认创建
                  </button>
                  <button
                    onClick={() => setShowGeneratedTasksConfirm(false)}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    重新生成
                  </button>
                  <button
                    onClick={closeGenerateTaskModal}
                    className={`px-4 py-2 ${styles.btnSecondary} rounded-button text-sm font-medium`}
                  >
                    取消
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Execution Log Detail Modal */}
      {showExecutionLogModal && selectedLog && (
        <div className="fixed inset-0 z-[60]">
          <div className={styles.modalOverlay} onClick={closeExecutionLogModal}></div>
          <div className={`${styles.modalContent} max-w-4xl max-h-[80vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface px-6 py-4 border-b border-border z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold text-textPrimary">第 {selectedLog.execution_number} 次执行详情</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    selectedLog.response_type === 'completed' ? 'bg-success text-white' :
                    selectedLog.response_type === 'failed' ? 'bg-danger text-white' :
                    'bg-warning text-white'
                  }`}>
                    {selectedLog.response_type === 'completed' ? '成功' :
                     selectedLog.response_type === 'failed' ? '失败' :
                     selectedLog.response_type}
                  </span>
                </div>
                <button onClick={closeExecutionLogModal} className="p-2 hover:bg-tertiary rounded-button transition-colors">
                  <i className="fas fa-times text-textSecondary"></i>
                </button>
              </div>
              <div className="text-xs text-textSecondary mt-2">{selectedLog.created_at}</div>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {(() => {
                  try {
                    const messages = JSON.parse(selectedLog.response_content);
                    if (!Array.isArray(messages)) {
                      return (
                        <div className="p-3 bg-tertiary rounded-lg">
                          <pre className="text-sm text-textPrimary whitespace-pre-wrap break-words overflow-x-auto">
                            {selectedLog.response_content}
                          </pre>
                        </div>
                      );
                    }

                    return messages.map((msg: any, index: number) => (
                      <div key={index} className="p-3 bg-tertiary rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            msg.type === 'SystemMessage' ? 'bg-gray-100 text-gray-800' :
                            msg.type === 'AssistantMessage' ? 'bg-blue-100 text-blue-800' :
                            msg.type === 'UserMessage' ? 'bg-green-100 text-green-800' :
                            msg.type === 'ResultMessage' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {msg.type}
                          </span>
                          {msg.progress !== undefined && (
                            <span className="text-xs text-textSecondary">进度: {msg.progress}%</span>
                          )}
                        </div>
                        <div className="text-sm text-textPrimary whitespace-pre-wrap break-words">
                          {msg.text || msg.message || msg.content || (msg.type === 'ResultMessage' ? `执行${msg.is_error ? '失败' : '成功'}` : '')}
                        </div>
                      </div>
                    ));
                  } catch {
                    return (
                      <div className="p-3 bg-tertiary rounded-lg">
                        <pre className="text-sm text-textPrimary whitespace-pre-wrap break-words overflow-x-auto">
                          {selectedLog.response_content}
                        </pre>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
            <div className="sticky bottom-0 bg-surface px-6 py-4 border-t border-border">
              <button
                onClick={closeExecutionLogModal}
                className={`w-full ${styles.btnSecondary} px-4 py-2 rounded-button text-sm font-medium`}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IDE Mode - 全屏4区域布局 */}
      {showIDEMode && taskDrawerData && (
        <div className="fixed inset-0 z-[70] bg-background">
          {/* Header */}
          <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-3">
              <i className="fas fa-code text-primary"></i>
              <h2 className="text-lg font-semibold text-textPrimary">{taskDrawerData.title} - IDE模式</h2>
            </div>
            <button
              onClick={() => setShowIDEMode(false)}
              className="p-2 hover:bg-tertiary rounded-button transition-colors"
            >
              <i className="fas fa-times text-textSecondary"></i>
            </button>
          </div>

          {/* 4区域布局 */}
          <div className="h-[calc(100vh-56px)] grid grid-cols-3 gap-1 p-1">
            {/* 左侧区域：任务信息 + 文件列表 */}
            <div className="space-y-1 flex flex-col">
              {/* 左上：任务信息 */}
              <div className="bg-surface rounded-lg border border-border overflow-auto flex-shrink-0" style={{maxHeight: '40%'}}>
              <div className="p-4 border-b border-border">
                <h3 className="text-sm font-medium text-textSecondary uppercase">任务信息</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-textSecondary">任务名称</label>
                  <p className="text-sm text-textPrimary mt-1">{taskDrawerData.title}</p>
                </div>
                <div>
                  <label className="text-xs text-textSecondary">任务描述</label>
                  <p className="text-sm text-textPrimary mt-1">{taskDrawerData.description}</p>
                </div>
                <div className="flex space-x-4">
                  <div>
                    <label className="text-xs text-textSecondary">优先级</label>
                    <p className="text-sm text-textPrimary mt-1">{taskDrawerData.priority}</p>
                  </div>
                  <div>
                    <label className="text-xs text-textSecondary">状态</label>
                    <p className="text-sm text-textPrimary mt-1">{taskDrawerData.status}</p>
                  </div>
                </div>
              </div>
              </div>

              {/* 左下：文件列表/Diff切换 */}
              <div className="bg-surface rounded-lg border border-border overflow-hidden flex flex-col flex-1">
              <div className="p-2 border-b border-border flex space-x-2">
                <button
                  onClick={() => setActiveLeftTab('files')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    activeLeftTab === 'files' ? 'bg-primary text-white' : 'text-textSecondary hover:bg-tertiary'
                  }`}
                >
                  文件列表
                </button>
                <button
                  onClick={() => setActiveLeftTab('diff')}
                  className={`px-3 py-1.5 rounded text-sm ${
                    activeLeftTab === 'diff' ? 'bg-primary text-white' : 'text-textSecondary hover:bg-tertiary'
                  }`}
                >
                  Diff
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {activeLeftTab === 'files' ? (
                  <div className="space-y-1">
                    {workspaceFiles.length === 0 ? (
                      <p className="text-sm text-textSecondary">暂无文件</p>
                    ) : (
                      workspaceFiles.map((file, idx) => (
                        <div key={idx} className="text-sm text-textPrimary hover:bg-tertiary p-2 rounded cursor-pointer">
                          <i className="fas fa-file-code mr-2 text-textSecondary"></i>
                          {file}
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <pre className="text-xs text-textPrimary whitespace-pre-wrap">
                    {taskDiff || '暂无diff数据'}
                  </pre>
                )}
              </div>
              </div>
            </div>

            {/* 右侧区域：执行历史 + 对话框 */}
            <div className="col-span-2 space-y-1 flex flex-col">
              {/* 右上：执行历史 */}
              <div className="bg-surface rounded-lg border border-border overflow-hidden flex flex-col flex-shrink-0" style={{maxHeight: '40%'}}>
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-sm font-medium text-textSecondary uppercase">执行历史</h3>
                  <button
                    onClick={() => currentTaskId && loadExecutionLogs(currentTaskId)}
                    className="text-xs text-primary hover:underline"
                  >
                    刷新
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {executionLogs.length === 0 ? (
                    <p className="text-sm text-textSecondary text-center py-4">暂无执行记录</p>
                  ) : (
                    <div className="space-y-2">
                      {executionLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-2 bg-tertiary rounded-lg flex items-center justify-between hover:bg-border cursor-pointer transition-colors"
                        >
                          <span onClick={() => openExecutionLogModal(log)} className="text-sm text-textPrimary hover:underline flex-1">
                            第 {log.execution_number} 次执行
                            {log.thread_number && <span className="text-xs text-textSecondary ml-2">(第{log.thread_number}次对话)</span>}
                            · {log.created_at}
                          </span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => applyExecutionLog(log)}
                              className="px-2 py-1 bg-primary text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              Apply
                            </button>
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
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 右下：对话框 */}
              <div className="bg-surface rounded-lg border border-border overflow-hidden flex flex-col flex-1">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-textSecondary uppercase">持续对话</h3>
                    <span className="text-xs text-textSecondary">- 第 {threadNumber} 次对话</span>
                  </div>
                  <button
                    onClick={startNewThread}
                    className="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-blue-600 transition-colors"
                  >
                    新建对话
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-2">
                  {chatMessages.length === 0 ? (
                    <p className="text-sm text-textSecondary">开始对话...</p>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${
                        msg.role === 'user' ? 'bg-primary text-white ml-8' : 'bg-tertiary mr-8'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-border">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="输入消息..."
                      className={`flex-1 px-4 py-2 border border-border rounded-button text-sm ${styles.inputFocus}`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && chatInput.trim() && !isSending) {
                          sendChatMessage();
                        }
                      }}
                      disabled={isSending}
                    />
                    <button
                      onClick={sendChatMessage}
                      disabled={isSending || !chatInput.trim()}
                      className={`${styles.btnPrimary} px-4 py-2 rounded-button text-sm ${isSending || !chatInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSending ? '发送中...' : '发送'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceDetailPage;
