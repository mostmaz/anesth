import { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { notesApi, type ClinicalNote } from '../../api/notesApi';
import { vitalsApi } from '../../api/vitalsApi';
import { marApi } from '../../api/marApi';
import { useAuthStore } from '../../stores/authStore';
import { type Patient } from '../../types';
import { Printer, Plus, Sun, Moon, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

// ICU ward-round systems (system-by-system format).
const SYSTEMS: Array<{ key: string; label: string; hint: string }> = [
    { key: 'neuro', label: 'Neuro / Sedation', hint: 'GCS, RASS, sedation, pain…' },
    { key: 'resp', label: 'Respiratory', hint: 'Mode, FiO₂, ABG, wean plan…' },
    { key: 'cvs', label: 'Cardiovascular', hint: 'Rhythm, MAP, pressors…' },
    { key: 'renal', label: 'Renal / Fluids', hint: 'UO, balance, creatinine, RRT…' },
    { key: 'git', label: 'GI / Nutrition', hint: 'Feed, bowels, PPI…' },
    { key: 'id', label: 'Infection / Antibiotics', hint: 'Temp, WBC, cultures, Abx day…' },
];

type SystemsMap = Record<string, string>;
const emptySystems = (): SystemsMap => SYSTEMS.reduce((a, s) => ({ ...a, [s.key]: '' }), {});

interface VitalsSnap { hr?: number; sys?: number; dia?: number; spo?: number; temp?: number; rr?: number; rbs?: number; at?: string }
interface RoundData {
    kind: 'ROUND';
    tourType: 'MORNING' | 'NIGHT';
    vitals?: VitalsSnap;
    infusions?: Array<{ name: string; rate: string; dose: string }>;
    details?: string;   // main free-text write-up
    systems?: SystemsMap;
    plan?: string;
}

export default function RoundsTab({ patientId, patient }: { patientId: string; patient?: Patient }) {
    const { user } = useAuthStore();
    const [rounds, setRounds] = useState<ClinicalNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Auto-fill sources
    const [latestVitals, setLatestVitals] = useState<VitalsSnap | undefined>();
    const [infusions, setInfusions] = useState<Array<{ name: string; rate: string; dose: string }>>([]);

    const [showAdd, setShowAdd] = useState(false);
    const [busy, setBusy] = useState(false);
    const [tourType, setTourType] = useState<'MORNING' | 'NIGHT'>('MORNING');
    const [details, setDetails] = useState('');
    const [systems, setSystems] = useState<SystemsMap>(emptySystems());
    const [plan, setPlan] = useState('');

    const fetchRounds = async () => {
        setLoading(true);
        try {
            const all = await notesApi.getAll(patientId);
            setRounds(all.filter(n => n?.data && (n.data as any).kind === 'ROUND'));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchAutofill = async () => {
        try {
            const [vitals, meds] = await Promise.all([
                vitalsApi.getVitals(patientId).catch(() => []),
                marApi.getMAR(patientId).catch(() => []),
            ]);
            // Coalesce the latest non-null value per metric across recent rows (newest first).
            const sorted = [...vitals].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            const pick = (f: keyof typeof sorted[number]) => {
                for (const v of sorted) { const val = (v as any)[f]; if (val !== null && val !== undefined) return val; }
                return undefined;
            };
            setLatestVitals(sorted.length ? {
                hr: pick('heartRate'), sys: pick('bpSys'), dia: pick('bpDia'),
                spo: pick('spo2'), temp: pick('temp'), rr: pick('rr'), rbs: pick('rbs'),
                at: sorted[0]?.timestamp,
            } : undefined);
            setInfusions(
                (meds as any[])
                    .filter(m => m.isActive && (m.route === 'Infusion' || m.frequency === 'Infusion'))
                    .map(m => ({ name: m.name, rate: m.infusionRate || '—', dose: m.defaultDose || '' }))
            );
        } catch (e) { console.error(e); }
    };

    useEffect(() => { fetchRounds(); fetchAutofill(); /* eslint-disable-next-line */ }, [patientId]);

    const openAdd = () => {
        setTourType(new Date().getHours() < 17 ? 'MORNING' : 'NIGHT');
        setDetails('');
        setSystems(emptySystems());
        setPlan('');
        fetchAutofill();
        setShowAdd(true);
    };

    const save = async () => {
        if (!user) { toast.error('Not signed in'); return; }
        setBusy(true);
        try {
            const data: RoundData = { kind: 'ROUND', tourType, vitals: latestVitals, infusions, details: details.trim(), systems, plan: plan.trim() };
            const content = (details.trim() ? [details.trim()] : [])
                .concat(SYSTEMS
                    .filter(s => (systems[s.key] || '').trim())
                    .map(s => `${s.label}: ${systems[s.key].trim()}`))
                .concat(plan.trim() ? [`Assessment & Plan: ${plan.trim()}`] : [])
                .join('\n');
            await notesApi.create({
                patientId, authorId: user.id, type: 'PROGRESS',
                title: tourType === 'MORNING' ? 'Morning Round' : 'Night Round',
                content: content || `${tourType === 'MORNING' ? 'Morning' : 'Night'} round`,
                data,
            });
            toast.success('Round saved');
            setShowAdd(false);
            fetchRounds();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save round');
        } finally {
            setBusy(false);
        }
    };

    const printRound = (round: ClinicalNote) => {
        const html = buildRoundHtml(patient, round);
        const w = window.open('', '_blank', 'width=820,height=1040');
        if (!w) { toast.error('Allow pop-ups to print the round'); return; }
        w.document.write(html);
        w.document.close();
    };

    const vLine = (v?: VitalsSnap) => v
        ? `HR ${v.hr ?? '—'} · BP ${v.sys ?? '—'}/${v.dia ?? '—'} · SpO₂ ${v.spo ?? '—'}% · T ${v.temp ?? '—'}°${v.rr ? ` · RR ${v.rr}` : ''}${v.rbs ? ` · RBS ${v.rbs}` : ''}`
        : 'No vitals on record';

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-blue-600" />
                    <div>
                        <h3 className="text-lg font-semibold">Rounds · الجولة</h3>
                        <p className="text-xs text-slate-500">{rounds.length} round{rounds.length === 1 ? '' : 's'} recorded</p>
                    </div>
                </div>
                <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700"><Plus className="w-4 h-4 mr-1" /> Add round</Button>
            </div>

            {loading ? (
                <Card><CardContent className="py-10 text-center text-slate-400">Loading…</CardContent></Card>
            ) : rounds.length === 0 ? (
                <Card><CardContent className="py-10 text-center text-slate-400">
                    <p>No rounds yet.</p><p className="text-sm mt-1">Click “Add round” to record the morning or night tour.</p>
                </CardContent></Card>
            ) : (
                <div className="space-y-3">
                    {rounds.map(round => {
                        const d = (round.data || {}) as RoundData;
                        const morning = d.tourType === 'MORNING';
                        const open = expandedId === round.id;
                        return (
                            <Card key={round.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpandedId(open ? null : round.id)}>
                                        <Badge className={morning ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-100 text-indigo-800 border-indigo-200'}>
                                            {morning ? <><Sun className="w-3 h-3 mr-1" /> Morning</> : <><Moon className="w-3 h-3 mr-1" /> Night</>}
                                        </Badge>
                                        <span className="text-sm text-slate-500 ml-auto">
                                            {new Date(round.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">{vLine(d.vitals)}</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">By {round.author?.name || '—'}</p>

                                    {open && (
                                        <div className="mt-3 space-y-2 text-sm text-slate-700 border-t pt-3">
                                            {d.infusions && d.infusions.length > 0 && (
                                                <p><b>Infusions:</b> {d.infusions.map(i => `${i.name} (${i.rate})`).join(' · ')}</p>
                                            )}
                                            {(d.details || '').trim() ? <p className="whitespace-pre-wrap">{d.details}</p> : null}
                                            {SYSTEMS.map(s => (d.systems?.[s.key] || '').trim() ? (
                                                <p key={s.key}><b>{s.label}:</b> {d.systems![s.key]}</p>
                                            ) : null)}
                                            {d.plan ? <p><b>Assessment &amp; Plan:</b> {d.plan}</p> : null}
                                            <Button variant="outline" size="sm" onClick={() => printRound(round)} className="mt-1">
                                                <Printer className="w-4 h-4 mr-1" /> Print round
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Add round dialog */}
            <Dialog open={showAdd} onOpenChange={(o) => !o && setShowAdd(false)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>New round · جولة جديدة</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex gap-2">
                            <Button type="button" variant={tourType === 'MORNING' ? 'default' : 'outline'}
                                onClick={() => setTourType('MORNING')} className={tourType === 'MORNING' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                                <Sun className="w-4 h-4 mr-1" /> Morning
                            </Button>
                            <Button type="button" variant={tourType === 'NIGHT' ? 'default' : 'outline'}
                                onClick={() => setTourType('NIGHT')} className={tourType === 'NIGHT' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
                                <Moon className="w-4 h-4 mr-1" /> Night
                            </Button>
                        </div>

                        {/* Auto-filled snapshot */}
                        <div className="bg-slate-50 border rounded-lg p-3 space-y-1">
                            <p className="text-[11px] font-bold text-slate-500 tracking-wide">AUTO-FILLED SNAPSHOT</p>
                            <p className="text-sm font-semibold text-slate-800">{vLine(latestVitals)}</p>
                            <p className="text-sm text-slate-700"><b>Infusions:</b> {infusions.length ? infusions.map(i => `${i.name} (${i.rate})`).join(' · ') : 'none'}</p>
                            <p className="text-[11px] text-slate-400">Pulled from the latest chart data — included automatically in the printed round.</p>
                        </div>

                        {/* Main free-text round write-up */}
                        <div>
                            <label className="text-sm font-medium">Round details · تفاصيل الجولة</label>
                            <Textarea rows={6} placeholder="Write the round in detail here…" value={details}
                                onChange={(e) => setDetails(e.target.value)} className="mt-1" />
                            <p className="text-[11px] text-slate-400 mt-1">Optionally break it down by system below.</p>
                        </div>

                        {SYSTEMS.map(s => (
                            <div key={s.key}>
                                <label className="text-sm font-medium">{s.label}</label>
                                <Textarea rows={2} placeholder={s.hint} value={systems[s.key]}
                                    onChange={(e) => setSystems(p => ({ ...p, [s.key]: e.target.value }))} className="mt-1" />
                            </div>
                        ))}
                        <div>
                            <label className="text-sm font-medium">Assessment &amp; Plan</label>
                            <Textarea rows={4} placeholder="Impression + today’s plan / tasks…" value={plan}
                                onChange={(e) => setPlan(e.target.value)} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
                        <Button onClick={save} disabled={busy} className="bg-blue-600 hover:bg-blue-700">
                            {busy ? 'Saving…' : 'Save round'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// A4 ward-round document opened in a new window to print / save as PDF.
function buildRoundHtml(patient: Patient | undefined, round: ClinicalNote): string {
    const d = (round.data || {}) as RoundData;
    const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    const nl = (s: string) => esc(s).replace(/\n/g, '<br>');
    const v = d.vitals;
    const vLine = v
        ? `HR ${v.hr ?? '—'} &middot; BP ${v.sys ?? '—'}/${v.dia ?? '—'} &middot; SpO₂ ${v.spo ?? '—'}% &middot; Temp ${v.temp ?? '—'}°C${v.rr ? ` &middot; RR ${v.rr}` : ''}${v.rbs ? ` &middot; RBS ${v.rbs}` : ''}`
        : '—';
    const inf = (d.infusions && d.infusions.length) ? d.infusions.map(i => `${esc(i.name)} (${esc(i.rate)})`).join(' &middot; ') : '—';
    const created = new Date(round.createdAt).toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    const pmh = (patient as any)?.comorbidities as string[] | undefined;
    const sysRows = SYSTEMS.map(s => (d.systems?.[s.key] || '').trim()
        ? `<h2>${esc(s.label)}</h2><div class="box">${nl(d.systems![s.key])}</div>` : '').join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>ICU Round — ${esc(patient?.name)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: -apple-system, system-ui, sans-serif; color:#0f172a; margin:0; }
  h1 { font-size:20px; margin:0 0 2px; }
  .badge { display:inline-block; font-size:12px; font-weight:700; padding:2px 12px; border-radius:99px; }
  .m { background:#fef9c3; color:#854d0e; } .n { background:#e0e7ff; color:#3730a3; }
  .sub { font-size:12px; color:#64748b; margin:6px 0 14px; }
  .meta { display:flex; flex-wrap:wrap; gap:18px; font-size:12px; color:#334155; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px; }
  .meta b { color:#0f172a; }
  .snap { background:#f1f5f9; border-radius:8px; padding:10px 12px; font-size:13px; margin-bottom:12px; }
  .snap .l { font-weight:700; color:#334155; }
  h2 { font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#334155; border-bottom:1px solid #e2e8f0; padding-bottom:3px; margin:14px 0 6px; }
  .box { font-size:13px; line-height:1.5; color:#1e293b; white-space:pre-wrap; }
  .foot { margin-top:26px; font-size:10px; color:#94a3b8; text-align:center; }
</style></head>
<body>
  <h1>ICU Ward Round <span class="badge ${d.tourType === 'MORNING' ? 'm' : 'n'}">${d.tourType === 'MORNING' ? '☀ Morning' : '🌙 Night'}</span></h1>
  <div class="sub">${created}</div>
  <div class="meta">
    <span><b>Patient:</b> ${esc(patient?.name)}</span>
    <span><b>MRN:</b> ${esc(patient?.mrn)}</span>
    <span><b>Age/Sex:</b> ${esc((patient as any)?.age)} / ${esc((patient as any)?.gender)}</span>
    <span><b>Doctor:</b> ${esc(round.author?.name || '—')}</span>
  </div>
  ${pmh?.length ? `<div class="snap"><span class="l">PMH:</span> ${esc(pmh.join(', '))}</div>` : ''}
  <div class="snap">
    <div><span class="l">Vitals:</span> ${vLine}</div>
    <div><span class="l">Active infusions:</span> ${inf}</div>
  </div>
  ${d.details && d.details.trim() ? `<h2>Round</h2><div class="box">${nl(d.details)}</div>` : ''}
  ${sysRows}
  ${d.plan ? `<h2>Assessment &amp; Plan</h2><div class="box">${nl(d.plan)}</div>` : ''}
  <div class="foot">ICU Manager — Confidential Clinical Document</div>
  <script>setTimeout(function(){ try { window.print(); } catch(e) {} }, 500);</script>
</body></html>`;
}
