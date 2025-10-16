import React from 'react';
import { useWebRTC } from '../../../hooks/useWebRTC';
import Button from '../../common/Button';
import { Icons } from '../../common/Button/icons';
import './index.scss';
interface CallControlsProps {
    onEndCall: () => void;
}

/**
 * 通话控制组件
 * 提供视频、音频控制和结束通话功能
 */
const CallControls: React.FC<CallControlsProps> = ({ onEndCall }) => {
    const {
        localStream,
        videoEnabled,
        audioEnabled,
        toggleVideo,
        toggleAudio,
        startLocalStream,
        connectionStatus,
        createOffer
    } = useWebRTC();

    // 判断是否可以开始通话
    const canStartCall = !!localStream && connectionStatus === 'disconnected';

    // 判断是否正在通话中
    const isInCall = connectionStatus === 'connected' || connectionStatus === 'connecting';

    return (
        <div className="call-controls">
            {!localStream ? (
                <Button
                    variant="primary"
                    size="lg"
                    onClick={() => startLocalStream()}
                    icon={Icons.video}
                >
                    开始视频
                </Button>
            ) : (
                <>
                    <Button
                        variant={videoEnabled ? "secondary" : "danger"}
                        size="lg"
                        icon={videoEnabled ? Icons.video : Icons['video-off']}
                        onClick={toggleVideo}
                        disabled={!isInCall}
                    />

                    <Button
                        variant={audioEnabled ? "secondary" : "danger"}
                        size="lg"
                        icon={audioEnabled ? Icons.mic : Icons['mic-off']}
                        onClick={toggleAudio}
                        disabled={!isInCall}
                    />

                    <Button
                        variant="primary"
                        size="lg"
                        onClick={createOffer}
                        disabled={!canStartCall}
                        icon={Icons.phone}
                    >
                        发起通话
                    </Button>

                    <Button
                        variant="danger"
                        size="lg"
                        icon={Icons['end-call']}
                        onClick={onEndCall}
                        disabled={connectionStatus === 'disconnected'}
                    />
                </>
            )}
        </div>
    );
};

export default CallControls;
