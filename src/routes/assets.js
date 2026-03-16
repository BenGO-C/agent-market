'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');
const cos = require('../services/cos');

module.exports = async function (app) {

  // 搜索技能
  app.get('/', async (req, reply) => {
    const { q = '', type, limit = 20, offset = 0 } = req.query;
    let query, params;
    if (q) {
      query = `
        SELECT a.*, u.username as author_username, u.display_name as author_name
        FROM assets a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.is_public = true
          AND to_tsvector('english', a.display_name || ' ' || COALESCE(a.description, ''))
              @@ plainto_tsquery('english', $1)
        ORDER BY a.hub_score DESC, a.downloads DESC
        LIMIT $2 OFFSET $3`;
      params = [q, limit, offset];
    } else {
      query = `
        SELECT a.*, u.username as author_username, u.display_name as author_name
        FROM assets a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.is_public = true
        ORDER BY a.hub_score DESC, a.downloads DESC
        LIMIT $1 OFFSET $2`;
      params = [limit, offset];
    }
    const res = await db.query(query, params);
    const total = await db.query('SELECT COUNT(*) FROM assets WHERE is_public = true');
    return {
      data: {
        assets: res.rows.map(formatAsset),
        total: parseInt(total.rows[0].count),
      }
    };
  });

  // 获取单个资产详情
  app.get('/:id', async (req, reply) => {
    const res = await db.query(
      `SELECT a.*, u.username as author_username, u.display_name as author_name
       FROM assets a LEFT JOIN users u ON a.author_id = u.id
       WHERE a.id = $1 AND a.is_public = true`,
      [req.params.id]
    );
    if (!res.rows[0]) return reply.code(404).send({ error: 'not found' });
    return { data: formatAsset(res.rows[0]) };
  });

  // 下载资产（重定向到 COS 签名 URL）
  app.get('/:id/download', async (req, reply) => {
    const res = await db.query(
      'SELECT * FROM assets WHERE id = $1 AND is_public = true',
      [req.params.id]
    );
    const asset = res.rows[0];
    if (!asset) return reply.code(404).send({ error: 'not found' });
    if (!asset.file_key) return reply.code(404).send({ error: 'no file available' });

    // 记录下载
    await db.query('UPDATE assets SET downloads = downloads + 1 WHERE id = $1', [asset.id]);
    await db.query(
      'INSERT INTO download_logs (asset_id, ip) VALUES ($1, $2)',
      [asset.id, req.ip]
    );

    const url = await cos.getDownloadUrl(asset.file_key);
    return reply.redirect(302, url);
  });

  // 发布/上传技能（需登录）
  app.post('/publish', { preHandler: [app.authenticate] }, async (req, reply) => {
    const parts = req.parts();
    let meta = {};
    let fileBuffer = null;
    let fileName = '';

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks = [];
        for await (const chunk of part.file) chunks.push(chunk);
        fileBuffer = Buffer.concat(chunks);
        fileName = part.filename;
      } else {
        meta[part.fieldname] = part.value;
      }
    }

    const { slug, display_name, description, version = '1.0.0', type = 'skill', tags = '' } = meta;
    if (!slug || !display_name || !fileBuffer) {
      return reply.code(400).send({ error: 'slug, display_name and file required' });
    }

    // 检查是否已存在（更新版本）
    const existing = await db.query(
      'SELECT id FROM assets WHERE author_id = $1 AND slug = $2',
      [req.user.id, slug]
    );

    const fileKey = `skills/${req.user.id}/${slug}/${uuidv4()}.zip`;
    await cos.uploadZip(fileKey, fileBuffer);

    const tagArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];

    let asset;
    if (existing.rows[0]) {
      const res = await db.query(
        `UPDATE assets SET display_name=$1, description=$2, version=$3, file_key=$4,
          file_size=$5, tags=$6, updated_at=NOW()
         WHERE id=$7 RETURNING *`,
        [display_name, description, version, fileKey, fileBuffer.length, tagArray, existing.rows[0].id]
      );
      asset = res.rows[0];
    } else {
      const res = await db.query(
        `INSERT INTO assets (slug, display_name, description, type, version, author_id, file_key, file_size, tags)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [slug, display_name, description, type, version, req.user.id, fileKey, fileBuffer.length, tagArray]
      );
      asset = res.rows[0];
    }

    return reply.code(201).send({ data: formatAsset(asset) });
  });

  // 我的资产列表
  app.get('/my/assets', { preHandler: [app.authenticate] }, async (req) => {
    const res = await db.query(
      'SELECT * FROM assets WHERE author_id = $1 ORDER BY updated_at DESC',
      [req.user.id]
    );
    return { data: { assets: res.rows.map(formatAsset) } };
  });
};

function formatAsset(a) {
  return {
    id: a.id,
    name: a.slug,
    displayName: a.display_name,
    description: a.description,
    type: a.type,
    version: a.version,
    downloads: a.downloads,
    hubScore: a.hub_score,
    tags: a.tags,
    fileSize: a.file_size,
    author: {
      id: a.author_id,
      name: a.author_name || a.author_username,
      username: a.author_username,
    },
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}
