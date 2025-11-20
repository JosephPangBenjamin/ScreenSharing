import { useState, memo, useRef, useEffect } from "react";
import PrioritySelector, { priorityOptions } from "./PrioritySelector";

/**
 * React.memo默认进行浅比较，若 props 是对象 / 函数，需确保引用稳定（否则缓存失效）。
 * 对于简单组件，React.memo的比较成本可能高于重渲染成本，无需滥用。
 */
export const TodoItem = memo(({ todo, onToggle, onDelete, onUpdate, onPriorityChange }: {
    todo: { id: number; text: string; completed: boolean };
    onToggle: (id: number) => void;
    onDelete: (id: number) => void;
    onUpdate: (id: number, text: string) => void;
    onPriorityChange: (id: number, text: string) => void;
}) => {

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editText, setEditText] = useState<string>(todo.text);
    const editInputRef = useRef(null);

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleSave = () => {
        const trimmedText = editText.trim(); // 空白删除
        if (trimmedText && trimmedText !== todo.text) {
            onUpdate(todo.id, trimmedText);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: any) => {
        if (e.key === "Escape") {
            setEditText(todo.text); // 恢复原始文本
            setIsEditing(false);
        } else if (e.key === "Enter") {
            handleSave();
        }
    };

    /**
     * useRef与useEffect结合：实现编辑框自动聚焦，提升用户体验。
     * 键盘事件处理（ESC/Enter）：覆盖多种用户操作习惯
     */
    useEffect(() => {
        if (isEditing && editInputRef.current) {
            editInputRef.current.focus();
        }
    }, [isEditing]);

    if (isEditing) {
        return (
            <div
                style={{ margin: '8px 0', padding: '8px', border: '1px solid #eee' }}
            >
                <input
                    ref={editInputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSave} // 失焦保存
                    onKeyDown={handleKeyDown}
                    style={{ width: '250px', padding: '4px' }}
                />
            </div>
        )
    }
    return (
        <div
            style={{ margin: '8px 0', padding: '8px', border: '1px solid #eee', borderRadius: '16px', background: '#f0f4f9' }}
            onDoubleClick={handleDoubleClick}
        >
            <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: priorityOptions[todo.priority]?.color,
                marginRight: '8px',
            }}></span>
            <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo.id)}
                style={{ marginRight: '8px' }}
            />
            <span style={{ textDecoration: todo.completed ? "line-through" : 'none' }}>
                {todo.text}
            </span>
            <button
                onClick={() => onDelete(todo.id)}
                style={{ marginLeft: '10px', color: 'red', border: 'none', background: 'none' }}
            >
                删除
            </button>
            <PrioritySelector
                id={todo.id}
                priority={todo.priority}
                onPriorityChange={onPriorityChange}
            />

        </div>
    )
});