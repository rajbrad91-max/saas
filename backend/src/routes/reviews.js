import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { notify } from './notifications.js';

const router = express.Router();
function vid(req) {
  if (req.user.role === 'super_admin') return req.query.vendor_id || req.body.vendor_id || null;
  return req.user.vendor_id;
}

/* ── ⭐ REVIEWS ── */
router.get('/', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows } = await query('SELECT * FROM reviews WHERE vendor_id=$1 ORDER BY created_at DESC', [v]);
  res.json({ reviews: rows });
});

// PUBLIC: submit a review (client link /review/:vendorId)
router.post('/public/:vendorId', async (req, res) => {
  const { name, rating, text } = req.body;
  if (!name || !text) return res.status(400).json({ error: 'Name + review required' });
  const r = Math.min(Math.max(Number(rating) || 5, 1), 5);
  const { rows: v } = await query('SELECT id FROM vendors WHERE id=$1', [req.params.vendorId]);
  if (!v[0]) return res.status(404).json({ error: 'Vendor not found' });
  const { rows } = await query(
    'INSERT INTO reviews (vendor_id, name, rating, text) VALUES ($1,$2,$3,$4) RETURNING *',
    [req.params.vendorId, name, r, text.slice(0, 1000)]);
  notify(Number(req.params.vendorId), `⭐ New ${r}-star review from ${name}`, text.slice(0, 100), 'review');
  res.status(201).json({ review: rows[0] });
});

// approve / unapprove
router.put('/:id/approve', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows: own } = await query('SELECT vendor_id FROM reviews WHERE id=$1', [req.params.id]);
  if (!own[0]) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'super_admin' && own[0].vendor_id !== v) return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await query(
    'UPDATE reviews SET approved=NOT approved WHERE id=$1 RETURNING *', [req.params.id]);
  res.json({ review: rows[0] });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows: own } = await query('SELECT vendor_id FROM reviews WHERE id=$1', [req.params.id]);
  if (!own[0]) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'super_admin' && own[0].vendor_id !== v) return res.status(403).json({ error: 'Forbidden' });
  await query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
