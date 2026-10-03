import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { Patient } from '../../types';
import { calculateAge } from '../../lib/utils';
import { checkinApi } from '../../api/checkinApi';
import { assignmentApi } from '../../api/assignmentApi';
import { apiClient } from '../../api/client';
import {
  Icon, Pill, Sheet, Avatar, initialsFromName, colorFromId,
} from '../../components/icu';
import { useLang } from '../../i18n';

interface Props {
  patient: Patient;
  onUpdate?: () => void;
}

export default function PatientHeader({ patient }: Props) {
  const { user } = useAuthStore();
  const { t } = useLang();
  const { activeShift } = useShiftStore();
  const navigate = useNavigate();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeBusy, setDischargeBusy] = useState(false);
  const [airwaySafe, setAirwaySafe] = useState(true);
  const [breathingOk, setBreathingOk] = useState(true);
  const [circulationOk, setCirculationOk] = useState(true);
  const [notes, setNotes] = useState('');

  const code = (patient as any).codeStatus || 'Full Code';
  const bed = (patient as any).bed || 'ICU-?';
  const critical = !!(patient as any).critical;
  const ventilated = !!(patient as any).ventilated;
  const admittedAt = (patient as any).admittedAt || (patient as any).createdAt;
  const dayN = admittedAt ? Math.max(1, Math.floor((Date.now() - new Date(admittedAt).getTime()) / (24 * 60 * 60_000)) + 1) : 1;

  const handleCheckIn = async () => {
    if (!user) return;
    try {
      await checkinApi.create({
        patientId: patient.id,
        userId: user.id,
        shiftId: activeShift?.id,
        airwaySafe,
        breathingOk,
        circulationOk,
        notes,
      });
      toast.success('Check-in recorded');
      setCheckinOpen(false);
      setNotes('');
    } catch {
      toast.error('Failed to record check-in');
    }
  };

  const handleSignOut = async () => {
    if (!user || user.role !== 'NURSE') return;
    try {
      await assignmentApi.unassign(patient.id, user.id);
      toast.success('Signed out of patient');
      navigate('/');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handleDischarge = async () => {
    setDischargeBusy(true);
    try {
      await apiClient.patch(`/patients/${patient.id}/discharge`, {});
      toast.success('Patient discharged');
      setDischargeOpen(false);
      navigate('/dashboard');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to discharge');
    } finally {
      setDischargeBusy(false);
    }
  };

  const initials = initialsFromName(patient.name);
  const color = colorFromId(patient.id);

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--line)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        boxShadow: 'var(--shadow-sm)',
      }}
      className="print:hidden"
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '12px 16px 0' }}>
        {/* Top row: identity + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Avatar initials={initials} color={color} size="md" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--ink)' }}>{patient.name}</h1>
              <Pill tone="muted">{calculateAge(patient.dob)} / {(patient.gender || '?').charAt(0).toUpperCase()}</Pill>
              <Pill tone={code === 'DNR' ? 'warn' : 'crit'}>
                <Icon name="shield" size={10} /> {code === 'DNR' ? t('hdr.dnr') : t('hdr.fullCode')}
              </Pill>
              <Pill tone={critical ? 'crit' : 'ok'}>
                <span className="icu-dot icu-blip" style={{ background: critical ? 'var(--sig-hr)' : 'var(--st-ok-line)' }} />
                {critical ? t('hdr.critical') : t('hdr.stable')}
              </Pill>
              {ventilated && <Pill tone="info"><Icon name="wind" size={10} /> {t('hdr.vented')}</Pill>}
            </div>
            <div className="icu-mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{t('hdr.mrn')}: {patient.mrn}</span>
              <span>·</span>
              <span>{bed}</span>
              <span>·</span>
              <span>{t('hdr.day')} {dayN}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setDischargeOpen(true)}
              className="icu-btn icu-btn-outline icu-btn-sm"
              title="Quick discharge — moves patient to Archived"
            >
              <Icon name="logout" size={14} /> <span className="hidden sm:inline">{t('hdr.discharge')}</span>
            </button>
            <button
              type="button"
              onClick={() => window.open(`#/discharge/${patient.id}`, '_blank')}
              className="icu-btn icu-btn-ghost icu-btn-sm"
              title="Full discharge summary form"
            >
              <Icon name="fileText" size={14} /> <span className="hidden lg:inline">{t('hdr.summary')}</span>
            </button>
            <button
              type="button"
              onClick={() => setCheckinOpen(true)}
              className="icu-btn icu-btn-success icu-btn-sm"
            >
              <Icon name="stetho" size={14} /> {t('hdr.checkIn')}
            </button>
            {user?.role === 'NURSE' && (
              <button
                type="button"
                onClick={handleSignOut}
                className="icu-btn icu-btn-danger icu-btn-sm"
              >
                <Icon name="logout" size={14} /> <span className="hidden sm:inline">{t('hdr.leave')}</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ height: 12 }} />
      </div>

      <Sheet
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        title="Bedside check-in"
        footer={
          <>
            <button type="button" onClick={() => setCheckinOpen(false)} className="icu-btn icu-btn-outline">Cancel</button>
            <button type="button" onClick={handleCheckIn} className="icu-btn icu-btn-success">
              <Icon name="check" size={14} /> Confirm
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: 0 }}>Quick ABC bedside assessment.</p>
          <CheckRow checked={airwaySafe} setChecked={setAirwaySafe} label="Airway safe / patent" />
          <CheckRow checked={breathingOk} setChecked={setBreathingOk} label="Breathing / Vent OK" />
          <CheckRow checked={circulationOk} setChecked={setCirculationOk} label="Circulation / Hemodynamics" />
          <div>
            <label className="icu-fld">Quick note</label>
            <textarea
              className="icu-textarea"
              rows={3}
              placeholder="Optional note…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </div>
      </Sheet>

      <Sheet
        open={dischargeOpen}
        onClose={() => !dischargeBusy && setDischargeOpen(false)}
        title="Discharge patient"
        footer={
          <>
            <button
              type="button"
              onClick={() => setDischargeOpen(false)}
              disabled={dischargeBusy}
              className="icu-btn icu-btn-outline"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDischarge}
              disabled={dischargeBusy}
              className="icu-btn icu-btn-danger"
            >
              <Icon name="logout" size={14} /> {dischargeBusy ? 'Discharging…' : 'Discharge'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-2)' }}>
            Discharge <b style={{ color: 'var(--ink)' }}>{patient.name}</b> (MRN {patient.mrn})?
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)' }}>
            The patient will move to the <b>Archived</b> tab on the Dashboard. Their chart stays accessible from there.
            Use <b>Summary</b> instead if you want to write a full discharge note first.
          </p>
        </div>
      </Sheet>
    </div>
  );
}

function CheckRow({ checked, setChecked, label }: { checked: boolean; setChecked: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => setChecked(!checked)}
      className="icu-row"
      style={{
        padding: 12,
        gap: 10,
        cursor: 'pointer',
        background: 'var(--surface)',
        textAlign: 'left',
        fontFamily: 'inherit',
        fontSize: 13,
        color: 'var(--ink-2)',
      }}
    >
      <span
        style={{
          width: 22, height: 22, borderRadius: 6,
          border: `2px solid ${checked ? 'var(--accent)' : 'var(--line-2)'}`,
          background: checked ? 'var(--accent)' : 'var(--surface)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent-fg)',
          flexShrink: 0,
        }}
      >
        {checked && <Icon name="check" size={14} stroke={3} />}
      </span>
      {label}
    </button>
  );
}
