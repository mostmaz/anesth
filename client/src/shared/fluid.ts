// GENERATED from /shared/src — do not edit here. Run: node scripts/sync-shared.mjs

// Fluid balance from the intake/output chart.

import { chartDayWindow, previousShiftWindow, shiftWindowAt } from './time';
import type { ShiftType, TimeWindow } from './time';

export interface FluidEntryLike {
  type: string;        // INPUT | OUTPUT (the phone app also uses IN | OUT)
  amount: number;      // mL
  timestamp: string | Date;
  category?: string | null;
}

export interface FluidTotals {
  input: number;
  output: number;
  balance: number;
  urine: number;
  // mL per category, largest first.
  inputByCategory: Array<{ category: string; amount: number }>;
  outputByCategory: Array<{ category: string; amount: number }>;
}

const isInput = (type: string) => type === 'INPUT' || type === 'IN';
const isOutput = (type: string) => type === 'OUTPUT' || type === 'OUT';

export function isUrine(category?: string | null): boolean {
  const c = (category || '').toLowerCase();
  return c.includes('urine') || c.includes('uop') || c.includes('بول') || c.includes('ادرار') || c.includes('إدرار');
}

// Infusion volumes are charted as "Infusion · <drug>" and IV drug volumes as
// "IV · <drug>"; group each family so the breakdown stays readable.
function categoryGroup(category?: string | null): string {
  const c = (category || 'Other').trim() || 'Other';
  if (/^infusion\s*·/i.test(c)) return 'Infusions';
  if (/^iv\s*·/i.test(c)) return 'IV drugs';
  return c;
}

function sorted(map: Map<string, number>): Array<{ category: string; amount: number }> {
  return Array.from(map, ([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);
}

// Totals for the entries whose time falls in [from, to). Either bound may be omitted.
export function fluidTotals(entries: FluidEntryLike[], from?: Date | null, to?: Date | null): FluidTotals {
  let input = 0;
  let output = 0;
  let urine = 0;
  const ins = new Map<string, number>();
  const outs = new Map<string, number>();

  for (const e of entries) {
    const t = new Date(e.timestamp).getTime();
    const amount = Number(e.amount);
    if (isNaN(t) || !isFinite(amount)) continue;
    if (from && t < from.getTime()) continue;
    if (to && t >= to.getTime()) continue;
    const group = categoryGroup(e.category);
    if (isInput(e.type)) {
      input += amount;
      ins.set(group, (ins.get(group) || 0) + amount);
    } else if (isOutput(e.type)) {
      output += amount;
      outs.set(group, (outs.get(group) || 0) + amount);
      if (isUrine(e.category)) urine += amount;
    }
  }

  return {
    input: Math.round(input),
    output: Math.round(output),
    balance: Math.round(input - output),
    urine: Math.round(urine),
    inputByCategory: sorted(ins),
    outputByCategory: sorted(outs),
  };
}

export interface FluidPeriod {
  key: 'shift' | 'previousShift' | 'last24h' | 'chartDay' | 'cumulative';
  window: Partial<TimeWindow>;
  shiftType?: ShiftType;
  totals: FluidTotals;
  // Urine output in mL/kg/h over the elapsed part of the window (needs weight).
  urineMlKgHr: number | null;
}

function urineRate(urine: number, start: Date | undefined, end: Date, weightKg?: number | null): number | null {
  if (!weightKg || weightKg <= 0 || !start) return null;
  const hours = (end.getTime() - start.getTime()) / 3_600_000;
  if (hours < 1) return null;
  return Math.round((urine / weightKg / hours) * 100) / 100;
}

// The standard set of balances shown on the chart: this shift, the previous
// shift, the last 24 hours, the chart day (08:00–08:00) and the whole stay.
export function fluidSummary(
  entries: FluidEntryLike[],
  now: Date = new Date(),
  options: { weightKg?: number | null; admittedAt?: string | Date | null } = {},
): FluidPeriod[] {
  const shift = shiftWindowAt(now);
  const previous = previousShiftWindow(shift);
  const day = chartDayWindow(now);
  const last24Start = new Date(now.getTime() - 24 * 3_600_000);
  const admitted = options.admittedAt ? new Date(options.admittedAt) : undefined;
  const stayStart = admitted && !isNaN(admitted.getTime()) ? admitted : undefined;

  const period = (
    key: FluidPeriod['key'],
    start: Date | undefined,
    end: Date | undefined,
    shiftType?: ShiftType,
  ): FluidPeriod => {
    const totals = fluidTotals(entries, start, end);
    // Rate over the part of the window that has actually elapsed.
    const elapsedEnd = end && end.getTime() < now.getTime() ? end : now;
    return {
      key,
      window: { start, end },
      shiftType,
      totals,
      urineMlKgHr: urineRate(totals.urine, start, elapsedEnd, options.weightKg),
    };
  };

  return [
    period('shift', shift.start, shift.end, shift.type),
    period('previousShift', previous.start, previous.end, previous.type),
    period('last24h', last24Start, undefined),
    period('chartDay', day.start, day.end),
    period('cumulative', stayStart, undefined),
  ];
}

// "+450 mL" / "−1,200 mL".
export function formatBalance(ml: number): string {
  const sign = ml > 0 ? '+' : ml < 0 ? '−' : '';
  return `${sign}${Math.abs(Math.round(ml)).toLocaleString('en-US')} mL`;
}
