import React from 'react';
import './styles.scss';

// Button变体类型
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline' | 'ghost';

// Button尺寸类型
export type ButtonSize = 'small' | 'medium' | 'large';

// Button属性接口
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * iOS风格的Button组件
 */
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  ...props
}) => {
  // 生成基础样式类
  const baseClasses = [
    'ios-button',
    `ios-button--${variant}`,
    `ios-button--${size}`,
    fullWidth && 'ios-button--full-width',
    loading && 'ios-button--loading',
    disabled && 'ios-button--disabled',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button
      className={baseClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="ios-button__loading-spinner" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className="ios-button__icon ios-button__icon--left">
              {icon}
            </span>
          )}
          <span className="ios-button__text">{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="ios-button__icon ios-button__icon--right">
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  );
};

export default Button;