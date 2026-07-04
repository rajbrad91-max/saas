import express from 'express';
import { query } from '../config/db.js';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'Hello from Vowflo API! 👋' });
});

// Public: list all services (legacy)
router.get('/services', async (req, res) => {
  const { rows } = await query('SELECT * FROM services ORDER BY id');
  res.json({ services: rows });
});

// Public: packages (3 tiers) with their items nested
router.get('/packages', async (req, res) => {
  try {
    const { rows: packages } = await query('SELECT * FROM packages ORDER BY sort_order');
    const { rows: items } = await query('SELECT * FROM package_items ORDER BY package_id, sort_order');
    const result = packages.map(p => ({
      ...p,
      included: items.filter(i => i.package_id === p.id && i.is_included),
      addons: items.filter(i => i.package_id === p.id && i.is_addon),
      standalone: items.filter(i => i.package_id === p.id && !i.is_included && !i.is_addon),
    }));
    res.json({ packages: result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 🔒 Super admin: update a PACKAGE price
router.put('/packages/:id/price', requireAuth, requireSuperAdmin, async (req, res) => {
  const { price_monthly, price_annual, price_annual_regular } = req.body;
  try {
    await query(
      `UPDATE packages SET price_monthly=$1, price_annual=$2, price_annual_regular=$3 WHERE id=$4`,
      [price_monthly ?? null, price_annual ?? null, price_annual_regular ?? null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🔒 Super admin: update a PACKAGE ITEM price
router.put('/package-items/:id/price', requireAuth, requireSuperAdmin, async (req, res) => {
  const { price_monthly, price_annual, price_annual_regular } = req.body;
  try {
    await query(
      `UPDATE package_items SET price_monthly=$1, price_annual=$2, price_annual_regular=$3 WHERE id=$4`,
      [price_monthly ?? null, price_annual ?? null, price_annual_regular ?? null, req.params.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 🎁 OFFERS
// Public: list active offers
router.get('/offers', async (req, res) => {
  const { rows } = await query('SELECT * FROM offers ORDER BY created_at DESC');
  res.json({ offers: rows });
});

// 🔒 Create offer
router.post('/offers', requireAuth, requireSuperAdmin, async (req, res) => {
  const { code, label, percent_off, starts_at, ends_at } = req.body;
  if (!code || !percent_off) return res.status(400).json({ error: 'Missing code or percent' });
  try {
    const { rows } = await query(
      `INSERT INTO offers (code,label,percent_off,starts_at,ends_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [code.toUpperCase(), label || null, percent_off, starts_at || null, ends_at || null]
    );
    res.status(201).json({ offer: rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Code already exists' });
    res.status(500).json({ error: e.message });
  }
});

// 🔒 Toggle / delete offer
router.put('/offers/:id/toggle', requireAuth, requireSuperAdmin, async (req, res) => {
  await query('UPDATE offers SET active = NOT active WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
router.delete('/offers/:id', requireAuth, requireSuperAdmin, async (req, res) => {
  await query('DELETE FROM offers WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

export default router;
