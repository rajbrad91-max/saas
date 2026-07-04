import express from 'express';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
function vid(req) {
  if (req.user.role === 'super_admin') return req.query.vendor_id || req.body.vendor_id || null;
  return req.user.vendor_id;
}

/* ── 👷 CREW MEMBERS (vendor roster) ── */
router.get('/', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows } = await query('SELECT * FROM crew_members WHERE vendor_id=$1 ORDER BY name', [v]);
  res.json({ crew: rows });
});

router.post('/', requireAuth, async (req, res) => {
  const v = vid(req);
  const { name, role, phone, email } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { rows } = await query(
    'INSERT INTO crew_members (vendor_id, name, role, phone, email) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [v, name, role || null, phone || null, email || null]);
  res.status(201).json({ member: rows[0] });
});

router.put('/:id', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows: own } = await query('SELECT vendor_id FROM crew_members WHERE id=$1', [req.params.id]);
  if (!own[0]) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'super_admin' && own[0].vendor_id !== v) return res.status(403).json({ error: 'Forbidden' });
  const { name, role, phone, email } = req.body;
  const { rows } = await query(
    `UPDATE crew_members SET name=COALESCE($1,name), role=$2, phone=$3, email=$4 WHERE id=$5 RETURNING *`,
    [name ?? null, role ?? null, phone ?? null, email ?? null, req.params.id]);
  res.json({ member: rows[0] });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const v = vid(req);
  const { rows: own } = await query('SELECT vendor_id FROM crew_members WHERE id=$1', [req.params.id]);
  if (!own[0]) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'super_admin' && own[0].vendor_id !== v) return res.status(403).json({ error: 'Forbidden' });
  await query('DELETE FROM crew_members WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

/* ── 📅 EVENT CREW (assign to lead + schedule) ── */
async function leadOwned(req, res, leadId) {
  const { rows } = await query('SELECT * FROM leads WHERE id=$1', [leadId]);
  if (!rows[0]) { res.status(404).json({ error: 'Lead not found' }); return null; }
  if (req.user.role !== 'super_admin' && rows[0].vendor_id !== vid(req)) {
    res.status(403).json({ error: 'Forbidden' }); return null;
  }
  return rows[0];
}

router.get('/lead/:leadId', requireAuth, async (req, res) => {
  const lead = await leadOwned(req, res, req.params.leadId);
  if (!lead) return;
  const { rows } = await query(
    `SELECT lc.*, cm.name, cm.role, cm.phone, cm.email FROM lead_crew lc
     JOIN crew_members cm ON cm.id=lc.crew_member_id WHERE lc.lead_id=$1 ORDER BY lc.id`, [lead.id]);
  res.json({ assignments: rows });
});

router.post('/lead/:leadId', requireAuth, async (req, res) => {
  const lead = await leadOwned(req, res, req.params.leadId);
  if (!lead) return;
  const { crew_member_id, duty, arrive_time, leave_time } = req.body;
  if (!crew_member_id) return res.status(400).json({ error: 'crew_member_id required' });
  const token = crypto.randomBytes(16).toString('hex');
  const { rows } = await query(
    `INSERT INTO lead_crew (lead_id, crew_member_id, duty, arrive_time, leave_time, checkin_token)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [lead.id, crew_member_id, duty || null, arrive_time || null, leave_time || null, token]);
  res.status(201).json({ assignment: rows[0] });
});

router.delete('/assignment/:id', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT l.vendor_id FROM lead_crew lc JOIN leads l ON l.id=lc.lead_id WHERE lc.id=$1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  if (req.user.role !== 'super_admin' && rows[0].vendor_id !== vid(req)) return res.status(403).json({ error: 'Forbidden' });
  await query('DELETE FROM lead_crew WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

/* ── ✅ PUBLIC CHECK-IN (crew taps link) ── */
router.get('/checkin/:token', async (req, res) => {
  const { rows } = await query(
    `SELECT lc.*, cm.name, l.event_type, l.event_date, l.location, l.name AS client_name
     FROM lead_crew lc JOIN crew_members cm ON cm.id=lc.crew_member_id JOIN leads l ON l.id=lc.lead_id
     WHERE lc.checkin_token=$1`, [req.params.token]);
  if (!rows[0]) return res.status(404).json({ error: 'Invalid link' });
  res.json({ assignment: rows[0] });
});

router.post('/checkin/:token', async (req, res) => {
  const { action } = req.body; // in | out
  const { rows } = await query('SELECT * FROM lead_crew WHERE checkin_token=$1', [req.params.token]);
  if (!rows[0]) return res.status(404).json({ error: 'Invalid link' });
  const col = action === 'out' ? 'checked_out_at' : 'checked_in_at';
  const { rows: upd } = await query(
    `UPDATE lead_crew SET ${col}=NOW() WHERE id=$1 RETURNING *`, [rows[0].id]);
  res.json({ assignment: upd[0] });
});

export default router;
