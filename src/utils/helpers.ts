import type { LogMessage } from "../types";

/**
 * 生成唯一ID
 */
export const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 2 + 5);
};

/**
 * 创建日志消息
 */
export const createLogMessage = (
    message: string,
    type: LogMessage['type'] = 'info'
): LogMessage => {
    return {
        id: generateId(),
        message,
        timestamp: new Date(),
        type,
    }
};

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'});
};