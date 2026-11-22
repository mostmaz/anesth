// Allergy warnings at prescribing. A warning is a prompt to check, never a block:
// the list of drug families is deliberately short and cannot be complete.

export type AllergyLevel = 'match' | 'class' | 'cross';

export interface AllergyWarning {
  level: AllergyLevel;
  // The recorded allergy that triggered the warning.
  allergy: string;
  // Short explanation shown to the prescriber.
  reason: string;
}

// Drug families: a recorded allergy to one member warns for the others.
const FAMILIES: Record<string, { label: string; members: string[] }> = {
  penicillin: {
    label: 'penicillins',
    members: ['penicillin', 'amoxicillin', 'amoxycillin', 'ampicillin', 'piperacillin', 'flucloxacillin', 'cloxacillin',
      'oxacillin', 'nafcillin', 'co-amoxiclav', 'amoxiclav', 'augmentin', 'tazocin', 'tazobactam', 'unasyn',
      'sulbactam', 'benzylpenicillin', 'ticarcillin'],
  },
  cephalosporin: {
    label: 'cephalosporins',
    members: ['cephalosporin', 'cefazolin', 'cefuroxime', 'ceftriaxone', 'cefotaxime', 'ceftazidime', 'cefepime',
      'cefixime', 'cephalexin', 'cefalexin', 'cefoperazone', 'cefoxitin', 'ceftaroline', 'cefdinir', 'rocephin'],
  },
  carbapenem: {
    label: 'carbapenems',
    members: ['carbapenem', 'meropenem', 'imipenem', 'ertapenem', 'doripenem', 'tienam', 'meronem'],
  },
  sulfonamide: {
    label: 'sulfonamides',
    members: ['sulfa', 'sulpha', 'sulfonamide', 'sulphonamide', 'sulfamethoxazole', 'co-trimoxazole', 'cotrimoxazole',
      'septrin', 'bactrim', 'sulfadiazine', 'sulfasalazine'],
  },
  nsaid: {
    label: 'NSAIDs',
    members: ['nsaid', 'ibuprofen', 'brufen', 'diclofenac', 'voltaren', 'ketorolac', 'naproxen', 'aspirin',
      'indomethacin', 'ketoprofen', 'celecoxib', 'meloxicam', 'piroxicam', 'mefenamic'],
  },
  opioid: {
    label: 'opioids',
    members: ['opioid', 'opiate', 'morphine', 'fentanyl', 'pethidine', 'meperidine', 'tramadol', 'codeine',
      'oxycodone', 'remifentanil', 'sufentanil', 'hydromorphone', 'nalbuphine'],
  },
  macrolide: {
    label: 'macrolides',
    members: ['macrolide', 'azithromycin', 'clarithromycin', 'erythromycin'],
  },
  quinolone: {
    label: 'quinolones',
    members: ['quinolone', 'fluoroquinolone', 'ciprofloxacin', 'levofloxacin', 'moxifloxacin', 'ofloxacin', 'norfloxacin'],
  },
  aminoglycoside: {
    label: 'aminoglycosides',
    members: ['aminoglycoside', 'gentamicin', 'gentamycin', 'amikacin', 'tobramycin', 'streptomycin', 'neomycin'],
  },
  glycopeptide: {
    label: 'glycopeptides',
    members: ['glycopeptide', 'vancomycin', 'teicoplanin'],
  },
  heparin: {
    label: 'heparins',
    members: ['heparin', 'enoxaparin', 'clexane', 'dalteparin', 'tinzaparin'],
  },
  local_anaesthetic: {
    label: 'local anaesthetics',
    members: ['lidocaine', 'lignocaine', 'bupivacaine', 'ropivacaine', 'prilocaine'],
  },
};

// Families with known (lower-risk) cross-reactivity.
const CROSS: Array<[string, string]> = [
  ['penicillin', 'cephalosporin'],
  ['penicillin', 'carbapenem'],
  ['cephalosporin', 'carbapenem'],
];

// Sulfate salts (magnesium sulfate, morphine sulphate…) are not sulfonamides, so
// the word is dropped before any comparison.
const normalise = (s: string) => s.toLowerCase()
  .replace(/sul(f|ph)ate/g, ' ')
  .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
  .trim();

function familiesOf(text: string): string[] {
  const n = normalise(text);
  const compact = n.replace(/ /g, '');
  const found: string[] = [];
  for (const key of Object.keys(FAMILIES)) {
    if (FAMILIES[key].members.some(m => { const mm = normalise(m).replace(/ /g, ''); return compact.includes(mm); })) {
      found.push(key);
    }
  }
  return found;
}

// Compares a drug name with the patient's recorded allergies.
export function allergyWarnings(drugName: string | null | undefined, allergies: string[] | null | undefined): AllergyWarning[] {
  const drug = normalise(drugName || '');
  if (!drug || !allergies?.length) return [];
  const drugCompact = drug.replace(/ /g, '');
  const drugFamilies = familiesOf(drug);
  const warnings: AllergyWarning[] = [];

  for (const raw of allergies) {
    const allergy = normalise(raw || '');
    if (!allergy) continue;
    const allergyCompact = allergy.replace(/ /g, '');

    // 1. The same substance (either name contains the other; short fragments ignored).
    const direct = (allergyCompact.length >= 4 && drugCompact.includes(allergyCompact))
      || (drugCompact.length >= 4 && allergyCompact.includes(drugCompact))
      || drug.split(' ').some(word => word.length >= 5 && allergy.split(' ').includes(word));
    if (direct) {
      warnings.push({ level: 'match', allergy: raw, reason: `Recorded allergy: ${raw}` });
      continue;
    }

    // 2. Same drug family.
    const allergyFamilies = familiesOf(allergy);
    const shared = drugFamilies.find(f => allergyFamilies.includes(f));
    if (shared) {
      warnings.push({ level: 'class', allergy: raw, reason: `Same family as the recorded allergy (${FAMILIES[shared].label}): ${raw}` });
      continue;
    }

    // 3. Families that can cross-react.
    const cross = CROSS.find(([a, b]) =>
      (drugFamilies.includes(a) && allergyFamilies.includes(b)) || (drugFamilies.includes(b) && allergyFamilies.includes(a)));
    if (cross) {
      warnings.push({ level: 'cross', allergy: raw, reason: `Possible cross-reaction with the recorded allergy: ${raw}` });
    }
  }
  return warnings;
}

// Tidies a typed allergy list: trims, drops blanks and duplicates (case-insensitive).
export function cleanAllergyList(values: Array<string | null | undefined> | string | null | undefined): string[] {
  const list = typeof values === 'string' ? values.split(/[,،;\n]/) : (values || []);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of list) {
    const v = (value || '').trim().replace(/\s+/g, ' ');
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v.slice(0, 80));
  }
  return out.slice(0, 30);
}
