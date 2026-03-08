
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Wind, Plus, History } from 'lucide-react';

interface VentilatorTabProps {
    patientId: string;
}

export default function VentilatorTab({ patientId }: VentilatorTabProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [newSettings, setNewSettings] = useState({
        mode: '',
        rate: '',
        fiO2: '',
        ieRatio: '',
        peep: '',
        ps: '',
        vt: ''
    });

    const handleAdd = () => {
        // Mock save
        const entry = {
            id: Date.now().toString(),
            ...newSettings,
            timestamp: new Date().toISOString()
        };
        setHistory([entry, ...history]);
        setNewSettings({ mode: '', rate: '', fiO2: '', ieRatio: '', peep: '', ps: '', vt: '' });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-4 h-4" /> New Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Mode</Label>
                                <Input placeholder="e.g. SIMV" value={newSettings.mode} onChange={e => setNewSettings({ ...newSettings, mode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Rate (bpm)</Label>
                                <Input type="number" value={newSettings.rate} onChange={e => setNewSettings({ ...newSettings, rate: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>FiO2 (%)</Label>
                                <Input type="number" value={newSettings.fiO2} onChange={e => setNewSettings({ ...newSettings, fiO2: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>PEEP</Label>
                                <Input type="number" value={newSettings.peep} onChange={e => setNewSettings({ ...newSettings, peep: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>VT (mL)</Label>
                                <Input type="number" value={newSettings.vt} onChange={e => setNewSettings({ ...newSettings, vt: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>PS</Label>
                                <Input type="number" value={newSettings.ps} onChange={e => setNewSettings({ ...newSettings, ps: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>I:E Ratio</Label>
                            <Input placeholder="e.g. 1:2" value={newSettings.ieRatio} onChange={e => setNewSettings({ ...newSettings, ieRatio: e.target.value })} />
                        </div>
                        <Button className="w-full" onClick={handleAdd}>Record Settings</Button>
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
                                            {new Date(h.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {h.mode} / {h.rate}
                                        </TableCell>
                                        <TableCell>{h.fiO2}%</TableCell>
                                        <TableCell>{h.peep}</TableCell>
                                        <TableCell>{h.vt}/{h.ps}</TableCell>
                                        <TableCell>{h.ieRatio}</TableCell>
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
