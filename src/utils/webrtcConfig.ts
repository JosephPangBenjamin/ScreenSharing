import type { WebRTCConfig } from "../types";

// 默认的WebRTC配置
export const defaultWebRTCConfig: WebRTCConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // 生产环境中可以添加TURN服务器
        // {
        //   urls: 'turn:your-turn-server.com:3478',
        //   username: 'username',
        //   credential: 'credential'
        // }
    ],
    video: true,
    audio: true
}