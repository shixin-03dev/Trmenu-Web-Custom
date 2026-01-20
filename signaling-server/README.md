# TrMenu Signaling Server

这是一个基于 Node.js 和 WebSocket 的轻量级信令服务器，专为 TrMenu Web Custom 的实时协作功能（基于 `y-webrtc`）设计。它负责在客户端之间建立 WebRTC 连接，从而实现数据的实时同步。

## 功能特性

*   **实时信令交换**：支持 `subscribe`, `unsubscribe`, `publish` 等标准信令消息，用于 WebRTC 握手。
*   **健康检查**：提供 `/health` HTTP 端点，用于负载均衡器或监控服务检查服务器状态。
*   **心跳检测**：内置 30 秒心跳机制（Ping/Pong），自动清理断开的连接，保持连接池整洁。
*   **轻量级**：仅依赖 `ws` 库，无需复杂的数据库或外部存储。

## 快速开始

### 1. 安装依赖

确保你已经安装了 Node.js (推荐 v16+)。在 `signaling-server` 目录下运行：

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

服务默认将在 `0.0.0.0:4444` 上启动。

### 3. 环境配置

你可以通过环境变量自定义监听的主机和端口：

| 环境变量 | 默认值 | 描述 |
| :--- | :--- | :--- |
| `PORT` | `4444` | 服务器监听端口 |
| `HOST` | `0.0.0.0` | 服务器监听地址 |

示例：

```bash
# Linux / macOS
PORT=8080 npm start

# Windows (PowerShell)
$env:PORT=8080; npm start
```

## API 端点

*   **WebSocket `/`**: WebSocket 连接端点。客户端（如 `y-webrtc` provider）连接此端点进行信令交换。
*   **HTTP `GET /health`**: 健康检查端点。
    *   **响应**: `200 OK`
    *   **内容**: `OK`

## 部署建议

*   **生产环境**：建议使用 `pm2` 或 `docker` 进行部署，以确保服务的稳定性和自动重启。
*   **反向代理**：如果使用 Nginx 或 Apache 反向代理，请确保正确配置 WebSocket 转发（Upgrade 头）。
*   **SSL/TLS**：在生产环境中，强烈建议通过 Nginx 等反向代理配置 SSL (WSS)，以保证通信安全。

## 与前端集成

在 TrMenu Web 前端的配置中（通常在 `src/config/api.ts`），将信令服务器地址指向本服务：

```typescript
export const SIGNALING_SERVERS = [
    'ws://localhost:4444', // 本地开发
    // 'wss://your-domain.com/ws/' // 生产环境
];
```
