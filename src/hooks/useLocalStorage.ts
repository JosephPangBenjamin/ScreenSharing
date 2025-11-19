import { useState, useEffect } from "react";

/**
 * 自定义hook
 * 即就是在通过useState/useEffect
 * 如setValue更新内容
 * 如useEffect依赖项改变，执行内部副作用
 * 
 * 1. 包含该Hook状态的组件在hook状态更新时，会从头到尾更新
 * 2. hook函数本身也重新执行
 * @param key 
 * @param initialValue 
 * 
 * localStorage同步操作，频繁更新如每秒多次可能会阻塞渲染
 * 敏感数据如用户信息需加密后存储
 */
export default function useLocalStorage(key: string, initialValue: any) {
    const [value, setValue] = useState(() => {
        try {
            const storedValue = localStorage.getItem(key);
            return storedValue ? JSON.parse(storedValue) : initialValue;
        } catch (err: any) {
            console.error("读取localStorage失败：", err);
            return initialValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(key, JSON.stringify(value));
    }, [key, value]);

    return [value, setValue];
};