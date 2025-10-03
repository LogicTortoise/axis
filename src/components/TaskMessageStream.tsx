import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface Message {
  type: string;
  message?: string;
  text?: string;
  raw?: string;
  subtype?: string;
  is_error?: boolean;
  duration_ms?: number;
  cost_usd?: number;
}

interface TaskMessageStreamProps {
  taskId: string;
  isRunning: boolean;
}

const TaskMessageStream: React.FC<TaskMessageStreamProps> = ({ taskId, isRunning }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载历史消息（对于已完成或失败的任务）
  useEffect(() => {
    if (isRunning || !taskId) {
      return;
    }

    const loadHistoryMessages = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`http://localhost:10101/api/tasks/${taskId}/execution-logs`);
        if (response.data.code === 200 && response.data.data && response.data.data.length > 0) {
          // 获取最新的执行日志
          const latestLog = response.data.data[0];

          // 解析消息内容
          try {
            const parsedMessages = JSON.parse(latestLog.response_content);
            setMessages(parsedMessages);
          } catch (error) {
            console.error('解析历史消息失败:', error);
          }
        }
      } catch (error) {
        console.error('加载历史消息失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistoryMessages();
  }, [taskId, isRunning]);

  // SSE实时连接（对于正在执行的任务）
  useEffect(() => {
    // 只在任务运行中时连接SSE
    if (!isRunning || !taskId) {
      return;
    }

    // 清空之前的消息
    setMessages([]);

    // 创建SSE连接
    const eventSource = new EventSource(`http://localhost:10101/api/tasks/${taskId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE连接已建立');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // 检查是否是结束信号
        if (data.type === 'end') {
          console.log('任务执行结束:', data.status);
          eventSource.close();
          setIsConnected(false);
          return;
        }

        // 添加消息到列表
        setMessages(prev => [...prev, data]);
      } catch (error) {
        console.error('解析SSE消息失败:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE连接错误:', error);
      setIsConnected(false);
      eventSource.close();
    };

    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsConnected(false);
      }
    };
  }, [taskId, isRunning]);

  // 渲染消息
  const renderMessage = (msg: Message, index: number) => {
    let bgColor = 'bg-gray-50';
    let icon = 'fa-info-circle';
    let iconColor = 'text-blue-500';

    if (msg.type === 'init') {
      bgColor = 'bg-blue-50';
      icon = 'fa-rocket';
      iconColor = 'text-blue-500';
    } else if (msg.type === 'SystemMessage') {
      bgColor = 'bg-purple-50';
      icon = 'fa-cog';
      iconColor = 'text-purple-500';
    } else if (msg.type === 'AssistantMessage') {
      bgColor = 'bg-green-50';
      icon = 'fa-comment-dots';
      iconColor = 'text-green-500';
    } else if (msg.type === 'ResultMessage') {
      if (msg.is_error) {
        bgColor = 'bg-red-50';
        icon = 'fa-times-circle';
        iconColor = 'text-red-500';
      } else {
        bgColor = 'bg-green-100';
        icon = 'fa-check-circle';
        iconColor = 'text-green-600';
      }
    }

    return (
      <div key={index} className={`p-3 rounded-lg ${bgColor} mb-2`}>
        <div className="flex items-start space-x-2">
          <i className={`fas ${icon} ${iconColor} mt-0.5`}></i>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">{msg.type}</span>
              {msg.duration_ms && (
                <span className="text-xs text-gray-500">{msg.duration_ms}ms</span>
              )}
            </div>

            {msg.message && (
              <p className="text-sm text-gray-800 mb-1">{msg.message}</p>
            )}

            {msg.text && (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.text}</p>
            )}

            {msg.cost_usd && (
              <div className="mt-1 text-xs text-gray-500">
                成本: ${msg.cost_usd.toFixed(4)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          {isRunning ? '执行消息流' : '最近执行消息'}
        </h4>
        <div className="flex items-center space-x-2">
          {isConnected && (
            <span className="flex items-center text-xs text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
              实时连接中
            </span>
          )}
          {isLoading && (
            <span className="flex items-center text-xs text-gray-500">
              <i className="fas fa-spinner fa-spin mr-1.5"></i>
              加载中...
            </span>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-4">
            {isRunning ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                等待消息...
              </>
            ) : (
              <>
                <i className="fas fa-info-circle mr-2"></i>
                暂无执行消息
              </>
            )}
          </div>
        ) : (
          <div>
            {messages.map((msg, index) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskMessageStream;
