
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
import { Activity, Users, ClipboardList, AlertTriangle, Clock, CheckCircle2, LogOut, CheckCheck, X, FlaskConical } from 'lucide-react';

import { ordersApi } from '../api/ordersApi';
import { assignmentApi, Assignment } from '../api/assignmentApi';
import { shiftApi } from '../api/shiftApi';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

import AddPatientForm from '../features/patient/AddPatientForm';
import { Dialog, DialogContent } from '../components/ui/dialog';

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { activeShift, endShift } = useShiftStore();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [pendingAssignments, setPendingAssignments] = useState<Assignment[]>([]);

    // New State for Staff of the Day
    const [staffOnDuty, setStaffOnDuty] = useState<{ seniors: any[], nurses: any[] }>({ seniors: [], nurses: [] });
    const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);

    // Live Feed for new lab results via SSE
    const [recentLabsFeed, setRecentLabsFeed] = useState<any[]>([]);

    const [stats, setStats] = useState({
        critical: 0,
        activeOrders: [] as any[],
        recentOrders: [] as any[],
        newAdmissions: 0
    });

    const fetchData = async () => {
        try {
            const [pts, activeData, recentData, activeAssignments, staffData, pendingData] = await Promise.all([
                apiClient.get<Patient[]>('/patients'),
                ordersApi.getActiveOrders().catch(() => []),
                ordersApi.getRecentOrders().catch(() => []),
                assignmentApi.getActive().catch(() => []),
                shiftApi.getStaffOnDuty().catch(() => ({ seniors: [], nurses: [] })),
                assignmentApi.getPending().catch(() => [])
            ]);

            setStaffOnDuty(staffData);
            setPendingAssignments(pendingData);

            setPatients(pts.filter((p: any) => {
                const hasAdmissions = p.admissions && p.admissions.length > 0;
                if (!hasAdmissions) return true;
                const hasActiveAdmission = p.admissions.some((a: any) => !a.dischargedAt);
                return hasActiveAdmission;
            }));

            setAssignments(activeAssignments);

            // Block nurse: must pick a patient before doing anything
            if (user?.role === 'NURSE' && activeShift) {
                const myAssignment = activeAssignments.find((a: any) => a.userId === user.id);
                setShowAssignmentDialog(!myAssignment);
            }

            setStats({
                critical: Math.floor(Math.random() * 2),
                activeOrders: activeData || [],
                recentOrders: recentData || [],
                newAdmissions: 1
            });
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        }
    };

    useEffect(() => {
        fetchData();

        // Listen for live SSE notifications specifically for the Dashboard widget
        const eventSource = new EventSource(`${API_URL}/notifications/stream`);

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.patientName && data.title) {
                    setRecentLabsFeed(prev => [data, ...prev].slice(0, 10)); // Keep last 10
                }
            } catch (err) {
                // Parse error
            }
        };

        return () => {
            eventSource.close();
        };
    }, []);

    const handleSignIn = async (patientId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        try {
            const result = await assignmentApi.assign(patientId, user.id);
            if (result.pending) {
                toast.info("Request submitted — waiting for senior/resident approval.");
            } else {
                toast.success("Signed in successfully");
            }
            fetchData(); // Always refresh
        } catch (err: any) {
            const msg = err.message || "Failed to sign in";
            toast.error(msg.includes('400') || msg.includes('already') ? 'You are already signed in to another patient.' : msg);
        }
    };

    const handleSignOut = async (patientId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        try {
            await assignmentApi.unassign(patientId, user.id);
            toast.success("Signed out successfully");
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Failed to sign out");
        }
    };

    const handlePatientClick = (id: string) => {
        navigate(`/patients/${id}`);
    };

    const handleMandatoryAssign = async (patientId: string) => {
        if (!user) return;
        try {
            const result = await assignmentApi.assign(patientId, user.id);
            if (result.pending) {
                toast.info("Patient is occupied — your request was submitted. Waiting for senior/resident approval.");
                setShowAssignmentDialog(false); // Let nurse browse while waiting
            } else {
                toast.success("Signed in successfully");
            }
            fetchData(); // Always refresh
        } catch (err: any) {
            const msg = err.message || '';
            toast.error(msg.includes('already') ? 'You are already signed in to another patient.' : (msg || 'Failed to sign in'));
        }
    };

    const handleApprove = async (id: string) => {
        try {
            await assignmentApi.approve(id);
            toast.success("Assignment approved");
            fetchData();
        } catch {
            toast.error("Failed to approve");
        }
    };

    const handleReject = async (id: string) => {
        try {
            await assignmentApi.reject(id);
            toast.success("Assignment rejected");
            fetchData();
        } catch {
            toast.error("Failed to reject");
        }
    };

    const handleEndShift = async () => {
        await endShift();
        toast.success("Shift ended");
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
                <div className="flex items-center gap-3">
                    {activeShift && (
                        <Badge variant="outline" className="px-4 py-2 text-sm bg-green-50 text-green-700 border-green-200">
                            <Clock className="w-4 h-4 mr-2" />
                            Shift Active: {new Date(activeShift.startTime).toLocaleTimeString()}
                        </Badge>
                    )}
                    {/* End Shift button for SENIOR and RESIDENT in the header */}
                    {activeShift && (user?.role === 'SENIOR' || user?.role === 'RESIDENT') && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleEndShift}
                            className="gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            End Shift
                        </Button>
                    )}
                </div>
            </div>

            {/* Mandatory Assignment Dialog — blocks nurse until patient selected */}
            <Dialog
                open={showAssignmentDialog}
                onOpenChange={(open) => {
                    // Block nurse from closing dialog — they MUST select a patient
                    if (!open && user?.role === 'NURSE') return;
                    setShowAssignmentDialog(open);
                }}
            >
                <DialogContent className="sm:max-w-[600px] [&>button]:hidden">
                    <CardHeader>
                        <CardTitle className="text-xl text-red-600 flex items-center gap-2">
                            <AlertTriangle className="h-6 w-6" />
                            Action Required: Sign In to a Patient
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            You must sign in to a patient before accessing any records.
                            Select a patient below to continue.
                        </p>
                    </CardHeader>
                    <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                        {patients.map(patient => {
                            const patientAssignments = assignments.filter(a => a.patientId === patient.id);
                            const isOccupied = patientAssignments.length > 0;
                            return (
                                <div key={patient.id} className="flex justify-between items-center p-3 border rounded hover:bg-slate-50">
                                    <div>
                                        <div className="font-bold">{patient.name}</div>
                                        <div className="text-xs text-muted-foreground">MRN: {patient.mrn}</div>
                                    </div>
                                    {isOccupied ? (
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                                Occupied
                                            </Badge>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                                                onClick={() => handleMandatoryAssign(patient.id)}
                                            >
                                                Request Sign-In
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button size="sm" onClick={() => handleMandatoryAssign(patient.id)}>
                                            Sign In
                                        </Button>
                                    )}
                                </div>
                            );
                        })}
                        {patients.length === 0 && <p className="text-center text-muted-foreground">No patients available.</p>}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Pending Nurse Assignment Requests — visible to SENIOR and RESIDENT only */}
            {(user?.role === 'SENIOR' || user?.role === 'RESIDENT') && pendingAssignments.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Pending Nurse Assignment Requests ({pendingAssignments.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {pendingAssignments.map(pending => (
                                <div key={pending.id} className="flex justify-between items-center bg-white border border-orange-100 rounded p-3">
                                    <div className="text-sm">
                                        <span className="font-semibold">{pending.user.name}</span>
                                        <span className="text-muted-foreground"> wants to be assigned to </span>
                                        <span className="font-semibold">{pending.patient.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">(MRN: {pending.patient.mrn})</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            className="h-7 text-xs bg-green-600 hover:bg-green-700"
                                            onClick={() => handleApprove(pending.id)}
                                        >
                                            <CheckCheck className="w-3 h-3 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 text-xs"
                                            onClick={() => handleReject(pending.id)}
                                        >
                                            <X className="w-3 h-3 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

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
                <Card className="cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
                        <ClipboardList className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.activeOrders.length}</div>
                        <p className="text-xs text-muted-foreground">In Progress</p>
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
                {/* Left Column (Labs + Patients) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Live Lab Updates Feed */}
                    {recentLabsFeed.length > 0 && (
                        <Card className="border-blue-200 shadow-sm bg-gradient-to-r from-blue-50/50 to-white">
                            <CardHeader className="pb-3 border-b border-blue-100 bg-white/50">
                                <CardTitle className="text-base font-semibold flex items-center text-blue-800">
                                    <div className="relative mr-3 flex items-center justify-center">
                                        <FlaskConical className="w-5 h-5 text-blue-600" />
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                                        <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                                    </div>
                                    Live Lab Updates
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-blue-50/50 max-h-[200px] overflow-y-auto">
                                    {recentLabsFeed.map((lab, index) => (
                                        <div key={index} className="p-4 flex items-center justify-between hover:bg-blue-50/50 transition-colors cursor-pointer group" onClick={() => lab.patientId && handlePatientClick(lab.patientId)}>
                                            <div className="flex items-center space-x-4">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                    <FlaskConical className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">
                                                        <span className="font-bold">{lab.patientName}</span> — {lab.title}
                                                    </p>
                                                    <p className="text-xs text-slate-500 flex items-center mt-0.5">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {new Date(lab.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="hidden group-hover:flex text-blue-600 hover:text-blue-700 hover:bg-blue-100 h-8">
                                                View Chart
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Patient List */}
                    <Card>
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
                                                    {patient.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{patient.name}</div>
                                                    <div className="text-sm text-slate-500 font-mono">MRN: {patient.mrn}</div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {/* Assigned Nurses Display */}
                                                <div className="flex -space-x-2 overflow-hidden">
                                                    {assignments
                                                        .filter(a => a.patientId === patient.id)
                                                        .map(a => (
                                                            <div key={a.id} title={`Nurse: ${a.user.name}`} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-green-100 flex items-center justify-center text-[10px] font-bold text-green-700">
                                                                {a.user.name.substring(0, 1)}
                                                            </div>
                                                        ))
                                                    }
                                                </div>

                                                {/* Sign In/Out Button */}
                                                {(() => {
                                                    const patientAssignments = assignments.filter(a => a.patientId === patient.id);
                                                    const myAssignment = patientAssignments.find(a => a.userId === user?.id);

                                                    if (myAssignment) {
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-7 text-xs"
                                                                onClick={(e) => handleSignOut(patient.id, e)}
                                                            >
                                                                Sign Out
                                                            </Button>
                                                        );
                                                    }

                                                    if (user?.role === 'NURSE') {
                                                        const isOccupied = patientAssignments.length > 0;
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className={`h-7 text-xs ${isOccupied
                                                                    ? 'border-orange-200 text-orange-700 hover:bg-orange-50'
                                                                    : 'border-blue-200 text-blue-700 hover:bg-blue-50'}`}
                                                                onClick={(e) => handleSignIn(patient.id, e)}
                                                            >
                                                                {isOccupied ? 'Request Sign-In' : 'Sign In'}
                                                            </Button>
                                                        );
                                                    }
                                                    return null;
                                                })()}

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
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Seniors (On Call)</h4>
                                        <div className="space-y-2">
                                            {staffOnDuty.seniors.length === 0 ? <p className="text-xs italic text-slate-400">No seniors found</p> :
                                                staffOnDuty.seniors.map((s) => (
                                                    <div key={s.id} className="flex justify-between items-center text-sm">
                                                        <span className={s.id === user?.id ? "font-bold" : ""}>{s.name} {s.id === user?.id && "(You)"}</span>
                                                        <Badge variant="outline" className="text-[10px]">On Call</Badge>
                                                    </div>
                                                ))
                                            }
                                            {user?.role === 'SENIOR' && !staffOnDuty.seniors.find(s => s.id === user.id) && (
                                                <Button
                                                    size="sm"
                                                    className="w-full mt-2"
                                                    variant="secondary"
                                                    onClick={async () => {
                                                        try {
                                                            await shiftApi.startShift(user.id, 'DAY');
                                                            fetchData();
                                                            toast.success("You are now On Call");
                                                        } catch (err) {
                                                            toast.error("Failed to set On Call status");
                                                        }
                                                    }}
                                                >
                                                    I am On Call
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nurses (Active Shift)</h4>
                                        <div className="space-y-2">
                                            {staffOnDuty.nurses.length === 0 ? <p className="text-xs italic text-slate-400">No nurses on shift</p> :
                                                staffOnDuty.nurses.map((n) => (
                                                    <div key={n.id} className="flex flex-col text-sm border-b pb-1 last:border-0 last:pb-0">
                                                        <div className="flex justify-between items-center">
                                                            <span className={n.id === user?.id ? "font-bold" : ""}>{n.name}</span>
                                                            <span className="text-[10px] text-slate-400">{n.shiftType}</span>
                                                        </div>
                                                        <div className="text-xs text-slate-500">
                                                            {n.assignment ? `Assigned: ${n.assignment}` : <span className="text-red-400">Unassigned</span>}
                                                        </div>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {user?.role === 'SENIOR' && (
                            <Button
                                variant="destructive"
                                className="w-full"
                                onClick={async () => {
                                    if (confirm("Are you sure you want to sign out ALL staff and clear all patient assignments?")) {
                                        try {
                                            await shiftApi.endAllShifts();
                                            toast.success("Signed out all staff");
                                            fetchData();
                                        } catch (err) {
                                            toast.error("Failed to sign out all staff");
                                        }
                                    }
                                }}
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Sign Out All
                            </Button>
                        )}

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
                                                    {order.patient.name}
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
                            <Tabs defaultValue="active" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="active">Active</TabsTrigger>
                                    <TabsTrigger value="completed">Completed</TabsTrigger>
                                </TabsList>
                                <TabsContent value="active" className="mt-4">
                                    <PendingExecutionList onSuccess={fetchData} />
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
                                fetchData();
                            }}
                            onCancel={() => setIsAddPatientOpen(false)}
                        />
                    </DialogContent>
                </Dialog>
            </div>
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
    if (orders.length === 0) return <div className="text-muted-foreground p-4 text-center">No pending orders.</div>;

    return (
        <div className="space-y-3">
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
                            {order.patient.name} (MRN: {order.patient.mrn})
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
            {orders.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">+{orders.length - 5} more orders. View in Orders tab.</p>
            )}
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
    if (orders.length === 0) return <div className="text-muted-foreground p-4 text-center">No recently completed orders.</div>;

    return (
        <div className="space-y-2 opacity-75">
            {orders.slice(0, 5).map(order => (
                <div key={order.id} className="border rounded p-2 bg-slate-50 border-slate-100 flex justify-between items-center">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="font-medium text-slate-700 line-through text-xs truncate">{order.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                            {order.patient.name} • ✅ {order.author.name}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
