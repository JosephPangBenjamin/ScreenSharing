import { atom } from "jotai";
import type {LogMessage} from "../types";

// 日志消息状态
export const logsAtom = atom<LogMessage[]>([]);

// 是否显示设置面板
export const showSettingsAtom = atom(false);

// 是否全屏显示
export const isFullscreenAtom = atom(false);