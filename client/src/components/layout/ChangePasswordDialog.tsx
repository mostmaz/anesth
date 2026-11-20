import { useState } from 'react';
import { toast } from 'sonner';
import { Sheet } from '../icu/Sheet';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../stores/authStore';
import { useLang } from '../../i18n';

interface Props {
  open: boolean;
  onClose: () => void;
  // Forced: shown right after sign-in while the account still has the shared
  // default password. It cannot be dismissed until a new password is set.
  forced?: boolean;
}

const MIN_LENGTH = 8;

export function ChangePasswordDialog({ open, onClose, forced = false }: Props) {
  const { t } = useLang();
  const passwordChanged = useAuthStore((s) => s.passwordChanged);
  const logout = useAuthStore((s) => s.logout);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setError(''); };
  const close = () => { if (!forced && !busy) { reset(); onClose(); } };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < MIN_LENGTH) return setError(t('password.tooShort'));
    if (next.toLowerCase() === 'password') return setError(t('password.notDefault'));
    if (next !== confirm) return setError(t('password.mismatch'));

    setBusy(true);
    try {
      const res = await authApi.changePassword(current, next);
      passwordChanged(res.token, res.fileToken);
      toast.success(t('password.changed'));
      reset();
      onClose();
    } catch (err: any) {
      setError(err?.message || t('password.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={close} title={t('password.title')}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {forced && (
          <div
            className="icu-card icu-card-tight"
            style={{ background: 'var(--st-warn-bg)', color: 'var(--st-warn-fg)', padding: '10px 12px', fontSize: 13 }}
          >
            {t('password.forcedNotice')}
          </div>
        )}
        <div>
          <label className="icu-fld">{t('password.current')}</label>
          <input className="icu-input" type="password" autoComplete="current-password" value={current}
            onChange={(e) => setCurrent(e.target.value)} required autoFocus />
        </div>
        <div>
          <label className="icu-fld">{t('password.new')}</label>
          <input className="icu-input" type="password" autoComplete="new-password" value={next}
            onChange={(e) => setNext(e.target.value)} required minLength={MIN_LENGTH} />
        </div>
        <div>
          <label className="icu-fld">{t('password.confirm')}</label>
          <input className="icu-input" type="password" autoComplete="new-password" value={confirm}
            onChange={(e) => setConfirm(e.target.value)} required minLength={MIN_LENGTH} />
        </div>
        {error && (
          <div className="icu-card icu-card-tight"
            style={{ background: 'var(--st-crit-bg)', color: 'var(--st-crit-fg)', padding: '10px 12px', fontSize: 13 }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          {forced ? (
            <button type="button" className="icu-btn icu-btn-outline" onClick={logout} disabled={busy}>
              {t('nav.signOut')}
            </button>
          ) : (
            <button type="button" className="icu-btn icu-btn-outline" onClick={close} disabled={busy}>
              {t('btn.cancel')}
            </button>
          )}
          <button type="submit" className="icu-btn icu-btn-primary" disabled={busy}>
            {busy ? '…' : t('password.save')}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
