interface Props {
  initials: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const PALETTE = ['#0ea5e9', '#a855f7', '#ef4444', '#16a34a', '#f59e0b', '#06b6d4', '#db2777', '#7c3aed', '#0d9488'];

export function initialsFromName(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase() || '?';
}

export function colorFromId(id?: string): string {
  if (!id) return PALETTE[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function Avatar({ initials, color, size = 'md' }: Props) {
  const cls = size === 'sm' ? 'icu-av icu-av-sm' : size === 'lg' ? 'icu-av icu-av-lg' : 'icu-av';
  return (
    <span className={cls} style={{ background: color || '#64748b' }}>
      {initials || '?'}
    </span>
  );
}
