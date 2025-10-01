#!/bin/bash

echo "========================================"
echo "  Axis Python Backend Startup"
echo "========================================"
echo ""

# 激活虚拟环境
echo "Activating virtual environment..."
source venv/bin/activate

# 启动服务器
echo "Starting server on port 10101..."
echo ""
python3 run.py
