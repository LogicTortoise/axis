#!/usr/bin/env python3
"""
测试任务 hooks 功能
"""
import requests
import time
import json

BASE_URL = "http://localhost:10101/api"
WORKSPACE_ID = "6cefbf68-5d32-45e6-9e03-8e9f90c0a0e4"  # Test Project workspace (cc_tests)

def test_hooks():
    print("=" * 60)
    print("开始测试 Hooks 功能")
    print("=" * 60)

    # 1. 创建任务
    print("\n1. 创建任务...")
    task_data = {
        "title": "Hooks 测试任务",
        "description": "在工作区创建一个名为 test_hooks.txt 的文件，内容为：Hello from hooks test!",
        "priority": "high"
    }

    response = requests.post(
        f"{BASE_URL}/workspaces/{WORKSPACE_ID}/tasks",
        json=task_data
    )
    print(f"响应状态: {response.status_code}")

    if response.status_code != 200:
        print(f"❌ 创建任务失败: {response.text}")
        return

    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))

    task_id = result["data"]["id"]
    print(f"✅ 任务创建成功，ID: {task_id}")

    # 2. 更新任务，添加 hooks
    print("\n2. 添加 Hooks URL...")
    update_data = {
        "start_hook": "http://localhost:8888/hooks/start",
        "stop_hook": "http://localhost:8888/hooks/stop"
    }

    response = requests.put(
        f"{BASE_URL}/tasks/{task_id}",
        json=update_data
    )
    print(f"响应状态: {response.status_code}")

    if response.status_code != 200:
        print(f"❌ 更新任务失败: {response.text}")
        return

    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))

    print("✅ Hooks 添加成功")

    # 3. 下发任务
    print("\n3. 下发任务...")
    response = requests.post(
        f"{BASE_URL}/tasks/{task_id}/dispatch",
        json={}
    )
    print(f"响应状态: {response.status_code}")

    if response.status_code != 200:
        print(f"❌ 下发任务失败: {response.text}")
        return

    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))

    execution_id = result["data"]["execution_id"]
    print(f"✅ 任务下发成功，execution_id: {execution_id}")

    # 4. 轮询任务状态
    print("\n4. 等待任务执行...")
    print("请查看 Webhook 服务器的输出，应该能看到 start hook 和 stop hook 的调用记录")

    for i in range(30):
        time.sleep(2)
        response = requests.get(f"{BASE_URL}/tasks/{task_id}")
        if response.status_code == 200:
            result = response.json()
            status = result["data"]["status"]
            print(f"  [{i*2}s] 任务状态: {status}")

            if status in ["completed", "failed"]:
                print(f"\n任务最终状态: {status}")
                if status == "completed":
                    print("✅ 任务执行成功")
                else:
                    print(f"❌ 任务执行失败: {result['data'].get('error_message')}")

                print("\n任务输出:")
                print(result["data"].get("execution_output", "无输出"))
                break
    else:
        print("⚠️  任务执行超时")

    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)

if __name__ == "__main__":
    test_hooks()
