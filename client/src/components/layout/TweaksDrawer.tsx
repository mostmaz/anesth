import { useTheme, type Accent } from '../../theme/ThemeProvider';
import { Sheet, Icon, SectionTitle } from '../icu';

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACCENTS: [Accent, string][] = [
  ['blue', '#2563eb'],
  ['teal', '#0d9488'],
  ['violet', '#7c3aed'],
  ['amber', '#d97706'],
];

export function TweaksDrawer({ open, onClose }: Props) {
  const { mode, setMode, shift, setShift, accent, setAccent, density, setDensity } = useTheme();
  return (
    <Sheet open={open} onClose={onClose} title="Tweaks">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SectionTitle>Theme</SectionTitle>
        <div className="icu-tab-rail">
          <button type="button" className={`icu-tab ${mode === 'light' ? 'active' : ''}`} onClick={() => setMode('light')}>Light</button>
          <button type="button" className={`icu-tab ${mode === 'dark' ? 'active' : ''}`} onClick={() => setMode('dark')}>Dark · Bedside</button>
        </div>

        <SectionTitle>Shift tint</SectionTitle>
        <div className="icu-tab-rail">
          <button type="button" className={`icu-tab ${shift === 'day' ? 'active' : ''}`} onClick={() => setShift('day')}>☀ Day</button>
          <button type="button" className={`icu-tab ${shift === 'night' ? 'active' : ''}`} onClick={() => setShift('night')}>🌙 Night</button>
        </div>

        <SectionTitle>Accent</SectionTitle>
        <div style={{ display: 'flex', gap: 10 }}>
          {ACCENTS.map(([a, color]) => (
            <button
              key={a}
              type="button"
              onClick={() => setAccent(a)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: color,
                border: `3px solid ${accent === a ? 'var(--ink)' : 'transparent'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label={a}
            >
              {accent === a && <Icon name="check" size={18} style={{ color: 'white' }} />}
            </button>
          ))}
        </div>

        <SectionTitle>Density</SectionTitle>
        <div className="icu-tab-rail">
          <button type="button" className={`icu-tab ${density === 'comfy' ? 'active' : ''}`} onClick={() => setDensity('comfy')}>Comfy</button>
          <button type="button" className={`icu-tab ${density === 'compact' ? 'active' : ''}`} onClick={() => setDensity('compact')}>Compact</button>
        </div>

        <SectionTitle>About</SectionTitle>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>
          Bedside-first redesign of the ICU Manager webapp. Preferences persist in localStorage.
        </p>
      </div>
    </Sheet>
  );
}
