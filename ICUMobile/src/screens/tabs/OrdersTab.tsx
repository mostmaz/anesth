import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTokens } from '../../theme/ThemeContext';
import { useICU, fmtAgo, Patient } from '../../data/mockICU';
import { Card } from '../../components/Card';
import { Pill } from '../../components/Pill';
import { StatusBadge } from '../../components/StatusBadge';
import { Icon, IconName } from '../../components/Icon';
import { Button } from '../../components/Button';
import { TabRail } from '../../components/Tabs';
import { Sheet } from '../../components/Sheet';
import { Field } from '../../components/Field';
import * as api from '../../api/endpoints';

const ORDER_TYPES = ['MEDICATION', 'LAB', 'IMAGING', 'NURSING', 'DIET', 'CONSULT'] as const;
const REPETITIONS = [
  { value: 'ONCE', label: 'Once only' },
  { value: 'Q1H', label: 'Q1H' },
  { value: 'Q2H', label: 'Q2H' },
  { value: 'Q4H', label: 'Q4H' },
  { value: 'Q6H', label: 'Q6H' },
  { value: 'Q8H', label: 'Q8H' },
  { value: 'Q12H', label: 'Q12H' },
  { value: 'DAILY', label: 'Daily' },
];

const TYPE_ICONS: Record<string, IconName> = {
  MEDICATION: 'pill', LAB: 'flask', IMAGING: 'monitor',
  NURSING: 'user', DIET: 'droplet', CONSULT: 'users',
};
const TYPE_TONES: Record<string, 'info' | 'ok' | 'warn' | 'muted' | 'accent'> = {
  MEDICATION: 'info', LAB: 'ok', IMAGING: 'warn',
  NURSING: 'muted', DIET: 'ok', CONSULT: 'accent',
};

export function OrdersTab({ patient, userRole }: { patient: Patient; userRole: string }) {
  const t = useTokens();
  const ICU = useICU();
  const [tab, setTab] = useState<'active' | 'history' | 'completed'>('active');
  const [showNew, setShowNew] = useState(false);

  // New-order form state
  const [newType, setNewType] = useState<typeof ORDER_TYPES[number]>('NURSING');
  const [newPriority, setNewPriority] = useState<'ROUTINE' | 'URGENT' | 'STAT'>('ROUTINE');
  const [newTitle, setNewTitle] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newRepetition, setNewRepetition] = useState('ONCE');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setNewType('NURSING');
    setNewPriority('ROUTINE');
    setNewTitle('');
    setNewDetails('');
    setNewNotes('');
    setNewRepetition('ONCE');
  };

  const submitOrder = async () => {
    if (!newTitle.trim()) {
      ICU.pushToast({ tone: 'crit', msg: 'Order title is required' });
      return;
    }
    setSubmitting(true);
    try {
      if (ICU.mode === 'live' && ICU.user) {
        await api.createOrder({
          patientId: patient.id,
          authorId: ICU.user.id,
          type: newType,
          title: newTitle.trim(),
          details: {
            info: newDetails,
            // Only nursing orders get a real repetition that will fire reminders
            repetition: newType === 'NURSING' ? newRepetition : undefined,
          },
          notes: newNotes,
          priority: newPriority,
        });
        ICU.pushToast({ tone: 'ok', msg: 'Order placed' });
        await ICU.loadOrders(patient.id);
      } else {
        ICU.pushToast({ tone: 'ok', msg: 'Order placed (demo)' });
      }
      setShowNew(false);
      resetForm();
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Failed to place order' });
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = patient.orders.filter(o => {
    if (tab === 'active') return o.status === 'PENDING' || o.status === 'APPROVED';
    if (tab === 'history') return o.status === 'DISCONTINUED';
    return o.status === 'COMPLETED';
  });

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: t.ink }}>Clinical Orders</Text>
          <Text style={{ fontSize: 11, color: t.ink3 }}>{filtered.length} {tab}</Text>
        </View>
        {(userRole === 'SENIOR' || userRole === 'RESIDENT') && (
          <Button size="sm" variant="primary" icon="plus" onPress={() => setShowNew(true)}>New order</Button>
        )}
      </View>

      <TabRail
        value={tab}
        onChange={v => setTab(v as any)}
        items={[
          { value: 'active', label: 'Active' },
          { value: 'history', label: 'History' },
          { value: 'completed', label: 'Completed' },
        ]}
      />

      {filtered.length === 0
        ? <Card><Text style={{ textAlign: 'center', fontSize: 13, color: t.ink3, paddingVertical: 16 }}>No {tab} orders.</Text></Card>
        : <View style={{ gap: 8 }}>
            {filtered.map(o => (
              <Card key={o.id} tight style={{ padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  <StatusBadge status={o.status} />
                  {o.priority === 'STAT' && <Pill tone="crit">STAT</Pill>}
                  <Pill tone={TYPE_TONES[o.type] || 'muted'}>
                    <Icon name={TYPE_ICONS[o.type] || 'fileText'} size={10} color={t.ink3} />
                    <Text style={{ fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>{o.type}</Text>
                  </Pill>
                  {o.repetition ? <Pill tone="info">{o.repetition}</Pill> : null}
                  <Text style={{ marginLeft: 'auto', fontSize: 10, color: t.ink3 }}>{fmtAgo(o.t)} ago</Text>
                </View>
                <Text style={{
                  fontSize: 14, fontWeight: '600',
                  color: o.status === 'COMPLETED' ? t.ink3 : t.ink,
                  textDecorationLine: o.status === 'COMPLETED' ? 'line-through' : 'none',
                }}>{o.title}</Text>
                <Text style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>Ordered by {o.by} · {o.role}</Text>
                {o.notes ? <Text style={{ fontSize: 11, fontStyle: 'italic', color: t.ink3, marginTop: 4 }}>{o.notes}</Text> : null}
                {(o.status === 'PENDING' || o.status === 'APPROVED') && (
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    {o.status === 'PENDING' && userRole === 'SENIOR' && (
                      <Button size="xs" variant="success" icon="check" onPress={async () => {
                        if (ICU.mode === 'live') {
                          await ICU.updateOrderStatusLive(patient.id, o.id, 'APPROVED');
                        } else {
                          o.status = 'APPROVED'; ICU.pushToast({ tone: 'ok', msg: 'Order approved' }); ICU.bump();
                        }
                      }}>Approve</Button>
                    )}
                    {o.status === 'APPROVED' && (
                      <Button size="xs" variant="outline" icon="check" onPress={async () => {
                        if (ICU.mode === 'live') {
                          await ICU.updateOrderStatusLive(patient.id, o.id, 'COMPLETED');
                        } else {
                          o.status = 'COMPLETED'; ICU.pushToast({ tone: 'ok', msg: 'Order completed' }); ICU.bump();
                        }
                      }}>Mark complete</Button>
                    )}
                    <Button size="xs" variant="ghost" icon="x" color={t.sigHr} onPress={async () => {
                      if (ICU.mode === 'live') {
                        await ICU.updateOrderStatusLive(patient.id, o.id, 'DISCONTINUED');
                      } else {
                        o.status = 'DISCONTINUED'; ICU.pushToast({ tone: 'warn', msg: 'Discontinued' }); ICU.bump();
                      }
                    }}>Discontinue</Button>
                  </View>
                )}
              </Card>
            ))}
          </View>
      }

      <Sheet open={showNew} onClose={() => !submitting && setShowNew(false)} title="New order"
        footer={<>
          <Button variant="outline" onPress={() => setShowNew(false)} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onPress={submitOrder} loading={submitting} disabled={submitting}>
            Place order
          </Button>
        </>}
      >
        <View style={{ gap: 12 }}>
          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ORDER_TYPES.map(typ => {
                const active = newType === typ;
                return (
                  <Button
                    key={typ}
                    size="xs"
                    variant={active ? 'primary' : 'outline'}
                    onPress={() => setNewType(typ)}
                  >
                    {typ}
                  </Button>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>Priority</Text>
            <TabRail
              value={newPriority.toLowerCase()}
              onChange={(v) => setNewPriority(v.toUpperCase() as any)}
              items={[
                { value: 'routine', label: 'Routine' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'stat', label: 'STAT' },
              ]}
            />
          </View>

          {newType === 'NURSING' && (
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: t.ink3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
                Repetition
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {REPETITIONS.map(opt => {
                  const active = newRepetition === opt.value;
                  return (
                    <Button
                      key={opt.value}
                      size="xs"
                      variant={active ? 'primary' : 'outline'}
                      onPress={() => setNewRepetition(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </View>
              {newRepetition !== 'ONCE' && (
                <Text style={{ fontSize: 11, color: t.ink3, marginTop: 6 }}>
                  🔔 First reminder will fire one interval from now, then repeat until you mark the order completed or discontinued.
                </Text>
              )}
            </View>
          )}

          <Field
            label="Order title *"
            value={newTitle}
            onChangeText={setNewTitle}
            placeholder={newType === 'NURSING' ? 'e.g. Turn patient q2h, change dressing' : 'e.g. Ceftriaxone 2g IV daily'}
          />
          <Field
            label="Details / instructions"
            value={newDetails}
            onChangeText={setNewDetails}
            multiline
            numberOfLines={2}
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />
          <Field
            label="Clinical notes"
            value={newNotes}
            onChangeText={setNewNotes}
            multiline
            numberOfLines={2}
            style={{ minHeight: 60, textAlignVertical: 'top' }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({});
