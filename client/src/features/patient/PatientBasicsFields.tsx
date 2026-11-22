import { useState } from 'react';
import type { Patient } from '../../types';
import { useLang } from '../../i18n';
import { PATIENT_LIMITS, limitProblem } from '../../shared/ranges';
import { cleanAllergyList } from '../../shared/allergy';
import { bmi } from '../../shared/vent';

// Weight, height and allergies — entered at admission and editable later.
// Used by the admission form and the edit-patient dialog.

export interface BasicsValue {
    weightKg: string;
    heightCm: string;
    allergies: string[];
    noKnownAllergies: boolean;
}

export const emptyBasics = (): BasicsValue => ({ weightKg: '', heightCm: '', allergies: [], noKnownAllergies: false });

export const basicsFromPatient = (p: Patient): BasicsValue => ({
    weightKg: p.weightKg != null ? String(p.weightKg) : '',
    heightCm: p.heightCm != null ? String(p.heightCm) : '',
    allergies: p.allergies || [],
    noKnownAllergies: !!p.noKnownAllergies,
});

// Returns a message if a value cannot be right, otherwise null.
export function basicsProblem(v: BasicsValue): string | null {
    return limitProblem(v.weightKg, PATIENT_LIMITS.weightKg) || limitProblem(v.heightCm, PATIENT_LIMITS.heightCm);
}

export const basicsPayload = (v: BasicsValue) => ({
    weightKg: v.weightKg === '' ? null : Number(v.weightKg),
    heightCm: v.heightCm === '' ? null : Number(v.heightCm),
    allergies: v.allergies,
    noKnownAllergies: v.allergies.length ? false : v.noKnownAllergies,
});

const inputClass = 'mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

export function PatientBasicsFields({ value, onChange }: { value: BasicsValue; onChange: (v: BasicsValue) => void }) {
    const { t } = useLang();
    const [draft, setDraft] = useState('');

    const addAllergies = (text: string) => {
        const next = cleanAllergyList([...value.allergies, ...text.split(/[,،;\n]/)]);
        onChange({ ...value, allergies: next, noKnownAllergies: next.length ? false : value.noKnownAllergies });
        setDraft('');
    };

    const bodyMass = bmi(Number(value.weightKg) || null, Number(value.heightCm) || null);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('basics.weight')}</label>
                    <input
                        type="number" inputMode="decimal" step="0.1" min={PATIENT_LIMITS.weightKg.min} max={PATIENT_LIMITS.weightKg.max}
                        value={value.weightKg}
                        onChange={(e) => onChange({ ...value, weightKg: e.target.value })}
                        placeholder="kg"
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t('basics.height')}</label>
                    <input
                        type="number" inputMode="decimal" step="0.5" min={PATIENT_LIMITS.heightCm.min} max={PATIENT_LIMITS.heightCm.max}
                        value={value.heightCm}
                        onChange={(e) => onChange({ ...value, heightCm: e.target.value })}
                        placeholder="cm"
                        className={inputClass}
                    />
                </div>
            </div>
            {bodyMass && <p className="text-xs text-slate-500 -mt-2">BMI {bodyMass}</p>}

            <div>
                <label className="block text-sm font-medium text-gray-700">{t('basics.allergies')}</label>
                {value.allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {value.allergies.map((a) => (
                            <span key={a} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                {a}
                                <button
                                    type="button"
                                    aria-label={`${t('btn.remove')} ${a}`}
                                    onClick={() => onChange({ ...value, allergies: value.allergies.filter((x) => x !== a) })}
                                    className="text-red-600 hover:text-red-900 font-bold leading-none"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                <input
                    type="text"
                    value={draft}
                    disabled={value.noKnownAllergies}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',' || e.key === '،') {
                            e.preventDefault();
                            if (draft.trim()) addAllergies(draft);
                        }
                    }}
                    onBlur={() => { if (draft.trim()) addAllergies(draft); }}
                    placeholder={t('basics.allergiesPlaceholder')}
                    className={`${inputClass} disabled:bg-gray-100`}
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={value.noKnownAllergies && value.allergies.length === 0}
                        disabled={value.allergies.length > 0}
                        onChange={(e) => onChange({ ...value, noKnownAllergies: e.target.checked })}
                        className="h-4 w-4"
                    />
                    {t('basics.nkda')}
                </label>
            </div>
        </div>
    );
}
