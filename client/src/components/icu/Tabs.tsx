export interface TabItem {
  value: string;
  label: string;
  dot?: boolean;
}

interface TabsProps {
  value: string;
  onChange: (v: string) => void;
  items: TabItem[];
}

// Horizontal pill-row scrolling tabs (patient tabs)
export function Tabs({ value, onChange, items }: TabsProps) {
  return (
    <div className="icu-hscroll" style={{ display: 'flex', gap: 4 }}>
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={`icu-htab ${active ? 'active' : ''}`}
          >
            {it.label}
            {it.dot && (
              <span
                className="icu-dot"
                style={{
                  position: 'absolute', top: 6, right: 6,
                  background: 'var(--sig-hr)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Segmented rail (Active | History | Completed)
export function TabRail({ value, onChange, items }: TabsProps) {
  return (
    <div className="icu-tab-rail">
      {items.map((it) => {
        const active = value === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={`icu-tab ${active ? 'active' : ''}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
