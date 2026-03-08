import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Plus, Clock, CheckCircle2, Bell } from 'lucide-react';
import { ordersApi, ClinicalOrder } from '../../api/ordersApi';
import { toast } from 'sonner';
import AddInterventionDialog from './AddInterventionDialog';
import { useAuthStore } from '../../stores/authStore';

interface InterventionsTabProps {
    patientId: string;
    diagnosis?: string;
}

// Confirmation dialog for completing a check
function ConfirmCheckDialog({
    open,
    onOpenChange,
    onConfirm,
    title,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: () => void;
    title: string;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[380px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        Complete Check
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-slate-600 py-2">
                    Are you sure you want to mark <span className="font-semibold">{title}</span> as checked and dismiss this reminder?
                </p>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => { onOpenChange(false); onConfirm(); }}>
                        Yes, Complete Check
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function InterventionsTab({ patientId, diagnosis }: InterventionsTabProps) {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<ClinicalOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [dueReminders, setDueReminders] = useState<ClinicalOrder[]>([]);
    const [confirmOrder, setConfirmOrder] = useState<ClinicalOrder | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchInterventions = async () => {
        try {
            const allOrders = await ordersApi.getOrders(patientId);
            const procedures = allOrders.filter(o => o.type === 'PROCEDURE');
            setOrders(procedures);

            // Check for due reminders for THIS patient
            const now = new Date();
            const due = procedures.filter(o =>
                o.reminderAt &&
                new Date(o.reminderAt as any) <= now &&
                o.status !== 'COMPLETED'
            );
            setDueReminders(due);
        } catch (error) {
            console.error("Failed to fetch interventions", error);
            toast.error("Failed to load interventions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterventions();
        // Poll every 60 seconds for new due reminders
        pollRef.current = setInterval(fetchInterventions, 60_000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [patientId]);

    const handleComplete = async (orderId: string) => {
        if (!user) return;
        try {
            await ordersApi.updateStatus(orderId, 'COMPLETED', user.id);
            toast.success("Check completed & intervention marked done");
            fetchInterventions();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const getTracheostomyTimer = (order: ClinicalOrder) => {
        if (order.title.toLowerCase().includes('tracheostomy') && order.status === 'COMPLETED') {
            const completionDate = new Date(order.updatedAt);
            const dueDate = new Date(completionDate.getTime() + 7 * 24 * 60 * 60 * 1000);
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

    if (loading) return <div className="p-4 text-slate-500">Loading interventions...</div>;

    const activeProcedures = orders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING');
    const completedProcedures = orders.filter(o => o.status === 'COMPLETED');

    return (
        <div className="space-y-6">
            {/* ── Due Reminder Banner ── */}
            {dueReminders.length > 0 && (
                <div className="rounded-xl border-2 border-amber-400 bg-amber-50 shadow-md overflow-hidden">
                    <div className="flex items-center gap-2 bg-amber-400 px-4 py-2">
                        <Bell className="w-4 h-4 text-white animate-pulse" />
                        <span className="font-bold text-white text-sm uppercase tracking-wide">
                            {dueReminders.length} Check Reminder{dueReminders.length > 1 ? 's' : ''} Due
                        </span>
                    </div>
                    <div className="divide-y divide-amber-200">
                        {dueReminders.map(order => (
                            <div key={order.id} className="flex items-center justify-between px-4 py-3 gap-4">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-amber-900 truncate">
                                        {(order.details as any)?.notificationText || order.title}
                                    </p>
                                    <p className="text-xs text-amber-700 flex items-center gap-1 mt-0.5">
                                        <Clock className="w-3 h-3" />
                                        Due: {new Date(order.reminderAt as any).toLocaleString()}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                                    onClick={() => setConfirmOrder(order)}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Complete Check
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

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
                            {activeProcedures.map(order => {
                                const isDue = order.reminderAt && new Date(order.reminderAt as any) <= new Date();
                                return (
                                    <div
                                        key={order.id}
                                        className={`border p-4 rounded-lg bg-white shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDue ? 'border-amber-400 bg-amber-50/40' : ''}`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h4 className="font-bold text-lg">{order.title}</h4>
                                                <Badge variant={order.priority === 'STAT' ? 'destructive' : 'outline'}>
                                                    {order.priority}
                                                </Badge>
                                                {isDue && (
                                                    <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                                                        <Bell className="w-3 h-3 mr-1" /> Check Due
                                                    </Badge>
                                                )}
                                            </div>

                                            {/* Time Done */}
                                            {(order.details as any)?.timeDone && (
                                                <p className="text-sm text-slate-600 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                                    Done at: {new Date((order.details as any).timeDone).toLocaleString()}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Created: {new Date(order.createdAt).toLocaleString()}
                                            </p>

                                            {/* Check Reminder */}
                                            {(order as any).reminderAt && (
                                                <p className={`text-sm font-medium flex items-center gap-1 mt-1 ${isDue ? 'text-amber-700' : 'text-slate-500'}`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Check reminder: {new Date((order as any).reminderAt).toLocaleString()}
                                                </p>
                                            )}

                                            {order.notes && <p className="text-sm mt-2 p-2 bg-slate-50 rounded">Note: {order.notes}</p>}
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => setConfirmOrder(order)}
                                            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-1" />
                                            Complete Check
                                        </Button>
                                    </div>
                                );
                            })}
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
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        <h4 className="font-bold text-slate-800">{order.title}</h4>
                                        <span className="text-xs text-slate-500">Done at: {new Date(order.updatedAt).toLocaleString()}</span>
                                    </div>
                                    {(order.details as any)?.timeDone && (
                                        <p className="text-xs text-slate-500 pl-7">
                                            Intervention performed: {new Date((order.details as any).timeDone).toLocaleString()}
                                        </p>
                                    )}
                                    {order.notes && <p className="text-xs text-slate-500 mt-1 pl-7">Note: {order.notes}</p>}
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

            {/* Confirmation Dialog */}
            {confirmOrder && (
                <ConfirmCheckDialog
                    open={!!confirmOrder}
                    onOpenChange={(v) => { if (!v) setConfirmOrder(null); }}
                    title={(confirmOrder.details as any)?.notificationText || confirmOrder.title}
                    onConfirm={() => handleComplete(confirmOrder.id)}
                />
            )}
        </div>
    );
}
