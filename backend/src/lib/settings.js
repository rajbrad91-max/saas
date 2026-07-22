// read/write platform_settings (super-admin controls)
import prisma from '../config/prisma.js';

let cache = {};
let cacheAt = 0;
const TTL_MS = 10000;

export async function getSetting(key, fallback = null) {
  const now = Date.now();
  if (now - cacheAt > TTL_MS) { cache = {}; cacheAt = now; } // 10s cache
  if (cache[key] !== undefined) return cache[key];
  const row = await prisma.platform_settings.findUnique({
    where: { key },
    select: { value: true },
  });
  const val = row ? row.value : fallback;
  cache[key] = val;
  return val;
}

export async function setSetting(key, value) {
  await prisma.platform_settings.upsert({
    where: { key },
    update: { value, updated_at: new Date() },
    create: { key, value, updated_at: new Date() },
  });
  // Clear the whole cache, not just this key, and reset the clock. Without this
  // a change made in the super-admin panel could take up to 10s to take effect —
  // switching the face engine and immediately re-indexing would silently use the
  // OLD engine.
  cache = {};
  cacheAt = 0;
  cache[key] = value;
}

export async function getAllSettings() {
  const rows = await prisma.platform_settings.findMany({ select: { key: true, value: true } });
  const out = {};
  rows.forEach(r => { out[r.key] = r.value; });
  return out;
}
