import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { Toaster } from '../ui/sonner';
import { Icon } from '../icu';
import { Avatar, initialsFromName, colorFromId } from '../icu/Avatar';
import { TweaksDrawer } from './TweaksDrawer';
import { useLang } from '../../i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface MenuItem {
  icon: 'activity' | 'clock' | 'settings' | 'users';
  label: string;
  path: string;
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { t, lang, setLang } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { checkActiveShift, endShift } = useShiftStore();

  useEffect(() => {
    if (user) checkActiveShift(user.id);
  }, [user, checkActiveShift]);

  // Browser notifications permission
  useEffect(() => {
    if ('Notification' in window) {
      Notification.requestPermission().catch(() => { /* ignore */ });
    }
  }, []);

  // SSE
  useEffect(() => {
    if (!user) return;
    const src = new EventSource(`${API_URL}/notifications/stream`);

    const ring = (title: string, body: string, tone: 'info' | 'warning' | 'success' | 'error', action?: any) => {
      if (tone === 'warning') toast.warning(title, { description: body, duration: 10000, action });
      else if (tone === 'error') toast.error(title, { description: body });
      else if (tone === 'success') toast.success(title, { description: body });
      else toast.info(title, { description: body });

      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body, icon: '/favicon.ico', tag: title }); } catch { /* ignore */ }
      }
    };

    src.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const { type, patientName, title, message, patientId } = data;
        switch (type) {
          case 'new_investigation': ring(`New Lab — ${patientName}`, title, 'info'); break;
          case 'intervention_reminder':
            ring('Intervention Reminder', `${patientName}: ${title}`, 'warning',
              { label: 'View', onClick: () => navigate(`/patients/${patientId}`) });
            break;
          case 'new_order': ring('New Clinical Order', `${patientName}: ${title}`, 'info'); break;
          case 'new_admission': ring('New Admission', `${patientName} admitted.`, 'success'); break;
          case 'system_update': ring('System Update', message || 'Updates available.', 'info'); break;
        }
      } catch (e) {
        console.error('SSE parse failed:', e);
      }
    };
    src.onerror = () => { src.close(); };
    return () => { src.close(); };
  }, [user, navigate]);

  const handleLogout = async () => {
    await endShift().catch(() => { /* ignore */ });
    logout();
    navigate('/login');
    toast.success('Signed out');
  };

  const menuItems: MenuItem[] = [
    { icon: 'activity', label: t('nav.dashboard'), path: '/dashboard' },
    { icon: 'clock', label: t('nav.myShift'), path: '/shift' },
    ...(user?.role === 'SENIOR' ? [{ icon: 'users' as const, label: t('nav.admin'), path: '/admin' }] : []),
  ];

  const avatarColor = colorFromId(user?.id);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
            zIndex: 40,
          }}
          className="lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className="icu-sidebar"
        style={{
          position: 'fixed',
          top: 0, bottom: 0, left: 0, width: 260,
          background: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .2s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 64, display: 'flex', alignItems: 'center', padding: '0 20px',
            borderBottom: '1px solid var(--line)',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 50%, #000))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <Icon name="dna" size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{t('app.name')}</div>
            <div style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
              {t('app.tagline')}
            </div>
          </div>
        </div>

        <nav style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  fontSize: 14, fontWeight: 600,
                  borderRadius: 10,
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent-ink)' : 'var(--ink-3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background .15s',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
          <button
            type="button"
            onClick={() => setTweaksOpen(true)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', marginBottom: 6,
              fontSize: 13, fontWeight: 600,
              borderRadius: 10,
              background: 'var(--surface-3)',
              color: 'var(--ink-2)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
          >
            <Icon name="settings" size={16} />
            {t('nav.tweaks')}
          </button>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px',
              marginBottom: 6,
            }}
          >
            <Avatar initials={initialsFromName(user?.name)} color={avatarColor} size="sm" />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 10, color: 'var(--accent-ink)', fontWeight: 700, letterSpacing: '0.06em' }}>{user?.role}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="icu-btn icu-btn-outline icu-btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <Icon name="logout" size={14} />
            {t('nav.signOut')}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', marginLeft: 0 }} className="icu-main">
        <header
          style={{
            position: 'sticky', top: 0, zIndex: 30,
            height: 56,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', padding: '0 16px',
            gap: 10,
            boxShadow: 'var(--shadow-sm)',
          }}
          className="print:hidden"
        >
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden icu-btn icu-btn-icon-sm icu-btn-ghost"
            aria-label="Open menu"
          >
            <Icon name="menu" size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="lg:hidden">
            <Icon name="dna" size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{t('app.name')}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="hidden sm:flex" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{user?.name}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {user?.role}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="icu-btn icu-btn-outline icu-btn-xs"
              title={t('lang.language')}
              aria-label={t('lang.language')}
              style={{ minWidth: 40, fontWeight: 700 }}
            >
              {lang === 'ar' ? 'EN' : 'ع'}
            </button>
            <Avatar initials={initialsFromName(user?.name)} color={avatarColor} size="sm" />
            <button
              type="button"
              onClick={handleLogout}
              className="icu-btn icu-btn-outline icu-btn-xs"
              aria-label={t('nav.signOut')}
            >
              <Icon name="logout" size={14} />
              <span className="hidden sm:inline">{t('nav.signOut')}</span>
            </button>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>

      <TweaksDrawer open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
      <Toaster richColors />

      {/* Inline responsive styles */}
      <style>{`
        @media (min-width: 1024px) {
          .icu-sidebar { position: relative !important; transform: none !important; }
          .icu-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}
