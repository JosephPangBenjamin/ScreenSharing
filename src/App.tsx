import { useState, useEffect } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { 
  connectionStatusAtom, 
  localAudioEnabledAtom, 
  localVideoEnabledAtom, 
  screenSharingEnabledAtom,
  roomIdAtom,
  errorMessageAtom,
  signalingTypeAtom
} from './store/atoms';
import { useWebRTC } from './hooks/useWebRTC';
import VideoCall from './components/VideoCall';
import Chat from './components/Chat';
import Button from './components/common/Button';
import Input from './components/common/Input';
import './App.scss';

function App() {
  // 状态管理
  const [connectionStatus] = useAtom(connectionStatusAtom);
  const [localAudioEnabled, setLocalAudioEnabled] = useAtom(localAudioEnabledAtom);
  const [localVideoEnabled, setLocalVideoEnabled] = useAtom(localVideoEnabledAtom);
  const [screenSharingEnabled, setScreenSharingEnabled] = useAtom(screenSharingEnabledAtom);
  const [roomId] = useAtom(roomIdAtom);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [errorMessage] = useAtom(errorMessageAtom);
  const [signalingType] = useAtom(signalingTypeAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  
  // WebRTC hooks
  const {
    createOrJoinRoom,
    createOffer,
    closeConnection,
    toggleAudio,
    toggleVideo,
    startScreenSharing,
    stopScreenSharing,
    cleanupResources,
    initializeLocalStream,
    localStream
  } = useWebRTC();
  
  // 创建房间
  const handleCreateRoom = async () => {
    setErrorMessage(null);
    const newRoomId = createOrJoinRoom();
    console.log('创建新房间:', newRoomId);
    
    // 初始化本地媒体流
    try {
      await initializeLocalStream();
    } catch (error) {
      console.error('初始化媒体流失败:', error);
      setErrorMessage('无法访问摄像头和麦克风');
    }
  };
  
  // 加入房间
  const handleJoinRoom = async () => {
    if (!joinRoomId.trim()) {
      setErrorMessage('请输入房间ID');
      return;
    }
    setErrorMessage(null);
    createOrJoinRoom(joinRoomId.trim());
    console.log('加入房间:', joinRoomId.trim());
    
    // 初始化本地媒体流
    try {
      await initializeLocalStream();
    } catch (error) {
      console.error('初始化媒体流失败:', error);
      setErrorMessage('无法访问摄像头和麦克风');
    }
  };
  
  // 发起通话
  const handleStartCall = async () => {
    try {
      // 确保本地媒体流已初始化
      if (!localStream) {
        await initializeLocalStream();
      }
      await createOffer();
    } catch (error) {
      console.error('发起通话失败:', error);
      setErrorMessage('发起通话失败');
    }
  };
  
  // 结束通话
  const handleEndCall = () => {
    closeConnection();
  };
  
  // 处理音频切换
  const handleToggleAudio = () => {
    toggleAudio();
    setLocalAudioEnabled(prev => !prev);
  };
  
  // 处理视频切换
  const handleToggleVideo = () => {
    toggleVideo();
    setLocalVideoEnabled(prev => !prev);
  };
  
  // 处理屏幕共享切换
  const handleToggleScreenSharing = async () => {
    if (screenSharingEnabled) {
      stopScreenSharing();
    } else {
      try {
        await startScreenSharing();
        setScreenSharingEnabled(true);
      } catch (error) {
        console.error('屏幕共享失败:', error);
      }
    }
  };
  
  // 复制房间ID
  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId).then(() => {
      setErrorMessage('房间ID已复制到剪贴板');
      setTimeout(() => setErrorMessage(null), 2000);
    }).catch(() => {
      setErrorMessage('复制失败，请手动复制');
    });
  };
  
  // 检测局域网信令消息
  const handleDetectSignaling = () => {
    // 这个功能在useWebRTC钩子中已经通过localStorage事件监听器实现
    setErrorMessage('开始监听局域网信令...');
    setTimeout(() => setErrorMessage(null), 2000);
  };
  
  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">WebRTC 视频通话</h1>
        {roomId && (
          <div className="app-room-info">
            <span className="app-room-label">房间ID:</span>
            <span className="app-room-id">{roomId}</span>
            <Button onClick={handleCopyRoomId} variant="outline" size="small">
              复制
            </Button>
          </div>
        )}
      </header>
      
      {errorMessage && (
        <div className="app-error">
          {errorMessage}
        </div>
      )}
      
      <main className="app-main">
        {!roomId ? (
          // 房间创建/加入界面
          <div className="room-setup">
            <div className="room-setup__form">
              <h2 className="room-setup__title">创建或加入房间</h2>
              
              <div className="room-setup__options">
                <Button 
                  onClick={handleCreateRoom} 
                  variant="primary" 
                  size="large" 
                  fullWidth
                >
                  创建新房间
                </Button>
                
                <div className="room-setup__divider">
                  <span>或者</span>
                </div>
                
                <div className="room-setup__join">
                  <Input
                    placeholder="输入房间ID"
                    value={joinRoomId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinRoomId(e.target.value)}
                    fullWidth
                  />
                  <Button 
                    onClick={handleJoinRoom} 
                    variant="secondary" 
                    size="large"
                    fullWidth
                  >
                    加入房间
                  </Button>
                </div>
              </div>
              
              <div className="room-setup__note">
                <p>注意：当前使用 {signalingType === 'localStorage' ? '局域网模式' : '公网模式'}。</p>
                <p>局域网模式下，两台设备需要在同一网络环境下。</p>
              </div>
            </div>
          </div>
        ) : (
          // 视频通话界面
          <div className="video-call-layout">
            {/* 视频区域 */}
            <div className="video-call-layout__video">
              <VideoCall roomId={roomId} />
            </div>
            
            {/* 聊天区域 */}
            <div className="video-call-layout__chat">
              <h3 className="video-call-layout__section-title">聊天</h3>
              <Chat />
            </div>
          </div>
        )}
      </main>
      
      {/* 控制按钮区域 */}
      {roomId && (
        <footer className="app-footer">
          {connectionStatus === 'disconnected' ? (
            // 未连接状态的按钮
            <div className="control-buttons">
              <Button 
                onClick={handleStartCall} 
                variant="success" 
                size="large"
              >
                发起通话
              </Button>
              <Button 
                onClick={handleDetectSignaling} 
                variant="secondary" 
                size="medium"
              >
                检测局域网信令
              </Button>
            </div>
          ) : (
            // 通话状态的控制按钮
            <div className="control-buttons control-buttons--calling">
              <Button 
                onClick={handleToggleAudio} 
                variant={localAudioEnabled ? 'outline' : 'secondary'} 
                size="medium"
              >
                {localAudioEnabled ? '静音' : '取消静音'}
              </Button>
              <Button 
                onClick={handleToggleVideo} 
                variant={localVideoEnabled ? 'outline' : 'secondary'} 
                size="medium"
              >
                {localVideoEnabled ? '关闭摄像头' : '开启摄像头'}
              </Button>
              <Button 
                onClick={handleToggleScreenSharing} 
                variant={screenSharingEnabled ? 'secondary' : 'outline'} 
                size="medium"
              >
                {screenSharingEnabled ? '停止共享' : '共享屏幕'}
              </Button>
              <Button 
                onClick={handleEndCall} 
                variant="danger" 
                size="large"
              >
                结束通话
              </Button>
            </div>
          )}
        </footer>
      )}
    </div>
  );
}

export default App;