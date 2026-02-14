
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { apiClient } from '../api/client';
import { Printer } from 'lucide-react';
import { Badge } from '../components/ui/badge';

export default function ShiftHistory() {
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShifts = async () => {
            try {
                const response = await apiClient.get<any[]>('/shifts/history');
                setShifts(response.data);
            } catch (error) {
                console.error("Failed to fetch shift history", error);
            } finally {
                setLoading(false);
            }
        };
        fetchShifts();
    }, []);

    const handlePrint = (shiftId: string) => {
        window.open(`/print/shift/${shiftId}`, '_blank');
    };

    if (loading) return <div className="p-8 text-center text-white">Loading history...</div>;

    return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Shift History</h1>
                    <Button variant="outline" onClick={() => window.history.back()}>Back</Button>
                </div>

                <div className="space-y-4">
                    {shifts.map((shift) => (
                        <Card key={shift.id} className="bg-slate-900 border-slate-800 text-slate-100">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-lg">
                                            {shift.type} Shift - {new Date(shift.startTime).toLocaleDateString()}
                                        </CardTitle>
                                        <Badge variant={shift.endTime ? 'secondary' : 'default'} className={shift.endTime ? "bg-slate-700" : "bg-green-600"}>
                                            {shift.endTime ? 'Completed' : 'Active'}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1">
                                        Nurse: {shift.user.name}
                                    </div>
                                </div>
                                <Button size="sm" onClick={() => handlePrint(shift.id)}>
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Report
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm text-slate-500">
                                    Started: {new Date(shift.startTime).toLocaleTimeString()}
                                    {shift.endTime && ` • Ended: ${new Date(shift.endTime).toLocaleTimeString()}`}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {shifts.length === 0 && <div className="text-center text-slate-500 py-8">No shift history found.</div>}
                </div>
            </div>
        </div>
    );
}
