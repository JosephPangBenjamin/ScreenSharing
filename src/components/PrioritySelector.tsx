

import { memo } from "react";

export const priorityOptions = {
    high: { label: '高', color: '#ff4444' },
    medium: { label: '中', color: '#ffdd44' },
    low: { label: '低', color: '#44dd44' },
};

const PrioritySelector = memo(({ priority, onPriorityChange }: { priority: string, onPriorityChange: () => void }) => {
    return (
        <select
            value={priority}
            onChange={(e) => onPriorityChange(e.target.value)}
            style={{
                marginLeft: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px',
            }}
        >
            {
                Object.entries(priorityOptions).map(([value, { label }]) => {
                    <option key={value} value={value}>
                        {label}
                    </option>
                })
            }
        </select>
    )
});

export default PrioritySelector;