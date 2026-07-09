import { useState, useEffect } from 'react';
import './gallery.css';

const API = '/api/g';

export default function PublicGallery({ token }) {
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState('');
  const [pw, setPw] = useState('');
  const [authing, setAuthing] = useState(false);
  const [authErr, setAuthErr] = useState('');
  const [session, setSession] = useState(null); // { role, vt, title, photos }
  const [lightbox, setLightbox] = useState(null); // photo obj
  const [zipBusy, setZipBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/${token}`)
      .then(r => r.ok ? r.json() : r.json().then(j => Promise.reject(new Error(j.error || 'Not found'))))
      .then(d => setMeta(d.album))
      .catch(e => setErr(e.message));
  }, [token]);

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
  async function downloadAll() {
    setZipBusy(true);
    window.location.href = `${API}/${token}/download-all?vt=${session.vt}`;
    setTimeout(() => setZipBusy(false), 4000);
  }

  if (err) return <div className="pg-wrap"><div className="pg-msg">⚠️ {err}</div></div>;
  if (!meta) return <div className="pg-wrap"><div className="pg-msg">Loading…</div></div>;

  // 🔒 password gate
  if (!session) {
    return (
      <div className="pg-wrap">
        <div className="pg-gate">
          {meta.cover && <img className="pg-gate-cover" src={`${API}/${token}/cover`} alt="" />}
          <h1 className="pg-gate-title">{meta.title}</h1>
          <div className="pg-gate-sub">{meta.photo_count} photos · 🔒 password required</div>
          <form onSubmit={unlock} className="pg-gate-form">
            <input className="pg-input" type="password" placeholder="Enter password" value={pw} onChange={e => setPw(e.target.value)} autoFocus />
            <button className="pg-btn" type="submit" disabled={authing}>{authing ? 'Checking…' : '🔓 View Gallery'}</button>
          </form>
          {authErr && <div className="pg-err">⚠️ {authErr}</div>}
        </div>
      </div>
    );
  }

  // 🖼️ gallery
  return (
    <div className="pg-wrap">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">{session.title}</h1>
          <div className="pg-count">{session.photos.length} photos{session.role === 'admin' && ' · 🔑 admin'}</div>
        </div>
        {session.photos.length > 0 && (
          <button className="pg-btn pg-dl-all" onClick={downloadAll} disabled={zipBusy}>{zipBusy ? '⏳ Preparing…' : '⬇️ Download All (ZIP)'}</button>
        )}
      </div>

      {session.photos.length === 0 ? (
        <div className="pg-msg">No photos in this gallery yet 📭</div>
      ) : (
        <div className="pg-grid">
          {session.photos.map(p => (
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

      <div className="pg-foot">Powered by iwopo</div>
    </div>
  );
}
