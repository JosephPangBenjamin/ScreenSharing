import {atom} from "jotai";
import type {ConnectionStatus} from "../types";

// 对等连接状态
export const peerConnectionAtom = atom<RTCPeerConnection | null>(null);

// 数据通道状态
export const dataChannelAtom = atom<RTCDataChannel | null>(null);

// 连接状态
export const connectionStatusAtom = atom<ConnectionStatus>('disconnected');

// 房间ID状态
export const roomIdAtom = atom<string | null>(null);

// 信令消息状态（用于演示，实际应用中会通过服务器）
export const signalingMessagesAtom = atom<RTCSessionDescriptionInit[]>([]);
