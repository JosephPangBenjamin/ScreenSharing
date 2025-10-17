# WebRTC 视频通话应用部署指南

本文档详细说明如何使用Nginx配置来部署前端应用和信令服务器，实现WebRTC视频通话功能。

## 服务器信息
- IP地址: 8.140.237.167
- 域名: qtai.net.cn

## 目录
- [环境准备](#环境准备)
- [前端应用构建](#前端应用构建)
- [信令服务器部署](#信令服务器部署)
- [Nginx配置](#nginx配置)
- [部署步骤](#部署步骤)
- [常见问题排查](#常见问题排查)

## 环境准备

### 服务器要求
- Node.js 16.0.0 或更高版本
- npm 或 yarn
- Nginx
- PM2 (推荐用于管理信令服务器进程)

### 安装依赖
```bash
# 安装Nginx
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx

# 安装PM2
sudo npm install -g pm2
```

## 前端应用构建

### 构建步骤
1. 进入项目根目录
2. 安装依赖
3. 构建应用

```bash
# 进入项目目录
cd /Users/offer/offer_work/ScreenSharing

# 安装依赖
npm install

# 构建应用
npm run build
```

构建成功后，静态文件将输出到 `dist` 目录。

## 信令服务器部署

### 使用独立信令服务器（推荐）

项目中包含了独立的信令服务器，位于 `signal_server` 目录。

```bash
# 进入信令服务器目录
cd /Users/offer/offer_work/ScreenSharing/signal_server

# 安装依赖
npm install

# 使用PM2启动服务
pm run serve
# 或者直接使用PM2
pm2 start ecosystem.config.cjs
```

信令服务器默认监听在3000端口。

## Nginx配置

我们已经创建了一个名为 `nginx.conf` 的配置文件，包含了前端静态文件服务和WebSocket信令服务的反向代理设置。

**重要更新：**
- WebSocket反向代理路径已优化，添加了尾部斜杠确保路径正确传递
- 添加了`proxy_buffering off`和`proxy_cache off`设置来减少延迟，提高WebSocket通信性能

### 配置文件修改

已根据您的服务器信息更新了 `nginx.conf` 文件中的配置：

1. 服务器域名：`server_name qtai.net.cn 8.140.237.167;`
2. 前端静态文件路径：`root /var/www/webrtc-app/dist;`
3. （可选）如果需要HTTPS，取消注释HTTPS部分并配置SSL证书路径

### 配置部署

将配置文件复制到Nginx配置目录并启用：

```bash
# 备份现有配置（可选）
sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 复制我们的配置文件
sudo cp /Users/offer/offer_work/ScreenSharing/nginx.conf /etc/nginx/conf.d/webrtc-app.conf

# 测试配置
nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 部署静态文件

将构建后的静态文件部署到Nginx配置中指定的目录：

```bash
# 创建目录（如果不存在）
sudo mkdir -p /var/www/webrtc-app

# 复制构建文件
sudo cp -r /Users/offer/offer_work/ScreenSharing/dist/* /var/www/webrtc-app/dist/

# 设置权限
sudo chown -R www-data:www-data /var/www/webrtc-app
sudo chmod -R 755 /var/www/webrtc-app
```

## 部署步骤

### 完整部署流程

1. **构建前端应用**
   ```bash
   cd /Users/offer/offer_work/ScreenSharing
   npm install
   npm run build
   ```

2. **部署静态文件**
   ```bash
   sudo mkdir -p /var/www/webrtc-app/dist
   sudo cp -r dist/* /var/www/webrtc-app/dist/
   sudo chown -R www-data:www-data /var/www/webrtc-app
   ```

3. **部署信令服务器**
   ```bash
   cd /Users/offer/offer_work/ScreenSharing/signal_server
   npm install
   pm2 start ecosystem.config.cjs
   ```

4. **配置Nginx**
   ```bash
   sudo cp /Users/offer/offer_work/ScreenSharing/nginx.conf /etc/nginx/conf.d/webrtc-app.conf
   sudo nginx -t
   sudo systemctl restart nginx
   ```

5. **配置PM2开机自启动**
   ```bash
   pm2 startup
sudo env PATH=$PATH:/usr/local/bin pm2 save
   ```

## 应用配置说明

### 信令类型配置

应用支持两种信令模式：
- `localStorage` - 用于本地测试，适合同一浏览器的不同标签页之间通信
- `server` - 用于生产环境，通过WebSocket服务器通信

在 `src/store/atoms.ts` 中可以配置信令类型：

```typescript
export const signalingTypeAtom = atom<'localStorage' | 'server'>('server');
```

生产环境请确保配置为 `'server'`。

### WebSocket URL配置

前端应用通过环境变量配置WebSocket服务器地址。在构建前，请确保正确配置环境变量：

```bash
# 在.env文件中设置
VITE_SIGNALING_SERVER_URL=ws://qtai.net.cn/ws/

# 或使用HTTPS模式（推荐）
# VITE_SIGNALING_SERVER_URL=wss://qtai.net.cn/ws/
```

应用中使用的配置方式：
```typescript
const SIGNALING_SERVER_URL = import.meta.env.VITE_SIGNALING_SERVER_URL || 'ws://localhost:3000';
```

## 常见问题排查

### WebSocket连接失败

1. 检查Nginx配置中的WebSocket代理设置
2. 确认信令服务器正在运行：`pm2 status`
3. 检查防火墙设置，确保3000端口可访问（仅用于服务器内部通信，不应直接暴露给外网）
4. 查看信令服务器日志：`pm2 logs webrtc-signaling-server`

### WebRTC连接建立失败

1. 确认TURN/STUN服务器配置（如果需要穿透NAT）
2. 检查浏览器控制台是否有相关错误
3. 确保HTTPS已配置（WebRTC通常需要HTTPS环境）

### 静态文件访问问题

1. 检查Nginx错误日志：`sudo tail -f /var/log/nginx/error.log`
2. 确认静态文件路径正确且权限设置正确
3. 检查Nginx配置中的root路径是否正确

## HTTPS配置（推荐）

**重要：** WebRTC在生产环境中必须使用HTTPS，否则浏览器会阻止媒体设备访问和WebSocket连接。以下是详细配置步骤：

### 1. 安装Certbot并获取SSL证书

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx

# 获取并配置SSL证书
sudo certbot --nginx -d qtai.net.cn -d 8.140.237.167

# 自动续期设置
sudo systemctl enable certbot.timer
```

### 2. 验证证书安装位置

安装完成后，证书通常会存储在以下位置：
- 证书文件：`/etc/letsencrypt/live/qtai.net.cn/fullchain.pem`
- 密钥文件：`/etc/letsencrypt/live/qtai.net.cn/privkey.pem`

### 3. 部署更新后的Nginx配置

```bash
# 将更新后的nginx.conf上传到服务器
sftp qtai.net.cn
put nginx.conf /tmp/
exit

# 登录服务器
ssh qtai.net.cn

# 备份原配置
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 复制新配置
cp /tmp/nginx.conf /etc/nginx/sites-available/default

# 测试配置
nginx -t

# 重新加载Nginx
systemctl reload nginx
```

### 4. 验证HTTPS配置

使用浏览器访问 `https://qtai.net.cn`，确认站点能够通过HTTPS正常访问。

### 5. 检查WebSocket连接

打开浏览器开发者工具，在控制台中查看WebSocket连接是否正常建立，不再出现"WebSocket is closed before the connection is established"错误。

## 性能优化建议

1. 启用Nginx缓存加速静态资源访问
2. 考虑使用CDN分发静态资源
3. 为信令服务器配置负载均衡（高并发场景）
4. 优化WebRTC配置，合理设置视频分辨率和帧率