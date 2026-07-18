import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { sendPlatformEmail } from './email.js';

const router = express.Router();
const TRIAL_LIMIT = 2; // max trials per IP
const APP_URL = process.env.APP_URL || 'https://iwopo.com';

// Get the real client IP (behind nginx proxy)
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? fwd.split(',')[0].trim() : req.socket.remoteAddress || '').replace('::ffff:', '');
}

// How many trials this IP has already used
async function trialCount(ip) {
  const { rows } = await query('SELECT COUNT(*)::int AS n FROM trial_signups WHERE ip_address=$1', [ip]);
  return rows[0].n;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

  const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, vendor_id: user.vendor_id }
  });
});

// GET /api/auth/trial-eligible  → tells frontend if this IP can still start a trial
router.get('/trial-eligible', async (req, res) => {
  const used = await trialCount(clientIp(req));
  res.json({ eligible: used < TRIAL_LIMIT, used, limit: TRIAL_LIMIT });
});

// POST /api/auth/signup  (public - from Selling Platform)
router.post('/signup', async (req, res) => {
  const { businessName, name, email, password, plan } = req.body;
  if (!businessName || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const isPaid = plan && plan !== 'trial';
  const ip = clientIp(req);

  // Trial limit only applies to TRIAL signups (paid always allowed)
  if (!isPaid) {
    const used = await trialCount(ip);
    if (used >= TRIAL_LIMIT) {
      return res.status(429).json({
        error: 'trial_limit',
        message: `You've used all ${TRIAL_LIMIT} free trials. Please choose a paid plan to continue. 💳`
      });
    }
  }

  const exists = await query('SELECT id FROM users WHERE email=$1', [email]);
  if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

  // 1. Create vendor (tenant)
  const v = await query(
    `INSERT INTO vendors (business_name, plan, status, signup_ip) VALUES ($1,$2,$3,$4) RETURNING id`,
    [businessName, isPaid ? plan : 'starter', isPaid ? 'active' : 'trial', ip]
  );
  const vendorId = v.rows[0].id;

  // 2. Create vendor user linked to that tenant
  const hash = await bcrypt.hash(password, 10);
  const u = await query(
    `INSERT INTO users (name, email, password_hash, role, vendor_id)
     VALUES ($1,$2,$3,'vendor',$4) RETURNING id, name, role, vendor_id`,
    [name || businessName, email, hash, vendorId]
  );

  // 3. Record trial against IP (only for trials)
  if (!isPaid) {
    await query(`INSERT INTO trial_signups (ip_address, email, vendor_id) VALUES ($1,$2,$3)`,
      [ip, email, vendorId]);
  }

  // 4. Referral reward — if this email was referred AND signed up PAID → reward both 🎁
  if (isPaid) {
    await query(
      `UPDATE referrals SET status='rewarded', friend_vendor_id=$1, rewarded_at=NOW()
       WHERE friend_email=$2 AND status='pending'`,
      [vendorId, email]
    );
  }

  res.status(201).json({ token: signToken(u.rows[0]), user: u.rows[0] });
});

// POST /api/auth/forgot  → email a reset link (always responds ok, to avoid leaking which emails exist)
router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const { rows } = await query('SELECT id, name, role FROM users WHERE email=$1', [email]);
    const user = rows[0];
    // Only send for real accounts; still return ok either way.
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1,$2, NOW() + INTERVAL '1 hour')`,
        [user.id, hash]
      );
      const link = `${APP_URL}/reset-password?token=${token}`;
      try {
        await sendPlatformEmail(
          email,
          'Reset your iwopo password',
          `Hi ${user.name || ''},\n\nReset your password using this link (valid for 1 hour):\n${link}\n\nIf you didn't request this, you can ignore this email.`,
          `<p>Hi ${user.name || ''},</p><p>Reset your password using the link below (valid for 1 hour):</p><p><a href="${link}">Reset my password</a></p><p>If you didn't request this, you can ignore this email.</p>`
        );
      } catch (e) {
        // Platform email not configured yet → surface a clear message in dev
        if (e.code === 'no_platform_smtp')
          return res.status(200).json({ ok: true, pending: true, message: 'Reset recorded, but platform email is not set up yet. ⚙️' });
        throw e;
      }
    }
    res.json({ ok: true, message: 'If that email exists, a reset link is on its way. 📬' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/reset  → set a new password using a valid token
router.post('/reset', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash=$1 AND used_at IS NULL AND expires_at > NOW()`,
      [hash]
    );
    const row = rows[0];
    if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    const newHash = await bcrypt.hash(password, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, row.user_id]);
    await query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [row.id]);
    res.json({ ok: true, message: 'Password updated — you can log in now. ✅' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/auth/change-password  → logged-in user changes own password (current + new)
router.post('/change-password', requireAuth, async (req, res) => {
  const { current, next } = req.body;
  if (!current || !next) return res.status(400).json({ error: 'Current and new password required' });
  if (next.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  try {
    const { rows } = await query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    const u = rows[0];
    if (!u) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(current, u.password_hash);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(next, 10);
    await query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, req.user.id]);
    res.json({ ok: true, message: 'Password changed. 🔒' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
