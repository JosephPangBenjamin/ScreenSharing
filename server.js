// WebSocket信令服务器 - 用于WebRTC公网模式通信
// 这个服务器负责转发WebRTC信令消息，实现房间管理和消息路由

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import express from 'express';
import cors from 'cors';

const app = express();
// 添加CORS支持
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 存储房间和用户的映射关系
const rooms = new Map(); // roomId -> Set(userId)
// 存储用户连接的映射关系
const users = new Map(); // userId -> WebSocket

// 处理WebSocket连接
wss.on('connection', (ws) => {
  let userId = null;
  let roomId = null;
  
  console.log('新的客户端连接');
  
  // 处理接收到的消息
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // 处理加入房间消息
      if (data.type === 'join-room') {
        userId = data.sender;
        roomId = data.roomId;
        
        // 保存用户连接
        users.set(userId, ws);
        
        // 创建或加入房间
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(userId);
        
        console.log(`用户 ${userId} 加入房间 ${roomId}`);
        console.log(`房间 ${roomId} 当前有 ${rooms.get(roomId).size} 个用户`);
        
        // 发送加入成功消息
        ws.send(JSON.stringify({
          type: 'join-success',
          roomId: roomId,
          userId: userId
        }));
        
        // 通知房间内其他用户有新用户加入
        broadcastToRoom(roomId, userId, {
          type: 'user-joined',
          userId: userId
        });
      }
      // 转发WebRTC信令消息（offer、answer、ice-candidate）
      else if (data.type === 'offer' || data.type === 'answer' || data.type === 'ice-candidate' || data.type === 'chat') {
        if (!roomId || !userId) {
          console.error('用户未加入房间，无法转发消息');
          return;
        }
        
        // 转发消息到房间内所有其他用户
        broadcastToRoom(roomId, userId, data);
      }
      // 处理离开房间消息
      else if (data.type === 'leave-room') {
        if (roomId && userId && rooms.has(roomId)) {
          rooms.get(roomId).delete(userId);
          
          // 如果房间为空，则删除房间
          if (rooms.get(roomId).size === 0) {
            rooms.delete(roomId);
          }
          
          console.log(`用户 ${userId} 离开房间 ${roomId}`);
          
          // 通知房间内其他用户有用户离开
          broadcastToRoom(roomId, userId, {
            type: 'user-left',
            userId: userId
          });
          
          roomId = null;
          userId = null;
        }
      }
    } catch (error) {
      console.error('处理消息失败:', error);
    }
  });
  
  // 处理连接关闭
  ws.on('close', () => {
    console.log('客户端连接关闭');
    
    // 如果用户已加入房间，清理房间信息
    if (roomId && userId && rooms.has(roomId)) {
      rooms.get(roomId).delete(userId);
      
      // 如果房间为空，则删除房间
      if (rooms.get(roomId).size === 0) {
        rooms.delete(roomId);
      }
      
      console.log(`用户 ${userId} 断开连接，离开房间 ${roomId}`);
      
      // 通知房间内其他用户有用户离开
      broadcastToRoom(roomId, userId, {
        type: 'user-left',
        userId: userId
      });
    }
    
    // 清理用户连接
    if (userId) {
      users.delete(userId);
    }
  });
  
  // 处理连接错误
  ws.on('error', (error) => {
    console.error('WebSocket连接错误:', error);
  });
});

// 向房间内除指定用户外的所有用户广播消息
function broadcastToRoom(roomId, excludeUserId, message) {
  if (!rooms.has(roomId)) {
    return;
  }
  
  const roomUsers = rooms.get(roomId);
  roomUsers.forEach(userId => {
    // 不向发送者发送自己的消息
    if (userId !== excludeUserId) {
      const userWs = users.get(userId);
      if (userWs && userWs.readyState === WebSocket.OPEN) {
        try {
          userWs.send(JSON.stringify(message));
        } catch (error) {
          console.error(`向用户 ${userId} 发送消息失败:`, error);
        }
      }
    }
  });
}

// 服务器启动
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`信令服务器正在运行，端口 ${PORT}`);
  console.log(`WebSocket URL: ws://localhost:${PORT}`);
  console.log('注意：在生产环境中，请确保配置适当的安全措施和身份验证');
});

// 优雅关闭处理
process.on('SIGTERM', () => {
  console.log('接收到SIGTERM信号，正在关闭服务器...');
  closeServer();
});

process.on('SIGINT', () => {
  console.log('接收到SIGINT信号（Ctrl+C），正在关闭服务器...');
  closeServer();
});

function closeServer() {
  
  // 关闭所有WebSocket连接
  wss.clients.forEach(client => {
    client.close();
  });
  
  // 关闭HTTP服务器
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
}