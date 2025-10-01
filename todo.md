# Axis 后端 API 接口与数据结构设计

## 一、数据库表结构设计（SQLite）

### 1. 工作区表 (workspaces)
```sql
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    project_goal TEXT NOT NULL,
    icon TEXT DEFAULT 'fas fa-folder',
    icon_color TEXT DEFAULT 'bg-primary',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_workspaces_created_at ON workspaces(created_at);
```

### 2. 任务表 (tasks)
```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('high', 'medium', 'low')),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'progress', 'completed', 'failed')),
    source TEXT NOT NULL CHECK(source IN ('api', 'manual')),
    api_task_id TEXT,
    manual_check INTEGER DEFAULT 0,
    queue_status TEXT DEFAULT 'none' CHECK(queue_status IN ('none', 'queue', 'running')),
    api_data TEXT,
    execution_id TEXT,
    dispatch_time TIMESTAMP,
    start_hook_curl TEXT,
    stop_hook_curl TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_source ON tasks(source);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 3. Hooks配置表 (hook_configs)
```sql
CREATE TABLE hook_configs (
    id TEXT PRIMARY KEY,
    workspace_id TEXT,
    task_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('start', 'stop')),
    curl_command TEXT NOT NULL,
    trigger_condition TEXT DEFAULT 'always' CHECK(trigger_condition IN ('always', 'success', 'failure')),
    enabled INTEGER DEFAULT 1,
    last_execution TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX idx_hook_configs_workspace_id ON hook_configs(workspace_id);
CREATE INDEX idx_hook_configs_task_id ON hook_configs(task_id);
CREATE INDEX idx_hook_configs_type ON hook_configs(type);
CREATE INDEX idx_hook_configs_enabled ON hook_configs(enabled);
```

### 4. 任务队列表 (task_queues)
```sql
CREATE TABLE task_queues (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);
CREATE INDEX idx_task_queues_workspace_id ON task_queues(workspace_id);
CREATE INDEX idx_task_queues_status ON task_queues(status);
CREATE INDEX idx_task_queues_created_at ON task_queues(created_at);
```

### 5. 队列任务关联表 (queue_tasks)
```sql
CREATE TABLE queue_tasks (
    id TEXT PRIMARY KEY,
    queue_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'progress', 'completed', 'failed')),
    execution_log TEXT,
    error_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (queue_id) REFERENCES task_queues(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX idx_queue_tasks_queue_id ON queue_tasks(queue_id);
CREATE INDEX idx_queue_tasks_task_id ON queue_tasks(task_id);
CREATE INDEX idx_queue_tasks_order ON queue_tasks(order_index);
```

### 6. 通知表 (notifications)
```sql
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('task-completion', 'task-failure', 'system-alert')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    related_task_id TEXT,
    is_read INTEGER DEFAULT 0,
    action_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL
);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

---

## 二、后端 API 接口清单

### 1. 工作区管理模块

#### 1.1 获取工作区列表
- **接口**: `GET /api/workspaces`
- **描述**: 获取所有工作区列表
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 10
  - `search`: 搜索关键词
  - `sort_by`: 排序字段 (name, created_at)
  - `sort_order`: 排序方向 (asc, desc)
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 18,
    "page": 1,
    "page_size": 10,
    "workspaces": [
      {
        "id": "uuid",
        "name": "项目Alpha",
        "description": "核心功能开发",
        "project_goal": "完成核心功能开发并进行系统测试",
        "icon": "fas fa-code",
        "icon_color": "bg-primary",
        "active_tasks": 8,
        "completed_tasks": 12,
        "created_at": "2024-01-10 14:30:25",
        "updated_at": "2024-01-15 10:20:15"
      }
    ]
  }
}
```

#### 1.2 获取工作区详情
- **接口**: `GET /api/workspaces/{workspace_id}`
- **描述**: 获取指定工作区详情
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "name": "项目Alpha",
    "description": "核心功能开发",
    "project_goal": "完成核心功能开发并进行系统测试",
    "icon": "fas fa-code",
    "icon_color": "bg-primary",
    "task_count": 23,
    "created_at": "2024-01-10 14:30:25",
    "updated_at": "2024-01-15 10:20:15"
  }
}
```

#### 1.3 创建工作区
- **接口**: `POST /api/workspaces`
- **描述**: 创建新工作区
- **请求体**:
```json
{
  "name": "项目Alpha",
  "description": "核心功能开发",
  "project_goal": "完成核心功能开发并进行系统测试"
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "name": "项目Alpha",
    "description": "核心功能开发",
    "project_goal": "完成核心功能开发并进行系统测试",
    "created_at": "2024-01-15 10:30:25"
  }
}
```

#### 1.4 更新工作区
- **接口**: `PUT /api/workspaces/{workspace_id}`
- **描述**: 更新工作区信息
- **请求体**:
```json
{
  "name": "项目Alpha",
  "description": "核心功能开发",
  "project_goal": "完成核心功能开发并进行系统测试"
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "uuid",
    "name": "项目Alpha",
    "updated_at": "2024-01-15 10:35:20"
  }
}
```

#### 1.5 删除工作区
- **接口**: `DELETE /api/workspaces/{workspace_id}`
- **描述**: 删除工作区（级联删除该工作区下所有任务、配置等）
- **响应**:
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

### 2. 任务管理模块

#### 2.1 获取任务列表
- **接口**: `GET /api/workspaces/{workspace_id}/tasks`
- **描述**: 获取指定工作区的任务列表
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 10
  - `search`: 搜索关键词
  - `status`: 状态筛选 (pending, progress, completed, failed)
  - `priority`: 优先级筛选 (high, medium, low)
  - `source`: 来源筛选 (api, manual)
  - `sort_by`: 排序字段 (title, priority, status, created_at)
  - `sort_order`: 排序方向 (asc, desc)
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 23,
    "page": 1,
    "page_size": 10,
    "tasks": [
      {
        "id": "uuid",
        "title": "实现用户认证模块",
        "description": "实现完整的用户认证流程",
        "priority": "high",
        "status": "progress",
        "queue_status": "none",
        "manual_check": false,
        "source": "api",
        "api_task_id": "TASK-001",
        "api_data": {},
        "execution_id": "exec-sys-20240115-001",
        "dispatch_time": "2024-01-15 10:35:12",
        "start_hook": "https://hooks.axis.com/task/start",
        "stop_hook": null,
        "created_at": "2024-01-15 10:30:25",
        "updated_at": "2024-01-15 14:22:18"
      }
    ]
  }
}
```

#### 2.2 获取任务详情
- **接口**: `GET /api/tasks/{task_id}`
- **描述**: 获取任务详情
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "workspace_id": "uuid",
    "workspace_name": "项目Alpha",
    "title": "实现用户认证模块",
    "description": "实现完整的用户认证流程",
    "priority": "high",
    "status": "progress",
    "queue_status": "none",
    "manual_check": false,
    "source": "api",
    "api_task_id": "TASK-001",
    "api_data": {},
    "execution_id": "exec-sys-20240115-001",
    "dispatch_time": "2024-01-15 10:35:12",
    "start_hook": "https://hooks.axis.com/task/start",
    "stop_hook": null,
    "created_at": "2024-01-15 10:30:25",
    "updated_at": "2024-01-15 14:22:18"
  }
}
```

#### 2.3 创建任务
- **接口**: `POST /api/workspaces/{workspace_id}/tasks`
- **描述**: 手动创建任务
- **请求体**:
```json
{
  "title": "实现用户认证模块",
  "description": "实现完整的用户认证流程",
  "priority": "high"
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "title": "实现用户认证模块",
    "status": "pending",
    "created_at": "2024-01-15 10:30:25"
  }
}
```

#### 2.4 更新任务
- **接口**: `PUT /api/tasks/{task_id}`
- **描述**: 更新任务信息
- **请求体**:
```json
{
  "title": "实现用户认证模块",
  "description": "实现完整的用户认证流程",
  "priority": "high",
  "status": "completed",
  "manual_check": true
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "uuid",
    "updated_at": "2024-01-15 10:35:20"
  }
}
```

#### 2.5 删除任务
- **接口**: `DELETE /api/tasks/{task_id}`
- **描述**: 删除任务
- **响应**:
```json
{
  "code": 200,
  "message": "删除成功"
}
```

#### 2.6 批量删除任务
- **接口**: `POST /api/tasks/batch-delete`
- **描述**: 批量删除任务
- **请求体**:
```json
{
  "task_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "删除成功",
  "data": {
    "deleted_count": 3
  }
}
```

#### 2.7 下发任务
- **接口**: `POST /api/tasks/{task_id}/dispatch`
- **描述**: 将任务下发到执行系统
- **请求体**:
```json
{
  "execution_params": {}
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "下发成功",
  "data": {
    "execution_id": "exec-sys-20240115-001",
    "dispatch_time": "2024-01-15 10:35:12",
    "status": "progress"
  }
}
```

#### 2.8 重试任务
- **接口**: `POST /api/tasks/{task_id}/retry`
- **描述**: 重试失败的任务
- **响应**:
```json
{
  "code": 200,
  "message": "重试成功",
  "data": {
    "execution_id": "exec-sys-20240115-002",
    "dispatch_time": "2024-01-15 14:20:10",
    "status": "progress"
  }
}
```

#### 2.9 轮询任务状态
- **接口**: `GET /api/tasks/{task_id}/status`
- **描述**: 查询任务的最新执行状态
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "task_id": "uuid",
    "execution_id": "exec-sys-20240115-001",
    "status": "completed",
    "progress": 100,
    "result": {},
    "error_message": null,
    "updated_at": "2024-01-15 12:15:30"
  }
}
```

---

### 3. Hooks 管理模块

#### 3.1 获取 Hooks 配置列表
- **接口**: `GET /api/workspaces/{workspace_id}/hooks`
- **描述**: 获取工作区的 Hooks 配置列表
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "hooks": [
      {
        "id": "uuid",
        "name": "任务开始通知Hook",
        "type": "start",
        "curl_command": "curl -X POST https://hooks.axis.com/task/start -H 'Content-Type: application/json' -d '{\"task_id\": \"{{task.id}}\"}' ",
        "trigger_condition": "always",
        "enabled": true,
        "last_execution": "2024-01-15 14:30:25",
        "created_at": "2024-01-10 10:00:00"
      }
    ]
  }
}
```

#### 3.2 创建 Hook 配置
- **接口**: `POST /api/workspaces/{workspace_id}/hooks`
- **描述**: 创建新的 Hook 配置
- **请求体**:
```json
{
  "name": "任务开始通知Hook",
  "type": "start",
  "curl_command": "curl -X POST https://hooks.axis.com/task/start -H 'Content-Type: application/json' -d '{\"task_id\": \"{{task.id}}\"}' ",
  "trigger_condition": "always",
  "enabled": true,
  "task_id": "uuid"
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "name": "任务开始通知Hook",
    "created_at": "2024-01-15 10:30:25"
  }
}
```

#### 3.3 更新 Hook 配置
- **接口**: `PUT /api/hooks/{hook_id}`
- **描述**: 更新 Hook 配置
- **请求体**: （同创建）
- **响应**:
```json
{
  "code": 200,
  "message": "更新成功",
  "data": {
    "id": "uuid",
    "updated_at": "2024-01-15 10:35:20"
  }
}
```

#### 3.4 删除 Hook 配置
- **接口**: `DELETE /api/hooks/{hook_id}`
- **描述**: 删除 Hook 配置
- **响应**:
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

### 4. 任务队列管理模块

#### 4.1 获取任务队列列表
- **接口**: `GET /api/workspaces/{workspace_id}/queues`
- **描述**: 获取工作区的任务队列列表
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 10
  - `status`: 状态筛选 (pending, running, completed, failed)
  - `search`: 搜索关键词
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 8,
    "page": 1,
    "page_size": 10,
    "queues": [
      {
        "id": "uuid",
        "name": "API接口开发队列",
        "status": "running",
        "progress": 60,
        "total_tasks": 5,
        "completed_tasks": 3,
        "created_at": "2024-01-15 10:30:25",
        "updated_at": "2024-01-15 14:22:18"
      }
    ]
  }
}
```

#### 4.2 获取队列详情（包含任务列表）
- **接口**: `GET /api/queues/{queue_id}`
- **描述**: 获取队列详情及其包含的任务列表
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "id": "uuid",
    "name": "API接口开发队列",
    "status": "running",
    "progress": 60,
    "total_tasks": 5,
    "completed_tasks": 3,
    "created_at": "2024-01-15 10:30:25",
    "tasks": [
      {
        "id": "uuid",
        "task_id": "uuid",
        "order_index": 1,
        "name": "实现用户认证模块",
        "status": "completed",
        "error_reason": null
      },
      {
        "id": "uuid",
        "task_id": "uuid",
        "order_index": 2,
        "name": "优化数据库查询性能",
        "status": "progress",
        "error_reason": null
      }
    ]
  }
}
```

#### 4.3 创建任务队列
- **接口**: `POST /api/workspaces/{workspace_id}/queues`
- **描述**: 创建新的任务队列
- **请求体**:
```json
{
  "name": "API接口开发队列",
  "task_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "创建成功",
  "data": {
    "id": "uuid",
    "name": "API接口开发队列",
    "total_tasks": 3,
    "created_at": "2024-01-15 10:30:25"
  }
}
```

#### 4.4 批量添加任务到队列
- **接口**: `POST /api/queues/{queue_id}/tasks`
- **描述**: 向队列批量添加任务
- **请求体**:
```json
{
  "task_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "添加成功",
  "data": {
    "added_count": 3
  }
}
```

#### 4.5 调整队列中任务顺序
- **接口**: `PUT /api/queues/{queue_id}/tasks/reorder`
- **描述**: 调整队列中任务的执行顺序
- **请求体**:
```json
{
  "task_orders": [
    {"queue_task_id": "uuid1", "order_index": 1},
    {"queue_task_id": "uuid2", "order_index": 2},
    {"queue_task_id": "uuid3", "order_index": 3}
  ]
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "调整成功"
}
```

#### 4.6 启动队列
- **接口**: `POST /api/queues/{queue_id}/start`
- **描述**: 启动队列执行
- **响应**:
```json
{
  "code": 200,
  "message": "队列已启动",
  "data": {
    "queue_id": "uuid",
    "status": "running"
  }
}
```

#### 4.7 暂停队列
- **接口**: `POST /api/queues/{queue_id}/pause`
- **描述**: 暂停队列执行
- **响应**:
```json
{
  "code": 200,
  "message": "队列已暂停",
  "data": {
    "queue_id": "uuid",
    "status": "pending"
  }
}
```

#### 4.8 删除队列
- **接口**: `DELETE /api/queues/{queue_id}`
- **描述**: 删除队列
- **响应**:
```json
{
  "code": 200,
  "message": "删除成功"
}
```

#### 4.9 重试队列中失败的任务
- **接口**: `POST /api/queues/{queue_id}/tasks/{queue_task_id}/retry`
- **描述**: 重试队列中失败的任务
- **响应**:
```json
{
  "code": 200,
  "message": "重试成功",
  "data": {
    "queue_task_id": "uuid",
    "status": "progress"
  }
}
```

---

### 5. 通知管理模块

#### 5.1 获取通知列表
- **接口**: `GET /api/notifications`
- **描述**: 获取通知列表
- **查询参数**:
  - `page`: 页码，默认 1
  - `page_size`: 每页数量，默认 10
  - `type`: 类型筛选 (task-completion, task-failure, system-alert)
  - `is_read`: 状态筛选 (true, false)
  - `search`: 搜索关键词
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "total": 18,
    "unread_count": 3,
    "page": 1,
    "page_size": 10,
    "notifications": [
      {
        "id": "uuid",
        "type": "task-failure",
        "title": "任务执行失败",
        "content": "单元测试覆盖率提升任务执行失败",
        "related_task_id": "uuid",
        "task_name": "单元测试覆盖率提升",
        "is_read": false,
        "action_data": {"task_id": "uuid", "allow_retry": true},
        "created_at": "2024-01-15 15:30:25"
      }
    ]
  }
}
```

#### 5.2 标记通知为已读
- **接口**: `PUT /api/notifications/{notification_id}/read`
- **描述**: 标记单个通知为已读
- **响应**:
```json
{
  "code": 200,
  "message": "标记成功"
}
```

#### 5.3 批量标记通知为已读
- **接口**: `POST /api/notifications/batch-read`
- **描述**: 批量标记通知为已读
- **请求体**:
```json
{
  "notification_ids": ["uuid1", "uuid2", "uuid3"]
}
```
- **响应**:
```json
{
  "code": 200,
  "message": "标记成功",
  "data": {
    "marked_count": 3
  }
}
```

#### 5.4 全部标记为已读
- **接口**: `POST /api/notifications/read-all`
- **描述**: 将所有未读通知标记为已读
- **响应**:
```json
{
  "code": 200,
  "message": "标记成功",
  "data": {
    "marked_count": 5
  }
}
```

#### 5.5 获取未读通知数量
- **接口**: `GET /api/notifications/unread-count`
- **描述**: 获取未读通知数量
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "unread_count": 3
  }
}
```

---

### 6. 仪表盘数据模块

#### 6.1 获取仪表盘概览数据
- **接口**: `GET /api/dashboard/overview`
- **描述**: 获取仪表盘概览数据（所有工作区汇总、近期活动等）
- **响应**:
```json
{
  "code": 200,
  "message": "获取成功",
  "data": {
    "workspace_summary": [
      {
        "id": "uuid",
        "name": "项目Alpha",
        "icon": "fas fa-rocket",
        "icon_color": "bg-primary",
        "project_goal": "核心功能开发与系统测试",
        "pending_tasks": 3,
        "progress_tasks": 2,
        "completed_tasks": 8,
        "failed_tasks": 1
      }
    ],
    "recent_activities": [
      {
        "id": "uuid",
        "type": "task-completion",
        "title": "任务"实现用户认证模块"已完成",
        "workspace_name": "项目Alpha",
        "status": "completed",
        "created_at": "2024-01-15 12:15:30"
      }
    ]
  }
}
```

---

## 三、错误码定义

| 错误码 | 描述 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（Token 无效或过期） |
| 403 | 禁止访问（无权限） |
| 404 | 资源不存在 |
| 409 | 资源冲突（如重复创建） |
| 422 | 请求参数验证失败 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用 |

---

## 四、技术栈建议

### 后端技术栈
- **语言**: Node.js (TypeScript) / Python (FastAPI) / Go
- **框架**: Express.js / NestJS / FastAPI / Gin
- **数据库**: SQLite 3（单用户工具，轻量化）
- **定时任务**: Node-cron / APScheduler / Cron Jobs（用于轮询数据库）
- **API 文档**: Swagger / OpenAPI 3.0

### 核心功能实现建议
1. **任务调度**: 使用定时任务轮询数据库表（task_queues、notifications），无需消息队列
2. **Hooks 执行**: 通过执行存储在数据库中的curl命令实现，记录执行日志和结果
3. **任务队列执行**: 定时轮询task_queues表，顺序执行，支持暂停/恢复/重试
4. **通知机制**: 定时轮询notifications表，前端定期拉取更新
5. **数据存储**: SQLite文件数据库，适合单用户场景，易于备份和迁移

---

## 五、开发优先级

### P0（核心功能，必须实现）
1. 工作区 CRUD 操作
2. 任务 CRUD 操作
3. 任务列表查询（支持筛选、排序、分页）
4. 任务下发到执行系统
5. 任务状态轮询机制
6. 通知创建和查询
7. SQLite数据库初始化和基础操作

### P1（重要功能，尽快实现）
1. 任务队列 CRUD 和执行管理
2. Hooks 配置管理（使用curl命令）
3. Hooks 自动执行
4. 仪表盘数据统计
5. 定时任务轮询机制（队列执行、通知生成）

### P2（优化功能，后续实现）
1. 批量操作（批量删除任务、批量标记通知等）
2. 任务执行日志记录
3. 数据导出功能（SQLite文件导出）
4. 高级筛选和搜索
5. 数据库备份和恢复功能

---

## 六、注意事项

1. **安全性**
   - 敏感数据（如Hook中的认证信息）需要加密存储
   - 本地开发环境建议使用localhost访问
   - 生产环境部署时注意防火墙和访问控制
   - 防止SQL注入（使用参数化查询）

2. **性能优化**
   - 对高频查询字段建立索引（已在表结构中定义）
   - SQLite适合单用户场景，数据量不宜过大（建议<100万条记录）
   - 大数据量查询使用分页
   - 定期清理过期数据（如已完成的旧任务和已读通知）

3. **可扩展性**
   - 数据库设计预留扩展字段（使用TEXT类型存储JSON）
   - API接口版本管理（如/api/v1/...）
   - 如需多用户支持，可后续迁移到PostgreSQL/MySQL

4. **可维护性**
   - 统一的错误处理和日志记录
   - 完善的API文档
   - 代码规范和注释
   - 单元测试和集成测试
   - SQLite数据库文件定期备份

5. **数据一致性**
   - 使用数据库事务处理关键操作
   - 实现幂等性（避免重复执行）
   - 定时任务轮询时注意并发控制（使用锁机制）
   - SQLite默认支持事务，确保ACID特性
