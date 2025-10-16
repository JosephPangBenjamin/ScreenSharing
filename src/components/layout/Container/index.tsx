import React from 'react';
import './index.scss';

interface ContainerProps {
    /** 子元素 */
    children: React.ReactNode;
    /** 自定义类名 */
    className?: string;
    /** 是否为流体布局（占满整个宽度） */
    fluid?: boolean;
    /** 内边距大小 */
    padding?: 'sm' | 'md' | 'lg' | 'none';
}

/**
 * 页面容器组件
 * 提供一致的页面布局和间距
 */
const Container: React.FC<ContainerProps> = ({
                                                 children,
                                                 className = '',
                                                 fluid = false,
                                                 padding = 'lg'
                                             }) => {
    // 确定内边距类名
    const paddingClasses = {
        sm: 'padding-sm',
        md: 'padding-md',
        lg: 'padding-lg',
        none: 'padding-none'
    };

    return (
        <div
            className={`container ${fluid ? 'fluid' : ''} ${paddingClasses[padding]} ${className}`}
        >
            {children}
        </div>
    );
};

export default Container;
