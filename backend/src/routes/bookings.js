import express from 'express';
import prisma from '../config/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { moneySummary } from './payments.js';

const router = express.Router();

function vid(req) {
  if (req.user.role === 'super_admin') return req.query.vendor_id || req.body.vendor_id || null;
  return req.user.vendor_id;
}

// GET /api/bookings → booked leads (calendar-ready)
router.get('/', requireAuth, async (req, res) => {
  const v = vid(req);
  try {
    // 🔒 tenancy: a vendor is always filtered to their own leads; only a super_admin
    // with no vendor_id selected sees across tenants (same rule as before).
    const rows = await prisma.leads.findMany({
      where: v ? { vendor_id: Number(v), status: 'booked' } : { status: 'booked' },
      orderBy: { event_date: { sort: 'asc', nulls: 'last' } },
    });
    const bookings = [];
    for (const l of rows) bookings.push({ ...l, money: await moneySummary(l) });
    res.json({ bookings });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/bookings/:leadId/status → new | contacted | quoted | booked | completed | cancelled
const STATUSES = ['new', 'contacted', 'quoted', 'booked', 'completed', 'cancelled'];
router.put('/:leadId/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const id = Number(req.params.leadId);
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const own = await prisma.leads.findUnique({ where: { id }, select: { vendor_id: true } });
    if (!own) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'super_admin' && own.vendor_id !== vid(req))
      return res.status(403).json({ error: 'Forbidden' });          // 🔒 tenancy
    const lead = await prisma.leads.update({
      where: { id },
      data: { status, updated_at: new Date() },
    });
    res.json({ lead });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
