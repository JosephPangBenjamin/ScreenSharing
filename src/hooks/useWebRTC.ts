import { useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import {
    localStreamAtom,
    remoteStreamAtom,
    mediaDevicesAtom,
    currentCameraIdAtom,
    currentMicrophoneIdAtom,
    videoEnabledAtom,
    audioEnabledAtom,
} from "../store/mediaStore.ts";

import {
    peerConnectionAtom,
    dataChannelAtom,
    connectionStatusAtom,
    roomIdAtom,
    signalingMessagesAtom,
} from "../store/connectionStore.ts";

import { defaultWebRTCConfig } from "../utils/webrtcConfig.ts";
import { useLogger } from "./useLogger.ts";
import type { WebRTCConfig, MediaType } from "../types";

export const useWebRTC = (config: WebRTCConfig = defaultWebRTCConfig) => {
    // 状态
    const [localStream, setLocalStream] = useAtom(localStreamAtom);
    const [remoteStream, setRemoteStream] = useAtom(remoteStreamAtom);
    const [mediaDevices, setMediaDevices] = useAtom(mediaDevicesAtom);
    const [currentCameraId, setCurrentCameraId] = useAtom(currentCameraIdAtom);
    const [currentMicrophoneId, setCurrentMicrophoneId] = useAtom(currentMicrophoneIdAtom);
    const [videoEnabled, setVideoEnabled] = useAtom(videoEnabledAtom);
    const [audioEnabled, setAudioEnabled] = useAtom(audioEnabledAtom);

    const [peerConnection, setPeerConnection] = useAtom(peerConnectionAtom);
    const [dataChannel, setDataChannel] = useAtom(dataChannelAtom);
    const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
    const [roomId, setRoomId] = useAtom(roomIdAtom);
    const [signalingMessages, setSignalingMessages] = useAtom(signalingMessagesAtom);

    // 日志
    const { info, success, error } = useLogger();
    /**
     * 初始化媒体设备列表
     */
    const initializeMediaDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setMediaDevices(devices);

            // 设置默认设备
            const defaultCamera = devices.find(d => d.kind === 'videoinput');
            const defaultMicrophone = devices.find(d => d.kind === 'audioinput');

            if (defaultCamera) setCurrentCameraId(defaultCamera.deviceId);
            if (defaultMicrophone) setCurrentMicrophoneId(defaultMicrophone.deviceId);

            info("媒体设备已初始化");
        } catch (err) {
            error(`初始化媒体设备失败：${err instanceof Error ? err.message : String(err)}`);
        }
    }, [setMediaDevices, setCurrentCameraId, setCurrentMicrophoneId, info, error]);

    /**
     * 获取本地媒体流
     */
    const startLocalStream = useCallback(async (type: MediaType = 'both') => {
        if (localStream) return;
        try {
            info('正在获取本地媒体流...');

            const constraints: MediaStreamConstraints = {
                video: type === 'video' || type === 'both'
                    ? { deviceId: currentCameraId ? { exact: currentCameraId } : undefined }
                    : false,
                audio: type === 'audio' || type === 'both'
                    ? { deviceId: currentMicrophoneId ? { exact: currentMicrophoneId } : undefined }
                    : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            success("已获取本地媒体流");

            return stream;
        } catch (err) {
            error(`${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }, [localStream, currentCameraId, currentMicrophoneId, setLocalStream, info, success, error]);

    /**
     * 停止本地媒体流
     */
    const stopLocalStream = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
            info('已停止本地媒体流');
        }
    }, [localStream, setLocalStream, info]);

    /**
     * 切换视频启用状态
     */
    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoEnabled(videoTrack.enabled);
                info(`视频已${videoTrack.enabled ? '开启' : '关闭'}`);
            }
        }
    }, [localStream, setVideoEnabled, info]);

    /**
     * 切换音频启用状态
     */
    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setAudioEnabled(audioTrack.enabled);
                info(`音频已${audioTrack.enabled ? '开启' : '关闭'}`);
            }
        }
    }, [localStream, setAudioEnabled, info]);

    // useCallback或者说钩子函数，在任何组件中使用只要引用数组内容没变，就一直用原来的内容
    /**
     * 切换媒体设备
     */
    const switchMediaDevice = useCallback(async (deviceId: string, kind: 'videoinput' | 'audioinput') => {
        if (!localStream) return;
        try {
            info(`正在切换${kind === 'videoinput' ? '摄像头' : '麦克风'}...`);

            // 停止当前轨道
            const tracks = localStream.getTracks().filter(track =>
                (kind === 'videoinput' && track.kind === 'video') ||
                (kind === 'audioinput' && track.kind === 'audio')
            );

            tracks.forEach(track => track.stop());

            // 获取新轨道
            const constraints: MediaStreamConstraints = {
                [kind === 'videoinput' ? 'video' : 'audio']: {
                    deviceId: { exact: deviceId }
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            const newTrack = newStream.getTracks()[0];

            // 替换轨道
            localStream.addTrack(newTrack);

            // 更新对等连接中的轨道
            if (peerConnection) {
                const senders = peerConnection.getSenders().filter(sender => {
                    return sender.track?.kind === newTrack.kind;
                });
                senders.forEach(sender => sender.replaceTrack(newTrack));
            }

            // 更新状态
            if (kind === 'videoinput') {
                setCurrentCameraId(deviceId);
            } else {
                setCurrentMicrophoneId(deviceId);
            }

            success(`${kind === 'videoinput' ? '摄像头' : '麦克风'}已切换`);
        } catch (err) {
            error(`切换${kind === 'videoinput' ? '摄像头' : '麦克风'}失败：${err instanceof Error ? err.message : String(err)}`);
        }
    }, [localStream, peerConnection, setCurrentCameraId, setCurrentMicrophoneId, info, success, error]);

    /**
     * 设置数据通道
     */
    const setupDataChannel = useCallback((channel: RTCDataChannel) => {
        channel.onopen = () => {
            success('数据通道已打开');
        };

        channel.onmessage = (event) => {
            info(`收到消息${event.data}`);
        };

        channel.onmessage = (event) => {
            info(`收到消息：${event.data}`);
        };

        channel.onclose = () => {
            info('数据通道已关闭');
        };

        channel.onerror = (err) => {
            error(`数据通道错误：${err.error}`);
        }
    }, [success, info, error]);

    /**
     * 创建对等连接
     */
    const createPeerConnection = useCallback(async () => {
        if (peerConnection) return peerConnection;

        try {
            info('正在创建对等连接...');

            const pc = new RTCPeerConnection(config);
            setPeerConnection(pc);

            // 监听ICE候选者
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    info('生成ICE候选者');
                    // 实际应用中，这里应该将候选者发送给远程对等体

                }
            };

            // 监听ICE连接状态变化
            pc.oniceconnectionstatechange = () => {
                info(`ICE连接状态：${pc.iceConnectionState}`);

                switch (pc.iceConnectionState) {
                    case "connected":
                        setConnectionStatus('connected');
                        success('对等连接已建立');
                        break;
                    case "failed":
                    case "disconnected":
                        setConnectionStatus('failed');
                        error('对等连接失败或已断开');
                        break;
                    case "closed":
                        setConnectionStatus('disconnected');
                        info('对等连接已关闭');
                        break;
                }
            };

            // 监听远程流
            pc.ontrack = (event) => {
                info('收到远程媒体流');
                setRemoteStream(event.streams[0]);
            };

            // 监听数据通道
            pc.ondatachannel = (event) => {
                info('收到数据通道');
                setDataChannel(event.channel);
                setupDataChannel(event.channel);
            };

            // 添加本地流到连接
            if (localStream) {
                localStream.getTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
            }

            info('对等连接已创建');
            return pc;
        } catch (err) {
            error(`创建对等连接失败：${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }, [peerConnection, config, localStream, setPeerConnection, setConnectionStatus, setRemoteStream, setDataChannel, info, success, error, setupDataChannel]);

    /**
     * 创建数据通道
     */
    const createDataChannel = useCallback(async (label = 'chat') => {
        if (!peerConnection) {
            await createPeerConnection();
        }

        if (peerConnection && !dataChannel) {
            const channel = peerConnection.createDataChannel(label);
            setDataChannel(channel);
            setupDataChannel(channel);
            info(`已创建数据通道：${label}`);
            return channel;
        }

        return dataChannel;
    }, [peerConnection, dataChannel, createPeerConnection, setDataChannel, setupDataChannel, info]);

    /**
     * 发送消息
     */
    const sendMessage = useCallback((message: string) => {
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(message);
            info(`发送消息：${message}`);
            return true;
        }

        error('数据通道未准备好，无法发送消息');
        return false;
    }, [dataChannel, info, error]);

    /**
     * 创建offer
     */
    const createOffer = useCallback(async () => {
        if (!peerConnection) {
            await createPeerConnection();
        }

        if (peerConnection) {
            try {
                setConnectionStatus('connecting');
                info('正在创建offer...');

                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                // 存储offer用于演示，实际应用中会发送给远程对等体
                setSignalingMessages(prev => [...prev, offer]);

                success('Offer已创建');
                return offer;
            } catch (err) {
                error(`创建offer失败：${err instanceof Error ? err.message : String(err)}`);
                setConnectionStatus('failed');
                throw err;
            }
        }
    }, [peerConnection, createPeerConnection, setConnectionStatus, setSignalingMessages, info, success, error]);

    /**
     * 处理收到的offer
     */
    const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
        if (!peerConnection) {
            await createPeerConnection();
        }

        if (peerConnection) {
            try {
                setConnectionStatus('connecting');
                info('正在处理offer...');

                await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);

                // 存储answer用于演示，实际应用中会发送给远程对等体
                setSignalingMessages(prev => [...prev, answer]);

                success('已处理offer并创建answer');
                return answer;
            } catch (err) {
                error(`处理offer失败：${err instanceof Error ? err.message : String(err)}`);
                setConnectionStatus("failed");
                throw err;
            }
        }
    }, [peerConnection, createPeerConnection, setConnectionStatus, setSignalingMessages, info, success, error]);

    /**
     * 处理收到的answer
     */
    const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
        if (peerConnection) {
            try {
                info('正在处理answer...');
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                success('已处理answer');
            } catch (err) {
                error(`处理answer失败:${err instanceof Error ? err.message : String(err)}`);
                setConnectionStatus("failed");
                throw err;
            }
        }
    }, [peerConnection, info, success, error, setConnectionStatus]);

    /**
     * 关闭对等连接
     */
    const closeConnection = useCallback(() => {
        if (peerConnection) {
            peerConnection.close();
            setPeerConnection(null);
            info('对等连接已关闭');
        }

        if (dataChannel) {
            dataChannel.close();
            setDataChannel(null);
            info('数据通道已关闭');
        }

        setRemoteStream(null);
        setConnectionStatus('disconnected');
        setSignalingMessages([]);
    }, [peerConnection, setPeerConnection, info, dataChannel, setDataChannel, setRemoteStream, setConnectionStatus, setSignalingMessages]);

    /**
     * 初始化房间
     */
    const initializeRoom = useCallback((id?: string) => {
        const roomId = id || Math.random().toString(36).substring(2, 10);
        setRoomId(roomId);
        info(`已初始化房间：${roomId}`);
        return roomId;
    }, [setRoomId, info]);

    useEffect(() => {
        initializeMediaDevices();

        return () => {
            stopLocalStream();
            closeConnection();
        }
    }, [initializeMediaDevices, stopLocalStream, closeConnection]);

    return {
        // 媒体流相关
        localStream,
        remoteStream,
        mediaDevices,
        currentCameraId,
        currentMicrophoneId,
        videoEnabled,
        audioEnabled,
        startLocalStream,
        stopLocalStream,
        toggleVideo,
        toggleAudio,
        switchMediaDevice,

        // 连接相关
        peerConnection,
        dataChannel,
        connectionStatus,
        roomId,
        signalingMessages,
        createPeerConnection,
        createDataChannel,
        sendMessage,
        createOffer,
        handleOffer,
        handleAnswer,
        closeConnection,
        initializeRoom,
    }
};