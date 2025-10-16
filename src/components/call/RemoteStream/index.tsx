import React, { useEffect, useRef } from 'react';
import { useWebRTC } from '../../../hooks/useWebRTC';
import './index.scss';

interface RemoteStreamProps {
    /** 组件自定义类名 */
    className?: string;
    /** 视频容器高度 */
    height?: string;
    /** 远程用户名称 */
    userName?: string;
    /** 连接状态 */
    connectionStatus?: string;
}

/**
 * 远程视频流组件
 * 负责显示从远程对等方接收的媒体流
 * 展示连接状态和远程用户信息
 */
const RemoteStream: React.FC<RemoteStreamProps> = ({
                                                       className = '',
                                                       height = 'auto',
                                                       userName = '远程用户',
                                                       connectionStatus
                                                   }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // 获取WebRTC相关状态
    const { remoteStream } = useWebRTC();

    // 将远程流绑定到video元素
    useEffect(() => {
        if (remoteStream && videoRef.current) {
            videoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // 确定当前显示状态
    const isConnected = !!remoteStream;
    const isConnecting = !isConnected && connectionStatus === 'connecting';

    return (
        <div className={`remote-stream ${className}`} style={{ height }}>
            <div className="video-container">
                {/* 视频元素 */}
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="video"
                />

                {/* 连接中状态 */}
                {isConnecting && (
                    <div className="connecting-overlay">
                        <div className="spinner"></div>
                        <p>正在连接到 {userName}...</p>
                    </div>
                )}

                {/* 未连接状态 */}
                {!isConnected && !isConnecting && (
                    <div className="disconnected-overlay">
                        <i className="fa fa-user" />
                        <p>等待 {userName} 加入...</p>
                        {connectionStatus && (
                            <p className="status">{connectionStatus}</p>
                        )}
                    </div>
                )}

                {/* 远程用户信息 */}
                {isConnected && (
                    <div className="user-info">
                        <span className="user-name">{userName}</span>
                        <span className="connection-indicator connected"></span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RemoteStream;
