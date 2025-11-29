# 产品需求文档 (PRD) - WebRTC MVP

## 1. 产品概述

### 1.1 核心目标 (Mission)
打造一个**零门槛、即用即走**的跨平台实时通信工具，让连接像呼吸一样自然，无需繁琐的注册流程。

### 1.2 用户画像 (Persona)
*   **临时协作者 (The Ad-hoc Collaborator):** 需要快速拉人开会讨论问题，不想交换微信或强制对方注册账号。痛点：现有工具注册流程繁琐，临时沟通成本高。
*   **跨设备用户 (The Cross-Device User):** 需要在自己的电脑和手机之间快速传输画面或测试设备。痛点：设备间协作和内容分享不便捷。

## 2. 产品路线图 (Product Roadmap)

### 2.1 V1: 最小可行产品 (MVP) - "The Connection"
*本版本专注于建立稳定、高质量的点对点连接。*
*   **核心功能:**
    *   **极简大厅:** 用户输入 "房间号" (4-6位数字或字母) + "昵称" (自定义) 即可进入。
    *   **1v1 音视频通话:** 基于 WebRTC 标准协议实现，支持高清音视频。
    *   **基础控制:** 提供麦克风静音/解除、摄像头开关、挂断通话功能。
    *   **PC 屏幕分享:** 仅限 PC 端浏览器可发起屏幕分享，移动端和 PC 端均可观看分享的屏幕内容。
    *   **实时文字聊天:** 通过 WebRTC DataChannel 实现房间内在线即时文字消息通信，消息不存储，随会话结束而消失。
    *   **本地截图:** 提供一键功能，截取当前正在观看的远程视频画面，并作为图片文件下载到本地设备。
    *   **响应式布局:** 界面能够完美适配桌面 (Desktop) 和移动端 (Mobile) 浏览器，提供良好的用户体验。

### 2.2 V2 及以后版本 (Future Releases)
*   **V1.5 (Utility Pack):**
    *   **实时文件传输:** 基于 WebRTC DataChannel 实现点对点文件传输。
    *   **背景虚化/替换:** 增加视频通话中的背景处理功能，提升隐私性或趣味性。
*   **V2.0 (Power User):**
    *   **服务端录制:** 支持将通话内容（音视频、屏幕分享）录制并存储在服务器。
    *   **多人会议:** 升级为 SFU (Selective Forwarding Unit) 架构，支持多方音视频通话。
    *   **白板协作:** 提供实时在线白板功能，方便会议中的共同创作。
*   **V3.0 (Ecosystem):**
    *   **用户账户体系:** 实现用户注册、登录、个人资料管理。
    *   **联系人列表:** 建立好友或联系人管理功能。
    *   **会议预约:** 提供会议日程安排和邀请功能。

### 2.3 关键业务逻辑 (Business Rules)
*   **房间限制:** 每个房间 ID **严格限制 2 人**。当第三个用户尝试加入同一房间时，系统会提示“房间已满”。
*   **数据隐私:** 所有音视频流和聊天消息均采用点对点 (P2P) 传输，不经过服务器存储（信令数据除外），确保用户通信内容的隐私性。
*   **状态同步:** 若通话一方断线、刷新页面或主动挂断，另一方应立即收到相应提示。系统应具备基础的重连机制或引导用户结束通话。

### 2.4 数据契约 (Data Contract - MVP 版本)
主要通过 WebSocket 信令服务器进行数据交换。
*   **Socket Events:**
    *   `join_room`: 用户请求加入房间。
    *   `room_full`: 房间人数已满的响应。
    *   `user_joined`: 新用户加入房间的通知。
    *   `offer`: WebRTC SDP Offer 的传输。
    *   `answer`: WebRTC SDP Answer 的传输。
    *   `ice_candidate`: WebRTC ICE 候选者的传输。
    *   `chat_message`: 实时聊天消息的传输。
    *   `user_left`: 用户离开房间的通知。
    *   `disconnect`: WebSocket 连接断开事件。

## 3. MVP 原型设计 - 方案 A: "沉浸式 (The Zen)"

### 3.1 理念说明
**理念：** 视频即一切。界面设计将最大化视频区域，提供极致的沉浸式观看体验。聊天区域和控制栏默认采用半透明悬浮或智能隐藏的方式，仅在用户需要时出现，以减少视觉干扰，适合追求专注沟通和视觉流畅性的用户。

### 3.2 界面示意图 (ASCII Art)

```text
+--------------------------------------------------+
|  [远程用户大画面 100% 覆盖]                      |
|                                                  |
|           +-------------------------+            |
|           |  本地预览 (PIP)          |            |
|           |  (半透明/可拖动)          |            |
|           +-------------------------+            |
|                                                  |
|  [ 消息气泡: 你好! ]  (2-3条最新消息, 半透明)        |
|                                                  |
|  +--------------------------------------------+  |
|  | ( 麦克风 ) ( 挂断 ) ( 摄像头 ) ( 💬 聊天 ) |  |
|  +--------------------------------------------+  |
|  (底部工具栏，悬浮/半透明，鼠标移入/点击时展开)      |
+--------------------------------------------------+
特点：极简、沉浸。聊天内容以轻量级气泡或弹幕形式展示，点击 "💬 聊天" 按钮可展开/收起聊天侧边栏或浮窗。
```

## 4. 架构设计蓝图 (Architecture Design Blueprint)

### 4.1 核心流程图 (Core Flow Diagram)
我们将使用 Mermaid 序列图来描绘用户加入房间到建立音视频通话的核心流程。这主要涉及信令服务器和两个对等客户端之间的交互。

```mermaid
sequenceDiagram
    participant UserA as 用户A (Client A)
    participant UserB as 用户B (Client B)
    participant SignalingServer as 信令服务器 (WebSocket)

    Note over UserA,UserB: 用户A和用户B都打开应用，输入房间号和昵称
    UserA->>SignalingServer: 1. JOIN_ROOM {roomId, userIdA}
    UserB->>SignalingServer: 2. JOIN_ROOM {roomId, userIdB}

    SignalingServer-->>UserA: 3. ROOM_JOINED {roomId, userIdA}
    SignalingServer-->>UserB: 4. ROOM_JOINED {roomId, userIdB}

    alt 房间已满
        UserC->>SignalingServer: JOIN_ROOM {roomId, userIdC}
        SignalingServer-->>UserC: ROOM_FULL {roomId}
    end

    Note over UserA: 用户A发起WebRTC连接
    UserA->>UserA: 5. 创建 RTCPeerConnection
    UserA->>UserA: 6. 创建 offer (SDP)
    UserA->>SignalingServer: 7. OFFER {roomId, offer, from: userIdA, to: userIdB}

    SignalingServer->>UserB: 8. OFFER {roomId, offer, from: userIdA}

    Note over UserB: 用户B接收到offer并创建answer
    UserB->>UserB: 9. 设置 remoteDescription (offer)
    UserB->>UserB: 10. 创建 answer (SDP)
    UserB->>SignalingServer: 11. ANSWER {roomId, answer, from: userIdB, to: userIdA}

    SignalingServer->>UserA: 12. ANSWER {roomId, answer, from: userIdB}

    Note over UserA: 用户A接收到answer
    UserA->>UserA: 13. 设置 remoteDescription (answer)

    Note over UserA,UserB: 双方交换ICE候选者以建立P2P连接
    UserA-->>SignalingServer: 14. ICE_CANDIDATE {roomId, candidate, from: userIdA, to: userIdB}
    SignalingServer-->>UserB: 15. ICE_CANDIDATE {roomId, candidate, from: userIdA}
    UserB-->>SignalingServer: 16. ICE_CANDIDATE {roomId, candidate, from: userIdB, to: userIdA}
    SignalingServer-->>UserA: 17. ICE_CANDIDATE {roomId, candidate, from: userIdB}

    Note over UserA,UserB: P2P连接建立，音视频流和数据通道开启
    UserA<->>UserB: 18. 音视频数据传输 (WebRTC)
    UserA<->>UserB: 19. 聊天消息传输 (DataChannel)
    UserA<->>UserB: 20. 屏幕分享流传输 (WebRTC)

    Note over UserA,UserB: 用户离开房间或断开连接
    UserA->>SignalingServer: 21. LEAVE_ROOM {roomId, userIdA}
    SignalingServer->>UserB: 22. USER_LEFT {roomId, userIdA}
```

### 4.2 组件交互说明 (Component Interaction Description)

本次 MVP 开发将主要围绕以下核心模块进行：

*   **信令服务模块 (Signaling Service Module):**
    *   **新增:** 独立的 WebSocket 服务器模块 (如 Node.js + ws 或 Socket.IO)。
    *   **职责:** 处理客户端的信令消息（加入/离开房间、交换 SDP Offer/Answer、ICE Candidates），不处理媒体流。
    *   **与现有模块关系:** 作为一个独立的后端服务运行，通过 WebSocket 与前端客户端进行通信，不直接与前端代码库中的其他现有模块交互（如果存在的话）。

*   **前端 WebRTC 客户端模块 (Frontend WebRTC Client Module):**
    *   **新增:** 核心 WebRTC 逻辑封装。
    *   **职责:**
        *   管理 `RTCPeerConnection` 实例。
        *   获取本地媒体流 (`getUserMedia`) 和屏幕分享流 (`getDisplayMedia`)。
        *   处理 `RTCIceCandidate` 和 `RTCSessionDescription` 的创建、设置和交换。
        *   创建和管理 `RTCDataChannel` 用于文本聊天。
        *   渲染本地和远程视频流。
        *   处理静音、摄像头开关、挂断等 UI 交互。
    *   **与现有模块关系:**
        *   与信令服务模块通过 WebSocket 连接进行信令交换。
        *   与 UI 渲染模块交互，显示视频、聊天和控制按钮。
        *   **影响文件/模块:**
            *   `src/index.html` 或 `public/index.html`: 增加视频容器和控制按钮的 DOM 结构。
            *   `src/main.js` / `src/app.js` (或类似入口文件): 引入并初始化 WebRTC 客户端模块。
            *   **新增:** `src/webrtc-client.js` (或 .ts): 封装 WebRTC 核心逻辑。
            *   **新增:** `src/signaling-client.js` (或 .ts): 封装 WebSocket 信令逻辑。
            *   **新增:** `src/ui-manager.js` (或 .ts): 管理 UI 交互和状态。

### 4.3 技术选型与风险 (Technology Choices & Risks)

*   **核心技术选型:**
    *   **WebRTC:** 浏览器原生支持的实时通信标准，无需额外插件。
    *   **WebSocket:** 用于信令交换，提供全双工、低延迟通信。推荐使用 `ws` 库 (Node.js) 或 `Socket.IO` (更易用，但会增加一些开销)。MVP 建议使用原生的 `ws` 库以保持轻量。
    *   **浏览器 API:** `navigator.mediaDevices.getUserMedia` (获取摄像头/麦克风), `navigator.mediaDevices.getDisplayMedia` (获取屏幕分享), `MediaRecorder` (本地录制/截图基础)。
    *   **UI/UX 库:** 保持极简，可能仅依赖少量原生 CSS/JS 或轻量级框架 (如 Vue/React 的最小化构建)，以便快速迭代。

*   **潜在技术风险:**
    *   **NAT 穿透与防火墙 (NAT Traversal & Firewalls):** WebRTC P2P 连接依赖 STUN/TURN 服务器辅助。如果用户网络环境复杂（如多层 NAT、严格防火墙），P2P 连接可能失败，需要部署 TURN 服务器（增加了基础设施成本和复杂性）。MVP 阶段可以先依赖公共 STUN 服务器。
    *   **浏览器兼容性:** 不同浏览器对 WebRTC API 的实现细节可能存在差异，尤其是移动端 Web。需要进行充分的跨浏览器测试。
    *   **性能优化:** 音视频编码/解码、网络抖动、带宽限制等都可能影响通话质量。在 MVP 阶段，我们将优先保证功能可用性，性能优化在后续版本持续迭代。
    *   **移动端 WebRTC 挑战:** 移动浏览器在后台运行时 WebRTC 连接可能被挂起或断开；电量消耗问题；摄像头/麦克风权限管理。这些需要在设计时加以考虑，并清晰告知用户。
    *   **服务器压力 (信令):** 尽管媒体流不经过信令服务器，但高并发的房间加入和信令交换仍可能对信令服务器造成压力。Node.js 的 `ws` 库能很好地处理高并发连接，但仍需监控。
