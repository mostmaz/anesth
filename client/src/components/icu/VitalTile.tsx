import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Sig = 'sig-hr' | 'sig-spo' | 'sig-bp' | 'sig-temp' | 'sig-rr' | 'sig-rbs';

interface Props {
  label: string;
  value: ReactNode;
  unit?: string;
  signal?: Sig;
  icon?: IconName;
  big?: boolean;
  sub?: ReactNode;
  blip?: boolean;
  stale?: boolean;
}

export function VitalTile({ label, value, unit, signal = 'sig-hr', icon, big = false, sub, blip = false, stale = false }: Props) {
  const valStr = String(value ?? '');
  const shrink = valStr.length > 3;
  const fontSize = big ? (shrink ? 38 : 56) : (shrink ? 22 : 28);
  return (
    <div
      className="icu-card"
      style={{
        padding: 12,
        background: 'var(--surface)',
        borderColor: stale ? 'var(--sig-hr)' : 'var(--line)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="icu-sig-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {icon && <Icon name={icon} size={11} className={`icu-${signal}`} />}
          {label}
        </span>
        {blip && <span className={`icu-dot icu-blip`} style={{ background: `var(--${signal})` }} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginTop: 6, minHeight: big ? 48 : 32 }}>
        <span className={`icu-sig-val icu-${signal}`} style={{ fontSize, lineHeight: 1 }}>{value ?? '—'}</span>
        {unit && <span className="icu-sig-unit" style={{ marginBottom: 4 }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, marginTop: 4, color: 'var(--ink-3)' }}>{sub}</div>}
    </div>
  );
}
