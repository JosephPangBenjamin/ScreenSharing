# WebRTC 信令服务器

这是一个独立的WebRTC信令服务器，用于处理WebRTC连接的信令交换，支持房间管理、消息路由和用户状态通知。

## 功能特性

- 房间管理（创建、加入、离开）
- WebRTC信令消息转发（offer、answer、ice-candidate）
- 聊天消息支持
- 用户状态通知（加入、离开）
- 优雅关闭处理
- CORS支持

## 快速开始

### 环境要求

- Node.js 16.0.0 或更高版本
- npm 或 yarn

### 安装依赖

```bash
# 进入信令服务器目录
cd signal_server

# 安装依赖
npm install
```

### 配置环境变量

创建一个`.env`文件（可选）：

```bash
# 端口配置，默认为3000
PORT=3000
```

### 启动服务

使用以下命令启动服务：

```bash
# 直接启动（开发环境）
node server.js

# 或者使用npm脚本
npm start
```

服务启动后，将在指定端口（默认3000）监听连接，WebSocket URL为：`ws://localhost:3000`

### 使用PM2管理服务（推荐生产环境）

```bash
# 安装PM2
sudo npm install -g pm2

# 使用配置文件启动服务（推荐）
pm2 start ecosystem.config.cjs

# 或者直接使用PM2启动
pm2 start server.js --name webrtc-signaling-server

# 或者使用npm脚本
npm run serve

# 查看服务状态
pm2 status

# 或者使用
pm2 list

# 查看日志
pm2 logs webrtc-signaling-server

# 设置开机自启动
pm2 startup
sudo env PATH=$PATH:/usr/local/bin pm2 save

# 关闭服务
pm2 stop webrtc-signaling-server

# 重启服务
pm2 restart webrtc-signaling-server
```

## 部署说明

### 生产环境部署

#### 1. 使用PM2（推荐）

```bash
# 全局安装PM2
sudo npm install -g pm2

# 使用配置文件启动服务（推荐）
pm2 start ecosystem.config.cjs

# 或者使用npm脚本
npm run serve

# 查看运行状态
pm2 list

# 确保服务稳定运行
pm2 monit```

#### 2. 使用systemd（Linux系统）

创建systemd服务文件：

```bash
sudo nano /etc/systemd/system/webrtc-signaling.service
```

文件内容：

```
[Unit]
Description=WebRTC Signaling Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/signal_server
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable webrtc-signaling
sudo systemctl start webrtc-signaling
```

### 安全配置

在生产环境中，建议：

1. **使用HTTPS**：通过Nginx或Apache配置反向代理，启用WSS（WebSocket Secure）
2. **配置防火墙**：仅允许必要的端口访问
3. **实施访问控制**：根据需要添加身份验证机制

## 消息格式

### 客户端发送消息

#### 1. 加入房间

```json
{
  "type": "join-room",
  "roomId": "房间ID",
  "sender": "用户ID"
}
```

#### 2. WebRTC信令消息

```json
{
  "type": "offer", // 或 "answer", "ice-candidate"
  "roomId": "房间ID",
  "sender": "用户ID",
  "data": { /* WebRTC相关数据 */ }
}
```

#### 3. 聊天消息

```json
{
  "type": "chat",
  "roomId": "房间ID",
  "sender": "用户ID",
  "message": "聊天内容"
}
```

#### 4. 离开房间

```json
{
  "type": "leave-room",
  "roomId": "房间ID",
  "sender": "用户ID"
}
```

### 服务器发送消息

#### 1. 加入成功

```json
{
  "type": "join-success",
  "roomId": "房间ID",
  "userId": "用户ID"
}
```

#### 2. 用户加入通知

```json
{
  "type": "user-joined",
  "userId": "加入的用户ID"
}
```

#### 3. 用户离开通知

```json
{
  "type": "user-left",
  "userId": "离开的用户ID"
}
```

#### 4. 转发的消息

服务器会转发除上述类型外的所有消息给房间内的其他用户。

## 监控与维护

### 查看日志

```bash
# 使用PM2查看日志
pm logs

# 或者使用systemd查看日志
sudo journalctl -u webrtc-signaling -f
```

### 常见问题排查

1. **连接失败**：检查端口是否开放，防火墙规则是否正确
2. **消息转发失败**：确保用户已加入房间，检查消息格式是否正确
3. **服务崩溃**：使用PM2或systemd自动重启服务

## 许可证

MIT