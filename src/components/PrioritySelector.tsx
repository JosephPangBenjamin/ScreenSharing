

import { memo } from "react";

export const priorityOptions = {
    high: { label: '高', color: '#ff4444' },
    medium: { label: '中', color: '#ffdd44' },
    low: { label: '低', color: '#44dd44' },
};

const PrioritySelector = memo(({ id, priority, onPriorityChange }: { id: number, priority: string, onPriorityChange: (id: number, text: string) => void }) => {

    const test = Object.entries(priorityOptions).map(([value, { label }]) => {
        return (
            <option key={value} value={value}>
                {label}
            </option>
        )
    });

    return (
        <select
            value={priority}
            onChange={(e) => onPriorityChange(id, e.target.value)}
            style={{
                marginLeft: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '2px',
            }}
        >
            {test}
        </select>
    )
});

export default PrioritySelector;