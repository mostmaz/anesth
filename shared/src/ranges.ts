// Limits used to reject values that cannot be real (typing slips such as a
// heart rate of 800), on the server and in the entry forms. These are *not*
// normal ranges — a very abnormal but possible value must still be chartable.

export interface NumberLimit {
  min: number;
  max: number;
  integer?: boolean;
  label: string;
  unit?: string;
}

export const VITAL_LIMITS: Record<string, NumberLimit> = {
  heartRate: { min: 0, max: 350, integer: true, label: 'Heart rate', unit: 'bpm' },
  bpSys: { min: 0, max: 350, integer: true, label: 'Systolic BP', unit: 'mmHg' },
  bpDia: { min: 0, max: 250, integer: true, label: 'Diastolic BP', unit: 'mmHg' },
  spo2: { min: 0, max: 100, integer: true, label: 'SpO₂', unit: '%' },
  temp: { min: 20, max: 45, label: 'Temperature', unit: '°C' },
  rr: { min: 0, max: 100, integer: true, label: 'Respiratory rate', unit: '/min' },
  rbs: { min: 0, max: 2000, label: 'Blood sugar', unit: 'mg/dL' },
  gcsEye: { min: 1, max: 4, integer: true, label: 'GCS eye' },
  gcsVerbal: { min: 1, max: 5, integer: true, label: 'GCS verbal' },
  gcsMotor: { min: 1, max: 6, integer: true, label: 'GCS motor' },
  rass: { min: -5, max: 4, integer: true, label: 'RASS' },
};

export const PAIN_SCALES: Record<string, NumberLimit> = {
  NRS: { min: 0, max: 10, integer: true, label: 'Pain (NRS)' },
  CPOT: { min: 0, max: 8, integer: true, label: 'Pain (CPOT)' },
  BPS: { min: 3, max: 12, integer: true, label: 'Pain (BPS)' },
};

export const VENT_LIMITS: Record<string, NumberLimit> = {
  rate: { min: 0, max: 80, integer: true, label: 'Rate', unit: '/min' },
  fio2: { min: 21, max: 100, integer: true, label: 'FiO₂', unit: '%' },
  ps: { min: 0, max: 60, integer: true, label: 'Pressure support', unit: 'cmH₂O' },
  vt: { min: 0, max: 2500, integer: true, label: 'Tidal volume', unit: 'mL' },
  peep: { min: 0, max: 40, label: 'PEEP', unit: 'cmH₂O' },
  plateau: { min: 0, max: 80, label: 'Plateau pressure', unit: 'cmH₂O' },
  pao2: { min: 10, max: 700, label: 'PaO₂', unit: 'mmHg' },
};

export const PATIENT_LIMITS: Record<string, NumberLimit> = {
  weightKg: { min: 0.3, max: 400, label: 'Weight', unit: 'kg' },
  heightCm: { min: 20, max: 260, label: 'Height', unit: 'cm' },
};

export const IO_AMOUNT_LIMIT: NumberLimit = { min: 0, max: 20000, label: 'Amount', unit: 'mL' };

// Returns a message when `value` is outside the limit, otherwise null.
// Empty values are fine here — whether a field is required is decided elsewhere.
export function limitProblem(value: unknown, limit: NumberLimit): string | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!isFinite(n)) return `${limit.label} must be a number`;
  if (limit.integer && !Number.isInteger(n)) return `${limit.label} must be a whole number`;
  if (n < limit.min || n > limit.max) {
    const unit = limit.unit ? ` ${limit.unit}` : '';
    return `${limit.label} must be between ${limit.min} and ${limit.max}${unit}`;
  }
  return null;
}

// Checks a set of vitals; returns every problem found.
export function vitalsProblems(v: Record<string, unknown>): string[] {
  const problems: string[] = [];
  for (const key of Object.keys(VITAL_LIMITS)) {
    const p = limitProblem(v[key], VITAL_LIMITS[key]);
    if (p) problems.push(p);
  }
  const sys = Number(v.bpSys);
  const dia = Number(v.bpDia);
  if (v.bpSys != null && v.bpSys !== '' && v.bpDia != null && v.bpDia !== '' && isFinite(sys) && isFinite(dia) && dia > sys) {
    problems.push('Diastolic BP cannot be higher than systolic BP');
  }
  if (v.painScore != null && v.painScore !== '') {
    const scale = PAIN_SCALES[String(v.painScale || 'NRS').toUpperCase()];
    if (!scale) problems.push('Unknown pain scale');
    else { const p = limitProblem(v.painScore, scale); if (p) problems.push(p); }
  }
  return problems;
}
