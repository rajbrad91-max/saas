import { useState, useEffect, useRef } from 'react';
import './gallery.css';

const API = '/api/g';
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Playfair+Display:wght@500;700&family=Jost:wght@400;600&family=Montserrat:wght@400;600&family=Poppins:wght@400;600&family=Lora:wght@400;600&family=Raleway:wght@400;600&display=swap';

function ensureFonts() {
  if (document.getElementById('pg-fonts')) return;
  const l = document.createElement('link');
  l.id = 'pg-fonts'; l.rel = 'stylesheet'; l.href = FONTS_CSS;
  document.head.appendChild(l);
}

export default function PublicGallery({ token, embedded }) {
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');
  const [authing, setAuthing] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [session, setSession] = useState(null); // { role, vt, title, photos, mode, theme, events }
  const [lightbox, setLightbox] = useState(null);
  const [zipBusy, setZipBusy] = useState('');
  const [activeEvent, setActiveEvent] = useState('all'); // per-client tab
  const [matchIds, setMatchIds] = useState(null); // selfie filter (null = all)
  const [selfieBusy, setSelfieBusy] = useState(false);
  const [selfieMsg, setSelfieMsg] = useState('');
  const selfieInput = useRef(null);

  useEffect(() => { ensureFonts(); }, []);
  useEffect(() => {
    fetch(`${API}/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(new Error(j.error || 'Not found'))))
      .then(d => setMeta(d))
      .catch(e => setErr(e.message));
  }, [token]);

  const theme = session?.theme || meta?.theme || {};
  const styleVars = {
    '--pg-bg': theme.bg_color || '#0f1115',
    '--pg-head': theme.heading_color || '#f3f4f6',
    '--pg-accent': theme.accent_color || '#2dd4bf',
    '--pg-sub': theme.sub_color || '#9ca3af',
    '--pg-hfont': `'${theme.heading_font || 'Playfair Display'}', serif`,
    '--pg-bfont': `'${theme.body_font || 'Jost'}', sans-serif`,
  };

  async function unlock(e) {
    e?.preventDefault();
    if (!pw.trim()) return;
    setAuthing(true); setAuthErr('');
    try {
      const r = await fetch(`${API}/${token}/auth`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Wrong password');
      setSession(d);
    } catch (e) { setAuthErr(e.message); }
    finally { setAuthing(false); }
  }

  function photoUrl(id, type) { return `${API}/${token}/photo/${id}/${type}?vt=${session.vt}`; }
  function downloadOne(id) { window.location.href = `${API}/${token}/download/${id}?vt=${session.vt}`; }
  function downloadAll(eventId) {
    const key = eventId || 'all';
    setZipBusy(key);
    const q = eventId ? `&event=${eventId}` : '';
    window.location.href = `${API}/${token}/download-all?vt=${session.vt}${q}`;
    setTimeout(() => setZipBusy(''), 4000);
  }

  async function onSelfie(e) {
    const file = e.target.files[0];
    if (!file) return;
    setSelfieBusy(true); setSelfieMsg('🔍 Finding your photos…');
    try {
      const fd = new FormData();
      fd.append('selfie', file);
      const r = await fetch(`${API}/${token}/selfie?vt=${session.vt}`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Search failed');
      setMatchIds(d.photo_ids);
      setSelfieMsg(d.matches ? `✨ Found ${d.matches} photos of you` : 'No matches found 🙁');
    } catch (err) { setSelfieMsg('⚠️ ' + err.message); }
    finally { setSelfieBusy(false); e.target.value = ''; }
  }
  function clearSelfie() { setMatchIds(null); setSelfieMsg(''); }

  if (err) return <div className="pg-wrap" style={styleVars}><div className="pg-msg">⚠️ {err}</div></div>;
  if (!meta) return <div className="pg-wrap" style={styleVars}><div className="pg-msg">Loading…</div></div>;

  // 🔒 password gate
  if (!session) {
    const m = meta.album;
    return (
      <div className="pg-wrap" style={styleVars}>
        <div className="pg-gate">
          {m.cover && <img className="pg-gate-cover" src={`${API}/${token}/cover`} alt="" />}
          <div className="pg-gate-kicker">{theme.title_text || 'Client Galleries'}</div>
          <h1 className="pg-gate-title">{m.title}</h1>
          <div className="pg-gate-sub">{m.photo_count} photos · 🔒 password required</div>
          <form onSubmit={unlock} className="pg-gate-form">
            <input className="pg-input" type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
            <button className="pg-btn" type="submit" disabled={authing}>{authing ? 'Checking…' : '🔓 View Gallery'}</button>
          </form>
          {authErr && <div className="pg-err">⚠️ {authErr}</div>}
        </div>
      </div>
    );
  }

  // build the visible photo set
  let photos = session.photos;
  if (session.mode === 'per_client' && activeEvent !== 'all') photos = photos.filter(p => String(p.event_id) === String(activeEvent));
  if (matchIds !== null) photos = photos.filter(p => matchIds.includes(p.id));

  return (
    <div className="pg-wrap" style={styleVars}>
      <div className="pg-head">
        <div>
          <div className="pg-kicker">{theme.title_text || 'Client Galleries'}</div>
          <h1 className="pg-title">{session.title}</h1>
          <div className="pg-count">{session.photos.length} photos{session.role === 'admin' && ' · 🔑 admin'}</div>
        </div>
        <div className="pg-actions">
          {session.faceReady && (
            matchIds === null
              ? <button className="pg-btn pg-btn-ghost" onClick={() => selfieInput.current?.click()} disabled={selfieBusy}>{selfieBusy ? '⏳' : '🤳 Find my photos'}</button>
              : <button className="pg-btn pg-btn-ghost" onClick={clearSelfie}>✕ Show all</button>
          )}
          <input ref={selfieInput} type="file" accept="image/*" hidden onChange={onSelfie} />
          {session.photos.length > 0 && (
            <button className="pg-btn" onClick={() => downloadAll(null)} disabled={zipBusy === 'all'}>{zipBusy === 'all' ? '⏳ Preparing…' : '⬇️ Download All'}</button>
          )}
        </div>
      </div>

      {selfieMsg && <div className="pg-selfie-msg">{selfieMsg}</div>}

      {/* per-client mode: event tabs + per-event zip */}
      {session.mode === 'per_client' && session.events.length > 0 && matchIds === null && (
        <div className="pg-events">
          <button className={`pg-ev ${activeEvent === 'all' ? 'on' : ''}`} onClick={() => setActiveEvent('all')}>All</button>
          {session.events.map(ev => (
            <span key={ev.id} className="pg-ev-wrap">
              <button className={`pg-ev ${String(activeEvent) === String(ev.id) ? 'on' : ''}`} onClick={() => setActiveEvent(ev.id)}>{ev.name}</button>
              <button className="pg-ev-zip" title={`Download ${ev.name} zip`} onClick={() => downloadAll(ev.id)} disabled={zipBusy === ev.id}>{zipBusy === ev.id ? '⏳' : '⬇️'}</button>
            </span>
          ))}
        </div>
      )}

      {photos.length === 0 ? (
        <div className="pg-msg">{matchIds !== null ? 'No matching photos 🙁' : 'No photos here yet 📭'}</div>
      ) : (
        <div className="pg-grid">
          {photos.map(p => (
            <div key={p.id} className="pg-tile" onClick={() => setLightbox(p)}>
              <img src={photoUrl(p.id, 'thumb')} loading="lazy" alt={p.name} />
              <button className="pg-tile-dl" onClick={e => { e.stopPropagation(); downloadOne(p.id); }} title="Download">⬇️</button>
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="pg-lb" onClick={() => setLightbox(null)}>
          <button className="pg-lb-x" onClick={() => setLightbox(null)}>✕</button>
          <img className="pg-lb-img" src={photoUrl(lightbox.id, 'preview')} alt={lightbox.name} onClick={e => e.stopPropagation()} />
          <button className="pg-lb-dl" onClick={e => { e.stopPropagation(); downloadOne(lightbox.id); }}>⬇️ Download</button>
        </div>
      )}

      {!embedded && <div className="pg-foot">Powered by iwopo</div>}
    </div>
  );
}
