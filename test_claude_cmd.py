#!/usr/bin/env python3
import subprocess
import sys

# 测试不同的Claude Code命令格式

workspace = "/Users/bytedance/cc_tests"
prompt = "创建test.md文件"

print("测试1: 参数传递方式")
cmd1 = ["claude", "--print", "--dangerously-skip-permissions", "--add-dir", workspace, prompt]
print(f"命令: {' '.join(cmd1)}")
result1 = subprocess.run(cmd1, capture_output=True, text=True, timeout=5, cwd=workspace)
print(f"返回码: {result1.returncode}")
print(f"stdout: {result1.stdout[:200] if result1.stdout else '空'}")
print(f"stderr: {result1.stderr[:200] if result1.stderr else '空'}")
print()

print("测试2: stdin传递方式")
cmd2 = ["claude", "--print", "--dangerously-skip-permissions", "--add-dir", workspace]
print(f"命令: {' '.join(cmd2)}")
print(f"stdin: {prompt}")
result2 = subprocess.run(cmd2, input=prompt, capture_output=True, text=True, timeout=5, cwd=workspace)
print(f"返回码: {result2.returncode}")
print(f"stdout: {result2.stdout[:200] if result2.stdout else '空'}")
print(f"stderr: {result2.stderr[:200] if result2.stderr else '空'}")
