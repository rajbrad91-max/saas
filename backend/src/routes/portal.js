import express from 'express';
import { query } from '../config/db.js';
import { moneySummary } from './payments.js';
import { notify } from './notifications.js';

const router = express.Router();

// helper: lead by client token
async function leadByToken(token) {
  const { rows } = await query('SELECT * FROM leads WHERE client_token=$1', [token]);
  return rows[0] || null;
}

/* 🌐 PUBLIC: GET /api/portal/:token → lead + vendor packages + money */
router.get('/:token', async (req, res) => {
  try {
    const lead = await leadByToken(req.params.token);
    if (!lead) return res.status(404).json({ error: 'Link not found' });
    const { rows: v } = await query('SELECT business_name FROM vendors WHERE id=$1', [lead.vendor_id]);
    // packages grouped by template
    const { rows: tpls } = await query(
      'SELECT * FROM package_templates WHERE vendor_id=$1 ORDER BY id', [lead.vendor_id]);
    const { rows: pkgs } = await query(
      'SELECT * FROM vendor_packages WHERE vendor_id=$1 ORDER BY base_price', [lead.vendor_id]);
    const money = await moneySummary(lead);
    res.json({
      lead: {
        name: lead.name, event_type: lead.event_type, event_date: lead.event_date,
        hours: lead.hours, package_id: lead.package_id, status: lead.status,
      },
      business_name: v[0]?.business_name,
      templates: tpls, packages: pkgs, money,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 🌐 PUBLIC: POST /api/portal/:token/pick → client picks a package */
router.post('/:token/pick', async (req, res) => {
  const { package_id } = req.body;
  try {
    const lead = await leadByToken(req.params.token);
    if (!lead) return res.status(404).json({ error: 'Link not found' });
    const { rows: p } = await query(
      'SELECT * FROM vendor_packages WHERE id=$1 AND vendor_id=$2', [package_id, lead.vendor_id]);
    if (!p[0]) return res.status(400).json({ error: 'Package not found' });
    const snapshot = {
      name: p[0].name, base_price: p[0].base_price, included_hours: p[0].included_hours,
      per_hour_price: p[0].per_hour_price, inclusions: p[0].inclusions,
    };
    const { rows } = await query(
      `UPDATE leads SET package_id=$1, package_snapshot=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [p[0].id, JSON.stringify(snapshot), lead.id]);
    notify(lead.vendor_id, `📦 ${lead.name || 'Client'} picked "${p[0].name}"`, `Lead #${lead.id}`, 'package');
    res.json({ ok: true, money: await moneySummary(rows[0]) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 🌐 PUBLIC: POST /api/portal/:token/office-visit → client requests to pay in person */
router.post('/:token/office-visit', async (req, res) => {
  try {
    const lead = await leadByToken(req.params.token);
    if (!lead) return res.status(404).json({ error: 'Link not found' });
    notify(lead.vendor_id, `🏢 ${lead.name || 'Client'} wants to pay in person`, `Lead #${lead.id}`, 'payment');
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
