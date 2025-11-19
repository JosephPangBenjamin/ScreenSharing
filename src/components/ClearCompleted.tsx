import { useAtomValue, useSetAtom } from "jotai";
import { completedCountAtom, todosAtom } from "../store/todoAtoms";


const ClearCompleted = () => {
    const setTodos = useSetAtom(todosAtom);
    const completedCount = useAtomValue(completedCountAtom);

    if (completedCount === 0) {
        return null;
    }

    const handleClear = () => {
        setTodos(prev => prev.filter(todo => !todo.completed));
    };

    return (
        <button
            onClick={handleClear}
            style={{
                marginTop: '10px',
                color: '#666',
                border: '1px solid #ddd',
                background: 'white',
                padding: '4px 8px',
                cursor: 'pointer'
            }}
        >
            清除已完成
        </button>
    )
};

export default ClearCompleted;