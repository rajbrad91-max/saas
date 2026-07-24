import express from 'express';
import prisma from '../config/prisma.js';
import { moneySummary } from './payments.js';
import { notify } from './notifications.js';

const router = express.Router();

// helper: lead by client token (the token itself is the access key)
async function leadByToken(token) {
  return prisma.leads.findFirst({ where: { client_token: token } });
}

/* 🌐 PUBLIC: GET /api/portal/:token → lead + vendor packages + money */
router.get('/:token', async (req, res) => {
  try {
    const lead = await leadByToken(req.params.token);
    if (!lead) return res.status(404).json({ error: 'Link not found' });
    const vendor = await prisma.vendors.findUnique({
      where: { id: lead.vendor_id },
      select: { business_name: true },
    });
    // The packages this client was actually offered — their own copy, taken
    // when the vendor loaded the folder. Reading the lead's set rather than the
    // vendor's master list means the offer stays exactly as sent even if the
    // master is edited or deleted afterwards.
    const leadPkgs = await prisma.lead_packages.findMany({
      where: { lead_id: lead.id },                              // 🔒 tenancy via the lead
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    // Fall back to the vendor's folder for leads created before per-lead
    // packages existed, so an old link doesn't suddenly show nothing.
    let templates = [], packages = [];
    if (leadPkgs.length) {
      packages = leadPkgs.map(p => ({
        id: p.id, name: p.name, base_price: p.price,
        inclusions: p.inclusions, included_hours: null, per_hour_price: null,
      }));
    } else {
      const tplWhere = { vendor_id: lead.vendor_id };           // 🔒 tenancy
      if (lead.package_template_id) tplWhere.id = lead.package_template_id;
      templates = await prisma.package_templates.findMany({ where: tplWhere, orderBy: { id: 'asc' } });
      packages = await prisma.vendor_packages.findMany({
        where: {
          vendor_id: lead.vendor_id,                            // 🔒 tenancy
          ...(lead.package_template_id ? { template_id: lead.package_template_id } : {}),
        },
        orderBy: { base_price: 'asc' },
      });
    }
    const money = await moneySummary(lead);
    res.json({
      lead: {
        name: lead.name, event_type: lead.event_type, event_date: lead.event_date,
        hours: lead.hours, package_id: lead.package_id, status: lead.status,
      },
      business_name: vendor?.business_name,
      templates, packages, money,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* 🌐 PUBLIC: POST /api/portal/:token/pick → client picks a package */
router.post('/:token/pick', async (req, res) => {
  const { package_id } = req.body;
  try {
    const lead = await leadByToken(req.params.token);
    if (!lead) return res.status(404).json({ error: 'Link not found' });
    // The id refers to one of the lead's OWN packages when it has them, and to
    // a vendor master only for old leads that predate per-lead packages.
    const own = await prisma.lead_packages.findFirst({
      where: { id: Number(package_id), lead_id: lead.id },      // 🔒 tenancy via the lead
    });
    if (own) {
      const snapshot = { name: own.name, base_price: own.price, inclusions: own.inclusions };
      await prisma.$transaction([
        // exactly one package can be the chosen one
        prisma.lead_packages.updateMany({ where: { lead_id: lead.id }, data: { is_selected: false } }),
        prisma.lead_packages.update({ where: { id: own.id }, data: { is_selected: true } }),
        prisma.leads.update({
          where: { id: lead.id },
          data: { package_snapshot: snapshot, updated_at: new Date() },
        }),
      ]);
      const updated = await prisma.leads.findUnique({ where: { id: lead.id } });
      notify(lead.vendor_id, `📦 ${lead.name || 'Client'} picked "${own.name}"`, `Lead #${lead.id}`, 'package');
      return res.json({ lead: updated, money: await moneySummary(updated) });
    }

    // 🔒 legacy path: the package must belong to the lead's vendor
    const p = await prisma.vendor_packages.findFirst({
      where: {
        id: Number(package_id),
        vendor_id: lead.vendor_id,                             // 🔒 tenancy
        // and only from the folder the vendor actually sent — the portal hides
        // the others, but the id could still be posted directly
        ...(lead.package_template_id ? { template_id: lead.package_template_id } : {}),
      },
    });
    if (!p) return res.status(400).json({ error: 'Package not found' });
    const snapshot = {
      name: p.name, base_price: p.base_price, included_hours: p.included_hours,
      per_hour_price: p.per_hour_price, inclusions: p.inclusions,
    };
    const updated = await prisma.leads.update({
      where: { id: lead.id },
      data: { package_id: p.id, package_snapshot: snapshot, updated_at: new Date() },
    });
    notify(lead.vendor_id, `📦 ${lead.name || 'Client'} picked "${p.name}"`, `Lead #${lead.id}`, 'package');
    res.json({ ok: true, money: await moneySummary(updated) });
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
