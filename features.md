# Axis - AI Agent Task Management System

## 项目概述

Axis 是一个基于 AI Agent 的智能任务管理系统，集成了 Anthropic Claude 3.5 Sonnet 模型，支持任务的智能生成、执行、队列管理和实时监控。

## 技术栈

### 前端
- **框架**: React 19.1.0 + TypeScript
- **构建工具**: Vite 6.0.11
- **路由**: React Router DOM 7.1.3
- **样式**: CSS Modules
- **图标**: Font Awesome
- **HTTP客户端**: Axios

### 后端
- **框架**: Python 3.12 + FastAPI
- **ORM**: SQLAlchemy
- **数据库**: SQLite
- **AI集成**: Anthropic Claude Agent SDK + Anthropic SDK (Claude 3.5 Sonnet)
- **实时通信**: SSE (Server-Sent Events)

## 核心功能模块

### 1. 工作区管理 (Workspace Management)
- ✅ 创建/编辑/删除工作区
- ✅ 工作区列表展示
- ✅ 工作区切换
- ✅ 工作区统计信息（任务数、消息数）

**关键文件**:
- `src/pages/p-wks_index/index.tsx`
- `src/services/workspaceService.ts`
- `python-backend/app/api/workspaces.py`

### 2. 任务管理 (Task Management)
- ✅ 手动创建任务
- ✅ AI智能生成任务（基于用户描述自动生成完整任务）
- ✅ 任务列表查看（支持分页、状态筛选）
- ✅ 任务详情查看
- ✅ 任务编辑/删除
- ✅ 任务状态跟踪 (pending/progress/completed/failed)
- ✅ 任务优先级管理 (high/medium/low)
- ✅ 批量任务操作

**关键文件**:
- `src/pages/p-wks_detail/index.tsx`
- `src/services/taskService.ts`
- `python-backend/app/api/tasks.py`

### 3. 队列管理 (Queue Management)
- ✅ 创建任务队列
- ✅ 队列任务排序
- ✅ 批量下发队列任务
- ✅ 队列进度跟踪
- ✅ 队列状态管理 (pending/running/completed/failed)
- ✅ 队列详情展示（展开查看所有任务）
- ✅ 队列任务详情查看（右侧抽屉展示）

**关键文件**:
- `src/pages/p-queue_manage/index.tsx`
- `src/services/queueService.ts`
- `python-backend/app/api/queues.py`

### 4. AI任务执行 (AI Task Execution)
- ✅ Claude Agent SDK集成
- ✅ 任务自动执行
- ✅ 实时执行日志流式输出 (SSE)
- ✅ 执行结果保存
- ✅ 错误处理与重试
- ✅ Webhook集成（任务开始/结束通知）

**关键文件**:
- `python-backend/app/api/tasks.py:execute_claude_agent_task_async()`
- `python-backend/app/api/tasks.py:generate_tasks()`

**核心实现**:
```python
# 使用 Claude Agent SDK 执行任务
agent_response = claude_agent_sdk.query(
    message=task_obj.description,
    agent_id=task_obj.agent_id,
    streaming=True,
    on_stream_start=lambda: update_task_status("progress"),
    on_stream_event=lambda msg: save_execution_log(msg),
    on_stream_end=lambda: update_task_status("completed")
)
```

### 5. 实时消息 (Real-time Messaging)
- ✅ 与AI Agent的对话界面
- ✅ 支持流式输出（SSE）
- ✅ 消息历史记录
- ✅ 多轮对话支持
- ✅ 历史对话消息应用到任务

**关键文件**:
- `src/pages/p-message/index.tsx`
- `src/services/messageService.ts`
- `python-backend/app/api/messages.py`

### 6. 执行日志 (Execution Logs)
- ✅ 完整的任务执行日志记录
- ✅ 时间戳记录
- ✅ 日志类型标识（info/error/warning）
- ✅ 日志实时更新
- ✅ 任务详情抽屉中查看执行日志

**关键文件**:
- `python-backend/app/models/execution_log.py`
- `python-backend/app/api/tasks.py`

### 7. Webhook集成 (Webhook Integration)
- ✅ 任务开始/结束Webhook通知
- ✅ 自定义Webhook URL配置
- ✅ Webhook事件日志

**配置文件**:
- `python-backend/app/config.py`

### 8. Dashboard
- ✅ 统计数据展示
- ✅ 工作区概览
- ✅ 任务统计图表
- ✅ 快速操作入口

**关键文件**:
- `src/pages/p-index/index.tsx`

### 9. 通知系统 (Notifications)
- ✅ 通知列表展示
- ✅ 未读通知提醒
- ✅ 通知标记已读

**关键文件**:
- `src/pages/p-notifications/index.tsx`

### 10. UI功能特性
- ✅ 响应式设计
- ✅ 暖色调UI主题（米黄色系）
- ✅ 抽屉式详情展示
- ✅ 确认对话框
- ✅ 加载状态提示
- ✅ 错误提示
- ✅ 工具提示 (Tooltips)
- ✅ 拖拽排序支持

## 核心API端点

### 工作区相关
- `POST /workspaces` - 创建工作区
- `GET /workspaces` - 获取工作区列表
- `GET /workspaces/{id}` - 获取工作区详情
- `PUT /workspaces/{id}` - 更新工作区
- `DELETE /workspaces/{id}` - 删除工作区

### 任务相关
- `POST /tasks/workspaces/{workspace_id}` - 创建任务
- `POST /tasks/workspaces/{workspace_id}/generate` - AI生成任务
- `GET /tasks/workspaces/{workspace_id}` - 获取任务列表
- `GET /tasks/{task_id}` - 获取任务详情
- `PUT /tasks/{task_id}` - 更新任务
- `DELETE /tasks/{task_id}` - 删除任务
- `POST /tasks/{task_id}/dispatch` - 下发任务

### 队列相关
- `POST /queues/workspaces/{workspace_id}` - 创建队列
- `GET /queues/workspaces/{workspace_id}` - 获取队列列表
- `GET /queues/{queue_id}` - 获取队列详情
- `POST /queues/{queue_id}/execute` - 执行队列
- `POST /queues/{queue_id}/tasks` - 向队列添加任务
- `DELETE /queues/{queue_id}` - 删除队列

### 消息相关
- `POST /messages/workspaces/{workspace_id}` - 创建消息
- `GET /messages/workspaces/{workspace_id}` - 获取消息列表
- `POST /messages/workspaces/{workspace_id}/stream` - 流式对话 (SSE)

## 核心亮点功能

### 🤖 AI驱动的任务执行
使用 Claude 3.5 Sonnet 模型通过 Agent SDK 执行复杂任务，支持自然语言描述转换为可执行任务。

### ⚡ 实时流式输出
所有AI任务执行过程通过SSE实时推送执行日志，用户可以实时查看任务执行状态和输出。

### 📋 批量队列处理
支持创建任务队列，一键批量下发执行多个任务，提高任务处理效率。

### 📊 完整的执行追踪
每个任务都有完整的执行日志记录，包括开始时间、结束时间、执行过程、错误信息等。

### 🔗 Webhook集成
支持任务开始和结束时的Webhook回调，便于与其他系统集成。

### 🎯 智能任务生成
通过AI自动生成完整的任务描述和执行计划，大幅减少手动创建任务的工作量。

## 配置说明

### API Key配置
在 `python-backend/.env` 文件中配置：
```
ANTHROPIC_API_KEY=your_api_key_here
```

### Webhook配置
在 `python-backend/app/config.py` 中配置：
```python
WEBHOOK_START_URL = "your_webhook_start_url"
WEBHOOK_STOP_URL = "your_webhook_stop_url"
```

## 开发与部署

### 前端开发
```bash
npm install
npm run dev  # 运行在 http://localhost:10103
```

### 后端开发
```bash
cd python-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 数据库
使用 SQLite 数据库，位于 `python-backend/axis.db`

主要数据表：
- `workspaces` - 工作区
- `tasks` - 任务
- `queues` - 队列
- `queue_tasks` - 队列任务关联
- `messages` - 消息
- `execution_logs` - 执行日志
- `notifications` - 通知

## 项目结构

```
axis/
├── src/                      # 前端源码
│   ├── pages/               # 页面组件
│   │   ├── p-index/        # Dashboard
│   │   ├── p-wks_index/    # 工作区列表
│   │   ├── p-wks_detail/   # 工作区详情（任务管理）
│   │   ├── p-queue_manage/ # 队列管理
│   │   ├── p-message/      # 消息对话
│   │   └── p-notifications/ # 通知
│   ├── services/            # API服务
│   └── App.tsx             # 应用入口
├── python-backend/          # 后端源码
│   ├── app/
│   │   ├── api/            # API路由
│   │   ├── models/         # 数据模型
│   │   ├── config.py       # 配置
│   │   └── main.py         # 应用入口
│   └── axis.db             # SQLite数据库
└── features.md             # 本文档
```
