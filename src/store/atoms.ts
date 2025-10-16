import { atom } from 'jotai';

// WebRTC 连接状态
export const connectionStatusAtom = atom<'disconnected' | 'connecting' | 'connected'>('disconnected');

// 本地视频流
export const localStreamAtom = atom<MediaStream | null>(null);

// 远程视频流
export const remoteStreamAtom = atom<MediaStream | null>(null);

// 本地音频状态
export const localAudioEnabledAtom = atom(true);

// 本地视频状态
export const localVideoEnabledAtom = atom(true);

// 本地屏幕共享状态
export const screenSharingEnabledAtom = atom(false);

// 屏幕共享流
export const screenStreamAtom = atom<MediaStream | null>(null);

// 消息列表
export const messagesAtom = atom<Array<{ id: string; text: string; sender: 'local' | 'remote' | 'system'; timestamp: number }>>([]);

// 当前输入的消息
export const currentMessageAtom = atom('');

// 房间ID
export const roomIdAtom = atom<string>('');

// 用户ID (随机生成)
export const userIdAtom = atom(() => {
  // 生成一个随机的用户ID
  return `user_${Math.random().toString(36).substring(2, 11)}`;
});

// 错误信息
export const errorMessageAtom = atom<string | null>(null);

// 信令服务器类型 ('localStorage' 用于局域网, 'server' 用于公网)
export const signalingTypeAtom = atom<'localStorage' | 'server'>('server');