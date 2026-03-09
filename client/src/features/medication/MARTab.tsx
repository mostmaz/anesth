
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
    const [isAdministering, setIsAdministering] = useState(false);

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
                userId: user.id
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
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Medication Administration Record</CardTitle>
                <div className="flex gap-2">
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
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-lg text-slate-900">{med.name}</h4>
                                            {!med.isActive && <Badge variant="destructive">Discontinued</Badge>}
                                            <Badge variant="outline" className="font-mono">{med.route}</Badge>
                                            <Badge variant="secondary">{med.frequency || 'PRN'}</Badge>
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
                                        {med.startedAt && (
                                            <div className="text-xs text-slate-500 font-medium">
                                                Started: {new Date(med.startedAt).toLocaleDateString()}
                                            </div>
                                        )}
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
                                            <Button
                                                size="sm"
                                                disabled={!med.isActive}
                                                onClick={() => handleAdministerClick(med)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                                            >
                                                Administer
                                            </Button>
                                        </div>

                                        <div className="text-right text-xs">
                                            {lastAdmin ? (
                                                <div className="text-slate-500 flex items-start gap-2 justify-end">
                                                    <div>
                                                        <div className="font-medium text-slate-700">Last Given:</div>
                                                        <div>{new Date(lastAdmin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                        <DialogTitle>Administer Medication</DialogTitle>
                        <DialogDescription>
                            Record administration of <strong>{medToAdminister?.name}</strong> ({medToAdminister?.defaultDose}).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Actual Dilution / Volume (mL)</label>
                            <input
                                type="number"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Optional: Volume in mL"
                                value={administerDilution}
                                onChange={(e) => setAdministerDilution(e.target.value)}
                            />
                            <p className="text-xs text-slate-500">Entering a dilution volume will automatically create an Input record in the IO Chart.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMedToAdminister(null)} disabled={isAdministering}>
                            Cancel
                        </Button>
                        <Button onClick={confirmAdminister} disabled={isAdministering} className="bg-emerald-600 hover:bg-emerald-700">
                            {isAdministering ? "Recording..." : "Record Administration"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
