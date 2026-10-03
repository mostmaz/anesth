// Pure converters: real backend shapes → design shapes used by mock UI.

import type {
  RealPatient, RealVital, RealMedication, RealAdministration, RealOrder,
  RealIOEntry, RealInvestigation, RealNote, RealSkinAssessment, RealUser,
  RealVentilator, RealConsultation, RealHandoverNote,
} from './endpoints';
import type {
  Patient, VitalRecord, Medication, MedHistory, OrderItem,
  IOEntry, Investigation, ClinicalNote, SkinAssessment, MockUser, Role, LiveReading,
  Ventilator, Consultation, HandoverNote, EventItem,
} from '../data/mockICU';

const PALETTE = ['#0ea5e9', '#a855f7', '#ef4444', '#16a34a', '#f59e0b', '#06b6d4', '#db2777', '#7c3aed', '#0d9488'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function initialsFromName(name: string): string {
  const parts = (name || '?').trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase() || '?';
}

export function colorFromId(id: string): string {
  return PALETTE[hashString(id) % PALETTE.length];
}

export function ageFromDob(dob: string | Date | null | undefined): number {
  if (!dob) return 0;
  const d = typeof dob === 'string' ? new Date(dob) : dob;
  if (isNaN(d.getTime())) return 0;
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60_000)));
}

// ── User ─────────────────────────────────────────────────
export function realUserToDesign(u: RealUser): MockUser {
  return {
    id: u.id,
    name: u.name,
    role: u.role as Role,
    initials: initialsFromName(u.name),
    color: colorFromId(u.id),
  };
}

// ── Patient ──────────────────────────────────────────────
export function realPatientToDesign(p: RealPatient): Patient {
  // Pick the most recent admission (server returns them unsorted; sort by admittedAt desc)
  const sortedAdms = [...(p.admissions || [])].sort(
    (a, b) => new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime(),
  );
  const latestAdm = sortedAdms[0];
  const admittedAt = latestAdm?.admittedAt ? new Date(latestAdm.admittedAt) : new Date(p.createdAt);
  const bed = latestAdm?.bed || 'ICU-?';
  const genderCode = (p.gender || '').slice(0, 1).toUpperCase() || '?';

  // Discharged if no admissions OR every admission has dischargedAt set
  const hasActiveAdmission = sortedAdms.some(a => !a.dischargedAt);
  const dischargedAt = !hasActiveAdmission && latestAdm?.dischargedAt
    ? new Date(latestAdm.dischargedAt)
    : undefined;

  return {
    id: p.id,
    name: p.name,
    mrn: p.mrn,
    age: ageFromDob(p.dob),
    gender: genderCode,
    bed,
    code: 'Full Code',
    critical: false,
    initials: initialsFromName(p.name),
    color: colorFromId(p.id),
    diagnosis: p.diagnosis || latestAdm?.diagnosis || '',
    comorbidities: p.comorbidities || [],
    doctor: '',
    specialty: '',
    admittedAt,
    dischargedAt,
    assignedNurseId: null,
    ventilated: false,
    vitals: [],
    medications: [],
    io: [],
    investigations: [],
    orders: [],
    skinAssessments: [],
    ventilator: [],
    notes: [],
    interventions: [],
    consultations: [],
    handovers: [],
    events: [],
    fluidBalance: { in12h: 0, out12h: 0 },
  };
}

// ── Events (stored as EVENT-type clinical notes) ────────
export function realEventToDesign(n: RealNote): EventItem {
  const sev = (n.data && n.data.severity) || 'warning';
  return {
    id: n.id,
    category: n.title || 'Event',
    severity: (sev === 'critical' || sev === 'info' || sev === 'warning') ? sev : 'warning',
    description: n.content || '',
    by: n.author?.name || '?',
    role: (n.author?.role as Role) || 'NURSE',
    t: new Date(n.createdAt),
  };
}

// ── Vitals ──────────────────────────────────────────────
export function realVitalToDesign(v: RealVital): VitalRecord {
  return {
    id: v.id,
    t: new Date(v.timestamp),
    hr: v.heartRate ?? 0,
    sys: v.bpSys ?? 0,
    dia: v.bpDia ?? 0,
    spo: v.spo2 ?? 0,
    temp: v.temp ?? 0,
    rr: v.rr ?? 0,
    rbs: v.rbs ?? 0,
  };
}

export function vitalsToLiveReading(vitals: VitalRecord[]): LiveReading {
  // Vitals arrive oldest→newest. For each metric surface the most recent *actual*
  // reading, skipping rows where it wasn't recorded (stored as 0) — e.g. an
  // infusion-rate-only entry leaves the core vitals empty. Without this, a recent
  // blank row would blank out the live tiles even though real readings exist.
  const latest = (key: 'hr' | 'sys' | 'dia' | 'spo' | 'temp' | 'rr' | 'rbs'): number => {
    for (let i = vitals.length - 1; i >= 0; i--) {
      const v = vitals[i][key];
      if (typeof v === 'number' && Number.isFinite(v) && v !== 0) return v;
    }
    return 0;
  };
  return {
    hr: latest('hr'), sys: latest('sys'), dia: latest('dia'),
    spo: latest('spo'), temp: latest('temp'), rr: latest('rr'), rbs: latest('rbs'),
    t: new Date(),
  };
}

// ── Medications ─────────────────────────────────────────
export function realMedToDesign(m: RealMedication): Medication {
  const startedAt = new Date(m.startedAt);
  const days = Math.max(1, Math.floor((Date.now() - startedAt.getTime()) / (24 * 60 * 60_000)));
  // server's `durationReminder` is in days based on schema convention
  const duration = Math.max(1, m.durationReminder ?? 7);
  const dilutionStr = m.dilution != null ? String(m.dilution) : '—';
  return {
    id: m.id,
    name: m.name,
    route: m.route,
    freq: m.frequency,
    dose: m.defaultDose,
    dilution: dilutionStr,
    rate: m.infusionRate || '—',
    startedAt,
    days,
    duration,
    active: m.isActive,
    history: (m.administrations || [])
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(realAdminToHistory),
  };
}

export function realAdminToHistory(a: RealAdministration): MedHistory {
  return {
    id: a.id,
    t: new Date(a.timestamp),
    status: a.status,
    by: a.user?.name || '?',
    dose: a.dose || '',
  };
}

// ── Orders ──────────────────────────────────────────────
export function realOrderToDesign(o: RealOrder): OrderItem {
  const pri = (o.priority || 'ROUTINE').toUpperCase();
  const priority = pri === 'STAT' ? 'STAT' : pri === 'URGENT' ? 'Urgent' : 'Routine';
  return {
    id: o.id,
    type: o.type,
    title: o.title,
    by: o.author?.name || '?',
    role: (o.author?.role as Role) || 'NURSE',
    priority,
    status: o.status,
    t: new Date(o.createdAt),
    notes: o.notes || '',
    repetition: o.details?.repetition,
  };
}

// ── I/O ─────────────────────────────────────────────────
export function realIOToDesign(e: RealIOEntry): IOEntry {
  return {
    id: e.id,
    t: new Date(e.timestamp),
    type: e.type === 'INPUT' ? 'IN' : 'OUT',
    cat: e.category,
    amount: e.amount,
    notes: e.notes || '',
  };
}

export function computeFluidBalance(entries: IOEntry[]): { in12h: number; out12h: number } {
  const cutoff = Date.now() - 12 * 60 * 60_000;
  const recent = entries.filter(e => e.t.getTime() > cutoff);
  return {
    in12h: recent.filter(e => e.type === 'IN').reduce((a, b) => a + b.amount, 0),
    out12h: recent.filter(e => e.type === 'OUT').reduce((a, b) => a + b.amount, 0),
  };
}

// ── Investigations ──────────────────────────────────────
function formatVal(v: any): string {
  if (v == null) return '—';
  if (typeof v === 'object') {
    if ('value' in v) {
      const unit = v.unit ? ` ${v.unit}` : '';
      return `${v.value}${unit}`;
    }
    return JSON.stringify(v);
  }
  return String(v);
}

function isAbnormalVal(v: any): boolean {
  if (v && typeof v === 'object' && 'isAbnormal' in v) return Boolean(v.isAbnormal);
  return false;
}

export function realInvestigationToDesign(i: RealInvestigation): Investigation {
  const params: Array<[string, string, boolean]> = [];
  const results = i.result; // singular on real backend
  if (results && typeof results === 'object') {
    Object.entries(results).forEach(([k, v]) => {
      // skip imageUrl key that sometimes appears inside result
      if (k === 'imageUrl') return;
      params.push([k, formatVal(v), isAbnormalVal(v)]);
    });
  }
  const abnormal = params.some(p => p[2]);
  // Attachment can live either on the row (imageUrl/pdfFilename) or inside result.imageUrl.
  // Portal-synced lab reports come as a pdfFilename stored WITHOUT the extension; the file on
  // disk is `<pdfFilename>.pdf`, so append `.pdf` (matching the webapp) so it opens as a PDF —
  // not as a broken image. Camera / image-selector uploads keep their real extension (.jpg/.png)
  // in imageUrl and open as images.
  const resultImg = results && typeof results === 'object' ? (results as any).imageUrl : undefined;
  const pdfUrl = i.pdfFilename
    ? `/uploads/${i.pdfFilename}${i.pdfFilename.toLowerCase().endsWith('.pdf') ? '' : '.pdf'}`
    : undefined;
  const imageUrl = i.imageUrl || resultImg || pdfUrl;
  return {
    id: i.id,
    title: i.title,
    type: i.category || i.type || 'Lab',
    t: new Date(i.conductedAt || i.createdAt),
    abnormal,
    params,
    impression: i.impression || '',
    imageUrl: imageUrl || undefined,
  };
}

// ── Notes ───────────────────────────────────────────────
export function realNoteToDesign(n: RealNote): ClinicalNote {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    by: n.author?.name || '?',
    role: (n.author?.role as Role) || 'NURSE',
    t: new Date(n.createdAt),
    content: n.content || '',
  };
}

// ── Ventilator ──────────────────────────────────────────
export function realVentilatorToDesign(v: RealVentilator): Ventilator {
  return {
    id: v.id,
    t: new Date(v.timestamp),
    mode: v.mode,
    rate: v.rate ?? 0,
    fio2: v.fio2 ?? 0,
    peep: 0, // server model has no PEEP column
    vt: v.vt ?? 0,
    ps: v.ps ?? 0,
    ie: v.ie || '',
  };
}

// ── Consultations ───────────────────────────────────────
export function realConsultationToDesign(c: RealConsultation): Consultation {
  return {
    id: c.id,
    doctorName: c.doctorName,
    specialty: c.specialty,
    notes: c.notes || '',
    imageUrl: c.imageUrl || undefined,
    t: new Date(c.timestamp),
  };
}

// ── Handover / specialist notes ─────────────────────────
export function realHandoverToDesign(h: RealHandoverNote): HandoverNote {
  return {
    id: h.id,
    by: h.author?.name || '?',
    role: (h.author?.role as Role) || 'RESIDENT',
    t: new Date(h.date || h.createdAt),
    data: h,
  };
}

// ── Skin assessments ────────────────────────────────────
export function realSkinToDesign(s: RealSkinAssessment): SkinAssessment {
  return {
    id: s.id,
    part: s.bodyPart,
    side: s.view,
    type: s.type === 'LESION' ? 'Lesion' : 'Dressing',
    t: new Date(s.recordedAt),
    by: s.author?.name || '?',
    notes: s.notes || '',
    imageUrl: s.imageUrl || undefined,
  };
}
