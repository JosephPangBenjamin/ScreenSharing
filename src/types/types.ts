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