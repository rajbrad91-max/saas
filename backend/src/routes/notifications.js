import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
function vid(req) {
  if (req.user.role === 'super_admin') return req.query.vendor_id || req.body.vendor_id || null;
  return req.user.vendor_id;
}

/* ── 🔔 NOTIFICATIONS ── */
export async function notify(vendorId, title, body, type = 'info') {
  try {
    await query('INSERT INTO notifications (vendor_id, type, title, body) VALUES ($1,$2,$3,$4)',
      [vendorId, type, title, body || null]);
  } catch { /* never break main flow */ }
}

router.get('/', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows } = await query(
    'SELECT * FROM notifications WHERE vendor_id=$1 ORDER BY created_at DESC LIMIT 30', [v]);
  const { rows: c } = await query(
    'SELECT COUNT(*)::int AS unseen FROM notifications WHERE vendor_id=$1 AND seen_at IS NULL', [v]);
  res.json({ notifications: rows, unseen: c[0].unseen });
});

router.post('/seen', requireAuth, async (req, res) => {
  const v = vid(req);
  await query('UPDATE notifications SET seen_at=NOW() WHERE vendor_id=$1 AND seen_at IS NULL', [v]);
  res.json({ ok: true });
});

export default router;
