import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import { type Patient } from '../types';
import { ordersApi, ClinicalOrder } from '../api/ordersApi';
import { assignmentApi } from '../api/assignmentApi';
import { useAuthStore } from '../stores/authStore';

const RECEIVING_ITEMS = [
  'Verify Patient Identity & MRN',
  'Check All IV Access & Patency',
  'Confirm Current Infusions & Rates',
  'Review Recent Vital Signs',
  'Check Drains, Catheters & Output',
  'Verify Ventilator Settings (if applicable)',
  'Confirm Pending Medications/Orders',
];

import PatientHeader from '../features/patient/PatientHeader';
import VitalsTab from '../features/vitals/VitalsTab';
import MARTab from '../features/medication/MARTab';
import IOTab from '../features/io/IOTab';
import OrdersTab from '../features/orders/OrdersTab';
import InvestigationsTab from '../features/investigations/InvestigationsTab';
import NotesTab from '../features/notes/NotesTab';
import HandoverTab from '../features/handover/HandoverTab';
import InterventionsTab from '../features/interventions/InterventionsTab';
import OverviewTab from '../features/patient/OverviewTab';
import VentilatorTab from '../features/ventilator/VentilatorTab';
import RoundsTab from '../features/rounds/RoundsTab';
import ConsultationTab from '../features/patient/ConsultationTab';
import NursingTab from '../features/nursing/NursingTab';
import HistoryTab from '../features/patient/HistoryTab';
import EventsTab from '../features/events/EventsTab';

import { Tabs, Icon, type TabItem, Sheet } from '../components/icu';
import { useLang } from '../i18n';

export default function PatientDetails() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { t } = useLang();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [dueReminders, setDueReminders] = useState<ClinicalOrder[]>([]);
  const [confirmOrder, setConfirmOrder] = useState<ClinicalOrder | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('overview');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [checklistChecks, setChecklistChecks] = useState<Set<number>>(new Set());
  const [receivedTick, setReceivedTick] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPatient = () => {
    if (!id) return;
    apiClient.get<Patient>(`/patients/${id}`).then(setPatient).catch(console.error);
  };

  const fetchAssignments = () => {
    assignmentApi.getActive().then((a) => setAssignments(a || [])).catch(() => setAssignments([]));
  };

  const isNurse = user?.role === 'NURSE';
  const checkedIn = !isNurse || assignments.some((a: any) => a.patientId === id && a.userId === user?.id && a.isActive);
  const currentNurse = assignments.find((a: any) => a.patientId === id && a.isActive);
  void receivedTick; // re-render dependency so the localStorage read below re-evaluates
  const receivedDone = !!id && localStorage.getItem(`received_${id}`) === 'true';
  const needsChecklist = isNurse && checkedIn && !receivedDone;

  const doCheckIn = async () => {
    if (!user || !id) return;
    setCheckInBusy(true);
    try {
      const res: any = await assignmentApi.assign(id, user.id);
      const displaced = res?.displaced?.length ? ` · checked out ${res.displaced.join(', ')}` : '';
      toast.success(`Checked in${displaced}`);
      fetchAssignments();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to check in');
    } finally {
      setCheckInBusy(false);
    }
  };

  const completeReceiving = () => {
    if (id) localStorage.setItem(`received_${id}`, 'true');
    setReceivedTick((t) => t + 1);
    toast.success('Handover complete — you have the patient');
  };

  const fetchReminders = async () => {
    if (!id) return;
    try {
      const orders = await ordersApi.getOrders(id);
      const now = new Date();
      const due = orders.filter((o) =>
        o.type === 'PROCEDURE' &&
        (o as any).reminderAt &&
        new Date((o as any).reminderAt) <= now &&
        o.status !== 'COMPLETED',
      );
      setDueReminders(due.filter((o) => !dismissed.has(o.id)));
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchPatient();
    fetchReminders();
    fetchAssignments();
    pollRef.current = setInterval(fetchReminders, 60_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCompleteCheck = async (orderId: string) => {
    if (!user) return;
    try {
      await ordersApi.updateStatus(orderId, 'COMPLETED', user.id);
      toast.success('Check completed');
      setDueReminders((prev) => prev.filter((o) => o.id !== orderId));
      setConfirmOrder(null);
    } catch {
      toast.error('Failed to complete');
    }
  };

  const handleDismiss = (orderId: string) => {
    setDismissed((prev) => new Set([...prev, orderId]));
    setDueReminders((prev) => prev.filter((o) => o.id !== orderId));
  };

  if (!patient) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
        Loading patient…
      </div>
    );
  }

  // Nurse must check in (and complete the receiving checklist) before charting.
  if (isNurse && !checkedIn) {
    return (
      <div style={{ maxWidth: 460, margin: '60px auto', padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="shield" size={30} style={{ color: 'var(--accent-ink)' }} />
        </div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>Check in to this patient</h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>
          Check in to {patient.name} to receive and chart.
          {currentNurse ? ` ${currentNurse.user?.name || 'The previous-shift nurse'} will be checked out.` : ' This patient is currently unassigned.'}
        </p>
        <button type="button" className="icu-btn icu-btn-primary" style={{ width: '100%' }} disabled={checkInBusy} onClick={doCheckIn}>
          <Icon name="check" size={14} /> {currentNurse ? 'Check in · check out previous nurse' : 'Check in to patient'}
        </button>
        <a href="#/dashboard" className="icu-btn icu-btn-outline" style={{ width: '100%', textDecoration: 'none' }}>Back to dashboard</a>
      </div>
    );
  }

  if (needsChecklist) {
    const allDone = checklistChecks.size >= RECEIVING_ITEMS.length;
    return (
      <div style={{ maxWidth: 560, margin: '30px auto', padding: 20 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>Patient Receiving Checklist</h2>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--ink-3)' }}>
          Complete this checklist while receiving <b style={{ color: 'var(--ink)' }}>{patient.name}</b> from the previous nurse.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {RECEIVING_ITEMS.map((item, i) => {
            const on = checklistChecks.has(i);
            return (
              <button key={i} type="button" className="icu-row"
                onClick={() => setChecklistChecks((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                style={{ width: '100%', padding: 12, gap: 12, cursor: 'pointer', background: 'var(--surface)', textAlign: 'left', fontFamily: 'inherit', fontSize: 13, color: 'var(--ink-2)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${on ? 'var(--accent)' : 'var(--line-2)'}`, background: on ? 'var(--accent)' : 'var(--surface)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-fg)', flexShrink: 0 }}>
                  {on && <Icon name="check" size={14} stroke={3} />}
                </span>
                <span style={{ flex: 1 }}>{item}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="icu-btn icu-btn-success" style={{ width: '100%', marginTop: 16 }} disabled={!allDone} onClick={completeReceiving}>
          <Icon name="check" size={14} /> {allDone ? 'Complete handover' : `Complete handover (${checklistChecks.size} / ${RECEIVING_ITEMS.length})`}
        </button>
      </div>
    );
  }

  const tabs: TabItem[] = [
    { value: 'overview', label: t('tab.overview') },
    ...(user?.role !== 'NURSE' ? [{ value: 'rounds', label: t('tab.rounds') }] : []),
    { value: 'vitals', label: t('tab.vitals') },
    { value: 'events', label: t('tab.events') },
    { value: 'mar', label: t('tab.mar') },
    { value: 'nursing', label: t('tab.nursing') },
    { value: 'ventilator', label: t('tab.ventilator') },
    { value: 'orders', label: t('tab.orders') },
    { value: 'io', label: t('tab.io') },
    ...(user?.role !== 'NURSE' ? [
      { value: 'investigations', label: t('tab.labs') },
      { value: 'radiology', label: t('tab.radiology') },
      { value: 'cardiology', label: t('tab.cardiology') },
    ] : []),
    { value: 'interventions', label: t('tab.interventions'), dot: dueReminders.length > 0 },
    ...(user?.role !== 'NURSE' ? [
      { value: 'consultation', label: t('tab.consultation') },
    ] : []),
    { value: 'notes', label: t('tab.notes') },
    { value: 'history', label: t('tab.history') },
    ...(user?.role !== 'NURSE' ? [
      { value: 'handover', label: t('tab.handover') },
    ] : []),
  ];

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <PatientHeader patient={patient} onUpdate={fetchPatient} />

      {/* Tab bar */}
      <div
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--line)',
          padding: '6px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 15,
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Tabs value={activeTab} onChange={setActiveTab} items={tabs} />
        </div>
      </div>

      {/* Due reminder banner (under tabs) */}
      {dueReminders.length > 0 && dueReminders.map((order) => (
        <div
          key={order.id}
          style={{
            background: 'var(--st-warn-bg)',
            color: 'var(--st-warn-fg)',
            borderBottom: '1px solid color-mix(in oklab, var(--sig-temp) 50%, var(--line))',
            padding: '10px 16px',
          }}
        >
          <div
            style={{
              maxWidth: 1400, margin: '0 auto',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <Icon name="bell_ring" size={18} className="icu-pulse-soft" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(order.details as any)?.notificationText || order.title}
              </div>
              <div style={{ fontSize: 11 }}>
                Due {new Date((order as any).reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConfirmOrder(order)}
              className="icu-btn icu-btn-xs"
              style={{ background: 'white', color: 'var(--st-warn-fg)' }}
            >
              <Icon name="check" size={12} /> Complete
            </button>
            <button
              type="button"
              onClick={() => handleDismiss(order.id)}
              className="icu-btn icu-btn-icon-sm icu-btn-ghost"
              style={{ color: 'var(--st-warn-fg)' }}
              aria-label="Dismiss"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        </div>
      ))}

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px 40px' }}>
        {activeTab === 'overview' && (
          <OverviewTab patientId={patient.id} patient={patient} onLoadHistory={() => setActiveTab('history')} />
        )}
        {activeTab === 'rounds' && <RoundsTab patientId={patient.id} patient={patient} />}
        {activeTab === 'vitals' && <VitalsTab patientId={patient.id} />}
        {activeTab === 'mar' && <MARTab patientId={patient.id} />}
        {activeTab === 'orders' && <OrdersTab patientId={patient.id} />}
        {activeTab === 'io' && <IOTab patientId={patient.id} />}
        {activeTab === 'investigations' && <InvestigationsTab patientId={patient.id} defaultTab="labs" />}
        {activeTab === 'radiology' && <InvestigationsTab patientId={patient.id} defaultTab="imaging" />}
        {activeTab === 'cardiology' && <InvestigationsTab patientId={patient.id} defaultTab="cardiology" />}
        {activeTab === 'interventions' && (
          <InterventionsTab patientId={patient.id} diagnosis={patient.diagnosis || undefined} />
        )}
        {activeTab === 'nursing' && <NursingTab patientId={patient.id} />}
        {activeTab === 'ventilator' && <VentilatorTab patientId={patient.id} />}
        {activeTab === 'consultation' && <ConsultationTab patientId={patient.id} />}
        {activeTab === 'events' && <EventsTab patientId={patient.id} />}
        {activeTab === 'notes' && <NotesTab patientId={patient.id} />}
        {activeTab === 'handover' && <HandoverTab patient={patient} />}
        {activeTab === 'history' && <HistoryTab patientId={patient.id} />}
      </main>

      {/* Confirm dialog */}
      <Sheet
        open={!!confirmOrder}
        onClose={() => setConfirmOrder(null)}
        title="Complete check"
        footer={
          <>
            <button type="button" onClick={() => setConfirmOrder(null)} className="icu-btn icu-btn-outline">Cancel</button>
            <button
              type="button"
              onClick={() => confirmOrder && handleCompleteCheck(confirmOrder.id)}
              className="icu-btn icu-btn-success"
            >
              <Icon name="check" size={14} /> Yes, complete
            </button>
          </>
        }
      >
        {confirmOrder && (
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
            Mark <b style={{ color: 'var(--ink)' }}>
              {(confirmOrder.details as any)?.notificationText || confirmOrder.title}
            </b> as checked and dismiss this reminder?
          </p>
        )}
      </Sheet>
    </div>
  );
}
