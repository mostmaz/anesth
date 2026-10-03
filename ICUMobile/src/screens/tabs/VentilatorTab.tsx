import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtDate, fmtTime, Patient } from '../../data/mockICU';
import { Card, CardHead } from '../../components/Card';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';

const VENT_MODES = ['SIMV-PC', 'SIMV-VC', 'AC-VC', 'AC-PC', 'PSV', 'CPAP', 'BiPAP'];

export function VentilatorTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ mode: '', rate: '', fio2: '', peep: '', vt: '', ps: '', ie: '' });

  const settings = [...patient.ventilator].sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime());
  const latest = settings[0];

  const save = async () => {
    if (!f.mode.trim()) { ICU.pushToast({ tone: 'crit', msg: 'Enter a mode' }); return; }
    const num = (s: string) => { const n = Number(s); return Number.isFinite(n) ? n : 0; };
    setBusy(true);
    try {
      if (ICU.mode === 'live') {
        await ICU.addVentilatorLive(patient.id, {
          mode: f.mode.trim(), rate: num(f.rate), fio2: num(f.fio2), ie: f.ie.trim() || '1:2', ps: num(f.ps), vt: num(f.vt),
        });
      } else {
        patient.ventilator.unshift({ id: 'vn' + Date.now(), t: new Date(), mode: f.mode, rate: num(f.rate), fio2: num(f.fio2), peep: num(f.peep), vt: num(f.vt), ps: num(f.ps), ie: f.ie || '1:2' });
        ICU.pushToast({ tone: 'ok', msg: 'Settings recorded (demo)' });
        ICU.bump();
      }
      setShowAdd(false);
      setF({ mode: '', rate: '', fio2: '', peep: '', vt: '', ps: '', ie: '' });
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Ventilator</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{settings.length} setting change{settings.length === 1 ? '' : 's'} recorded</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowAdd(true)}>New</Button>
      </View>

      {latest && (
        <Card>
          <CardHead title="Current settings" subtitle={`${fmtDate(latest.t)} · ${fmtTime(latest.t)}`} icon="wind" iconTone="info" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            {[
              ['Mode', latest.mode], ['Rate', `${latest.rate}`], ['FiO₂', `${latest.fio2}%`],
              ['Vₜ', `${latest.vt} mL`], ['PS', `${latest.ps}`], ['I:E', latest.ie],
            ].map(([l, v]) => (
              <View key={l} style={{ width: '30%' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>{l}</Text>
                <Text style={{ fontSize: 18, fontWeight: '700', color: t.ink }}>{v}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card tight>
        <CardHead title="History" subtitle={`${settings.length} entries`} icon="clock" />
        {settings.length === 0
          ? <Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No ventilator settings recorded.</Text>
          : <View>
              <View style={[styles.row, { borderBottomColor: t.line, borderBottomWidth: 1 }]}>
                <Text style={[styles.th, { color: t.ink3, flex: 1.4 }]}>Time</Text>
                <Text style={[styles.th, { color: t.ink3, flex: 1.2 }]}>Mode/Rate</Text>
                <Text style={[styles.th, { color: t.ink3, width: 44 }]}>FiO₂</Text>
                <Text style={[styles.th, { color: t.ink3, width: 60 }]}>Vₜ/PS</Text>
                <Text style={[styles.th, { color: t.ink3, width: 40 }]}>I:E</Text>
              </View>
              {settings.map(s => (
                <View key={s.id} style={[styles.row, { borderTopColor: t.line, borderTopWidth: 1 }]}>
                  <Text style={[styles.td, { color: t.ink2, flex: 1.4 }]}>{fmtDate(s.t)} {fmtTime(s.t)}</Text>
                  <Text style={[styles.td, { color: t.ink, flex: 1.2, fontWeight: '600' }]}>{s.mode}/{s.rate}</Text>
                  <Text style={[styles.td, { color: t.ink2, width: 44 }]}>{s.fio2}%</Text>
                  <Text style={[styles.td, { color: t.ink2, width: 60 }]}>{s.vt}/{s.ps}</Text>
                  <Text style={[styles.td, { color: t.ink2, width: 40 }]}>{s.ie}</Text>
                </View>
              ))}
            </View>
        }
      </Card>

      <Sheet open={showAdd} onClose={() => !busy && setShowAdd(false)} title="New ventilator settings"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
          <Button variant="primary" icon="check" onPress={save} loading={busy} disabled={busy}>Record</Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <View>
            <Text style={styles.pickLabel}>Mode</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {VENT_MODES.map(m => {
                const on = f.mode === m;
                return (
                  <Button key={m} size="xs" variant="outline"
                    style={{ borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accentSoft : undefined }}
                    textStyle={{ color: on ? t.accentInk : t.ink2 }}
                    onPress={() => setF(p => ({ ...p, mode: m }))}>{m}</Button>
                );
              })}
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {([['rate', 'Rate (bpm)'], ['fio2', 'FiO₂ (%)'], ['peep', 'PEEP'], ['vt', 'Vₜ (mL)'], ['ps', 'PS'], ['ie', 'I:E']] as const).map(([k, l]) => (
              <View key={k} style={{ width: '47%' }}>
                <Field label={l} value={(f as any)[k]} keyboardType={k === 'ie' ? 'default' : 'numeric'}
                  placeholder={k === 'ie' ? '1:2' : ''}
                  onChangeText={(txt) => setF(p => ({ ...p, [k]: k === 'ie' ? txt : txt.replace(/[^0-9.]/g, '') }))} />
              </View>
            ))}
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 6, alignItems: 'center' },
  th: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { fontSize: 12 },
  pickLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
});
