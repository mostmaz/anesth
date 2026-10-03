// Port of design's data.js — mock ICU state with live vitals ticker.
// Now also supports a "live" mode that pulls from the real backend.

import { create } from 'zustand';
import * as api from '../api/endpoints';
import { setToken } from '../api/client';
import { unregisterFcm } from '../notifications/fcm';
import {
  realPatientToDesign, realUserToDesign, realVitalToDesign, realMedToDesign,
  realOrderToDesign, realIOToDesign, realInvestigationToDesign,
  realNoteToDesign, realSkinToDesign, realVentilatorToDesign,
  realConsultationToDesign, realHandoverToDesign, realEventToDesign,
  vitalsToLiveReading, computeFluidBalance,
} from '../api/mappers';

export type Role = 'SENIOR' | 'RESIDENT' | 'NURSE';

export interface MockUser {
  id: string;
  name: string;
  role: Role;
  initials: string;
  color: string;
}

export interface VitalRecord {
  id: string;
  t: Date;
  hr: number;
  sys: number;
  dia: number;
  spo: number;
  temp: number;
  rr: number;
  rbs: number;
}

export interface LiveReading {
  hr: number; sys: number; dia: number; spo: number; temp: number; rr: number; rbs: number; t: Date;
}

export interface MedHistory {
  id: string;
  t: Date;
  status: 'Given' | 'Missed' | 'Withheld';
  by: string;
  dose: string;
}

export interface Medication {
  id: string;
  name: string;
  route: string;
  freq: string;
  dose: string;
  dilution: string;
  rate: string;
  startedAt: Date;
  days: number;
  duration: number;
  active: boolean;
  history: MedHistory[];
}

export interface IOEntry {
  id: string;
  t: Date;
  type: 'IN' | 'OUT';
  cat: string;
  amount: number;
  notes: string;
}

export interface Investigation {
  id: string;
  title: string;
  type: string;
  t: Date;
  abnormal: boolean;
  params: Array<[string, string, boolean]>;
  impression: string;
  imageUrl?: string;   // attached image/PDF (server-relative path)
}

export interface OrderItem {
  id: string;
  type: string;
  title: string;
  by: string;
  role: Role;
  priority: 'Routine' | 'Urgent' | 'STAT';
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'DISCONTINUED';
  t: Date;
  notes: string;
  repetition?: string;
}

export interface Intervention {
  id: string;
  type: string;
  title: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED';
  t: Date;
  reminderAt: Date;
  notes: string;
}

export interface SkinAssessment {
  id: string;
  part: string;
  side: 'FRONT' | 'BACK';
  type: 'Lesion' | 'Dressing';
  t: Date;
  by: string;
  notes: string;
  imageUrl?: string;
}

export interface Ventilator {
  id: string;
  t: Date;
  mode: string;
  rate: number;
  fio2: number;
  peep: number;
  vt: number;
  ps: number;
  ie: string;
}

export interface ClinicalNote {
  id: string;
  type: string;
  title: string;
  by: string;
  role: Role;
  t: Date;
  content: string;
}

export interface Consultation {
  id: string;
  doctorName: string;
  specialty: string;
  notes: string;
  imageUrl?: string;
  t: Date;
}

export interface HandoverNote {
  id: string;
  by: string;
  role: Role;
  t: Date;
  data: Record<string, any>; // full structured specialist-note payload
}

export interface EventItem {
  id: string;
  category: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  by: string;
  role: Role;
  t: Date;
}

export interface Patient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  gender: string;
  bed: string;
  code: string;
  critical: boolean;
  initials: string;
  color: string;
  diagnosis: string;
  comorbidities: string[];
  doctor: string;
  specialty: string;
  admittedAt: Date;
  assignedNurseId: string | null;
  ventilated: boolean;
  vitals: VitalRecord[];
  medications: Medication[];
  io: IOEntry[];
  investigations: Investigation[];
  orders: OrderItem[];
  skinAssessments: SkinAssessment[];
  ventilator: Ventilator[];
  notes: ClinicalNote[];
  interventions: Intervention[];
  consultations: Consultation[];
  handovers: HandoverNote[];
  events: EventItem[];
  fluidBalance: { in12h: number; out12h: number };
  dischargedAt?: Date;
}

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

let _seed = 7;
function rand() {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
}

export const mockUsers: MockUser[] = [
  { id: 'u1', name: 'Dr. Sara Ahmed',  role: 'SENIOR',   initials: 'SA', color: '#7c3aed' },
  { id: 'u2', name: 'Dr. Omar Khalil', role: 'RESIDENT', initials: 'OK', color: '#2563eb' },
  { id: 'u3', name: 'Layla Nasser',    role: 'NURSE',    initials: 'LN', color: '#0d9488' },
  { id: 'u4', name: 'Marcus Bell',     role: 'NURSE',    initials: 'MB', color: '#16a34a' },
  { id: 'u5', name: 'Dr. Henrik Vogt', role: 'SENIOR',   initials: 'HV', color: '#db2777' },
];

function emptyPatient(p: Partial<Patient>): Patient {
  return {
    vitals: [], medications: [], io: [], investigations: [], orders: [],
    skinAssessments: [], ventilator: [], notes: [], interventions: [],
    consultations: [], handovers: [], events: [],
    fluidBalance: { in12h: 0, out12h: 0 },
    ...p,
  } as Patient;
}

function computeBalance(io: IOEntry[]): { in12h: number; out12h: number } {
  const cutoff = Date.now() - 12 * 60 * 60_000;
  const recent = io.filter(x => new Date(x.t).getTime() > cutoff);
  return {
    in12h: recent.filter(x => x.type === 'IN').reduce((a, b) => a + b.amount, 0),
    out12h: recent.filter(x => x.type === 'OUT').reduce((a, b) => a + b.amount, 0),
  };
}

function makePatients(): Patient[] {
  const p1 = emptyPatient({
    id: 'p1', name: 'Hashim Al-Rashid', mrn: 'ICU-1042-A', age: 64, gender: 'M',
    bed: 'ICU-1', code: 'Full Code', critical: true, initials: 'HR', color: '#0ea5e9',
    diagnosis: 'Septic shock secondary to community-acquired pneumonia',
    comorbidities: ['HTN', 'T2DM', 'IHD', 'CKD-3'],
    doctor: 'Dr. Sara Ahmed', specialty: 'Pulmonology',
    admittedAt: minutesAgo(60 * 38), assignedNurseId: 'u3', ventilated: true,
  });
  const p2 = emptyPatient({
    id: 'p2', name: 'Yathrib Najjar', mrn: 'ICU-1051-B', age: 71, gender: 'F',
    bed: 'ICU-2', code: 'DNR', critical: false, initials: 'YN', color: '#a855f7',
    diagnosis: 'Post-op CABG day 3',
    comorbidities: ['HTN', 'T2DM', 'Stroke 2019'],
    doctor: 'Dr. Henrik Vogt', specialty: 'Cardiothoracic',
    admittedAt: minutesAgo(60 * 96), assignedNurseId: 'u3', ventilated: false,
  });
  const p3 = emptyPatient({
    id: 'p3', name: 'Talal Ibrahim', mrn: 'ICU-1066-C', age: 42, gender: 'M',
    bed: 'ICU-3', code: 'Full Code', critical: true, initials: 'TI', color: '#ef4444',
    diagnosis: 'Multitrauma — MVA, intracranial hemorrhage',
    comorbidities: [],
    doctor: 'Dr. Sara Ahmed', specialty: 'Neurosurgery',
    admittedAt: minutesAgo(60 * 9), assignedNurseId: 'u4', ventilated: true,
  });
  const p4 = emptyPatient({
    id: 'p4', name: 'Mira Costa', mrn: 'ICU-1068-D', age: 28, gender: 'F',
    bed: 'ICU-4', code: 'Full Code', critical: false, initials: 'MC', color: '#16a34a',
    diagnosis: 'DKA, resolving', comorbidities: ['T1DM'],
    doctor: 'Dr. Omar Khalil', specialty: 'Endocrinology',
    admittedAt: minutesAgo(60 * 14), assignedNurseId: null, ventilated: false,
  });

  // ── seed Hashim ─────────────────────────────
  for (let i = 24; i >= 0; i--) {
    p1.vitals.push({
      id: `v${i}`, t: minutesAgo(i * 30),
      hr: 108 + Math.round(Math.sin(i / 3) * 8 + (rand() * 6 - 3)),
      sys: 96 + Math.round(Math.sin(i / 4) * 6 + (rand() * 5 - 2.5)),
      dia: 58 + Math.round(rand() * 6 - 3),
      spo: 92 + Math.round(Math.sin(i / 5) * 2 + (rand() * 2 - 1)),
      temp: +(38.4 + (rand() * 0.6 - 0.3)).toFixed(1),
      rr: 22 + Math.round(rand() * 4 - 2),
      rbs: 168 + Math.round(rand() * 30 - 15),
    });
  }
  p1.medications = [
    { id: 'm1', name: 'Norepinephrine', route: 'IV', freq: 'Infusion', dose: '0.18 mcg/kg/min', dilution: '16mg/250ml', rate: '8.4 ml/hr', startedAt: minutesAgo(60 * 28), days: 2, duration: 5, active: true,
      history: [
        { id: 'mh1', t: minutesAgo(30), status: 'Given', by: 'Layla Nasser', dose: '0.18' },
        { id: 'mh2', t: minutesAgo(150), status: 'Given', by: 'Layla Nasser', dose: '0.20' },
        { id: 'mh3', t: minutesAgo(280), status: 'Given', by: 'Marcus Bell', dose: '0.22' },
      ] },
    { id: 'm2', name: 'Meropenem', route: 'IV', freq: 'Q8H', dose: '1 g', dilution: 'in 100ml NS', rate: '—', startedAt: minutesAgo(60 * 36), days: 2, duration: 7, active: true,
      history: [
        { id: 'mh4', t: minutesAgo(60), status: 'Given', by: 'Layla Nasser', dose: '1 g' },
        { id: 'mh5', t: minutesAgo(540), status: 'Given', by: 'Marcus Bell', dose: '1 g' },
      ] },
    { id: 'm3', name: 'Propofol', route: 'IV', freq: 'Infusion', dose: '1.4 mg/kg/hr', dilution: '1% / undiluted', rate: '12 ml/hr', startedAt: minutesAgo(60 * 30), days: 2, duration: 3, active: true, history: [] },
    { id: 'm4', name: 'Pantoprazole', route: 'IV', freq: 'OD', dose: '40 mg', dilution: 'in 10ml NS', rate: '—', startedAt: minutesAgo(60 * 38), days: 2, duration: 7, active: true, history: [] },
    { id: 'm5', name: 'Hydrocortisone', route: 'IV', freq: 'Q6H', dose: '50 mg', dilution: '—', rate: '—', startedAt: minutesAgo(60 * 6), days: 1, duration: 5, active: true,
      history: [{ id: 'mh6', t: minutesAgo(60), status: 'Given', by: 'Layla Nasser', dose: '50 mg' }] },
    { id: 'm6', name: 'Enoxaparin', route: 'SC', freq: 'OD', dose: '40 mg', dilution: '—', rate: '—', startedAt: minutesAgo(60 * 30), days: 2, duration: 7, active: true, history: [] },
    { id: 'm7', name: 'Fentanyl', route: 'IV', freq: 'Infusion', dose: '50 mcg/hr', dilution: '500mcg/100ml', rate: '10 ml/hr', startedAt: minutesAgo(60 * 30), days: 2, duration: 3, active: false, history: [] },
  ];
  p1.io = [
    { id: 'io1', t: minutesAgo(45), type: 'IN', cat: 'IV fluids', amount: 250, notes: "Ringer's lactate" },
    { id: 'io2', t: minutesAgo(80), type: 'IN', cat: 'Med dilution', amount: 80, notes: 'Meropenem' },
    { id: 'io3', t: minutesAgo(120), type: 'OUT', cat: 'Urine', amount: 75, notes: 'Foley' },
    { id: 'io4', t: minutesAgo(180), type: 'OUT', cat: 'Drain', amount: 30, notes: 'Chest tube R' },
    { id: 'io5', t: minutesAgo(220), type: 'IN', cat: 'IV fluids', amount: 200, notes: '' },
    { id: 'io6', t: minutesAgo(310), type: 'OUT', cat: 'Urine', amount: 110, notes: '' },
    { id: 'io7', t: minutesAgo(420), type: 'IN', cat: 'Feeding', amount: 240, notes: 'Jevity 60ml/hr × 4h' },
    { id: 'io8', t: minutesAgo(550), type: 'OUT', cat: 'Urine', amount: 90, notes: '' },
    { id: 'io9', t: minutesAgo(640), type: 'IN', cat: 'IV fluids', amount: 200, notes: '' },
    { id: 'io10', t: minutesAgo(720), type: 'OUT', cat: 'Urine', amount: 95, notes: '' },
  ];
  p1.fluidBalance = computeBalance(p1.io);
  p1.investigations = [
    { id: 'lab1', title: 'Arterial Blood Gas', type: 'ABG', t: minutesAgo(45), abnormal: true,
      params: [
        ['pH', '7.28', true], ['PaCO₂', '48 mmHg', true], ['PaO₂', '82 mmHg', false],
        ['HCO₃', '18 mmol/L', true], ['BE', '-6.2', true], ['Lactate', '3.4 mmol/L', true],
      ], impression: 'Mixed metabolic + respiratory acidosis. Elevated lactate.' },
    { id: 'lab2', title: 'Complete Blood Count', type: 'CBC', t: minutesAgo(180), abnormal: true,
      params: [
        ['WBC', '18.4 ×10⁹/L', true], ['Hb', '9.8 g/dL', true], ['Hct', '30.1 %', true], ['Platelets', '118 ×10⁹/L', true],
        ['Neutrophils', '84 %', true], ['Lymphocytes', '8 %', true],
      ], impression: 'Leukocytosis with left shift, mild anemia, thrombocytopenia.' },
    { id: 'lab3', title: 'Renal & Electrolytes', type: 'Renal Function', t: minutesAgo(280), abnormal: true,
      params: [
        ['Na', '132 mmol/L', true], ['K', '5.2 mmol/L', true], ['Cl', '104 mmol/L', false],
        ['Urea', '14.2 mmol/L', true], ['Creatinine', '186 µmol/L', true], ['eGFR', '32 mL/min', true],
      ], impression: 'AKI on CKD. Mild hyponatremia, mild hyperkalemia.' },
    { id: 'lab4', title: 'CRP & Procalcitonin', type: 'CRP', t: minutesAgo(360), abnormal: true,
      params: [['CRP', '184 mg/L', true], ['PCT', '12.4 ng/mL', true]], impression: 'Markedly elevated inflammatory markers.' },
    { id: 'img1', title: 'Chest X-Ray Portable', type: 'Imaging', t: minutesAgo(540), abnormal: true,
      params: [['Findings', 'Bilateral lower zone consolidation', true]], impression: 'ETT in good position. Bilateral infiltrates worse on right.' },
  ];
  p1.orders = [
    { id: 'o1', type: 'MEDICATION', title: 'Adjust Norepinephrine to MAP > 65', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'STAT', status: 'APPROVED', t: minutesAgo(20), notes: 'Titrate q5min.' },
    { id: 'o2', type: 'LAB', title: 'Repeat ABG in 1 hour', by: 'Dr. Omar Khalil', role: 'RESIDENT', priority: 'Urgent', status: 'PENDING', t: minutesAgo(10), notes: '' },
    { id: 'o3', type: 'NURSING', title: 'Strict I/O hourly · Q4H bladder scan', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'Routine', status: 'APPROVED', t: minutesAgo(75), notes: '', repetition: 'Q4H' },
    { id: 'o4', type: 'IMAGING', title: 'Bedside ECHO', by: 'Dr. Omar Khalil', role: 'RESIDENT', priority: 'Urgent', status: 'PENDING', t: minutesAgo(95), notes: 'Assess for septic cardiomyopathy.' },
    { id: 'o5', type: 'CONSULT', title: 'Nephrology consult — AKI', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'Routine', status: 'APPROVED', t: minutesAgo(220), notes: '' },
    { id: 'o6', type: 'MEDICATION', title: 'Vancomycin 1g IV Q12H × 5 days', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'Routine', status: 'COMPLETED', t: minutesAgo(700), notes: '' },
    { id: 'o7', type: 'LAB', title: 'Blood cultures × 2', by: 'Dr. Omar Khalil', role: 'RESIDENT', priority: 'STAT', status: 'COMPLETED', t: minutesAgo(900), notes: '' },
  ];
  p1.interventions = [
    { id: 'iv1', type: 'ETT', title: 'Endotracheal Tube', status: 'APPROVED', t: minutesAgo(60 * 30), reminderAt: new Date(Date.now() + 60 * 60_000 * 2.5), notes: 'Size 7.5, depth 22cm.' },
    { id: 'iv2', type: 'CV Line', title: 'Right IJ CV Line', status: 'COMPLETED', t: minutesAgo(60 * 36), reminderAt: new Date(Date.now() + 60 * 60_000 * 36), notes: 'Patent, dressing dry.' },
    { id: 'iv3', type: 'Arterial Line', title: 'Right Radial A-Line', status: 'APPROVED', t: minutesAgo(60 * 32), reminderAt: new Date(Date.now() - 12 * 60_000), notes: 'Due for site check.' },
  ];
  p1.skinAssessments = [
    { id: 'sk1', part: 'Sacrum', side: 'BACK', type: 'Lesion', t: minutesAgo(60 * 6), by: 'Layla Nasser', notes: 'Stage 1 erythema, blanchable. Reposition q2h.' },
    { id: 'sk2', part: 'Right Heel', side: 'BACK', type: 'Dressing', t: minutesAgo(60 * 12), by: 'Marcus Bell', notes: 'Foam dressing applied. Intact.' },
    { id: 'sk3', part: 'Chest', side: 'FRONT', type: 'Dressing', t: minutesAgo(60 * 30), by: 'Layla Nasser', notes: 'CV line dressing dry & intact.' },
  ];
  p1.ventilator = [
    { id: 'vn1', t: minutesAgo(60), mode: 'SIMV-PC', rate: 16, fio2: 60, peep: 8, vt: 420, ps: 12, ie: '1:2' },
    { id: 'vn2', t: minutesAgo(180), mode: 'SIMV-PC', rate: 16, fio2: 70, peep: 10, vt: 410, ps: 12, ie: '1:2' },
    { id: 'vn3', t: minutesAgo(420), mode: 'AC-VC', rate: 18, fio2: 80, peep: 12, vt: 400, ps: 14, ie: '1:1.5' },
  ];
  p1.notes = [
    { id: 'n1', type: 'PROGRESS', title: 'Day 2 Progress', by: 'Dr. Sara Ahmed', role: 'SENIOR', t: minutesAgo(180),
      content: 'Subjective:\n  Sedated, no spontaneous movements.\n\nObjective:\n  BP 96/58 on Norepi 0.18 mcg/kg/min. SpO₂ 92% on 60% FiO₂.\n  Lactate trending down 4.1 → 3.4. WBC 18.4.\n\nAssessment:\n  Septic shock, AKI on CKD, responding to resus.\n\nPlan:\n  Continue empiric Mero/Vanc.\n  Maintain MAP > 65, lactate <2.\n  Consider weaning sedation tomorrow.' },
    { id: 'n2', type: 'NURSING', title: 'Night Shift Summary', by: 'Marcus Bell', role: 'NURSE', t: minutesAgo(540),
      content: 'Shift Summary:\n  Tolerated turning q2h. Two episodes of desat to 88% — recovered with suctioning.\n\nSkin:\n  Sacrum stage 1, foam to heels.\n\nLines:\n  R IJ CVL, R radial A-line, OGT, Foley. All patent.' },
  ];

  // ── seed Yathrib ────────────────────────────
  for (let i = 18; i >= 0; i--) {
    p2.vitals.push({
      id: `v${i}`, t: minutesAgo(i * 30),
      hr: 78 + Math.round(Math.sin(i / 4) * 5),
      sys: 124 + Math.round(rand() * 6 - 3),
      dia: 72 + Math.round(rand() * 4 - 2),
      spo: 97 + Math.round(rand() * 2),
      temp: +(37.1 + (rand() * 0.4 - 0.2)).toFixed(1),
      rr: 16 + Math.round(rand() * 2),
      rbs: 132 + Math.round(rand() * 20 - 10),
    });
  }
  p2.medications = [
    { id: 'm1', name: 'Paracetamol', route: 'IV', freq: 'QID', dose: '1 g', dilution: '—', rate: '—', startedAt: minutesAgo(60 * 90), days: 3, duration: 5, active: true, history: [] },
    { id: 'm2', name: 'Enoxaparin', route: 'SC', freq: 'OD', dose: '40 mg', dilution: '—', rate: '—', startedAt: minutesAgo(60 * 90), days: 3, duration: 7, active: true, history: [] },
    { id: 'm3', name: 'Pantoprazole', route: 'PO', freq: 'OD', dose: '40 mg', dilution: '—', rate: '—', startedAt: minutesAgo(60 * 90), days: 3, duration: 7, active: true, history: [] },
  ];
  p2.io = [
    { id: 'io1', t: minutesAgo(120), type: 'IN', cat: 'Oral', amount: 200, notes: 'Water' },
    { id: 'io2', t: minutesAgo(180), type: 'OUT', cat: 'Urine', amount: 280, notes: '' },
    { id: 'io3', t: minutesAgo(360), type: 'IN', cat: 'Oral', amount: 150, notes: '' },
    { id: 'io4', t: minutesAgo(420), type: 'OUT', cat: 'Urine', amount: 260, notes: '' },
  ];
  p2.fluidBalance = computeBalance(p2.io);
  p2.orders = [
    { id: 'o1', type: 'DIET', title: 'Soft diet, low salt', by: 'Dr. Henrik Vogt', role: 'SENIOR', priority: 'Routine', status: 'APPROVED', t: minutesAgo(60 * 12), notes: '' },
    { id: 'o2', type: 'NURSING', title: 'Encourage incentive spirometry q1h', by: 'Dr. Henrik Vogt', role: 'SENIOR', priority: 'Routine', status: 'APPROVED', t: minutesAgo(60 * 12), notes: '', repetition: 'Q1H' },
  ];
  p2.investigations = [
    { id: 'lab1', title: 'CBC', type: 'CBC', t: minutesAgo(60 * 10), abnormal: false,
      params: [['WBC', '8.2 ×10⁹/L', false], ['Hb', '11.2 g/dL', false], ['Platelets', '240 ×10⁹/L', false]], impression: 'Within normal limits.' },
  ];

  // ── seed Talal ──────────────────────────────
  for (let i = 12; i >= 0; i--) {
    p3.vitals.push({
      id: `v${i}`, t: minutesAgo(i * 30),
      hr: 132 + Math.round(Math.sin(i / 2) * 6),
      sys: 84 + Math.round(rand() * 6 - 3),
      dia: 48 + Math.round(rand() * 4 - 2),
      spo: 89 + Math.round(rand() * 3),
      temp: +(36.2 + (rand() * 0.3 - 0.15)).toFixed(1),
      rr: 26 + Math.round(rand() * 4 - 2),
      rbs: 188 + Math.round(rand() * 20 - 10),
    });
  }
  p3.medications = [
    { id: 'm1', name: 'Norepinephrine', route: 'IV', freq: 'Infusion', dose: '0.32 mcg/kg/min', dilution: '16mg/250ml', rate: '14.2 ml/hr', startedAt: minutesAgo(60 * 8), days: 1, duration: 5, active: true, history: [] },
    { id: 'm2', name: 'Adrenaline', route: 'IV', freq: 'Infusion', dose: '0.10 mcg/kg/min', dilution: '4mg/250ml', rate: '6.4 ml/hr', startedAt: minutesAgo(60 * 8), days: 1, duration: 3, active: true, history: [] },
    { id: 'm3', name: 'Midazolam', route: 'IV', freq: 'Infusion', dose: '4 mg/hr', dilution: '100mg/100ml', rate: '4 ml/hr', startedAt: minutesAgo(60 * 8), days: 1, duration: 3, active: true, history: [] },
  ];
  p3.fluidBalance = { in12h: 2400, out12h: 320 };
  p3.orders = [
    { id: 'o1', type: 'IMAGING', title: 'Repeat CT Head', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'STAT', status: 'APPROVED', t: minutesAgo(30), notes: 'Assess hemorrhage progression.' },
    { id: 'o2', type: 'MEDICATION', title: 'Mannitol 0.5 g/kg IV STAT', by: 'Dr. Sara Ahmed', role: 'SENIOR', priority: 'STAT', status: 'PENDING', t: minutesAgo(5), notes: '' },
  ];
  p3.investigations = [
    { id: 'img1', title: 'CT Head', type: 'Imaging', t: minutesAgo(60 * 7), abnormal: true,
      params: [['Findings', '8mm right frontal SDH, midline shift 4mm', true]], impression: 'Right frontal subdural hematoma with mass effect.' },
  ];

  return [p1, p2, p3, p4];
}

// ── Toast ─────────────────────────────────────
export interface Toast {
  id: string;
  tone: 'ok' | 'warn' | 'crit' | 'info';
  msg: string;
}

// ── Zustand store ─────────────────────────────
export type DataMode = 'live' | 'demo';

export interface ICUState {
  users: MockUser[];
  patients: Patient[];
  liveReadings: Record<string, LiveReading>;
  toasts: Toast[];

  user: MockUser | null;
  shift: { type: 'DAY' | 'NIGHT'; startTime: Date } | null;
  view: 'login' | 'dashboard' | 'patient' | 'tweaks';
  patientId: string | null;
  patientTab: string;
  alarmsOn: boolean;

  // Live-mode state
  mode: DataMode;
  loadingPatients: boolean;
  loadedTabs: Record<string, Record<string, number>>; // patientId -> tab -> last-loaded epoch ms
  lang: 'en' | 'ar';
  setLang: (l: 'en' | 'ar') => void;

  // actions
  signIn: (u: MockUser) => void;
  signOut: () => void;
  setView: (view: ICUState['view']) => void;
  openPatient: (id: string, tab?: string) => void;
  setPatientTab: (t: string) => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  bump: () => void;
  toggleAlarms: () => void;
  tickVitals: () => void;
  setMode: (m: DataMode) => void;

  // Live API actions
  realLogin: (username: string, password: string) => Promise<void>;
  loadPatients: () => Promise<void>;
  loadPatient: (id: string) => Promise<void>;
  loadVitals: (id: string) => Promise<void>;
  loadMar: (id: string) => Promise<void>;
  loadOrders: (id: string) => Promise<void>;
  loadIO: (id: string) => Promise<void>;
  loadInvestigations: (id: string) => Promise<void>;
  loadNotes: (id: string) => Promise<void>;
  loadSkin: (id: string) => Promise<void>;
  loadVentilator: (id: string) => Promise<void>;
  loadConsultations: (id: string) => Promise<void>;
  loadHandovers: (id: string) => Promise<void>;
  loadEvents: (id: string) => Promise<void>;
  loadTab: (id: string, tab: string) => Promise<void>;

  // Live mutations
  addVitalLive: (patientId: string, input: Partial<VitalRecord>) => Promise<void>;
  administerMedLive: (patientId: string, medicationId: string, dose?: string, dilution?: string, administeredAt?: string) => Promise<void>;
  discontinueMedLive: (patientId: string, medicationId: string) => Promise<void>;
  updateMedLive: (patientId: string, medicationId: string, input: {
    dose?: string; route?: string; frequency?: string; infusionRate?: string; otherInstructions?: string; dilution?: string;
  }) => Promise<void>;
  prescribeMedLive: (patientId: string, input: {
    name: string; dose?: string; route: string; frequency: string;
    infusionRate?: string; dilution?: number; durationReminder?: number; otherInstructions?: string;
  }) => Promise<void>;
  updateOrderStatusLive: (patientId: string, orderId: string, status: OrderItem['status']) => Promise<void>;
  addIOLive: (patientId: string, input: { type: 'IN' | 'OUT'; category: string; amount: number; notes?: string }) => Promise<void>;
  createNoteLive: (patientId: string, input: { type: string; title: string; content: string }) => Promise<void>;
  dischargePatientLive: (patientId: string) => Promise<void>;
  assignPatientLive: (patientId: string) => Promise<void>;
  createInvestigationLive: (patientId: string, input: {
    type: 'LAB' | 'IMAGING' | string;
    category?: string;
    title: string;
    result?: any;
    impression?: string;
    conductedAt?: string;
  }) => Promise<void>;
  addVentilatorLive: (patientId: string, input: { mode: string; rate: number; fio2: number; ie: string; ps: number; vt: number; timestamp?: string }) => Promise<void>;
  addConsultationLive: (patientId: string, input: { doctorName: string; specialty: string; notes?: string; imageUrl?: string }) => Promise<void>;
  addSkinLive: (patientId: string, input: { bodyPart: string; view: 'FRONT' | 'BACK'; type: 'LESION' | 'DRESSING'; notes?: string; imageUrl?: string }) => Promise<void>;
  createHandoverLive: (patientId: string, data: Record<string, any>) => Promise<void>;
  addEventLive: (patientId: string, input: { category: string; severity: 'info' | 'warning' | 'critical'; description: string }) => Promise<void>;
}

export const useICU = create<ICUState>((set, get) => {
  const patients = makePatients();
  const liveReadings: Record<string, LiveReading> = {};
  patients.forEach(p => {
    const last = p.vitals[p.vitals.length - 1];
    liveReadings[p.id] = last
      ? { hr: last.hr, sys: last.sys, dia: last.dia, spo: last.spo, temp: last.temp, rr: last.rr, rbs: last.rbs, t: new Date() }
      : { hr: 80, sys: 120, dia: 70, spo: 98, temp: 37.0, rr: 16, rbs: 100, t: new Date() };
  });

  return {
    users: mockUsers,
    patients,
    liveReadings,
    toasts: [],
    user: null,
    shift: null,
    view: 'login',
    patientId: null,
    patientTab: 'overview',
    alarmsOn: true,
    mode: 'live' as DataMode,
    loadingPatients: false,
    loadedTabs: {},
    lang: 'en',
    setLang: (lang) => set({ lang }),

    signIn: (u) => set({
      user: u,
      view: 'dashboard',
      shift: { type: 'DAY', startTime: new Date() },
      mode: 'demo',
      patients: makePatients(),
    }),
    signOut: () => {
      // Stop this device from receiving pushes while signed out.
      unregisterFcm().catch(() => {});
      setToken(null);
      set({
        user: null, view: 'login', patientId: null,
        patients: [], liveReadings: {}, loadedTabs: {},
      });
    },
    setView: (view) => set({ view }),
    openPatient: (id, tab = 'overview') => {
      set({ view: 'patient', patientId: id, patientTab: tab });
      const { mode, loadTab } = get();
      if (mode === 'live') loadTab(id, tab);
    },
    setPatientTab: (t) => {
      set({ patientTab: t });
      const { mode, patientId, loadTab } = get();
      if (mode === 'live' && patientId) loadTab(patientId, t);
    },
    pushToast: (t) => {
      const id = 't' + Date.now() + Math.random();
      set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) }));
      }, 3500);
    },
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(x => x.id !== id) })),
    bump: () => set((s) => ({ ...s })),
    toggleAlarms: () => set((s) => ({ alarmsOn: !s.alarmsOn })),
    setMode: (m) => {
      const cur = get();
      if (m === cur.mode) return;
      if (m === 'demo') {
        set({ mode: 'demo', patients: makePatients(), loadedTabs: {} });
        // recompute liveReadings
        const ps = get().patients;
        const rs: Record<string, LiveReading> = {};
        ps.forEach(p => {
          const last = p.vitals[p.vitals.length - 1];
          rs[p.id] = last
            ? { hr: last.hr, sys: last.sys, dia: last.dia, spo: last.spo, temp: last.temp, rr: last.rr, rbs: last.rbs, t: new Date() }
            : { hr: 80, sys: 120, dia: 70, spo: 98, temp: 37.0, rr: 16, rbs: 100, t: new Date() };
        });
        set({ liveReadings: rs });
      } else {
        // entering live: clear demo data; caller should sign-in / load
        set({ mode: 'live', patients: [], liveReadings: {}, loadedTabs: {} });
      }
    },
    tickVitals: () => {
      const { mode } = get();
      if (mode === 'live') return; // no fake drift in live mode
      const { patients: pts, liveReadings: rs } = get();
      const drift = (v: number, mag: number) => v + (Math.random() * mag * 2 - mag);
      pts.forEach(p => {
        const r = rs[p.id];
        if (!r) return;
        if (p.critical) {
          r.hr = Math.round(Math.max(60, Math.min(160, drift(r.hr, 2))));
          r.spo = Math.round(Math.max(85, Math.min(99, drift(r.spo, 0.6))));
          r.sys = Math.round(Math.max(80, Math.min(140, drift(r.sys, 2))));
          r.dia = Math.round(Math.max(45, Math.min(85, drift(r.dia, 1))));
          r.rr = Math.round(Math.max(12, Math.min(34, drift(r.rr, 0.6))));
          r.temp = +(Math.max(35.5, Math.min(39.5, drift(r.temp, 0.05)))).toFixed(1);
        } else {
          r.hr = Math.round(Math.max(60, Math.min(100, drift(r.hr, 1))));
          r.spo = Math.round(Math.max(94, Math.min(99, drift(r.spo, 0.3))));
          r.sys = Math.round(Math.max(105, Math.min(140, drift(r.sys, 1))));
          r.dia = Math.round(Math.max(60, Math.min(85, drift(r.dia, 0.5))));
          r.rr = Math.round(Math.max(12, Math.min(20, drift(r.rr, 0.3))));
          r.temp = +(Math.max(36.3, Math.min(37.6, drift(r.temp, 0.03)))).toFixed(1);
        }
        r.t = new Date();
      });
      set({ liveReadings: { ...rs } });
    },

    // ── Live API actions ───────────────────────
    realLogin: async (username, password) => {
      const res = await api.login(username, password);
      setToken(res.token);
      const u = realUserToDesign(res.user);
      set({
        user: u,
        view: 'dashboard',
        shift: { type: 'DAY', startTime: new Date() },
        mode: 'live',
        patients: [],
        liveReadings: {},
        loadedTabs: {},
      });
      await get().loadPatients();
    },

    loadPatients: async () => {
      set({ loadingPatients: true });
      try {
        const list = await api.listPatients();
        // Preserve any child collections already fetched for a patient so refreshing the
        // dashboard list doesn't blow away loaded tab data (which would make tabs look
        // like they re-fetch "from the beginning" on next open).
        const { patients: existing, liveReadings: prevReadings } = get();
        const prevById: Record<string, Patient> = {};
        existing.forEach((p: Patient) => { prevById[p.id] = p; });
        const mapped = list.map(realPatientToDesign).map(p => {
          const old = prevById[p.id];
          return old ? { ...p, ...preserveChildren(old) } : p;
        });
        // Overlay active nurse assignments so "YOUR PATIENTS" and nurse badges work in live mode.
        try {
          const assignments = await api.listActiveAssignments();
          const byPatient: Record<string, string> = {};
          assignments.forEach(a => { if (a.isActive) byPatient[a.patientId] = a.userId; });
          mapped.forEach(p => { p.assignedNurseId = byPatient[p.id] || null; });
        } catch {
          // Non-fatal: patients still render without assignment overlay
        }
        const liveReadings: Record<string, LiveReading> = {};
        mapped.forEach(p => {
          // Keep the last computed live reading if we already had one for this patient.
          liveReadings[p.id] = prevReadings[p.id] || { hr: 0, sys: 0, dia: 0, spo: 0, temp: 0, rr: 0, rbs: 0, t: new Date() };
        });
        set({ patients: mapped, liveReadings });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Failed to load patients: ${e?.message || 'error'}` });
      } finally {
        set({ loadingPatients: false });
      }
    },

    loadPatient: async (id) => {
      try {
        const real = await api.getPatient(id);
        const mapped = realPatientToDesign(real);
        const { patients } = get();
        const idx = patients.findIndex(p => p.id === id);
        if (idx >= 0) {
          const copy = patients.slice();
          // preserve any lazy-loaded child collections
          copy[idx] = { ...mapped, ...preserveChildren(copy[idx]) };
          set({ patients: copy });
        } else {
          set({ patients: [...patients, mapped] });
        }
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Failed to load patient: ${e?.message || 'error'}` });
      }
    },

    loadVitals: async (id) => {
      try {
        const list = await api.getVitals(id);
        const mapped = list
          .map(realVitalToDesign)
          .sort((a, b) => a.t.getTime() - b.t.getTime());
        updatePatient(set, get, id, p => ({ ...p, vitals: mapped }));
        // refresh liveReadings
        const { liveReadings } = get();
        set({ liveReadings: { ...liveReadings, [id]: vitalsToLiveReading(mapped) } });
        markLoaded(set, get, id, 'vitals');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Vitals: ${e?.message || 'error'}` });
      }
    },

    loadMar: async (id) => {
      try {
        const list = await api.getMar(id);
        const meds = (list || []).map(realMedToDesign);
        updatePatient(set, get, id, p => ({ ...p, medications: meds }));
        markLoaded(set, get, id, 'mar');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `MAR: ${e?.message || 'error'}` });
      }
    },

    loadOrders: async (id) => {
      try {
        const list = await api.getOrders(id);
        const mapped = list.map(realOrderToDesign);
        updatePatient(set, get, id, p => ({ ...p, orders: mapped }));
        markLoaded(set, get, id, 'orders');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Orders: ${e?.message || 'error'}` });
      }
    },

    loadIO: async (id) => {
      try {
        const list = await api.getIO(id);
        const mapped = list.map(realIOToDesign);
        const balance = computeFluidBalance(mapped);
        updatePatient(set, get, id, p => ({ ...p, io: mapped, fluidBalance: balance }));
        markLoaded(set, get, id, 'io');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `I/O: ${e?.message || 'error'}` });
      }
    },

    loadInvestigations: async (id) => {
      try {
        const list = await api.getInvestigations(id);
        const mapped = list.map(realInvestigationToDesign);
        updatePatient(set, get, id, p => ({ ...p, investigations: mapped }));
        markLoaded(set, get, id, 'labs');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Labs: ${e?.message || 'error'}` });
      }
    },

    loadNotes: async (id) => {
      try {
        const list = await api.getNotes(id);
        const mapped = list.map(realNoteToDesign);
        updatePatient(set, get, id, p => ({ ...p, notes: mapped }));
        markLoaded(set, get, id, 'notes');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Notes: ${e?.message || 'error'}` });
      }
    },

    loadSkin: async (id) => {
      try {
        const list = await api.getSkinAssessments(id);
        const mapped = list.map(realSkinToDesign);
        updatePatient(set, get, id, p => ({ ...p, skinAssessments: mapped }));
        markLoaded(set, get, id, 'nursing');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Skin: ${e?.message || 'error'}` });
      }
    },

    loadVentilator: async (id) => {
      try {
        const list = await api.getVentilator(id);
        const mapped = list.map(realVentilatorToDesign);
        updatePatient(set, get, id, p => ({ ...p, ventilator: mapped }));
        markLoaded(set, get, id, 'ventilator');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Ventilator: ${e?.message || 'error'}` });
      }
    },

    loadConsultations: async (id) => {
      try {
        const list = await api.getConsultations(id);
        const mapped = list.map(realConsultationToDesign);
        updatePatient(set, get, id, p => ({ ...p, consultations: mapped }));
        markLoaded(set, get, id, 'consultation');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Consultations: ${e?.message || 'error'}` });
      }
    },

    loadHandovers: async (id) => {
      try {
        const list = await api.getHandoverNotes(id);
        const mapped = list.map(realHandoverToDesign);
        updatePatient(set, get, id, p => ({ ...p, handovers: mapped }));
        markLoaded(set, get, id, 'handover');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Handover: ${e?.message || 'error'}` });
      }
    },

    loadEvents: async (id) => {
      try {
        const list = await api.getNotes(id, 'EVENT');
        const mapped = list.map(realEventToDesign);
        updatePatient(set, get, id, p => ({ ...p, events: mapped }));
        markLoaded(set, get, id, 'events');
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Events: ${e?.message || 'error'}` });
      }
    },

    loadTab: async (id, tab) => {
      // 'overview' fetches vitals + orders + meds + labs + io
      if (tab === 'overview') {
        const tasks: Promise<void>[] = [];
        if (!tabFresh(get, id, 'vitals')) tasks.push(get().loadVitals(id));
        if (!tabFresh(get, id, 'mar')) tasks.push(get().loadMar(id));
        if (!tabFresh(get, id, 'orders')) tasks.push(get().loadOrders(id));
        if (!tabFresh(get, id, 'io')) tasks.push(get().loadIO(id));
        if (!tabFresh(get, id, 'labs')) tasks.push(get().loadInvestigations(id));
        await Promise.all(tasks);
        return;
      }
      if (tabFresh(get, id, tab)) return;
      switch (tab) {
        case 'vitals': return get().loadVitals(id);
        case 'mar': return get().loadMar(id);
        case 'orders': return get().loadOrders(id);
        case 'io': return get().loadIO(id);
        case 'labs': return get().loadInvestigations(id);
        case 'notes': return get().loadNotes(id);
        case 'nursing': return get().loadSkin(id);
        case 'interventions': return get().loadOrders(id);
        case 'ventilator': return get().loadVentilator(id);
        case 'consultation': return get().loadConsultations(id);
        case 'handover': return get().loadHandovers(id);
        case 'events': return get().loadEvents(id);
      }
    },

    // ── Live mutations ──────────────────────────
    addVitalLive: async (patientId, input) => {
      try {
        await api.addVital({
          patientId,
          heartRate: input.hr ?? undefined,
          bpSys: input.sys ?? undefined,
          bpDia: input.dia ?? undefined,
          spo2: input.spo ?? undefined,
          temp: input.temp ?? undefined,
          rr: input.rr ?? undefined,
          rbs: input.rbs ?? undefined,
        });
        await get().loadVitals(patientId);
        get().pushToast({ tone: 'ok', msg: 'Vitals recorded' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Add vitals: ${e?.message || 'error'}` });
      }
    },

    administerMedLive: async (patientId, medicationId, dose, dilution, administeredAt) => {
      try {
        const u = get().user;
        if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
        await api.administerMedication({ patientId, medicationId, status: 'Given', dose, dilution, userId: u.id, administeredAt });
        // A dilution volume becomes an I/O intake on the server — refresh I/O so it shows.
        await Promise.all([get().loadMar(patientId), ...(dilution ? [get().loadIO(patientId)] : [])]);
        get().pushToast({ tone: 'ok', msg: 'Medication administered' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Administer: ${e?.message || 'error'}` });
      }
    },

    updateMedLive: async (patientId, medicationId, input) => {
      try {
        await api.updateMedication(medicationId, input);
        await get().loadMar(patientId);
        get().pushToast({ tone: 'ok', msg: 'Medication updated' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Update medication: ${e?.message || 'error'}` });
      }
    },

    prescribeMedLive: async (patientId, input) => {
      try {
        await api.prescribeMedication({
          patientId,
          name: input.name,
          dose: input.dose,
          route: input.route,
          frequency: input.frequency,
          infusionRate: input.infusionRate,
          dilution: input.dilution,
          durationReminder: input.durationReminder,
          otherInstructions: input.otherInstructions,
          startedAt: new Date().toISOString(),
        });
        await get().loadMar(patientId);
        get().pushToast({ tone: 'ok', msg: 'Medication added' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Add medication: ${e?.message || 'error'}` });
      }
    },

    discontinueMedLive: async (patientId, medicationId) => {
      try {
        await api.discontinueMedication(medicationId);
        await get().loadMar(patientId);
        get().pushToast({ tone: 'warn', msg: 'Medication discontinued' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Discontinue: ${e?.message || 'error'}` });
      }
    },

    updateOrderStatusLive: async (patientId, orderId, status) => {
      try {
        const u = get().user;
        if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
        await api.updateOrderStatus(orderId, status, u.id);
        await get().loadOrders(patientId);
        get().pushToast({ tone: 'ok', msg: `Order ${status.toLowerCase()}` });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Order: ${e?.message || 'error'}` });
      }
    },

    addIOLive: async (patientId, input) => {
      try {
        const u = get().user;
        if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
        await api.addIO({
          patientId,
          userId: u.id,
          type: input.type === 'IN' ? 'INPUT' : 'OUTPUT',
          category: input.category,
          amount: input.amount,
          notes: input.notes,
        });
        await get().loadIO(patientId);
        get().pushToast({ tone: 'ok', msg: 'I/O entry recorded' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `I/O: ${e?.message || 'error'}` });
      }
    },

    createNoteLive: async (patientId, input) => {
      try {
        const u = get().user;
        if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
        await api.createNote({
          patientId,
          authorId: u.id,
          type: input.type,
          title: input.title,
          content: input.content,
        });
        await get().loadNotes(patientId);
        get().pushToast({ tone: 'ok', msg: 'Note saved' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Note: ${e?.message || 'error'}` });
      }
    },

    dischargePatientLive: async (patientId) => {
      try {
        await api.dischargePatient(patientId);
        // Mark locally so the UI updates immediately (avoids a roundtrip refresh)
        updatePatient(set, get, patientId, p => ({ ...p, dischargedAt: new Date() }));
        get().pushToast({ tone: 'ok', msg: 'Patient discharged' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Discharge: ${e?.message || 'error'}` });
      }
    },

    assignPatientLive: async (patientId) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        // Server force-hands-over: ends my other check-ins + checks out any other
        // nurse on this patient, then checks me in.
        const res: any = await api.assignPatient(patientId, u.id);
        const copy = get().patients.map(p => {
          if (p.id === patientId) return { ...p, assignedNurseId: u.id };
          if (p.assignedNurseId === u.id) return { ...p, assignedNurseId: null };
          return p;
        });
        set({ patients: copy });
        const displaced = res?.displaced?.length ? ` · checked out ${res.displaced.join(', ')}` : '';
        get().pushToast({ tone: 'ok', msg: `Checked in${displaced}` });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: e?.message || 'Failed to check in' });
      }
    },

    createInvestigationLive: async (patientId, input) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.createInvestigation({
          patientId,
          authorId: u.id,
          type: input.type,
          category: input.category,
          title: input.title,
          status: 'FINAL',
          result: input.result || {},
          impression: input.impression,
          conductedAt: input.conductedAt,
        });
        await get().loadInvestigations(patientId);
        get().pushToast({ tone: 'ok', msg: 'Result saved' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Save result: ${e?.message || 'error'}` });
      }
    },

    addVentilatorLive: async (patientId, input) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.addVentilator({ patientId, userId: u.id, ...input });
        await get().loadVentilator(patientId);
        get().pushToast({ tone: 'ok', msg: 'Ventilator settings recorded' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Ventilator: ${e?.message || 'error'}` });
      }
    },

    addConsultationLive: async (patientId, input) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.addConsultation(patientId, { ...input, authorId: u.id });
        await get().loadConsultations(patientId);
        get().pushToast({ tone: 'ok', msg: 'Consultation saved' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Consultation: ${e?.message || 'error'}` });
      }
    },

    addSkinLive: async (patientId, input) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.addSkinAssessment({ patientId, authorId: u.id, ...input });
        await get().loadSkin(patientId);
        get().pushToast({ tone: 'ok', msg: 'Assessment recorded' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Skin: ${e?.message || 'error'}` });
      }
    },

    createHandoverLive: async (patientId, data) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.createHandoverNote({ patientId, authorId: u.id, ...data });
        await get().loadHandovers(patientId);
        get().pushToast({ tone: 'ok', msg: 'Handover note saved' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Handover: ${e?.message || 'error'}` });
      }
    },

    addEventLive: async (patientId, input) => {
      const u = get().user;
      if (!u) { get().pushToast({ tone: 'crit', msg: 'Not signed in' }); return; }
      try {
        await api.createNote({
          patientId,
          authorId: u.id,
          type: 'EVENT',
          title: input.category,
          content: input.description,
          data: { severity: input.severity, category: input.category },
        });
        await get().loadEvents(patientId);
        get().pushToast({ tone: 'ok', msg: 'Event recorded — team notified' });
      } catch (e: any) {
        get().pushToast({ tone: 'crit', msg: `Event: ${e?.message || 'error'}` });
      }
    },
  };
});

// ── store update helpers ────────────────────────
function updatePatient(
  set: any, get: any, id: string,
  updater: (p: Patient) => Patient,
) {
  const { patients } = get();
  const idx = patients.findIndex((p: Patient) => p.id === id);
  if (idx < 0) return;
  const copy = patients.slice();
  copy[idx] = updater(copy[idx]);
  set({ patients: copy });
}

// How long a tab's fetched data is considered fresh. Re-opening a tab within this
// window serves the cached store data instantly (no network); after it, we refetch.
export const TAB_TTL_MS = 120_000;

function markLoaded(set: any, get: any, id: string, tab: string) {
  const { loadedTabs } = get();
  const cur = { ...(loadedTabs[id] || {}) };
  cur[tab] = Date.now();
  set({ loadedTabs: { ...loadedTabs, [id]: cur } });
}

// True when `tab` for patient `id` was loaded within the freshness window.
function tabFresh(get: any, id: string, tab: string): boolean {
  const ts = get().loadedTabs[id]?.[tab];
  return typeof ts === 'number' && Date.now() - ts < TAB_TTL_MS;
}

function preserveChildren(p: Patient) {
  return {
    vitals: p.vitals,
    medications: p.medications,
    io: p.io,
    investigations: p.investigations,
    orders: p.orders,
    skinAssessments: p.skinAssessments,
    ventilator: p.ventilator,
    notes: p.notes,
    interventions: p.interventions,
    consultations: p.consultations,
    handovers: p.handovers,
    events: p.events,
    fluidBalance: p.fluidBalance,
  };
}

// ── helpers ───────────────────────────────────
export function getDueInterventions(p: Patient, alarmsOn: boolean): Intervention[] {
  if (!alarmsOn) return [];
  const cutoff = Date.now();
  return p.interventions.filter(i => i.status !== 'COMPLETED' && new Date(i.reminderAt).getTime() <= cutoff);
}

export const fmtTime = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};
export const fmtDate = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const today = new Date();
  if (dt.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(today); y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString([], { month: 'short', day: 'numeric' });
};
export const fmtAgo = (d: Date | string) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  const m = Math.floor((Date.now() - dt.getTime()) / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};
