import React, { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { messagesAtom, currentMessageAtom } from '../../store/atoms';
import { useWebRTC } from '../../hooks/useWebRTC';
import Button from '../common/Button';
import Input from '../common/Input';
import './styles.scss';

/**
 * 聊天组件，负责显示消息列表和发送消息
 */
const Chat: React.FC = () => {
  const [messages] = useAtom(messagesAtom);
  const [currentMessage, setCurrentMessage] = useAtom(currentMessageAtom);
  const { sendChatMessage, connectionStatus } = useWebRTC();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息列表更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // 处理发送消息
  const handleSendMessage = () => {
    if (currentMessage.trim() && connectionStatus === 'connected') {
      sendChatMessage(currentMessage);
      setCurrentMessage('');
    }
  };
  
  // 处理回车键发送
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <div className="chat-container">
      {/* 聊天消息列表 */}
      <div className="chat__messages">
        {messages.length === 0 ? (
          <div className="chat__empty-message">暂无消息</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`chat__message chat__message--${message.sender}`}
            >
              <div className="chat__message-content">
                <span className="chat__message-text">{message.text}</span>
                <span className="chat__message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 消息输入区域 */}
      <div className="chat__input-area">
        <Input
          value={currentMessage}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={connectionStatus === 'connected' ? '输入消息...' : '等待连接建立...'}
          disabled={connectionStatus !== 'connected'}
          fullWidth
        />
        <Button
          onClick={handleSendMessage}
          disabled={!currentMessage.trim() || connectionStatus !== 'connected'}
          size="medium"
        >
          发送
        </Button>
      </div>
    </div>
  );
};

export default Chat;