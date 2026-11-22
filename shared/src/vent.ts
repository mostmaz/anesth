// Ventilation calculations. Results are aids for the clinician, not diagnoses.

// PaO2 / FiO2 ratio (mmHg). fio2Percent is 21–100.
export function pfRatio(pao2?: number | null, fio2Percent?: number | null): number | null {
  if (!pao2 || !fio2Percent || pao2 <= 0 || fio2Percent < 21 || fio2Percent > 100) return null;
  return Math.round(pao2 / (fio2Percent / 100));
}

export type OxygenationBand = 'normal' | 'mild' | 'moderate' | 'severe';

// Bands of the P/F ratio as used by the Berlin definition (which also needs
// PEEP ≥ 5, timing, imaging and origin of oedema — so this is the range only).
export function oxygenationBand(pf?: number | null): OxygenationBand | null {
  if (pf == null || pf <= 0) return null;
  if (pf > 300) return 'normal';
  if (pf > 200) return 'mild';
  if (pf > 100) return 'moderate';
  return 'severe';
}

// Driving pressure = plateau pressure − PEEP (cmH2O).
export function drivingPressure(plateau?: number | null, peep?: number | null): number | null {
  if (plateau == null || peep == null) return null;
  const dp = plateau - peep;
  return dp > 0 ? Math.round(dp * 10) / 10 : null;
}

export const DRIVING_PRESSURE_LIMIT = 15;
export const PLATEAU_PRESSURE_LIMIT = 30;

// Predicted body weight (kg), ARDSNet formula. Height in cm.
export function predictedBodyWeight(heightCm?: number | null, gender?: string | null): number | null {
  if (!heightCm || heightCm < 120 || heightCm > 230) return null;
  const g = (gender || '').trim().toLowerCase();
  const female = g.startsWith('f') || g === 'أنثى' || g === 'انثى';
  const male = g.startsWith('m') || g === 'ذكر';
  if (!female && !male) return null;
  const pbw = (female ? 45.5 : 50) + 0.91 * (heightCm - 152.4);
  return Math.round(pbw * 10) / 10;
}

// Tidal volume per kg of predicted body weight.
export function vtPerKgPbw(vtMl?: number | null, pbwKg?: number | null): number | null {
  if (!vtMl || !pbwKg || vtMl <= 0 || pbwKg <= 0) return null;
  return Math.round((vtMl / pbwKg) * 10) / 10;
}

export const VT_PER_KG_UPPER = 8;
export const VT_PER_KG_TARGET_LOW = 6;

// The 6–8 mL/kg PBW tidal-volume range, in mL.
export function vtTargetRange(pbwKg?: number | null): { low: number; high: number } | null {
  if (!pbwKg || pbwKg <= 0) return null;
  return { low: Math.round(pbwKg * VT_PER_KG_TARGET_LOW), high: Math.round(pbwKg * VT_PER_KG_UPPER) };
}

// Static compliance = Vt / (plateau − PEEP), mL/cmH2O.
export function staticCompliance(vtMl?: number | null, plateau?: number | null, peep?: number | null): number | null {
  const dp = drivingPressure(plateau, peep);
  if (!vtMl || vtMl <= 0 || !dp) return null;
  return Math.round(vtMl / dp);
}

// Body-mass index.
export function bmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) return null;
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

// Mean arterial pressure from systolic / diastolic.
export function meanArterialPressure(sys?: number | null, dia?: number | null): number | null {
  if (!sys || !dia || sys <= 0 || dia <= 0 || dia > sys) return null;
  return Math.round(dia + (sys - dia) / 3);
}
