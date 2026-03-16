-- Agent Market Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(128),
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 技能/资产表
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(128) NOT NULL,          -- 短名称，如 weather
  display_name VARCHAR(256) NOT NULL,
  description TEXT,
  type VARCHAR(32) DEFAULT 'skill',    -- skill | agent | template
  version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  author_id UUID REFERENCES users(id),
  file_key VARCHAR(512),               -- COS 对象 key
  file_size INTEGER,
  downloads INTEGER DEFAULT 0,
  hub_score FLOAT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(author_id, slug)
);

-- API Token 表
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(512) UNIQUE NOT NULL,
  name VARCHAR(128),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 下载记录
CREATE TABLE download_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID REFERENCES assets(id),
  user_id UUID,
  ip VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 搜索索引
CREATE INDEX idx_assets_slug ON assets(slug);
CREATE INDEX idx_assets_author ON assets(author_id);
CREATE INDEX idx_assets_public ON assets(is_public);
CREATE INDEX idx_assets_search ON assets USING gin(to_tsvector('english', display_name || ' ' || COALESCE(description, '')));
