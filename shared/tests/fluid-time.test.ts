import { describe, expect, it } from 'vitest';
import { fluidSummary, fluidTotals, formatBalance, isUrine } from '../src/fluid';
import { ageYears, chartDayWindow, dayOfStay, previousShiftWindow, shiftWindowAt } from '../src/time';

const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute, 0, 0);

describe('shift windows', () => {
  it('day shift runs 08:00–20:00', () => {
    const s = shiftWindowAt(at(20, 14, 30));
    expect(s.type).toBe('DAY');
    expect(s.start.getTime()).toBe(at(20, 8).getTime());
    expect(s.end.getTime()).toBe(at(20, 20).getTime());
  });
  it('night shift runs 20:00–08:00 across midnight', () => {
    const evening = shiftWindowAt(at(20, 22));
    expect(evening.type).toBe('NIGHT');
    expect(evening.start.getTime()).toBe(at(20, 20).getTime());
    expect(evening.end.getTime()).toBe(at(21, 8).getTime());
    const earlyMorning = shiftWindowAt(at(21, 3));
    expect(earlyMorning.start.getTime()).toBe(at(20, 20).getTime());
    expect(earlyMorning.end.getTime()).toBe(at(21, 8).getTime());
  });
  it('boundaries belong to the shift that starts', () => {
    expect(shiftWindowAt(at(20, 8)).type).toBe('DAY');
    expect(shiftWindowAt(at(20, 20)).type).toBe('NIGHT');
  });
  it('finds the previous shift', () => {
    const prev = previousShiftWindow(shiftWindowAt(at(20, 9)));
    expect(prev.type).toBe('NIGHT');
    expect(prev.start.getTime()).toBe(at(19, 20).getTime());
  });
  it('the chart day runs 08:00 to 08:00', () => {
    expect(chartDayWindow(at(21, 3)).start.getTime()).toBe(at(20, 8).getTime());
    expect(chartDayWindow(at(21, 9)).start.getTime()).toBe(at(21, 8).getTime());
    expect(chartDayWindow(at(21, 9)).end.getTime()).toBe(at(22, 8).getTime());
  });
});

describe('day of stay and age', () => {
  it('admission day is day 1', () => {
    expect(dayOfStay(at(17, 10), at(17, 15))).toBe(1);
    expect(dayOfStay(at(17, 10), at(18, 9, 59))).toBe(1);
    expect(dayOfStay(at(17, 10), at(18, 10))).toBe(2);
    expect(dayOfStay(at(17, 10), at(20, 12))).toBe(4);
    expect(dayOfStay(undefined, at(20, 12))).toBe(1);
  });
  it('age in completed years', () => {
    expect(ageYears(new Date(1980, 10, 21), at(20, 12))).toBe(45);
    expect(ageYears(new Date(1980, 10, 20), at(20, 12))).toBe(46);
    expect(ageYears(null)).toBeNull();
  });
});

describe('fluid balance', () => {
  const entries = [
    { type: 'INPUT', category: 'IV Fluid', amount: 500, timestamp: at(20, 9) },
    { type: 'INPUT', category: 'Infusion · Propofol', amount: 60, timestamp: at(20, 10) },
    { type: 'INPUT', category: 'Infusion · Noradrenaline', amount: 40, timestamp: at(20, 11) },
    { type: 'INPUT', category: 'IV · Meropenem', amount: 100, timestamp: at(20, 12) },
    { type: 'OUTPUT', category: 'Urine', amount: 300, timestamp: at(20, 13) },
    { type: 'OUTPUT', category: 'Drain', amount: 50, timestamp: at(20, 13, 30) },
    { type: 'OUTPUT', category: 'Urine', amount: 400, timestamp: at(19, 23) },   // previous night shift
    { type: 'INPUT', category: 'IV Fluid', amount: 1000, timestamp: at(18, 12) }, // two days ago
  ];

  it('sums a time window and groups infusions', () => {
    const t = fluidTotals(entries, at(20, 8), at(20, 20));
    expect(t.input).toBe(700);
    expect(t.output).toBe(350);
    expect(t.balance).toBe(350);
    expect(t.urine).toBe(300);
    expect(t.inputByCategory).toEqual([
      { category: 'IV Fluid', amount: 500 },
      { category: 'Infusions', amount: 100 },
      { category: 'IV drugs', amount: 100 },
    ]);
  });
  it('the window end is exclusive', () => {
    expect(fluidTotals(entries, at(20, 9), at(20, 10)).input).toBe(500);
  });
  it('builds the standard periods', () => {
    const periods = fluidSummary(entries, at(20, 14), { weightKg: 75, admittedAt: at(18, 10) });
    const by = Object.fromEntries(periods.map(p => [p.key, p]));
    expect(by.shift.shiftType).toBe('DAY');
    expect(by.shift.totals.balance).toBe(350);
    expect(by.previousShift.totals.output).toBe(400);
    expect(by.last24h.totals.output).toBe(750);
    expect(by.cumulative.totals.input).toBe(1700);
    expect(by.cumulative.totals.balance).toBe(950);
    // 300 mL of urine over the 6 h of the shift so far, 75 kg.
    expect(by.shift.urineMlKgHr).toBe(0.67);
  });
  it('accepts the phone app IN/OUT types and has no rate without a weight', () => {
    const t = fluidTotals([{ type: 'IN', amount: 200, timestamp: at(20, 9) }, { type: 'OUT', amount: 50, category: 'Urine', timestamp: at(20, 9) }]);
    expect(t.balance).toBe(150);
    expect(fluidSummary(entries, at(20, 14))[0].urineMlKgHr).toBeNull();
  });
  it('recognises urine and formats balances', () => {
    expect(isUrine('Urine')).toBe(true);
    expect(isUrine('Drain')).toBe(false);
    expect(formatBalance(450)).toBe('+450 mL');
    expect(formatBalance(-1200)).toBe('−1,200 mL');
    expect(formatBalance(0)).toBe('0 mL');
  });
});
