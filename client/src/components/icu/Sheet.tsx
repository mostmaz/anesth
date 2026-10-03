import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Sheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const orig = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = orig;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="icu-backdrop" onClick={onClose}>
      <div className="icu-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="icu-sheet-grip" />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: 16, color: 'var(--ink)' }}>{title}</h3>
            <button onClick={onClose} className="icu-btn icu-btn-icon-sm icu-btn-ghost"><Icon name="x" size={16} /></button>
          </div>
        )}
        <div>{children}</div>
        {footer && <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}
