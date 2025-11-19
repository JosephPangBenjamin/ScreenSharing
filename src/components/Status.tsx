import { useAtomValue } from "jotai"
import { activeCountAtom } from "../store/todoAtoms"
/**
 * 使用useAtomValue(atom)替代useAtom(atom)[0]，语义更清晰，且内部实现一致。
 * 若组件只需要更新函数，可用useSetAtom(atom)（如const setFilter = useSetAtom(filterAtom)），避免因值变化导致组件重渲染。
 * @returns 
 */
const Stats = () => {
    const activeCount = useAtomValue(activeCountAtom);

    return (
        <div style={{ marginTop: '20px', color: '#666' }}>
            还有{activeCount}项未完成
        </div>
    )
};

export default Stats;