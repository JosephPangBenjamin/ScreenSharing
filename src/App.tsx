import React, { useEffect } from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { useLogger } from './hooks/useLogger';

// 导入组件
import VideoPlayer from './components/common/VideoPlayer';
import CallControls from './components/call/CallControls';
import Logger from './components/common/Logger';
import Header from './components/layout/Header';
import Container from './components/layout/Container';

const App: React.FC = () => {
    // 从自定义钩子获取WebRTC功能
    const {
        localStream,
        remoteStream,
        roomId,
        initializeRoom,
        startLocalStream,
        stopLocalStream,
        closeConnection,
        createOffer,
    } = useWebRTC();

    // 获取日志功能
    const { logs } = useLogger();

    // 初始化房间
    useEffect(() => {
        initializeRoom("5");
        return () => {
            // 组件卸载时清理资源
            stopLocalStream();
            closeConnection();
        };
    }, [initializeRoom, stopLocalStream, closeConnection]);

    // 处理开始通话
    const handleStartCall = async () => {
        if (!localStream) {
            await startLocalStream();
            // 开始通话后创建offer
            if (!remoteStream) {
                await createOffer();
            }
        }
    };

    // 处理结束通话
    const handleEndCall = () => {
        closeConnection();
        stopLocalStream();
    };

    return (
        <div className="app">
            <Header title="WebRTC 视频通话" />

            <Container>
                {/* 房间信息 */}
                {roomId && (
                    <div className="room-info">
                        <p>房间ID: {roomId}</p>
                    </div>
                )}

                {/* 视频区域 */}
                <div className="video-container">
                    <VideoPlayer
                        stream={localStream}
                        title="本地视频"
                        isLocal={true}
                    />

                    <VideoPlayer
                        stream={remoteStream}
                        title="远程视频"
                        placeholder={<p>等待对方加入...</p>}
                    />
                </div>

                {/* 通话控制 */}
                <CallControls
                    onEndCall={handleEndCall}
                />

                {/* 日志面板 */}
                <Logger logs={logs} />
            </Container>
        </div>
    );
};

export default App;
