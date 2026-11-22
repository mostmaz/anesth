import { describe, expect, it } from 'vitest';
import { allergyWarnings, cleanAllergyList } from '../src/allergy';
import { bundleDoneSince, lineDay, lineNeedsReview, lineType, LINE_TYPES } from '../src/lines';
import { limitProblem, vitalsProblems, VITAL_LIMITS, VENT_LIMITS } from '../src/ranges';

const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0, 0, 0);

describe('allergy warnings', () => {
  it('direct match', () => {
    const w = allergyWarnings('Amoxicillin 500 mg', ['amoxicillin']);
    expect(w).toHaveLength(1);
    expect(w[0].level).toBe('match');
  });
  it('same family', () => {
    const w = allergyWarnings('Piperacillin/Tazobactam', ['Penicillin']);
    expect(w[0].level).toBe('class');
    expect(allergyWarnings('Ceftriaxone', ['cefazolin'])[0].level).toBe('class');
    expect(allergyWarnings('Co-trimoxazole', ['Sulfa drugs'])[0].level).toBe('class');
  });
  it('possible cross-reaction between beta-lactam families', () => {
    expect(allergyWarnings('Ceftriaxone', ['penicillin'])[0].level).toBe('cross');
    expect(allergyWarnings('Meropenem', ['Penicillin'])[0].level).toBe('cross');
  });
  it('unrelated drugs give no warning', () => {
    expect(allergyWarnings('Paracetamol', ['penicillin'])).toEqual([]);
    expect(allergyWarnings('Vancomycin', ['penicillin', 'ibuprofen'])).toEqual([]);
    expect(allergyWarnings('Meropenem', [])).toEqual([]);
    expect(allergyWarnings('', ['penicillin'])).toEqual([]);
  });
  it('sulfate salts are not sulfa drugs', () => {
    expect(allergyWarnings('Magnesium sulfate', ['sulfa'])).toEqual([]);
    expect(allergyWarnings('Morphine sulphate', ['Sulfonamides'])).toEqual([]);
    expect(allergyWarnings('Morphine sulphate', ['morphine'])[0].level).toBe('match');
  });
  it('several allergies can each warn', () => {
    const w = allergyWarnings('Diclofenac', ['Aspirin', 'penicillin', 'diclofenac']);
    expect(w.map(x => x.level)).toEqual(['class', 'match']);
  });
  it('cleans a typed list', () => {
    expect(cleanAllergyList('Penicillin, penicillin ،  Sulfa;  \n latex')).toEqual(['Penicillin', 'Sulfa', 'latex']);
    expect(cleanAllergyList([' a ', '', null, 'A'])).toEqual(['a']);
  });
});

describe('lines and tubes', () => {
  it('every type has a checklist with unique keys', () => {
    for (const t of LINE_TYPES) {
      expect(t.bundle.length).toBeGreaterThan(0);
      expect(new Set(t.bundle.map(b => b.key)).size).toBe(t.bundle.length);
      expect(t.labelAr.length).toBeGreaterThan(0);
    }
    expect(lineType('NOPE').key).toBe('OTHER');
  });
  it('counts the insertion day as day 1', () => {
    expect(lineDay({ type: 'CVC', insertedAt: at(20, 10) }, at(20, 22))).toBe(1);
    expect(lineDay({ type: 'CVC', insertedAt: at(14, 10) }, at(20, 12))).toBe(7);
    expect(lineDay({ type: 'CVC', insertedAt: at(14, 10), removedAt: at(16, 12) }, at(20, 12))).toBe(3);
  });
  it('prompts a review from the configured day, never for removed devices', () => {
    expect(lineNeedsReview({ type: 'CVC', insertedAt: at(15, 10) }, at(20, 12))).toBe(false);
    expect(lineNeedsReview({ type: 'CVC', insertedAt: at(14, 10) }, at(20, 12))).toBe(true);
    expect(lineNeedsReview({ type: 'URINARY', insertedAt: at(18, 10) }, at(20, 12))).toBe(true);
    expect(lineNeedsReview({ type: 'CVC', insertedAt: at(10, 10), removedAt: at(19, 10) }, at(20, 12))).toBe(false);
    expect(lineNeedsReview({ type: 'TRACH', insertedAt: at(1, 10) }, at(20, 12))).toBe(false);
  });
  it('knows whether the checklist was done this shift', () => {
    expect(bundleDoneSince([{ timestamp: at(20, 9) }], at(20, 8))).toBe(true);
    expect(bundleDoneSince([{ timestamp: at(20, 7) }], at(20, 8))).toBe(false);
    expect(bundleDoneSince([], at(20, 8))).toBe(false);
  });
});

describe('value limits', () => {
  it('accepts possible values, including very abnormal ones', () => {
    expect(vitalsProblems({ heartRate: 34, bpSys: 62, bpDia: 30, spo2: 71, temp: 41.5, rr: 44, rbs: 38 })).toEqual([]);
    expect(vitalsProblems({})).toEqual([]);
    expect(vitalsProblems({ heartRate: '', temp: null })).toEqual([]);
  });
  it('rejects impossible values with a clear message', () => {
    expect(vitalsProblems({ heartRate: 800 })).toEqual(['Heart rate must be between 0 and 350 bpm']);
    expect(vitalsProblems({ spo2: 101 })[0]).toContain('SpO₂');
    expect(vitalsProblems({ temp: 98.6 })[0]).toContain('Temperature');
    expect(vitalsProblems({ heartRate: 'abc' })).toEqual(['Heart rate must be a number']);
    expect(vitalsProblems({ rr: 16.5 })).toEqual(['Respiratory rate must be a whole number']);
    expect(vitalsProblems({ bpSys: 80, bpDia: 120 })).toEqual(['Diastolic BP cannot be higher than systolic BP']);
  });
  it('checks GCS, RASS and pain against their scales', () => {
    expect(vitalsProblems({ gcsEye: 4, gcsVerbal: 5, gcsMotor: 6, rass: -5, painScore: 10, painScale: 'NRS' })).toEqual([]);
    expect(vitalsProblems({ gcsEye: 5 })).toHaveLength(1);
    expect(vitalsProblems({ rass: 5 })).toHaveLength(1);
    expect(vitalsProblems({ painScore: 9, painScale: 'CPOT' })).toEqual(['Pain (CPOT) must be between 0 and 8']);
    expect(vitalsProblems({ painScore: 2, painScale: 'BPS' })).toEqual(['Pain (BPS) must be between 3 and 12']);
  });
  it('single-limit check', () => {
    expect(limitProblem(15, VENT_LIMITS.fio2)).toContain('FiO₂');
    expect(limitProblem(40, VENT_LIMITS.fio2)).toBeNull();
    expect(limitProblem(undefined, VITAL_LIMITS.heartRate)).toBeNull();
  });
});
