# Axis Python Backend

个人项目管理工具 Axis 的 Python FastAPI 后端实现。

## 技术栈

- **Python**: 3.12+
- **FastAPI**: 0.115.0
- **SQLAlchemy**: 2.0.35
- **SQLite**: 数据库
- **Pydantic**: 数据验证

## 安装与运行

### 1. 激活虚拟环境

```bash
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行服务器

```bash
python run.py
```

或者

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 10101 --reload
```

服务器将在 `http://localhost:10101` 启动。

## API 文档

启动服务器后，可以访问：

- Swagger UI: http://localhost:10101/docs
- ReDoc: http://localhost:10101/redoc

## API 端点

### 工作区管理

- `GET /api/workspaces` - 获取工作区列表
- `GET /api/workspaces/{workspace_id}` - 获取工作区详情
- `POST /api/workspaces` - 创建工作区
- `PUT /api/workspaces/{workspace_id}` - 更新工作区
- `DELETE /api/workspaces/{workspace_id}` - 删除工作区

### 任务管理

- `GET /api/workspaces/{workspace_id}/tasks` - 获取任务列表（支持筛选、排序、分页）
- `GET /api/tasks/{task_id}` - 获取任务详情
- `POST /api/workspaces/{workspace_id}/tasks` - 创建任务
- `PUT /api/tasks/{task_id}` - 更新任务
- `DELETE /api/tasks/{task_id}` - 删除任务
- `POST /api/tasks/{task_id}/dispatch` - 下发任务
- `POST /api/tasks/{task_id}/retry` - 重试任务
- `GET /api/tasks/{task_id}/status` - 查询任务状态

### 通知管理

- `GET /api/notifications` - 获取通知列表
- `PUT /api/notifications/{notification_id}/read` - 标记通知为已读
- `POST /api/notifications/batch-read` - 批量标记已读
- `POST /api/notifications/read-all` - 全部标记为已读
- `GET /api/notifications/unread-count` - 获取未读数量

### 仪表盘

- `GET /api/dashboard/overview` - 获取仪表盘概览数据

## 数据库

项目使用 SQLite 数据库，数据库文件位于 `axis.db`。

首次运行时会自动创建数据库和表结构。

## 开发

### 项目结构

```
python-backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI 应用入口
│   ├── config.py         # 配置文件
│   ├── database.py       # 数据库连接
│   ├── models/           # SQLAlchemy 模型
│   ├── schemas/          # Pydantic schemas
│   ├── api/              # API 路由
│   └── services/         # 业务逻辑
├── requirements.txt
├── run.py
└── venv/
```

### P0 功能完成情况

- [x] 工作区 CRUD 操作
- [x] 任务 CRUD 操作
- [x] 任务列表查询（支持筛选、排序、分页）
- [x] 任务下发到执行系统
- [x] 任务状态轮询机制
- [x] 通知创建和查询
- [x] SQLite数据库初始化和基础操作
- [x] 仪表盘数据统计

## 注意事项

1. 当前任务下发和轮询功能为模拟实现，实际使用需要对接真实的任务执行系统
2. 生产环境需要修改 CORS 配置，指定具体的前端地址
3. 建议定期备份 SQLite 数据库文件
