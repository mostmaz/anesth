import { useState } from 'react';
import { fluidSummary, formatBalance, type FluidEntryLike, type FluidPeriod } from '../../shared/fluid';
import { useLang } from '../../i18n';

// Fluid balance for the periods the unit works with: this shift, the previous
// shift, the last 24 hours, the chart day (08:00–08:00) and the whole stay.

interface Props {
    entries: FluidEntryLike[];
    weightKg?: number | null;
    admittedAt?: string | null;
}

const clock = (d?: Date) => (d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

export function FluidBalanceSummary({ entries, weightKg, admittedAt }: Props) {
    const { t } = useLang();
    const [selected, setSelected] = useState<FluidPeriod['key']>('shift');
    const periods = fluidSummary(entries, new Date(), { weightKg, admittedAt });

    const title = (p: FluidPeriod): string => {
        const shiftName = p.shiftType === 'DAY' ? t('shift.day', 'Day shift') : t('shift.night', 'Night shift');
        switch (p.key) {
            case 'shift': return `${t('io.thisShift', 'This shift')} · ${shiftName}`;
            case 'previousShift': return `${t('io.previousShift', 'Previous shift')} · ${shiftName}`;
            case 'last24h': return t('io.last24h', 'Last 24 hours');
            case 'chartDay': return t('io.chartDay', 'Chart day (08:00–08:00)');
            default: return t('io.wholeStay', 'Whole stay');
        }
    };
    const range = (p: FluidPeriod): string => {
        if (p.key === 'shift' || p.key === 'previousShift') return `${clock(p.window.start)}–${clock(p.window.end)}`;
        if (p.key === 'cumulative') return p.window.start ? `${t('io.since', 'since')} ${p.window.start.toLocaleDateString([], { day: 'numeric', month: 'short' })}` : '';
        return '';
    };

    const active = periods.find((p) => p.key === selected) || periods[0];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {periods.map((p) => {
                    const positive = p.totals.balance >= 0;
                    const isActive = p.key === selected;
                    return (
                        <button
                            key={p.key}
                            type="button"
                            onClick={() => setSelected(p.key)}
                            aria-pressed={isActive}
                            className={`text-start rounded-lg border p-3 transition-colors ${isActive ? 'border-blue-500 ring-2 ring-blue-200 bg-white' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                        >
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 leading-tight">{title(p)}</div>
                            {range(p) && <div className="text-[11px] text-slate-400">{range(p)}</div>}
                            <div className={`text-xl font-bold mt-1 ${positive ? 'text-emerald-700' : 'text-red-700'}`}>{formatBalance(p.totals.balance)}</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                                <span className="text-blue-700">↓ {p.totals.input.toLocaleString('en-US')}</span>
                                <span className="mx-1 text-slate-300">|</span>
                                <span className="text-amber-700">↑ {p.totals.output.toLocaleString('en-US')}</span> mL
                            </div>
                            {p.urineMlKgHr !== null && (p.totals.input > 0 || p.totals.output > 0) && (
                                <div className={`text-[11px] mt-0.5 ${p.urineMlKgHr < 0.5 ? 'text-red-700 font-semibold' : 'text-slate-500'}`}>
                                    {t('io.urine', 'Urine')} {p.urineMlKgHr} mL/kg/h
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {(active.totals.inputByCategory.length > 0 || active.totals.outputByCategory.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="text-xs font-semibold text-blue-700 mb-1">{t('io.intake', 'Intake')} · {title(active)}</div>
                        {active.totals.inputByCategory.length === 0 ? <div className="text-slate-500">—</div> : active.totals.inputByCategory.map((c) => (
                            <div key={c.category} className="flex justify-between"><span>{c.category}</span><span className="font-mono">{c.amount.toLocaleString('en-US')} mL</span></div>
                        ))}
                    </div>
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <div className="text-xs font-semibold text-amber-700 mb-1">{t('io.output', 'Output')} · {title(active)}</div>
                        {active.totals.outputByCategory.length === 0 ? <div className="text-slate-500">—</div> : active.totals.outputByCategory.map((c) => (
                            <div key={c.category} className="flex justify-between"><span>{c.category}</span><span className="font-mono">{c.amount.toLocaleString('en-US')} mL</span></div>
                        ))}
                    </div>
                </div>
            )}
            {!weightKg && <p className="text-[11px] text-slate-500">{t('io.needWeight', 'Record the patient’s weight to see urine output in mL/kg/h.')}</p>}
        </div>
    );
}
