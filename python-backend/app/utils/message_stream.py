"""
任务消息流管理器
用于实时推送任务执行过程中的消息
"""
import asyncio
from typing import Dict, List
from collections import defaultdict
import json

class MessageStreamManager:
    """管理任务消息流的单例类"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        # 存储每个任务的消息队列 {task_id: [messages]}
        self.task_messages: Dict[str, List[dict]] = defaultdict(list)
        # 存储每个任务的订阅者队列 {task_id: [asyncio.Queue]}
        self.task_subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)

    async def add_message(self, task_id: str, message: dict):
        """添加消息到任务流"""
        # 存储消息历史
        self.task_messages[task_id].append(message)

        # 推送给所有订阅者
        if task_id in self.task_subscribers:
            for queue in self.task_subscribers[task_id]:
                try:
                    await queue.put(message)
                except:
                    pass

    async def subscribe(self, task_id: str) -> asyncio.Queue:
        """订阅任务消息流"""
        queue = asyncio.Queue()
        self.task_subscribers[task_id].append(queue)

        # 发送历史消息
        if task_id in self.task_messages:
            for msg in self.task_messages[task_id]:
                await queue.put(msg)

        return queue

    def unsubscribe(self, task_id: str, queue: asyncio.Queue):
        """取消订阅"""
        if task_id in self.task_subscribers:
            if queue in self.task_subscribers[task_id]:
                self.task_subscribers[task_id].remove(queue)

    def clear_task(self, task_id: str):
        """清理任务数据"""
        if task_id in self.task_messages:
            del self.task_messages[task_id]
        if task_id in self.task_subscribers:
            del self.task_subscribers[task_id]

    def get_messages(self, task_id: str) -> List[dict]:
        """获取任务的所有消息"""
        return self.task_messages.get(task_id, [])

# 全局实例
message_stream_manager = MessageStreamManager()
