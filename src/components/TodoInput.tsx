import { useState } from "react"


export const TodoInput = ({ onAddTodo }: { onAddTodo: (text: string) => void }) => {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); // 阻止表单默认提交行为, 刷新页面
        if (!text.trim()) return;
        onAddTodo(text);
        setText('');
    }
    return (
        <form onSubmit={handleSubmit} style={{ marginBottom: '20px'}}>
            <input
                type="text"
                value={text}
                //  这里为啥不写个用useCallback包裹的函数，不然每次都要重新创建一个函数
                onChange={e => setText(e.target.value)}
                placeholder="Add a new todo"
                style={{ width: '300px', padding: '8px'}}
            />
            <button type="submit" style={{ marginLeft: '10px',padding: '8px 16px'}}>
                添加
            </button>
        </form>
    )
}