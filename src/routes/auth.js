'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../services/db');

module.exports = async function (app) {
  // 注册
  app.post('/register', async (req, reply) => {
    const { username, email, password, display_name } = req.body;
    if (!username || !email || !password) {
      return reply.code(400).send({ error: 'username, email, password required' });
    }
    const hash = await bcrypt.hash(password, 10);
    try {
      const res = await db.query(
        `INSERT INTO users (username, email, password_hash, display_name)
         VALUES ($1, $2, $3, $4) RETURNING id, username, email, display_name, created_at`,
        [username, email, hash, display_name || username]
      );
      const user = res.rows[0];
      const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });
      return reply.code(201).send({ user, token });
    } catch (err) {
      if (err.code === '23505') {
        return reply.code(409).send({ error: 'username or email already exists' });
      }
      throw err;
    }
  });

  // 登录
  app.post('/login', async (req, reply) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return reply.code(400).send({ error: 'email and password required' });
    }
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = res.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'invalid credentials' });
    }
    const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });
    return { token, user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name } };
  });

  // 获取当前用户信息
  app.get('/me', { preHandler: [app.authenticate] }, async (req) => {
    const res = await db.query(
      'SELECT id, username, email, display_name, bio, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    return res.rows[0];
  });
};
