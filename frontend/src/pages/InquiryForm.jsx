import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './inquiry.css';

export default function InquiryForm({ vendorId }) {
  const [cfg, setCfg] = useState(null);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Section 1 — Personal Info (fixed, same for all vendors)
  const [p, setP] = useState({
    role: '', name: '', email: '', phone: '', instagram: '', heard: '',
  });
  const setPI = (k, v) => setP(s => ({ ...s, [k]: v }));

  // Section 2 — custom answers keyed by field id
  const [answers, setAnswers] = useState({});
  const setAns = (id, v) => setAnswers(s => ({ ...s, [id]: v }));

  // Section 3 — Notes (fixed)
  const [notes, setNotes] = useState('');

  useEffect(() => {
    api.inquirySettings(vendorId).then(d => setCfg(d.settings)).catch(() => setCfg({}));
  }, [vendorId]);

  async function submit() {
    setErr('');
    if (!p.name || !p.email) { setErr('Name and email are required'); return; }
    for (const fld of (cfg.custom_fields || [])) {
      if (fld.required && !answers[fld.id]) { setErr(`"${fld.label}" is required`); return; }
    }
    setBusy(true);
    try {
      await api.createLead({
        vendor_id: Number(vendorId),
        name: p.name, email: p.email, phone: p.phone,
        role: p.role, instagram: p.instagram, heard: p.heard,
        notes,
        custom_data: answers,
      });
      setDone(true);
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  if (done) return (
    <div className="iq-wrap">
      <div className="iq-card iq-done">
        <div className="iq-check">&#10003;</div>
        <h2>Thank you! &#127881;</h2>
        <p>Your inquiry has been sent. We'll be in touch soon.</p>
      </div>
    </div>
  );

  if (!cfg) return <div className="iq-wrap"><div className="iq-card">Loading&#8230;</div></div>;

  const c = cfg;
  const brand = c.brand_color || '#2dd4bf';
  const font = c.font || 'Inter';

  return (
    <div className="iq-wrap" style={{ fontFamily: `'${font}', sans-serif` }}>
      <div className={`iq-card iq-theme-${c.theme || 'classic'}`} style={{ '--brand': brand }}>
        <div className="iq-brand" style={{ color: brand }}>&#11041; {c.brand_name || 'Booking Inquiry'}</div>
        <p className="iq-sub">{c.intro_text || 'Tell us about your event &#128171;'}</p>

        {/* Section 1: Personal Information */}
        <div className="iq-section-title">Personal Information</div>

        <label>Your Role *</label>
        <select value={p.role} onChange={e => setPI('role', e.target.value)}>
          <option value="">Select&#8230;</option>
          <option>Bride</option><option>Groom</option><option>Planner</option><option>Other</option>
        </select>

        <label>Full Name *</label>
        <input value={p.name} onChange={e => setPI('name', e.target.value)} placeholder="Full name" />

        <div className="iq-row">
          <div><label>Email *</label>
            <input value={p.email} onChange={e => setPI('email', e.target.value)} placeholder="you@email.com" /></div>
          <div><label>Phone *</label>
            <input value={p.phone} onChange={e => setPI('phone', e.target.value)} placeholder="(555) 555-5555" /></div>
        </div>

        <label>Instagram Handle</label>
        <input value={p.instagram} onChange={e => setPI('instagram', e.target.value)} placeholder="@yourhandle" />

        <label>How did you hear about us?</label>
        <select value={p.heard} onChange={e => setPI('heard', e.target.value)}>
          <option value="">Select&#8230;</option>
          <option>Friend</option><option>Google Maps</option><option>Instagram</option><option>Facebook</option><option>Other</option>
        </select>

        {/* Section 2: Inquiry Details (custom) */}
        {(c.custom_fields || []).length > 0 && (
          <>
            <div className="iq-section-title">{c.details_heading || 'Event Details'}</div>
            {c.custom_fields.map(fld => (
              <CustomField key={fld.id} fld={fld} value={answers[fld.id]} onChange={v => setAns(fld.id, v)} />
            ))}
          </>
        )}

        {/* Section 3: Notes */}
        <div className="iq-section-title">Notes</div>
        <label>Anything else?</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="3" placeholder="Tell us more&#8230;" />

        {err && <div className="iq-err">&#9888;&#65039; {err}</div>}
        <button className="iq-btn" onClick={submit} disabled={busy} style={{ background: brand }}>
          {busy ? 'Sending&#8230;' : '&#128228; Send Inquiry'}
        </button>
      </div>
    </div>
  );
}

// Renders one custom field by type
function CustomField({ fld, value, onChange }) {
  const label = <label>{fld.label}{fld.required && ' *'}</label>;

  if (fld.type === 'dropdown') return (<>
    {label}
    <select value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Select&#8230;</option>
      {(fld.options || []).map((o, i) => <option key={i}>{o}</option>)}
    </select>
  </>);

  if (fld.type === 'text') return (<>{label}
    <input value={value || ''} onChange={e => onChange(e.target.value)} /></>);

  if (fld.type === 'date') return (<>{label}
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} /></>);

  if (fld.type === 'time') return (<>{label}
    <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} /></>);

  if (fld.type === 'location') return (<>{label}
    <LocationField value={value || ''} onChange={onChange} /></>);

  if (fld.type === 'checkbox') return (
    <label className="iq-check-row">
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      {fld.label}
    </label>
  );

  return null;
}

// Location with free auto-suggest (Photon / OpenStreetMap - no key)
function LocationField({ value, onChange }) {
  const [sugs, setSugs] = useState([]);
  const [open, setOpen] = useState(false);

  async function lookup(q) {
    onChange(q);
    if (q.length < 3) { setSugs([]); return; }
    try {
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5`);
      const d = await r.json();
      setSugs((d.features || []).map(f => {
        const pr = f.properties;
        return [pr.name, pr.city, pr.state, pr.country].filter(Boolean).join(', ');
      }));
      setOpen(true);
    } catch { setSugs([]); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input value={value} onChange={e => lookup(e.target.value)} placeholder="Start typing an address&#8230;" autoComplete="off" />
      {open && sugs.length > 0 && (
        <div className="iq-sugs">
          {sugs.map((s, i) => (
            <div key={i} className="iq-sug" onClick={() => { onChange(s); setOpen(false); }}>{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}
