import React, { useState } from 'react';

/**
 * Clean SVG Eye and Eye-Off icons for password visibility toggles.
 */
export const EyeIcon = ({ visible, size = 18 }) => {
  if (visible) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        style={{ display: 'block', pointerEvents: 'none' }}
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: 'block', pointerEvents: 'none' }}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
};

/**
 * Reusable PasswordInput with eye symbol visibility toggle button.
 * Clicking the eye symbol switches between type="password" and type="text".
 */
export const PasswordInput = ({
  value,
  onChange,
  placeholder = "Minimum 6 characters",
  minLength = 6,
  required = true,
  className = "form-input",
  style = {},
  show: controlledShow,
  onToggle: controlledOnToggle,
  id,
  name,
  disabled = false,
  autoComplete,
  ...rest
}) => {
  const [internalShow, setInternalShow] = useState(false);
  const isControlled = controlledShow !== undefined;
  const isVisible = isControlled ? controlledShow : internalShow;

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (controlledOnToggle) {
      controlledOnToggle();
    } else {
      setInternalShow((prev) => !prev);
    }
  };

  return (
    <div className="pw-wrap" style={{ position: 'relative', width: '100%' }}>
      <input
        type={isVisible ? 'text' : 'password'}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        minLength={minLength}
        required={required}
        id={id}
        name={name}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{ width: '100%', paddingRight: '44px', color: 'var(--text-primary)', caretColor: 'var(--text-primary)', ...style }}
        {...rest}
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={handleToggle}
        title={isVisible ? 'Hide password' : 'View password'}
        aria-label={isVisible ? 'Hide password' : 'View password'}
      >
        <EyeIcon visible={isVisible} size={18} />
      </button>
    </div>
  );
};

export default PasswordInput;
