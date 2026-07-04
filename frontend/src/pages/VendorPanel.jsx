import { useState, useEffect } from 'react';
import { api, getUser, clearSession } from '../lib/api';
import './vendor.css';

// ðŸ—ï¸ tab â†’ required feature (one map controls everything)
const TAB_FEATURE = {
  leads: 'leads', bookings: 'leads', packages: 'leads', inqform: 'leads',
  contracts: 'contracts', crew: 'crew',
};

function FeatureLocked({ goServices }) {
  return (
    <div className="table-wrap" style={{ padding: 40, textAlign: 'center', maxWidth: 520 }}>
      <div style={{ fontSize: 44 }}>ðŸ”’</div>
      <h2 style={{ margin: '10px 0 6px' }}>This feature isn't in your plan</h2>
      <p style={{ color: '#7c9199', fontSize: 13, marginBottom: 18 }}>Upgrade your plan or add it as a standalone service to unlock it. âœ¨</p>
      <button className="refresh" onClick={goServices} style={{ background: '#2dd4bf', color: '#06231f' }}>ðŸ§© View My Services</button>
    </div>
  );
}

export default function VendorPanel({ onLogout }) {
  const [services, setServices] = useState([]);
  const [features, setFeatures] = useState(null);   // ðŸ—ï¸ entitlements (null = loading)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const user = getUser();

  // ðŸ—ï¸ single access check used everywhere
  const has = (key) => !!features && (features.includes('*') || features.includes(key));

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [d, f] = await Promise.all([api.myServices(), api.myFeatures()]);
      setServices(d.services);
      setFeatures(f.features || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() { clearSession(); onLogout(); }

  const active = services.filter(s => s.enabled);

  return (
    <div className="dash">
      <aside className="sidebar">
        <div className="brand">ðŸ“¸ My Studio<small>VENDOR</small></div>
        <div className={`nav-item ${tab==='dashboard'?'active':''}`} onClick={() => setTab('dashboard')}>ðŸ“Š Dashboard</div>
        {has('leads') && <div className={`nav-item ${tab==='leads'?'active':''}`} onClick={() => setTab('leads')}>ðŸ“‹ Leads</div>}
        {has('leads') && <div className={`nav-item ${tab==='bookings'?'active':''}`} onClick={() => setTab('bookings')}>ðŸ“… Bookings</div>}
        {has('contracts') && <div className={`nav-item ${tab==='contracts'?'active':''}`} onClick={() => setTab('contracts')}>ðŸ“„ Contracts & Invoices</div>}
        {has('crew') && <div className={`nav-item ${tab==='crew'?'active':''}`} onClick={() => setTab('crew')}>ðŸ‘· My Crew</div>}
        {has('leads') && <div className={`nav-item ${tab==='packages'?'active':''}`} onClick={() => setTab('packages')}>ðŸ“¦ My Packages</div>}
        {has('leads') && <div className={`nav-item ${tab==='inqform'?'active':''}`} onClick={() => setTab('inqform')}>ðŸŽ¨ Inquiry Form</div>}
        <div className={`nav-item ${tab==='services'?'active':''}`} onClick={() => setTab('services')}>ðŸ§© My Services</div>
        <div className={`nav-item ${tab==='refer'?'active':''}`} onClick={() => setTab('refer')}>ðŸ‘¥ Refer a Friend</div>
        <div className={`nav-item ${tab==='settings'?'active':''}`} onClick={() => setTab('settings')}>âš™ï¸ Settings</div>
        <div className="logout" onClick={handleLogout}>ðŸšª Log out</div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>{tab === 'dashboard' ? 'Dashboard' : tab === 'refer' ? 'Refer a Friend' : tab === 'leads' ? 'Leads' : tab === 'settings' ? 'Settings' : tab === 'packages' ? 'My Packages' : tab === 'bookings' ? 'Bookings' : tab === 'inqform' ? 'Inquiry Form' : tab === 'contracts' ? 'Contracts & Invoices' : tab === 'crew' ? 'My Crew' : 'My Services'}</h1>
            <div className="sub">Welcome back, {user?.name} ðŸ‘‹</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NotifBell />
            <button className="refresh" onClick={load}>ðŸ”„ Refresh</button>
          </div>
        </div>

        {error && <div className="err-banner">âš ï¸ {error}</div>}
        {TAB_FEATURE[tab] && !has(TAB_FEATURE[tab]) ? (
          <FeatureLocked goServices={() => setTab('services')} />
        ) : loading ? <div className="loading">Loadingâ€¦</div> : tab === 'refer' ? (
          <ReferForm user={user} />
        ) : tab === 'leads' ? (
          <LeadsView />
        ) : tab === 'bookings' ? (
          <BookingsView />
        ) : tab === 'contracts' ? (
          <ContractsTab />
        ) : tab === 'crew' ? (
          <CrewView />
        ) : tab === 'inqform' ? (
          <InqFormSettings user={user} />
        ) : tab === 'packages' ? (
          <PackagesView />
        ) : tab === 'settings' ? (
          <SettingsView user={user} />
        ) : tab === 'dashboard' ? (
          <DashHome goTab={setTab} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Service</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {services.map(s => (
                  <tr key={s.id}>
                    <td className="biz">{s.icon} {s.name}</td>
                    <td>${s.price}/mo</td>
                    <td><span className={`badge ${s.enabled?'active':'trial'}`}>{s.enabled ? 'Active' : 'Off'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function NotifBell() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unseen: 0 });

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  function load() { api.notifications().then(setData).catch(() => {}); }

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && data.unseen > 0) {
      await api.notificationsSeen().catch(() => {});
      setData(d => ({ ...d, unseen: 0 }));
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className="refresh" onClick={toggle} style={{ position: 'relative' }}>
        ðŸ””
        {data.unseen > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, background: '#fb7185', color: '#fff', borderRadius: 12, fontSize: 10, fontWeight: 800, padding: '2px 6px' }}>{data.unseen}</span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 44, width: 320, maxHeight: 400, overflowY: 'auto', background: '#131e22', border: '1px solid #223238', borderRadius: 12, zIndex: 40, boxShadow: '0 10px 30px #00000060' }}>
          {data.notifications.length === 0 ? (
            <div style={{ padding: 20, color: '#7c9199', fontSize: 13, textAlign: 'center' }}>No notifications yet ðŸ”•</div>
          ) : data.notifications.map(n => (
            <div key={n.id} style={{ padding: '11px 14px', borderBottom: '1px solid #223238', fontSize: 12.5 }}>
              <div style={{ fontWeight: 700 }}>{n.title}</div>
              {n.body && <div style={{ color: '#7c9199', marginTop: 2 }}>{n.body}</div>}
              <div style={{ color: '#4a6169', fontSize: 10.5, marginTop: 3 }}>{String(n.created_at).slice(0, 16).replace('T', ' ')}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CrewView() {
  const [crew, setCrew] = useState([]);
  const [f, setF] = useState({ name: '', role: '', phone: '', email: '' });
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9 };

  useEffect(() => { load(); }, []);
  function load() { api.crew().then(d => setCrew(d.crew || [])).catch(() => {}); }

  async function add() {
    if (!f.name) return setMsg('âš ï¸ Name required');
    setMsg('');
    try { await api.addCrew(f); setF({ name: '', role: '', phone: '', email: '' }); setMsg('âœ… Added'); setTimeout(() => setMsg(''), 1500); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function del(id) {
    if (!confirm('Remove this crew member?')) return;
    try { await api.deleteCrew(id); load(); } catch {}
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>âž• Add crew member {msg && <span style={{ fontSize: 13, color: msg[0] === 'âœ…' ? '#4ade80' : '#fb7185' }}>{msg}</span>}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input style={box} placeholder="Name *" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
          <input style={box} placeholder="Role (e.g. 2nd shooter)" value={f.role} onChange={e => setF({ ...f, role: e.target.value })} />
          <input style={box} placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} />
          <input style={box} placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        </div>
        <button className="refresh" onClick={add} style={{ marginTop: 10, background: '#2dd4bf', color: '#06231f' }}>+ Add to roster</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Email</th><th></th></tr></thead>
          <tbody>
            {crew.length === 0 ? (
              <tr><td colSpan="5" className="empty">No crew yet. Add your team above ðŸ‘† Then assign them on any booking.</td></tr>
            ) : crew.map(c => (
              <tr key={c.id}>
                <td className="biz">{c.name}</td>
                <td>{c.role || 'â€”'}</td>
                <td>{c.phone || 'â€”'}</td>
                <td>{c.email || 'â€”'}</td>
                <td><span style={{ cursor: 'pointer' }} onClick={() => del(c.id)}>ðŸ—‘ï¸</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DashHome({ goTab }) {
  const [leads, setLeads] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.leads().catch(() => ({ leads: [] })), api.bookings().catch(() => ({ bookings: [] }))])
      .then(([l, b]) => { setLeads(l.leads || []); setBookings(b.bookings || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loadingâ€¦</div>;

  const newLeads = leads.filter(l => l.status === 'new').length;
  const booked = leads.filter(l => l.status === 'booked').length;
  const recent = leads.slice(0, 5);
  const upcoming = bookings
    .filter(b => b.event_date && new Date(b.event_date) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 5);
  const SB = { new: 'trial', contacted: 'trial', quoted: 'trial', booked: 'active', completed: 'active', cancelled: 'past' };

  return (
    <>
      {/* ðŸ“Š Stats â€” same as perfectposes */}
      <div className="stats" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <div className="card"><div className="label">ðŸ“‹ Total Leads</div><div className="value">{leads.length}</div></div>
        <div className="card"><div className="label">ðŸ†• New Leads</div><div className="value">{newLeads}</div></div>
        <div className="card"><div className="label">âœ… Booked</div><div className="value">{booked}</div></div>
      </div>

      {/* ðŸ“‹ Recent Leads */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>ðŸ“‹ Recent Leads</h2>
        <button className="refresh" onClick={() => goTab('leads')} style={{ padding: '6px 14px', fontSize: 12 }}>View all â†’</button>
      </div>
      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table>
          <thead><tr><th>Name</th><th>Event</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {recent.length === 0 ? (
              <tr><td colSpan="4" className="empty">No leads yet. Share your inquiry link! ðŸ“¨</td></tr>
            ) : recent.map(l => (
              <tr key={l.id} onClick={() => goTab('leads')} style={{ cursor: 'pointer' }}>
                <td className="biz">{l.name}</td>
                <td>{l.event_type}</td>
                <td>{l.event_date ? String(l.event_date).slice(0, 10) : 'â€”'}</td>
                <td><span className={`badge ${SB[l.status] || 'trial'}`}>{l.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ðŸ“… Upcoming Events */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>ðŸ“… Upcoming Events</h2>
        <button className="refresh" onClick={() => goTab('bookings')} style={{ padding: '6px 14px', fontSize: 12 }}>View all â†’</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Client</th><th>Event</th><th>Date</th><th>Balance</th></tr></thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr><td colSpan="4" className="empty">No upcoming events. Book a lead to see it here ðŸ—“ï¸</td></tr>
            ) : upcoming.map(b => (
              <tr key={b.id} onClick={() => goTab('bookings')} style={{ cursor: 'pointer' }}>
                <td className="biz">{b.name}</td>
                <td>{b.event_type}</td>
                <td>{String(b.event_date).slice(0, 10)}</td>
                <td style={{ color: Number(b.money?.balance) > 0 ? 'var(--amber)' : 'var(--green)' }}>${b.money?.balance ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LeadsView() {
  const [leads, setLeads] = useState([]);
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('active'); // active | history
  const [checked, setChecked] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, [view]);
  async function load() {
    setLoading(true); setChecked([]);
    try {
      const d = view === 'active' ? await api.leads() : await api.leadsHistory();
      setLeads(d.leads || []);
    } catch {}
    finally { setLoading(false); }
  }

  function toggleCheck(id, e) {
    e.stopPropagation();
    setChecked(c => c.includes(id) ? c.filter(x => x !== id) : [...c, id]);
  }

  async function archiveChecked() {
    if (!checked.length) return;
    if (!confirm(`Archive ${checked.length} lead(s)? You can restore them from History.`)) return;
    try { await api.bulkArchive(checked); setMsg('ðŸ—‚ï¸ Archived'); setTimeout(() => setMsg(''), 1500); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  async function restore(id, e) {
    e.stopPropagation();
    try { await api.restoreLead(id); load(); } catch {}
  }

  if (sel) return <LeadDetail lead={sel} onBack={() => { setSel(null); load(); }} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="refresh" onClick={() => setView('active')}
            style={{ background: view === 'active' ? '#2dd4bf' : '#0d1417', color: view === 'active' ? '#06231f' : '#e6f0f2' }}>ðŸ“‹ Active</button>
          <button className="refresh" onClick={() => setView('history')}
            style={{ background: view === 'history' ? '#2dd4bf' : '#0d1417', color: view === 'history' ? '#06231f' : '#e6f0f2' }}>ðŸ“œ History</button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: msg[0] === 'âš ' ? '#fb7185' : '#4ade80' }}>{msg}</span>}
          {view === 'active' && checked.length > 0 && (
            <button className="refresh" onClick={archiveChecked} style={{ background: '#fb718522', color: '#fb7185' }}>ðŸ—‚ï¸ Archive ({checked.length})</button>
          )}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr>{view === 'active' && <th style={{ width: 34 }}></th>}<th>Name</th><th>Event</th><th>Date</th><th>Status</th>{view === 'history' && <th></th>}</tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="empty">Loadingâ€¦</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan="6" className="empty">{view === 'active' ? 'No leads yet. Share your inquiry link! ðŸ“¨' : 'No archived leads ðŸ“œ'}</td></tr>
            ) : leads.map(l => (
              <tr key={l.id} onClick={() => view === 'active' && setSel(l)} style={{ cursor: view === 'active' ? 'pointer' : 'default' }}>
                {view === 'active' && (
                  <td onClick={e => toggleCheck(l.id, e)} style={{ cursor: 'pointer' }}>
                    <input type="checkbox" readOnly checked={checked.includes(l.id)} style={{ accentColor: '#2dd4bf', pointerEvents: 'none' }} />
                  </td>
                )}
                <td className="biz">{l.name}</td>
                <td>{l.event_type}</td>
                <td>{l.event_date ? String(l.event_date).slice(0, 10) : 'â€”'}</td>
                <td><span className="badge trial">{l.status}</span></td>
                {view === 'history' && (
                  <td><span style={{ cursor: 'pointer', color: '#2dd4bf', fontSize: 12 }} onClick={e => restore(l.id, e)}>â†©ï¸ Restore</span></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadDetail({ lead, onBack }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ ...lead });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pkgs, setPkgs] = useState([]);
  const [pkgId, setPkgId] = useState(lead.package_id || '');
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  useEffect(() => {
    api.pkgTemplates().then(d => {
      const all = [];
      (d.templates || []).forEach(t => (t.packages || []).forEach(p => all.push({ ...p, tplName: t.name })));
      setPkgs(all);
    }).catch(() => {});
  }, []);

  async function assignPkg(id) {
    setPkgId(id);
    try {
      await api.assignPackage(lead.id, id || null);
      setMsg('âœ… Package updated'); setTimeout(() => setMsg(''), 1500);
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  function calcHours(from, to) {
    if (!from || !to) return f.hours || '';
    const [fh, fm] = from.split(':').map(Number);
    const [th, tm] = to.split(':').map(Number);
    let mins = (th * 60 + tm) - (fh * 60 + fm);
    if (mins < 0) mins += 1440;
    return (mins / 60).toFixed(1).replace(/\.0$/, '');
  }
  function setTime(k, v) {
    setF(s => {
      const n = { ...s, [k]: v };
      n.hours = calcHours(k === 'timing_from' ? v : s.timing_from, k === 'timing_to' ? v : s.timing_to);
      return n;
    });
  }

  async function save() {
    setBusy(true); setMsg('');
    try {
      await api.updateLead(lead.id, {
        ...f, hours: f.hours ? Number(f.hours) : null, guests: f.guests ? Number(f.guests) : null,
      });
      setMsg('âœ… Saved'); setEdit(false);
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
    finally { setBusy(false); }
  }

  const yn = (v) => v ? 'âœ… Yes' : 'âŒ No';
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%' };
  const row = (label, value) => (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: '1px solid #223238', fontSize: 14 }}>
      <div style={{ width: 180, color: '#7c9199', fontWeight: 600 }}>{label}</div>
      <div>{value || 'â€”'}</div>
    </div>
  );
  const eRow = (label, k, type) => (
    <div style={{ padding: '8px 0', borderBottom: '1px solid #223238' }}>
      <label style={{ fontSize: 12, color: '#7c9199', fontWeight: 600, display: 'block', marginBottom: 5 }}>{label}</label>
      <input style={box} type={type || 'text'} value={f[k] ?? ''} onChange={e => set(k, e.target.value)} />
    </div>
  );

  // ---- EDIT MODE ----
  if (edit) return (
    <div className="table-wrap" style={{ padding: 24, maxWidth: 640 }}>
      <button className="refresh" onClick={() => setEdit(false)} style={{ marginBottom: 16 }}>â† Cancel</button>
      <h2 style={{ marginTop: 0 }}>âœï¸ Edit Lead</h2>
      {msg && <div style={{ padding: 10, borderRadius: 8, margin: '0 0 12px', fontSize: 13, background: '#fb718518', color: '#fb7185' }}>{msg}</div>}

      {eRow('ðŸ‘¤ Name', 'name')}
      {eRow('ðŸ“§ Email', 'email')}
      {eRow('ðŸ“ž Phone', 'phone')}
      {eRow('ðŸŽ‰ Event type', 'event_type')}
      {eRow('ðŸ“… Date', 'event_date', 'date')}
      <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #223238' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#7c9199', fontWeight: 600, display: 'block', marginBottom: 5 }}>â° Start</label>
          <input style={box} type="time" value={f.timing_from || ''} onChange={e => setTime('timing_from', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#7c9199', fontWeight: 600, display: 'block', marginBottom: 5 }}>â° End</label>
          <input style={box} type="time" value={f.timing_to || ''} onChange={e => setTime('timing_to', e.target.value)} />
        </div>
      </div>
      {row('â±ï¸ Hours (auto)', f.hours)}
      {eRow('ðŸ“ Location', 'location')}
      {eRow('ðŸ‘¥ Guests', 'guests', 'number')}

      <div style={{ padding: '10px 0', borderBottom: '1px solid #223238' }}>
        <label style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!f.gr_bride} onChange={e => set('gr_bride', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2dd4bf' }} />
          ðŸ’„ Bride â€” Getting Ready
        </label>
        {f.gr_bride && <input style={{ ...box, marginTop: 8 }} placeholder="Venue (optional)" value={f.gr_bride_venue || ''} onChange={e => set('gr_bride_venue', e.target.value)} />}
      </div>
      <div style={{ padding: '10px 0', borderBottom: '1px solid #223238' }}>
        <label style={{ fontSize: 14, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!f.gr_groom} onChange={e => set('gr_groom', e.target.checked)} style={{ width: 16, height: 16, accentColor: '#2dd4bf' }} />
          ðŸ˜Ž Groom â€” Getting Ready
        </label>
        {f.gr_groom && <input style={{ ...box, marginTop: 8 }} placeholder="Venue (optional)" value={f.gr_groom_venue || ''} onChange={e => set('gr_groom_venue', e.target.value)} />}
      </div>

      <div style={{ padding: '8px 0' }}>
        <label style={{ fontSize: 12, color: '#7c9199', fontWeight: 600, display: 'block', marginBottom: 5 }}>ðŸ“ Notes</label>
        <textarea style={{ ...box, minHeight: 70 }} value={f.notes || ''} onChange={e => set('notes', e.target.value)} />
      </div>

      <button className="refresh" onClick={save} disabled={busy} style={{ marginTop: 14, width: '100%', background: '#2dd4bf', color: '#06231f' }}>
        {busy ? 'Savingâ€¦' : 'ðŸ’¾ Save changes'}
      </button>
    </div>
  );

  // ---- VIEW MODE ----
  return (
    <div className="table-wrap" style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <button className="refresh" onClick={onBack}>â† Back to leads</button>
        <button className="refresh" onClick={() => { setF({ ...lead }); setEdit(true); }} style={{ background: '#2dd4bf', color: '#06231f' }}>âœï¸ Edit</button>
      </div>
      <h2 style={{ marginTop: 0 }}>{lead.name} Â· {lead.event_type}</h2>
      {msg && <div style={{ padding: 10, borderRadius: 8, margin: '0 0 12px', fontSize: 13, background: '#4ade8018', color: '#4ade80' }}>{msg}</div>}

      <div style={{ padding: '10px 0', borderBottom: '1px solid #223238', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 180, color: '#7c9199', fontWeight: 600, fontSize: 14 }}>ðŸ“¦ Package</div>
        <select value={pkgId} onChange={e => assignPkg(e.target.value)}
          style={{ background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 8, flex: 1 }}>
          <option value="">â€” No package â€”</option>
          {pkgs.map(p => <option key={p.id} value={p.id}>{p.tplName} â†’ {p.name} (${Number(p.base_price).toFixed(0)})</option>)}
        </select>
      </div>

      {row('ðŸ“§ Email', lead.email)}
      {row('ðŸ“ž Phone', lead.phone)}
      {row('ðŸ“… Date', lead.event_date ? String(lead.event_date).slice(0,10) : null)}
      {row('â° Time', lead.timing_from ? `${lead.timing_from} â€“ ${lead.timing_to || '?'}` : null)}
      {row('ðŸ“ Location', lead.location)}
      {row('ðŸ‘¥ Guests', lead.guests)}
      {row('â±ï¸ Hours', lead.hours)}
      {row('ðŸ’„ Bride Getting Ready', `${yn(lead.gr_bride)}${lead.gr_bride_venue ? ' Â· ' + lead.gr_bride_venue : ''}`)}
      {row('ðŸ˜Ž Groom Getting Ready', `${yn(lead.gr_groom)}${lead.gr_groom_venue ? ' Â· ' + lead.gr_groom_venue : ''}`)}
      {row('ðŸ“ Notes', lead.notes)}

      <MoneySection lead={lead} />
      <EmailBox lead={lead} />
      <ContractsBox lead={lead} />
      <InvoiceBox lead={lead} />
      <BookingExtras lead={lead} />
    </div>
  );
}

function BookingExtras({ lead }) {
  const [flags, setFlags] = useState({ billed: !!lead.billed, delivered: !!lead.delivered, booking_notes: lead.booking_notes || '', ceremony: lead.ceremony || '' });
  const [crew, setCrew] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [pick, setPick] = useState({ crew_member_id: '', duty: '', arrive_time: '', leave_time: '' });
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9 };

  useEffect(() => {
    api.crew().then(d => setCrew(d.crew || [])).catch(() => {});
    loadAssigned();
  }, []);
  function loadAssigned() { api.leadCrew(lead.id).then(d => setAssigned(d.assignments || [])).catch(() => {}); }

  async function saveFlags(next) {
    const merged = { ...flags, ...next };
    setFlags(merged);
    try { await api.leadFlags(lead.id, merged); setMsg('âœ… Saved'); setTimeout(() => setMsg(''), 1200); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  async function assign() {
    if (!pick.crew_member_id) return;
    try {
      await api.assignCrew(lead.id, { ...pick, crew_member_id: Number(pick.crew_member_id) });
      setPick({ crew_member_id: '', duty: '', arrive_time: '', leave_time: '' });
      loadAssigned();
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function unassign(id) {
    try { await api.unassignCrew(id); loadAssigned(); } catch {}
  }
  function copyCheckin(token) {
    navigator.clipboard?.writeText(`https://alphabetaone.com/checkin/${token}`);
    setMsg('ðŸ”— Check-in link copied!'); setTimeout(() => setMsg(''), 1500);
  }
  function copyPortal() {
    navigator.clipboard?.writeText(`https://alphabetaone.com/portal/${lead.client_token}`);
    setMsg('ðŸ”— Client portal link copied!'); setTimeout(() => setMsg(''), 1500);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <h3 style={{ margin: '0 0 10px' }}>ðŸ“¦ Booking extras {msg && <span style={{ fontSize: 13, color: msg[0] === 'âš ' ? '#fb7185' : '#4ade80' }}>{msg}</span>}</h3>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {lead.client_token && (
          <button className="refresh" onClick={copyPortal} style={{ background: '#2dd4bf', color: '#06231f' }}>ðŸ”— Client portal link</button>
        )}
        <button className="refresh" onClick={() => saveFlags({ billed: !flags.billed })}
          style={{ background: flags.billed ? '#4ade8022' : '#0d1417', color: flags.billed ? '#4ade80' : '#e6f0f2' }}>
          ðŸ§¾ Billed {flags.billed ? 'âœ“' : ''}
        </button>
        <button className="refresh" onClick={() => saveFlags({ delivered: !flags.delivered })}
          style={{ background: flags.delivered ? '#4ade8022' : '#0d1417', color: flags.delivered ? '#4ade80' : '#e6f0f2' }}>
          ðŸ“¦ Delivered {flags.delivered ? 'âœ“' : ''}
        </button>
      </div>

      <label style={{ fontSize: 11, color: '#7c9199' }}>ðŸ’’ Ceremony details</label>
      <textarea style={{ ...box, width: '100%', minHeight: 46 }} value={flags.ceremony}
        onChange={e => setFlags({ ...flags, ceremony: e.target.value })} onBlur={() => saveFlags({})} />

      <label style={{ fontSize: 11, color: '#7c9199', display: 'block', marginTop: 10 }}>ðŸ“ Booking notes (private)</label>
      <textarea style={{ ...box, width: '100%', minHeight: 60 }} value={flags.booking_notes}
        onChange={e => setFlags({ ...flags, booking_notes: e.target.value })} onBlur={() => saveFlags({})} />

      <h3 style={{ margin: '16px 0 8px' }}>ðŸ‘· Event crew</h3>
      {crew.length === 0 ? (
        <div style={{ color: '#7c9199', fontSize: 13 }}>No crew in your roster yet â€” add them in ðŸ‘· My Crew tab first.</div>
      ) : (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <select style={box} value={pick.crew_member_id} onChange={e => setPick({ ...pick, crew_member_id: e.target.value })}>
            <option value="">ðŸ‘¤ Pick crewâ€¦</option>
            {crew.map(c => <option key={c.id} value={c.id}>{c.name}{c.role ? ` (${c.role})` : ''}</option>)}
          </select>
          <input style={{ ...box, width: 130 }} placeholder="Duty" value={pick.duty} onChange={e => setPick({ ...pick, duty: e.target.value })} />
          <input style={{ ...box, width: 96 }} placeholder="Arrive" value={pick.arrive_time} onChange={e => setPick({ ...pick, arrive_time: e.target.value })} />
          <input style={{ ...box, width: 96 }} placeholder="Leave" value={pick.leave_time} onChange={e => setPick({ ...pick, leave_time: e.target.value })} />
          <button className="refresh" onClick={assign} style={{ background: '#2dd4bf', color: '#06231f' }}>+ Assign</button>
        </div>
      )}
      {assigned.map(a => (
        <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 6 }}>
          <span>ðŸ‘¤ <b>{a.name}</b>{a.duty ? ` Â· ${a.duty}` : ''}{a.arrive_time ? ` Â· ${a.arrive_time}â†’${a.leave_time || '?'}` : ''}
            {a.checked_in_at ? ' Â· âœ… in' : ''}{a.checked_out_at ? ' Â· ðŸ out' : ''}</span>
          <span style={{ display: 'flex', gap: 10 }}>
            <span style={{ cursor: 'pointer', color: '#2dd4bf' }} onClick={() => copyCheckin(a.checkin_token)}>ðŸ”— Check-in link</span>
            <span style={{ cursor: 'pointer' }} onClick={() => unassign(a.id)}>ðŸ—‘ï¸</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function InvoiceBox({ lead }) {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api.leadInvoices(lead.id); setList(d.invoices || []); } catch {}
  }
  async function gen() {
    setBusy(true); setMsg('');
    try { await api.createInvoice(lead.id); setMsg('âœ… Invoice generated'); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
    finally { setBusy(false); }
  }
  async function del(id) {
    if (!confirm('Delete this invoice?')) return;
    try { await api.deleteInvoice(id); load(); } catch {}
  }
  function copyLink(token) {
    navigator.clipboard?.writeText(`https://alphabetaone.com/invoice/${token}`);
    setMsg('ðŸ”— Link copied!'); setTimeout(() => setMsg(''), 1500);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>ðŸ§¾ Invoices</h3>
        <button className="refresh" onClick={gen} disabled={busy} style={{ background: '#2dd4bf', color: '#06231f' }}>
          {busy ? 'Generatingâ€¦' : '+ Generate invoice'}
        </button>
      </div>
      {msg && <div style={{ fontSize: 13, marginTop: 8, color: msg[0] === 'âš ' ? '#fb7185' : '#4ade80' }}>{msg}</div>}
      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {list.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
              <span>ðŸ§¾ <b>{i.invoice_number}</b> Â· ${Number(i.total).toFixed(2)} Â· balance ${Number(i.balance).toFixed(2)}</span>
              <span style={{ display: 'flex', gap: 10 }}>
                <span style={{ cursor: 'pointer', color: '#2dd4bf' }} onClick={() => copyLink(i.token)}>ðŸ”— Copy link</span>
                <span style={{ cursor: 'pointer' }} onClick={() => del(i.id)}>ðŸ—‘ï¸</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractsTab() {
  const [sub, setSub] = useState('list'); // list | setup | invoices
  const btn = (k, label) => (
    <button className="refresh" onClick={() => setSub(k)}
      style={{ background: sub === k ? '#2dd4bf' : '#0d1417', color: sub === k ? '#06231f' : '#e6f0f2' }}>{label}</button>
  );
  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {btn('list', 'ðŸ“„ Contracts')}
        {btn('setup', 'ðŸ› ï¸ Contract setup')}
        {btn('invoices', 'ðŸ§¾ Invoices')}
      </div>
      {sub === 'list' ? <AllContracts /> : sub === 'setup' ? <ContractSetup /> : <AllInvoices />}
    </div>
  );
}

function AllInvoices() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.allInvoices().then(d => setList(d.invoices || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  function copyLink(token) {
    navigator.clipboard?.writeText(`https://alphabetaone.com/invoice/${token}`);
  }
  if (loading) return <div className="loading">Loadingâ€¦</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>#</th><th>Client</th><th>Total</th><th>Paid</th><th>Balance</th><th></th></tr></thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="6" className="empty">No invoices yet. Generate one from a lead ðŸ§¾</td></tr>
          ) : list.map(i => (
            <tr key={i.id}>
              <td className="biz">{i.invoice_number}</td>
              <td>{i.client_name}</td>
              <td>${Number(i.total).toFixed(2)}</td>
              <td style={{ color: '#4ade80' }}>${Number(i.paid).toFixed(2)}</td>
              <td style={{ color: Number(i.balance) > 0 ? '#fbbf24' : '#4ade80' }}>${Number(i.balance).toFixed(2)}</td>
              <td><span style={{ cursor: 'pointer', color: '#2dd4bf', fontSize: 12 }} onClick={() => copyLink(i.token)}>ðŸ”— Copy link</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllContracts() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const S = { draft: 'ðŸ“', sent: 'ðŸ“¨', signed: 'âœ…', void: 'ðŸš«' };
  useEffect(() => {
    api.allContracts().then(d => setList(d.contracts || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  function copyLink(token) {
    navigator.clipboard?.writeText(`https://alphabetaone.com/sign/${token}`);
  }
  if (loading) return <div className="loading">Loadingâ€¦</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Client</th><th>Contract</th><th>Status</th><th>Signed</th><th></th></tr></thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan="5" className="empty">No contracts yet. Create one from a lead, or set up templates in ðŸ› ï¸ Contract setup.</td></tr>
          ) : list.map(c => (
            <tr key={c.id}>
              <td className="biz">{c.client_name}</td>
              <td>{c.title}</td>
              <td>{S[c.status]} {c.status}</td>
              <td>{c.signed_at ? String(c.signed_at).slice(0, 10) : 'â€”'}</td>
              <td>{c.status !== 'signed'
                ? <span style={{ cursor: 'pointer', color: '#2dd4bf', fontSize: 12 }} onClick={() => copyLink(c.token)}>ðŸ”— Copy link</span>
                : <a href={`/certificate/${c.token}`} target="_blank" rel="noreferrer" style={{ color: '#4ade80', fontSize: 12, textDecoration: 'none' }}>ðŸ“œ Certificate</a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const CT_PLACEHOLDERS = ['{{client_name}}', '{{client_email}}', '{{event_type}}', '{{event_date}}', '{{location}}', '{{hours}}', '{{guests}}', '{{package_name}}', '{{total_cost}}', '{{deposit}}', '{{balance}}', '{{today_date}}', '{{company_name}}'];

function ContractSetup() {
  const [tpls, setTpls] = useState([]);
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%', fontFamily: 'inherit' };

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api.ctTemplates(); setTpls(d.templates || []); } catch {}
  }
  async function add() {
    try {
      const d = await api.addCtTemplate({ name: 'New Contract', body: 'This agreement is between {{company_name}} and {{client_name}} for {{event_type}} on {{event_date}}.\n\nTotal: {{total_cost}} Â· Deposit: {{deposit}}\n\nI agree to the cancellation policy. [INITIAL]\n\nI agree to the payment schedule. [INITIAL]' });
      setSel(d.template); load();
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function save() {
    if (!sel) return;
    setMsg('');
    try { await api.updateCtTemplate(sel.id, sel); setMsg('âœ… Saved'); setTimeout(() => setMsg(''), 1500); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function del(id) {
    if (!confirm('Delete this template?')) return;
    try { await api.deleteCtTemplate(id); setSel(null); load(); } catch {}
  }
  function insertAt(txt) {
    setSel(s => ({ ...s, body: (s.body || '') + ' ' + txt }));
  }

  if (sel) return (
    <div className="table-wrap" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className="refresh" onClick={() => setSel(null)}>â† All templates</button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {msg && <span style={{ fontSize: 13, color: msg[0] === 'âœ…' ? '#4ade80' : '#fb7185' }}>{msg}</span>}
          <button className="refresh" onClick={() => del(sel.id)}>ðŸ—‘ï¸</button>
        </div>
      </div>

      <label style={{ fontSize: 12, color: '#7c9199' }}>Template name</label>
      <input style={box} value={sel.name || ''} onChange={e => setSel({ ...sel, name: e.target.value })} />

      <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 10 }}>Event type (optional, e.g. Wedding)</label>
      <input style={box} value={sel.event_type || ''} onChange={e => setSel({ ...sel, event_type: e.target.value })} />

      <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 10 }}>Header (optional)</label>
      <textarea style={{ ...box, minHeight: 50 }} value={sel.header || ''} onChange={e => setSel({ ...sel, header: e.target.value })} />

      <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 10 }}>Contract body âœï¸</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '6px 0' }}>
        {CT_PLACEHOLDERS.map(p => (
          <span key={p} onClick={() => insertAt(p)}
            style={{ background: '#2dd4bf18', border: '1px solid #2dd4bf44', color: '#2dd4bf', padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer' }}>{p}</span>
        ))}
        <span onClick={() => insertAt('[INITIAL]')}
          style={{ background: '#fbbf2418', border: '1px solid #fbbf2444', color: '#fbbf24', padding: '3px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>âœï¸ [INITIAL] box</span>
      </div>
      <textarea style={{ ...box, minHeight: 220 }} value={sel.body || ''} onChange={e => setSel({ ...sel, body: e.target.value })} />

      <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 10 }}>Legal terms (optional)</label>
      <textarea style={{ ...box, minHeight: 80 }} value={sel.legal_terms || ''} onChange={e => setSel({ ...sel, legal_terms: e.target.value })} />

      <button className="refresh" onClick={save} style={{ marginTop: 14, width: '100%', background: '#2dd4bf', color: '#06231f' }}>ðŸ’¾ Save template</button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#7c9199', fontSize: 13 }}>ðŸ› ï¸ Build your own contracts â€” placeholders auto-fill, [INITIAL] adds tap-to-initial boxes</div>
        <button className="refresh" onClick={add} style={{ background: '#2dd4bf', color: '#06231f' }}>+ New template</button>
      </div>
      {msg && <div className="err-banner">{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
        {tpls.length === 0 && <div style={{ color: '#7c9199' }}>No templates yet â€” create one ðŸ‘†</div>}
        {tpls.map(t => (
          <div key={t.id} className="table-wrap" style={{ padding: 18, cursor: 'pointer' }} onClick={() => setSel(t)}>
            <div style={{ fontSize: 30 }}>ðŸ“‘</div>
            <div style={{ fontWeight: 700, marginTop: 6 }}>{t.name}</div>
            <div style={{ color: '#7c9199', fontSize: 12, marginTop: 4 }}>{t.event_type || 'Any event'} Â· {(t.body.match(/\[INITIAL\]/g) || []).length} initials</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContractsBox({ lead }) {
  const [list, setList] = useState([]);
  const [tpls, setTpls] = useState([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('Service Agreement');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%' };

  useEffect(() => {
    load();
    api.ctTemplates().then(d => setTpls(d.templates || [])).catch(() => {});
  }, []);
  async function load() {
    try { const d = await api.leadContracts(lead.id); setList(d.contracts || []); } catch {}
  }
  async function create() {
    if (!body.trim()) return setMsg('âš ï¸ Contract text required');
    setBusy(true); setMsg('');
    try {
      await api.createContract(lead.id, title, body);
      setMsg('âœ… Contract created'); setBody(''); setOpen(false); load();
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
    finally { setBusy(false); }
  }
  async function voidCt(id) {
    if (!confirm('Delete this contract?')) return;
    try { await api.voidContract(id); load(); } catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  function copyLink(token) {
    navigator.clipboard?.writeText(`https://alphabetaone.com/sign/${token}`);
    setMsg('ðŸ”— Link copied!'); setTimeout(() => setMsg(''), 1500);
  }

  const S = { draft: 'ðŸ“', sent: 'ðŸ“¨', signed: 'âœ…', void: 'ðŸš«' };
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>ðŸ“„ Contracts</h3>
        <button className="refresh" onClick={() => setOpen(!open)}>{open ? 'âœ• Cancel' : '+ New contract'}</button>
      </div>
      {msg && <div style={{ fontSize: 13, marginTop: 8, color: msg[0] === 'âš ' ? '#fb7185' : '#4ade80' }}>{msg}</div>}

      {open && (
        <div style={{ marginTop: 10 }}>
          {tpls.length > 0 && (
            <select style={{ ...box, marginBottom: 8 }} defaultValue=""
              onChange={async e => {
                if (!e.target.value) return;
                setBusy(true); setMsg('');
                try { await api.createContractFromTemplate(lead.id, Number(e.target.value)); setMsg('âœ… Contract created from template'); setOpen(false); load(); }
                catch (er) { setMsg('âš ï¸ ' + er.message); }
                finally { setBusy(false); }
              }}>
              <option value="">ðŸ“‘ Use a templateâ€¦ (auto-fills client info)</option>
              {tpls.map(t => <option key={t.id} value={t.id}>{t.name}{t.event_type ? ` (${t.event_type})` : ''}</option>)}
            </select>
          )}
          <input style={box} value={title} onChange={e => setTitle(e.target.value)} placeholder="Contract title" />
          <textarea style={{ ...box, minHeight: 140, marginTop: 8 }} value={body} onChange={e => setBody(e.target.value)}
            placeholder={`Write your agreement terms hereâ€¦\n\ne.g. Coverage: ${lead.hours || 8} hours on ${lead.event_date ? String(lead.event_date).slice(0,10) : 'event date'}â€¦`} />
          <button className="refresh" onClick={create} disabled={busy} style={{ marginTop: 8, background: '#2dd4bf', color: '#06231f' }}>
            {busy ? 'Creatingâ€¦' : 'ðŸ“„ Create & get signing link'}
          </button>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {list.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
              <span>{S[c.status]} <b>{c.title}</b> Â· {c.status}{c.signed_name ? ` by ${c.signed_name}` : ''}</span>
              <span style={{ display: 'flex', gap: 10 }}>
                {c.status !== 'signed' && <span style={{ cursor: 'pointer', color: '#2dd4bf' }} onClick={() => copyLink(c.token)}>ðŸ”— Copy link</span>}
                {c.status === 'signed' && <span style={{ color: '#4ade80' }}>{String(c.signed_at).slice(0, 10)}</span>}
                {c.status !== 'signed' && <span style={{ cursor: 'pointer' }} onClick={() => voidCt(c.id)}>ðŸ—‘ï¸</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmailBox({ lead }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%' };

  async function send() {
    if (!subject || !body) return setMsg('âš ï¸ Subject + message required');
    setBusy(true); setMsg('');
    try {
      const d = await api.emailLead(lead.id, subject, body);
      setMsg('âœ… Sent to ' + d.sent_to); setSubject(''); setBody(''); setOpen(false);
    } catch (e) { setMsg('âš ï¸ ' + (e.message || 'Failed')); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <button className="refresh" onClick={() => setOpen(!open)}>
        {open ? 'âœ• Close' : `ðŸ“§ Email ${lead.name || 'client'}`}
      </button>
      {msg && <div style={{ fontSize: 13, marginTop: 8, color: msg[0] === 'âœ…' ? '#4ade80' : '#fb7185' }}>{msg}</div>}
      {open && (
        <div style={{ marginTop: 10 }}>
          <input style={box} placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} />
          <textarea style={{ ...box, minHeight: 100, marginTop: 8 }} placeholder="Your messageâ€¦" value={body} onChange={e => setBody(e.target.value)} />
          <button className="refresh" onClick={send} disabled={busy}
            style={{ marginTop: 8, background: '#2dd4bf', color: '#06231f' }}>
            {busy ? 'Sendingâ€¦' : 'ðŸ“¨ Send'}
          </button>
        </div>
      )}
    </div>
  );
}

const STATUSES = ['new', 'contacted', 'quoted', 'booked', 'completed', 'cancelled'];
const S_ICON = { new: 'ðŸ†•', contacted: 'ðŸ“ž', quoted: 'ðŸ’¬', booked: 'âœ…', completed: 'ðŸ', cancelled: 'âŒ' };

function MoneySection({ lead }) {
  const [data, setData] = useState(null);
  const [amt, setAmt] = useState('');
  const [method, setMethod] = useState('manual');
  const [money, setMoney] = useState({ deposit_percent: lead.deposit_percent ?? 30, discount_percent: lead.discount_percent ?? 0, price_override: lead.price_override ?? '' });
  const [status, setStatus] = useState(lead.status || 'new');
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 8 };

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api.leadPayments(lead.id); setData(d); } catch {}
  }
  async function saveMoney() {
    try {
      const d = await api.saveMoney(lead.id, {
        deposit_percent: Number(money.deposit_percent) || 0,
        discount_percent: Number(money.discount_percent) || 0,
        price_override: money.price_override === '' ? null : Number(money.price_override),
      });
      setData(s => ({ ...s, summary: d.summary }));
      setMsg('âœ… Saved'); setTimeout(() => setMsg(''), 1500);
    } catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function pay() {
    if (!amt || Number(amt) <= 0) return;
    try { const d = await api.addPayment(lead.id, Number(amt), method); setData(d); setAmt(''); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function delPay(id) {
    if (!confirm('Remove this payment?')) return;
    try { await api.deletePayment(id); load(); } catch {}
  }
  async function changeStatus(s) {
    setStatus(s);
    try { await api.setLeadStatus(lead.id, s); setMsg('âœ… Status: ' + s); setTimeout(() => setMsg(''), 1500); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  const sum = data?.summary;
  return (
    <div style={{ marginTop: 20 }}>
      {/* Status */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {STATUSES.map(s => (
          <button key={s} className="refresh" onClick={() => changeStatus(s)}
            style={{ padding: '5px 11px', fontSize: 12, background: status === s ? '#2dd4bf' : '#0d1417', color: status === s ? '#06231f' : '#e6f0f2' }}>
            {S_ICON[s]} {s}
          </button>
        ))}
      </div>
      {msg && <div style={{ fontSize: 13, color: msg[0] === 'âœ…' ? '#4ade80' : '#fb7185', marginBottom: 10 }}>{msg}</div>}

      <h3 style={{ margin: '0 0 10px' }}>ðŸ’° Money</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#7c9199' }}>Price override ($)</label>
          <input style={{ ...box, width: '100%' }} type="number" placeholder="auto from package"
            value={money.price_override} onChange={e => setMoney({ ...money, price_override: e.target.value })} onBlur={saveMoney} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#7c9199' }}>Discount %</label>
          <input style={{ ...box, width: '100%' }} type="number"
            value={money.discount_percent} onChange={e => setMoney({ ...money, discount_percent: e.target.value })} onBlur={saveMoney} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: '#7c9199' }}>Deposit %</label>
          <input style={{ ...box, width: '100%' }} type="number"
            value={money.deposit_percent} onChange={e => setMoney({ ...money, deposit_percent: e.target.value })} onBlur={saveMoney} />
        </div>
      </div>

      {sum && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, fontSize: 13 }}>
          <span style={{ background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '7px 12px' }}>ðŸ’µ Total: <b>${sum.final_total}</b>{sum.discount_amount > 0 && <s style={{ color: '#7c9199', marginLeft: 6 }}>${sum.base_total}</s>}</span>
          <span style={{ background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '7px 12px' }}>ðŸ” Deposit: <b>${sum.deposit_amount}</b></span>
          <span style={{ background: '#4ade8018', border: '1px solid #4ade8044', borderRadius: 8, padding: '7px 12px', color: '#4ade80' }}>âœ… Paid: <b>${sum.paid}</b></span>
          <span style={{ background: sum.balance > 0 ? '#fbbf2418' : '#4ade8018', border: '1px solid #fbbf2444', borderRadius: 8, padding: '7px 12px', color: sum.balance > 0 ? '#fbbf24' : '#4ade80' }}>â³ Balance: <b>${sum.balance}</b></span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input style={{ ...box, flex: 1 }} type="number" placeholder="Amount $" value={amt} onChange={e => setAmt(e.target.value)} />
        <select style={box} value={method} onChange={e => setMethod(e.target.value)}>
          <option value="manual">Manual</option><option value="etransfer">E-transfer</option>
          <option value="cash">Cash</option><option value="card">Card</option>
        </select>
        <button className="refresh" onClick={pay} style={{ background: '#2dd4bf', color: '#06231f' }}>+ Record payment</button>
      </div>

      {data?.payments?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#0d1417', border: '1px solid #223238', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
              <span>ðŸ’µ ${Number(p.amount).toFixed(2)} Â· {p.method} Â· {String(p.paid_at).slice(0, 10)}</span>
              <span style={{ cursor: 'pointer' }} onClick={() => delPay(p.id)}>ðŸ—‘ï¸</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BookingsView() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.bookings().then(d => setBookings(d.bookings || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="loading">Loadingâ€¦</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Client</th><th>Event</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th></tr></thead>
        <tbody>
          {bookings.length === 0 ? (
            <tr><td colSpan="6" className="empty">No bookings yet. Set a lead's status to âœ… booked!</td></tr>
          ) : bookings.map(b => (
            <tr key={b.id}>
              <td className="biz">{b.name}</td>
              <td>{b.event_type}</td>
              <td>{b.event_date ? String(b.event_date).slice(0, 10) : 'â€”'}</td>
              <td>${b.money?.final_total ?? 0}</td>
              <td style={{ color: '#4ade80' }}>${b.money?.paid ?? 0}</td>
              <td style={{ color: b.money?.balance > 0 ? '#fbbf24' : '#4ade80' }}>${b.money?.balance ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InqFormSettings({ user }) {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%' };

  useEffect(() => {
    api.inquirySettings(user?.vendor_id).then(d => setS(d.settings)).catch(() => {});
  }, []);

  async function save() {
    setMsg('');
    try { await api.saveInquirySettings(s); setMsg('âœ… Saved'); setTimeout(() => setMsg(''), 1500); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  const toggle = (k) => setS(prev => ({ ...prev, [k]: !prev[k] }));

  if (!s) return <div className="loading">Loadingâ€¦</div>;

  const toggles = [
    ['show_phone', 'ðŸ“ž Phone'], ['show_guests', 'ðŸ‘¥ Guests'], ['show_times', 'â° Times'],
    ['show_location', 'ðŸ“ Location'], ['show_getting_ready', 'ðŸ’„ Getting Ready'], ['show_notes', 'ðŸ“ Notes'],
  ];

  return (
    <div style={{ maxWidth: 560 }}>
      <div className="table-wrap" style={{ padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>ðŸŽ¨ Customize your inquiry form {msg && <span style={{ fontSize: 13, color: '#4ade80' }}>{msg}</span>}</h2>
        <p className="sub" style={{ marginBottom: 14 }}>Your link: <b style={{ color: '#2dd4bf' }}>alphabetaone.com/inquiry/{user?.vendor_id}</b> ðŸ”—</p>

        <label style={{ fontSize: 12, color: '#7c9199' }}>Brand name</label>
        <input style={box} value={s.brand_name || ''} onChange={e => setS({ ...s, brand_name: e.target.value })} />

        <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 12 }}>Brand color</label>
        <input type="color" value={s.brand_color} onChange={e => setS({ ...s, brand_color: e.target.value })}
          style={{ width: 60, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />

        <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 12 }}>Intro text</label>
        <input style={box} value={s.intro_text || ''} onChange={e => setS({ ...s, intro_text: e.target.value })} />

        <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 14 }}>Fields to show</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {toggles.map(([k, label]) => (
            <button key={k} className="refresh" onClick={() => toggle(k)}
              style={{ padding: '6px 12px', fontSize: 12, background: s[k] ? '#2dd4bf' : '#0d1417', color: s[k] ? '#06231f' : '#7c9199' }}>
              {label} {s[k] ? 'âœ“' : 'âœ•'}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 14 }}>Event types (comma separated)</label>
        <input style={box} value={(s.event_types || []).join(', ')}
          onChange={e => setS({ ...s, event_types: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />

        <button className="refresh" onClick={save} style={{ marginTop: 16, width: '100%', background: '#2dd4bf', color: '#06231f' }}>ðŸ’¾ Save form settings</button>
      </div>
    </div>
  );
}

function PackagesView() {
  const [tpls, setTpls] = useState([]);
  const [selTpl, setSelTpl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9 };

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try {
      const d = await api.pkgTemplates();
      setTpls(d.templates || []);
      if (selTpl) {
        const upd = (d.templates || []).find(t => t.id === selTpl.id);
        setSelTpl(upd || null);
      }
    } catch {}
    finally { setLoading(false); }
  }
  async function addTpl() {
    setMsg('');
    try { await api.addTemplate('New Event'); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function delTpl(id) {
    if (!confirm('Delete this template and its packages?')) return;
    try { await api.deleteTemplate(id); setSelTpl(null); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function addPkg(tplId) {
    setMsg('');
    try { await api.addVendorPackage('New Package', tplId); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function delPkg(id) {
    if (!confirm('Delete this package?')) return;
    try { await api.deleteVendorPackage(id); load(); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  if (loading) return <div className="loading">Loadingâ€¦</div>;

  // ---- INSIDE A TEMPLATE ----
  if (selTpl) return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button className="refresh" onClick={() => setSelTpl(null)}>â† All templates</button>
        {selTpl.packages.length < 3 && (
          <button className="refresh" onClick={() => addPkg(selTpl.id)} style={{ background: '#2dd4bf', color: '#06231f' }}>+ Add Package</button>
        )}
      </div>
      <h2 style={{ margin: '0 0 12px' }}>ðŸ“ {selTpl.name}</h2>
      {msg && <div className="err-banner">{msg}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {selTpl.packages.length === 0 && <div style={{ color: '#7c9199' }}>No packages yet â€” add one ðŸ‘†</div>}
        {selTpl.packages.map(p => <PkgCard key={p.id} pkg={p} onSaved={load} onDelete={() => delPkg(p.id)} />)}
      </div>
    </div>
  );

  // ---- TEMPLATE LIST ----
  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ color: '#7c9199', fontSize: 13 }}>ðŸ“ Up to 6 event templates Â· ðŸ“¦ 3 packages each</div>
        {tpls.length < 6 && <button className="refresh" onClick={addTpl} style={{ background: '#2dd4bf', color: '#06231f' }}>+ Add Template</button>}
      </div>
      {msg && <div className="err-banner">{msg}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14 }}>
        {tpls.map(t => (
          <div key={t.id} className="table-wrap" style={{ padding: 18, cursor: 'pointer', position: 'relative' }} onClick={() => setSelTpl(t)}>
            <div style={{ fontSize: 30 }}>ðŸ“</div>
            <TplName tpl={t} onSaved={load} />
            <div style={{ color: '#7c9199', fontSize: 12, marginTop: 4 }}>ðŸ“¦ {t.packages.length}/3 packages</div>
            {tpls.length > 1 && (
              <button className="refresh" style={{ position: 'absolute', top: 10, right: 10, padding: '3px 8px' }}
                onClick={e => { e.stopPropagation(); delTpl(t.id); }}>ðŸ—‘ï¸</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TplName({ tpl, onSaved }) {
  const [name, setName] = useState(tpl.name);
  async function save() {
    if (name !== tpl.name && name.trim()) {
      try { await api.renameTemplate(tpl.id, name.trim()); onSaved && onSaved(); } catch {}
    }
  }
  return (
    <input value={name} onClick={e => e.stopPropagation()} onChange={e => setName(e.target.value)} onBlur={save}
      style={{ background: 'transparent', border: 'none', color: '#e6f0f2', fontWeight: 700, fontSize: 15, width: '100%', marginTop: 6, outline: 'none' }} />
  );
}

function PkgCard({ pkg, onSaved, onDelete }) {
  const [f, setF] = useState({
    name: pkg.name, base_price: pkg.base_price, included_hours: pkg.included_hours,
    per_hour_price: pkg.per_hour_price,
    inclusions: Array.isArray(pkg.inclusions) ? pkg.inclusions : [],
  });
  const [newInc, setNewInc] = useState('');
  const [saved, setSaved] = useState('');
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 9, width: '100%' };

  async function save() {
    setSaved('');
    try {
      await api.updateVendorPackage(pkg.id, {
        ...f, base_price: Number(f.base_price) || 0,
        included_hours: Number(f.included_hours) || 0,
        per_hour_price: Number(f.per_hour_price) || 0,
      });
      setSaved('âœ… Saved'); setTimeout(() => setSaved(''), 1500);
      onSaved && onSaved();
    } catch (e) { setSaved('âš ï¸ ' + e.message); }
  }
  function addInc() {
    if (!newInc.trim()) return;
    set('inclusions', [...f.inclusions, newInc.trim()]);
    setNewInc('');
  }
  function rmInc(i) { set('inclusions', f.inclusions.filter((_, x) => x !== i)); }

  return (
    <div className="table-wrap" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <input style={{ ...box, width: '55%', fontWeight: 700, fontSize: 16 }} value={f.name} onChange={e => set('name', e.target.value)} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {pkg.is_default && <span className="badge active">Default</span>}
          {saved && <span style={{ fontSize: 12, color: '#4ade80' }}>{saved}</span>}
          {!pkg.is_default && <button className="refresh" onClick={onDelete}>ðŸ—‘ï¸</button>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#7c9199' }}>ðŸ’° Base price ($)</label>
          <input style={box} type="number" value={f.base_price} onChange={e => set('base_price', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#7c9199' }}>â±ï¸ Included hours</label>
          <input style={box} type="number" value={f.included_hours} onChange={e => set('included_hours', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, color: '#7c9199' }}>âž• Extra $/hour</label>
          <input style={box} type="number" value={f.per_hour_price} onChange={e => set('per_hour_price', e.target.value)} />
        </div>
      </div>

      <label style={{ fontSize: 12, color: '#7c9199', display: 'block', marginTop: 12 }}>ðŸ“ Inclusions (your own items)</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '6px 0' }}>
        {f.inclusions.map((inc, i) => (
          <span key={i} style={{ background: '#2dd4bf18', border: '1px solid #2dd4bf44', color: '#2dd4bf', padding: '4px 10px', borderRadius: 16, fontSize: 12 }}>
            {inc} <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => rmInc(i)}>âœ•</span>
          </span>
        ))}
        {f.inclusions.length === 0 && <span style={{ color: '#7c9199', fontSize: 12 }}>No items yet â€” add below ðŸ‘‡</span>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={box} placeholder="e.g. 8x10 prints, 2 photographersâ€¦" value={newInc}
          onChange={e => setNewInc(e.target.value)} onKeyDown={e => e.key === 'Enter' && addInc()} />
        <button className="refresh" onClick={addInc}>+ Add</button>
      </div>

      <button className="refresh" onClick={save} style={{ marginTop: 14, width: '100%', background: '#2dd4bf', color: '#06231f' }}>ðŸ’¾ Save package</button>
    </div>
  );
}

function SettingsView({ user }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState('');
  const [em, setEm] = useState({ email: user?.email || '', password: '' });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.mySettings().then(d => {
      setS(d.settings || { time_format: '12h', theme: 'dark', timezone: guessTz() });
    }).catch(() => setS({ time_format: '12h', theme: 'dark', timezone: guessTz() }));
  }, []);
  function guessTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'America/Vancouver'; } }

  async function savePrefs(next) {
    setS(next); setSaved('');
    try { await api.saveSettings(next); setSaved('âœ… Saved'); setTimeout(() => setSaved(''), 1500); } catch {}
  }
  async function saveEmail() {
    setMsg('');
    try { await api.changeEmail(em.email, em.password); setMsg('âœ… Email updated'); setEm({ ...em, password: '' }); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }
  async function savePw() {
    setMsg('');
    try { await api.changePassword(pw.current, pw.next); setMsg('âœ… Password changed'); setPw({ current: '', next: '' }); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  if (!s) return <div className="loading">Loadingâ€¦</div>;
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 10, width: '100%', marginTop: 6 };

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Preferences */}
      <div className="table-wrap" style={{ padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>ðŸ• Preferences {saved && <span style={{ fontSize: 13, color: '#4ade80' }}>{saved}</span>}</h2>

        <label style={{ fontSize: 13, color: '#9fb3b0' }}>Time format</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {['12h', '24h'].map(t => (
            <button key={t} onClick={() => savePrefs({ ...s, time_format: t })}
              className="refresh" style={{ flex: 1, background: s.time_format === t ? '#2dd4bf' : '#0d1417', color: s.time_format === t ? '#06231f' : '#e6f0f2' }}>
              {t === '12h' ? '12-hour (2:30 PM)' : '24-hour (14:30)'}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, color: '#9fb3b0', display: 'block', marginTop: 14 }}>Theme</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {['dark', 'light'].map(t => (
            <button key={t} onClick={() => savePrefs({ ...s, theme: t })}
              className="refresh" style={{ flex: 1, background: s.theme === t ? '#2dd4bf' : '#0d1417', color: s.theme === t ? '#06231f' : '#e6f0f2' }}>
              {t === 'dark' ? 'ðŸŒ™ Dark' : 'â˜€ï¸ Light'}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13, color: '#9fb3b0', display: 'block', marginTop: 14 }}>Timezone</label>
        <input style={box} value={s.timezone || ''} onChange={e => setS({ ...s, timezone: e.target.value })}
          onBlur={() => savePrefs(s)} />
        <div style={{ fontSize: 11, color: '#7c9199', marginTop: 4 }}>ðŸŒ Auto-detected from your location</div>
      </div>

      {/* Account */}
      <div className="table-wrap" style={{ padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>ðŸ” Account</h2>
        {msg && <div style={{ padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 13, background: msg[0] === 'âœ…' ? '#4ade8018' : '#fb718518', color: msg[0] === 'âœ…' ? '#4ade80' : '#fb7185' }}>{msg}</div>}

        <label style={{ fontSize: 13, color: '#9fb3b0' }}>ðŸ“§ Change email</label>
        <input style={box} value={em.email} onChange={e => setEm({ ...em, email: e.target.value })} placeholder="new@email.com" />
        <input style={box} type="password" value={em.password} onChange={e => setEm({ ...em, password: e.target.value })} placeholder="Current password" />
        <button className="refresh" onClick={saveEmail} style={{ marginTop: 8 }}>Update email</button>

        <label style={{ fontSize: 13, color: '#9fb3b0', display: 'block', marginTop: 18 }}>ðŸ”‘ Change password</label>
        <input style={box} type="password" value={pw.current} onChange={e => setPw({ ...pw, current: e.target.value })} placeholder="Current password" />
        <input style={box} type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} placeholder="New password (min 6)" />
        <button className="refresh" onClick={savePw} style={{ marginTop: 8 }}>Change password</button>
      </div>

      <EmailSetup />
    </div>
  );
}

function EmailSetup() {
  const [s, setS] = useState(null);
  const [msg, setMsg] = useState('');
  const box = { background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2', padding: 10, width: '100%', marginTop: 6 };

  useEffect(() => {
    api.emailSettings().then(d => setS(d.settings)).catch(() => setS({ mode: 'platform' }));
  }, []);

  async function save() {
    setMsg('');
    try { await api.saveEmailSettings(s); setMsg('âœ… Saved'); setTimeout(() => setMsg(''), 1500); }
    catch (e) { setMsg('âš ï¸ ' + e.message); }
  }

  if (!s) return null;
  const MODES = [
    ['smtp', 'ðŸ”§ My own SMTP'],
    ['self', 'ðŸ“¥ Self-receive (reply from my inbox)'],
    ['platform', 'ðŸ¢ Platform email (noreply)'],
  ];

  return (
    <div className="table-wrap" style={{ padding: 22 }}>
      <h2 style={{ marginTop: 0 }}>ðŸ“§ Email sending {msg && <span style={{ fontSize: 13, color: '#4ade80' }}>{msg}</span>}</h2>

      <label style={{ fontSize: 13, color: '#9fb3b0' }}>How do you want to email clients?</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
        {MODES.map(([m, label]) => (
          <button key={m} className="refresh" onClick={() => setS({ ...s, mode: m })}
            style={{ textAlign: 'left', background: s.mode === m ? '#2dd4bf' : '#0d1417', color: s.mode === m ? '#06231f' : '#e6f0f2' }}>
            {label}
          </button>
        ))}
      </div>

      {s.mode === 'smtp' && (
        <div style={{ marginTop: 12 }}>
          <input style={box} placeholder="SMTP host (e.g. smtp.gmail.com)" value={s.smtp_host || ''} onChange={e => setS({ ...s, smtp_host: e.target.value })} />
          <input style={box} type="number" placeholder="Port (587)" value={s.smtp_port || 587} onChange={e => setS({ ...s, smtp_port: Number(e.target.value) })} />
          <input style={box} placeholder="SMTP username" value={s.smtp_user || ''} onChange={e => setS({ ...s, smtp_user: e.target.value })} />
          <input style={box} type="password" placeholder="SMTP password" value={s.smtp_pass || ''} onChange={e => setS({ ...s, smtp_pass: e.target.value })} />
          <input style={box} placeholder="From name (e.g. Sunny Studios)" value={s.from_name || ''} onChange={e => setS({ ...s, from_name: e.target.value })} />
          <input style={box} placeholder="From email" value={s.from_email || ''} onChange={e => setS({ ...s, from_email: e.target.value })} />
        </div>
      )}

      <label style={{ fontSize: 13, color: '#9fb3b0', display: 'block', marginTop: 14 }}>ðŸ“¬ New-lead alerts go to</label>
      <input style={box} placeholder="you@email.com" value={s.notify_email || ''} onChange={e => setS({ ...s, notify_email: e.target.value })} />

      <button className="refresh" onClick={save} style={{ marginTop: 14, width: '100%', background: '#2dd4bf', color: '#06231f' }}>ðŸ’¾ Save email settings</button>
    </div>
  );
}

function ReferForm({ user }) {
  const [friend, setFriend] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    setMsg(''); setErr('');
    if (!friend) return setErr('Enter your friend\'s email');
    setBusy(true);
    try {
      await api.createReferral(user?.email || '', friend);
      setMsg(`ðŸŽ‰ Invite sent to ${friend}! You'll both get a free month when they join on a paid plan.`);
      setFriend('');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="table-wrap" style={{ padding: 24, maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>ðŸ‘¥ Refer a friend, both get a free month ðŸŽ</h2>
      <p className="sub" style={{ marginBottom: 16 }}>
        Enter their email. When they sign up on a <b>paid plan</b>, you BOTH get 1 free month.
      </p>
      <label style={{ fontSize: 13, color: 'var(--muted)' }}>Friend's email</label>
      <input value={friend} onChange={e => setFriend(e.target.value)}
        placeholder="friend@email.com"
        style={{ width: '100%', padding: 10, margin: '6px 0 12px', background: '#0d1417', border: '1px solid #223238', borderRadius: 8, color: '#e6f0f2' }} />
      {err && <div className="err-banner">âš ï¸ {err}</div>}
      {msg && <div style={{ background: '#4ade8018', color: '#4ade80', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{msg}</div>}
      <button className="refresh" onClick={send} disabled={busy} style={{ width: '100%' }}>
        {busy ? 'Sendingâ€¦' : 'ðŸ“¨ Send Invite'}
      </button>
    </div>
  );
}
