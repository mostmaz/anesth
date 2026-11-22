import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { History, Plus, Activity } from 'lucide-react';
import { ventilatorApi, type VentilatorSetting } from '../../api/ventilatorApi';
import type { Patient } from '../../types';
import { toast } from 'sonner';
import { useLang } from '../../i18n';
import { VENT_LIMITS, limitProblem } from '../../shared/ranges';
import {
    DRIVING_PRESSURE_LIMIT, PLATEAU_PRESSURE_LIMIT, VT_PER_KG_UPPER,
    drivingPressure, oxygenationBand, pfRatio, predictedBodyWeight, staticCompliance, vtPerKgPbw, vtTargetRange,
} from '../../shared/vent';

interface VentilatorTabProps {
    patientId: string;
    // Height and sex give the predicted body weight used for tidal-volume targets.
    patient?: Patient;
}

// Current local time for a datetime-local input ("YYYY-MM-DDTHH:mm").
const localNow = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const emptyForm = () => ({ mode: '', rate: '', fiO2: '', ieRatio: '', peep: '', plateau: '', pao2: '', ps: '', vt: '', timestamp: localNow() });

const num = (value: string): number | null => (value.trim() === '' ? null : Number(value));

type Tone = 'ok' | 'warn' | 'crit' | 'muted';
const TONE_STYLE: Record<Tone, string> = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warn: 'border-amber-300 bg-amber-50 text-amber-900',
    crit: 'border-red-300 bg-red-50 text-red-900',
    muted: 'border-slate-200 bg-slate-50 text-slate-700',
};

function Metric({ label, value, unit, note, tone = 'muted' }: { label: string; value: string | number | null; unit?: string; note?: string; tone?: Tone }) {
    return (
        <div className={`rounded-lg border p-3 ${TONE_STYLE[value === null ? 'muted' : tone]}`}>
            <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
            <div className="text-xl font-bold leading-tight">
                {value === null ? '—' : value}{value !== null && unit ? <span className="text-xs font-medium opacity-80"> {unit}</span> : null}
            </div>
            {note && <div className="text-[11px] opacity-80 mt-0.5">{note}</div>}
        </div>
    );
}

export default function VentilatorTab({ patientId, patient }: VentilatorTabProps) {
    const { t } = useLang();
    const [history, setHistory] = useState<VentilatorSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState(emptyForm());

    const fetchHistory = async () => {
        try {
            setHistory(await ventilatorApi.getHistory(patientId));
        } catch (error: any) {
            toast.error(error?.message || 'Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Catch typing slips before sending.
        const problems = [
            limitProblem(form.rate, VENT_LIMITS.rate), limitProblem(form.fiO2, VENT_LIMITS.fio2),
            limitProblem(form.ps, VENT_LIMITS.ps), limitProblem(form.vt, VENT_LIMITS.vt),
            limitProblem(form.peep, VENT_LIMITS.peep), limitProblem(form.plateau, VENT_LIMITS.plateau),
            limitProblem(form.pao2, VENT_LIMITS.pao2),
        ].filter(Boolean);
        const plateau = num(form.plateau);
        const peep = num(form.peep);
        if (plateau !== null && peep !== null && plateau <= peep) problems.push(t('vent.plateauAbovePeep', 'Plateau pressure must be higher than PEEP'));
        if (problems.length) { toast.error(problems.join(' · ')); return; }

        setIsSubmitting(true);
        try {
            await ventilatorApi.recordSettings({
                patientId,
                mode: form.mode.trim(),
                rate: num(form.rate) ?? 0,
                fio2: Number(form.fiO2),
                ie: form.ieRatio.trim(),
                ps: num(form.ps) ?? 0,
                vt: num(form.vt) ?? 0,
                peep,
                plateau,
                pao2: num(form.pao2),
                timestamp: new Date(form.timestamp).toISOString(),
            });
            toast.success('Settings recorded');
            setForm(emptyForm());
            fetchHistory();
        } catch (error: any) {
            toast.error(error?.message || 'Failed to record settings');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

    // Derived values for the most recent record.
    const latest = history[0];
    const pbw = predictedBodyWeight(patient?.heightCm, patient?.gender);
    const target = vtTargetRange(pbw);
    const pf = latest ? pfRatio(latest.pao2, latest.fio2) : null;
    const band = oxygenationBand(pf);
    const dp = latest ? drivingPressure(latest.plateau, latest.peep) : null;
    const compliance = latest ? staticCompliance(latest.vt, latest.plateau, latest.peep) : null;
    const vtKg = latest ? vtPerKgPbw(latest.vt, pbw) : null;
    const bandNote: Record<string, string> = {
        normal: t('vent.bandNormal', 'above 300'),
        mild: t('vent.bandMild', '200–300 (mild range)'),
        moderate: t('vent.bandModerate', '100–200 (moderate range)'),
        severe: t('vent.bandSevere', 'under 100 (severe range)'),
    };

    const set = (key: keyof ReturnType<typeof emptyForm>) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value });

    return (
        <div className="space-y-6">
            {latest && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Activity className="w-4 h-4" /> {t('vent.derived', 'Lung-protective check')}
                            <span className="text-xs font-normal text-slate-500">
                                · {t('vent.fromRecord', 'from the record of')} {new Date(latest.timestamp).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <Metric
                                label="P/F"
                                value={pf}
                                note={pf === null ? t('vent.needPao2', 'needs PaO₂') : band ? bandNote[band] : undefined}
                                tone={band === 'severe' ? 'crit' : band === 'moderate' || band === 'mild' ? 'warn' : 'ok'}
                            />
                            <Metric
                                label={t('vent.drivingPressure', 'Driving pressure')}
                                value={dp} unit="cmH₂O"
                                note={dp === null ? t('vent.needPlateau', 'needs plateau and PEEP') : dp > DRIVING_PRESSURE_LIMIT ? `${t('vent.above', 'above')} ${DRIVING_PRESSURE_LIMIT}` : `≤ ${DRIVING_PRESSURE_LIMIT}`}
                                tone={dp !== null && dp > DRIVING_PRESSURE_LIMIT ? 'crit' : 'ok'}
                            />
                            <Metric
                                label={t('vent.plateau', 'Plateau')}
                                value={latest.plateau ?? null} unit="cmH₂O"
                                note={latest.plateau == null ? undefined : latest.plateau > PLATEAU_PRESSURE_LIMIT ? `${t('vent.above', 'above')} ${PLATEAU_PRESSURE_LIMIT}` : `≤ ${PLATEAU_PRESSURE_LIMIT}`}
                                tone={latest.plateau != null && latest.plateau > PLATEAU_PRESSURE_LIMIT ? 'crit' : 'ok'}
                            />
                            <Metric
                                label={t('vent.vtPerKg', 'Vt per kg PBW')}
                                value={vtKg} unit="mL/kg"
                                note={pbw === null ? t('vent.needHeight', 'needs height and sex') : target ? `${t('vent.target', 'target')} ${target.low}–${target.high} mL · PBW ${pbw} kg` : undefined}
                                tone={vtKg !== null && vtKg > VT_PER_KG_UPPER ? 'crit' : 'ok'}
                            />
                            <Metric label={t('vent.compliance', 'Static compliance')} value={compliance} unit="mL/cmH₂O" />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2">{t('vent.disclaimer', 'Calculated from the charted values as an aid; it does not replace clinical assessment.')}</p>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> New Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vent-mode">Mode</Label>
                                    <Input id="vent-mode" required placeholder="e.g. SIMV" value={form.mode} onChange={set('mode')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vent-rate">Rate (/min)</Label>
                                    <Input id="vent-rate" required type="number" min={VENT_LIMITS.rate.min} max={VENT_LIMITS.rate.max} value={form.rate} onChange={set('rate')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vent-fio2">FiO₂ (%)</Label>
                                    <Input id="vent-fio2" required type="number" min={VENT_LIMITS.fio2.min} max={VENT_LIMITS.fio2.max} placeholder="21–100" value={form.fiO2} onChange={set('fiO2')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vent-peep">PEEP (cmH₂O)</Label>
                                    <Input id="vent-peep" type="number" step="0.5" min={VENT_LIMITS.peep.min} max={VENT_LIMITS.peep.max} value={form.peep} onChange={set('peep')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vent-vt">Vt (mL)</Label>
                                    <Input id="vent-vt" required type="number" min={VENT_LIMITS.vt.min} max={VENT_LIMITS.vt.max} value={form.vt} onChange={set('vt')} />
                                    {target && <p className="text-[11px] text-slate-500">{t('vent.target', 'target')} {target.low}–{target.high} mL</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vent-ps">PS (cmH₂O)</Label>
                                    <Input id="vent-ps" required type="number" min={VENT_LIMITS.ps.min} max={VENT_LIMITS.ps.max} value={form.ps} onChange={set('ps')} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vent-plateau">{t('vent.plateauFull', 'Plateau pressure')}</Label>
                                    <Input id="vent-plateau" type="number" step="0.5" min={VENT_LIMITS.plateau.min} max={VENT_LIMITS.plateau.max} placeholder="cmH₂O" value={form.plateau} onChange={set('plateau')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vent-pao2">PaO₂ (mmHg)</Label>
                                    <Input id="vent-pao2" type="number" step="0.1" min={VENT_LIMITS.pao2.min} max={VENT_LIMITS.pao2.max} placeholder={t('vent.fromAbg', 'from ABG')} value={form.pao2} onChange={set('pao2')} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vent-ie">I:E Ratio</Label>
                                <Input id="vent-ie" required placeholder="e.g. 1:2" value={form.ieRatio} onChange={set('ieRatio')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vent-time">Recorded At</Label>
                                <Input id="vent-time" type="datetime-local" max={localNow()} value={form.timestamp} onChange={set('timestamp')} />
                            </div>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting ? 'Recording...' : 'Record Settings'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-4 h-4" /> Setting History
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="min-w-[640px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Mode/Rate</TableHead>
                                        <TableHead>FiO₂</TableHead>
                                        <TableHead>PEEP</TableHead>
                                        <TableHead>Pplat</TableHead>
                                        <TableHead>ΔP</TableHead>
                                        <TableHead>Vt/PS</TableHead>
                                        <TableHead>PaO₂</TableHead>
                                        <TableHead>P/F</TableHead>
                                        <TableHead>I:E</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.map((h) => {
                                        const rowDp = drivingPressure(h.plateau, h.peep);
                                        const rowPf = pfRatio(h.pao2, h.fio2);
                                        return (
                                            <TableRow key={h.id}>
                                                <TableCell className="text-xs whitespace-nowrap">
                                                    {new Date(h.timestamp).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="font-medium text-sm">{h.mode} / {h.rate}</TableCell>
                                                <TableCell>{h.fio2}%</TableCell>
                                                <TableCell>{h.peep ?? '—'}</TableCell>
                                                <TableCell>{h.plateau ?? '—'}</TableCell>
                                                <TableCell className={rowDp !== null && rowDp > DRIVING_PRESSURE_LIMIT ? 'text-red-700 font-semibold' : ''}>{rowDp ?? '—'}</TableCell>
                                                <TableCell>{h.vt}/{h.ps}</TableCell>
                                                <TableCell>{h.pao2 ?? '—'}</TableCell>
                                                <TableCell className={rowPf !== null && rowPf <= 200 ? 'text-red-700 font-semibold' : ''}>{rowPf ?? '—'}</TableCell>
                                                <TableCell>{h.ie}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {history.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-slate-400 italic py-8">No history recorded</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
