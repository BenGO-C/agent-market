'use strict';

require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const jwt = require('@fastify/jwt');
const multipart = require('@fastify/multipart');

const db = require('./services/db');

const app = Fastify({ logger: true });

// Plugins
app.register(cors, { origin: '*' });
app.register(jwt, { secret: process.env.JWT_SECRET || 'dev_secret' });
app.register(multipart, { limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024 } });

// Routes
app.register(require('./routes/auth'), { prefix: '/api/v1/auth' });
app.register(require('./routes/assets'), { prefix: '/api/v1/assets' });

// Health
app.get('/health', async () => ({ status: 'ok', ts: Date.now() }));

// Auth decorator
app.decorate('authenticate', async function (req, reply) {
  try {
    await req.jwtVerify();
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

const start = async () => {
  try {
    await db.connect();
    await app.listen({ port: parseInt(process.env.PORT) || 3000, host: process.env.HOST || '0.0.0.0' });
    console.log(`Agent Market API running on port ${process.env.PORT || 3000}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
