import React, { useEffect, useRef } from 'react';
import type { LogMessage } from '../../../types';
import './index.scss';

interface LoggerProps {
    /** 日志消息列表 */
    logs: LogMessage[];
    /** 是否自动滚动到底部 */
    autoScroll?: boolean;
    /** 日志面板高度 */
    height?: string;
    /** 是否显示时间戳 */
    showTimestamp?: boolean;
    /** 是否允许清空日志 */
    allowClear?: boolean;
    /** 清空日志回调 */
    onClear?: () => void;
}

/**
 * 日志显示组件
 * 用于展示应用运行过程中的各类日志信息
 */
const Logger: React.FC<LoggerProps> = ({
                                           logs = [],
                                           autoScroll = true,
                                           height = '200px',
                                           showTimestamp = true,
                                           allowClear = true,
                                           onClear
                                       }) => {
    const logContainerRef = useRef<HTMLDivElement>(null);

    // 自动滚动到底部
    useEffect(() => {
        if (autoScroll && logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs, autoScroll]);

    // 清空日志处理
    const handleClear = () => {
        if (onClear) {
            onClear();
        }
    };

    // 格式化日期时间
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="logger-container" style={{ height }}>
            <div className="logger-header">
                <h3>系统日志</h3>
                {allowClear && (
                    <button
                        className="clear-button"
                        onClick={handleClear}
                    >
                        清空
                    </button>
                )}
            </div>

            <div className="logs" ref={logContainerRef}>
                {logs.length === 0 ? (
                    <div className="empty-state">暂无日志信息</div>
                ) : (
                    logs.map(log => (
                        <div
                            key={log.id}
                            className={`log-item log-${log.type}`}
                        >
                            {showTimestamp && (
                                <span className="timestamp">{formatTime(log.timestamp)}</span>
                            )}
                            <span className="message">{log.message}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Logger;
