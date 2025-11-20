import { useAtom } from "jotai";
import { priorityFilterAtom } from "../store/todoAtoms";


const PriorityFilter = () => {
    const [priorityFilter, setPriorityFilter] = useAtom(priorityFilterAtom);

    return (
        <div style={{ margin: '10px 0' }}>
            <span style={{ marginRight: '8px' }}>优先级</span>
            {
                ['all', 'high', 'medium', 'low'].map(value => {
                    return (
                        <button
                            key={value}
                            onClick={() => setPriorityFilter(value)}
                            style={{
                                margin: '0 4px',
                                padding: '2px 6px',
                                background: priorityFilter === value ? '#ddd' : 'white',
                                border: '1px solid #ccc'
                            }}
                        >
                            {value === "all" ? '全部' : value === 'high' ? '高' : value === 'medium' ? "中" : '低'}
                        </button>
                    )
                })
            }
        </div>
    )
};
export default PriorityFilter;