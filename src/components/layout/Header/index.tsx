import React from 'react';
import { useAtom } from 'jotai';
import { showSettingsAtom } from '../../../store/uiStore';
import Button from '../../common/Button';
import './index.scss';

interface HeaderProps {
    /** 页面标题 */
    title: string;
    /** 副标题 */
    subtitle?: string;
    /** 是否显示设置按钮 */
    showSettingsButton?: boolean;
}

/**
 * 页面头部组件
 * 显示应用标题和全局操作按钮
 */
const Header: React.FC<HeaderProps> = ({
                                           title,
                                           subtitle,
                                           showSettingsButton = true
                                       }) => {
    const [showSettings, setShowSettings] = useAtom(showSettingsAtom);

    // 切换设置面板显示状态
    const toggleSettings = () => {
        setShowSettings(!showSettings);
    };

    return (
        <header className="app-header">
            <div className="header-content">
                <div className="app-title">
                    <h1>{title}</h1>
                    {subtitle && <p className="subtitle">{subtitle}</p>}
                </div>

                <div className="header-actions">
                    {showSettingsButton && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleSettings}
                            prefixIcon={<i className="fa fa-cog"></i>}
                        >
                            设置
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
