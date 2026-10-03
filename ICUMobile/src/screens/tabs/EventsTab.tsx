import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtDate, fmtTime, fmtAgo, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';

const EVENT_CATEGORIES = ['Deterioration', 'Code Blue', 'Fall', 'Aspiration', 'Extubation', 'Line/tube dislodged', 'Family meeting', 'Procedure', 'Transfer', 'Other'];
const SEVERITIES: Array<{ value: 'info' | 'warning' | 'critical'; label: string }> = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export function EventsTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState('Deterioration');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('warning');
  const [description, setDescription] = useState('');

  const list = [...patient.events].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());

  const sevTone = (s: string) => (s === 'critical' ? 'crit' : s === 'warning' ? 'warn' : 'info') as any;
  const sevColor = (s: string) => (s === 'critical' ? t.sigHr : s === 'warning' ? t.sigTemp : t.infoFg);

  const save = async () => {
    if (ICU.mode !== 'live') { ICU.pushToast({ tone: 'warn', msg: 'Switch to Live mode to record' }); return; }
    if (!description.trim()) { ICU.pushToast({ tone: 'crit', msg: 'Describe the event' }); return; }
    setBusy(true);
    try {
      await ICU.addEventLive(patient.id, { category, severity, description: description.trim() });
      setShowAdd(false);
      setDescription('');
      setSeverity('warning');
      setCategory('Deterioration');
    } finally { setBusy(false); }
  };

  const chip = (on: boolean) => ({
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
    borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : t.surface,
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Events</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{list.length} logged · alerts the whole team</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowAdd(true)}>Record</Button>
      </View>

      {list.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No events logged.</Text></Card>
        : <View style={{ gap: 8 }}>
            {list.map(e => (
              <Card key={e.id} style={{ padding: 14, borderColor: e.severity === 'critical' ? `${t.sigHr}59` : t.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: sevColor(e.severity) + '22' }}>
                    <Icon name="alert" size={15} color={sevColor(e.severity)} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: t.ink }} numberOfLines={1}>{e.category}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }}>{e.by} · {fmtDate(e.t)} {fmtTime(e.t)} · {fmtAgo(e.t)} ago</Text>
                  </View>
                  <Pill tone={sevTone(e.severity)}>{e.severity.toUpperCase()}</Pill>
                </View>
                {e.description ? <Text style={{ fontSize: 13, color: t.ink2 }}>{e.description}</Text> : null}
              </Card>
            ))}
          </View>
      }

      <Sheet open={showAdd} onClose={() => !busy && setShowAdd(false)} title="Record event"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={save} loading={busy} disabled={busy}>Record & notify</Button>
        </>}
      >
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.section}>Event type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {EVENT_CATEGORIES.map(c => (
                <Pressable key={c} onPress={() => setCategory(c)} style={chip(category === c)}>
                  <Text style={{ fontSize: 12, fontWeight: category === c ? '700' : '500', color: category === c ? t.accentInk : t.ink2 }}>{c}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.section}>Severity</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {SEVERITIES.map(s => {
                const on = severity === s.value;
                const col = sevColor(s.value);
                return (
                  <Pressable key={s.value} onPress={() => setSeverity(s.value)}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: on ? col : t.line2, backgroundColor: on ? col + '1f' : t.surface }}>
                    <Text style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? col : t.ink2 }}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Description" placeholder="What happened?" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} value={description} onChangeText={setDescription} />
          <Text style={{ fontSize: 11, color: t.ink3 }}>Recording an event alerts all staff via a dashboard warning and a push notification.</Text>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
});
