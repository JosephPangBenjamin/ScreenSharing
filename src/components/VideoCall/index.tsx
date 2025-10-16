import React, { useEffect } from 'react';
import { useAtom } from 'jotai';
import { screenSharingEnabledAtom } from '../../store/atoms';
import { useWebRTC } from '../../hooks/useWebRTC';
import './styles.scss';

interface VideoCallProps {
  roomId?: string;
}

/**
 * 视频通话组件，负责显示本地和远程视频
 */
const VideoCall: React.FC<VideoCallProps> = () => {
  const { 
    connectionStatus,
    localVideoRef, 
    remoteVideoRef, 
    initializeLocalStream
  } = useWebRTC();
  const [screenSharingEnabled] = useAtom(screenSharingEnabledAtom);
  
  // 初始化本地视频流
  useEffect(() => {
    const initStream = async () => {
      try {
        await initializeLocalStream();
      } catch (error) {
        console.error('初始化本地流失败:', error);
      }
    };
    
    initStream();
  }, [initializeLocalStream]);
  
  return (
    <div className="video-call-container">
      {/* 远程视频区域 */}
      <div className="video-call__remote">
        <video
          ref={remoteVideoRef}
          className="video-call__video video-call__video--remote"
          autoPlay
          playsInline
        />
        {connectionStatus === 'connecting' && (
          <div className="video-call__status-overlay">
            <div className="video-call__status-content">
              <div className="video-call__status-spinner" />
              <span>正在连接...</span>
            </div>
          </div>
        )}
        {connectionStatus === 'disconnected' && !remoteVideoRef.current?.srcObject && (
          <div className="video-call__placeholder">
            <span>等待对方加入通话</span>
          </div>
        )}
      </div>
      
      {/* 本地视频区域（画中画） */}
      {localVideoRef.current?.srcObject && (
        <div className={`video-call__local ${screenSharingEnabled ? 'video-call__local--screen-sharing' : ''}`}>
          <video
            ref={localVideoRef}
            className="video-call__video video-call__video--local"
            autoPlay
            playsInline
            muted
          />
        </div>
      )}
    </div>
  );
};

export default VideoCall;