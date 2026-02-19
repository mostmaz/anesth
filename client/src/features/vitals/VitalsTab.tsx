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
import { useParams, useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';

interface VitalsTabProps {
    patientId?: string;
}

export default function VitalsTab({ patientId: propPatientId }: VitalsTabProps) {
    const { id: paramPatientId } = useParams();
    const navigate = useNavigate();
    const patientId = propPatientId || paramPatientId;
    const [vitals, setVitals] = useState<VitalSign[]>([]);
    const [newEntry, setNewEntry] = useState({ hr: '', bpSys: '', bpDia: '', spo2: '', temp: '', rbs: '' });

    useEffect(() => {
        if (patientId) {
            vitalsApi.getVitals(patientId).then(setVitals).catch(console.error);
        }
    }, [patientId]);

    const handleAddVitals = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!patientId) return;

        // Validation
        const hr = Number(newEntry.hr);
        if (newEntry.hr && (isNaN(hr) || hr <= 0 || hr > 300)) {
            toast.error("Invalid Heart Rate");
            return;
        }
        const spo2 = Number(newEntry.spo2);
        if (newEntry.spo2 && (isNaN(spo2) || spo2 < 0 || spo2 > 100)) {
            toast.error("Invalid SpO2 (0-100)");
            return;
        }

        try {
            const entry = await vitalsApi.addVitals({
                patientId,
                heartRate: newEntry.hr ? Number(newEntry.hr) : null,
                bpSys: newEntry.bpSys ? Number(newEntry.bpSys) : null,
                bpDia: newEntry.bpDia ? Number(newEntry.bpDia) : null,
                spo2: newEntry.spo2 ? Number(newEntry.spo2) : null,
                temp: newEntry.temp ? Number(newEntry.temp) : null,
                rbs: newEntry.rbs ? Number(newEntry.rbs) : null,
            });
            setVitals([entry, ...vitals]);
            setNewEntry({ hr: '', bpSys: '', bpDia: '', spo2: '', temp: '', rbs: '' });
            toast.success("Vitals recorded successfully");
        } catch (error) {
            toast.error('Failed to record vitals');
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

            {/* Visual Trends */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <TrendChart title="Heart Rate" data={vitals} dataKey="heartRate" color="#ef4444" unit="bpm" thresholdHigh={100} thresholdLow={60} min={40} max={140} />
                <TrendChart title="Systolic BP" data={vitals} dataKey="bpSys" color="#3b82f6" unit="mmHg" thresholdHigh={140} thresholdLow={90} min={60} max={200} />
                <TrendChart title="SpO2" data={vitals} dataKey="spo2" color="#10b981" unit="%" thresholdLow={92} min={80} max={100} />
                <TrendChart title="Temperature" data={vitals} dataKey="temp" color="#f59e0b" unit="°C" thresholdHigh={38} min={35} max={40} />
                <TrendChart title="RBS" data={vitals} dataKey="rbs" color="#8b5cf6" unit="mg/dL" thresholdHigh={200} min={50} max={400} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Entry Form */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Add New Vitals</CardTitle>
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
                            <div className="space-y-2">
                                <Label htmlFor="temp">Temperature (°C)</Label>
                                <Input
                                    id="temp" type="number" placeholder="°C" step="0.1"
                                    value={newEntry.temp} onChange={e => setNewEntry({ ...newEntry, temp: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="rbs">RBS (mg/dL)</Label>
                                <Input
                                    id="rbs" type="number" placeholder="mg/dL"
                                    value={newEntry.rbs} onChange={e => setNewEntry({ ...newEntry, rbs: e.target.value })}
                                />
                            </div>
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date & Time</TableHead>
                                    <TableHead>HR</TableHead>
                                    <TableHead>BP</TableHead>
                                    <TableHead>SpO2</TableHead>
                                    <TableHead>Temp</TableHead>
                                    <TableHead>RBS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {vitals.map((entry) => (
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
                                        <TableCell>{entry.rbs}</TableCell>
                                    </TableRow>
                                ))}
                                {vitals.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground">No records found</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
