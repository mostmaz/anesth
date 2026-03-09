
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { History, Plus } from 'lucide-react';
import { ventilatorApi, VentilatorSetting } from '../../api/ventilatorApi';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';

interface VentilatorTabProps {
    patientId: string;
}

export default function VentilatorTab({ patientId }: VentilatorTabProps) {
    const user = useAuthStore(state => state.user);
    const [history, setHistory] = useState<VentilatorSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newSettings, setNewSettings] = useState({
        mode: '',
        rate: '',
        fiO2: '',
        ieRatio: '',
        peep: '',
        ps: '',
        vt: '',
        timestamp: new Date().toISOString().slice(0, 16) // Default to now
    });

    const fetchHistory = async () => {
        try {
            const data = await ventilatorApi.getHistory(patientId);
            setHistory(data);
        } catch (error) {
            console.error("Failed to fetch ventilator history", error);
            toast.error("Failed to load history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [patientId]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsSubmitting(true);
        try {
            await ventilatorApi.recordSettings({
                patientId,
                userId: user.id,
                mode: newSettings.mode,
                rate: parseInt(newSettings.rate) || 0,
                fio2: parseInt(newSettings.fiO2) || 0,
                ie: newSettings.ieRatio,
                ps: parseInt(newSettings.ps) || 0,
                vt: parseInt(newSettings.vt) || 0,
                timestamp: new Date(newSettings.timestamp).toISOString()
            });

            toast.success("Settings recorded");
            fetchHistory();
            setNewSettings({
                mode: '',
                rate: '',
                fiO2: '',
                ieRatio: '',
                peep: '',
                ps: '',
                vt: '',
                timestamp: new Date().toISOString().slice(0, 16)
            });
        } catch (error) {
            toast.error("Failed to record settings");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

    return (
        <div className="space-y-6">
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
                                    <Label>Mode</Label>
                                    <Input required placeholder="e.g. SIMV" value={newSettings.mode} onChange={e => setNewSettings({ ...newSettings, mode: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Rate (bpm)</Label>
                                    <Input required type="number" value={newSettings.rate} onChange={e => setNewSettings({ ...newSettings, rate: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>FiO2 (%)</Label>
                                    <Input required type="number" value={newSettings.fiO2} onChange={e => setNewSettings({ ...newSettings, fiO2: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>PEEP</Label>
                                    <Input required type="number" value={newSettings.peep} onChange={e => setNewSettings({ ...newSettings, peep: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>VT (mL)</Label>
                                    <Input required type="number" value={newSettings.vt} onChange={e => setNewSettings({ ...newSettings, vt: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>PS</Label>
                                    <Input required type="number" value={newSettings.ps} onChange={e => setNewSettings({ ...newSettings, ps: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>I:E Ratio</Label>
                                <Input required placeholder="e.g. 1:2" value={newSettings.ieRatio} onChange={e => setNewSettings({ ...newSettings, ieRatio: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Recorded At</Label>
                                <Input
                                    type="datetime-local"
                                    value={newSettings.timestamp}
                                    onChange={e => setNewSettings({ ...newSettings, timestamp: e.target.value })}
                                />
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Mode/Rate</TableHead>
                                    <TableHead>FiO2</TableHead>
                                    <TableHead>PEEP</TableHead>
                                    <TableHead>VT/PS</TableHead>
                                    <TableHead>I:E</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((h) => (
                                    <TableRow key={h.id}>
                                        <TableCell className="text-xs">
                                            {new Date(h.timestamp).toLocaleString([], {
                                                day: '2-digit',
                                                month: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {h.mode} / {h.rate}
                                        </TableCell>
                                        <TableCell>{h.fio2}%</TableCell>
                                        <TableCell>{(h as any).peep || ''}</TableCell>
                                        <TableCell>{h.vt}/{h.ps}</TableCell>
                                        <TableCell>{h.ie}</TableCell>
                                    </TableRow>
                                ))}
                                {history.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-slate-400 italic py-8">No history recorded</TableCell>
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
