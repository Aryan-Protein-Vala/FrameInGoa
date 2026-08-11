import Redis from 'ioredis';
import { kv } from '@vercel/kv';

let redisClient: Redis | null = null;

function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        connectTimeout: 5000,
        lazyConnect: true,
      });
    } catch (err) {
      console.warn('Failed to initialize ioredis client:', err);
    }
  }
  return redisClient;
}

export async function setCardData(id: string, data: { name: string; stack: string; role: string; avatar_url: string }) {
  const jsonStr = JSON.stringify(data);
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days

  // 1. Try REDIS_URL first (ioredis)
  if (process.env.REDIS_URL) {
    try {
      const client = getRedisClient();
      if (client) {
        if (client.status === 'wait') {
          await client.connect();
        }
        await client.set(`hh-goa:${id}`, jsonStr, 'EX', ttlSeconds);
        return;
      }
    } catch (err) {
      console.warn('ioredis set error:', err);
    }
  }

  // 2. Try Vercel KV fallback
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      await kv.set(`hh-goa:${id}`, data, { ex: ttlSeconds });
    } catch (err) {
      console.warn('Vercel KV set error:', err);
    }
  }
}

export async function getCardData(id: string) {
  // 1. Try REDIS_URL first (ioredis)
  if (process.env.REDIS_URL) {
    try {
      const client = getRedisClient();
      if (client) {
        if (client.status === 'wait') {
          await client.connect();
        }
        const val = await client.get(`hh-goa:${id}`);
        if (val) {
          return JSON.parse(val) as { name: string; stack: string; role: string; avatar_url: string };
        }
      }
    } catch (err) {
      console.warn('ioredis get error:', err);
    }
  }

  // 2. Try Vercel KV fallback
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const res = await kv.get<{ name: string; stack: string; role: string; avatar_url: string }>(`hh-goa:${id}`);
      if (res) return res;
    } catch (err) {
      console.warn('Vercel KV get error:', err);
    }
  }

  return null;
}
