# Axis - AI任务管理系统

一个基于React + TypeScript + Python的AI任务管理和执行系统，支持任务队列、实时消息流和执行日志记录。

## 🚀 快速开始

### 端口配置

- **前端**: http://localhost:10102
- **后端API**: http://localhost:10101
- **数据库**: SQLite (axis.db)

### 启动服务

#### 前端 (React + Vite)
```bash
npm install
npm run dev
```

#### 后端 (Python FastAPI)
```bash
cd python-backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 run.py
```

## 📦 技术栈

### 前端
- React 19.1.0
- TypeScript
- Vite 7.0.3
- React Router DOM
- Axios
- Tailwind CSS

### 后端
- Python 3.12
- FastAPI
- SQLAlchemy
- SQLite
- Claude Agent SDK

## ✨ 主要功能

- 📋 工作区和任务管理
- 🤖 AI任务自动执行 (Claude Agent)
- 📊 任务队列管理
- 🔄 实时消息流 (SSE)
- 📝 执行日志记录和查看
- 🔗 Webhook集成 (Start/Stop Hooks)
- 🔔 通知中心

## 🛠️ 开发说明

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
