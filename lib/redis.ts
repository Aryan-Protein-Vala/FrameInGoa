import { createClient } from 'redis';
import { kv } from '@vercel/kv';

type RedisClientType = ReturnType<typeof createClient>;
let redisClient: RedisClientType | null = null;

async function getRedisClient() {
  if (!redisClient && process.env.REDIS_URL) {
    try {
      redisClient = createClient({ url: process.env.REDIS_URL });
      redisClient.on('error', (err) => console.warn('Redis Client Error:', err));
      await redisClient.connect();
    } catch (err) {
      console.warn('Failed to connect node-redis:', err);
      redisClient = null;
    }
  } else if (redisClient && !redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (e) {}
  }
  return redisClient;
}

export async function setCardData(id: string, data: { name: string; stack: string; role: string; avatar_url: string }) {
  const jsonStr = JSON.stringify(data);
  const ttlSeconds = 7 * 24 * 60 * 60; // 7 days

  // 1. Try REDIS_URL first (node-redis as per Vercel documentation)
  if (process.env.REDIS_URL) {
    try {
      const client = await getRedisClient();
      if (client && client.isOpen) {
        await client.set(`hh-goa:${id}`, jsonStr, { EX: ttlSeconds });
        return;
      }
    } catch (err) {
      console.warn('node-redis set error:', err);
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
  // 1. Try REDIS_URL first (node-redis)
  if (process.env.REDIS_URL) {
    try {
      const client = await getRedisClient();
      if (client && client.isOpen) {
        const val = await client.get(`hh-goa:${id}`);
        if (val) {
          return JSON.parse(val) as { name: string; stack: string; role: string; avatar_url: string };
        }
      }
    } catch (err) {
      console.warn('node-redis get error:', err);
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
