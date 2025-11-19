// src/types.ts - 类型定义
export interface Participant {
  id: string;
  name: string;
  videoStream?: MediaStream;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'failed';
  networkQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'file';
  fileName?: string;
  fileUrl?: string;
  status: 'sending' | 'sent' | 'received' | 'failed';
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  senderId: string;
  recipientId?: string;
}


/**
 * 变量是每次渲染独立的快照，使用变量永远想着这是tmp
 * 1. 函数式更新获取最新状态
 * 2. useRef保存最新值
 * 3. useEffect依赖变量执行操作
 */