import { describe, expect, it } from 'vitest';
import {
  doseSchedule, dosePerKg, firstGivenAt, formatMinutes, freqDisplay, freqTimesPerDay,
  isInfusionPaused, overdueDose, parseDose,
} from '../src/dosing';

// Local-time helper so the tests do not depend on the machine's timezone.
const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute, 0, 0);
const given = (d: Date) => ({ status: 'Given', timestamp: d });

describe('freqTimesPerDay', () => {
  it('understands the labels used by the apps', () => {
    expect(freqTimesPerDay('OD (Once Daily)')).toBe(1);
    expect(freqTimesPerDay('BD (Twice Daily)')).toBe(2);
    expect(freqTimesPerDay('TDS (Thrice Daily)')).toBe(3);
    expect(freqTimesPerDay('QID (Four times)')).toBe(4);
    expect(freqTimesPerDay('6x/Day (Q4H)')).toBe(6);
    expect(freqTimesPerDay('Once Only')).toBe(1);
  });
  it('understands short codes and plain numbers', () => {
    expect(freqTimesPerDay('q8h')).toBe(3);
    expect(freqTimesPerDay('Q12H')).toBe(2);
    expect(freqTimesPerDay('q6h')).toBe(4);
    expect(freqTimesPerDay('3')).toBe(3);
  });
  it('returns null for infusions, PRN and unknown text', () => {
    expect(freqTimesPerDay('Infusion')).toBeNull();
    expect(freqTimesPerDay('PRN')).toBeNull();
    expect(freqTimesPerDay('')).toBeNull();
    expect(freqTimesPerDay(undefined)).toBeNull();
    expect(freqTimesPerDay('20')).toBeNull();
  });
  it('shows X-per-day labels', () => {
    expect(freqDisplay('TDS (Thrice Daily)')).toBe('X3');
    expect(freqDisplay('Infusion')).toBe('Infusion');
    expect(freqDisplay(undefined)).toBe('PRN');
  });
});

describe('doseSchedule', () => {
  it('anchors on the first dose, rounded to the nearest hour', () => {
    expect(doseSchedule(at(20, 14, 25), 'BD (Twice Daily)')).toEqual(['14:00', '02:00']);
    expect(doseSchedule(at(20, 14, 40), 'BD (Twice Daily)')).toEqual(['15:00', '03:00']);
    expect(doseSchedule(at(20, 16, 10), 'TDS (Thrice Daily)')).toEqual(['16:00', '00:00', '08:00']);
  });
  it('is empty for infusions or without an anchor', () => {
    expect(doseSchedule(at(20, 14), 'Infusion')).toEqual([]);
    expect(doseSchedule(undefined, 'BD')).toEqual([]);
  });
  it('finds the first given dose, ignoring held entries', () => {
    const first = firstGivenAt([
      { status: 'Held', timestamp: at(19, 8) },
      given(at(20, 16, 10)),
      given(at(20, 9, 5)),
    ]);
    expect(first?.getTime()).toBe(at(20, 9, 5).getTime());
    expect(firstGivenAt([])).toBeUndefined();
  });
});

describe('overdueDose', () => {
  const bd = { route: 'IV', frequency: 'BD (Twice Daily)', isActive: true, startedAt: at(19, 3) };

  it('is not overdue just after the first dose', () => {
    expect(overdueDose({ ...bd, administrations: [given(at(20, 14, 25))] }, at(20, 14, 40))).toBeNull();
  });
  it('is not overdue inside the grace period', () => {
    expect(overdueDose({ ...bd, administrations: [given(at(20, 14, 25))] }, at(21, 2, 20))).toBeNull();
  });
  it('flags the next dose once the grace period has passed', () => {
    const due = overdueDose({ ...bd, administrations: [given(at(20, 14, 25))] }, at(21, 3, 0));
    expect(due).not.toBeNull();
    expect(due!.dueAt.getTime()).toBe(at(21, 2, 0).getTime());
    expect(due!.overdueMinutes).toBe(60);
    expect(due!.firstDose).toBe(false);
  });
  it('accepts a dose given a little early', () => {
    const administrations = [given(at(21, 1, 10)), given(at(20, 14, 25))];
    expect(overdueDose({ ...bd, administrations }, at(21, 3, 0))).toBeNull();
  });
  it('treats a held dose as dealt with', () => {
    const administrations = [{ status: 'Held', timestamp: at(21, 2, 5) }, given(at(20, 14, 25))];
    expect(overdueDose({ ...bd, administrations }, at(21, 3, 0))).toBeNull();
  });
  it('does not flag the slot right after a late dose, but does flag the one after', () => {
    // 02:00 dose given 7 h late, at 09:00.
    const administrations = [given(at(21, 9, 0)), given(at(20, 14, 25))];
    expect(overdueDose({ ...bd, administrations }, at(21, 15, 0))).toBeNull();
    const due = overdueDose({ ...bd, administrations }, at(22, 2, 45));
    expect(due?.dueAt.getTime()).toBe(at(22, 2, 0).getTime());
  });
  it('flags a prescribed drug whose first dose was never given', () => {
    const med = { route: 'IV', frequency: 'TDS', isActive: true, startedAt: at(20, 10), administrations: [] };
    expect(overdueDose(med, at(20, 10, 30))).toBeNull();
    const due = overdueDose(med, at(20, 12, 0));
    expect(due?.firstDose).toBe(true);
    expect(due?.overdueMinutes).toBe(120);
  });
  it('ignores infusions, PRN, stopped drugs and completed once-only doses', () => {
    const late = at(25, 12);
    expect(overdueDose({ route: 'Infusion', frequency: 'Infusion', isActive: true, startedAt: at(19, 3) }, late)).toBeNull();
    expect(overdueDose({ route: 'IV', frequency: 'PRN', isActive: true, startedAt: at(19, 3) }, late)).toBeNull();
    expect(overdueDose({ ...bd, isActive: false, administrations: [given(at(20, 14))] }, late)).toBeNull();
    expect(overdueDose({ route: 'IV', frequency: 'Once Only', isActive: true, startedAt: at(19, 3), administrations: [given(at(19, 4))] }, late)).toBeNull();
  });
  it('handles a once-daily drug', () => {
    const od = { route: 'PO', frequency: 'OD (Once Daily)', isActive: true, startedAt: at(19, 9), administrations: [given(at(20, 10, 20))] };
    expect(overdueDose(od, at(21, 10, 20))).toBeNull();
    expect(overdueDose(od, at(21, 10, 35))?.overdueMinutes).toBe(35);
  });
});

describe('infusion pause state', () => {
  it('recognises the paused status and the older "Held / Paused" form', () => {
    const inf = { route: 'Infusion', frequency: 'Infusion' };
    expect(isInfusionPaused({ ...inf, administrations: [{ status: 'Paused', timestamp: at(20, 1) }] })).toBe(true);
    expect(isInfusionPaused({ ...inf, administrations: [{ status: 'Held', dose: 'Paused', timestamp: at(20, 1) }] })).toBe(true);
    expect(isInfusionPaused({ ...inf, administrations: [{ status: 'Resumed', timestamp: at(20, 2) }, { status: 'Paused', timestamp: at(20, 1) }] })).toBe(false);
    expect(isInfusionPaused({ ...inf, administrations: [{ status: 'Held', dose: '5 mg', timestamp: at(20, 1) }] })).toBe(false);
    expect(isInfusionPaused({ route: 'IV', administrations: [{ status: 'Paused', timestamp: at(20, 1) }] })).toBe(false);
  });
});

describe('dose helpers', () => {
  it('parses plain doses only', () => {
    expect(parseDose('40 mg')).toEqual({ amount: 40, unit: 'mg' });
    expect(parseDose('1 g')).toEqual({ amount: 1, unit: 'g' });
    expect(parseDose('50mcg')).toEqual({ amount: 50, unit: 'mcg' });
    expect(parseDose('10 units')).toEqual({ amount: 10, unit: 'units' });
    expect(parseDose('0.05 mcg/kg/min')).toBeNull();
    expect(parseDose('as directed')).toBeNull();
  });
  it('works out the dose per kg', () => {
    expect(dosePerKg('40 mg', 70)).toBe('0.57 mg/kg');
    expect(dosePerKg('1 g', 80)).toBe('12.5 mg/kg');
    expect(dosePerKg('4.5 g', 72.5)).toBe('62.1 mg/kg');
    expect(dosePerKg('100 g', 50)).toBe('2 g/kg');
    expect(dosePerKg('0.5 mg', 70)).toBe('7.1 mcg/kg');
    expect(dosePerKg('1000 mg', 50)).toBe('20 mg/kg');
    expect(dosePerKg('40 mg', null)).toBeNull();
    expect(dosePerKg('0.05 mcg/kg/min', 70)).toBeNull();
  });
  it('formats durations', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(130)).toBe('2 h 10 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(27 * 60)).toBe('1 d 3 h');
  });
});
