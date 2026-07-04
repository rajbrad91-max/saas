import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './inquiry.css';

export default function CrewCheckin({ token }) {
  const [a, setA] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.checkinInfo(token).then(d => setA(d.assignment)).catch(e => setErr(e.message));
  }, [token]);

  async function act(action) {
    setBusy(true);
    try { const d = await api.checkinAction(token, action); setA(x => ({ ...x, ...d.assignment })); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (err) return <div className="iq-wrap"><div className="iq-card">⚠️ {err}</div></div>;
  if (!a) return <div className="iq-wrap"><div className="iq-card">Loading…</div></div>;

  return (
    <div className="iq-wrap">
      <div className="iq-card" style={{ maxWidth: 420, textAlign: 'center' }}>
        <div className="iq-brand">👷 Crew Check-in</div>
        <p className="iq-sub">Hi {a.name}! {a.duty ? `Duty: ${a.duty}` : ''}</p>

        <div style={{ background: '#0d1417', border: '1px solid #223238', borderRadius: 10, padding: 14, fontSize: 13, textAlign: 'left', marginBottom: 16 }}>
          🎉 {a.client_name} · {a.event_type}<br />
          📅 {a.event_date ? String(a.event_date).slice(0, 10) : '—'}<br />
          📍 {a.location || '—'}<br />
          ⏰ {a.arrive_time || '?'} → {a.leave_time || '?'}
        </div>

        {a.checked_in_at ? (
          <div style={{ color: '#4ade80', marginBottom: 10 }}>✅ Checked in {String(a.checked_in_at).slice(11, 16)}</div>
        ) : (
          <button className="iq-btn" onClick={() => act('in')} disabled={busy}>✅ Check in</button>
        )}

        {a.checked_in_at && (a.checked_out_at ? (
          <div style={{ color: '#4ade80' }}>🏁 Checked out {String(a.checked_out_at).slice(11, 16)}</div>
        ) : (
          <button className="iq-btn" onClick={() => act('out')} disabled={busy} style={{ marginTop: 8 }}>🏁 Check out</button>
        ))}
      </div>
    </div>
  );
}
