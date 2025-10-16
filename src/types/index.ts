// 媒体流类型
export type MediaType = 'video' | 'audio' | 'both';

// 连接状态
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed';

// 日志消息类型
export interface LogMessage {
    id: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'error' | 'success';
}

// WebRTC 配置选项
export interface WebRTCConfig {
    iceServers: RTCIceServer[];
    video?: boolean;
    audio?: boolean;
}

// 媒体设备信息
export interface MediaDeviceInfo {
    deviceId: string;
    label: string;
    kind: MediaDeviceKind;
}