#!/usr/bin/env python3
"""
Axis 后端启动脚本
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting Axis API on {settings.host}:{settings.port}")
    print(f"API Documentation: http://{settings.host}:{settings.port}/docs")
    print(f"API Base URL: http://{settings.host}:{settings.port}{settings.api_prefix}")

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
