import { useState } from 'react';
import './passwordInput.css';

/**
 * Password field with a show/hide eye toggle.
 * Passes through any input props (value, onChange, placeholder, onKeyDown, className, style, autoFocus).
 * Use anywhere a masked password is typed - EXCEPT the super admin panel.
 */
export default function PasswordInput({ className = '', style, wrapClassName = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className={`pw-field ${wrapClassName}`} style={style}>
      <input
        {...props}
        type={show ? 'text' : 'password'}
        className={`pw-field-input ${className}`}
      />
      <button
        type="button"
        className="pw-field-eye"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        tabIndex={-1}
      >
        {show ? '\u{1F648}' : '\u{1F441}\u{FE0F}'}
      </button>
    </div>
  );
}
