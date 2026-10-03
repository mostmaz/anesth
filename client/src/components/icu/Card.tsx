import type { CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface CardProps {
  children: ReactNode;
  tight?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  accent?: boolean;
}

export function Card({ children, tight = false, className = '', style, onClick, accent }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`icu-card ${tight ? 'icu-card-tight' : ''} ${accent ? 'icu-bleed-bg' : ''} ${onClick ? 'clickable' : ''} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

interface CardHeadProps {
  title: string;
  subtitle?: ReactNode;
  icon?: IconName;
  iconTone?: 'ok' | 'warn' | 'crit' | 'info' | 'muted';
  right?: ReactNode;
}

export function CardHead({ title, subtitle, icon, iconTone = 'info', right }: CardHeadProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
        {icon && (
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `var(--st-${iconTone}-bg)`,
              color: `var(--st-${iconTone}-fg)`,
            }}
          >
            <Icon name={icon} size={18} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, marginTop: 2, color: 'var(--ink-3)' }}>{subtitle}</div>}
        </div>
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  );
}
