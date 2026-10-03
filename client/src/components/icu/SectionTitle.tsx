import type { ReactNode } from 'react';

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8, marginTop: 4 }}>
      <h3 style={{
        margin: 0, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ink-3)',
      }}>{children}</h3>
      {right}
    </div>
  );
}
