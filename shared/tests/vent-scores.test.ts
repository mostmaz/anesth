import { describe, expect, it } from 'vitest';
import {
  bmi, drivingPressure, meanArterialPressure, oxygenationBand, pfRatio, predictedBodyWeight,
  staticCompliance, vtPerKgPbw, vtTargetRange,
} from '../src/vent';
import {
  aaGradient, apache2, findLabValue, gcsLabel, gcsTotal, rassLabel, sofa, sofaCardiovascular,
  sofaRenal, sofaRespiration,
} from '../src/scores';

describe('ventilation maths', () => {
  it('P/F ratio and its band', () => {
    expect(pfRatio(80, 40)).toBe(200);
    expect(pfRatio(60, 100)).toBe(60);
    expect(pfRatio(95, 21)).toBe(452);
    expect(pfRatio(80, 10)).toBeNull();
    expect(pfRatio(null, 40)).toBeNull();
    expect(oxygenationBand(452)).toBe('normal');
    expect(oxygenationBand(250)).toBe('mild');
    expect(oxygenationBand(200)).toBe('moderate');
    expect(oxygenationBand(100)).toBe('severe');
    expect(oxygenationBand(null)).toBeNull();
  });
  it('driving pressure and compliance', () => {
    expect(drivingPressure(28, 10)).toBe(18);
    expect(drivingPressure(null, 10)).toBeNull();
    expect(drivingPressure(8, 10)).toBeNull();
    expect(staticCompliance(450, 25, 10)).toBe(30);
  });
  it('predicted body weight (ARDSNet)', () => {
    expect(predictedBodyWeight(175, 'Male')).toBe(70.6);
    expect(predictedBodyWeight(160, 'Female')).toBe(52.4);
    expect(predictedBodyWeight(175, 'ذكر')).toBe(70.6);
    expect(predictedBodyWeight(175, '')).toBeNull();
    expect(predictedBodyWeight(90, 'Male')).toBeNull();
  });
  it('tidal volume per kg and target range', () => {
    expect(vtPerKgPbw(450, 70.6)).toBe(6.4);
    expect(vtTargetRange(70.6)).toEqual({ low: 424, high: 565 });
  });
  it('BMI and MAP', () => {
    expect(bmi(80, 175)).toBe(26.1);
    expect(meanArterialPressure(120, 60)).toBe(80);
    expect(meanArterialPressure(60, 120)).toBeNull();
  });
});

describe('GCS and RASS', () => {
  it('totals and labels', () => {
    expect(gcsTotal({ eye: 4, verbal: 5, motor: 6 })).toBe(15);
    expect(gcsLabel({ eye: 4, verbal: 5, motor: 6 })).toBe('E4 V5 M6 = 15');
    expect(gcsTotal({ eye: 2, motor: 5, intubated: true })).toBe(8);
    expect(gcsLabel({ eye: 2, motor: 5, intubated: true })).toBe('E2 VT M5 = 8T');
    expect(gcsTotal({ eye: 4, motor: 6 })).toBeNull();
    expect(rassLabel(-2)).toBe('-2 Light sedation');
    expect(rassLabel(2)).toBe('+2 Agitated');
    expect(rassLabel(0)).toBe('0 Alert and calm');
  });
});

describe('SOFA', () => {
  it('respiration needs support for 3 and 4 points', () => {
    expect(sofaRespiration(450, false)).toBe(0);
    expect(sofaRespiration(350, false)).toBe(1);
    expect(sofaRespiration(250, true)).toBe(2);
    expect(sofaRespiration(150, false)).toBe(2);
    expect(sofaRespiration(150, true)).toBe(3);
    expect(sofaRespiration(80, true)).toBe(4);
    expect(sofaRespiration(null, true)).toBeNull();
  });
  it('cardiovascular', () => {
    expect(sofaCardiovascular(75, 'none')).toBe(0);
    expect(sofaCardiovascular(65, 'none')).toBe(1);
    expect(sofaCardiovascular(65, 'dopamine_le5_or_dobutamine')).toBe(2);
    expect(sofaCardiovascular(80, 'dopamine_gt5_or_epi_ne_le01')).toBe(3);
    expect(sofaCardiovascular(null, 'dopamine_gt15_or_epi_ne_gt01')).toBe(4);
    expect(sofaCardiovascular(null, 'none')).toBeNull();
  });
  it('renal takes the worse of creatinine and urine output', () => {
    expect(sofaRenal(1.0, 1500)).toBe(0);
    expect(sofaRenal(1.0, 400)).toBe(3);
    expect(sofaRenal(2.5, 150)).toBe(4);
    expect(sofaRenal(5.2, null)).toBe(4);
    expect(sofaRenal(null, null)).toBeNull();
  });
  it('a healthy patient scores 0', () => {
    const r = sofa({ pfRatio: 450, respiratorySupport: false, platelets: 250, bilirubin: 0.8, map: 85, vasopressors: 'none', gcs: 15, creatinine: 0.9, urineOutputMlDay: 1800 });
    expect(r.total).toBe(0);
    expect(r.missing).toEqual([]);
  });
  it('a worked example', () => {
    // P/F 150 ventilated (3) + platelets 80 (2) + bilirubin 2.5 (2) + noradrenaline 0.2 (4) + GCS 9 (3) + creatinine 2.2 (2)
    const r = sofa({ pfRatio: 150, respiratorySupport: true, platelets: 80, bilirubin: 2.5, map: 60, vasopressors: 'dopamine_gt15_or_epi_ne_gt01', gcs: 9, creatinine: 2.2 });
    expect(r.components).toEqual({ respiration: 3, coagulation: 2, liver: 2, cardiovascular: 4, cns: 3, renal: 2 });
    expect(r.total).toBe(16);
  });
  it('reports what is missing and totals the rest', () => {
    const r = sofa({ platelets: 40, gcs: 14 });
    expect(r.total).toBe(4);
    expect(r.missing).toEqual(['respiration', 'liver', 'cardiovascular', 'renal']);
  });
  it('boundary values', () => {
    expect(sofa({ platelets: 150 }).components.coagulation).toBe(0);
    expect(sofa({ platelets: 149 }).components.coagulation).toBe(1);
    expect(sofa({ platelets: 19 }).components.coagulation).toBe(4);
    expect(sofa({ bilirubin: 1.2 }).components.liver).toBe(1);
    expect(sofa({ bilirubin: 12 }).components.liver).toBe(4);
    expect(sofa({ gcs: 13 }).components.cns).toBe(1);
    expect(sofa({ gcs: 5 }).components.cns).toBe(4);
  });
});

describe('APACHE II', () => {
  const normal = {
    temperature: 37, map: 90, heartRate: 80, respiratoryRate: 16, fio2Percent: 21, pao2: 90,
    arterialPh: 7.4, sodium: 140, potassium: 4, creatinine: 1, hematocrit: 40, wbc: 8, gcs: 15,
    ageYears: 30, chronicHealth: 'none' as const,
  };
  it('a healthy 30-year-old scores 0', () => {
    const r = apache2(normal);
    expect(r.total).toBe(0);
    expect(r.missing).toEqual([]);
  });
  it('age and chronic health points', () => {
    expect(apache2({ ...normal, ageYears: 44 }).agePoints).toBe(0);
    expect(apache2({ ...normal, ageYears: 45 }).agePoints).toBe(2);
    expect(apache2({ ...normal, ageYears: 60 }).agePoints).toBe(3);
    expect(apache2({ ...normal, ageYears: 70 }).agePoints).toBe(5);
    expect(apache2({ ...normal, ageYears: 80 }).agePoints).toBe(6);
    expect(apache2({ ...normal, chronicHealth: 'nonoperative_or_emergency' }).total).toBe(5);
    expect(apache2({ ...normal, chronicHealth: 'elective_postoperative' }).total).toBe(2);
  });
  it('a worked example', () => {
    // temp 39.2 (3) + MAP 55 (2) + HR 145 (3) + RR 30 (1) + FiO2 60 % with A-a gradient 300 (2)
    // + pH 7.2 (3) + Na 128 (2) + K 6.2 (3) + creatinine 2.5 with ARF (3×2=6) + Hct 25 (2)
    // + WBC 22 (2) + GCS 9 (6) = 35; age 68 (5); chronic 5 → 45
    const r = apache2({
      temperature: 39.2, map: 55, heartRate: 145, respiratoryRate: 30, fio2Percent: 60, pao2: 77.8, paco2: 40,
      arterialPh: 7.2, sodium: 128, potassium: 6.2, creatinine: 2.5, acuteRenalFailure: true, hematocrit: 25,
      wbc: 22, gcs: 9, ageYears: 68, chronicHealth: 'nonoperative_or_emergency',
    });
    expect(Math.round(aaGradient(60, 77.8, 40))).toBe(300);
    expect(r.components).toEqual({
      temperature: 3, map: 2, heartRate: 3, respiratoryRate: 1, oxygenation: 2, acidBase: 3,
      sodium: 2, potassium: 3, creatinine: 6, hematocrit: 2, wbc: 2, gcs: 6,
    });
    expect(r.aps).toBe(35);
    expect(r.total).toBe(45);
  });
  it('uses PaO2 when FiO2 is under 50 % and bicarbonate when there is no pH', () => {
    expect(apache2({ ...normal, fio2Percent: 40, pao2: 58 }).components.oxygenation).toBe(3);
    expect(apache2({ ...normal, fio2Percent: 40, pao2: 50 }).components.oxygenation).toBe(4);
    expect(apache2({ ...normal, arterialPh: null, bicarbonate: 16 }).components.acidBase).toBe(3);
    expect(apache2({ ...normal, fio2Percent: 70, pao2: 80, paco2: null }).missing).toContain('oxygenation');
  });
  it('low values score too', () => {
    const r = apache2({ ...normal, temperature: 31, heartRate: 38, respiratoryRate: 5, potassium: 2.2, creatinine: 0.4, wbc: 0.8 });
    expect(r.components.temperature).toBe(3);
    expect(r.components.heartRate).toBe(4);
    expect(r.components.respiratoryRate).toBe(4);
    expect(r.components.potassium).toBe(4);
    expect(r.components.creatinine).toBe(2);
    expect(r.components.wbc).toBe(4);
  });
});

describe('findLabValue', () => {
  it('matches common report names in both result shapes', () => {
    expect(findLabValue({ 'S. Creatinine': 1.4 }, 'creatinine')).toBe(1.4);
    expect(findLabValue({ PLT: { value: '180', unit: '10^3/uL' } }, 'platelets')).toBe(180);
    expect(findLabValue({ 'Total Bilirubin': { value: 2.1 } }, 'bilirubin')).toBe(2.1);
    expect(findLabValue({ 'Na+': 138, 'K+': '4,2' }, 'potassium')).toBe(4.2);
    expect(findLabValue({ CRP: 55 }, 'creatinine')).toBeNull();
    expect(findLabValue(null, 'creatinine')).toBeNull();
  });
});
