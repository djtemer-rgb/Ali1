import { Redis } from '@upstash/redis'

export const redis = Redis.fromEnv()

export async function getJson(key: string) {
  const val = await redis.get<string>(key)
  if (!val) return null
  try {
    return JSON.parse(val)
  } catch {
    return val
  }
}

export async function setJson(key: string, value: any) {
  await redis.set(key, JSON.stringify(value))
}
