
import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Plus, Droplets, ArrowDown, ArrowUp, Printer } from 'lucide-react';
import { ioApi, type IOEntry } from '../../api/ioApi';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';

import { useNavigate } from 'react-router-dom';

interface IOTabProps {
    patientId: string;
}

export default function IOTab({ patientId }: IOTabProps) {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { activeShift } = useShiftStore();
    const [history, setHistory] = useState<IOEntry[]>([]);
    const [type, setType] = useState<'INPUT' | 'OUTPUT'>('INPUT');
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        loadHistory();
    }, [patientId]);

    const loadHistory = async () => {
        try {
            const data = await ioApi.getHistory(patientId);
            setHistory(data);
        } catch (error) {
            toast.error("Failed to load I/O history");
        }
    };

    const handlePrintShift = () => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        // Simple 12h shift logic: Day (8am-8pm) / Night (8pm-8am)
        if (now.getHours() >= 8 && now.getHours() < 20) {
            start.setHours(8, 0, 0, 0);
            end.setHours(20, 0, 0, 0);
        } else {
            if (now.getHours() < 8) {
                start.setDate(start.getDate() - 1);
            }
            start.setHours(20, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 1);
            end.setHours(8, 0, 0, 0);
        }

        navigate(`/print-io/${patientId}?startTime=${start.toISOString()}&endTime=${end.toISOString()}`);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !amount || !category) return;

        try {
            const newEntry = await ioApi.addEntry({
                patientId,
                userId: user.id,
                shiftId: activeShift?.id,
                type,
                category,
                amount: Number(amount),
                notes
            });
            setHistory([newEntry, ...history]);
            setAmount('');
            setNotes('');
            toast.success("I/O recorded");
        } catch (error) {
            toast.error("Failed to record I/O");
        }
    };

    const totalInput = history.filter(h => h.type === 'INPUT').reduce((acc, curr) => acc + curr.amount, 0);
    const totalOutput = history.filter(h => h.type === 'OUTPUT').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalInput - totalOutput;

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handlePrintShift} variant="outline" size="sm">
                    <Printer className="w-4 h-4 mr-2" />
                    Print 12h Shift Report
                </Button>
            </div>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 flex flex-col items-center">
                        <span className="text-sm font-medium text-blue-600 mb-1">Total Input</span>
                        <div className="flex items-center text-2xl font-bold text-blue-700">
                            <ArrowDown className="w-5 h-5 mr-1" />
                            {totalInput} mL
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-4 flex flex-col items-center">
                        <span className="text-sm font-medium text-amber-600 mb-1">Total Output</span>
                        <div className="flex items-center text-2xl font-bold text-amber-700">
                            <ArrowUp className="w-5 h-5 mr-1" />
                            {totalOutput} mL
                        </div>
                    </CardContent>
                </Card>
                <Card className={`${balance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <CardContent className="p-4 flex flex-col items-center">
                        <span className={`text-sm font-medium mb-1 ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Balance</span>
                        <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {balance > 0 ? '+' : ''}{balance} mL
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Entry Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                        <Droplets className="w-5 h-5 mr-2 text-blue-600" />
                        New Entry
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={(v: 'INPUT' | 'OUTPUT') => setType(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INPUT">Input (IV, PO)</SelectItem>
                                    <SelectItem value="OUTPUT">Output (Urine, Drain)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 col-span-1 md:col-span-1">
                            <Label>Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {type === 'INPUT' ? (
                                        <>
                                            <SelectItem value="IV Fluid">IV Fluid</SelectItem>
                                            <SelectItem value="PO Intake">PO Intake</SelectItem>
                                            <SelectItem value="Blood Product">Blood Product</SelectItem>
                                            <SelectItem value="Enteral Feed">Enteral Feed</SelectItem>
                                        </>
                                    ) : (
                                        <>
                                            <SelectItem value="Urine">Urine</SelectItem>
                                            <SelectItem value="Stool">Stool</SelectItem>
                                            <SelectItem value="NG Output">NG Output</SelectItem>
                                            <SelectItem value="Drain">Drain</SelectItem>
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Amount (mL)</Label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0"
                                min="0"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Input
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Optional"
                            />
                        </div>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Add
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader><CardTitle>History</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Time</th>
                                    <th className="text-left p-2">Type</th>
                                    <th className="text-left p-2">Category</th>
                                    <th className="text-right p-2">Amount</th>
                                    <th className="text-left p-2">Nurse</th>
                                    <th className="text-left p-2">Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((entry) => (
                                    <tr key={entry.id} className="border-b hover:bg-slate-50">
                                        <td className="p-2">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${entry.type === 'INPUT' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {entry.type}
                                            </span>
                                        </td>
                                        <td className="p-2">{entry.category}</td>
                                        <td className="p-2 text-right font-medium">{entry.amount} mL</td>
                                        <td className="p-2 text-slate-500">{entry.user.name}</td>
                                        <td className="p-2 text-slate-500">{entry.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
