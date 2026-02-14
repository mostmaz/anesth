import { useEffect, useState } from 'react';
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Clock, AlertCircle, Printer, Droplet, FileText } from 'lucide-react';
import { marApi, type Medication } from '../../api/marApi';
import { useParams, useNavigate } from 'react-router-dom';
import { AddMedicationDialog } from './AddMedicationDialog';
import { useAuthStore } from '../../stores/authStore';

interface MARTabProps {
    patientId?: string;
}

export default function MARTab({ patientId: propPatientId }: MARTabProps) {
    const { id: paramPatientId } = useParams();
    const navigate = useNavigate();
    const patientId = propPatientId || paramPatientId;
    const { user } = useAuthStore();

    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleAdminister = async (med: Medication) => {
        if (!patientId || !user) return;
        try {
            await marApi.administerMedication({
                patientId,
                medicationId: med.id,
                status: 'Given',
                dose: med.defaultDose, // Assume default dose for 1-click
                userId: user.id
            });
            toast.success("Medication administered");
            fetchMAR();
        } catch (error) {
            toast.error('Failed to administer medication');
        }
    };

    const handlePrint = () => {
        if (!patientId) return;
        navigate(`/print-mar/${patientId}`);
    };

    if (loading) return <div>Loading MAR...</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medication Administration Record</CardTitle>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="gap-2">
                        <Printer className="w-4 h-4" />
                        Print 7-Day MAR
                    </Button>
                    {patientId && (
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
                            <div key={med.id} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg text-slate-900">{med.name}</h4>
                                            <Badge variant="outline" className="font-mono">{med.route}</Badge>
                                            <Badge variant="secondary">{med.frequency || 'PRN'}</Badge>
                                        </div>
                                        <div className="text-sm text-slate-600 font-medium">
                                            Dose: {med.defaultDose}
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

                                    <div className="flex flex-col items-end gap-3">
                                        <Button
                                            size="sm"
                                            onClick={() => handleAdminister(med)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                        >
                                            Administer
                                        </Button>

                                        <div className="text-right text-xs">
                                            {lastAdmin ? (
                                                <div className="text-slate-500">
                                                    <div className="font-medium text-slate-700">Last Given:</div>
                                                    <div>{new Date(lastAdmin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    <div className="mt-1">by <span className="font-semibold">{lastAdmin.user?.name || 'Unknown'}</span></div>
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
        </Card>
    );
}
