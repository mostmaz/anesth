// Dose frequency, schedule and overdue logic for the MAR. One copy, used by the
// web app, the phone app and the server's overdue-dose job.

export interface AdministrationLike {
  status: string;
  // Actual time the dose was given (or held).
  timestamp: string | Date;
  dose?: string | null;
}

export interface MedicationLike {
  route?: string | null;
  frequency?: string | null;
  isActive?: boolean;
  startedAt?: string | Date | null;
  administrations?: AdministrationLike[];
}

// Frequency → number of doses per day. Handles labels ("OD (Once Daily)",
// "TDS (Thrice Daily)"), short codes and plain numbers. null = infusion/PRN/unknown.
export function freqTimesPerDay(freq?: string | null): number | null {
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
export function freqDisplay(freq?: string | null): string {
  const n = freqTimesPerDay(freq);
  if (n) return `X${n}`;
  if ((freq || '').toLowerCase().includes('infusion')) return 'Infusion';
  return freq || 'PRN';
}

export function isOnceOnly(freq?: string | null): boolean {
  return (freq || '').toLowerCase().includes('once only');
}

// A drug counts as an infusion by its route (or the legacy frequency label).
export function isInfusion(med: { route?: string | null; frequency?: string | null }): boolean {
  return med.route === 'Infusion' || (med.frequency || '').toLowerCase() === 'infusion';
}

function validDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

// Earliest "Given" administration (the drug's first actual dose). The dose
// schedule keys off this — not the prescription time — so the cadence follows
// when the drug was really first given. undefined until a dose has been charted.
export function firstGivenAt(administrations?: AdministrationLike[] | null): Date | undefined {
  if (!administrations?.length) return undefined;
  let first: Date | undefined;
  for (const a of administrations) {
    if (a.status !== 'Given') continue;
    const d = validDate(a.timestamp);
    if (d && (!first || d.getTime() < first.getTime())) first = d;
  }
  return first;
}

// The hours of the day (0-23) at which doses fall: evenly spread over 24 h from
// the anchor time rounded to the nearest hour.
export function doseSlotHours(anchorTime?: string | Date | null, freq?: string | null): number[] {
  const n = freqTimesPerDay(freq);
  const d = validDate(anchorTime);
  if (!n || !d) return [];
  const anchor = Math.round((d.getHours() * 60 + d.getMinutes()) / 60) % 24;
  const step = 24 / n;
  return Array.from({ length: n }, (_, i) => Math.round(anchor + i * step) % 24);
}

// Scheduled dose clock-times ("HH:00"). e.g. BD first given 14:25 → 14:00, 02:00.
export function doseSchedule(anchorTime?: string | Date | null, freq?: string | null): string[] {
  return doseSlotHours(anchorTime, freq).map(h => `${String(h).padStart(2, '0')}:00`);
}

export interface DueDose {
  // When the dose was due.
  dueAt: Date;
  // Minutes past the due time (0 or more).
  overdueMinutes: number;
  // true when no dose of this drug has been charted yet.
  firstDose: boolean;
}

export const OVERDUE_GRACE_MINUTES = 30;
// A newly prescribed drug gets longer before its first dose counts as late.
export const FIRST_DOSE_GRACE_MINUTES = 60;

// Is a scheduled dose overdue right now?
//
// The latest scheduled time that has passed is "covered" when any entry (Given,
// Held or NotGiven) was charted from half an interval before it onwards. If it
// is not covered and the grace period has passed, the dose is overdue.
// Returns null for infusions, PRN drugs, stopped drugs and doses that are on time.
export function overdueDose(med: MedicationLike, now: Date = new Date()): DueDose | null {
  if (med.isActive === false) return null;
  if (isInfusion(med)) return null;
  const perDay = freqTimesPerDay(med.frequency);
  if (!perDay) return null;

  const administrations = med.administrations || [];
  const anchor = firstGivenAt(administrations);

  if (!anchor) {
    // Nothing given yet: the first dose is due from the prescription time,
    // unless it has been explicitly held / marked not given since then.
    const started = validDate(med.startedAt);
    if (!started) return null;
    const handled = administrations.some(a => {
      const t = validDate(a.timestamp);
      return !!t && t.getTime() >= started.getTime();
    });
    if (handled) return null;
    const minutes = Math.floor((now.getTime() - started.getTime()) / 60_000);
    if (minutes < FIRST_DOSE_GRACE_MINUTES) return null;
    return { dueAt: started, overdueMinutes: minutes, firstDose: true };
  }

  // A once-only drug has nothing further due after its single dose.
  if (isOnceOnly(med.frequency)) return null;

  const intervalMs = (24 / perDay) * 60 * 60_000;
  const hours = doseSlotHours(anchor, med.frequency);

  // Candidate slot times over yesterday, today and tomorrow; take the latest one
  // that has already passed and falls after the first dose.
  let latest: Date | undefined;
  for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
    for (const hour of hours) {
      const slot = new Date(now);
      slot.setDate(slot.getDate() + dayOffset);
      slot.setHours(hour, 0, 0, 0);
      if (slot.getTime() > now.getTime()) continue;
      if (slot.getTime() <= anchor.getTime() + intervalMs / 2) continue;
      if (!latest || slot.getTime() > latest.getTime()) latest = slot;
    }
  }
  if (!latest) return null;

  const coveredFrom = latest.getTime() - intervalMs / 2;
  const covered = administrations.some(a => {
    const t = validDate(a.timestamp);
    return !!t && t.getTime() >= coveredFrom;
  });
  if (covered) return null;

  const minutes = Math.floor((now.getTime() - latest.getTime()) / 60_000);
  if (minutes < OVERDUE_GRACE_MINUTES) return null;
  return { dueAt: latest, overdueMinutes: minutes, firstDose: false };
}

// "45 min", "2 h 10 min", "1 d 3 h".
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const rest = minutes % 60;
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} d ${restHours} h` : `${days} d`;
}

// Administration statuses that mean "infusion paused" / "infusion running again".
export const STATUS_PAUSED = 'Paused';
export const STATUS_RESUMED = 'Resumed';

// Is this infusion currently paused? `administrations` must be newest first.
// Older records stored a pause as status "Held" with the word "Paused" as dose.
export function isInfusionPaused(med: MedicationLike): boolean {
  if (!isInfusion(med)) return false;
  const last = med.administrations?.[0];
  if (!last) return false;
  if (last.status === STATUS_PAUSED) return true;
  return last.status === 'Held' && (last.dose || '').toLowerCase().includes('paus');
}

// Entries that count as a dose actually given (a resumed infusion is not a new dose).
export function isGivenDose(a: AdministrationLike): boolean {
  return a.status === 'Given' && (a.dose || '').toLowerCase() !== 'resumed';
}

export interface ParsedDose {
  amount: number;
  unit: string;
}

// "40 mg" → { amount: 40, unit: "mg" }. Returns null for anything that is not a
// plain amount (rates such as "0.05 mcg/kg/min", ranges, free text).
export function parseDose(dose?: string | null): ParsedDose | null {
  const m = (dose || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(mcg|µg|ug|mg|g|units?|iu|mmol|meq|ml)$/i);
  if (!m) return null;
  const amount = parseFloat(m[1].replace(',', '.'));
  if (!isFinite(amount) || amount <= 0) return null;
  let unit = m[2].toLowerCase();
  if (unit === 'µg' || unit === 'ug') unit = 'mcg';
  if (unit === 'unit') unit = 'units';
  return { amount, unit };
}

// "40 mg" for a 70 kg patient → "0.57 mg/kg". null when it cannot be worked out.
export function dosePerKg(dose: string | null | undefined, weightKg: number | null | undefined): string | null {
  const parsed = parseDose(dose);
  if (!parsed || !weightKg || weightKg <= 0) return null;
  const perKg = parsed.amount / weightKg;
  const shown = perKg >= 10 ? perKg.toFixed(0) : perKg >= 1 ? perKg.toFixed(1) : perKg.toFixed(2);
  return `${shown} ${parsed.unit}/kg`;
}
