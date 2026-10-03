import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtAgo, getDueInterventions, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { StatusBadge } from '../../components/StatusBadge';
import { Icon } from '../../components/Icon';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';

export function InterventionsTab({ patient }: { patient: Patient }) {
  const t = useTokens();
  const ICU = useICU();
  const [showAdd, setShowAdd] = useState(false);
  const due = getDueInterventions(patient, ICU.alarmsOn);

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Interventions</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{patient.interventions.length} procedures · {due.length} due</Text>
        </View>
        <Button size="sm" variant="primary" icon="plus" onPress={() => setShowAdd(true)}>Schedule</Button>
      </View>

      {due.length > 0 && (
        <Card style={{ backgroundColor: t.warnBg, borderColor: t.sigTemp }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Icon name="bell_ring" size={16} color={t.warnFg} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.warnFg }}>{due.length} due now</Text>
          </View>
          {due.map(d => (
            <View key={d.id} style={[styles.dueRow, { borderTopColor: t.warnLine + '33' }]}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink, flex: 1 }} numberOfLines={1}>{d.title}</Text>
              <Text style={{ fontSize: 11, color: t.warnFg, marginRight: 6 }}>due {fmtAgo(d.reminderAt)} ago</Text>
              <Button size="xs" variant="success" icon="check" onPress={() => {
                d.status = 'COMPLETED';
                ICU.pushToast({ tone: 'ok', msg: 'Check completed' });
                ICU.bump();
              }} />
            </View>
          ))}
        </Card>
      )}

      <View style={{ gap: 10 }}>
        {patient.interventions.map(iv => {
          const remaining = Math.round((new Date(iv.reminderAt).getTime() - Date.now()) / (60 * 60_000));
          const overdue = remaining < 0;
          return (
            <Card key={iv.id} tight style={{ padding: 14, borderColor: overdue ? t.sigHr : t.line }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <StatusBadge status={iv.status} />
                <Pill tone="accent">{iv.type}</Pill>
                <Text style={{ marginLeft: 'auto', fontSize: 10, color: t.ink3 }}>{fmtAgo(iv.t)} ago</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: t.ink }}>{iv.title}</Text>
              {iv.notes ? <Text style={{ fontSize: 11, fontStyle: 'italic', color: t.ink3, marginTop: 2 }}>{iv.notes}</Text> : null}
              {iv.status !== 'COMPLETED' && iv.reminderAt && (
                <Text style={{ fontSize: 11, marginTop: 8, fontWeight: '500', color: overdue ? t.sigHr : t.sigRr }}>
                  {overdue ? `Overdue by ${Math.abs(remaining)}h` : `Check due in ${remaining}h`}
                </Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                {iv.status === 'APPROVED' && (
                  <Button size="xs" variant="success" icon="check" onPress={() => {
                    iv.status = 'COMPLETED';
                    ICU.pushToast({ tone: 'ok', msg: 'Marked done' });
                    ICU.bump();
                  }}>Mark done</Button>
                )}
                {iv.status === 'COMPLETED' && (
                  <Pill tone="ok">
                    <Icon name="check" size={10} color={t.okFg} />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: t.okFg, letterSpacing: 0.5 }}>DONE</Text>
                  </Pill>
                )}
              </View>
            </Card>
          );
        })}
      </View>

      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title="Schedule intervention"
        footer={<>
          <Button variant="outline" onPress={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" onPress={() => { setShowAdd(false); ICU.pushToast({ tone: 'ok', msg: 'Intervention scheduled' }); }}>Schedule</Button>
        </>}
      >
        <View style={{ gap: 10 }}>
          <Field label="Type" defaultValue="ETT" />
          <Field label="Title" defaultValue="Endotracheal Tube" />
          <Field label="Notes" multiline numberOfLines={2} style={{ minHeight: 60, textAlignVertical: 'top' }} />
          <View style={[styles.safety, { backgroundColor: t.warnBg }]}>
            <Icon name="alert" size={14} color={t.warnFg} />
            <Text style={{ fontSize: 12, fontWeight: '600', color: t.warnFg, flex: 1 }}>
              Safety check: patient on Enoxaparin — review before procedure.
            </Text>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  safety: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
});
