import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtDate, fmtTime, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';

// Boolean fields grouped by section, mirroring the web app's specialist handover note.
const BOOL_SECTIONS: Array<{ title: string; items: Array<[string, string]> }> = [
  { title: 'History', items: [['histHT', 'HTN'], ['histDM', 'DM'], ['histAsthma', 'Asthma'], ['histCOPD', 'COPD'], ['histIHD', 'IHD'], ['histStroke', 'Stroke']] },
  { title: 'Respiratory', items: [['respRoomAir', 'Room air'], ['respO2Therapy', 'O₂ therapy'], ['respVentMode', 'Ventilated']] },
  { title: 'Lines & airway', items: [['intCVLine', 'CV line'], ['intArtLine', 'Art line'], ['intETT', 'ETT'], ['intTrach', 'Trach'], ['intDoubleLumen', 'Double lumen']] },
  { title: 'Hydration', items: [['hydNormovolemia', 'Normovolemia'], ['hydHypervolemia', 'Hypervolemia'], ['hydHypovolemia', 'Hypovolemia']] },
  { title: 'Hemodynamics', items: [['hemoStable', 'Stable'], ['hemoUnstable', 'Unstable'], ['hemoVasopressor', 'On vasopressor']] },
  { title: 'Feeding', items: [['feedOral', 'Oral'], ['feedNG', 'NG'], ['feedTPN', 'TPN']] },
  { title: 'Sedation', items: [['sedPropofol', 'Propofol'], ['sedKetamine', 'Ketamine'], ['sedMidazolam', 'Midazolam'], ['sedRemif', 'Remifentanil'], ['sedMR', 'Muscle relaxant']] },
];

const TEXT_FIELDS: Array<[string, string, string]> = [
  ['apacheScore', 'APACHE score', ''],
  ['neuroGCS', 'GCS', 'e.g. 15'],
  ['neuroRASS', 'RASS', 'e.g. -2'],
  ['respFio2', 'FiO₂ %', ''],
  ['respPS', 'PS', ''],
  ['feedRate', 'Feed rate', 'ml/hr'],
  ['ivFluidsRate', 'IV fluids rate', 'ml/hr'],
  ['histOther', 'Other history', 'comma separated'],
];

const PLAN_FIELDS: Array<[string, string]> = [
  ['planVentilatory', 'Ventilatory plan'],
  ['planPhysio', 'Physiotherapy'],
  ['planConsult', 'Consults'],
  ['planInvestigation', 'Investigations'],
  ['planFuture', 'Future plan'],
  ['planHomeTeam', 'Home team'],
];

export function HandoverTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({ shiftType: 'DAY' });

  const list = [...patient.handovers].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());

  const toggle = (k: string) => setForm(p => ({ ...p, [k]: !p[k] }));
  const setText = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (ICU.mode !== 'live') { ICU.pushToast({ tone: 'warn', msg: 'Switch to Live mode to save' }); return; }
    setBusy(true);
    try {
      await ICU.createHandoverLive(patient.id, { ...form, date: new Date().toISOString() });
      setShowAdd(false);
      setForm({ shiftType: 'DAY' });
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
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Handover</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{list.length} note{list.length === 1 ? '' : 's'}</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowAdd(true)}>New</Button>
      </View>

      {list.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No handover notes yet.</Text></Card>
        : <View style={{ gap: 8 }}>
            {list.map(h => {
              const active = Object.entries(h.data).filter(([k, v]) => v === true && (k.startsWith('hist') || k.startsWith('int') || k.startsWith('hemo') || k.startsWith('resp') || k.startsWith('sed') || k.startsWith('feed') || k.startsWith('hyd')));
              return (
                <Card key={h.id} style={{ padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Icon name="clipboard" size={14} color={t.accentInk} />
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink, flex: 1 }}>Handover note</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }}>{fmtDate(h.t)} {fmtTime(h.t)}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: t.ink3, marginBottom: 6 }}>By {h.by}{h.data.shiftType ? ` · ${h.data.shiftType} shift` : ''}{h.data.neuroGCS ? ` · GCS ${h.data.neuroGCS}` : ''}</Text>
                  {active.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                      {active.slice(0, 10).map(([k]) => <Pill key={k} tone="muted">{k.replace(/^(hist|int|hemo|resp|sed|feed|hyd)/, '')}</Pill>)}
                    </View>
                  )}
                  {h.data.clinicalNotes ? <Text style={{ fontSize: 12, color: t.ink2, marginTop: 8, fontStyle: 'italic' }}>{h.data.clinicalNotes}</Text> : null}
                </Card>
              );
            })}
          </View>
      }

      <Sheet open={showAdd} onClose={() => !busy && setShowAdd(false)} title="New handover note"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={save} loading={busy} disabled={busy}>Save</Button>
        </>}
      >
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.section}>Shift</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['DAY', 'NIGHT'] as const).map(s => (
                <Pressable key={s} onPress={() => setText('shiftType', s)} style={chip(form.shiftType === s)}>
                  <Text style={{ fontSize: 12, fontWeight: form.shiftType === s ? '700' : '500', color: form.shiftType === s ? t.accentInk : t.ink2 }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {BOOL_SECTIONS.map(sec => (
            <View key={sec.title}>
              <Text style={styles.section}>{sec.title}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {sec.items.map(([k, label]) => (
                  <Pressable key={k} onPress={() => toggle(k)} style={chip(!!form[k])}>
                    <Text style={{ fontSize: 12, fontWeight: form[k] ? '700' : '500', color: form[k] ? t.accentInk : t.ink2 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <View>
            <Text style={styles.section}>Values</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {TEXT_FIELDS.map(([k, l, ph]) => (
                <View key={k} style={{ width: '47%' }}>
                  <Field label={l} placeholder={ph} value={form[k] ?? ''} onChangeText={(v) => setText(k, v)} />
                </View>
              ))}
            </View>
          </View>

          <Field label="Clinical notes" placeholder="Summary / assessment" multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} value={form.clinicalNotes ?? ''} onChangeText={(v) => setText('clinicalNotes', v)} />

          <View>
            <Text style={styles.section}>Plan</Text>
            <View style={{ gap: 8 }}>
              {PLAN_FIELDS.map(([k, l]) => (
                <Field key={k} label={l} placeholder="Optional" value={form[k] ?? ''} onChangeText={(v) => setText(k, v)} />
              ))}
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
});
