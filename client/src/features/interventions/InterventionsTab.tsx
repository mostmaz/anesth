
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Plus, Clock, CheckCircle2 } from 'lucide-react';
import { ordersApi, ClinicalOrder } from '../../api/ordersApi';
import { toast } from 'sonner';
import AddInterventionDialog from './AddInterventionDialog';
import { useAuthStore } from '../../stores/authStore';

interface InterventionsTabProps {
    patientId: string;
    diagnosis?: string;
}

export default function InterventionsTab({ patientId, diagnosis }: InterventionsTabProps) {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    const fetchInterventions = async () => {
        try {
            const allOrders = await ordersApi.getOrders(patientId);
            // Filter for PROCEDURE type
            const procedures = allOrders.filter(o => o.type === 'PROCEDURE');
            setOrders(procedures);
        } catch (error) {
            console.error("Failed to fetch interventions", error);
            toast.error("Failed to load interventions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterventions();
    }, [patientId]);

    const handleComplete = async (orderId: string) => {
        if (!user) return;
        try {
            await ordersApi.updateStatus(orderId, 'COMPLETED', user.id);
            toast.success("Marked as done");
            fetchInterventions();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const getTracheostomyTimer = (order: ClinicalOrder) => {
        if (order.title.toLowerCase().includes('tracheostomy') && order.status === 'COMPLETED') {
            const completionDate = new Date(order.updatedAt); // Assuming updated at completion
            const dueDate = new Date(completionDate.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
            const now = new Date();
            const diffMs = dueDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

            let color = "text-green-600";
            if (diffDays <= 2) color = "text-amber-600";
            if (diffDays <= 0) color = "text-red-600";

            return (
                <div className={`flex items-center gap-2 mt-2 font-medium ${color} border p-2 rounded bg-slate-50`}>
                    <Clock className="w-4 h-4" />
                    {diffDays > 0 ? `Change due in ${diffDays} days` : `Change OVERDUE by ${Math.abs(diffDays)} days`}
                </div>
            );
        }
        return null;
    };

    if (loading) return <div>Loading interventions...</div>;

    const activeProcedures = orders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING');
    const completedProcedures = orders.filter(o => o.status === 'COMPLETED');

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    New Intervention
                </Button>
            </div>

            {/* Active / Scheduled */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Scheduled / Active Interventions</CardTitle>
                </CardHeader>
                <CardContent>
                    {activeProcedures.length === 0 ? (
                        <p className="text-slate-500 italic">No active interventions scheduled.</p>
                    ) : (
                        <div className="space-y-4">
                            {activeProcedures.map(order => (
                                <div key={order.id} className="border p-4 rounded-lg bg-white shadow-sm flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-lg">{order.title}</h4>
                                            <Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'}>
                                                {order.priority}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600">Created: {new Date(order.createdAt).toLocaleDateString()}</p>
                                        {order.notes && <p className="text-sm mt-2 p-2 bg-slate-50 rounded">Note: {order.notes}</p>}
                                    </div>
                                    <Button size="sm" onClick={() => handleComplete(order.id)} className="bg-green-600 hover:bg-green-700">
                                        Mark Done
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* History */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">History / Completed</CardTitle>
                </CardHeader>
                <CardContent>
                    {completedProcedures.length === 0 ? (
                        <p className="text-slate-500 italic">No history.</p>
                    ) : (
                        <div className="space-y-4">
                            {completedProcedures.map(order => (
                                <div key={order.id} className="border p-4 rounded-lg bg-slate-50 opacity-90">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <h4 className="font-bold text-slate-800">{order.title}</h4>
                                        <span className="text-xs text-slate-500">Performed {new Date(order.updatedAt).toLocaleDateString()}</span>
                                    </div>

                                    {/* Tracheostomy Timer Logic */}
                                    {getTracheostomyTimer(order)}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AddInterventionDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                patientId={patientId}
                diagnosis={diagnosis}
                onSuccess={() => {
                    setIsAddOpen(false);
                    fetchInterventions();
                }}
            />
        </div>
    );
}
