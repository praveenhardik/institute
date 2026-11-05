import React from 'react';

// Shared pill buttons. Every user gets the same fixed size so the buttons line up.
const PILL_BASE = {
  width: '170px',
  height: '50px',
  boxSizing: 'border-box',
  borderRadius: '999px',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 14px',
  fontWeight: 800,
  fontSize: '0.84rem',
  lineHeight: 1.15,
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
  flexShrink: 0
};

const CREATE_STYLE = {
  ...PILL_BASE,
  color: '#ffffff',
  background: 'linear-gradient(180deg, #ff7a2e 0%, #f04d05 55%, #c23a00 100%)',
  boxShadow: '0 3px 8px rgba(240, 77, 5, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
};

const PENDING_STYLE = {
  ...PILL_BASE,
  color: '#ffffff',
  background: 'linear-gradient(180deg, #eee78a 0%, #b9b13a 55%, #6e6b14 100%)',
  border: '2px solid #d7dbe0',
  boxShadow: '0 3px 8px rgba(110, 107, 20, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
};

const YEAR_TRANSITION_STYLE = {
  ...PILL_BASE,
  color: '#ffffff',
  background: 'linear-gradient(180deg, #818cf8 0%, #6366f1 55%, #4338ca 100%)',
  boxShadow: '0 3px 8px rgba(79, 70, 229, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
};

/** Orange "Create Account" pill. twoLines puts the text on two lines. */
export const CreateAccountPill = ({ onClick, twoLines = false, title = 'Create a new account' }) => (
  <button type="button" title={title} onClick={onClick} style={CREATE_STYLE}>
    {twoLines ? (
      <>
        <span>Create</span>
        <span>Account</span>
      </>
    ) : (
      <span>Create Account</span>
    )}
  </button>
);

/** Yellow "Approval pending" pill with the number of registrations waiting for approval. */
export const PendingPill = ({ label = 'Approval pending', count = 0, onClick, title = 'Review registrations waiting for approval' }) => (
  <button type="button" title={title} onClick={onClick} style={PENDING_STYLE}>
    <span>{label}</span>
    <span style={{ fontSize: '0.72rem', fontWeight: 700 }}>{count} waiting</span>
  </button>
);

/** Purple "Year Transition" pill for academic promotion. */
export const YearTransitionPill = ({ onClick, twoLines = false, title = 'Student Academic Year Transition & Promotion' }) => (
  <button type="button" title={title} onClick={onClick} style={YEAR_TRANSITION_STYLE}>
    {twoLines ? (
      <>
        <span>Year</span>
        <span>Transition</span>
      </>
    ) : (
      <span>Year Transition</span>
    )}
  </button>
);
