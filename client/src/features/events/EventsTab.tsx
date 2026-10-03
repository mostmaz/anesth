import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { notesApi, ClinicalNote } from '../../api/notesApi';
import { useAuthStore } from '../../stores/authStore';
import { Card, Pill, Icon, Sheet, SectionTitle } from '../../components/icu';

const EVENT_CATEGORIES = ['Deterioration', 'Code Blue', 'Fall', 'Aspiration', 'Extubation', 'Line/tube dislodged', 'Family meeting', 'Procedure', 'Transfer', 'Other'];
const SEVERITIES: Array<{ value: 'info' | 'warning' | 'critical'; label: string; color: string }> = [
  { value: 'info', label: 'Info', color: 'var(--sig-spo)' },
  { value: 'warning', label: 'Warning', color: 'var(--sig-temp)' },
  { value: 'critical', label: 'Critical', color: 'var(--sig-hr)' },
];

interface Props { patientId: string; }

export default function EventsTab({ patientId }: Props) {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<ClinicalNote[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('Deterioration');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [description, setDescription] = useState('');

  const fetchEvents = () => {
    notesApi.getAll(patientId, 'EVENT').then(setEvents).catch(() => setEvents([]));
  };
  useEffect(() => { fetchEvents(); /* eslint-disable-next-line */ }, [patientId]);

  const sevColor = (s: string) => (s === 'critical' ? 'var(--sig-hr)' : s === 'warning' ? 'var(--sig-temp)' : 'var(--sig-spo)');
  const sevTone = (s: string) => (s === 'critical' ? 'crit' : s === 'warning' ? 'warn' : 'info') as any;

  const save = async () => {
    if (!user) return;
    if (!description.trim()) { toast.error('Describe the event'); return; }
    setBusy(true);
    try {
      await notesApi.create({
        patientId, authorId: user.id, type: 'EVENT',
        title: category, content: description.trim(),
        data: { severity, category },
      });
      toast.success('Event recorded — team notified');
      setShowAdd(false);
      setDescription(''); setSeverity('warning'); setCategory('Deterioration');
      fetchEvents();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to record event');
    } finally { setBusy(false); }
  };

  const chip = (on: boolean): React.CSSProperties => ({
    padding: '8px 12px', borderRadius: 10, border: `1px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`,
    background: on ? 'var(--accent-soft)' : 'var(--surface)', color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
    fontSize: 12, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SectionTitle
        right={
          <button type="button" className="icu-btn icu-btn-primary icu-btn-xs" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={14} /> Record event
          </button>
        }
      >
        Events · {events.length}
      </SectionTitle>

      {events.length === 0 ? (
        <Card><p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', margin: 0 }}>No events logged.</p></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map((e) => {
            const sev = e.data?.severity || 'warning';
            return (
              <Card key={e.id} style={{ borderColor: sev === 'critical' ? 'color-mix(in oklab, var(--sig-hr) 50%, var(--line))' : 'var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `color-mix(in oklab, var(--surface) 80%, ${sevColor(sev)})` }}>
                    <Icon name="alert" size={15} style={{ color: sevColor(sev) }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{e.author?.name || '—'} · {new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <Pill tone={sevTone(sev)}>{String(sev).toUpperCase()}</Pill>
                </div>
                {e.content && <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>{e.content}</div>}
              </Card>
            );
          })}
        </div>
      )}

      <Sheet
        open={showAdd}
        onClose={() => !busy && setShowAdd(false)}
        title="Record event"
        footer={
          <>
            <button type="button" className="icu-btn icu-btn-outline" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</button>
            <button type="button" className="icu-btn icu-btn-success" onClick={save} disabled={busy}>
              <Icon name="check" size={14} /> Record &amp; notify
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Event type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EVENT_CATEGORIES.map((c) => (
                <button key={c} type="button" style={chip(category === c)} onClick={() => setCategory(c)}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Severity</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SEVERITIES.map((s) => {
                const on = severity === s.value;
                return (
                  <button key={s.value} type="button" onClick={() => setSeverity(s.value)}
                    style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${on ? s.color : 'var(--line-2)'}`, background: on ? `color-mix(in oklab, var(--surface) 85%, ${s.color})` : 'var(--surface)', color: on ? s.color : 'var(--ink-2)', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Description</div>
            <textarea
              className="icu-input"
              style={{ width: '100%', minHeight: 96, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="What happened?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <p style={{ fontSize: 11, color: 'var(--ink-3)', margin: 0 }}>Recording an event alerts all staff via a dashboard warning and a push notification.</p>
        </div>
      </Sheet>
    </div>
  );
}
