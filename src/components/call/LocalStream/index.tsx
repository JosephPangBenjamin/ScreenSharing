import React, { useEffect, useRef, useState } from 'react';
import Button from '../../common/Button';
import { useWebRTC } from '../../../hooks/useWebRTC';
import './LocalStream.scss';

interface LocalStreamProps {
    /** 组件自定义类名 */
    className?: string;
    /** 视频容器高度 */
    height?: string;
    /** 是否显示控制按钮 */
    showControls?: boolean;
}

/**
 * 本地视频流组件
 * 负责显示本地摄像头和麦克风采集的媒体流
 * 提供视频和音频的开关控制
 */
const LocalStream: React.FC<LocalStreamProps> = ({
                                                     className = '',
                                                     height = 'auto',
                                                     showControls = true
                                                 }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    // 获取WebRTC相关方法和状态
    const {
        localStream,
        videoEnabled,
        audioEnabled,
        startLocalStream,
        stopLocalStream,
        toggleVideo,
        toggleAudio
    } = useWebRTC();

    // 初始化本地流
    useEffect(() => {
        if (!localStream) {
            setIsLoading(true);
            startLocalStream()
                .catch(err => console.error('Failed to start local stream', err))
                .finally(() => setIsLoading(false));
        }
    }, [localStream, startLocalStream]);

    // 将本地流绑定到video元素
    useEffect(() => {
        if (localStream && videoRef.current) {
            videoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    // 处理开始/停止视频
    const handleToggleStream = () => {
        if (localStream) {
            stopLocalStream();
        } else {
            setIsLoading(true);
            startLocalStream()
                .catch(err => console.error('Failed to start local stream', err))
                .finally(() => setIsLoading(false));
        }
    };

    return (
        <div className={`local-stream ${className}`} style={{ height }}>
            <div className="video-container">
                {/* 视频元素 */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted  // 本地流静音，避免回声
                    playsInline
                    className="video"
                />

                {/* 加载状态 */}
                {isLoading && !localStream && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                        <p>正在获取摄像头和麦克风...</p>
                    </div>
                )}

                {/* 未开启状态 */}
                {!localStream && !isLoading && (
                    <div className="offline-overlay">
                        <i className="icon-video-off" />
                        <p>视频未开启</p>
                    </div>
                )}

                {/* 标题 */}
                <div className="stream-title">本地视频</div>
            </div>

            {/* 控制按钮 */}
            {showControls && (
                <div className="controls">
                    <Button
                        variant={localStream ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={handleToggleStream}
                    >
                        {localStream ? '关闭视频' : '开启视频'}
                    </Button>

                    {localStream && (
                        <>
                            <Button
                                variant={videoEnabled ? 'primary' : 'danger'}
                                size="sm"
                                onClick={toggleVideo}
                                isIcon
                            >
                                <i className={videoEnabled ? 'fa fa-video-camera' : 'fa fa-video-camera fa-ban'} />
                            </Button>

                            <Button
                                variant={audioEnabled ? 'primary' : 'danger'}
                                size="sm"
                                onClick={toggleAudio}
                                isIcon
                            >
                                <i className={audioEnabled ? 'fa fa-microphone' : 'fa fa-microphone-slash'} />
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocalStream;
