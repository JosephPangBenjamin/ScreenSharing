// src/components/VideoConference.tsx - 主组件
import React, { useState, useEffect, useRef } from 'react';
import './VideoConference.scss';
import Logo from '../logo.png';
import { Participant, Message, FileTransfer } from '../types/types';

const VideoConference: React.FC = () => {
  // 状态管理
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>([]);
  const [videoLayout, setVideoLayout] = useState<'grid' | 'focused'>('grid');
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('connecting');
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>('good');
  
  // 本地视频和文件输入的引用
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 初始化本地媒体流
  useEffect(() => {
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // 添加本地参与者
        setParticipants([{
          id: 'local',
          name: 'You',
          videoStream: stream,
          audioEnabled: true,
          videoEnabled: true,
          isSpeaking: false,
          connectionStatus: 'connected',
          networkQuality: 'excellent'
        }]);
        
        // 模拟连接到服务器
        setTimeout(() => {
          setConnectionStatus('connected');
        }, 2000);
        
        // 模拟添加远程参与者
        simulateRemoteParticipants();
      } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('无法访问摄像头或麦克风，请确保已授予权限。');
      }
    };
    
    initLocalStream();
    
    // 清理函数
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // 模拟远程参与者加入
  const simulateRemoteParticipants = () => {
    // 模拟两个远程用户加入
    const remoteUsers = [
      { id: 'user1', name: 'Alex Johnson' },
      { id: 'user2', name: 'Sarah Miller' }
    ];
    
    remoteUsers.forEach((user, index) => {
      setTimeout(() => {
        setParticipants(prev => [...prev, {
          ...user,
          audioEnabled: true,
          videoEnabled: true,
          isSpeaking: false,
          connectionStatus: 'connecting',
          networkQuality: 'good'
        }]);
        
        // 模拟远程视频流加载完成
        setTimeout(() => {
          setParticipants(prev => prev.map(p => 
            p.id === user.id 
              ? { ...p, connectionStatus: 'connected' } 
              : p
          ));
        }, 1500 + (index * 1000));
      }, 2000 + (index * 2000));
    });
  };
  
  // 处理音视频开关
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
      updateLocalParticipant({ audioEnabled: !isAudioEnabled });
    }
  };
  
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
      updateLocalParticipant({ videoEnabled: !isVideoEnabled });
    }
  };
  
  // 切换屏幕共享
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // 停止屏幕共享，恢复摄像头
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => track.stop());
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: isAudioEnabled
        });
        setLocalStream(newStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }
        updateLocalParticipant({ videoStream: newStream });
      }
      setIsScreenSharing(false);
    } else {
      // 开始屏幕共享
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false
        });
        if (localStream) {
          // 保留音频轨道
          const audioTracks = localStream.getAudioTracks();
          audioTracks.forEach(track => {
            screenStream.addTrack(track);
          });
        }
        
        setLocalStream(screenStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        updateLocalParticipant({ videoStream: screenStream });
        setIsScreenSharing(true);
        
        // 监听屏幕共享结束
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch (error) {
        console.error('Error starting screen share:', error);
        alert('无法开始屏幕共享，请确保已授予权限。');
      }
    }
  };
  
  // 更新本地参与者信息
  const updateLocalParticipant = (updates: Partial<Participant>) => {
    setParticipants(prev => 
      prev.map(p => p.id === 'local' ? { ...p, ...updates } : p)
    );
  };
  
  // 处理文件选择和发送
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newTransfer: FileTransfer = {
        id: `file-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        progress: 0,
        status: 'transferring',
        senderId: 'local'
      };
      
      setFileTransfers(prev => [...prev, newTransfer]);
      
      // 模拟文件传输进度
      simulateFileTransfer(newTransfer.id);
      
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // 模拟文件传输
  const simulateFileTransfer = (fileId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setFileTransfers(prev => 
        prev.map(transfer => 
          transfer.id === fileId 
            ? { ...transfer, progress } 
            : transfer
        )
      );
      
      if (progress >= 100) {
        clearInterval(interval);
        setFileTransfers(prev => 
          prev.map(transfer => 
            transfer.id === fileId 
              ? { ...transfer, status: 'completed', progress: 100 } 
              : transfer
          )
        );
        
        // 添加文件消息
        const fileTransfer = fileTransfers.find(t => t.id === fileId);
        if (fileTransfer) {
          addMessage({
            content: `Shared file: ${fileTransfer.fileName}`,
            type: 'file',
            fileName: fileTransfer.fileName,
            fileUrl: '#', // 实际应用中应为文件URL
            status: 'sent'
          });
        }
        
        // 5秒后移除传输状态
        setTimeout(() => {
          setFileTransfers(prev => prev.filter(t => t.id !== fileId));
        }, 5000);
      }
    }, 200);
  };
  
  // 发送消息
  const [newMessage, setNewMessage] = useState('');
  const sendMessage = () => {
    if (newMessage.trim()) {
      addMessage({
        content: newMessage,
        type: 'text',
        status: 'sent'
      });
      setNewMessage('');
    }
  };
  
  // 添加消息到列表
  const addMessage = (message: Omit<Message, 'id' | 'senderId' | 'timestamp'>) => {
    const newMsg: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      senderId: 'local',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMsg]);
    
    // 模拟消息已接收
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => 
          m.id === newMsg.id ? { ...m, status: 'received' } : m
        )
      );
    }, 1000);
  };
  
  // 切换视频布局
  const toggleVideoLayout = () => {
    setVideoLayout(prev => prev === 'grid' ? 'focused' : 'grid');
  };
  
  // 渲染视频容器
  const renderVideoContainer = () => {
    const remoteParticipants = participants.filter(p => p.id !== 'local');
    const isTwoParticipants = remoteParticipants.length === 1;
    
    // 双人模式 - 可切换布局
    if (isTwoParticipants && videoLayout === 'focused') {
      return (
        <div className="video-container focused-layout">
          <div className="main-video">
            {renderVideo(remoteParticipants[0])}
          </div>
          <div className="self-video">
            {renderVideo(participants.find(p => p.id === 'local'))}
          </div>
        </div>
      );
    }
    
    // 网格布局 - 适用于多人
    return (
      <div className="video-container grid-layout">
        {participants.map(participant => (
          <div 
            key={participant.id} 
            className={`video-wrapper ${participant.id === 'local' ? 'local-video' : ''}`}
          >
            {renderVideo(participant)}
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染单个视频
  const renderVideo = (participant: Participant | undefined) => {
    if (!participant) return null;
    
    return (
      <div className="video-item">
        {participant.connectionStatus === 'connecting' ? (
          <div className="connecting-overlay">
            <div className="spinner"></div>
            <p>Connecting to {participant.name}...</p>
          </div>
        ) : null}
        
        <video
          autoPlay
          muted={participant.id === 'local'} // 本地视频静音以避免回声
          playsInline
          className={`video-stream ${!participant.videoEnabled ? 'video-disabled' : ''}`}
          srcObject={participant.videoStream || null}
        />
        
        <div className="participant-info">
          <span className="participant-name">{participant.name}</span>
          <div className="status-indicators">
            {!participant.audioEnabled && (
              <span className="muted-indicator">🔇</span>
            )}
            <span className={`network-indicator ${participant.networkQuality}`}>
              {participant.networkQuality === 'excellent' && '📶'}
              {participant.networkQuality === 'good' && '📶📶'}
              {participant.networkQuality === 'fair' && '📶📶📶'}
              {participant.networkQuality === 'poor' && '📶📶📶📶'}
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="video-conference">
      {/* 顶部导航栏 */}
      <header className="conference-header">
        <div className="logo-container">
          <img src={Logo} alt="Conference Logo" className="logo" />
          <h1>VideoMeet</h1>
        </div>
        
        <div className="connection-status">
          <span className={`status-badge ${connectionStatus}`}>
            {connectionStatus === 'connecting' && 'Connecting...'}
            {connectionStatus === 'connected' && 'Connected'}
            {connectionStatus === 'disconnected' && 'Disconnected'}
          </span>
          <span className={`network-quality ${networkQuality}`}>
            Network: {networkQuality.charAt(0).toUpperCase() + networkQuality.slice(1)}
          </span>
        </div>
      </header>
      
      {/* 主视频区域 */}
      {renderVideoContainer()}
      
      {/* 控制栏 */}
      <div className="control-bar">
        <button 
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
          onClick={toggleAudio}
          title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        
        <button 
          className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={toggleVideo}
          title={isVideoEnabled ? 'Turn Off Video' : 'Turn On Video'}
        >
          {isVideoEnabled ? '📹' : '🚫📹'}
        </button>
        
        <button 
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? '🛑🖥️' : '🖥️'}
        </button>
        
        {participants.filter(p => p.id !== 'local').length === 1 && (
          <button 
            className="control-btn"
            onClick={toggleVideoLayout}
            title="Toggle Video Layout"
          >
            {videoLayout === 'grid' ? '🔍' : '🔄'}
          </button>
        )}
        
        <label className="control-btn file-upload-btn" title="Share File">
          📎
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="*"
            hidden
          />
        </label>
        
        <button className="control-btn end-call" title="End Call">
          📞❌
        </button>
      </div>
      
      {/* 文件传输状态 */}
      {fileTransfers.length > 0 && (
        <div className="file-transfers">
          {fileTransfers.map(transfer => (
            <div key={transfer.id} className="file-transfer-item">
              <div className="file-info">
                <span className="file-name">{transfer.fileName}</span>
                <span className="file-status">
                  {transfer.status === 'transferring' && `Transferring... ${transfer.progress}%`}
                  {transfer.status === 'completed' && 'Completed'}
                  {transfer.status === 'failed' && 'Failed'}
                </span>
              </div>
              {transfer.status === 'transferring' && (
                <div className="progress-bar">
                  <div 
                    className="progress" 
                    style={{ width: `${transfer.progress}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* 聊天面板 */}
      <div className="chat-panel">
        <div className="chat-header">
          <h3>Chat</h3>
        </div>
        
        <div className="messages-container">
          {messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.senderId === 'local' ? 'outgoing' : 'incoming'}`}
            >
              <div className="message-content">
                {message.type === 'text' && <p>{message.content}</p>}
                {message.type === 'file' && message.fileName && (
                  <a href={message.fileUrl || '#'} className="file-link" target="_blank" rel="noopener noreferrer">
                    📎 {message.fileName}
                  </a>
                )}
              </div>
              <div className="message-status">
                {message.status === 'sending' && <span className="sending">⌛</span>}
                {message.status === 'sent' && <span className="sent">✓</span>}
                {message.status === 'received' && <span className="received">✓✓</span>}
                {message.status === 'failed' && <span className="failed">✗</span>}
              </div>
            </div>
          ))}
        </div>
        
        <div className="message-input">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default VideoConference;