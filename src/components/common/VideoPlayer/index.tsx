import React, { useRef, useEffect } from "react";

interface VideoPlayerProps {
    stream: MediaStream | null,
    title: string,
    isLocal?: boolean,
    className?: string,
    placeholder?: React.ReactNode
}

/**
 * 视频播放组件
 * 用于显示本地或远程媒体流
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({
    stream,
    title,
    isLocal = false,
    className = '',
    placeholder
}) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // 当媒体流变化时更新视频
    useEffect(() => {
        if (videoRef.current && stream) {
            // 避免重复设置相同的流
            if (videoRef.current.srcObject !== stream) {
                videoRef.current.srcObject = stream;
            }
        }
    }, [stream]);

    return (
        <div className={`video-player ${className} ${!stream ? 'has-placeholder' : ''}`}>
            <div className="video-player__header">
                <h3 className="video-player__title">{ title }</h3>
                { isLocal && <span className="video-player__indicator">本地</span> }
            </div>

            <div className="video-player__container">
                <video
                    ref={videoRef}
                    autoPlay={true}
                    muted={isLocal} // 本地流自动静音，避免回声音
                    playsInline={true}
                    className="video-player__element"
                >
                    {!stream && (
                        <div className="video-player__placeholder">
                            { placeholder || (
                                <div className="video-player__placeholder-content">
                                    <i className="icon-video-off" />
                                    <p>等待视频流...</p>
                                </div>
                            )}
                        </div>
                    )}
                </video>
            </div>
        </div>
    )
};

export default VideoPlayer;