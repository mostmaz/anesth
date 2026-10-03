import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import TrendChart from './TrendChart';
import { vitalsApi, type VitalSign } from '../../api/vitalsApi';
import { marApi, type Medication } from '../../api/marApi';
import { ioApi } from '../../api/ioApi';
import { useAuthStore } from '../../stores/authStore';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { UploadVitalsDialog } from './UploadVitalsDialog';

// Any drug whose MAR route of administration is "Infusion" is charted alongside the
// vitals: its ml/hr rate is recorded, and the volume infused since the last charted
// rate feeds the I/O intake.
const rateRe = /([\d.]+)\s*ml\s*\/\s*hr/i;
const isInfusionMed = (m: Medication) => m.isActive && (m.route === 'Infusion' || m.frequency === 'Infusion');

interface VitalsTabProps {
    patientId?: string;
}

export default function VitalsTab({ patientId: propPatientId }: VitalsTabProps) {
    const { id: paramPatientId } = useParams();
    const navigate = useNavigate();
    const patientId = propPatientId || paramPatientId;
    const { user } = useAuthStore();
    const [vitals, setVitals] = useState<VitalSign[]>([]);
    const [meds, setMeds] = useState<Medication[]>([]);
    const [drugRates, setDrugRates] = useState<Record<string, string>>({});
    const [newEntry, setNewEntry] = useState({ hr: '', bpSys: '', bpDia: '', spo2: '', temp: '', rbs: '', rr: '', imageUrl: '' });

    useEffect(() => {
        if (patientId) {
            vitalsApi.getVitals(patientId).then(setVitals).catch(console.error);
            marApi.getMAR(patientId).then(setMeds).catch(() => setMeds([]));
        }
    }, [patientId]);

    // Active infusion drugs — charted in the vitals form so their ml/hr rate is recorded.
    const infusionMeds = meds.filter(isInfusionMed);
    // Infusion drugs that have charted ml/hr rates → extra columns in the history table.
    const supportCols = infusionMeds.filter(m =>
        (m.administrations || []).some(a => rateRe.test(a.dose || '')),
    );
    // Vitals ascending (oldest→newest) for the trend charts, which plot in array order
    // and treat the final point as the current reading.
    const chartData = [...vitals].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    // Rate charted for `m` nearest to a vital's timestamp (within 20 min), else ''.
    const rateAt = (m: Medication, iso: string): string => {
        const t = new Date(iso).getTime();
        const cands = (m.administrations || [])
            .map(a => { const mt = rateRe.exec(a.dose || ''); return mt ? { v: mt[1], dt: Math.abs(new Date(a.timestamp).getTime() - t) } : null; })
            .filter((x): x is { v: string; dt: number } => x !== null)
            .sort((a, b) => a.dt - b.dt);
        return cands[0] && cands[0].dt < 20 * 60_000 ? cands[0].v : '';
    };

    // Defensive numeric parser: trims, accepts empty/null, returns null for any non-finite input.
    // This catches accidental letters (e.g. "N" from a paste / autocorrect) instead of letting
    // NaN reach the backend, which would surface as "invalid number formatting character N".
    const parseNum = (v: string | number | null | undefined): number | null => {
        if (v === '' || v == null) return null;
        const s = typeof v === 'number' ? v : String(v).trim();
        if (s === '') return null;
        const n = typeof s === 'number' ? s : Number(s);
        return Number.isFinite(n) ? n : null;
    };

    const handleAddVitals = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) return;

        // Validation — reject obvious typos before sending
        const fieldErrors: string[] = [];
        const hr = parseNum(newEntry.hr);
        if (newEntry.hr && hr === null) fieldErrors.push('Heart Rate must be a number');
        else if (hr !== null && (hr <= 0 || hr > 300)) fieldErrors.push('Heart Rate out of range (1–300)');

        const spo2 = parseNum(newEntry.spo2);
        if (newEntry.spo2 && spo2 === null) fieldErrors.push('SpO₂ must be a number');
        else if (spo2 !== null && (spo2 < 0 || spo2 > 100)) fieldErrors.push('SpO₂ out of range (0–100)');

        // Any other field that has text but doesn't parse — flag too
        (['bpSys', 'bpDia', 'temp', 'rbs', 'rr'] as const).forEach(k => {
            const raw = newEntry[k];
            if (raw && parseNum(raw) === null) fieldErrors.push(`${k} must be a number`);
        });

        if (fieldErrors.length > 0) {
            toast.error(fieldErrors.join(' · '));
            return;
        }

        // Infusion rates entered → chart each (works with or without a vitals row).
        const rateEntries = infusionMeds
            .map(m => ({ m, rate: (drugRates[m.id] || '').trim() }))
            .filter(x => x.rate !== '' && Number.isFinite(Number(x.rate)) && Number(x.rate) > 0);
        const anyVitalTyped = (['hr', 'bpSys', 'bpDia', 'spo2', 'temp', 'rbs', 'rr'] as const)
            .some(k => (newEntry[k] || '').trim() !== '');

        if (!anyVitalTyped && rateEntries.length === 0) {
            toast.error('Enter a vital sign or an infusion rate');
            return;
        }

        try {
            // Only create a vitals row when a vital was entered; a rate-only entry just
            // charts the infusion(s) without leaving an empty vitals record behind.
            if (anyVitalTyped) {
                const entry = await vitalsApi.addVitals({
                    patientId,
                    heartRate: hr,
                    bpSys: parseNum(newEntry.bpSys),
                    bpDia: parseNum(newEntry.bpDia),
                    spo2: spo2,
                    temp: parseNum(newEntry.temp),
                    rbs: parseNum(newEntry.rbs),
                    rr: parseNum(newEntry.rr),
                    imageUrl: newEntry.imageUrl || null,
                });
                setVitals([entry, ...vitals]);
            }

            // Record an administration for each charted rate, then derive the volume
            // infused since the last charted rate (prevRate × elapsed hours) into I/O.
            if (rateEntries.length && user) {
                for (const { m, rate } of rateEntries) {
                    try {
                        const prev = (m.administrations || [])
                            .map(a => { const mt = rateRe.exec(a.dose || ''); return mt ? { r: parseFloat(mt[1]), t: new Date(a.timestamp).getTime() } : null; })
                            .filter((x): x is { r: number; t: number } => x !== null && Number.isFinite(x.r))
                            .sort((a, b) => b.t - a.t)[0];
                        await marApi.administerMedication({ patientId, medicationId: m.id, status: 'Given', dose: `${rate} ml/hr`, userId: user.id });
                        if (prev) {
                            const hours = (Date.now() - prev.t) / 3_600_000;
                            const vol = Math.round(prev.r * hours);
                            if (vol > 0 && hours > 0 && hours < 24) {
                                await ioApi.addEntry({ patientId, userId: user.id, type: 'INPUT', category: `Infusion · ${m.name}`, amount: vol, notes: `${prev.r} ml/hr × ${hours.toFixed(1)}h` });
                            }
                        }
                    } catch { /* skip this drug on failure */ }
                }
                marApi.getMAR(patientId).then(setMeds).catch(() => {});
            }

            setNewEntry({ hr: '', bpSys: '', bpDia: '', spo2: '', temp: '', rbs: '', rr: '', imageUrl: '' });
            setDrugRates({});
            if (anyVitalTyped && rateEntries.length) toast.success(`Vitals recorded · charted ${rateEntries.length} rate${rateEntries.length === 1 ? '' : 's'}`);
            else if (anyVitalTyped) toast.success('Vitals recorded successfully');
            else toast.success(`Charted ${rateEntries.length} infusion rate${rateEntries.length === 1 ? '' : 's'}`);
        } catch (error: any) {
            toast.error(error?.message || 'Failed to record vitals');
        }
    };

    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const [printRange, setPrintRange] = useState<'SHIFT' | 'CUSTOM'>('SHIFT');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');

    const handlePrint = () => {
        let start = new Date();
        let end = new Date();

        if (printRange === 'SHIFT') {
            const now = new Date();
            // Simple 12h shift logic: Day (8am-8pm) / Night (8pm-8am)
            if (now.getHours() >= 8 && now.getHours() < 20) {
                start = new Date(now);
                start.setHours(8, 0, 0, 0);
                end = new Date(now);
                end.setHours(20, 0, 0, 0);
            } else {
                start = new Date(now);
                if (now.getHours() < 8) {
                    start.setDate(start.getDate() - 1);
                }
                start.setHours(20, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 1);
                end.setHours(8, 0, 0, 0);
            }
        } else {
            if (!customStart || !customEnd) {
                toast.error("Please select start and end times");
                return;
            }
            start = new Date(customStart);
            end = new Date(customEnd);
        }

        setPrintDialogOpen(false);
        navigate(`/print-vitals/${patientId}?startTime=${start.toISOString()}&endTime=${end.toISOString()}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Vital Signs Trends</h3>
                    <p className="text-sm text-slate-500">Real-time monitoring and reporting</p>
                </div>

                <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Printer className="w-4 h-4" />
                            Print Report
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Print Vitals Report</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="shift"
                                    name="range"
                                    checked={printRange === 'SHIFT'}
                                    onChange={() => setPrintRange('SHIFT')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="shift">Current Shift (12h)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="radio"
                                    id="custom"
                                    name="range"
                                    checked={printRange === 'CUSTOM'}
                                    onChange={() => setPrintRange('CUSTOM')}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="custom">Custom Range</Label>
                            </div>

                            {printRange === 'CUSTOM' && (
                                <div className="grid grid-cols-2 gap-4 pl-6">
                                    <div className="space-y-2">
                                        <Label>Start Time</Label>
                                        <Input
                                            type="datetime-local"
                                            value={customStart}
                                            onChange={(e) => setCustomStart(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End Time</Label>
                                        <Input
                                            type="datetime-local"
                                            value={customEnd}
                                            onChange={(e) => setCustomEnd(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handlePrint}>Generate Report</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Visual Trends — the API returns vitals newest-first; the charts plot in
                array order and treat the last point as "now", so sort ascending (oldest→
                newest) here. Otherwise a freshly-added vital lands on the far left instead
                of at the right edge and looks like it never appeared. */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <TrendChart title="Heart Rate" data={chartData} dataKey="heartRate" color="#ef4444" unit="bpm" thresholdHigh={100} thresholdLow={60} min={40} max={140} />
                <TrendChart title="Systolic BP" data={chartData} dataKey="bpSys" color="#3b82f6" unit="mmHg" thresholdHigh={140} thresholdLow={90} min={60} max={200} />
                <TrendChart title="SpO2" data={chartData} dataKey="spo2" color="#10b981" unit="%" thresholdLow={92} min={80} max={100} />
                <TrendChart title="Temperature" data={chartData} dataKey="temp" color="#f59e0b" unit="°C" thresholdHigh={38} min={35} max={40} />
                <TrendChart title="RBS" data={chartData} dataKey="rbs" color="#8b5cf6" unit="mg/dL" thresholdHigh={200} min={50} max={400} />
                <TrendChart title="RR" data={chartData} dataKey="rr" color="#06b6d4" unit="bpm" thresholdHigh={24} thresholdLow={12} min={8} max={40} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Entry Form */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle>Add New Vitals</CardTitle>
                        <UploadVitalsDialog
                            onVitalsExtracted={(data) => {
                                setNewEntry(prev => ({
                                    ...prev,
                                    hr: data.hr || prev.hr,
                                    bpSys: data.bpSys || prev.bpSys,
                                    bpDia: data.bpDia || prev.bpDia,
                                    spo2: data.spo2 || prev.spo2,
                                    temp: data.temp || prev.temp,
                                    rr: data.rr || prev.rr,
                                    imageUrl: data.imageUrl || prev.imageUrl,
                                }));
                            }}
                        />
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddVitals} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="hr">Heart Rate</Label>
                                    <Input
                                        id="hr" type="number" placeholder="bpm"
                                        value={newEntry.hr} onChange={e => setNewEntry({ ...newEntry, hr: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="spo2">SpO2 (%)</Label>
                                    <Input
                                        id="spo2" type="number" placeholder="%"
                                        value={newEntry.spo2} onChange={e => setNewEntry({ ...newEntry, spo2: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bpSys">Systolic BP</Label>
                                    <Input
                                        id="bpSys" type="number" placeholder="mmHg"
                                        value={newEntry.bpSys} onChange={e => setNewEntry({ ...newEntry, bpSys: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bpDia">Diastolic BP</Label>
                                    <Input
                                        id="bpDia" type="number" placeholder="mmHg"
                                        value={newEntry.bpDia} onChange={e => setNewEntry({ ...newEntry, bpDia: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="temp">Temperature (°C)</Label>
                                    <Input
                                        id="temp" type="number" placeholder="°C" step="0.1"
                                        value={newEntry.temp} onChange={e => setNewEntry({ ...newEntry, temp: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rr">Resp Rate (RR)</Label>
                                    <Input
                                        id="rr" type="number" placeholder="bpm"
                                        value={newEntry.rr} onChange={e => setNewEntry({ ...newEntry, rr: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rbs">RBS (mg/dL)</Label>
                                <Input
                                    id="rbs" type="number" placeholder="mg/dL"
                                    value={newEntry.rbs} onChange={e => setNewEntry({ ...newEntry, rbs: e.target.value })}
                                />
                            </div>
                            {newEntry.imageUrl && (
                                <div className="text-sm text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded">
                                    <ImageIcon className="w-4 h-4" />
                                    Image attached from scan
                                    <Button variant="ghost" size="sm" className="ml-auto h-auto py-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setNewEntry({ ...newEntry, imageUrl: '' })}>
                                        Remove
                                    </Button>
                                </div>
                            )}

                            {infusionMeds.length > 0 && (
                                <div className="pt-3 border-t" style={{ borderColor: 'var(--line)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                                        Infusions · ml/hr
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {infusionMeds.map(m => (
                                            <div key={m.id} className="space-y-1">
                                                <Label style={{ fontSize: 12 }}>{m.name}</Label>
                                                <Input
                                                    type="number" step="0.1"
                                                    placeholder="ml/hr"
                                                    value={drugRates[m.id] ?? ''}
                                                    onChange={e => setDrugRates(prev => ({ ...prev, [m.id]: e.target.value }))}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button type="submit" className="w-full">Record Vitals</Button>
                        </form>
                    </CardContent>
                </Card>

                {/* History Table */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table className="min-w-[600px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>HR</TableHead>
                                        <TableHead>BP</TableHead>
                                        <TableHead>SpO2</TableHead>
                                        <TableHead>Temp</TableHead>
                                        <TableHead>RR</TableHead>
                                        <TableHead>RBS</TableHead>
                                        {supportCols.map(m => (
                                            <TableHead key={m.id} title={`${m.name} (ml/hr)`} className="whitespace-nowrap">
                                                {m.name.length > 10 ? m.name.slice(0, 9) + '…' : m.name}<span className="text-[10px] text-muted-foreground"> ml/hr</span>
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {[...vitals].reverse().map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                                    <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{entry.heartRate}</TableCell>
                                            <TableCell>{entry.bpSys}/{entry.bpDia}</TableCell>
                                            <TableCell>{entry.spo2}%</TableCell>
                                            <TableCell>{entry.temp}°C</TableCell>
                                            <TableCell>{entry.rr}</TableCell>
                                            <TableCell>{entry.rbs}</TableCell>
                                            {supportCols.map(m => {
                                                const r = rateAt(m, entry.timestamp);
                                                return <TableCell key={m.id} className="font-medium" style={{ color: r ? 'var(--accent-ink)' : 'var(--ink-4)' }}>{r || '—'}</TableCell>;
                                            })}
                                            <TableCell>
                                                {entry.imageUrl && (
                                                    <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800" title="View attached image">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {vitals.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8 + supportCols.length} className="text-center text-muted-foreground">No records found</TableCell>
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
