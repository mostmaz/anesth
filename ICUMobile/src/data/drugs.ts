// Drug categorisation + catalog shared across Overview / MAR.

// Vasoactive / inotrope "support" drugs — surfaced in the patient Overview.
export const SUPPORT_DRUGS = [
  'norepinephrine', 'noradrenaline', 'levophed',
  'adrenaline', 'epinephrine',
  'dobutamine',
  'dopamine',
  'milrinone',
  'vasopressin',
  'phenylephrine',
  'dopexamine',
  'levosimendan',
  'isoprenaline', 'isoproterenol',
  'amiodarone', 'cordarone',
];

// Sedation / paralytic infusions — the MAR asks for the current ml/hr rate.
export const SEDATION_INFUSIONS = [
  'propofol',
  'rocuronium',
  'atracurium',
  'remifentanil',
  'midazolam',
];

const norm = (s: string) => (s || '').toLowerCase().trim();

export function isSupportDrug(name: string): boolean {
  const n = norm(name);
  return SUPPORT_DRUGS.some(d => n.includes(d));
}

export function isSedationInfusion(name: string): boolean {
  const n = norm(name);
  return SEDATION_INFUSIONS.some(d => n.includes(d));
}

// Common ICU drugs for the Add-medication suggestions (mirrors the web app).
export const COMMON_ICU_DRUGS: Array<{ name: string; defaultDose: string; defaultRoute: string }> = [
  { name: 'Norepinephrine', defaultDose: '0.05 mcg/kg/min', defaultRoute: 'Infusion' },
  { name: 'Adrenaline', defaultDose: '0.05 mcg/kg/min', defaultRoute: 'Infusion' },
  { name: 'Dobutamine', defaultDose: '5 mcg/kg/min', defaultRoute: 'Infusion' },
  { name: 'Milrinone', defaultDose: '0.375 mcg/kg/min', defaultRoute: 'Infusion' },
  { name: 'Amiodarone', defaultDose: '150 mg', defaultRoute: 'IV' },
  { name: 'Propofol', defaultDose: '10 mg/ml', defaultRoute: 'Infusion' },
  { name: 'Midazolam', defaultDose: '2 mg', defaultRoute: 'Infusion' },
  { name: 'Remifentanil', defaultDose: '0.1 mcg/kg/min', defaultRoute: 'Infusion' },
  { name: 'Rocuronium', defaultDose: '0.6 mg/kg', defaultRoute: 'Infusion' },
  { name: 'Atracurium', defaultDose: '0.5 mg/kg', defaultRoute: 'Infusion' },
  { name: 'Fentanyl', defaultDose: '50 mcg', defaultRoute: 'IV' },
  { name: 'Hydrocortisone', defaultDose: '100 mg', defaultRoute: 'IV' },
  { name: 'Pantoprazole', defaultDose: '40 mg', defaultRoute: 'IV' },
  { name: 'Meropenem', defaultDose: '1 g', defaultRoute: 'IV' },
  { name: 'Piperacillin/Tazobactam', defaultDose: '4.5 g', defaultRoute: 'IV' },
  { name: 'Vancomycin', defaultDose: '1 g', defaultRoute: 'IV' },
  { name: 'Furosemide', defaultDose: '20 mg', defaultRoute: 'IV' },
  { name: 'Insulin Actrapid', defaultDose: '10 units', defaultRoute: 'SC' },
  { name: 'Paracetamol', defaultDose: '1 g', defaultRoute: 'IV' },
  { name: 'Enoxaparin', defaultDose: '40 mg', defaultRoute: 'SC' },
];

export const DRUG_ROUTES = ['IV', 'Infusion', 'PO', 'NG', 'IM', 'SC', 'NEB', 'Intranasal', 'LOCAL', 'EYE_DROP'];

export const DRUG_FREQUENCIES: Array<{ value: string; label: string }> = [
  { value: 'OD (Once Daily)', label: 'OD' },
  { value: 'BD (Twice Daily)', label: 'BD' },
  { value: 'TDS (Thrice Daily)', label: 'TDS' },
  { value: 'QID (Four times)', label: 'QID' },
  { value: '6x/Day (Q4H)', label: 'Q4H' },
  { value: 'Infusion', label: 'Infusion' },
  { value: 'Once Only', label: 'Once Only' },
];

// Frequency → number of doses per day (null = infusion/PRN/unknown).
export function freqTimesPerDay(freq?: string): number | null {
  const s = (freq || '').toLowerCase().trim();
  if (!s || s.includes('infusion') || s.includes('prn')) return null;
  if (s.includes('once only')) return 1;
  if (/(^|\b)od\b|once daily/.test(s)) return 1;
  if (/(^|\b)bd\b|twice/.test(s)) return 2;
  if (/(^|\b)tds\b|thrice|three times/.test(s)) return 3;
  if (/(^|\b)qid\b|four times/.test(s)) return 4;
  if (/(^|\b)q12h\b/.test(s)) return 2;
  if (/(^|\b)q8h\b/.test(s)) return 3;
  if (/(^|\b)q6h\b/.test(s)) return 4;
  if (/5\s*x|5 ?times|five times/.test(s)) return 5;
  if (/6\s*x|q4h|six times/.test(s)) return 6;
  const m = s.match(/^(\d+)\b/);
  if (m) { const n = parseInt(m[1], 10); return n >= 1 && n <= 12 ? n : null; }
  return null;
}
// Frequency shown as X1 / X2 / X3 … (or Infusion / PRN).
export function freqDisplay(freq?: string): string {
  const n = freqTimesPerDay(freq);
  if (n) return `X${n}`;
  if ((freq || '').toLowerCase().includes('infusion')) return 'Infusion';
  return freq || 'PRN';
}
// Earliest "Given" administration (the drug's first actual dose). The dose schedule
// keys off this — not the MAR-prescription time — so the cadence follows when the drug
// was really first given. Returns undefined until a dose has been charted.
export function firstGivenAt(history?: Array<{ status: string; t: string | Date }>): Date | undefined {
  if (!history?.length) return undefined;
  const given = history
    .filter(h => h.status === 'Given')
    .map(h => new Date(h.t))
    .filter(d => !isNaN(d.getTime()));
  if (!given.length) return undefined;
  return given.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}
// Scheduled dose clock-times ("HH:00"), spread over 24h from the anchor hour (rounded
// to the nearest hour). Anchor = first-given time. e.g. BD first given 14:25 → 14:00, 02:00.
export function doseSchedule(anchorTime?: string | Date, freq?: string): string[] {
  const n = freqTimesPerDay(freq);
  if (!n || !anchorTime) return [];
  const d = new Date(anchorTime);
  if (isNaN(d.getTime())) return [];
  const anchor = Math.round((d.getHours() * 60 + d.getMinutes()) / 60) % 24;
  const step = 24 / n;
  return Array.from({ length: n }, (_, i) => `${String(Math.round(anchor + i * step) % 24).padStart(2, '0')}:00`);
}
