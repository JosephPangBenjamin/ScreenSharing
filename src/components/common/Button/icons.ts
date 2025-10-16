import {
    faVideo,               // 视频图标（原 video）
    faVideoSlash,          // 视频关闭图标（原 video-off）
    faMicrophone,          // 麦克风图标（原 mic）
    faMicrophoneSlash,     // 麦克风关闭图标（原 mic-off）
    faPhone,               // 电话图标（原 phone）
    faPhoneSlash,          // 结束通话图标（原 end-call）
    faUser,                // 用户图标（原 user）
    faCog,                 // 设置图标（原 settings）
    faRefresh,             // 刷新图标（原 refresh）
    faPlus,                // 加号图标（原 plus）
    faMinus,               // 减号图标（原 minus）
    faXmark,               // 关闭图标（原 close）
    faCheck,               // 确认图标（原 check）
    faInfo,                // 信息图标（原 info）
    faExclamationTriangle, // 警告图标（原 warning）
    faVolumeHigh,          // 高音量图标（原 volume-high）
    faVolumeOff            // 静音图标（原 volume-off）
} from '@fortawesome/free-solid-svg-icons';

// 保持对外的友好名称（无需带fa前缀），但内部映射到正确的图标
export const Icons = {
    video: faVideo,
    'video-off': faVideoSlash,
    mic: faMicrophone,
    'mic-off': faMicrophoneSlash,
    phone: faPhone,
    'end-call': faPhoneSlash,
    user: faUser,
    settings: faCog,
    refresh: faRefresh,
    plus: faPlus,
    minus: faMinus,
    close: faXmark,
    check: faCheck,
    info: faInfo,
    warning: faExclamationTriangle,
    'volume-high': faVolumeHigh,
    'volume-off': faVolumeOff
};
