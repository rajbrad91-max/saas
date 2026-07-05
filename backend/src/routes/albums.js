import express from 'express';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// which vendor am I?
function vid(req) { return req.user.vendor_id; }

// 🔒 list my albums
router.get('/', requireAuth, async (req, res) => {
  const v = vid(req);
  if (!v) return res.status(400).json({ error: 'No vendor' });
  try {
    const { rows } = await query(
      `SELECT a.*,
        (SELECT count(*)::int FROM photos p WHERE p.album_id=a.id) AS photo_count,
        (SELECT count(*)::int FROM photos p WHERE p.album_id=a.id AND p.is_selected) AS selected_count
       FROM albums a WHERE a.vendor_id=$1 ORDER BY a.created_at DESC`, [v]);
    res.json({ albums: rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🔒 create album
router.post('/', requireAuth, async (req, res) => {
  const v = vid(req);
  if (!v) return res.status(400).json({ error: 'No vendor' });
  const { title, category, guest_username, guest_password, admin_username, admin_password } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const { rows } = await query(
      `INSERT INTO albums (vendor_id, title, category, guest_username, guest_password, admin_username, admin_password)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [v, title, category || null, guest_username || null, guest_password || null, admin_username || null, admin_password || null]);
    res.status(201).json({ album: rows[0] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🔒 album detail + photos (tenant-checked)
router.get('/:id', requireAuth, async (req, res) => {
  const v = vid(req);
  try {
    const { rows: a } = await query('SELECT * FROM albums WHERE id=$1 AND vendor_id=$2', [req.params.id, v]);
    if (!a[0]) return res.status(404).json({ error: 'Album not found' });
    const { rows: photos } = await query('SELECT * FROM photos WHERE album_id=$1 ORDER BY created_at', [req.params.id]);
    res.json({ album: a[0], photos });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🔒 delete album (tenant-checked, cascades photos)
router.delete('/:id', requireAuth, async (req, res) => {
  const v = vid(req);
  try {
    const r = await query('DELETE FROM albums WHERE id=$1 AND vendor_id=$2', [req.params.id, v]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
