import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type {IconDefinition} from '@fortawesome/free-solid-svg-icons'; // 引入图标类型定义
// 引入图标类型定义
import './index.scss';

// 按钮类型定义
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: IconDefinition; // 明确图标类型为FontAwesome的IconDefinition
    prefixIcon?: IconDefinition;
    suffixIcon?: IconDefinition;
    className?: string;
    children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
                                           variant = 'primary',
                                           size = 'md',
                                           icon,
                                           prefixIcon,
                                           suffixIcon,
                                           className = '',
                                           children,
                                           ...props
                                       }) => {
    const baseClasses = `button ${variant} ${size} ${className}`;
    const isIconOnly = icon && !children && !prefixIcon && !suffixIcon;

    return (
        <button
            className={`${baseClasses} ${isIconOnly ? 'icon-button' : ''}`}
            {...props}
        >
            {prefixIcon && (
                <span className="prefix-icon">
                    {/*<FontAwesomeIcon icon={prefixIcon} />*/}
                </span>
            )}
            {icon && (
                <span className="icon">
                    {/*<FontAwesomeIcon icon={icon} />*/}
                </span>
            )}
            {children && <span className="content">{children}</span>}
            {suffixIcon && (
                <span className="suffix-icon">
                    {/*<FontAwesomeIcon icon={suffixIcon} />*/}
                </span>
            )}
        </button>
    );
};

export default Button;
