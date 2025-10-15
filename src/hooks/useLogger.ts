import { useSetAtom, useAtomValue } from "jotai";
import { logsAtom } from "../store/uiStore.ts";
import { createLogMessage } from "../utils/helpers.ts";
import type { LogMessage } from "../types";

export const useLogger = () => {
    const logs = useAtomValue(logsAtom);
    const setLogs = useSetAtom(logsAtom);

    /**
     * 添加日志消息
     */
    const addLog = (message: string, type: LogMessage['type'] = 'info') => {
        const log = createLogMessage(message, type);
        setLogs(prev => [...prev.slice(-99), log]); // 只保留最近100条日志
    };

    /**
     * 添加信息日志
     */
    const info = (message: string) => addLog(message, 'info');

    /**
     * 添加成功日志
     */
    const success = (message: string) => addLog(message, 'success');

    /**
     * 添加错误日志
     */
    const error = (message: string) => addLog(message, 'error');

    /**
     * 清空日志
     */
    const clearLogs = () => setLogs([]);

    return {
        logs,
        addLog,
        info,
        success,
        error,
        clearLogs,
    };
};

