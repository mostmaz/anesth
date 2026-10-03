import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { authApi } from '../api/authApi';
import { Icon } from '../components/icu';
import { useLang } from '../i18n';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { t } = useLang();

  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('password');
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState('');

  const submit = async (uname: string, pwd: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await authApi.login(uname.trim(), pwd.trim());
      login(res.token, res.user);
      toast.success(`Welcome back, ${res.user.name}`);
      navigate('/dashboard');
    } catch (e: any) {
      const msg = e?.message || 'Login failed';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    submit(username, password);
  };

  const quickLogin = (role: 'NURSE' | 'RESIDENT' | 'SENIOR') => {
    const uname = role.toLowerCase();
    setUsername(uname);
    submit(uname, 'password');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(1200px 800px at 50% -10%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 60%), var(--bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              background:
                'linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent) 50%, #000))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
            }}
          >
            <Icon name="dna" size={32} style={{ color: 'white' }} />
            <span
              className="icu-dot"
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: '#22c55e',
                boxShadow: '0 0 8px #22c55e',
              }}
            />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            {t('app.name')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6, marginBottom: 0 }}>
            {t('login.subtitle')}
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="icu-fld">{t('login.username')}</label>
            <input
              className="icu-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. sara.ahmed"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="icu-fld">{t('login.password')}</label>
            <input
              className="icu-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {errorMsg && (
            <div
              className="icu-card icu-card-tight"
              style={{
                background: 'var(--st-crit-bg)',
                color: 'var(--st-crit-fg)',
                borderColor: 'var(--sig-hr)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
              }}
            >
              <Icon name="alert" size={16} />
              {errorMsg}
            </div>
          )}
          <button
            type="submit"
            className="icu-btn icu-btn-primary"
            disabled={isLoading}
            style={{ padding: '14px', fontSize: 15, marginTop: 4 }}
          >
            {isLoading ? '…' : t('login.signIn')}
            {!isLoading && <Icon name="arrowRight" size={16} />}
          </button>
        </form>

        <div style={{ marginTop: 22 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              textAlign: 'center',
              marginBottom: 10,
              color: 'var(--ink-3)',
              fontWeight: 700,
            }}
          >
            {t('login.quickSignIn')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {(['NURSE', 'RESIDENT', 'SENIOR'] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => quickLogin(role)}
                disabled={isLoading}
                className="icu-btn icu-btn-outline"
                style={{ flexDirection: 'column', padding: '12px 6px', gap: 6, height: 76 }}
              >
                <Icon name="user" size={16} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
                  {t('login.role.' + role.toLowerCase())}
                </span>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-4)', textAlign: 'center', marginTop: 16 }}>
            {t('login.defaultPassword')}: <span className="icu-mono">password</span>
          </p>
        </div>
      </div>
    </div>
  );
}
