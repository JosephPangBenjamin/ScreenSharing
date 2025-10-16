import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  connectionStatusAtom,
  localStreamAtom,
  remoteStreamAtom,
  localAudioEnabledAtom,
  localVideoEnabledAtom,
  screenSharingEnabledAtom,
  screenStreamAtom,
  messagesAtom,
  roomIdAtom,
  userIdAtom,
  errorMessageAtom,
  signalingTypeAtom
} from '../store/atoms';

// ICE 服务器配置，用于NAT穿透
// 在公网环境中，仅使用STUN服务器可能不够，建议添加TURN服务器以确保更好的连接成功率
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // 可以在这里添加TURN服务器配置
  // { urls: 'turn:your-turn-server.com', username: 'username', credential: 'credential' }
];

// WebSocket信令服务器URL配置 - 生产环境中应使用wss://和真实域名
const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:3000';

// 消息类型定义
type SignalingMessageType = 'offer' | 'answer' | 'ice-candidate' | 'chat' | 'join-room' | 'leave-room' | 'join-success' | 'user-left';

interface SignalingMessage {
  type: SignalingMessageType;
  sender: string;
  roomId: string;
  timestamp: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  message?: string;
  messageId?: string;
}

export const useWebRTC = () => {
  // 状态管理
  const [connectionStatus, setConnectionStatus] = useAtom(connectionStatusAtom);
  const [localStream, setLocalStream] = useAtom(localStreamAtom);
  const [remoteStream, setRemoteStream] = useAtom(remoteStreamAtom);
  const [localAudioEnabled] = useAtom(localAudioEnabledAtom);
  const [localVideoEnabled] = useAtom(localVideoEnabledAtom);
  const [screenSharingEnabled, setScreenSharingEnabled] = useAtom(screenSharingEnabledAtom);
  const [screenStream, setScreenStream] = useAtom(screenStreamAtom);
  const [messages, setMessages] = useAtom(messagesAtom);
  const [roomId, setRoomId] = useAtom(roomIdAtom);
  const userId = useAtomValue(userIdAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const [signalingType] = useAtom(signalingTypeAtom);
  
  // 引用
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const signalingEventListenerRef = useRef<((e: StorageEvent) => void) | null>(null);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  
  // 完美协商模式所需的状态
  const makingOfferRef = useRef<boolean>(false);
  const ignoreOfferRef = useRef<boolean>(false);
  const politeRef = useRef<boolean>(Math.random() > 0.5); // 随机决定是否为"礼貌"端，用于完美协商
  const joinRoomSentRef = useRef<boolean>(false); // 用于跟踪join-room消息是否已发送
  
  // 创建或加入房间
  const createOrJoinRoom = useCallback((id?: string) => {
    const newRoomId = id || `room_${Math.random().toString(36).substring(2, 10)}`;
    setRoomId(newRoomId);
    return newRoomId;
  }, [setRoomId]);
  
  // 初始化本地媒体流
  const initializeLocalStream = useCallback(async (audio = true) => {
    try {
      // 获取用户媒体设备权限
      const stream = await navigator.mediaDevices.getUserMedia({
        audio,
        video: {
          width: {
            ideal: 1920,
            max: 1920
          },
          height: {
            ideal: 1080,
            max: 1080
          },
          frameRate: {
            ideal: 30,
            max: 60
          }
        }
      });
      
      setLocalStream(stream);
      setErrorMessage(null);
      
      // 将流绑定到本地视频元素
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      return stream;
    } catch (error) {
      console.error('获取本地媒体流失败:', error);
      setErrorMessage('无法访问摄像头或麦克风，请确保已授予权限。');
      throw error;
    }
  }, [setLocalStream, setErrorMessage]);
  
  // 创建屏幕共享流
  const startScreenSharing = useCallback(async () => {
    try {
      // 请求屏幕共享权限
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      setScreenStream(screenStream);
      
      // 当屏幕共享停止时的处理
      screenStream.getVideoTracks()[0].onended = () => {
        setScreenSharingEnabled(false);
        setScreenStream(null);
        // 如果正在通话中，重新发送本地视频流
        if (peerConnectionRef.current && localStream) {
          replaceTrack('video', localStream.getVideoTracks()[0]);
        }
      };
      
      // 如果正在通话中，替换视频轨道
      if (peerConnectionRef.current) {
        replaceTrack('video', screenStream.getVideoTracks()[0]);
      }
      
      return screenStream;
    } catch (error) {
      console.error('获取屏幕共享流失败:', error);
      setErrorMessage('无法开始屏幕共享，请确保已授予权限。');
      throw error;
    }
  }, [setScreenStream, setScreenSharingEnabled, localStream]);
  
  // 停止屏幕共享
  const stopScreenSharing = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setScreenSharingEnabled(false);
    
    // 恢复摄像头视频
    if (peerConnectionRef.current && localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        replaceTrack('video', videoTrack);
      }
    }
  }, [screenStream, setScreenStream, setScreenSharingEnabled, localStream]);
  
  // 替换媒体轨道
  const replaceTrack = useCallback((kind: 'audio' | 'video', newTrack: MediaStreamTrack) => {
    if (!peerConnectionRef.current) return;
    
    const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === kind);
    if (sender) {
      sender.replaceTrack(newTrack);
    }
  }, []);
  
  // 切换音频状态
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);
  
  // 切换视频状态
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
    }
  }, [localStream]);
  
  // 创建对等连接 - 实现完美协商模式
  const createPeerConnection = useCallback(async () => {
    try {
      // 创建RTCPeerConnection实例
      const pc = new RTCPeerConnection({ 
        iceServers: ICE_SERVERS,
        // 启用ICE候选者聚合，减少网络流量
        iceCandidatePoolSize: 10 
      });
      peerConnectionRef.current = pc;
      
      // 完美协商模式相关的事件处理
      // 处理远程数据通道的创建
      pc.ondatachannel = (event) => {
        // 如果已经有数据通道，则忽略
        if (dataChannelRef.current) return;
        
        dataChannelRef.current = event.channel;
        setupDataChannelHandlers(dataChannelRef.current);
        console.log('接收到远程创建的数据通道');
      };
      
      // 监听ICE候选者
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // 发送ICE候选者给远程
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate
          });
        } else {
          // ICE候选收集完成
          console.log('ICE候选收集完成');
        }
      };
      
      // 监听ICE连接状态变化
      pc.oniceconnectionstatechange = () => {
        console.log('ICE连接状态:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          console.warn('ICE连接失败，尝试重新连接...');
          // 在ICE连接失败时可以尝试重新启动ICE收集
          setTimeout(() => {
            pc.restartIce();
          }, 1000);
        } else if (pc.iceConnectionState === 'disconnected') {
          console.warn('ICE连接已断开');
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          console.log('ICE连接已建立');
        } else if (pc.iceConnectionState === 'closed') {
          console.log('ICE连接已关闭');
        }
      };
      
      // 监听连接状态变化
      pc.onconnectionstatechange = () => {
        console.log('连接状态:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected');
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          setConnectionStatus('disconnected');
        } else if (pc.connectionState === 'connecting') {
          setConnectionStatus('connecting');
        }
      };
      
      // 监听远程流
      pc.ontrack = (event) => {
        const stream = event.streams[0];
        setRemoteStream(stream);
        
        // 将流绑定到远程视频元素
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        console.log('接收到远程媒体流，包含', stream.getTracks().length, '个轨道');
      };
      
      // 监听远程offer - 完美协商模式核心逻辑
      pc.onnegotiationneeded = async () => {
        try {
          // 标记正在创建offer
          makingOfferRef.current = true;
          
          // 确保媒体轨道按固定顺序添加，解决m-lines顺序不一致问题
          if (localStream) {
            // 移除所有现有的轨道发送器，准备按固定顺序重新添加
            const senders = pc.getSenders();
            senders.forEach(sender => {
              if (sender.track) {
                pc.removeTrack(sender);
              }
            });
            
            // 按严格顺序重新添加轨道：先音频，后视频
            const audioTracks = localStream.getAudioTracks();
            const videoTracks = localStream.getVideoTracks();
            
            // 先添加音频轨道
            audioTracks.forEach(track => {
              pc.addTrack(track, localStream);
            });
            
            // 再添加视频轨道
            videoTracks.forEach(track => {
              pc.addTrack(track, localStream);
            });
          }
          
          // 创建offer选项，确保媒体轨道顺序一致性
          const offerOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
            voiceActivityDetection: false
          };
          
          // 创建并发送offer
          const offer = await pc.createOffer(offerOptions);
          
          // 确保设置本地描述前连接仍然有效
          if (pc.connectionState !== 'closed') {
            await pc.setLocalDescription(offer);
            
            // 发送offer给远程
            sendSignalingMessage({
              type: 'offer',
              offer: offer
            });
          }
        } catch (error) {
          console.error('协商失败:', error);
          // 处理媒体轨道顺序不一致的错误
          if (error instanceof Error && error.message.includes('m-lines order')) {
            console.warn('检测到媒体轨道顺序不一致，尝试重建连接...');
            
            // 更积极的错误处理：清理现有连接并重试
            if (pc.connectionState !== 'closed') {
              pc.close();
            }
            
            // 延迟重建连接，避免立即重试导致的资源竞争
            setTimeout(() => {
              createPeerConnection();
            }, 1000);
            
            setErrorMessage('媒体协商失败，正在尝试重新建立连接...');
          }
        } finally {
          // 重置标记
          makingOfferRef.current = false;
        }
      };
      
      // 如果是发起方且还没有数据通道，则创建数据通道
      if (!dataChannelRef.current) {
        dataChannelRef.current = pc.createDataChannel('chat', {
          ordered: true,  // 保证消息顺序
          negotiated: false // 使用默认协商
        });
        setupDataChannelHandlers(dataChannelRef.current);
      }
      
      // 将本地媒体流添加到对等连接（避免重复添加）
      if (localStream) {
        // 检查是否已经添加过轨道
        const existingTrackIds = new Set(
          pc.getSenders().map(sender => sender.track?.id).filter(id => id !== undefined)
        );
        
        // 按固定顺序添加轨道：先添加音频，再添加视频
        // 这确保了每次协商时媒体轨道的m-lines顺序一致
        const audioTracks = localStream.getAudioTracks();
        const videoTracks = localStream.getVideoTracks();
        
        // 先添加音频轨道
        audioTracks.forEach(track => {
          if (!existingTrackIds.has(track.id)) {
            pc.addTrack(track, localStream);
            console.log(`已添加${track.kind}轨道到对等连接: ${track.id}`);
          }
        });
        
        // 再添加视频轨道
        videoTracks.forEach(track => {
          if (!existingTrackIds.has(track.id)) {
            pc.addTrack(track, localStream);
            console.log(`已添加${track.kind}轨道到对等连接: ${track.id}`);
          }
        });
      }
      
      return pc;
    } catch (error) {
      console.error('创建对等连接失败:', error);
      setErrorMessage('创建WebRTC连接失败');
      throw error;
    }
  }, [localStream, setConnectionStatus, setErrorMessage, setRemoteStream]);
  
  // 设置数据通道事件处理器
  const setupDataChannelHandlers = useCallback((channel: RTCDataChannel) => {
    channel.onopen = () => {
      console.log('数据通道已打开');
    };
    
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // 处理聊天消息
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: `msg_${Date.now()}`,
            text: data.message,
            sender: 'remote',
            timestamp: Date.now()
          }]);
        }
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };
    
    channel.onclose = () => {
      console.log('数据通道已关闭');
      dataChannelRef.current = null;
    };
    
    channel.onerror = (error) => {
      console.error('数据通道错误:', error);
    };
  }, [setMessages]);
  
  // 初始化WebSocket连接
  const initializeWebSocket = useCallback(() => {
    // 确保不会重复发送join-room消息
    joinRoomSentRef.current = false;
    if (signalingType !== 'server' || !roomId || !userId) return;
    
    // 如果已经有连接，先关闭
    if (wsConnectionRef.current) {
      wsConnectionRef.current.close();
      wsConnectionRef.current = null;
    }
    
    try {
      // 创建WebSocket连接
      wsConnectionRef.current = new WebSocket(SIGNALING_SERVER_URL);
      
      // 连接打开时
      wsConnectionRef.current.onopen = () => {
        console.log('WebSocket连接已建立');
        // 延迟发送加入房间消息，确保连接状态稳定
        setTimeout(() => {
          if (wsConnectionRef.current?.readyState === WebSocket.OPEN && !joinRoomSentRef.current) {
            // 标记已发送，防止重复发送
            joinRoomSentRef.current = true;
            // 直接在事件处理器内部生成唯一ID，避免依赖后续定义的函数
            const messageId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${userId}`;
            const joinMessage: SignalingMessage = {
              type: 'join-room',
              sender: userId,
              roomId: roomId,
              timestamp: Date.now(),
              messageId: messageId
            };
            wsConnectionRef.current.send(JSON.stringify(joinMessage));
          }
        }, 100);
      };
      
      // 接收消息
      wsConnectionRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as SignalingMessage;
          
          // 确保消息有messageId，避免重复处理
          if (!message.messageId) {
            console.warn('忽略无messageId的消息');
            return;
          }
          
          // 忽略自己发送的消息
          if (message.sender === userId) return;
          
          // 避免重复处理消息
          if (processedMessagesRef.current.has(message.messageId)) {
            console.log('忽略已处理的消息:', message.messageId);
            return;
          }
          
          // 添加到已处理集合
          processedMessagesRef.current.add(message.messageId);
          
          // 限制集合大小，防止内存泄漏
          if (processedMessagesRef.current.size > 1000) {
            const oldestMessage = processedMessagesRef.current.keys().next().value;
            if (oldestMessage) {
              processedMessagesRef.current.delete(oldestMessage);
            }
          }
          
          // 处理不同类型的消息
          if (message.type === 'join-room' || message.type === 'join-success') {
            console.log('用户加入房间:', message.sender);
            // 新用户加入时，主动创建连接
            if (!peerConnectionRef.current && message.sender !== userId) {
              createPeerConnection();
              // 延迟发送offer，确保对方已准备好
              setTimeout(() => {
                createOffer();
              }, 500);
            }
          } else if (message.type === 'user-left') {
            console.log('用户离开房间:', message.sender);
            // 移除离开的对等连接
            if (connectedPeerIdsRef.current.has(message.sender)) {
              connectedPeerIdsRef.current.delete(message.sender);
              // 如果没有连接的对等方，清理资源
              if (connectedPeerIdsRef.current.size === 0 && peerConnectionRef.current) {
                closeConnection();
              }
            }
          } else if (message.type === 'offer' && message.offer) {
            handleOffer(message.offer).catch(err => {
              console.error('处理Offer出错:', err);
            });
            // 记录连接的对端ID
            connectedPeerIdsRef.current.add(message.sender);
          } else if (message.type === 'answer' && message.answer) {
            handleAnswer(message.answer).catch(err => {
              console.error('处理Answer出错:', err);
            });
            // 记录连接的对端ID
            if (!connectedPeerIdsRef.current.has(message.sender)) {
              connectedPeerIdsRef.current.add(message.sender);
              console.log('已连接到对端:', message.sender);
            }
          } else if (message.type === 'ice-candidate' && message.candidate) {
            handleIceCandidate(message.candidate).catch(err => {
              console.error('处理ICE候选者出错:', err);
            });
          } else if (message.type === 'chat' && message.message) {
            // 处理聊天消息
            setMessages(prev => [...prev, {
              id: `msg_${Date.now()}`,
              text: message.message || '',
              sender: 'remote' as const,
              timestamp: Date.now()
            }]);
          }
        } catch (error) {
          console.error('解析WebSocket消息失败:', error);
        }
      };
      
      // 连接关闭
      wsConnectionRef.current.onclose = () => {
        console.log('WebSocket连接已关闭');
        wsConnectionRef.current = null;
        
        // 尝试重连
        setTimeout(() => {
          console.log('尝试重新连接WebSocket...');
          initializeWebSocket();
        }, 5000);
      };
      
      // 连接错误
      wsConnectionRef.current.onerror = (error) => {
        console.error('WebSocket连接错误:', error);
      };
    } catch (error) {
      console.error('初始化WebSocket连接失败:', error);
      setErrorMessage('连接到信令服务器失败');
    }
  }, [roomId, userId, signalingType, setMessages, setErrorMessage, createPeerConnection]);
  
  // 用于存储已处理的消息ID，避免重复处理
  const processedMessagesRef = useRef<Set<string>>(new Set<string>());
  
  // 用于存储已连接的对等方ID
  const connectedPeerIdsRef = useRef<Set<string>>(new Set<string>());
  
  // 清理连接资源的函数引用 - 用于避免循环依赖
  const closeConnectionRef = useRef<() => void>();

  // 生成唯一ID
  const generateUniqueId = useCallback(() => {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${userId}`;
  }, [userId]);
  
  // 发送信令消息
  const sendSignalingMessage = useCallback((message: Partial<SignalingMessage>) => {
    if (!roomId || !userId) return;
    
    const fullMessage: SignalingMessage = {
      ...message,
      sender: userId,
      roomId: roomId,
      timestamp: Date.now(),
      messageId: generateUniqueId()
    } as SignalingMessage;
    
    console.log(`发送信令消息: ${message.type}`, fullMessage);
    
    if (signalingType === 'localStorage') {
      // 本地存储模式，用于开发和测试，支持同设备多标签页通信
      try {
        // 使用唯一的键名避免同房间内消息冲突
        const messageKey = `rtc_signal_${roomId}_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(messageKey, JSON.stringify(fullMessage));
        
        // 使用自定义事件通知其他标签页
        window.dispatchEvent(new StorageEvent('storage', {
          key: messageKey,
          newValue: JSON.stringify(fullMessage)
        }));
        
        // 短暂延迟后清除消息，避免localStorage膨胀
        setTimeout(() => {
          try {
            localStorage.removeItem(messageKey);
          } catch (e) {
            console.warn('清除localStorage消息失败:', e);
          }
        }, 1000);
      } catch (e) {
        console.error('发送localStorage信令消息失败:', e);
      }
    } else if (signalingType === 'server' && wsConnectionRef.current?.readyState === WebSocket.OPEN) {
      // 公网模式，通过WebSocket发送到信令服务器
      try {
        wsConnectionRef.current.send(JSON.stringify(fullMessage));
      } catch (e) {
        console.error('发送WebSocket信令消息失败:', e);
      }
    }
  }, [roomId, userId, signalingType, generateUniqueId]);
  
  // 创建并发送Offer - 完美协商模式
  const createOffer = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current || await createPeerConnection();
      setConnectionStatus('connecting');
      
      // 标记正在创建offer
      makingOfferRef.current = true;
      
      // 创建Offer - 完美协商模式下的offer配置
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        // 启用trickle ICE，更快地建立连接
        iceRestart: false
      });
      
      // 设置本地描述 - 使用try/catch处理可能的状态错误
      try {
        await pc.setLocalDescription(offer);
        console.log('Offer已设置为本地描述');
        
        // 发送Offer
        sendSignalingMessage({
          type: 'offer',
          offer: offer
        });
      } catch (err) {
        console.warn('设置本地描述失败(可能是因为状态冲突):', err);
      }
      
      return offer;
    } catch (error) {
      console.error('创建Offer失败:', error);
      setErrorMessage('发起通话失败');
      throw error;
    } finally {
      // 重置标记
      makingOfferRef.current = false;
    }
  }, [createPeerConnection, setConnectionStatus, sendSignalingMessage, setErrorMessage]);
  
  // 处理接收到的Offer - 完美协商模式核心逻辑
  const handleOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    try {
      const pc = peerConnectionRef.current || await createPeerConnection();
      setConnectionStatus('connecting');
      
      // 完美协商的核心逻辑：处理并发offer情况
      const offerCollision = (pc.signalingState !== 'stable');
      ignoreOfferRef.current = !politeRef.current && offerCollision;
      
      // 如果不是"礼貌"端且存在冲突，忽略这个offer
      if (ignoreOfferRef.current) {
        console.log('检测到offer冲突，非礼貌端忽略此offer');
        return;
      }
      
      // 设置远程描述
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      
      // 创建Answer
      const answer = await pc.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      
      // 设置本地描述
      await pc.setLocalDescription(answer);
      
      // 发送Answer
      sendSignalingMessage({
        type: 'answer',
        answer: answer
      });
      
      return answer;
    } catch (error) {
      console.error('处理Offer失败:', error);
      // 处理状态错误 - 完美协商模式的冲突解决
      if (error instanceof Error && error.name === 'InvalidStateError') {
        console.warn('状态错误，可能是由于并发协商导致，尝试重新创建连接');
        // 重置连接并重新处理
        if (closeConnectionRef.current) {
          closeConnectionRef.current();
        }
        const pc = await createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage({ type: 'answer', answer });
        return answer;
      }
      setErrorMessage('接受通话失败');
      throw error;
    }
  }, [createPeerConnection, setConnectionStatus, sendSignalingMessage, setErrorMessage]);
  
  // 处理接收到的Answer - 完美协商模式
  const handleAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    try {
      // 确保对等连接已初始化，如果没有则创建
      const pc = peerConnectionRef.current;
      if (!pc) {
        console.warn('收到answer但对等连接未初始化，忽略');
        return;
      }
      
      // 设置远程描述
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Answer已设置为远程描述');
      
      // 更新连接状态
      setConnectionStatus('connected');
    } catch (error) {
      console.error('处理Answer失败:', error);
      // 处理状态错误 - 完美协商模式的冲突解决
      if (error instanceof Error && error.name === 'InvalidStateError') {
        console.warn('Answer状态错误，可能是由于状态不匹配导致');
        // 重置连接并重新处理
        if (closeConnectionRef.current) {
          closeConnectionRef.current();
        }
        const pc = await createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
      setErrorMessage('处理通话响应失败');
    }
  }, [setErrorMessage, setConnectionStatus, createPeerConnection]);
  
  // 处理接收到的ICE候选者
  const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    try {
      // 确保对等连接已初始化
      if (!peerConnectionRef.current) {
        console.warn('对等连接未初始化，先创建连接再添加ICE候选者');
        await createPeerConnection();
      }
      
      const pc = peerConnectionRef.current;
      if (pc && pc.remoteDescription) {
        // 只有当远程描述已设置时才添加ICE候选者
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('成功添加ICE候选者');
        } catch (err) {
          // 忽略无效或过时的ICE候选者
          console.warn('添加ICE候选者失败(可能是过时的候选者):', err);
        }
      } else {
        console.warn('远程描述未设置，无法添加ICE候选者');
        // 在实际应用中，可以将候选者缓存，等远程描述设置后再添加
      }
    } catch (error) {
      console.error('处理ICE候选者失败:', error);
    }
  }, [createPeerConnection]);
  
  // 监听信令消息（localStorage模式）- 支持同设备多标签页通信
  const setupSignalingListener = useCallback(() => {
    if (signalingType !== 'localStorage' || !roomId) return;
    
    // 移除之前的监听器
    if (signalingEventListenerRef.current) {
      window.removeEventListener('storage', signalingEventListenerRef.current);
    }
    
    // 使用Set存储已处理的消息ID，避免重复处理
    const processedMessages = new Set<string>();
    
    // 创建新的监听器
    const handleStorageChange = (e: StorageEvent) => {
      // 检查是否是当前房间的消息，使用正则表达式匹配
      if (e.key && e.key.startsWith(`rtc_signal_${roomId}_`) && e.newValue) {
        try {
          const message = JSON.parse(e.newValue) as SignalingMessage;
          
          // 忽略自己发送的消息
          if (message.sender === userId) return;
          
          // 生成唯一消息ID用于去重
          const messageId = `${message.sender}_${message.timestamp}_${message.type}`;
          
          // 避免重复处理
          if (processedMessages.has(messageId)) {
            console.log('消息已处理过，忽略:', messageId);
            return;
          }
          
          // 添加到已处理集合
          processedMessages.add(messageId);
          
          // 限制Set大小，防止内存泄漏
          if (processedMessages.size > 100) {
            // 移除最早添加的消息
              const firstKey = processedMessages.values().next().value;
              if (firstKey) {
                processedMessages.delete(firstKey);
              }
          }
          
          console.log(`接收到${message.type}类型的信令消息`);
          
          // 处理不同类型的消息
          if (message.type === 'offer' && message.offer) {
            handleOffer(message.offer).catch(err => {
              console.error('处理Offer出错:', err);
            });
          } else if (message.type === 'answer' && message.answer) {
            handleAnswer(message.answer).catch(err => {
              console.error('处理Answer出错:', err);
            });
          } else if (message.type === 'ice-candidate' && message.candidate) {
            handleIceCandidate(message.candidate).catch(err => {
              console.error('处理ICE候选者出错:', err);
            });
          } else if (message.type === 'chat' && message.message) {
            // 处理聊天消息
            setMessages(prev => [...prev, {
              id: `msg_${Date.now()}`,
              text: message.message || '',
              sender: 'remote' as const,
              timestamp: Date.now()
            }]);
          }
        } catch (error) {
          console.error('解析信令消息失败:', error);
        }
      }
    };
    
    // 保存监听器引用
    signalingEventListenerRef.current = handleStorageChange;
    
    // 添加事件监听器
    window.addEventListener('storage', handleStorageChange);
    
    // 清理函数
    return () => {
      if (signalingEventListenerRef.current) {
        window.removeEventListener('storage', signalingEventListenerRef.current);
      }
    };
  }, [roomId, userId, signalingType, handleOffer, handleAnswer, handleIceCandidate, setMessages]);
  
  // 发送聊天消息
  const sendChatMessage = useCallback((message: string) => {
    if (dataChannelRef.current?.readyState === 'open') {
      dataChannelRef.current.send(JSON.stringify({
        type: 'chat',
        message: message
      }));
      
      // 添加到本地消息列表
      setMessages(prev => [...prev, {
        id: `msg_${Date.now()}`,
        text: message,
        sender: 'local',
        timestamp: Date.now()
      }]);
    }
  }, [setMessages]);
  
  // 关闭连接
  const closeConnection = useCallback(() => {
    // 存储函数引用以避免循环依赖
    closeConnectionRef.current = closeConnection;
    // 关闭对等连接
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // 关闭数据通道
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    
    // 停止远程流
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      setRemoteStream(null);
    }
    
    // 停止屏幕共享
    stopScreenSharing();
    
    // 更新状态
    setConnectionStatus('disconnected');
  }, [remoteStream, setRemoteStream, setConnectionStatus, stopScreenSharing]);
  
  // 清理本地资源
  const cleanupResources = useCallback(() => {
    // 停止本地流
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    
    // 停止屏幕共享
    stopScreenSharing();
    
    // 关闭连接
    closeConnection();
    
    // 移除信令监听器
    if (signalingEventListenerRef.current) {
      window.removeEventListener('storage', signalingEventListenerRef.current);
      signalingEventListenerRef.current = null;
    }
  }, [localStream, setLocalStream, stopScreenSharing, closeConnection]);
  
  // 监听roomId变化，设置信令监听器
  useEffect(() => {
    if (roomId) {
      if (signalingType === 'localStorage') {
        setupSignalingListener();
      } else if (signalingType === 'server') {
        // 初始化WebSocket连接
        initializeWebSocket();
      }
    }
    
    // 清理函数
    return () => {
      if (signalingEventListenerRef.current) {
        window.removeEventListener('storage', signalingEventListenerRef.current);
      }
      
      // 关闭WebSocket连接
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close();
      }
    };
  }, [roomId, signalingType, setupSignalingListener, initializeWebSocket]);
  
  // 单独的effect用于发送join-room消息，避免循环依赖
  useEffect(() => {
    if (roomId && !joinRoomSentRef.current) {
      // 发送join-room消息通知其他用户
      setTimeout(() => {
        sendSignalingMessage({
          type: 'join-room'
        });
        // 标记已发送，避免重复发送
        joinRoomSentRef.current = true;
      }, 100);
    }
    
    // 当roomId改变时重置标记
    return () => {
      joinRoomSentRef.current = false;
    };
  }, [roomId, sendSignalingMessage]);
  
  // 监听本地音视频状态变化
  useEffect(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = localAudioEnabled;
      });
    }
  }, [localAudioEnabled, localStream]);
  
  useEffect(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = localVideoEnabled;
      });
    }
  }, [localVideoEnabled, localStream]);
  
  // 监听屏幕共享状态变化
  useEffect(() => {
    if (screenSharingEnabled && !screenStream) {
      startScreenSharing();
    } else if (!screenSharingEnabled && screenStream) {
      stopScreenSharing();
    }
  }, [screenSharingEnabled, screenStream, startScreenSharing, stopScreenSharing]);
  
  // 组件卸载时清理资源
  useEffect(() => {
    return () => {
      cleanupResources();
      
      // 确保WebSocket连接关闭
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close();
        wsConnectionRef.current = null;
      }
    };
  }, [cleanupResources]);
  
  return {
    // 状态
    connectionStatus,
    localStream,
    remoteStream,
    messages,
    roomId,
    
    // 引用
    localVideoRef,
    remoteVideoRef,
    
    // 方法
    createOrJoinRoom,
    initializeLocalStream,
    initializeWebSocket, // 导出WebSocket初始化方法
    createOffer,
    handleOffer,
    handleAnswer, // 导出handleAnswer方法供需要时使用
    sendChatMessage,
    toggleAudio,
    toggleVideo,
    startScreenSharing,
    stopScreenSharing,
    closeConnection,
    cleanupResources
  };
};