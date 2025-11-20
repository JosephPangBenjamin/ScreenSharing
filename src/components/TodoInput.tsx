import { useState } from "react";
import "./TodoInput.scss";


export const TodoInput = ({ onAddTodo }: { onAddTodo: (text: string) => void }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // 阻止表单默认提交行为, 刷新页面
        if (!text.trim()) return;
        onAddTodo(text);
        setText('');
    }
    return (
        <form onSubmit={handleSubmit} className="todo-input-container">
            <div className="input-container">
                <input
                    className="input-sample"
                    type="text"
                    value={text}
                    //  这里为啥不写个用useCallback包裹的函数，不然每次都要重新创建一个函数
                    onChange={e => setText(e.target.value)}
                    placeholder="添加一个新待办"
                />
            </div>
            <button type="submit">
                添加
            </button>
        </form>
    )
}