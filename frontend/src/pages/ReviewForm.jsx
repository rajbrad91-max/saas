import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './inquiry.css';

export default function ReviewForm({ vendorId }) {
  const [f, setF] = useState({ name: '', rating: 5, text: '' });
  const [brand, setBrand] = useState('');
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.inquirySettings(vendorId).then(d => setBrand(d.settings.brand_name || '')).catch(() => {});
  }, [vendorId]);

  async function submit() {
    setErr('');
    if (!f.name || !f.text) return setErr('Name and review required');
    setBusy(true);
    try { await api.submitReview(vendorId, f); setDone(true); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (done) return (
    <div className="iq-wrap"><div className="iq-card iq-done">
      <div className="iq-check">✓</div><h2>Thank you! 🙏</h2><p>Your review means the world to us ⭐</p>
    </div></div>
  );

  return (
    <div className="iq-wrap">
      <div className="iq-card" style={{ maxWidth: 460 }}>
        <div className="iq-brand">⭐ {brand || 'Leave a review'}</div>
        <p className="iq-sub">How was your experience? 💬</p>

        <label>Your name</label>
        <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Full name" />

        <label style={{ marginTop: 12 }}>Rating</label>
        <div style={{ fontSize: 30, cursor: 'pointer', letterSpacing: 4 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} onClick={() => setF({ ...f, rating: n })}
              style={{ opacity: n <= f.rating ? 1 : 0.25 }}>⭐</span>
          ))}
        </div>

        <label style={{ marginTop: 12 }}>Your review</label>
        <textarea rows="4" value={f.text} onChange={e => setF({ ...f, text: e.target.value })} placeholder="Tell us about your experience…" />

        {err && <div className="iq-err">⚠️ {err}</div>}
        <button className="iq-btn" onClick={submit} disabled={busy}>{busy ? 'Sending…' : '📨 Submit review'}</button>
      </div>
    </div>
  );
}
