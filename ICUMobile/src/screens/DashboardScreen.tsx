import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { useICU, fmtTime, fmtAgo, getDueInterventions, Patient } from '../data/mockICU';
import { Avatar } from '../components/Avatar';
import { Pill } from '../components/Pill';
import { Card } from '../components/Card';
import { SectionTitle } from '../components/SectionTitle';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { TabRail } from '../components/Tabs';
import { Sheet } from '../components/Sheet';
import { Field } from '../components/Field';
import { Sparkline } from '../components/Sparkline';
import { StatusBadge } from '../components/StatusBadge';
import * as api from '../api/endpoints';
import { realMedToDesign } from '../api/mappers';
import { useT } from '../i18n';

export function DashboardScreen() {
  const t = useTokens();
  const ICU = useICU();
  const { t: tr, lang } = useT();
  const user = ICU.user!;
  const shift = ICU.shift;
  const mode = ICU.mode;
  const loadingPatients = ICU.loadingPatients;
  const [patientTab, setPatientTab] = useState<'active' | 'archived'>('active');
  const [confirmCheck, setConfirmCheck] = useState<any>(null);

  // ── Admit new patient ──
  const emptyAdmit = { name: '', mrn: '', age: '', ageUnit: 'Years', gender: 'Male', diagnosis: '' };
  const [showAdmit, setShowAdmit] = useState(false);
  const [admitBusy, setAdmitBusy] = useState(false);
  const [np, setNp] = useState(emptyAdmit);
  const [comorbInput, setComorbInput] = useState('');
  const [comorbs, setComorbs] = useState<string[]>([]);

  const openAdmit = () => { setNp(emptyAdmit); setComorbs([]); setComorbInput(''); setShowAdmit(true); };
  const addComorb = () => {
    const v = comorbInput.trim();
    if (v && !comorbs.includes(v)) setComorbs(cs => [...cs, v]);
    setComorbInput('');
  };

  const submitAdmit = async () => {
    const name = np.name.trim();
    const mrn = np.mrn.trim();
    const ageN = parseInt(np.age, 10);
    if (!name || !mrn || !Number.isFinite(ageN) || ageN <= 0) {
      ICU.pushToast({ tone: 'crit', msg: 'Name, MRN and a valid age are required' });
      return;
    }
    // Derive DOB from the entered age (matches the webapp admit form).
    const dob = new Date();
    if (np.ageUnit === 'Years') dob.setFullYear(dob.getFullYear() - ageN);
    else if (np.ageUnit === 'Months') dob.setMonth(dob.getMonth() - ageN);
    else dob.setDate(dob.getDate() - ageN);
    // Fold any half-typed comorbidity into the list.
    const finalComorbs = comorbInput.trim() && !comorbs.includes(comorbInput.trim())
      ? [...comorbs, comorbInput.trim()] : comorbs;
    setAdmitBusy(true);
    try {
      if (mode === 'live') {
        await api.createPatient({
          name, mrn, dob: dob.toISOString(), gender: np.gender,
          diagnosis: np.diagnosis.trim() || undefined,
          comorbidities: finalComorbs, authorId: user.id,
        });
        await ICU.loadPatients();
        ICU.pushToast({ tone: 'ok', msg: `${name} admitted` });
      } else {
        ICU.pushToast({ tone: 'ok', msg: 'Patient admitted (demo)' });
      }
      setShowAdmit(false);
    } catch (e: any) {
      ICU.pushToast({ tone: 'crit', msg: e?.message || 'Failed to admit patient' });
    } finally {
      setAdmitBusy(false);
    }
  };

  useEffect(() => {
    if (mode === 'live' && ICU.patients.length === 0 && !ICU.loadingPatients) {
      ICU.loadPatients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const due = useMemo(() => {
    const out: any[] = [];
    ICU.patients.forEach(p => {
      const r = getDueInterventions(p, ICU.alarmsOn);
      r.forEach(i => out.push({ ...i, patient: p }));
    });
    return out;
  }, [ICU.patients, ICU.alarmsOn]);

  // Stable key of the patient roster — changes only when patients are added/removed,
  // not when a child collection (vitals/mar/…) is loaded. Used to keep the expensive
  // warnings fetch from re-firing on every tab load.
  const patientIdsKey = useMemo(() => ICU.patients.map(p => p.id).join(','), [ICU.patients]);

  // ── Warnings from any patient: events + abnormal labs + drugs past their course due-date ──
  type Warning = { id: string; kind: 'lab' | 'drug' | 'event'; patientId: string; patientName: string; title: string; subtitle: string; tab: string };
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Warnings are for residents/seniors only — nurses focus on their checked-in patient.
    if (user.role === 'NURSE') { setWarnings([]); return; }

    const isAbn = (result: any) =>
      !!result && typeof result === 'object' &&
      Object.values(result).some((v: any) => v && typeof v === 'object' && (v as any).isAbnormal);

    let cancelled = false;

    async function compute() {
      const eventWarnings: Warning[] = [];
      const drugWarnings: Warning[] = [];
      const labWarnings: Warning[] = [];
      if (mode === 'live') {
        // Recorded events (global feed) — most urgent, shown first.
        try {
          const feed = await api.getEventsFeed();
          (feed || []).forEach(e => eventWarnings.push({
            id: `event-${e.id}`, kind: 'event',
            patientId: e.patient?.id || e.patientId,
            patientName: e.patient?.name || 'Patient',
            title: e.title || 'Event',
            subtitle: e.content || (e.data?.severity ? String(e.data.severity) : 'Event'),
            tab: 'events',
          }));
        } catch { /* ignore */ }
        // Drugs due — active patients only (bounded fetch)
        const active = ICU.patients.filter(p => !p.dischargedAt);
        const marLists = await Promise.all(active.map(p =>
          api.getMar(p.id).then(list => ({ p, list })).catch(() => ({ p, list: [] as any[] })),
        ));
        marLists.forEach(({ p, list }) => {
          (list || []).map(realMedToDesign).forEach(m => {
            if (m.active && m.days >= m.duration) drugWarnings.push({
              id: `drug-${m.id}`, kind: 'drug',
              patientId: p.id, patientName: p.name,
              title: m.name, subtitle: `Due — course day ${m.days} of ${m.duration}`, tab: 'mar',
            });
          });
        });
        // Abnormal labs (single global feed)
        try {
          const feed = await api.getInvestigationsFeed();
          (feed || []).filter(i => isAbn(i.result)).forEach(i => labWarnings.push({
            id: `lab-${i.id}`, kind: 'lab',
            patientId: i.patient?.id || i.patientId,
            patientName: i.patient?.name || 'Patient',
            title: i.title, subtitle: 'Abnormal result', tab: 'labs',
          }));
        } catch { /* ignore */ }
      } else {
        // demo: derive from already-loaded patient data
        ICU.patients.forEach(p => {
          p.events.forEach(e =>
            eventWarnings.push({ id: `event-${e.id}`, kind: 'event', patientId: p.id, patientName: p.name, title: e.category, subtitle: e.description || e.severity, tab: 'events' }));
          p.medications.filter(m => m.active && m.days >= m.duration).forEach(m =>
            drugWarnings.push({ id: `drug-${m.id}`, kind: 'drug', patientId: p.id, patientName: p.name, title: m.name, subtitle: `Due — course day ${m.days} of ${m.duration}`, tab: 'mar' }));
          p.investigations.filter(i => i.abnormal).forEach(i =>
            labWarnings.push({ id: `lab-${i.id}`, kind: 'lab', patientId: p.id, patientName: p.name, title: i.title, subtitle: 'Abnormal result', tab: 'labs' }));
        });
      }
      // Events first (most urgent), then drugs due, then abnormal labs.
      if (!cancelled) setWarnings([...eventWarnings, ...drugWarnings, ...labWarnings]);
    }

    compute();
    return () => { cancelled = true; };
    // Re-run only when the roster changes, not on every child-collection load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patientIdsKey]);

  // Seed dismissed warnings from the server so ✕ persists across refresh/restart.
  // We reuse the generic dismissedLabs preference store (it accepts any string id).
  const [dismissedLoaded, setDismissedLoaded] = useState(false);
  useEffect(() => {
    if (mode !== 'live' || !ICU.user) { setDismissedLoaded(true); return; }
    let cancelled = false;
    setDismissedLoaded(false);
    api.getUserPreferences(ICU.user.id)
      .then(prefs => { if (!cancelled) setDismissedWarnings(new Set(prefs?.dismissedLabs || [])); })
      .catch(() => { /* silent — dismissals just won't persist */ })
      .finally(() => { if (!cancelled) setDismissedLoaded(true); });
    return () => { cancelled = true; };
  }, [mode, ICU.user]);

  // Hold warnings back until the dismissed set has loaded, otherwise already-dismissed
  // items flash back on every open and get re-dismissed.
  const visibleWarnings = dismissedLoaded ? warnings.filter(w => !dismissedWarnings.has(w.id)) : [];
  const dismissWarning = (id: string) => {
    // Optimistic hide, then persist to the server so it stays gone after refresh.
    setDismissedWarnings(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    if (mode === 'live' && ICU.user) {
      api.dismissLab(ICU.user.id, id).catch(() => {
        // Roll back if the server rejected it
        setDismissedWarnings(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        ICU.pushToast({ tone: 'crit', msg: 'Could not dismiss — try again' });
      });
    }
  };

  // Nurse's checked-in patients. The receiving checklist now lives in the
  // patient check-in flow (PatientDetailScreen), not on the dashboard.
  const myPatients = ICU.patients.filter(p => p.assignedNurseId === user.id);
  const activePatients = ICU.patients.filter(p => !p.dischargedAt);
  const archivedPatients = ICU.patients.filter(p => !!p.dischargedAt);
  const shown = patientTab === 'active' ? activePatients : archivedPatients;

  const activeOrders = ICU.patients.flatMap(p =>
    p.orders.filter(o => o.status === 'PENDING' || o.status === 'APPROVED').map(o => ({ ...o, patient: p }))
  );

  // Nurses: load orders for their assigned patients so their upcoming orders surface here.
  const myAssignedKey = ICU.patients.filter(p => p.assignedNurseId === user.id).map(p => p.id).join(',');
  useEffect(() => {
    if (mode !== 'live' || user.role !== 'NURSE') return;
    ICU.patients.filter(p => p.assignedNurseId === user.id).forEach(p => ICU.loadOrders(p.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, user.role, myAssignedKey]);
  const myUpcoming = user.role === 'NURSE'
    ? activeOrders.filter(o => o.patient.assignedNurseId === user.id)
    : [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return tr('dash.greeting.morning');
    if (h < 18) return tr('dash.greeting.afternoon');
    return tr('dash.greeting.evening');
  })();

  const firstName = user.name.replace('Dr. ', '').split(' ')[0];

  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      {/* TopBar */}
      <View style={[styles.topBar, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
        <Avatar initials={user.initials} color={user.color} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.greet, { color: t.ink }]} numberOfLines={1}>{greeting}, {firstName}</Text>
          <Text style={{ fontSize: 12, color: t.ink3 }} numberOfLines={1}>
            {tr('dash.commandCenter')} · <Text style={{ color: t.accentInk, fontWeight: '600' }}>{user.role}</Text>
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Pressable hitSlop={6} onPress={() => ICU.setLang(lang === 'ar' ? 'en' : 'ar')}
            style={[styles.iconBtn, { paddingHorizontal: 8, borderWidth: 1, borderColor: t.line2, borderRadius: 8 }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: t.ink2 }}>{lang === 'ar' ? 'EN' : 'ع'}</Text>
          </Pressable>
          <Pressable hitSlop={6} style={[styles.iconBtn, { position: 'relative' }]}>
            <Icon name="bell" size={18} color={t.ink2} />
            {(due.length > 0 || visibleWarnings.length > 0) && <View style={[styles.alertDot, { backgroundColor: t.sigHr }]} />}
          </Pressable>
          <Pressable hitSlop={6} style={styles.iconBtn} onPress={() => ICU.setView('tweaks')}>
            <Icon name="settings" size={18} color={t.ink2} />
          </Pressable>
          <Pressable hitSlop={6} style={styles.iconBtn} onPress={() => ICU.signOut()}>
            <Icon name="logout" size={18} color={t.ink2} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loadingPatients}
            onRefresh={() => mode === 'live' && ICU.loadPatients()}
            tintColor={t.accent}
          />
        }
      >
        {/* Shift / sync strip */}
        <View style={styles.stripRow}>
          <Pill tone={mode === 'live' ? 'ok' : 'warn'}>
            <View style={[styles.pillDot, { backgroundColor: mode === 'live' ? t.okLine : t.warnLine }]} />
            <Text style={{ color: mode === 'live' ? t.okFg : t.warnFg, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              {mode === 'live' ? 'LIVE' : 'DEMO'}
            </Text>
          </Pill>
          <Pill tone="ok">
            <View style={[styles.pillDot, { backgroundColor: t.okLine }]} />
            <Text style={{ color: t.okFg, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              SHIFT {(shift?.type || 'DAY')} · {fmtTime(shift?.startTime || new Date())}
            </Text>
          </Pill>
          {(user.role === 'SENIOR' || user.role === 'RESIDENT') && (
            <Pill tone="accent">
              <Icon name="shield" size={11} color={t.accentInk} />
              <Text style={{ color: t.accentInk, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>CHECKED IN · UNIT</Text>
            </Pill>
          )}
          {(user.role === 'SENIOR' || user.role === 'RESIDENT') && (
            <Button size="xs" variant="outline" onPress={() => ICU.signOut()}>{tr('dash.endShift')}</Button>
          )}
        </View>

        {/* Intervention reminders banner */}
        {due.length > 0 && (
          <Card style={{ borderColor: t.sigTemp, backgroundColor: t.warnBg }}>
            <View style={styles.warnHead}>
              <View style={[styles.warnIcon, { backgroundColor: t.warnLine }]}>
                <Icon name="bell_ring" size={16} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.warnFg }}>{due.length} due now</Text>
                <Text style={{ fontSize: 11, color: t.warnFg, opacity: 0.85, marginTop: 2 }}>
                  Intervention checks need your attention.
                </Text>
              </View>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {due.slice(0, 3).map((d, idx) => (
                <View key={idx} style={[styles.dueRow, { backgroundColor: t.surface, borderColor: t.line }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{d.title}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }} numberOfLines={1}>
                      {d.patient.name} · due {fmtAgo(d.reminderAt)} ago
                    </Text>
                  </View>
                  <Button size="xs" variant="success" icon="check" onPress={() => setConfirmCheck(d)}>
                    Complete
                  </Button>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Patient warnings — abnormal labs + drugs due, from any patient */}
        {visibleWarnings.length > 0 && (
          <Card style={{ borderColor: t.sigHr, backgroundColor: t.critBg }}>
            <View style={styles.warnHead}>
              <View style={[styles.warnIcon, { backgroundColor: t.sigHr }]}>
                <Icon name="alert" size={16} color="#ffffff" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: t.critFg }}>{visibleWarnings.length} warning{visibleWarnings.length === 1 ? '' : 's'}</Text>
                <Text style={{ fontSize: 11, color: t.critFg, opacity: 0.85, marginTop: 2 }}>
                  Abnormal results & drugs due need review.
                </Text>
              </View>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {visibleWarnings.slice(0, 8).map(w => (
                <View
                  key={w.id}
                  style={[styles.dueRow, { backgroundColor: t.surface, borderColor: t.line }]}
                >
                  <View style={{
                    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: w.kind === 'drug' ? t.warnBg : w.kind === 'event' ? t.critBg : t.critBg,
                  }}>
                    <Icon name={w.kind === 'drug' ? 'pill' : w.kind === 'event' ? 'alert' : 'flask'} size={14} color={w.kind === 'drug' ? t.warnFg : t.critFg} />
                  </View>
                  <Pressable
                    onPress={() => ICU.openPatient(w.patientId, w.tab)}
                    style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{w.title}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }} numberOfLines={1}>{w.patientName} · {w.subtitle}</Text>
                  </Pressable>
                  <Pill tone={w.kind === 'drug' ? 'warn' : 'crit'}>{w.kind === 'drug' ? 'Due' : w.kind === 'event' ? 'Event' : 'Abnormal'}</Pill>
                  <Pressable hitSlop={8} onPress={() => dismissWarning(w.id)} style={{ padding: 4 }}>
                    <Icon name="x" size={16} color={t.ink3} />
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Upcoming orders for the nurse's checked-in patient(s) */}
        {user.role === 'NURSE' && myUpcoming.length > 0 && (
          <Card style={{ backgroundColor: t.accentSoft, borderColor: t.accent }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="clipboard" size={18} color={t.accentInk} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: t.accentInk }}>
                {myUpcoming.length} upcoming order{myUpcoming.length === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={{ gap: 6 }}>
              {myUpcoming.slice(0, 6).map(o => (
                <Pressable key={`${o.patient.id}-${o.id}`} onPress={() => ICU.openPatient(o.patient.id, 'orders')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface }}>
                  <StatusBadge status={o.status} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{o.title}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }} numberOfLines={1}>{o.type} · {o.patient.name}</Text>
                  </View>
                  <Icon name="chevR" size={16} color={t.ink3} />
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        {/* My Patients (NURSE) */}
        {user.role === 'NURSE' && myPatients.length > 0 && (
          <View>
            <SectionTitle right={<Text style={{ fontSize: 11, color: t.ink3 }}>{myPatients.length} assigned</Text>}>
              YOUR PATIENTS
            </SectionTitle>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {myPatients.map(p => <MiniPatientCard key={p.id} patient={p} onPress={() => ICU.openPatient(p.id)} />)}
            </ScrollView>
          </View>
        )}

        {/* Patient List */}
        <View>
          <SectionTitle right={
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <View style={{ minWidth: 160 }}>
                <TabRail
                  value={patientTab}
                  onChange={(v) => setPatientTab(v as any)}
                  items={[
                    { value: 'active', label: `${tr('dash.active')} · ${activePatients.length}` },
                    { value: 'archived', label: `${tr('dash.archived')} · ${archivedPatients.length}` },
                  ]}
                />
              </View>
              {user.role !== 'NURSE' && (
                <Button size="xs" variant="primary" icon="plus" onPress={openAdmit}>{tr('dash.admit')}</Button>
              )}
            </View>
          }>{tr('dash.patients')}</SectionTitle>
          <View style={{ gap: 10 }}>
            {loadingPatients && shown.length === 0
              ? <Card><View style={{ alignItems: 'center', paddingVertical: 20 }}><ActivityIndicator color={t.accent} /><Text style={{ color: t.ink3, fontSize: 12, marginTop: 8 }}>Loading patients…</Text></View></Card>
              : shown.length === 0
                ? <Card><Text style={{ textAlign: 'center', color: t.ink3, fontSize: 13, paddingVertical: 16 }}>No {patientTab} patients.</Text></Card>
                : shown.map(p => <PatientRow key={p.id} patient={p} userId={user.id} userRole={user.role} onPress={() => ICU.openPatient(p.id)} />)
            }
          </View>
        </View>

        {/* Clinical Orders strip (non-nurse) */}
        {user.role !== 'NURSE' && activeOrders.length > 0 && (
          <View>
            <SectionTitle right={<Text style={{ fontSize: 11, color: t.ink3 }}>{activeOrders.length} active</Text>}>
              CLINICAL ORDERS
            </SectionTitle>
            <View style={{ gap: 8 }}>
              {activeOrders.slice(0, 4).map(o => (
                <Pressable
                  key={`${o.patient.id}-${o.id}`}
                  onPress={() => ICU.openPatient(o.patient.id, 'orders')}
                  style={({ pressed }) => [
                    styles.orderRow,
                    { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <StatusBadge status={o.status} />
                      {o.priority === 'STAT' && <Pill tone="crit">STAT</Pill>}
                      <Text style={{ fontSize: 11, color: t.ink3 }}>{o.type}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{o.title}</Text>
                    <Text style={{ fontSize: 11, color: t.ink3 }}>
                      {o.patient.name} · {o.patient.mrn} · {fmtAgo(o.t)} ago
                    </Text>
                  </View>
                  {o.status === 'APPROVED' && (
                    <Button size="xs" variant="outline" onPress={() => { o.status = 'COMPLETED'; ICU.pushToast({ tone: 'ok', msg: 'Order completed' }); ICU.bump(); }}>
                      Complete
                    </Button>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Confirm check sheet */}
      <Sheet
        open={!!confirmCheck}
        onClose={() => setConfirmCheck(null)}
        title="Complete Check"
        footer={
          <>
            <Button variant="outline" onPress={() => setConfirmCheck(null)}>Cancel</Button>
            <Button
              variant="success"
              icon="check"
              onPress={() => {
                if (confirmCheck) confirmCheck.status = 'COMPLETED';
                ICU.pushToast({ tone: 'ok', msg: 'Intervention check completed' });
                ICU.bump();
                setConfirmCheck(null);
              }}
            >
              Yes, complete
            </Button>
          </>
        }
      >
        {confirmCheck && (
          <Text style={{ fontSize: 14, color: t.ink2 }}>
            Mark <Text style={{ fontWeight: '700', color: t.ink }}>{confirmCheck.title}</Text> for{' '}
            <Text style={{ fontWeight: '700', color: t.ink }}>{confirmCheck.patient.name}</Text> as checked?
          </Text>
        )}
      </Sheet>

      {/* Admit new patient */}
      <Sheet
        open={showAdmit}
        onClose={() => !admitBusy && setShowAdmit(false)}
        title="Admit new patient"
        footer={
          <>
            <Button variant="outline" onPress={() => setShowAdmit(false)} disabled={admitBusy}>Cancel</Button>
            <Button variant="primary" icon="check" loading={admitBusy} disabled={admitBusy} onPress={submitAdmit}>
              {admitBusy ? 'Admitting…' : 'Admit patient'}
            </Button>
          </>
        }
      >
        <View style={{ gap: 12 }}>
          <Field label="Patient name *" value={np.name} placeholder="e.g. Mustafa Mazin"
            onChangeText={(v) => setNp(p => ({ ...p, name: v }))} />
          <Field label="MRN *" value={np.mrn} placeholder="Medical record number"
            onChangeText={(v) => setNp(p => ({ ...p, mrn: v }))} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 96 }}>
              <Field label="Age *" value={np.age} keyboardType="number-pad" placeholder="45"
                onChangeText={(v) => setNp(p => ({ ...p, age: v.replace(/[^0-9]/g, '') }))} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[admitLabel, { color: t.ink3 }]}>Unit</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['Years', 'Months', 'Days'] as const).map(u => {
                  const on = np.ageUnit === u;
                  return (
                    <Pressable key={u} onPress={() => setNp(p => ({ ...p, ageUnit: u }))}
                      style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface2 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: on ? t.accentInk : t.ink3 }}>{u}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
          <View>
            <Text style={[admitLabel, { color: t.ink3 }]}>Gender</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {(['Male', 'Female', 'Other'] as const).map(g => {
                const on = np.gender === g;
                return (
                  <Pressable key={g} onPress={() => setNp(p => ({ ...p, gender: g }))}
                    style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accentSoft : t.surface2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: on ? t.accentInk : t.ink3 }}>{g}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Field label="Primary diagnosis" value={np.diagnosis} placeholder="e.g. Septic shock, Pneumonia"
            onChangeText={(v) => setNp(p => ({ ...p, diagnosis: v }))} />
          <View>
            <Text style={[admitLabel, { color: t.ink3 }]}>Comorbidities</Text>
            {comorbs.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {comorbs.map(c => (
                  <Pressable key={c} onPress={() => setComorbs(cs => cs.filter(x => x !== c))}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.accentSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
                    <Text style={{ fontSize: 12, color: t.accentInk, fontWeight: '600' }}>{c}</Text>
                    <Icon name="x" size={12} color={t.accentInk} />
                  </Pressable>
                ))}
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}>
                <Field value={comorbInput} onChangeText={setComorbInput} placeholder="Type and tap +"
                  returnKeyType="done" onSubmitEditing={addComorb} />
              </View>
              <Button size="icon-sm" variant="outline" icon="plus" onPress={addComorb} />
            </View>
          </View>
        </View>
      </Sheet>
    </View>
  );
}

const admitLabel = { fontSize: 11, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 6 };

function MiniPatientCard({ patient, onPress }: { patient: Patient; onPress: () => void }) {
  const t = useTokens();
  const r = useICU(s => s.liveReadings[patient.id]);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.mini,
      { borderColor: patient.critical ? t.sigHr : t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 },
    ]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Avatar initials={patient.initials} color={patient.color} size="sm" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: t.ink }} numberOfLines={1}>{patient.name}</Text>
          <Text style={{ fontSize: 10, color: t.ink3 }}>{patient.bed} · {patient.mrn}</Text>
        </View>
        <Pill tone={patient.critical ? 'crit' : 'ok'}>{patient.critical ? 'Critical' : 'Stable'}</Pill>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: t.ink3, fontWeight: '700' }}>HR</Text>
          <Text style={{ fontSize: 22, color: t.sigHr, fontWeight: '700' }}>{r.hr}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: t.ink3, fontWeight: '700' }}>SpO₂</Text>
          <Text style={{ fontSize: 22, color: t.sigSpo, fontWeight: '700' }}>{r.spo}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: t.ink3, fontWeight: '700' }}>BP</Text>
          <Text style={{ fontSize: 16, color: t.sigBp, fontWeight: '700' }}>{r.sys}/{r.dia}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function PatientRow({ patient, userId, userRole, onPress }: { patient: Patient; userId: string; userRole: string; onPress: () => void }) {
  const t = useTokens();
  const r = useICU(s => s.liveReadings[patient.id]);
  const ICU = useICU();
  const isMine = patient.assignedNurseId === userId;
  const status = isMine ? 'YOUR_PATIENT' : (patient.assignedNurseId ? 'OCCUPIED' : 'AVAILABLE');
  const assignedNurse = ICU.users.find(u => u.id === patient.assignedNurseId);
  const hrSeries = patient.vitals.slice(-12).map(v => v.hr);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.patientRow,
      {
        borderColor: patient.critical ? `${t.sigHr}99` : t.line,
        backgroundColor: t.surface,
        opacity: pressed ? 0.9 : 1,
      },
    ]}>
      {patient.critical && <View style={[styles.criticalStripe, { backgroundColor: t.sigHr }]} />}

      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Avatar initials={patient.initials} color={patient.color} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.ink }} numberOfLines={1}>{patient.name}</Text>
            <Pill tone={patient.critical ? 'crit' : 'ok'}>{patient.critical ? 'Critical' : 'Stable'}</Pill>
            {patient.ventilated && <Pill tone="info"><Icon name="wind" size={10} color={t.infoFg} /><Text style={{ fontSize: 11, color: t.infoFg, fontWeight: '700' }}>Vented</Text></Pill>}
          </View>
          <Text style={{ fontSize: 11, color: t.ink3, marginBottom: 6 }}>{patient.bed} · {patient.mrn} · {patient.age}{patient.gender} · {patient.code}</Text>
          <Text style={{ fontSize: 12, color: t.ink2 }} numberOfLines={1}>{patient.diagnosis}</Text>

          <View style={styles.miniVitalsRow}>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>HR</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.sigHr }}>{r.hr}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>SPO₂</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: t.sigSpo }}>{r.spo}<Text style={{ fontSize: 12, color: t.ink3 }}>%</Text></Text>
            </View>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>BP</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.sigBp }}>{r.sys}/{r.dia}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 9, fontWeight: '700', color: t.ink3, letterSpacing: 1 }}>TEMP</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: t.sigTemp }}>{r.temp}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <Sparkline values={hrSeries} color={t.sigHr} height={32} />
            </View>
          </View>

          <View style={[styles.patientFooter, { borderTopColor: t.line }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {assignedNurse ? (
                <>
                  <Avatar initials={assignedNurse.initials} color={assignedNurse.color} size="sm" />
                  <Text style={{ fontSize: 12, color: t.ink3 }}>{assignedNurse.name.split(' ')[0]}</Text>
                </>
              ) : (
                <Text style={{ fontSize: 11, color: t.ink3 }}>No nurse assigned</Text>
              )}
            </View>
            {userRole === 'NURSE' ? (
              status === 'YOUR_PATIENT'
                ? <Pill tone="ok">Checked in</Pill>
                : <Button size="xs" variant={status === 'OCCUPIED' ? 'outline' : 'primary'} icon="check" onPress={() => onPress()}>
                    {status === 'OCCUPIED' ? 'Take over' : 'Check in'}
                  </Button>
            ) : (
              <Text style={{ fontSize: 11, color: t.ink3 }}>
                {patient.orders.filter(o => o.status === 'PENDING').length} pending order{patient.orders.filter(o => o.status === 'PENDING').length === 1 ? '' : 's'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  greet: { fontSize: 16, fontWeight: '600' },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  alertDot: {
    position: 'absolute',
    top: 5, right: 5,
    width: 8, height: 8, borderRadius: 4,
  },
  scroll: { padding: 14, paddingBottom: 30, gap: 14 },
  stripRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  warnHead: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  warnIcon: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  staffLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
  },
  staffChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999,
  },
  mini: {
    minWidth: 200,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  patientRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    overflow: 'hidden',
  },
  criticalStripe: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
  },
  miniVitalsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  patientFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
