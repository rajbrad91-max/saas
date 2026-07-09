// 🧵 Face-indexing queue — single worker, throttled, off the API's critical path.
// Guarantees only ONE photo is indexed at a time and yields between photos so
// live API requests never get starved of CPU. Albums are queued; the worker
// drains them one by one. Safe to call enqueue() many times.

import fs from 'fs';
import path from 'path';
import { query } from '../config/db.js';
import { getFaceDescriptors } from './faceEngine.js';
import { getFaceDescriptorsAWS } from './faceAWS.js';
import { getSetting } from './settings.js';

const ROOT = '/var/www/vowflo/storage/galleries';

// tunables (safe defaults for a 4-core box)
const PAUSE_MS = 250;          // breather between photos so API stays responsive
const MAX_ATTEMPTS = 2;        // retry a failed photo this many times before skipping

const albumQueue = [];         // FIFO of albumIds waiting to be processed
const queued = new Set();      // dedupe albumIds already waiting
let running = false;           // single-worker lock

// how many photos are still waiting to be indexed (backlog depth) — used later for AWS overflow
export async function backlogDepth() {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM photos WHERE face_indexed=false');
    return rows[0]?.n || 0;
  } catch { return 0; }
}

export function enqueueAlbum(albumId) {
  const id = String(albumId);
  if (queued.has(id)) return;      // already waiting
  queued.add(id);
  albumQueue.push(id);
  drain();                         // kick the worker (no-op if already running)
}

async function drain() {
  if (running) return;             // only one worker ever
  running = true;
  try {
    while (albumQueue.length) {
      const albumId = albumQueue.shift();
      queued.delete(albumId);
      await indexOneAlbum(albumId);
    }
  } finally {
    running = false;
  }
}

async function indexOneAlbum(albumId) {
  let engine;
  try { engine = await getSetting('face_engine', 'vladmandic'); } catch { engine = 'vladmandic'; }

  // pull the un-indexed photos for this album, one batch snapshot
  let photos;
  try {
    ({ rows: photos } = await query(
      'SELECT id, preview_path FROM photos WHERE album_id=$1 AND face_indexed=false ORDER BY id', [albumId]));
  } catch { return; }

  for (const p of photos) {
    let attempt = 0, ok = false;
    while (attempt < MAX_ATTEMPTS && !ok) {
      attempt++;
      try {
        const full = path.join(ROOT, p.preview_path);
        if (!fs.existsSync(full)) { ok = true; break; }   // nothing to do
        const found = engine === 'aws'
          ? await getFaceDescriptorsAWS(full)
          : await getFaceDescriptors(full);
        await query('UPDATE photos SET faces=$1, face_count=$2, face_indexed=true WHERE id=$3',
          [JSON.stringify(found), found.length, p.id]);
        ok = true;
      } catch (e) {
        if (attempt >= MAX_ATTEMPTS) { /* give up on this photo, leave for a later pass */ }
      }
    }
    // 😴 yield to the event loop / other requests between every photo
    await new Promise(r => setTimeout(r, PAUSE_MS));
  }
}

// manual full re-index (vendor button / admin) — returns a summary, still throttled
export async function indexAlbumNow(albumId) {
  const before = await query('SELECT COUNT(*)::int AS n FROM photos WHERE album_id=$1 AND face_indexed=false', [albumId]);
  await indexOneAlbum(albumId);
  const after = await query('SELECT COUNT(*)::int AS n FROM photos WHERE album_id=$1 AND face_indexed=false', [albumId]);
  const remaining = after.rows[0]?.n || 0;
  return { requested: before.rows[0]?.n || 0, remaining };
}
