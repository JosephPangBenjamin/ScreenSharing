import {atom} from "jotai";
import type {MediaDeviceInfo} from "../types";
// 本地媒体流状态
export const localStreamAtom = atom<MediaStream | null>(null);

// 远程流媒体状态
export const remoteStreamAtom = atom<MediaStream | null>(null);

// 可用媒体设备状态
export const mediaDevicesAtom = atom<MediaDeviceInfo | null>(null);

// 当前使用的摄像头设备ID
export const currentCameraIdAtom = atom<string | null>(null);

// 当前使用的麦克风设备ID
export const currentMicrophoneIdAtom = atom<string | null>(null);

// 视频是否启用
export const videoEnabledAtom = atom(true);

// 音频是否启用
export const audioEnabledAtom = atom(true);