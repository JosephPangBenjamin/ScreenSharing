import React, { useState } from 'react';
import './styles.scss';

// Input尺寸类型
export type InputSize = 'small' | 'medium' | 'large';

// Input属性接口
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: InputSize;
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * iOS风格的Input组件
 */
const Input: React.FC<InputProps> = ({
  size = 'medium',
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // 生成基础样式类
  const baseClasses = [
    'ios-input-container',
    `ios-input-container--${size}`,
    fullWidth && 'ios-input-container--full-width',
    isFocused && 'ios-input-container--focused',
    isHovered && 'ios-input-container--hovered',
    error && 'ios-input-container--error',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={baseClasses}>
      {label && <label className="ios-input__label">{label}</label>}
      <div className="ios-input__wrapper">
        {leftIcon && <span className="ios-input__icon ios-input__icon--left">{leftIcon}</span>}
        <input
          className="ios-input"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          {...props}
        />
        {rightIcon && <span className="ios-input__icon ios-input__icon--right">{rightIcon}</span>}
      </div>
      {error && <span className="ios-input__error">{error}</span>}
    </div>
  );
};

export default Input;