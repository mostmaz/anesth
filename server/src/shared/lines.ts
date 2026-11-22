// GENERATED from /shared/src — do not edit here. Run: node scripts/sync-shared.mjs

// Lines, tubes and drains: the kinds the unit tracks, the daily care checklist
// for each, and the day at which the need for it should be reviewed.

import { dayCount } from './time';

export interface BundleItem {
  key: string;
  label: string;
  labelAr: string;
}

export interface LineType {
  key: string;
  label: string;
  labelAr: string;
  // From this day on, the tracker prompts to review whether it is still needed.
  // A prompt only — local policy decides when a device is changed or removed.
  reviewFromDay?: number;
  bundle: BundleItem[];
}

const CENTRAL_LINE_BUNDLE: BundleItem[] = [
  { key: 'necessity', label: 'Still needed (reviewed today)', labelAr: 'ما زال ضرورياً (تمت المراجعة اليوم)' },
  { key: 'dressing', label: 'Dressing clean, dry and intact', labelAr: 'الضماد نظيف وجاف وسليم' },
  { key: 'site', label: 'Site free of redness, swelling or discharge', labelAr: 'الموضع خالٍ من الاحمرار أو التورم أو الإفرازات' },
  { key: 'hub', label: 'Hubs disinfected before each access', labelAr: 'تعقيم الوصلات قبل كل استعمال' },
  { key: 'tubing', label: 'Giving sets and caps in date', labelAr: 'أجهزة التسريب والأغطية ضمن تاريخ الصلاحية' },
];

const AIRWAY_BUNDLE: BundleItem[] = [
  { key: 'hob', label: 'Head of bed 30–45°', labelAr: 'رفع رأس السرير ٣٠–٤٥ درجة' },
  { key: 'oral', label: 'Oral care done', labelAr: 'تمت العناية بالفم' },
  { key: 'cuff', label: 'Cuff pressure 20–30 cmH₂O', labelAr: 'ضغط البالون ٢٠–٣٠ سم ماء' },
  { key: 'sedation', label: 'Sedation hold / readiness to wean assessed', labelAr: 'تقييم إيقاف التهدئة والجاهزية للفطام' },
  { key: 'secured', label: 'Tube secured, position checked', labelAr: 'الأنبوب مثبت وموضعه مؤكد' },
];

export const LINE_TYPES: LineType[] = [
  { key: 'CVC', label: 'Central venous catheter', labelAr: 'قسطرة وريدية مركزية', reviewFromDay: 7, bundle: CENTRAL_LINE_BUNDLE },
  { key: 'ARTERIAL', label: 'Arterial line', labelAr: 'خط شرياني', reviewFromDay: 7, bundle: CENTRAL_LINE_BUNDLE },
  { key: 'DIALYSIS', label: 'Dialysis catheter', labelAr: 'قسطرة غسيل الكلى', reviewFromDay: 7, bundle: CENTRAL_LINE_BUNDLE },
  {
    key: 'PIV', label: 'Peripheral IV cannula', labelAr: 'كانيولا وريدية طرفية', reviewFromDay: 4,
    bundle: [
      { key: 'necessity', label: 'Still needed (reviewed today)', labelAr: 'ما زالت ضرورية (تمت المراجعة اليوم)' },
      { key: 'site', label: 'No pain, redness or swelling at the site', labelAr: 'لا ألم أو احمرار أو تورم في الموضع' },
      { key: 'dressing', label: 'Dressing intact and dated', labelAr: 'الضماد سليم ومؤرخ' },
      { key: 'patent', label: 'Flushed and patent', labelAr: 'تم الغسل والمجرى سالك' },
    ],
  },
  {
    key: 'URINARY', label: 'Urinary catheter', labelAr: 'قسطرة بولية', reviewFromDay: 3,
    bundle: [
      { key: 'necessity', label: 'Still needed (reviewed today)', labelAr: 'ما زالت ضرورية (تمت المراجعة اليوم)' },
      { key: 'closed', label: 'Closed drainage system intact', labelAr: 'نظام التصريف المغلق سليم' },
      { key: 'bag', label: 'Bag below bladder level and off the floor', labelAr: 'الكيس أسفل مستوى المثانة وغير ملامس للأرض' },
      { key: 'secured', label: 'Catheter secured, no kinks', labelAr: 'القسطرة مثبتة وبدون انثناء' },
      { key: 'hygiene', label: 'Meatal care done', labelAr: 'تمت العناية بفتحة الإحليل' },
    ],
  },
  { key: 'ETT', label: 'Endotracheal tube', labelAr: 'أنبوب رغامي', reviewFromDay: 7, bundle: AIRWAY_BUNDLE },
  { key: 'TRACH', label: 'Tracheostomy', labelAr: 'فغر الرغامى', bundle: AIRWAY_BUNDLE },
  {
    key: 'NGT', label: 'NG / OG tube', labelAr: 'أنبوب أنفي أو فموي معدي',
    bundle: [
      { key: 'position', label: 'Position checked (mark at nostril / lips)', labelAr: 'تم التأكد من الموضع (العلامة عند الأنف أو الشفة)' },
      { key: 'secured', label: 'Secured, skin under the fixation intact', labelAr: 'مثبت والجلد تحت التثبيت سليم' },
      { key: 'residual', label: 'Gastric residual checked', labelAr: 'تم قياس المتبقي المعدي' },
    ],
  },
  {
    key: 'CHEST_DRAIN', label: 'Chest drain', labelAr: 'أنبوب صدر',
    bundle: [
      { key: 'function', label: 'Swinging / bubbling checked', labelAr: 'تم فحص التأرجح والفقاعات' },
      { key: 'output', label: 'Drainage volume recorded', labelAr: 'تم تسجيل حجم التصريف' },
      { key: 'seal', label: 'Bottle below chest level, connections secure', labelAr: 'القارورة أسفل مستوى الصدر والوصلات محكمة' },
      { key: 'dressing', label: 'Dressing clean and intact', labelAr: 'الضماد نظيف وسليم' },
    ],
  },
  {
    key: 'DRAIN', label: 'Surgical drain', labelAr: 'مصرف جراحي',
    bundle: [
      { key: 'output', label: 'Output recorded', labelAr: 'تم تسجيل الكمية' },
      { key: 'site', label: 'Site and dressing checked', labelAr: 'تم فحص الموضع والضماد' },
    ],
  },
  {
    key: 'OTHER', label: 'Other', labelAr: 'أخرى',
    bundle: [
      { key: 'necessity', label: 'Still needed (reviewed today)', labelAr: 'ما زال ضرورياً (تمت المراجعة اليوم)' },
      { key: 'site', label: 'Site checked', labelAr: 'تم فحص الموضع' },
    ],
  },
];

export function lineType(key?: string | null): LineType {
  return LINE_TYPES.find(t => t.key === key) || LINE_TYPES[LINE_TYPES.length - 1];
}

export interface LineLike {
  type: string;
  insertedAt: string | Date;
  removedAt?: string | Date | null;
}

// Day the device has been in place (insertion day = day 1). For a removed
// device, the number of days it stayed in.
export function lineDay(line: LineLike, now: Date = new Date()): number {
  const until = line.removedAt ? new Date(line.removedAt) : now;
  return dayCount(line.insertedAt, isNaN(until.getTime()) ? now : until);
}

// true when an in-place device has reached the day at which its need should be reviewed.
export function lineNeedsReview(line: LineLike, now: Date = new Date()): boolean {
  if (line.removedAt) return false;
  const from = lineType(line.type).reviewFromDay;
  return !!from && lineDay(line, now) >= from;
}

// Was the care checklist completed for this device since the start of the given window?
export function bundleDoneSince(checks: Array<{ timestamp: string | Date }> | null | undefined, since: Date): boolean {
  return !!checks?.some(c => new Date(c.timestamp).getTime() >= since.getTime());
}
