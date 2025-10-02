#!/bin/bash

# Axis 重启脚本
# 默认只重启后端，使用 --all 参数重启前端和后端

RESTART_ALL=false

# 解析参数
if [ "$1" == "--all" ]; then
    RESTART_ALL=true
fi

echo "========================================"
echo "  Axis Restart Script"
echo "========================================"
echo ""

# 停止后端服务
echo "Stopping backend services..."
pkill -f "python3 run.py" || echo "No backend process found"
echo ""

# 如果需要重启所有服务，则停止前端
if [ "$RESTART_ALL" = true ]; then
    echo "Stopping frontend services..."
    pkill -f "vite" || echo "No frontend process found"
    echo ""
fi

# 等待进程完全停止
sleep 2

# 启动后端
echo "Starting backend..."
cd python-backend
source venv/bin/activate
nohup python3 run.py > backend.log 2>&1 &
echo "Backend started (PID: $!)"
cd ..
echo ""

# 如果需要重启所有服务，则启动前端
if [ "$RESTART_ALL" = true ]; then
    echo "Starting frontend..."
    nohup npm run dev > frontend.log 2>&1 &
    echo "Frontend started (PID: $!)"
    echo ""
fi

echo "========================================"
echo "  Restart Complete!"
echo "========================================"
echo ""

if [ "$RESTART_ALL" = true ]; then
    echo "Both frontend and backend have been restarted."
    echo "Frontend: http://localhost:5173"
    echo "Backend: http://localhost:10101"
else
    echo "Backend has been restarted."
    echo "Backend: http://localhost:10101"
fi
echo ""
echo "Check logs:"
echo "  Backend: tail -f python-backend/backend.log"
if [ "$RESTART_ALL" = true ]; then
    echo "  Frontend: tail -f frontend.log"
fi
