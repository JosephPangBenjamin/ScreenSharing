import { useAtom } from "jotai";
import { filterAtom } from "../store/todoAtoms";

export default function FilterButtons() {
    const [filter, setFilter] = useAtom(filterAtom);

    return (
        <div style={{ margin: '10px 0' }}>
            <button onClick={() => setFilter('all')} style={{ margin: '0 5px', padding: '4px 8px', background: filter === 'all' ? '#ddd' : 'white' }}>
                全部
            </button>
            <button onClick={() => setFilter('active')} style={{ margin: '0 5px', padding: '4px 8px', background: filter === 'active' ? '#ddd' : 'white' }}>
                未完成
            </button>
            <button onClick={() => setFilter('completed')} style={{ margin: '0 5px', padding: '4px 8px', background: filter === 'completed' ? '#ddd' : 'white' }}>
                已完成
            </button>
        </div>
    )
}