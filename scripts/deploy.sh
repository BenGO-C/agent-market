#!/bin/bash
# 部署脚本 - Ubuntu 24.04
set -e

echo '=== Agent Market 部署 ==='

# 1. 安装 Node.js 20
if ! command -v node &> /dev/null; then
  echo '安装 Node.js 20...'
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# 2. 安装 PostgreSQL
if ! command -v psql &> /dev/null; then
  echo '安装 PostgreSQL...'
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable postgresql
  sudo systemctl start postgresql
fi

# 3. 安装 PM2
if ! command -v pm2 &> /dev/null; then
  echo '安装 PM2...'
  sudo npm install -g pm2
fi

# 4. 创建数据库
echo '初始化数据库...'
sudo -u postgres psql -c "CREATE USER agentmarket WITH PASSWORD '${DB_PASSWORD:-changeme}';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE agentmarket OWNER agentmarket;" 2>/dev/null || true
sudo -u postgres psql -d agentmarket -U postgres -f /opt/agent-market/sql/schema.sql 2>/dev/null || true

# 5. 安装依赖
cd /opt/agent-market
npm install --production

# 6. 启动服务
pm2 delete agent-market 2>/dev/null || true
pm2 start src/index.js --name agent-market
pm2 save
pm2 startup

echo '=== 部署完成 ==='
echo '服务运行在 http://0.0.0.0:3000'
echo '健康检查: curl http://localhost:3000/health'
