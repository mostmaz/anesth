import type { CSSProperties, ReactNode } from 'react';

export type PillTone = 'ok' | 'warn' | 'crit' | 'info' | 'muted' | 'accent';

interface Props {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Pill({ tone = 'muted', children, className = '', style }: Props) {
  return (
    <span className={`icu-pill icu-pill-${tone} ${className}`} style={style}>
      {children}
    </span>
  );
}

const STATUS_MAP: Record<string, [PillTone, string]> = {
  APPROVED: ['ok', 'Approved'],
  PENDING: ['warn', 'Pending'],
  COMPLETED: ['info', 'Completed'],
  DISCONTINUED: ['muted', 'Discontinued'],
  STAT: ['crit', 'STAT'],
  URGENT: ['warn', 'Urgent'],
  ROUTINE: ['muted', 'Routine'],
  CRITICAL: ['crit', 'Critical'],
  STABLE: ['ok', 'Stable'],
  ABNORMAL: ['crit', 'Abnormal'],
  ACTIVE: ['info', 'Active'],
  STARTED: ['ok', 'Started'],
  STOPPED: ['crit', 'Stopped'],
};

export function StatusBadge({ status }: { status: string }) {
  const [tone, label] = STATUS_MAP[status] || ['muted', status];
  return <Pill tone={tone}>{label}</Pill>;
}
