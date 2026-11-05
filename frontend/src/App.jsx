import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AlertProvider } from './context/AlertContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { AlertBox } from './components/AlertBox';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { AuthView } from './views/AuthView';
import { DeanView } from './views/DeanView';
import { SuperAdminView } from './views/SuperAdminView';
import { AdminView } from './views/AdminView';
import { TeacherView } from './views/TeacherView';
import { HodView } from './views/HodView';
import { StudentView } from './views/StudentView';
import { StaffView } from './views/StaffView';
import { NoticeBanner } from './components/NoticeBanner';

const MainContent = () => {
  const { user, loading } = useAuth();
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px'
        }}
      >
        <div style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 600 }}>
          Loading EduPortal & QuizEngine...
        </div>
      </div>
    );
  }

  const renderRoleView = () => {
    if (!user) return <AuthView />;

    switch (user.role) {
      case 'dean':
        return <DeanView />;
      case 'super_admin':
        return <SuperAdminView />;
      case 'admin':
      case 'principal':
        return <AdminView />;
      case 'teacher':
      case 'class_teacher':
        return <TeacherView />;
      case 'hod':
        return <HodView />;
      case 'student':
      case 'class_leader':
        return <StudentView />;
      case 'accountant':
      case 'librarian':
      case 'parent':
        return <StaffView />;
      default:
        return <AuthView />;
    }
  };

  return (
    <>
      <Navbar onOpenChangePassword={() => setIsChangePasswordOpen(true)} />
      <AlertBox />

      <main className="container">
        {user && <NoticeBanner />}
        <ErrorBoundary isSubSection>
          {renderRoleView()}
        </ErrorBoundary>
      </main>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Portal ErrorBoundary caught error:', error, errorInfo);
    try {
      fetch('/api/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || String(error),
          stack: error?.stack || '',
          componentStack: errorInfo?.componentStack || ''
        })
      }).catch(() => {});
    } catch (_) {}
  }

  handleReset = () => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isSub = Boolean(this.props.isSubSection);
      return (
        <div
          style={{
            minHeight: isSub ? '340px' : '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            color: 'var(--text-primary)',
            textAlign: 'center',
            background: isSub ? '#f8fafc' : '#ffffff',
            borderRadius: isSub ? '12px' : '0px',
            border: isSub ? '1px solid rgba(239, 68, 68, 0.25)' : 'none',
            margin: isSub ? '20px 0' : '0'
          }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#f87171' }}>
            {isSub ? 'Dashboard View Refresh' : 'Portal Display Issue Detected'}
          </h2>
          <p style={{ color: '#334155', maxWidth: '580px', marginBottom: '14px', lineHeight: 1.5 }}>
            A client-side display error occurred. You can click below to recover your view or refresh your session.
          </p>

          {this.state.error && (
            <div
              style={{
                maxWidth: '680px',
                width: '100%',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '18px',
                textAlign: 'left',
                color: '#fca5a5',
                fontSize: '0.85rem',
                fontFamily: 'monospace',
                overflowX: 'auto'
              }}
            >
              <strong>Error:</strong> {this.state.error.message || String(this.state.error)}
              {this.state.error.stack && (
                <pre style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#cbd5e1', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto' }}>
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleRecover}
              className="btn btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.95rem', fontWeight: 600, background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}
            >
              🔄 Continue to Portal
            </button>
            <button
              onClick={this.handleReset}
              className="btn btn-secondary"
              style={{ padding: '10px 22px', fontSize: '0.95rem' }}
            >
              Sign In to Portal
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AlertProvider>
        <AuthProvider>
          <NotificationProvider>
            <MainContent />
          </NotificationProvider>
        </AuthProvider>
      </AlertProvider>
    </ErrorBoundary>
  );
}

