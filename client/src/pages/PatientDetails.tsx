
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import PatientHeader from '../features/patient/PatientHeader';
import VitalsTab from '../features/vitals/VitalsTab';
import MARTab from '../features/medication/MARTab';
import IOTab from '../features/io/IOTab';
import OrdersTab from '../features/orders/OrdersTab';
import InvestigationsTab from '../features/investigations/InvestigationsTab';
import NotesTab from '../features/notes/NotesTab';
import HandoverTab from '../features/handover/HandoverTab';
import InterventionsTab from '../features/interventions/InterventionsTab';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { type Patient } from '../types';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { ordersApi, ClinicalOrder } from '../api/ordersApi';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';

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
                    <Button
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => { onOpenChange(false); onConfirm(); }}
                    >
                        Yes, Complete Check
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function PatientDetails() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [dueReminders, setDueReminders] = useState<ClinicalOrder[]>([]);
    const [confirmOrder, setConfirmOrder] = useState<ClinicalOrder | null>(null);
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchPatient = () => {
        if (id) {
            apiClient.get<Patient>(`/patients/${id}`)
                .then(setPatient)
                .catch(console.error);
        }
    };

    const fetchDueReminders = async () => {
        if (!id) return;
        try {
            const allOrders = await ordersApi.getOrders(id);
            const now = new Date();
            const due = allOrders.filter(o =>
                o.type === 'PROCEDURE' &&
                (o as any).reminderAt &&
                new Date((o as any).reminderAt) <= now &&
                o.status !== 'COMPLETED'
            );
            setDueReminders(due.filter(o => !dismissedIds.has(o.id)));
        } catch (e) {
            // silent
        }
    };

    useEffect(() => {
        fetchPatient();
        fetchDueReminders();
        pollRef.current = setInterval(fetchDueReminders, 60_000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [id]);

    const handleCompleteCheck = async (orderId: string) => {
        if (!user) return;
        try {
            await ordersApi.updateStatus(orderId, 'COMPLETED', user.id);
            toast.success("Check completed");
            setDueReminders(prev => prev.filter(o => o.id !== orderId));
        } catch {
            toast.error("Failed to complete check");
        }
    };

    const handleDismiss = (orderId: string) => {
        setDismissedIds(prev => new Set([...prev, orderId]));
        setDueReminders(prev => prev.filter(o => o.id !== orderId));
    };

    if (!patient) {
        return (
            <div className="min-h-screen bg-slate-50/50 pb-20">
                <div className="bg-white border-b border-slate-200 py-8">
                    <div className="max-w-7xl mx-auto px-4 flex items-center space-x-6">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-8 w-64" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>
                </div>
                <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
                    <Skeleton className="h-10 w-[600px]" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                    </div>
                    <Skeleton className="h-[400px] w-full" />
                </main>
            </div>
        );
    }

    const visibleReminders = dueReminders.filter(o => !dismissedIds.has(o.id));

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <PatientHeader patient={patient} onUpdate={fetchPatient} />

            {/* ── Sticky Intervention Reminder Banner ── */}
            {visibleReminders.length > 0 && (
                <div className="sticky top-0 z-40 shadow-lg">
                    {visibleReminders.map(order => (
                        <div
                            key={order.id}
                            className="bg-amber-500 border-b border-amber-600"
                        >
                            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <Bell className="w-5 h-5 text-white animate-pulse shrink-0" />
                                    <div className="text-white min-w-0">
                                        <p className="font-bold text-sm truncate">
                                            ⏰ Intervention Check Due: {(order.details as any)?.notificationText || order.title}
                                        </p>
                                        <p className="text-xs text-amber-100 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            Scheduled for {new Date((order as any).reminderAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button
                                        size="sm"
                                        className="bg-white text-green-700 hover:bg-green-50 font-semibold h-8 text-xs"
                                        onClick={() => setConfirmOrder(order)}
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Complete Check
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-white hover:bg-amber-600 h-8 w-8 p-0"
                                        onClick={() => handleDismiss(order.id)}
                                        title="Dismiss for this session"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 py-6">
                {(() => {
                    const activeAdmission = patient.admissions?.find((a: any) => !a.dischargedAt);
                    return (
                        <Tabs defaultValue="vitals" className="w-full">
                            <TabsList className="mb-8 w-full p-1 bg-muted rounded-lg">
                                <TabsTrigger value="overview">Overview</TabsTrigger>
                                <TabsTrigger value="handover">Handover</TabsTrigger>
                                <TabsTrigger value="vitals">Vitals</TabsTrigger>
                                <TabsTrigger value="mar">MAR</TabsTrigger>
                                <TabsTrigger value="orders">Orders</TabsTrigger>
                                <TabsTrigger value="io">I/O</TabsTrigger>
                                <TabsTrigger value="investigations">Investigations</TabsTrigger>
                                <TabsTrigger value="radiology">Radiology</TabsTrigger>
                                <TabsTrigger value="cardiology">Cardiology</TabsTrigger>
                                <TabsTrigger value="interventions" className="relative">
                                    Interventions
                                    {visibleReminders.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-bold mb-4 text-slate-800">Clinical Summary</h3>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Primary Diagnosis</label>
                                                <p className="text-lg font-medium text-slate-900 line-clamp-2">
                                                    {patient.diagnosis || "Not recorded"}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 uppercase">Comorbidities</label>
                                                <div className="flex flex-wrap gap-2 mt-1">
                                                    {patient.comorbidities && patient.comorbidities.length > 0 ? (
                                                        patient.comorbidities.map((c, i) => (
                                                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 text-sm rounded-md border border-slate-200">
                                                                {c}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-400 text-sm italic">None recorded</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Admitted</label>
                                                    <p className="text-sm font-mono text-slate-700">
                                                        {new Date(patient.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-bold text-slate-500 uppercase">Admitting Doctor</label>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        {activeAdmission?.doctor ? `Dr. ${activeAdmission.doctor.name}` : "Not assigned"}
                                                        {activeAdmission?.specialty && <span className="text-slate-500 text-xs ml-1">({activeAdmission.specialty.name})</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-bold mb-4 text-slate-800">Current Status</h3>
                                        <div className="space-y-4 text-sm text-slate-600">
                                            <p>• Latest Vitals: Stable (See Vitals tab)</p>
                                            <p>• Active Orders: 3 Pending (See Orders tab)</p>
                                        </div>
                                        <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100 text-blue-800 text-sm">
                                            <strong>Plan for Today:</strong> Continue current antibiotics, monitor renal function.
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="handover">
                                <HandoverTab patient={patient} />
                            </TabsContent>

                            <TabsContent value="vitals">
                                <VitalsTab patientId={patient.id} />
                            </TabsContent>

                            <TabsContent value="mar">
                                <MARTab patientId={patient.id} />
                            </TabsContent>

                            <TabsContent value="orders">
                                <OrdersTab patientId={patient.id} />
                            </TabsContent>

                            <TabsContent value="io">
                                <IOTab patientId={patient.id} />
                            </TabsContent>

                            <TabsContent value="investigations">
                                <InvestigationsTab
                                    patientId={patient.id}
                                    patientMrn={patient.mrn}
                                    patientName={patient.name}
                                    defaultTab="labs"
                                />
                            </TabsContent>

                            <TabsContent value="radiology">
                                <InvestigationsTab
                                    patientId={patient.id}
                                    patientMrn={patient.mrn}
                                    patientName={patient.name}
                                    defaultTab="imaging"
                                />
                            </TabsContent>

                            <TabsContent value="cardiology">
                                <InvestigationsTab
                                    patientId={patient.id}
                                    patientMrn={patient.mrn}
                                    patientName={patient.name}
                                    defaultTab="cardiology"
                                />
                            </TabsContent>

                            <TabsContent value="interventions">
                                <InterventionsTab patientId={patient.id} diagnosis={patient.diagnosis || undefined} />
                            </TabsContent>

                            <TabsContent value="notes">
                                <NotesTab patientId={patient.id} />
                            </TabsContent>
                        </Tabs>
                    );
                })()}
            </main>

            {/* Confirmation Dialog */}
            {confirmOrder && (
                <ConfirmCheckDialog
                    open={!!confirmOrder}
                    onOpenChange={(v) => { if (!v) setConfirmOrder(null); }}
                    title={(confirmOrder.details as any)?.notificationText || confirmOrder.title}
                    onConfirm={() => handleCompleteCheck(confirmOrder.id)}
                />
            )}
        </div>
    );
}
