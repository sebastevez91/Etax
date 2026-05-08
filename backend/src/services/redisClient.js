const Redis = require('ioredis');

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      tls: { rejectUnauthorized: false },
    })
  : new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
    });

redis.on('connect', () => console.log('🟢 Redis conectado'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

module.exports = redis;