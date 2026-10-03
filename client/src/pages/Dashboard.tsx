import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useLang } from '../i18n';
import { useShiftStore } from '../stores/shiftStore';
import { Patient } from '../types';
import { ordersApi, ClinicalOrder } from '../api/ordersApi';
import { assignmentApi, Assignment } from '../api/assignmentApi';
import {
  Card, CardHead, Pill, StatusBadge, SectionTitle, Icon,
  Avatar, initialsFromName, colorFromId, Sheet, Sparkline,
} from '../components/icu';
import AddPatientForm from '../features/patient/AddPatientForm';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLang();
  const { activeShift, startShift, endShift } = useShiftStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);
  const [activeOrders, setActiveOrders] = useState<ClinicalOrder[]>([]);
  const [dueReminders, setDueReminders] = useState<ClinicalOrder[]>([]);
  const [confirmCheck, setConfirmCheck] = useState<ClinicalOrder | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showStartShift, setShowStartShift] = useState(false);
  const [patientTab, setPatientTab] = useState<'active' | 'archived'>('active');
  const reminderPoll = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = async () => {
    try {
      // Always fetch ALL active patients — nurses need to see who's available
      // to sign in to (filtering by userId returns only patients already assigned
      // to them, hiding everyone else).
      const [pts, active, pending] = await Promise.all([
        apiClient.get<Patient[]>('/patients'),
        ordersApi.getActiveOrders().catch(() => []),
        assignmentApi.getPending().catch(() => []),
      ]);
      setPatients(pts || []);
      setActiveOrders((active || []).filter((o: any) => o.type !== 'PROCEDURE'));
      setPendingAssignments(pending);
      const aa = await assignmentApi.getActive().catch(() => []);
      setAssignments(aa);
    } catch (e) {
      console.error('Dashboard fetch failed', e);
    }
  };

  const fetchReminders = async () => {
    try {
      const r = await ordersApi.getDueReminders();
      setDueReminders(r || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchAll();
    fetchReminders();
    reminderPoll.current = setInterval(fetchReminders, 60_000);
    return () => { if (reminderPoll.current) clearInterval(reminderPoll.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Nurse without active shift → prompt
  useEffect(() => {
    if (user?.role === 'NURSE' && !activeShift) setShowStartShift(true);
  }, [user, activeShift]);

  // The receiving checklist now lives in the patient check-in flow (PatientDetails),
  // shown right after a nurse checks in — not on the dashboard.

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('dash.greeting.morning');
    if (h < 18) return t('dash.greeting.afternoon');
    return t('dash.greeting.evening');
  })();
  const firstName = user?.name?.replace('Dr. ', '').split(' ')[0] || '';

  const completeCheck = async (o: ClinicalOrder) => {
    try {
      await ordersApi.updateStatus(o.id, 'COMPLETED', user!.id);
      toast.success('Intervention check completed');
      setConfirmCheck(null);
      fetchReminders();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to complete');
    }
  };

  const approveOrder = async (o: ClinicalOrder) => {
    try {
      await ordersApi.updateStatus(o.id, 'APPROVED', user!.id);
      toast.success('Order approved');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };
  const completeOrder = async (o: ClinicalOrder) => {
    try {
      await ordersApi.updateStatus(o.id, 'COMPLETED', user!.id);
      toast.success('Order completed');
      fetchAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  // A patient is "active" if they have at least one admission with no dischargedAt.
  // The server returns admissions[] on the patient object.
  const isActive = (p: any) => {
    const adms = (p?.admissions || []) as Array<{ dischargedAt?: string | null }>;
    if (adms.length === 0) return true; // no admission record yet → treat as active
    return adms.some(a => !a.dischargedAt);
  };
  const activePatients = patients.filter(isActive);
  const archivedPatients = patients.filter(p => !isActive(p));
  const shown = patientTab === 'active' ? activePatients : archivedPatients;

  const myAssignments = new Set(assignments.filter((a: any) => a.userId === user?.id).map((a: any) => a.patientId));

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      {/* Greeting / shift strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: 12, margin: '4px 0 0', color: 'var(--ink-3)' }}>
            {t('dash.commandCenter')} · <span style={{ color: 'var(--accent-ink)', fontWeight: 600 }}>{user?.role}</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {activeShift ? (
            <Pill tone="ok">
              <span className="icu-dot icu-pulse-soft" style={{ background: 'var(--st-ok-line)' }} />
              SHIFT {activeShift.type} · {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Pill>
          ) : (
            <Pill tone="muted">{t('dash.noActiveShift')}</Pill>
          )}
          {(user?.role === 'SENIOR' || user?.role === 'RESIDENT') && activeShift && (
            <button type="button" onClick={() => endShift().then(fetchAll)} className="icu-btn icu-btn-outline icu-btn-xs">
              {t('dash.endShift')}
            </button>
          )}
        </div>
      </div>

      {/* Upcoming orders for the nurse's checked-in patient(s) */}
      {user?.role === 'NURSE' && (() => {
        const upcoming = (activeOrders as any[]).filter(o =>
          myAssignments.has(o.patientId) && o.status !== 'COMPLETED' && o.status !== 'DISCONTINUED');
        if (upcoming.length === 0) return null;
        return (
          <Card style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon name="clipboard" size={18} style={{ color: 'var(--accent-ink)' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-ink)' }}>
                {upcoming.length} upcoming order{upcoming.length === 1 ? '' : 's'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming.slice(0, 8).map(o => {
                const p = patients.find(pp => pp.id === o.patientId);
                return (
                  <button key={o.id} type="button" onClick={() => navigate(`/patients/${o.patientId}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <span className="icu-pill icu-pill-accent" style={{ fontSize: 10 }}>{o.type}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</div>
                      {p && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{p.name}</div>}
                    </div>
                    <span className="icu-pill icu-pill-muted" style={{ fontSize: 10 }}>{o.status}</span>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })()}

      {/* Intervention reminders banner — residents/seniors only */}
      {user?.role !== 'NURSE' && dueReminders.length > 0 && (
        <Card style={{ background: 'var(--st-warn-bg)', borderColor: 'var(--st-warn-line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div
              className="icu-pulse-glow"
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'var(--st-warn-line)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Icon name="bell_ring" size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--st-warn-fg)' }}>{dueReminders.length} due now</div>
              <div style={{ fontSize: 12, color: 'var(--st-warn-fg)', opacity: 0.8 }}>
                Intervention checks need your attention.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dueReminders.slice(0, 4).map((d: any) => (
              <div
                key={d.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: 10,
                  padding: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(d.details as any)?.notificationText || d.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    {(d as any).patient?.name || 'Patient'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmCheck(d)}
                  className="icu-btn icu-btn-success icu-btn-xs"
                >
                  <Icon name="check" size={12} /> Complete
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Patients */}
      <div>
        <SectionTitle
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="icu-tab-rail" style={{ padding: 3 }}>
                <button
                  type="button"
                  className={`icu-tab ${patientTab === 'active' ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setPatientTab('active')}
                >
                  {t('dash.active')} · {activePatients.length}
                </button>
                <button
                  type="button"
                  className={`icu-tab ${patientTab === 'archived' ? 'active' : ''}`}
                  style={{ padding: '5px 10px', fontSize: 12 }}
                  onClick={() => setPatientTab('archived')}
                >
                  {t('dash.archived')} · {archivedPatients.length}
                </button>
              </div>
              {user?.role !== 'NURSE' && (
                <button type="button" onClick={() => setShowAdd(true)} className="icu-btn icu-btn-primary icu-btn-xs">
                  <Icon name="plus" size={14} /> {t('dash.admit')}
                </button>
              )}
            </div>
          }
        >
          Patients
        </SectionTitle>
        {shown.length === 0 ? (
          <Card>
            <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '16px 0', margin: 0 }}>
              No {patientTab} patients.
            </p>
          </Card>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: 12,
            }}
          >
            {shown.map((p) => (
              <PatientCard
                key={p.id}
                patient={p}
                userId={user?.id}
                userRole={user?.role}
                isMine={myAssignments.has(p.id)}
                onClick={() => navigate(`/patients/${p.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clinical orders + staff strip (non-NURSE) */}
      {user?.role !== 'NURSE' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {activeOrders.length > 0 && (
            <Card>
              <CardHead title="Active orders" subtitle={`${activeOrders.length} open`} icon="clipboard" iconTone="info" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activeOrders.slice(0, 6).map((o: any) => (
                  <div
                    key={o.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: 10,
                      border: '1px solid var(--line)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/patients/${o.patientId}`)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 2 }}>
                        <StatusBadge status={o.status} />
                        {o.priority === 'STAT' && <Pill tone="crit">STAT</Pill>}
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.type}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{o.patient?.name || 'Patient'}</div>
                    </div>
                    {o.status === 'PENDING' && user?.role === 'SENIOR' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); approveOrder(o); }} className="icu-btn icu-btn-success icu-btn-xs">
                        <Icon name="check" size={12} />
                      </button>
                    )}
                    {o.status === 'APPROVED' && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); completeOrder(o); }} className="icu-btn icu-btn-outline icu-btn-xs">
                        Complete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {pendingAssignments.length > 0 && (
            <Card>
              <CardHead title="Pending assignments" subtitle={`${pendingAssignments.length} request${pendingAssignments.length === 1 ? '' : 's'}`} icon="user" iconTone="warn" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingAssignments.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, border: '1px solid var(--line)', borderRadius: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--ink)' }}>
                        <b>{a.user?.name || 'Nurse'}</b> → {a.patient?.name || 'Patient'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>MRN {a.patient?.mrn || '—'}</div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await assignmentApi.approve(a.id);
                          toast.success('Assignment approved');
                          fetchAll();
                        } catch (e: any) { toast.error(e?.message || 'Failed'); }
                      }}
                      className="icu-btn icu-btn-success icu-btn-xs"
                    >
                      <Icon name="check" size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await assignmentApi.reject(a.id);
                          toast.info('Rejected');
                          fetchAll();
                        } catch (e: any) { toast.error(e?.message || 'Failed'); }
                      }}
                      className="icu-btn icu-btn-ghost icu-btn-xs"
                      style={{ color: 'var(--sig-hr)' }}
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Add Patient sheet */}
      <Sheet open={showAdd} onClose={() => setShowAdd(false)} title={t('dash.admit')}>
        <AddPatientForm
          onSuccess={() => { setShowAdd(false); fetchAll(); }}
          onCancel={() => setShowAdd(false)}
        />
      </Sheet>

      {/* Confirm intervention check */}
      <Sheet
        open={!!confirmCheck}
        onClose={() => setConfirmCheck(null)}
        title="Complete check"
        footer={
          <>
            <button type="button" onClick={() => setConfirmCheck(null)} className="icu-btn icu-btn-outline">Cancel</button>
            <button type="button" onClick={() => confirmCheck && completeCheck(confirmCheck)} className="icu-btn icu-btn-success">
              <Icon name="check" size={14} /> Yes, complete
            </button>
          </>
        }
      >
        {confirmCheck && (
          <p style={{ fontSize: 14, color: 'var(--ink-2)', margin: 0 }}>
            Mark <b style={{ color: 'var(--ink)' }}>{(confirmCheck as any).title}</b> as checked and dismiss this reminder?
          </p>
        )}
      </Sheet>

      {/* Nurse start-shift prompt */}
      <Sheet
        open={showStartShift && user?.role === 'NURSE'}
        onClose={() => setShowStartShift(false)}
        title="Start your shift"
        footer={
          <>
            <button type="button" onClick={() => setShowStartShift(false)} className="icu-btn icu-btn-outline">Later</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
            Select your shift to begin documenting care.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {([
              { type: 'DAY', label: 'Day Shift', sub: '08:00 – 20:00', emoji: '☀️', tint: '#f59e0b' },
              { type: 'NIGHT', label: 'Night Shift', sub: '20:00 – 08:00', emoji: '🌙', tint: '#6366f1' },
            ] as const).map((s) => (
              <button
                key={s.type}
                type="button"
                onClick={async () => {
                  if (!user) return;
                  try {
                    await startShift(user.id, s.type);
                    toast.success(`${s.label} started`);
                    setShowStartShift(false);
                  } catch (e: any) { toast.error(e?.message || 'Failed'); }
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, height: 104, padding: 12, cursor: 'pointer',
                  borderRadius: 14, border: '1px solid var(--line-2)', background: 'var(--surface)',
                  color: 'var(--ink)', fontFamily: 'inherit', transition: 'border-color .12s ease, background .12s ease',
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = s.tint; e.currentTarget.style.background = `color-mix(in oklab, var(--surface) 88%, ${s.tint})`; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--line-2)'; e.currentTarget.style.background = 'var(--surface)'; }}
              >
                <span style={{
                  width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, background: `color-mix(in oklab, var(--surface) 78%, ${s.tint})`,
                }}>{s.emoji}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{s.label}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </Sheet>

    </div>
  );
}

interface PatientCardProps {
  patient: Patient;
  userId?: string;
  userRole?: string;
  isMine: boolean;
  onClick: () => void;
}

function PatientCard({ patient, userRole, isMine, onClick }: PatientCardProps) {
  const [latest, setLatest] = useState<{ hr?: number; spo?: number; sys?: number; dia?: number; temp?: number } | null>(null);
  const [series, setSeries] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<any[]>(`/vitals/${patient.id}`)
      .then((vs) => {
        if (cancelled || !vs || vs.length === 0) return;
        const sorted = [...vs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const last = sorted[sorted.length - 1];
        setLatest({
          hr: last.heartRate,
          spo: last.spo2,
          sys: last.bpSys,
          dia: last.bpDia,
          temp: last.temp,
        });
        setSeries(sorted.slice(-12).map((v) => v.heartRate || 0).filter((x: number) => x > 0));
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, [patient.id]);

  const critical = (patient as any).critical ?? false;
  const ventilated = (patient as any).ventilated ?? false;
  const initials = initialsFromName(patient.name);
  const color = colorFromId(patient.id);
  const ageY = (() => {
    if (!patient.dob) return '?';
    const d = new Date(patient.dob);
    if (isNaN(d.getTime())) return '?';
    return Math.max(0, Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600_000))).toString();
  })();
  const genderCode = (patient.gender || '?').slice(0, 1).toUpperCase();

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${critical ? 'color-mix(in oklab, var(--sig-hr) 50%, var(--line))' : 'var(--line)'}`,
        borderRadius: 16,
        padding: 14,
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform .12s ease, box-shadow .12s ease',
      }}
      onMouseOver={(e) => { (e.currentTarget.style.boxShadow = 'var(--shadow-md)'); }}
      onMouseOut={(e) => { (e.currentTarget.style.boxShadow = 'var(--shadow-sm)'); }}
    >
      {critical && (
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--sig-hr)' }} />
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <Avatar initials={initials} color={color} size="lg" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{patient.name}</span>
            {critical ? (
              <Pill tone="crit"><span className="icu-dot icu-blip" style={{ background: 'var(--sig-hr)' }} />Critical</Pill>
            ) : (
              <Pill tone="ok">Stable</Pill>
            )}
            {ventilated && <Pill tone="info"><Icon name="wind" size={10} />Vented</Pill>}
            {isMine && userRole === 'NURSE' && <Pill tone="ok">Yours</Pill>}
          </div>
          <div className="icu-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 6 }}>
            {patient.mrn} · {ageY}{genderCode} {(patient as any).bed ? `· ${(patient as any).bed}` : ''}
          </div>
          {patient.diagnosis && (
            <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {patient.diagnosis}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto auto 1fr', gap: 12, alignItems: 'end' }}>
            <Vital label="HR" value={latest?.hr} cls="icu-sig-hr" />
            <Vital label="SpO₂" value={latest?.spo} unit="%" cls="icu-sig-spo" />
            <Vital
              label="BP"
              value={latest?.sys && latest?.dia ? `${latest.sys}/${latest.dia}` : undefined}
              cls="icu-sig-bp"
              small
            />
            <Vital label="T" value={latest?.temp} cls="icu-sig-temp" small />
            <div style={{ flex: 1, minWidth: 60 }}>
              {series.length >= 2 && <Sparkline values={series} color="var(--sig-hr)" height={28} />}
            </div>
          </div>
          {userRole !== 'NURSE' && (
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                tap to open chart
              </span>
              <Icon name="chevR" size={14} style={{ color: 'var(--ink-3)' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Vital({ label, value, unit, cls, small }: { label: string; value?: number | string; unit?: string; cls: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{label}</div>
      <div className={`icu-sig-val ${cls}`} style={{ fontSize: small ? 16 : 20 }}>
        {value ?? '—'}
        {unit && <span className="icu-sig-unit"> {unit}</span>}
      </div>
    </div>
  );
}
