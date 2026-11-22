// GENERATED from /shared/src — do not edit here. Run: node scripts/sync-shared.mjs

// Bedside scores (GCS, RASS, pain) and severity scores (SOFA, APACHE II).
// The point tables follow the original publications:
//   SOFA      — Vincent JL et al., Intensive Care Med 1996;22:707-10
//   APACHE II — Knaus WA et al., Crit Care Med 1985;13:818-29

// ── Glasgow Coma Scale ──────────────────────────────────────────

export interface GcsParts {
  eye?: number | null;
  verbal?: number | null;
  motor?: number | null;
  // Intubated: verbal response cannot be tested and counts as 1 ("T").
  intubated?: boolean | null;
}

export function gcsTotal(g: GcsParts): number | null {
  if (!g.eye || !g.motor) return null;
  const verbal = g.intubated ? 1 : g.verbal;
  if (!verbal) return null;
  return g.eye + verbal + g.motor;
}

// "E4 V5 M6 = 15" or, intubated, "E4 VT M6 = 11T".
export function gcsLabel(g: GcsParts): string | null {
  const total = gcsTotal(g);
  if (total == null) return null;
  return g.intubated
    ? `E${g.eye} VT M${g.motor} = ${total}T`
    : `E${g.eye} V${g.verbal} M${g.motor} = ${total}`;
}

export const GCS_EYE = [
  { value: 4, label: 'Spontaneous' },
  { value: 3, label: 'To speech' },
  { value: 2, label: 'To pain' },
  { value: 1, label: 'None' },
];
export const GCS_VERBAL = [
  { value: 5, label: 'Oriented' },
  { value: 4, label: 'Confused' },
  { value: 3, label: 'Words' },
  { value: 2, label: 'Sounds' },
  { value: 1, label: 'None' },
];
export const GCS_MOTOR = [
  { value: 6, label: 'Obeys commands' },
  { value: 5, label: 'Localises pain' },
  { value: 4, label: 'Withdraws' },
  { value: 3, label: 'Abnormal flexion' },
  { value: 2, label: 'Extension' },
  { value: 1, label: 'None' },
];

// Richmond Agitation-Sedation Scale.
export const RASS_LEVELS = [
  { value: 4, label: 'Combative' },
  { value: 3, label: 'Very agitated' },
  { value: 2, label: 'Agitated' },
  { value: 1, label: 'Restless' },
  { value: 0, label: 'Alert and calm' },
  { value: -1, label: 'Drowsy' },
  { value: -2, label: 'Light sedation' },
  { value: -3, label: 'Moderate sedation' },
  { value: -4, label: 'Deep sedation' },
  { value: -5, label: 'Unarousable' },
];

export function rassLabel(value?: number | null): string | null {
  if (value == null) return null;
  const level = RASS_LEVELS.find(l => l.value === value);
  return level ? `${value > 0 ? '+' : ''}${value} ${level.label}` : null;
}

// ── SOFA ────────────────────────────────────────────────────────

export type VasopressorLevel =
  | 'none'
  | 'dopamine_le5_or_dobutamine'   // dopamine ≤ 5 or dobutamine (any dose)
  | 'dopamine_gt5_or_epi_ne_le01'  // dopamine > 5, or epinephrine/norepinephrine ≤ 0.1
  | 'dopamine_gt15_or_epi_ne_gt01'; // dopamine > 15, or epinephrine/norepinephrine > 0.1 (µg/kg/min)

export interface SofaInputs {
  pfRatio?: number | null;            // PaO2/FiO2, mmHg
  respiratorySupport?: boolean | null; // ventilated / on respiratory support
  platelets?: number | null;          // ×10³/µL
  bilirubin?: number | null;          // mg/dL
  map?: number | null;                // mmHg
  vasopressors?: VasopressorLevel | null;
  gcs?: number | null;
  creatinine?: number | null;         // mg/dL
  urineOutputMlDay?: number | null;
}

export interface SofaResult {
  total: number;
  // Points per organ system; null when the data needed is missing.
  components: {
    respiration: number | null;
    coagulation: number | null;
    liver: number | null;
    cardiovascular: number | null;
    cns: number | null;
    renal: number | null;
  };
  // Names of the components that could not be scored.
  missing: string[];
}

const has = (v: number | null | undefined): v is number => v !== null && v !== undefined && isFinite(v);

export function sofaRespiration(pf?: number | null, support?: boolean | null): number | null {
  if (!has(pf)) return null;
  if (pf >= 400) return 0;
  if (pf >= 300) return 1;
  if (pf >= 200) return 2;
  // Scores of 3 and 4 need respiratory support; without it the maximum is 2.
  if (!support) return 2;
  return pf >= 100 ? 3 : 4;
}

export function sofaCoagulation(platelets?: number | null): number | null {
  if (!has(platelets)) return null;
  if (platelets >= 150) return 0;
  if (platelets >= 100) return 1;
  if (platelets >= 50) return 2;
  if (platelets >= 20) return 3;
  return 4;
}

export function sofaLiver(bilirubin?: number | null): number | null {
  if (!has(bilirubin)) return null;
  if (bilirubin < 1.2) return 0;
  if (bilirubin < 2.0) return 1;
  if (bilirubin < 6.0) return 2;
  if (bilirubin < 12.0) return 3;
  return 4;
}

export function sofaCardiovascular(map?: number | null, vasopressors?: VasopressorLevel | null): number | null {
  if (vasopressors === 'dopamine_gt15_or_epi_ne_gt01') return 4;
  if (vasopressors === 'dopamine_gt5_or_epi_ne_le01') return 3;
  if (vasopressors === 'dopamine_le5_or_dobutamine') return 2;
  if (!has(map)) return null;
  return map < 70 ? 1 : 0;
}

export function sofaCns(gcs?: number | null): number | null {
  if (!has(gcs)) return null;
  if (gcs >= 15) return 0;
  if (gcs >= 13) return 1;
  if (gcs >= 10) return 2;
  if (gcs >= 6) return 3;
  return 4;
}

export function sofaRenal(creatinine?: number | null, urineOutputMlDay?: number | null): number | null {
  let byCreatinine: number | null = null;
  if (has(creatinine)) {
    if (creatinine < 1.2) byCreatinine = 0;
    else if (creatinine < 2.0) byCreatinine = 1;
    else if (creatinine < 3.5) byCreatinine = 2;
    else if (creatinine < 5.0) byCreatinine = 3;
    else byCreatinine = 4;
  }
  let byUrine: number | null = null;
  if (has(urineOutputMlDay)) {
    if (urineOutputMlDay < 200) byUrine = 4;
    else if (urineOutputMlDay < 500) byUrine = 3;
    else byUrine = 0;
  }
  if (byCreatinine === null && byUrine === null) return null;
  // The worse of the two criteria counts.
  return Math.max(byCreatinine ?? 0, byUrine ?? 0);
}

export function sofa(inputs: SofaInputs): SofaResult {
  const components = {
    respiration: sofaRespiration(inputs.pfRatio, inputs.respiratorySupport),
    coagulation: sofaCoagulation(inputs.platelets),
    liver: sofaLiver(inputs.bilirubin),
    cardiovascular: sofaCardiovascular(inputs.map, inputs.vasopressors),
    cns: sofaCns(inputs.gcs),
    renal: sofaRenal(inputs.creatinine, inputs.urineOutputMlDay),
  };
  const missing: string[] = [];
  let total = 0;
  for (const key of Object.keys(components) as Array<keyof typeof components>) {
    const points = components[key];
    if (points === null) missing.push(key);
    else total += points;
  }
  return { total, components, missing };
}

// ── APACHE II ───────────────────────────────────────────────────

export type ChronicHealth = 'none' | 'elective_postoperative' | 'nonoperative_or_emergency';

export interface Apache2Inputs {
  temperature?: number | null;   // °C (core)
  map?: number | null;           // mmHg
  heartRate?: number | null;
  respiratoryRate?: number | null;
  fio2Percent?: number | null;   // 21-100
  pao2?: number | null;          // mmHg
  paco2?: number | null;         // mmHg (needed when FiO2 ≥ 50 %)
  arterialPh?: number | null;
  bicarbonate?: number | null;   // serum HCO3 mmol/L — used only when there is no arterial pH
  sodium?: number | null;        // mmol/L
  potassium?: number | null;     // mmol/L
  creatinine?: number | null;    // mg/dL
  acuteRenalFailure?: boolean | null; // doubles the creatinine points
  hematocrit?: number | null;    // %
  wbc?: number | null;           // ×10³/mm³
  gcs?: number | null;
  ageYears?: number | null;
  chronicHealth?: ChronicHealth | null;
}

export interface Apache2Result {
  total: number;
  aps: number;          // acute physiology score
  agePoints: number;
  chronicPoints: number;
  components: Record<string, number | null>;
  missing: string[];
}

// Alveolar–arterial oxygen gradient at sea level (mmHg).
export function aaGradient(fio2Percent: number, pao2: number, paco2: number): number {
  return (fio2Percent / 100) * (760 - 47) - paco2 / 0.8 - pao2;
}

function apTemperature(t?: number | null): number | null {
  if (!has(t)) return null;
  if (t >= 41) return 4;
  if (t >= 39) return 3;
  if (t >= 38.5) return 1;
  if (t >= 36) return 0;
  if (t >= 34) return 1;
  if (t >= 32) return 2;
  if (t >= 30) return 3;
  return 4;
}

function apMap(m?: number | null): number | null {
  if (!has(m)) return null;
  if (m >= 160) return 4;
  if (m >= 130) return 3;
  if (m >= 110) return 2;
  if (m >= 70) return 0;
  if (m >= 50) return 2;
  return 4;
}

function apHeartRate(hr?: number | null): number | null {
  if (!has(hr)) return null;
  if (hr >= 180) return 4;
  if (hr >= 140) return 3;
  if (hr >= 110) return 2;
  if (hr >= 70) return 0;
  if (hr >= 55) return 2;
  if (hr >= 40) return 3;
  return 4;
}

function apRespiratoryRate(rr?: number | null): number | null {
  if (!has(rr)) return null;
  if (rr >= 50) return 4;
  if (rr >= 35) return 3;
  if (rr >= 25) return 1;
  if (rr >= 12) return 0;
  if (rr >= 10) return 1;
  if (rr >= 6) return 2;
  return 4;
}

function apOxygenation(fio2?: number | null, pao2?: number | null, paco2?: number | null): number | null {
  if (!has(fio2) || !has(pao2)) return null;
  if (fio2 >= 50) {
    if (!has(paco2)) return null;
    const gradient = aaGradient(fio2, pao2, paco2);
    if (gradient >= 500) return 4;
    if (gradient >= 350) return 3;
    if (gradient >= 200) return 2;
    return 0;
  }
  if (pao2 > 70) return 0;
  if (pao2 >= 61) return 1;
  if (pao2 >= 55) return 3;
  return 4;
}

function apPh(ph?: number | null): number | null {
  if (!has(ph)) return null;
  if (ph >= 7.7) return 4;
  if (ph >= 7.6) return 3;
  if (ph >= 7.5) return 1;
  if (ph >= 7.33) return 0;
  if (ph >= 7.25) return 2;
  if (ph >= 7.15) return 3;
  return 4;
}

function apBicarbonate(hco3?: number | null): number | null {
  if (!has(hco3)) return null;
  if (hco3 >= 52) return 4;
  if (hco3 >= 41) return 3;
  if (hco3 >= 32) return 1;
  if (hco3 >= 22) return 0;
  if (hco3 >= 18) return 2;
  if (hco3 >= 15) return 3;
  return 4;
}

function apSodium(na?: number | null): number | null {
  if (!has(na)) return null;
  if (na >= 180) return 4;
  if (na >= 160) return 3;
  if (na >= 155) return 2;
  if (na >= 150) return 1;
  if (na >= 130) return 0;
  if (na >= 120) return 2;
  if (na >= 111) return 3;
  return 4;
}

function apPotassium(k?: number | null): number | null {
  if (!has(k)) return null;
  if (k >= 7) return 4;
  if (k >= 6) return 3;
  if (k >= 5.5) return 1;
  if (k >= 3.5) return 0;
  if (k >= 3) return 1;
  if (k >= 2.5) return 2;
  return 4;
}

function apCreatinine(cr?: number | null, acuteRenalFailure?: boolean | null): number | null {
  if (!has(cr)) return null;
  let points: number;
  if (cr >= 3.5) points = 4;
  else if (cr >= 2) points = 3;
  else if (cr >= 1.5) points = 2;
  else if (cr >= 0.6) points = 0;
  else points = 2;
  return acuteRenalFailure ? points * 2 : points;
}

function apHematocrit(hct?: number | null): number | null {
  if (!has(hct)) return null;
  if (hct >= 60) return 4;
  if (hct >= 50) return 2;
  if (hct >= 46) return 1;
  if (hct >= 30) return 0;
  if (hct >= 20) return 2;
  return 4;
}

function apWbc(wbc?: number | null): number | null {
  if (!has(wbc)) return null;
  if (wbc >= 40) return 4;
  if (wbc >= 20) return 2;
  if (wbc >= 15) return 1;
  if (wbc >= 3) return 0;
  if (wbc >= 1) return 2;
  return 4;
}

export function apacheAgePoints(age?: number | null): number {
  if (!has(age)) return 0;
  if (age >= 75) return 6;
  if (age >= 65) return 5;
  if (age >= 55) return 3;
  if (age >= 45) return 2;
  return 0;
}

export function apacheChronicPoints(chronic?: ChronicHealth | null): number {
  if (chronic === 'nonoperative_or_emergency') return 5;
  if (chronic === 'elective_postoperative') return 2;
  return 0;
}

export function apache2(inputs: Apache2Inputs): Apache2Result {
  const components: Record<string, number | null> = {
    temperature: apTemperature(inputs.temperature),
    map: apMap(inputs.map),
    heartRate: apHeartRate(inputs.heartRate),
    respiratoryRate: apRespiratoryRate(inputs.respiratoryRate),
    oxygenation: apOxygenation(inputs.fio2Percent, inputs.pao2, inputs.paco2),
    // Arterial pH is preferred; serum bicarbonate stands in when there is no ABG.
    acidBase: has(inputs.arterialPh) ? apPh(inputs.arterialPh) : apBicarbonate(inputs.bicarbonate),
    sodium: apSodium(inputs.sodium),
    potassium: apPotassium(inputs.potassium),
    creatinine: apCreatinine(inputs.creatinine, inputs.acuteRenalFailure),
    hematocrit: apHematocrit(inputs.hematocrit),
    wbc: apWbc(inputs.wbc),
    gcs: has(inputs.gcs) ? 15 - inputs.gcs : null,
  };
  const missing: string[] = [];
  let aps = 0;
  for (const key of Object.keys(components)) {
    const points = components[key];
    if (points === null) missing.push(key);
    else aps += points;
  }
  if (!has(inputs.ageYears)) missing.push('age');
  const agePoints = apacheAgePoints(inputs.ageYears);
  const chronicPoints = apacheChronicPoints(inputs.chronicHealth);
  return { total: aps + agePoints + chronicPoints, aps, agePoints, chronicPoints, components, missing };
}

// ── Lab values used by the scores ───────────────────────────────

// Names under which each value appears on lab reports (lower-case, no spaces or dots).
const LAB_ALIASES: Record<string, string[]> = {
  platelets: ['plt', 'platelet', 'platelets', 'plateletcount', 'pltcount'],
  bilirubin: ['tbil', 'tsb', 'totalbilirubin', 'bilirubintotal', 'bilirubin', 'tbilirubin', 'stbilirubin', 'totalserumbilirubin'],
  creatinine: ['creatinine', 'screatinine', 'serumcreatinine', 'creat', 'crea', 'cr'],
  sodium: ['na', 'sodium', 'na+', 'ssodium', 'serumsodium'],
  potassium: ['k', 'potassium', 'k+', 'spotassium', 'serumpotassium'],
  hematocrit: ['hct', 'hematocrit', 'haematocrit', 'pcv'],
  wbc: ['wbc', 'wbcs', 'whitebloodcells', 'whitecellcount', 'tlc', 'wbccount', 'totalwbc'],
  pao2: ['pao2', 'po2'],
  paco2: ['paco2', 'pco2'],
  ph: ['ph'],
  bicarbonate: ['hco3', 'bicarbonate', 'hco3-', 'chco3'],
};

const normaliseName = (name: string) => name.toLowerCase().replace(/[\s._()\-:/]/g, '');

// Finds a named value in one lab result object ({ "Hb": 12.5 } or
// { "Hb": { value: 12.5, unit: "g/dL" } }). Returns null when it is not there.
export function findLabValue(result: unknown, key: keyof typeof LAB_ALIASES | string): number | null {
  if (!result || typeof result !== 'object') return null;
  const aliases = LAB_ALIASES[key] || [normaliseName(String(key))];
  for (const [name, raw] of Object.entries(result as Record<string, unknown>)) {
    if (!aliases.includes(normaliseName(name))) continue;
    const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).value : raw;
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
    if (isFinite(n)) return n;
  }
  return null;
}
