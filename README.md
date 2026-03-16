# Agent Market

Agent 技能市场后端 API，基于 Fastify + PostgreSQL + 腾讯云 COS。

## 快速部署（Ubuntu 24.04）

### 1. 上传代码到服务器
```bash
scp -r agent-market/ root@YOUR_SERVER_IP:/opt/agent-market
```

### 2. 配置环境变量
```bash
cd /opt/agent-market
cp .env.example .env
nano .env  # 填写数据库、COS、JWT 配置
```

### 3. 执行部署脚本
```bash
chmod +x scripts/deploy.sh
bash scripts/deploy.sh
```

### 4. 配置 Nginx 反向代理（可选）
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /api/v1/auth/register | 注册 | 否 |
| POST | /api/v1/auth/login | 登录 | 否 |
| GET  | /api/v1/auth/me | 当前用户 | 是 |
| GET  | /api/v1/assets | 搜索技能 | 否 |
| GET  | /api/v1/assets/:id | 技能详情 | 否 |
| GET  | /api/v1/assets/:id/download | 下载zip | 否 |
| POST | /api/v1/assets/publish | 发布技能 | 是 |
| GET  | /api/v1/assets/my/assets | 我的技能 | 是 |
| GET  | /health | 健康检查 | 否 |

## 目录结构

```
agent-market/
  src/
    index.js          # 入口
    routes/
      auth.js         # 认证路由
      assets.js       # 资产路由
    services/
      db.js           # PostgreSQL
      cos.js          # 腾讯云 COS
  sql/
    schema.sql        # 数据库表结构
  scripts/
    deploy.sh         # 一键部署脚本
  .env.example        # 环境变量示例
```
