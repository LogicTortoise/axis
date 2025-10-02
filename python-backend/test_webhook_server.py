#!/usr/bin/env python3
"""
简单的 Webhook 接收器，用于测试任务 hooks
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn
import json
from datetime import datetime

app = FastAPI()

@app.post("/hooks/start")
async def handle_start_hook(request: Request):
    """接收任务开始 hook"""
    data = await request.json()
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 收到开始 Hook:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"{'='*60}\n")
    return JSONResponse({"status": "ok", "message": "开始 hook 已接收"})

@app.post("/hooks/stop")
async def handle_stop_hook(request: Request):
    """接收任务完成 hook"""
    data = await request.json()
    print(f"\n{'='*60}")
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 收到完成 Hook:")
    print(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"{'='*60}\n")
    return JSONResponse({"status": "ok", "message": "完成 hook 已接收"})

if __name__ == "__main__":
    print("启动 Webhook 测试服务器 on http://localhost:8888")
    print("开始 Hook URL: http://localhost:8888/hooks/start")
    print("完成 Hook URL: http://localhost:8888/hooks/stop")
    uvicorn.run(app, host="0.0.0.0", port=8888)
