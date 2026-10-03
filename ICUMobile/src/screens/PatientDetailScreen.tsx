import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { useTokens } from '../theme/ThemeContext';
import { useICU, fmtAgo, getDueInterventions } from '../data/mockICU';
import { PatientHeader } from './PatientHeader';
import { Tabs, TabItem } from '../components/Tabs';
import { Icon } from '../components/Icon';
import { Button } from '../components/Button';
import { useT } from '../i18n';

// Receiving handover checklist (nurse completes it while taking over the patient).
const RECEIVING_ITEMS = [
  'Verify Patient Identity & MRN',
  'Check All IV Access & Patency',
  'Confirm Current Infusions & Rates',
  'Review Recent Vital Signs',
  'Check Drains, Catheters & Output',
  'Verify Ventilator Settings (if applicable)',
  'Confirm Pending Medications/Orders',
];
// Patients whose receiving checklist the current session has completed (module-level
// so it survives navigating away and back; resets on app restart — fine for v1).
const receivedChecklist = new Set<string>();

import { OverviewTab } from './tabs/OverviewTab';
import { VitalsTab } from './tabs/VitalsTab';
import { MARTab } from './tabs/MARTab';
import { IOTab } from './tabs/IOTab';
import { LabsTab } from './tabs/LabsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { NursingTab } from './tabs/NursingTab';
import { InterventionsTab } from './tabs/InterventionsTab';
import { NotesTab } from './tabs/NotesTab';
import { VentilatorTab } from './tabs/VentilatorTab';
import { ConsultationTab } from './tabs/ConsultationTab';
import { HandoverTab } from './tabs/HandoverTab';
import { EventsTab } from './tabs/EventsTab';
import { RoundsTab } from './tabs/RoundsTab';

export function PatientDetailScreen() {
  const t = useTokens();
  const ICU = useICU();
  const [refreshing, setRefreshing] = useState(false);
  const patient = ICU.patients.find(p => p.id === ICU.patientId);
  const user = ICU.user!;
  const { t: tr } = useT();
  const tab = ICU.patientTab;
  const setTab = (v: string) => ICU.setPatientTab(v);

  if (!patient) return null;

  // Pull-to-refresh reloads the current tab's data from the backend.
  const onRefresh = async () => {
    if (ICU.mode !== 'live') { setRefreshing(false); return; }
    const id = patient.id;
    setRefreshing(true);
    try {
      switch (tab) {
        case 'vitals': await Promise.all([ICU.loadVitals(id), ICU.loadMar(id)]); break;
        case 'mar': await ICU.loadMar(id); break;
        case 'io': await ICU.loadIO(id); break;
        case 'labs': await ICU.loadInvestigations(id); break;
        case 'orders': await ICU.loadOrders(id); break;
        case 'notes': await ICU.loadNotes(id); break;
        case 'nursing': await ICU.loadSkin(id); break;
        case 'ventilator': await ICU.loadVentilator(id); break;
        case 'consultation': await ICU.loadConsultations(id); break;
        case 'handover': await ICU.loadHandovers(id); break;
        case 'events': await ICU.loadEvents(id); break;
        default: await Promise.all([ICU.loadVitals(id), ICU.loadMar(id), ICU.loadOrders(id), ICU.loadIO(id), ICU.loadInvestigations(id)]); break;
      }
    } finally {
      setRefreshing(false);
    }
  };

  const due = getDueInterventions(patient, ICU.alarmsOn);

  const isNurse = user.role === 'NURSE';
  const checkedIn = !isNurse || patient.assignedNurseId === user.id;
  // After check-in, a nurse must complete the receiving checklist before charting.
  const needsChecklist = isNurse && checkedIn && !receivedChecklist.has(patient.id);

  // Step 1 — nurse not checked in → check-in gate.
  if (isNurse && !checkedIn) {
    const currentNurse = ICU.users.find(u => u.id === patient.assignedNurseId);
    return (
      <View style={[styles.frame, { backgroundColor: t.bg }]}>
        <PatientHeader patient={patient} onBack={() => ICU.setView('dashboard')} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 16 }}>
          <View style={{ width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: t.accentSoft }}>
            <Icon name="shield" size={30} color={t.accentInk} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: t.ink, textAlign: 'center' }}>Check in to this patient</Text>
          <Text style={{ fontSize: 13, color: t.ink3, textAlign: 'center', lineHeight: 19 }}>
            Check in to {patient.name} to receive and chart. {currentNurse ? `${currentNurse.name.split(' ')[0]} (previous shift) will be checked out.` : 'This patient is currently unassigned.'}
          </Text>
          <Button
            variant="primary"
            icon="check"
            fullWidth
            onPress={async () => {
              if (ICU.mode === 'live') await ICU.assignPatientLive(patient.id);
              else {
                const copy = ICU.patients.map(p => p.id === patient.id ? { ...p, assignedNurseId: user.id } : (p.assignedNurseId === user.id ? { ...p, assignedNurseId: null } : p));
                (ICU as any).patients = copy; ICU.pushToast({ tone: 'ok', msg: 'Checked in' }); ICU.bump();
              }
            }}
          >
            {currentNurse ? 'Check in · check out previous nurse' : 'Check in to patient'}
          </Button>
          <Button variant="outline" fullWidth onPress={() => ICU.setView('dashboard')}>Back to dashboard</Button>
        </View>
      </View>
    );
  }

  // Step 2 — checked in, receiving checklist not yet completed.
  if (needsChecklist) {
    return (
      <ReceivingChecklist
        patientName={patient.name}
        onComplete={() => { receivedChecklist.add(patient.id); ICU.pushToast({ tone: 'ok', msg: 'Handover complete — you have the patient' }); ICU.bump(); }}
        onBack={() => ICU.setView('dashboard')}
      />
    );
  }

  const allTabs: TabItem[] = [
    { value: 'overview', label: tr('tab.overview') },
    ...(user.role !== 'NURSE' ? [{ value: 'rounds', label: tr('tab.rounds') }] : []),
    { value: 'vitals', label: tr('tab.vitals') },
    { value: 'events', label: tr('tab.events') },
    { value: 'mar', label: tr('tab.mar') },
    { value: 'io', label: tr('tab.io') },
    { value: 'labs', label: tr('tab.labs') },
    { value: 'orders', label: tr('tab.orders') },
    { value: 'nursing', label: tr('tab.nursing') },
    { value: 'ventilator', label: tr('tab.ventilator') },
    ...(user.role !== 'NURSE' ? [{ value: 'interventions', label: tr('tab.interventions'), dot: due.length > 0 }] : []),
    { value: 'consultation', label: tr('tab.consultation') },
    { value: 'notes', label: tr('tab.notes') },
    { value: 'handover', label: tr('tab.handover') },
  ];

  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      <PatientHeader patient={patient} onBack={() => ICU.setView('dashboard')} />

      <View style={[styles.tabBar, { backgroundColor: t.surface, borderBottomColor: t.line }]}>
        <Tabs value={tab} onChange={setTab} items={allTabs} />
      </View>

      {due.length > 0 && (
        <View style={[styles.dueBanner, { backgroundColor: t.warnBg, borderBottomColor: t.warnLine }]}>
          <Icon name="bell_ring" size={18} color={t.warnFg} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: t.warnFg }} numberOfLines={1}>{due[0].title}</Text>
            <Text style={{ fontSize: 11, color: t.warnFg }}>Due {fmtAgo(due[0].reminderAt)} ago</Text>
          </View>
          <Button
            size="xs"
            variant="outline"
            icon="check"
            style={{ backgroundColor: '#ffffff' }}
            onPress={() => { due[0].status = 'COMPLETED'; ICU.pushToast({ tone: 'ok', msg: 'Check completed' }); ICU.bump(); }}
          >
            Complete
          </Button>
          <Pressable hitSlop={6}><Icon name="x" size={16} color={t.warnFg} /></Pressable>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.accent]} />}
      >
        <TabBody tab={tab} patient={patient} userRole={user.role} />
      </ScrollView>
    </View>
  );
}

function TabBody({ tab, patient, userRole }: { tab: string; patient: any; userRole: string }) {
  switch (tab) {
    case 'overview': return <OverviewTab patient={patient} />;
    case 'rounds': return <RoundsTab patient={patient} userRole={userRole} />;
    case 'vitals': return <VitalsTab patient={patient} />;
    case 'mar': return <MARTab patient={patient} userRole={userRole} />;
    case 'io': return <IOTab patient={patient} />;
    case 'labs': return <LabsTab patient={patient} userRole={userRole} />;
    case 'orders': return <OrdersTab patient={patient} userRole={userRole} />;
    case 'nursing': return <NursingTab patient={patient} />;
    case 'interventions': return <InterventionsTab patient={patient} />;
    case 'notes': return <NotesTab patient={patient} />;
    case 'ventilator': return <VentilatorTab patient={patient} />;
    case 'consultation': return <ConsultationTab patient={patient} />;
    case 'handover': return <HandoverTab patient={patient} />;
    case 'events': return <EventsTab patient={patient} />;
    default: return null;
  }
}

function ReceivingChecklist({ patientName, onComplete, onBack }: { patientName: string; onComplete: () => void; onBack: () => void }) {
  const t = useTokens();
  const [checks, setChecks] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setChecks(prev => {
    const n = new Set(prev);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });
  const allDone = checks.size >= RECEIVING_ITEMS.length;
  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.line, backgroundColor: t.surface }}>
        <Pressable onPress={onBack} hitSlop={8}><Icon name="chevL" size={22} color={t.ink2} /></Pressable>
        <Text style={{ fontSize: 16, fontWeight: '700', color: t.ink }}>Patient Receiving Checklist</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
        <Text style={{ fontSize: 13, color: t.ink3, marginBottom: 4 }}>
          Complete this checklist while receiving <Text style={{ fontWeight: '700', color: t.ink }}>{patientName}</Text> from the previous nurse.
        </Text>
        {RECEIVING_ITEMS.map((item, i) => {
          const on = checks.has(i);
          return (
            <Pressable key={i} onPress={() => toggle(i)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, opacity: pressed ? 0.85 : 1 })}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: on ? t.accent : t.line2, backgroundColor: on ? t.accent : t.surface, alignItems: 'center', justifyContent: 'center' }}>
                {on && <Icon name="check" size={14} color={t.accentFg} />}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: t.ink2 }}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={{ padding: 14, borderTopWidth: 1, borderTopColor: t.line, backgroundColor: t.surface }}>
        <Button variant="success" icon="check" fullWidth disabled={!allDone} onPress={onComplete}>
          {allDone ? 'Complete handover' : `Complete handover (${checks.size}/${RECEIVING_ITEMS.length})`}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
  tabBar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  body: {
    padding: 14,
    paddingBottom: 30,
    gap: 14,
  },
});
