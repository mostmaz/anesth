
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { AlertCircle, Printer, Droplet, FileText, StopCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { marApi, type Medication } from '../../api/marApi';
import { useParams, useNavigate } from 'react-router-dom';
import { AddMedicationDialog } from './AddMedicationDialog';
import { EditMedicationDialog } from './EditMedicationDialog';
import { useAuthStore } from '../../stores/authStore';

interface MARTabProps {
    patientId?: string;
}

// Frequency → number of doses per day. Handles labels ("OD (Once Daily)",
// "TDS (Thrice Daily)"), short codes and plain numbers. null = infusion/PRN/unknown.
export function freqTimesPerDay(freq?: string): number | null {
    const s = (freq || '').toLowerCase().trim();
    if (!s || s.includes('infusion') || s.includes('prn')) return null;
    if (s.includes('once only')) return 1;
    if (/(^|\b)od\b|once daily/.test(s)) return 1;
    if (/(^|\b)bd\b|twice/.test(s)) return 2;
    if (/(^|\b)tds\b|thrice|three times/.test(s)) return 3;
    if (/(^|\b)qid\b|four times/.test(s)) return 4;
    if (/(^|\b)q12h\b/.test(s)) return 2;
    if (/(^|\b)q8h\b/.test(s)) return 3;
    if (/(^|\b)q6h\b/.test(s)) return 4;
    if (/5\s*x|5 ?times|five times/.test(s)) return 5;
    if (/6\s*x|q4h|six times/.test(s)) return 6;
    const m = s.match(/^(\d+)\b/);
    if (m) { const n = parseInt(m[1], 10); return n >= 1 && n <= 12 ? n : null; }
    return null;
}
// Frequency shown as X1 / X2 / X3 … (or Infusion / PRN).
function freqDisplay(freq?: string): string {
    const n = freqTimesPerDay(freq);
    if (n) return `X${n}`;
    if ((freq || '').toLowerCase().includes('infusion')) return 'Infusion';
    return freq || 'PRN';
}
// Earliest "Given" administration (the drug's first actual dose). The dose schedule
// keys off this — not the MAR-prescription time — so the cadence follows when the drug
// was really first given. Returns undefined until a dose has been charted.
export function firstGivenAt(administrations?: Array<{ status: string; timestamp: string | Date }>): Date | undefined {
    if (!administrations?.length) return undefined;
    const given = administrations
        .filter(a => a.status === 'Given')
        .map(a => new Date(a.timestamp))
        .filter(d => !isNaN(d.getTime()));
    if (!given.length) return undefined;
    return given.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}
// Scheduled dose clock-times ("HH:00"), evenly spread over 24h from the anchor hour
// (rounded to the nearest hour). Anchor = first-given time. e.g. BD first given 14:25
// → 14:00, 02:00.
export function doseSchedule(anchorTime?: string | Date, freq?: string): string[] {
    const n = freqTimesPerDay(freq);
    if (!n || !anchorTime) return [];
    const d = new Date(anchorTime);
    if (isNaN(d.getTime())) return [];
    const anchor = Math.round((d.getHours() * 60 + d.getMinutes()) / 60) % 24; // nearest hour
    const step = 24 / n;
    return Array.from({ length: n }, (_, i) => `${String(Math.round(anchor + i * step) % 24).padStart(2, '0')}:00`);
}
const isSameDay = (ts: string | Date) => {
    const d = new Date(ts), n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

export default function MARTab({ patientId: propPatientId }: MARTabProps) {
    const { id: paramPatientId } = useParams();
    const navigate = useNavigate();
    const patientId = propPatientId || paramPatientId;
    const { user } = useAuthStore();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);
    const [medToStop, setMedToStop] = useState<Medication | null>(null);
    const [isStopping, setIsStopping] = useState(false);

    // Administration State
    const [medToAdminister, setMedToAdminister] = useState<Medication | null>(null);
    const [administerDilution, setAdministerDilution] = useState<string>('');
    const [administerTime, setAdministerTime] = useState<string>(''); // "HH:MM" — actual give time, back-datable
    const [isAdministering, setIsAdministering] = useState(false);

    const nowHHMM = () => {
        const d = new Date();
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    const shiftTime = (minutes: number) => {
        const d = new Date(Date.now() - minutes * 60 * 1000);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };
    // "HH:MM" → ISO datetime. Assumes today; if that lands in the future (e.g. 23:50
    // charted at 00:10), roll back one day. Empty/invalid → undefined (server uses now).
    const timeToISO = (hhmm: string): string | undefined => {
        if (!/^\d{2}:\d{2}$/.test(hhmm)) return undefined;
        const [h, m] = hhmm.split(':').map(Number);
        const d = new Date();
        d.setHours(h, m, 0, 0);
        if (d.getTime() > Date.now() + 5 * 60 * 1000) d.setDate(d.getDate() - 1);
        return d.toISOString();
    };

    const fetchMAR = () => {
        if (patientId) {
            marApi.getMAR(patientId)
                .then(setMedications)
                .catch(console.error)
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        fetchMAR();
        const interval = setInterval(fetchMAR, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [patientId]);

    const handleAdministerClick = (med: Medication) => {
        setMedToAdminister(med);
        // Default to the prescribed dilution if any, otherwise empty
        setAdministerDilution(med.dilution ? med.dilution.toString() : '');
        setAdministerTime(nowHHMM());
    };

    const confirmAdminister = async () => {
        if (!patientId || !user || !medToAdminister) return;
        setIsAdministering(true);
        try {
            await marApi.administerMedication({
                patientId,
                medicationId: medToAdminister.id,
                status: 'Given',
                dose: medToAdminister.defaultDose, // Assume default dose for 1-click
                dilution: administerDilution ? parseFloat(administerDilution) : undefined,
                userId: user.id,
                administeredAt: timeToISO(administerTime)
            });
            toast.success("Medication administered");
            fetchMAR();
            setMedToAdminister(null);
        } catch (error) {
            toast.error('Failed to administer medication');
        } finally {
            setIsAdministering(false);
        }
    };

    // Infusion pause/resume — recorded as a Held ("Paused") / Given ("Resumed")
    // administration, so no schema change is needed; the current state is the most
    // recent administration for that drug.
    const isPaused = (med: Medication) => {
        const last = med.administrations?.[0];
        return med.route === 'Infusion' && last?.status === 'Held' && (last.dose || '').toLowerCase().includes('paus');
    };
    const [pausingId, setPausingId] = useState<string | null>(null);
    const togglePause = async (med: Medication) => {
        if (!patientId || !user) return;
        const paused = isPaused(med);
        setPausingId(med.id);
        try {
            await marApi.administerMedication({
                patientId, medicationId: med.id,
                status: paused ? 'Given' : 'Held',
                dose: paused ? 'Resumed' : 'Paused',
                userId: user.id,
            });
            toast.success(paused ? `${med.name} resumed` : `${med.name} paused`);
            fetchMAR();
        } catch {
            toast.error('Failed to update infusion');
        } finally {
            setPausingId(null);
        }
    };

    const handleDiscontinue = (med: Medication) => {
        setMedToStop(med);
    };

    const confirmDiscontinue = async () => {
        if (!medToStop) return;
        setIsStopping(true);
        try {
            await marApi.discontinueMedication(medToStop.id);
            toast.success("Medication discontinued");
            fetchMAR();
            setMedToStop(null);
        } catch (error) {
            toast.error('Failed to discontinue medication');
        } finally {
            setIsStopping(false);
        }
    };

    const handleDeleteAdmin = async (adminId: string) => {
        if (!user || user.role !== 'SENIOR') {
            toast.error("Only SENIOR staff can delete administrations");
            return;
        }
        if (!confirm("Are you sure you want to delete this administration record?")) return;
        try {
            await marApi.deleteAdministration(adminId, user.id);
            toast.success("Administration deleted");
            fetchMAR();
        } catch (error) {
            toast.error('Failed to delete administration');
        }
    };

    const handlePrint = () => {
        if (!patientId) return;
        navigate(`/print-mar/${patientId}`);
    };

    if (loading) return <div>Loading MAR...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle>Medication Administration Record</CardTitle>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        Print 7-Day MAR
                    </Button>
                    {patientId && user?.role !== 'NURSE' && (
                        <AddMedicationDialog
                            patientId={patientId}
                            onMedicationAdded={fetchMAR}
                        />
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {medications.map((med) => {
                        const lastAdmin = med.administrations && med.administrations[0];
                        return (
                            <div key={med.id} className={`p-4 border rounded-lg transition-colors ${med.isActive ? 'hover:bg-slate-50' : 'bg-slate-50 opacity-75'}`}>
                                <div className="flex flex-col md:flex-row md:justify-between items-start gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h4 className="font-bold text-lg text-slate-900">{med.name}</h4>
                                            {!med.isActive && <Badge variant="destructive">Discontinued</Badge>}
                                            {isPaused(med) && <Badge className="bg-amber-100 text-amber-800 border-amber-200">⏸ Paused</Badge>}
                                            <Badge variant="outline" className="font-mono">{med.route}</Badge>
                                            <Badge variant="secondary">{freqDisplay(med.frequency)}</Badge>
                                            {med.isActive && (() => {
                                                const n = freqTimesPerDay(med.frequency);
                                                if (!n) return null; // infusion / PRN — no fixed daily dose count
                                                // Anchor the schedule on the first actual dose given; before any dose
                                                // is charted, preview from the prescription time.
                                                const anchor = firstGivenAt(med.administrations) || med.startedAt;
                                                const times = doseSchedule(anchor, med.frequency);
                                                const givenToday = (med.administrations || []).filter(a => a.status === 'Given' && isSameDay(a.timestamp)).length;
                                                const notYetStarted = !firstGivenAt(med.administrations);
                                                return (
                                                    <span className="inline-flex items-center gap-1 flex-wrap" title={notYetStarted ? `Planned times (from prescription) — will re-anchor to the first dose given. ${n}/day` : `${givenToday} of ${n} doses given today`}>
                                                        {times.map((tm, i) => (
                                                            <span key={i} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${i < givenToday ? 'bg-emerald-500 text-white border-emerald-500' : notYetStarted ? 'bg-white text-slate-400 border-dashed border-slate-300' : 'bg-white text-slate-600 border-slate-300'}`}>{tm}</span>
                                                        ))}
                                                    </span>
                                                );
                                            })()}
                                            {med.isActive && (() => {
                                                let day = 1;
                                                if (med.startedAt) {
                                                    const diffTime = Math.abs(new Date().getTime() - new Date(med.startedAt).getTime());
                                                    day = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                                                }
                                                const isOverdue = med.durationReminder ? day >= med.durationReminder : false;
                                                if (isOverdue) {
                                                    return <Badge variant="destructive" className="ml-auto flex gap-1 items-center"><AlertCircle className="w-3 h-3" /> Day {day} (Review Needed)</Badge>;
                                                }
                                                return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Day {day}</Badge>;
                                            })()}
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
                                            {med.startedAt && (
                                                <div>
                                                    Started: {new Date(med.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </div>
                                            )}
                                            {med.isActive ? (
                                                <div>
                                                    Duration: {(() => {
                                                        const start = new Date(med.startedAt).getTime();
                                                        const now = new Date().getTime();
                                                        const diffHours = Math.floor((now - start) / (1000 * 60 * 60));
                                                        const days = Math.floor(diffHours / 24);
                                                        const hours = diffHours % 24;
                                                        return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                                                    })()}
                                                </div>
                                            ) : med.discontinuedAt ? (
                                                <>
                                                    <div className="text-red-600 font-bold">
                                                        Stopped: {new Date(med.discontinuedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                    </div>
                                                    <div>
                                                        Total Duration: {(() => {
                                                            const start = new Date(med.startedAt).getTime();
                                                            const stop = new Date(med.discontinuedAt!).getTime();
                                                            const diffHours = Math.floor((stop - start) / (1000 * 60 * 60));
                                                            const days = Math.floor(diffHours / 24);
                                                            const hours = diffHours % 24;
                                                            return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
                                                        })()}
                                                    </div>
                                                </>
                                            ) : null}
                                        </div>
                                        <div className="text-sm text-slate-600 font-medium flex items-center gap-2">
                                            <span>Dose: {med.defaultDose}</span>
                                            {med.isActive && user?.role !== 'NURSE' && (
                                                <EditMedicationDialog
                                                    medication={med}
                                                    onMedicationEdited={fetchMAR}
                                                />
                                            )}
                                        </div>
                                        {med.infusionRate && (
                                            <div className="text-sm text-blue-600 flex items-center gap-1">
                                                <Droplet className="w-3 h-3" />
                                                Rate: {med.infusionRate}
                                            </div>
                                        )}
                                        {med.otherInstructions && (
                                            <div className="text-sm text-slate-500 flex items-center gap-1 italic">
                                                <FileText className="w-3 h-3" />
                                                {med.otherInstructions}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-0">
                                        <div className="flex gap-2">
                                            {med.isActive && user?.role !== 'NURSE' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDiscontinue(med)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <StopCircle className="w-4 h-4 mr-1" />
                                                    Stop
                                                </Button>
                                            )}
                                            {med.isActive && med.route === 'Infusion' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={pausingId === med.id}
                                                    onClick={() => togglePause(med)}
                                                    className={isPaused(med)
                                                        ? 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                                        : 'text-amber-700 border-amber-200 hover:bg-amber-50'}
                                                >
                                                    {isPaused(med) ? '▶ Resume' : '⏸ Pause'}
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                disabled={!med.isActive}
                                                onClick={() => handleAdministerClick(med)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                {med.route === 'Infusion' ? 'Start Infusion' : 'Administer'}
                                            </Button>
                                        </div>

                                        <div className="text-right text-xs">
                                            {lastAdmin ? (
                                                <div className="text-slate-500 flex items-start gap-2 justify-end">
                                                    <div>
                                                        <div className="font-medium text-slate-700">Last Given:</div>
                                                        <div>{new Date(lastAdmin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        {lastAdmin.chartedAt && (new Date(lastAdmin.chartedAt).getTime() - new Date(lastAdmin.timestamp).getTime() > 30 * 60 * 1000) && (
                                                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700" title={`Charted ${new Date(lastAdmin.chartedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}>
                                                                Late entry
                                                            </span>
                                                        )}
                                                        <div className="mt-1">by <span className="font-semibold">{lastAdmin.user?.name || 'Unknown'}</span></div>
                                                    </div>
                                                    {user?.role === 'SENIOR' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteAdmin(lastAdmin.id)}
                                                            title="Delete Administration"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-amber-600 font-medium">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Not yet administered
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {medications.length === 0 && (
                        <div className="text-center py-12 text-slate-400 border-2 border-dashed rounded-lg">
                            <p>No active medications prescribed.</p>
                            <p className="text-sm mt-1">Click "Add Medication" to start.</p>
                        </div>
                    )}
                </div>
            </CardContent>

            <Dialog open={!!medToStop} onOpenChange={(open) => !open && setMedToStop(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Stop Medication</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to stop {medToStop?.name}? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMedToStop(null)} disabled={isStopping}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDiscontinue} disabled={isStopping}>
                            {isStopping ? "Stopping..." : "Stop Medication"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Administer Dialog */}
            <Dialog open={!!medToAdminister} onOpenChange={(open) => !open && setMedToAdminister(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{medToAdminister?.route === 'Infusion' ? 'Start Infusion' : 'Administer Medication'}</DialogTitle>
                        <DialogDescription>
                            {medToAdminister?.route === 'Infusion' ? 'Start' : 'Record administration of'} <strong>{medToAdminister?.name}</strong> ({medToAdminister?.defaultDose}).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Time given</label>
                            <div className="flex items-center gap-2 flex-wrap">
                                <input
                                    type="time"
                                    className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    value={administerTime}
                                    onChange={(e) => setAdministerTime(e.target.value)}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => setAdministerTime(nowHHMM())}>Now</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setAdministerTime(shiftTime(15))}>−15m</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setAdministerTime(shiftTime(30))}>−30m</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setAdministerTime(shiftTime(60))}>−1h</Button>
                            </div>
                            <p className="text-xs text-slate-500">If the drug was already given at the bedside, set the actual time — the entry is recorded as a late entry.</p>
                        </div>
                        {medToAdminister?.route === 'IV' ? (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Actual Dilution / Volume (mL)</label>
                                <input
                                    type="number"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Optional: Volume in mL"
                                    value={administerDilution}
                                    onChange={(e) => setAdministerDilution(e.target.value)}
                                />
                                <p className="text-xs text-slate-500">Entering a dilution volume will automatically add it as an Input on the I/O chart.</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500">Record administration of this {medToAdminister?.route || ''} medication.</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMedToAdminister(null)} disabled={isAdministering}>
                            Cancel
                        </Button>
                        <Button onClick={confirmAdminister} disabled={isAdministering} className="bg-emerald-600 hover:bg-emerald-700">
                            {isAdministering ? "Saving..." : (medToAdminister?.route === 'Infusion' ? 'Start Infusion' : 'Record Administration')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
