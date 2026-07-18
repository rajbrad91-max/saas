import { useState } from 'react';
import { api } from '../lib/api';
import PasswordInput from '../components/PasswordInput';

export default function ResetPassword({ token }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setError('');
    if (!password || !confirm) { setError('Fill in both fields'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand"><img src="/iwopo-logo.png" alt="iwopo" className="login-brand-img" /></div>

        {done ? (
          <>
            <h1>Password updated ✅</h1>
            <p className="login-sub">You can now sign in with your new password.</p>
            <button className="login-btn" onClick={() => { window.location.href = '/'; }}>
              Go to sign in
            </button>
          </>
        ) : (
          <>
            <h1>Set a new password</h1>
            <p className="login-sub">Choose a new password for your account</p>

            <label>New password</label>
            <PasswordInput value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="At least 6 characters" />

            <label>Confirm password</label>
            <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()} placeholder="Re-enter password" />

            {error && <div className="login-error">⚠️ {error}</div>}

            <button className="login-btn" onClick={handleReset} disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
