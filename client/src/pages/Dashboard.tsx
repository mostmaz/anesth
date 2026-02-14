
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { apiClient } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useShiftStore } from '../stores/shiftStore';
import { Patient } from '../types';
import { Activity, Users, ClipboardList, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

import { ordersApi } from '../api/ordersApi';

import AddPatientForm from '../features/patient/AddPatientForm';
import { Dialog, DialogContent } from '../components/ui/dialog';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { activeShift } = useShiftStore();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [stats, setStats] = useState({
        critical: 0,
        pendingOrders: [] as any[],
        recentOrders: [] as any[],
        newAdmissions: 0
    });

    const fetchPatients = async () => {
        try {
            const [pts, pendingData, recentData] = await Promise.all([
                apiClient.get<Patient[]>('/patients'),
                ordersApi.getPendingOrders().catch(() => []),
                ordersApi.getRecentOrders().catch(() => [])
            ]);
            setPatients(pts);

            setStats({
                critical: Math.floor(Math.random() * 2),
                pendingOrders: pendingData || [],
                recentOrders: recentData || [],
                newAdmissions: 1
            });
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    const handlePatientClick = (id: string) => {
        navigate(`/patients/${id}`);
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">ICU Command Center</h1>
                    <p className="text-slate-500 mt-1">
                        Welcome back, <span className="font-semibold">{user?.name}</span> ({user?.role})
                    </p>
                </div>
                {activeShift && (
                    <Badge variant="outline" className="px-4 py-2 text-sm bg-green-50 text-green-700 border-green-200">
                        <Clock className="w-4 h-4 mr-2" />
                        Shift Active: {new Date(activeShift.startTime).toLocaleTimeString()}
                    </Badge>
                )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Census</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{patients.length}</div>
                        <p className="text-xs text-muted-foreground">Occupancy: {Math.round((patients.length / 20) * 100)}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Critical Alerts</CardTitle>
                        <Activity className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden" onClick={() => {
                    // Ideally scroll to a pending orders section or open a dialog
                    // For now just valid interaction
                }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <ClipboardList className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.pendingOrders.length}</div>
                        <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </CardContent>


                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New Admissions</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.newAdmissions}</div>
                        <p className="text-xs text-muted-foreground">Last 24 hours</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Patient List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <CardTitle>Active Patients</CardTitle>
                            <Button size="sm" onClick={() => setIsAddPatientOpen(true)}>
                                + Admit Patient
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {patients.length === 0 ? (
                                <div className="text-center p-8 text-muted-foreground">No patients currently admitted.</div>
                            ) : (
                                patients.map(patient => (
                                    <div
                                        key={patient.id}
                                        onClick={() => handlePatientClick(patient.id)}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                                {patient.firstName[0]}{patient.lastName[0]}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{patient.lastName}, {patient.firstName}</div>
                                                <div className="text-sm text-slate-500 font-mono">MRN: {patient.mrn}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <Badge variant="outline">{new Date().getFullYear() - new Date(patient.dob).getFullYear()}y / {patient.gender}</Badge>
                                            <Badge className={Math.random() > 0.8 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                                                {Math.random() > 0.8 ? "Critical" : "Stable"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Right Sidebar: Quick Actions & Shift Info */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Staff On Duty</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Dr. Senior (You)</span>
                                    <Badge>On Call</Badge>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-500">
                                    <span>Nurse Joy</span>
                                    <span>ICU-A</span>
                                </div>
                                <div className="flex justify-between items-center text-sm text-slate-500">
                                    <span>Nurse John</span>
                                    <span>ICU-B</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Recent Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {(stats as any).recentOrders?.map((order: any) => (
                                    <div key={order.id} className="flex items-start space-x-3 text-sm border-b pb-2 last:border-0 last:pb-0">
                                        <div className={`mt-0.5 p-1 rounded-full ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {order.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                                {order.title}
                                                {order.status === 'COMPLETED' && <span className="text-[10px] bg-green-100 text-green-800 px-1.5 rounded-full">Done</span>}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {order.patient.lastName}, {order.patient.firstName.charAt(0)}
                                            </div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                {new Date(order.createdAt).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!stats as any).recentOrders?.length && <div className="text-slate-500 italic">No recent orders</div>}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Clinical Orders Section */}
                <Card className="col-span-full mt-6">
                    <CardHeader>
                        <CardTitle>Clinical Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="pending" className="w-full">
                            <TabsList>
                                <TabsTrigger value="pending">Pending</TabsTrigger>
                                <TabsTrigger value="completed">Completed</TabsTrigger>
                            </TabsList>
                            <TabsContent value="pending" className="mt-4">
                                <PendingExecutionList onSuccess={fetchPatients} />
                            </TabsContent>
                            <TabsContent value="completed" className="mt-4">
                                <CompletedOrdersList />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
                <DialogContent>
                    <AddPatientForm
                        onSuccess={() => {
                            setIsAddPatientOpen(false);
                            fetchPatients();
                        }}
                        onCancel={() => setIsAddPatientOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PendingExecutionList({ onSuccess }: { onSuccess: () => void }) {
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            const data = await ordersApi.getActiveOrders();
            setOrders(data);
        } catch (err) {
            console.error("Failed to load active orders", err);
        } finally {
            setLoading(false);
        }
    };

    const handleComplete = async (orderId: string) => {
        if (!user) return;
        setProcessingId(orderId);
        try {
            await ordersApi.updateStatus(orderId, 'COMPLETED', user.id);
            await loadOrders();
            onSuccess();
        } catch (error) {
            console.error("Failed to complete order", error);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div>Loading orders...</div>;
    if (orders.length === 0) return <div className="text-muted-foreground p-4">No pending orders.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map(order => (
                <div key={order.id} className="border rounded p-3 flex flex-col justify-between bg-white shadow-sm border-slate-200">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="font-bold text-slate-800">{order.title}</div>
                            <Badge variant={order.priority === 'STAT' ? 'destructive' : 'secondary'}>
                                {order.priority}
                            </Badge>
                        </div>
                        <div className="text-sm text-slate-600">
                            {order.patient.lastName}, {order.patient.firstName} (MRN: {order.patient.mrn})
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            Ordered by {order.author.name} • {new Date(order.createdAt).toLocaleString()}
                        </div>
                    </div>

                    <Button
                        size="sm"
                        className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleComplete(order.id)}
                        disabled={!!processingId}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {processingId === order.id ? 'Completing...' : 'Mark Complete'}
                    </Button>
                </div>
            ))}
        </div>
    );
}

function CompletedOrdersList() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrders = async () => {
            try {
                const data = await ordersApi.getCompletedOrders();
                setOrders(data);
            } catch (err) {
                console.error("Failed to load completed orders", err);
            } finally {
                setLoading(false);
            }
        };
        loadOrders();
    }, []);

    if (loading) return <div>Loading history...</div>;
    if (orders.length === 0) return <div className="text-muted-foreground p-4">No completed orders found.</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
            {orders.map(order => (
                <div key={order.id} className="border rounded p-3 bg-slate-50 border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-700 line-through">{order.title}</div>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>
                    </div>
                    <div className="text-sm text-slate-500">
                        {order.patient.lastName}, {order.patient.firstName}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                        Ordered by {order.author.name} • {new Date(order.updatedAt).toLocaleTimeString()}
                    </div>
                </div>
            ))}
        </div>
    );
}
