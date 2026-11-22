import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Patient } from '../../types';
import { scoresApi, type ClinicalScore, type ScoreType } from '../../api/scoresApi';
import { vitalsApi } from '../../api/vitalsApi';
import { ventilatorApi } from '../../api/ventilatorApi';
import { ioApi } from '../../api/ioApi';
import { investigationsApi } from '../../api/investigationsApi';
import { useLang } from '../../i18n';
import { Card, CardHead, Icon, Pill, SectionTitle } from '../../components/icu';
import {
    apache2, findLabValue, gcsTotal, sofa,
    type Apache2Inputs, type ChronicHealth, type SofaInputs, type VasopressorLevel,
} from '../../shared/scores';
import { meanArterialPressure, pfRatio } from '../../shared/vent';
import { fluidTotals } from '../../shared/fluid';
import { ageYears } from '../../shared/time';

// SOFA and APACHE II. Values are pre-filled from the chart where they exist and
// every one of them can be corrected before the score is saved.

type Values = Record<string, string>;
// Where a pre-filled value came from, shown under the field.
type Sources = Record<string, string>;

const n = (v: string | undefined): number | null => {
    if (v === undefined || v.trim() === '') return null;
    const x = Number(v);
    return isFinite(x) ? x : null;
};

const SOFA_LABELS: Record<string, string> = {
    respiration: 'Respiration', coagulation: 'Coagulation', liver: 'Liver',
    cardiovascular: 'Cardiovascular', cns: 'CNS', renal: 'Renal',
};
const APACHE_LABELS: Record<string, string> = {
    temperature: 'Temperature', map: 'MAP', heartRate: 'Heart rate', respiratoryRate: 'Resp. rate',
    oxygenation: 'Oxygenation', acidBase: 'pH / HCO₃', sodium: 'Sodium', potassium: 'Potassium',
    creatinine: 'Creatinine', hematocrit: 'Haematocrit', wbc: 'WBC', gcs: 'GCS', age: 'Age',
};

const VASOPRESSORS: Array<{ value: VasopressorLevel; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'dopamine_le5_or_dobutamine', label: 'Dopamine ≤ 5 or dobutamine' },
    { value: 'dopamine_gt5_or_epi_ne_le01', label: 'Dopamine > 5, or adrenaline / noradrenaline ≤ 0.1' },
    { value: 'dopamine_gt15_or_epi_ne_gt01', label: 'Dopamine > 15, or adrenaline / noradrenaline > 0.1' },
];
const CHRONIC: Array<{ value: ChronicHealth; label: string }> = [
    { value: 'none', label: 'None' },
    { value: 'elective_postoperative', label: 'Yes · elective post-operative' },
    { value: 'nonoperative_or_emergency', label: 'Yes · non-operative or emergency surgery' },
];

// Units and chemical symbols must keep their case (mmHg, µL, PaO₂).
const PLAIN_LABEL = { textTransform: 'none', letterSpacing: 0 } as const;

function Field({ id, label, unit, value, onChange, source, step }: {
    id: string; label: string; unit?: string; value: string; onChange: (v: string) => void; source?: string; step?: string;
}) {
    return (
        <div>
            <label className="icu-fld" style={PLAIN_LABEL} htmlFor={id}>{label}{unit ? ` (${unit})` : ''}</label>
            <input id={id} className="icu-input" style={{ width: '100%' }} type="number" inputMode="decimal" step={step || 'any'} value={value} onChange={(e) => onChange(e.target.value)} />
            {source && <div style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 2 }}>{source}</div>}
        </div>
    );
}

export default function ScoresTab({ patientId, patient }: { patientId: string; patient: Patient }) {
    const { t } = useLang();
    const [kind, setKind] = useState<ScoreType>('SOFA');
    const [history, setHistory] = useState<ClinicalScore[]>([]);
    const [values, setValues] = useState<Values>({ vasopressors: 'none', chronicHealth: 'none', respiratorySupport: 'false', acuteRenalFailure: 'false' });
    const [sources, setSources] = useState<Sources>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const set = (key: string) => (v: string) => setValues((prev) => ({ ...prev, [key]: v }));

    const loadHistory = () => scoresApi.list(patientId).then(setHistory).catch(() => setHistory([]));

    // Pre-fill from the latest charted data. Nothing here is saved until the doctor presses Save.
    const prefill = async () => {
        setLoading(true);
        const next: Values = { vasopressors: 'none', chronicHealth: 'none', respiratorySupport: 'false', acuteRenalFailure: 'false' };
        const src: Sources = {};
        const stamp = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        const put = (key: string, value: number | null | undefined, from: string) => {
            if (value === null || value === undefined || !isFinite(value) || next[key] !== undefined) return;
            next[key] = String(value);
            src[key] = from;
        };

        const [vitals, vent, io, labs] = await Promise.all([
            vitalsApi.getVitals(patientId).catch(() => []),
            ventilatorApi.getHistory(patientId).catch(() => []),
            ioApi.getHistory(patientId).catch(() => []),
            investigationsApi.getAll(patientId).catch(() => []),
        ]);

        // Vitals: the newest value of each kind (vitals arrive oldest → newest).
        for (const v of [...vitals].reverse()) {
            const from = `${t('scores.fromVitals', 'vitals')} ${stamp(v.timestamp)}`;
            put('map', meanArterialPressure(v.bpSys, v.bpDia), from);
            put('heartRate', v.heartRate, from);
            put('respiratoryRate', v.rr, from);
            put('temperature', v.temp, from);
            put('gcs', gcsTotal({ eye: v.gcsEye, verbal: v.gcsVerbal, motor: v.gcsMotor, intubated: v.gcsIntubated }), from);
        }

        // Ventilator: newest record first.
        const latestVent = vent[0];
        if (latestVent) {
            const from = `${t('scores.fromVent', 'ventilator')} ${stamp(latestVent.timestamp)}`;
            put('fio2Percent', latestVent.fio2, from);
            put('pao2', latestVent.pao2 ?? null, from);
            put('pfRatio', pfRatio(latestVent.pao2, latestVent.fio2), from);
            // A ventilator record in the last 24 h counts as respiratory support.
            if (Date.now() - new Date(latestVent.timestamp).getTime() < 24 * 3_600_000) next.respiratorySupport = 'true';
        }

        // Labs: newest report first; take the first one that has each value.
        const sortedLabs = [...labs].sort((a, b) => new Date(b.conductedAt).getTime() - new Date(a.conductedAt).getTime());
        for (const lab of sortedLabs) {
            const from = `${lab.title} ${stamp(lab.conductedAt)}`;
            for (const key of ['platelets', 'bilirubin', 'creatinine', 'sodium', 'potassium', 'hematocrit', 'wbc', 'bicarbonate']) {
                put(key, findLabValue(lab.result, key), from);
            }
            // Blood-gas values only from a report that looks like a blood gas.
            if (/gas|abg|vbg/i.test(`${lab.title} ${lab.category}`)) {
                put('arterialPh', findLabValue(lab.result, 'ph'), from);
                put('paco2', findLabValue(lab.result, 'paco2'), from);
                put('pao2', findLabValue(lab.result, 'pao2'), from);
            }
        }
        if (next.pfRatio === undefined && next.pao2 !== undefined && next.fio2Percent !== undefined) {
            const pf = pfRatio(Number(next.pao2), Number(next.fio2Percent));
            if (pf !== null) { next.pfRatio = String(pf); src.pfRatio = t('scores.calculated', 'calculated'); }
        }

        // Urine output over the last 24 hours — only if the chart covers that long
        // and something was charted in that time (an empty chart is "unknown", not zero).
        const since = new Date(Date.now() - 24 * 3_600_000);
        const oldest = io.reduce((min, e) => Math.min(min, new Date(e.timestamp).getTime()), Infinity);
        const chartedRecently = io.some((e) => new Date(e.timestamp).getTime() >= since.getTime());
        if (chartedRecently && oldest <= since.getTime() + 3_600_000) {
            put('urineOutputMlDay', fluidTotals(io, since).urine, t('scores.fromIo', 'I/O chart, last 24 h'));
        }

        put('ageYears', ageYears(patient.dob), t('scores.fromDob', 'date of birth'));

        setValues(next);
        setSources(src);
        setLoading(false);
    };

    useEffect(() => {
        loadHistory();
        prefill();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    const sofaInputs: SofaInputs = useMemo(() => ({
        pfRatio: n(values.pfRatio),
        respiratorySupport: values.respiratorySupport === 'true',
        platelets: n(values.platelets),
        bilirubin: n(values.bilirubin),
        map: n(values.map),
        vasopressors: (values.vasopressors || 'none') as VasopressorLevel,
        gcs: n(values.gcs),
        creatinine: n(values.creatinine),
        urineOutputMlDay: n(values.urineOutputMlDay),
    }), [values]);

    const apacheInputs: Apache2Inputs = useMemo(() => ({
        temperature: n(values.temperature),
        map: n(values.map),
        heartRate: n(values.heartRate),
        respiratoryRate: n(values.respiratoryRate),
        fio2Percent: n(values.fio2Percent),
        pao2: n(values.pao2),
        paco2: n(values.paco2),
        arterialPh: n(values.arterialPh),
        bicarbonate: n(values.bicarbonate),
        sodium: n(values.sodium),
        potassium: n(values.potassium),
        creatinine: n(values.creatinine),
        acuteRenalFailure: values.acuteRenalFailure === 'true',
        hematocrit: n(values.hematocrit),
        wbc: n(values.wbc),
        gcs: n(values.gcs),
        ageYears: n(values.ageYears),
        chronicHealth: (values.chronicHealth || 'none') as ChronicHealth,
    }), [values]);

    const sofaResult = sofa(sofaInputs);
    const apacheResult = apache2(apacheInputs);
    const result = kind === 'SOFA' ? sofaResult : apacheResult;
    const labels = kind === 'SOFA' ? SOFA_LABELS : APACHE_LABELS;
    const componentCount = Object.keys(result.components).length;
    const scoredCount = componentCount - result.missing.filter((m) => m !== 'age').length;

    const save = async () => {
        if (saving) return;
        if (scoredCount === 0) { toast.error(t('scores.nothing', 'Enter at least one value')); return; }
        if (result.missing.length && !confirm(`${t('scores.partialConfirm', 'Some values are missing, so this is a partial score. Save it anyway?')}\n\n${result.missing.map((m) => labels[m] || m).join(', ')}`)) return;
        setSaving(true);
        try {
            await scoresApi.save({ patientId, type: kind, inputs: kind === 'SOFA' ? sofaInputs : apacheInputs });
            toast.success(`${kind === 'SOFA' ? 'SOFA' : 'APACHE II'} ${t('scores.saved', 'saved')}`);
            loadHistory();
        } catch (e: any) {
            toast.error(e?.message || t('scores.saveFailed', 'Could not save the score'));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (score: ClinicalScore) => {
        if (!confirm(t('scores.deleteConfirm', 'Delete this saved score?'))) return;
        try {
            await scoresApi.deleteEntry(score.id);
            loadHistory();
        } catch (e: any) {
            toast.error(e?.message || t('scores.deleteFailed', 'Could not delete'));
        }
    };

    const f = (key: string, label: string, unit?: string, step?: string) => (
        <Field id={`score-${key}`} label={label} unit={unit} step={step} value={values[key] ?? ''} onChange={set(key)} source={sources[key]} />
    );
    const grid = { display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' } as const;
    const past = history.filter((h) => h.type === kind);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {(['SOFA', 'APACHE2'] as const).map((k) => (
                    <button key={k} type="button" className={`icu-btn icu-btn-sm ${kind === k ? 'icu-btn-primary' : 'icu-btn-outline'}`} aria-pressed={kind === k} onClick={() => setKind(k)}>
                        {k === 'SOFA' ? 'SOFA' : 'APACHE II'}
                    </button>
                ))}
                <button type="button" className="icu-btn icu-btn-ghost icu-btn-sm" onClick={prefill} disabled={loading} style={{ marginInlineStart: 'auto' }}>
                    <Icon name="activity" size={14} /> {loading ? t('common.loading', 'Loading…') : t('scores.refill', 'Re-fill from chart')}
                </button>
            </div>

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 2fr) minmax(240px, 1fr)', alignItems: 'start' }} className="scores-layout">
                <Card>
                    <CardHead
                        title={kind === 'SOFA' ? t('scores.sofaTitle', 'SOFA — values') : t('scores.apacheTitle', 'APACHE II — values')}
                        subtitle={kind === 'SOFA'
                            ? t('scores.sofaHelp', 'Use the worst value of the last 24 hours.')
                            : t('scores.apacheHelp', 'Use the worst values of the first 24 hours in the ICU.')}
                        icon="clipboard"
                    />
                    {kind === 'SOFA' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={grid}>
                                {f('pfRatio', 'PaO₂/FiO₂', 'mmHg')}
                                <div>
                                    <label className="icu-fld" style={PLAIN_LABEL} htmlFor="score-support">{t('scores.support', 'Respiratory support')}</label>
                                    <select id="score-support" className="icu-select" style={{ width: '100%' }} value={values.respiratorySupport} onChange={(e) => set('respiratorySupport')(e.target.value)}>
                                        <option value="false">{t('common.no', 'No')}</option>
                                        <option value="true">{t('common.yes', 'Yes')}</option>
                                    </select>
                                </div>
                                {f('platelets', t('scores.platelets', 'Platelets'), '×10³/µL')}
                                {f('bilirubin', t('scores.bilirubin', 'Bilirubin'), 'mg/dL', '0.1')}
                                {f('map', 'MAP', 'mmHg')}
                                {f('gcs', 'GCS', undefined, '1')}
                                {f('creatinine', t('scores.creatinine', 'Creatinine'), 'mg/dL', '0.1')}
                                {f('urineOutputMlDay', t('scores.urine', 'Urine output'), 'mL/day')}
                            </div>
                            <div>
                                <label className="icu-fld" style={PLAIN_LABEL} htmlFor="score-vaso">{t('scores.vasopressors', 'Vasopressors (µg/kg/min, for at least 1 hour)')}</label>
                                <select id="score-vaso" className="icu-select" style={{ width: '100%' }} value={values.vasopressors} onChange={(e) => set('vasopressors')(e.target.value)}>
                                    {VASOPRESSORS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </select>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={grid}>
                                {f('temperature', t('scores.temperature', 'Temperature'), '°C', '0.1')}
                                {f('map', 'MAP', 'mmHg')}
                                {f('heartRate', t('scores.heartRate', 'Heart rate'), '/min', '1')}
                                {f('respiratoryRate', t('scores.respRate', 'Resp. rate'), '/min', '1')}
                                {f('fio2Percent', 'FiO₂', '%', '1')}
                                {f('pao2', 'PaO₂', 'mmHg')}
                                {f('paco2', 'PaCO₂', 'mmHg')}
                                {f('arterialPh', t('scores.ph', 'Arterial pH'), undefined, '0.01')}
                                {f('bicarbonate', 'HCO₃', 'mmol/L')}
                                {f('sodium', t('scores.sodium', 'Sodium'), 'mmol/L')}
                                {f('potassium', t('scores.potassium', 'Potassium'), 'mmol/L', '0.1')}
                                {f('creatinine', t('scores.creatinine', 'Creatinine'), 'mg/dL', '0.1')}
                                {f('hematocrit', t('scores.hematocrit', 'Haematocrit'), '%')}
                                {f('wbc', 'WBC', '×10³/mm³', '0.1')}
                                {f('gcs', 'GCS', undefined, '1')}
                                {f('ageYears', t('scores.age', 'Age'), t('scores.years', 'years'), '1')}
                            </div>
                            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                                <div>
                                    <label className="icu-fld" style={PLAIN_LABEL} htmlFor="score-arf">{t('scores.arf', 'Acute renal failure')}</label>
                                    <select id="score-arf" className="icu-select" style={{ width: '100%' }} value={values.acuteRenalFailure} onChange={(e) => set('acuteRenalFailure')(e.target.value)}>
                                        <option value="false">{t('common.no', 'No')}</option>
                                        <option value="true">{t('scores.arfYes', 'Yes (creatinine points doubled)')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="icu-fld" style={PLAIN_LABEL} htmlFor="score-chronic">{t('scores.chronic', 'Severe organ insufficiency or immunocompromised')}</label>
                                    <select id="score-chronic" className="icu-select" style={{ width: '100%' }} value={values.chronicHealth} onChange={(e) => set('chronicHealth')(e.target.value)}>
                                        {CHRONIC.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <p style={{ margin: 0, fontSize: 11, color: 'var(--ink-3)' }}>
                                {t('scores.apacheNote', 'With FiO₂ of 50 % or more, oxygenation uses the A–a gradient and needs PaCO₂. HCO₃ is used only when there is no arterial pH.')}
                            </p>
                        </div>
                    )}
                </Card>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <Card accent>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)' }}>
                            {kind === 'SOFA' ? 'SOFA' : 'APACHE II'}{result.missing.length ? ` · ${t('scores.partial', 'partial')}` : ''}
                        </div>
                        <div className="icu-num" style={{ fontSize: 44, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>{result.total}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{scoredCount} / {componentCount} {t('scores.componentsScored', 'components scored')}</div>
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {Object.entries(result.components).map(([key, points]) => (
                                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: points === null ? 'var(--ink-4)' : 'var(--ink-2)' }}>
                                    <span>{labels[key] || key}</span>
                                    <span className="icu-mono" style={{ fontWeight: 600 }}>{points === null ? '—' : points}</span>
                                </div>
                            ))}
                            {kind === 'APACHE2' && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}><span>{t('scores.agePoints', 'Age points')}</span><span className="icu-mono" style={{ fontWeight: 600 }}>{apacheResult.agePoints}</span></div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink-2)' }}><span>{t('scores.chronicPoints', 'Chronic health points')}</span><span className="icu-mono" style={{ fontWeight: 600 }}>{apacheResult.chronicPoints}</span></div>
                                </>
                            )}
                        </div>
                        {result.missing.length > 0 && (
                            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--st-warn-fg)', background: 'var(--st-warn-bg)', borderRadius: 8, padding: '6px 8px' }}>
                                {t('scores.missing', 'Not scored (no value)')}: {result.missing.map((m) => labels[m] || m).join(', ')}
                            </div>
                        )}
                        <button type="button" className="icu-btn icu-btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={save} disabled={saving}>
                            <Icon name="check" size={14} /> {saving ? t('common.saving', 'Saving…') : t('scores.save', 'Save score')}
                        </button>
                        <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--ink-4)' }}>{t('scores.disclaimer', 'A calculation aid. Check the values against the chart before relying on the score.')}</p>
                    </Card>

                    <div>
                        <SectionTitle>{t('scores.history', 'Saved scores')}</SectionTitle>
                        <Card tight>
                            {past.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0' }}>{t('scores.noHistory', 'None saved yet.')}</div>}
                            {past.map((s, i) => {
                                const previous = past[i + 1];
                                const delta = previous ? s.total - previous.total : null;
                                const partial = Array.isArray(s.components?.missing) && (s.components.missing as string[]).length > 0;
                                return (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
                                        <span className="icu-num" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', minWidth: 34 }}>{s.total}</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{new Date(s.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.author?.name}{partial ? ` · ${t('scores.partial', 'partial')}` : ''}</div>
                                        </div>
                                        {delta !== null && delta !== 0 && <Pill tone={delta > 0 ? 'crit' : 'ok'}>{delta > 0 ? `+${delta}` : delta}</Pill>}
                                        <button type="button" className="icu-btn icu-btn-icon-sm icu-btn-ghost" title={t('scores.delete', 'Delete')} onClick={() => remove(s)}><Icon name="trash" size={14} /></button>
                                    </div>
                                );
                            })}
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
