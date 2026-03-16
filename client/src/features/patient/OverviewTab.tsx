
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { vitalsApi, type VitalSign } from '../../api/vitalsApi';
import { ioApi, type IOEntry } from '../../api/ioApi';
import { ordersApi, type ClinicalOrder } from '../../api/ordersApi';
import { investigationsApi, type Investigation } from '../../api/investigationsApi';
import {
    Activity,
    Droplets,
    ClipboardList,
    Clock,
    Heart,
    Zap,
    Microscope,
    CheckCircle2,
    AlertTriangle,
    Stethoscope
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '../../components/ui/button';
import { Progress } from "../../components/ui/progress";
import { marApi, type Medication } from '../../api/marApi';
import { patientApi, type TimelineEvent } from '../../api/patientApi';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import type { Patient } from '../../types';

interface OverviewTabProps {
    patientId: string;
    patient?: Patient;
}

export default function OverviewTab({ patientId, patient }: OverviewTabProps) {
    const [lastVitals, setLastVitals] = useState<VitalSign | null>(null);
    const [ioHistory, setIoHistory] = useState<IOEntry[]>([]);
    const [latestOrders, setLatestOrders] = useState<ClinicalOrder[]>([]);
    const [latestLabs, setLatestLabs] = useState<Investigation[]>([]);
    const [completedInterventions, setCompletedInterventions] = useState<ClinicalOrder[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [v, io, o, i, m, t] = await Promise.all([
                    vitalsApi.getVitals(patientId),
                    ioApi.getHistory(patientId),
                    ordersApi.getOrders(patientId),
                    investigationsApi.getAll(patientId),
                    marApi.getMAR(patientId),
                    patientApi.getTimeline(patientId).catch(() => [])
                ]);

                if (v && v.length > 0) setLastVitals(v[v.length - 1]);
                setIoHistory(io || []);
                setLatestOrders((o || []).filter((order: any) => order.type !== 'PROCEDURE').slice(0, 5));
                setCompletedInterventions((o || [])
                    .filter((order: any) => order.type === 'PROCEDURE' && order.status === 'COMPLETED')
                    .sort((a: any, b: any) => new Date((b.details as any)?.timeDone || b.updatedAt).getTime() - new Date((a.details as any)?.timeDone || a.updatedAt).getTime())
                    .slice(0, 4));
                setLatestLabs((i || []).filter((inv: any) => inv.type === 'LAB').slice(0, 3));
                setMedications(m || []);
                setTimeline(t || []);
            } catch (error) {
                console.error("Failed to fetch overview data", error);
            } finally {
                setLoading(false);
            }
        };

        if (patientId) fetchData();
    }, [patientId]);

    // 12-hour Fluid Balance Calculation
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const recentIO = ioHistory.filter(entry => new Date(entry.timestamp) >= twelveHoursAgo);

    // Sum medication volumes from administrations in the last 12h
    const medicationVolume = medications.reduce((acc, med) => {
        const recentAdmins = (med.administrations || []).filter(a =>
            a.status === 'Given' && new Date(a.timestamp) >= twelveHoursAgo
        );
        const volume = recentAdmins.reduce((sum, a) => sum + (a.dilution || 0), 0);
        return acc + volume;
    }, 0);

    const totalInput = recentIO.filter(e => e.type === 'INPUT').reduce((acc, curr) => acc + curr.amount, 0) + medicationVolume;
    const totalOutput = recentIO.filter(e => e.type === 'OUTPUT').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalInput - totalOutput;

    // Alarms Check (>30 mins delay)
    const checkDelay = (timestamp?: string | Date) => {
        if (!timestamp) return true;
        const diff = (now.getTime() - new Date(timestamp).getTime()) / (1000 * 60);
        return diff > 30;
    };

    const vitalsDelayed = !lastVitals || checkDelay(lastVitals.timestamp);
    const ioDelayed = ioHistory.length === 0 || checkDelay(ioHistory[0].timestamp);

    // Support Status (Filter from active prescriptions with infusion rates)
    const activeSupport = medications
        .filter(m => m.isActive && m.infusionRate && m.dilution)
        .map(m => {
            let day = 1;
            if (m.startedAt) {
                const diffTime = Math.abs(new Date().getTime() - new Date(m.startedAt).getTime());
                day = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }
            return {
                name: m.name,
                doseMg: m.defaultDose, // This usually contains the mg/content info
                dilution: m.dilution,
                doseMlHr: m.infusionRate,
                day,
                isOverdue: m.durationReminder ? day >= m.durationReminder : false
            };
        });

    const checkAbnormal = (val: any) => {
        return typeof val === 'object' && val !== null && (val as any).isAbnormal === true;
    };

    const abnormalLabs = latestLabs.filter(lab => {
        if (!lab.result) return false;
        return Object.values(lab.result).some(val => checkAbnormal(val));
    });

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-4 sm:space-y-6 pb-8">
            {/* Abnormal Labs Alert */}
            {abnormalLabs.length > 0 && (
                <Alert variant="destructive" className="bg-rose-50 border-rose-200 text-rose-800 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <div className="ml-3">
                        <AlertTitle className="text-sm font-bold flex items-center gap-2">
                            Abnormal Investigation Results Detected
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1 text-rose-700">
                            Recent results for <span className="font-bold underline">{abnormalLabs.map(l => l.title).join(", ")}</span> show values outside normal ranges. Please review and acknowledge.
                        </AlertDescription>
                    </div>
                </Alert>
            )}

            {/* Comorbidities */}
            {patient?.comorbidities && patient.comorbidities.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50 border border-slate-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5">
                    <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 shrink-0" />
                    <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">PMH:</span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {patient.comorbidities.map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-100 px-1.5 sm:px-2 py-0">
                                {c}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TOP ROW: VITALS & BALANCE --- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Vitals Card */}
                <Card className={cn(
                    "border-l-4 transition-all hover:shadow-md",
                    vitalsDelayed ? "border-l-rose-500 bg-rose-50/30" : "border-l-emerald-500"
                )}>
                    <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-6">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 uppercase flex items-center gap-1.5 sm:gap-2">
                                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Vitals
                            </CardTitle>
                            {vitalsDelayed && <Badge variant="destructive" className="animate-pulse text-[8px] sm:text-[10px] px-1 sm:px-2 h-4 sm:h-5">Delay</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="py-1.5 sm:py-2 px-3 sm:px-6">
                        {lastVitals ? (
                            <div className="space-y-1">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-lg sm:text-xl font-bold tracking-tight">
                                        {lastVitals.bpSys}/{lastVitals.bpDia} <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">mmHg</span>
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:gap-3">
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                        <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" />
                                        <span className="font-semibold">{lastVitals.heartRate}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                        <Droplets className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
                                        <span className="font-semibold">{lastVitals.spo2}%</span>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    {new Date(lastVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-[10px] sm:text-xs">No records</p>
                        )}
                    </CardContent>
                </Card>

                {/* Fluid Balance Card */}
                <Card className={cn(
                    "border-l-4 transition-all hover:shadow-md",
                    ioDelayed ? "border-l-rose-500 bg-rose-50/30" : "border-l-blue-500"
                )}>
                    <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-6">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 uppercase flex items-center gap-1.5 sm:gap-2">
                                <Droplets className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 12h Balance
                            </CardTitle>
                            {ioDelayed && <Badge variant="destructive" className="animate-pulse text-[8px] sm:text-[10px] px-1 sm:px-2 h-4 sm:h-5">Delay</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent className="py-1.5 sm:py-2 px-3 sm:px-6">
                        <div className="space-y-1">
                            <div className="flex justify-between items-baseline">
                                <span className={cn(
                                    "text-lg sm:text-xl font-bold tracking-tight",
                                    balance > 0 ? "text-blue-600" : balance < 0 ? "text-amber-600" : ""
                                )}>
                                    {balance > 0 ? '+' : ''}{balance} <span className="text-[9px] sm:text-[10px] text-slate-400 font-normal">mL</span>
                                </span>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
                                    <span>In: {totalInput}</span>
                                    <span>Out: {totalOutput}</span>
                                </div>
                                <Progress value={(totalInput / (totalInput + totalOutput)) * 100 || 50} className="h-1 shadow-none" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Support Card */}
                <Card className="border-l-4 border-l-amber-500 transition-all hover:shadow-md col-span-2">
                    <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-6">
                        <CardTitle className="text-[10px] sm:text-sm font-medium text-slate-500 uppercase flex items-center gap-1.5 sm:gap-2">
                            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" /> Active Support
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="py-1.5 sm:py-2 px-3 sm:px-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {activeSupport.length > 0 ? activeSupport.slice(0, 4).map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-1.5 sm:p-2 bg-slate-50 rounded border border-slate-100">
                                    <div className="min-w-0 pr-1">
                                        <div className="flex items-center gap-1">
                                            <p className="font-bold text-slate-800 text-[10px] sm:text-[11px] truncate">{s.name}</p>
                                            <Badge variant={s.isOverdue ? "destructive" : "outline"} className="text-[8px] h-3 px-1 shrink-0 whitespace-nowrap">D{s.day}</Badge>
                                        </div>
                                        <p className="text-[8px] sm:text-[9px] text-slate-500 truncate">{s.doseMg}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs sm:text-sm font-black text-amber-600">{(s.doseMlHr || '0').split(' ')[0]}</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-400 italic text-[10px] sm:text-xs col-span-2 py-2">No active support</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- MAIN CONTENT: TABS ON MOBILE, GRID ON DESKTOP --- */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                    {/* Desktop Grid View */}
                    <div className="hidden lg:grid lg:grid-cols-3 gap-6">
                        {/* Latest Orders */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="border-b bg-slate-50/50 py-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4" /> Orders
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {latestOrders.map((order) => (
                                        <div key={order.id} className="p-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-900 text-xs truncate">{order.title}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{order.notes || "No instructions"}</p>
                                            </div>
                                            <Badge variant={order.status === 'APPROVED' ? 'default' : 'secondary'} className="text-[8px] px-1 h-4">
                                                {order.status}
                                            </Badge>
                                        </div>
                                    ))}
                                    {latestOrders.length === 0 && <p className="p-4 text-center text-slate-400 italic text-xs">No active orders</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Investigations */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="border-b bg-slate-50/50 py-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2">
                                    <Microscope className="w-4 h-4" /> Labs
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-3">
                                {latestLabs.map((lab) => (
                                    <div key={lab.id} className="group cursor-pointer border-b border-slate-50 last:border-0 pb-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="text-xs font-bold text-slate-800 truncate">{lab.title}</p>
                                            <span className="text-[9px] text-slate-400 shrink-0">{new Date(lab.conductedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1 px-1">
                                            {Object.entries(lab.result || {}).filter(([k]) => k !== 'imageUrl' && k !== 'impression').slice(0, 4).map(([key, val]) => {
                                                const isAbnormal = checkAbnormal(val);
                                                const displayValue = typeof val === 'object' && val !== null && 'value' in (val as any) ? (val as any).value : val;
                                                return (
                                                    <div key={key} className="flex justify-between text-[9px] py-0.5">
                                                        <span className="text-slate-500 truncate">{key}</span>
                                                        <span className={cn(
                                                            "font-bold ml-1 shrink-0",
                                                            isAbnormal ? "text-rose-600 animate-pulse" : "text-slate-900"
                                                        )}>
                                                            {String(displayValue)}
                                                            {isAbnormal && "!"}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {latestLabs.length === 0 && <p className="p-4 text-center text-slate-400 italic text-xs">No recent labs</p>}
                            </CardContent>
                        </Card>

                        {/* Interventions */}
                        <Card className="shadow-sm border-slate-200">
                            <CardHeader className="border-b bg-emerald-50/50 py-3">
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Done
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-100">
                                    {completedInterventions.map((order) => (
                                        <div key={order.id} className="p-3 hover:bg-emerald-50/30 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <p className="font-semibold text-slate-900 text-xs truncate">{order.title}</p>
                                                <span className="text-[9px] text-slate-400">
                                                    {new Date((order.details as any)?.timeDone || order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {order.notes && <p className="text-[9px] text-slate-500 mt-1 line-clamp-1">{order.notes}</p>}
                                        </div>
                                    ))}
                                    {completedInterventions.length === 0 && <p className="p-4 text-center text-slate-400 italic text-xs">No recent completions</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Mobile Tabbed View */}
                    <div className="lg:hidden">
                        <Tabs defaultValue="orders" className="w-full">
                            <TabsList className="grid grid-cols-3 w-full mb-4">
                                <TabsTrigger value="orders" className="text-xs">Orders</TabsTrigger>
                                <TabsTrigger value="labs" className="text-xs">Labs</TabsTrigger>
                                <TabsTrigger value="done" className="text-xs">Done</TabsTrigger>
                            </TabsList>
                            <TabsContent value="orders">
                                <Card className="p-0 border-none shadow-none bg-transparent">
                                    <div className="divide-y divide-slate-200 bg-white rounded-lg border">
                                        {latestOrders.map((order) => (
                                            <div key={order.id} className="p-4 flex items-center justify-between">
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{order.title}</p>
                                                    <p className="text-xs text-slate-500">{order.notes}</p>
                                                </div>
                                                <Badge variant="secondary" className="text-[10px]">{order.status}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </TabsContent>
                            <TabsContent value="labs">
                                <Card className="p-4 border-none shadow-none bg-white rounded-lg border">
                                    <div className="space-y-4">
                                        {latestLabs.map((lab) => (
                                            <div key={lab.id} className="border-b pb-2 last:border-0">
                                                <p className="text-sm font-bold text-slate-800">{lab.title}</p>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    {Object.entries(lab.result || {}).filter(([k]) => k !== 'imageUrl' && k !== 'impression').map(([key, val]) => {
                                                        const isAbnormal = checkAbnormal(val);
                                                        const displayValue = typeof val === 'object' && val !== null && 'value' in (val as any) ? (val as any).value : val;
                                                        return (
                                                            <div key={key} className={cn(
                                                                "flex justify-between text-xs p-2 rounded border",
                                                                isAbnormal ? "bg-rose-50 border-rose-100 text-rose-700 font-bold" : "bg-slate-50 border-slate-100 text-slate-700"
                                                            )}>
                                                                <span>{key}</span>
                                                                <span>{String(displayValue)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </TabsContent>
                            <TabsContent value="done">
                                <Card className="p-0 border-none shadow-none bg-transparent">
                                    <div className="divide-y divide-slate-200 bg-white rounded-lg border">
                                        {completedInterventions.map((order) => (
                                            <div key={order.id} className="p-4">
                                                <div className="flex justify-between items-center">
                                                    <p className="font-semibold text-slate-900 text-sm">{order.title}</p>
                                                    <span className="text-xs text-slate-400">
                                                        {new Date((order.details as any)?.timeDone || order.updatedAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{order.notes}</p>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: RECENT ACTIVITY TIMELINE --- */}
                <div className="lg:col-span-1">
                    <Card className="h-full border-slate-200 shadow-sm sticky top-6">
                        <CardHeader className="border-b bg-slate-50/80 py-3">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Clock className="w-4 h-4 text-blue-600" /> Recent Activity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4 relative">
                                {/* Vertical line */}
                                <div className="absolute left-6 top-8 bottom-8 w-px bg-slate-200 border-dashed" />

                                <div className="space-y-6">
                                    {timeline.slice(0, 10).map((event, idx) => (
                                        <div key={`${event.type}-${event.id}-${idx}`} className="relative pl-8">
                                            {/* Dot */}
                                            <div className={cn(
                                                "absolute left-[-2px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10",
                                                event.type === 'MEDICATION' ? "bg-blue-500" :
                                                    event.type === 'ORDER' ? "bg-purple-500" :
                                                        event.type === 'INVESTIGATION' ? "bg-emerald-500" :
                                                            event.type === 'CONSULTATION' ? "bg-amber-500" : "bg-slate-400"
                                            )} />

                                            <div className="space-y-0.5">
                                                <div className="flex justify-between items-start pt-0.5">
                                                    <p className="text-[11px] font-bold text-slate-900 leading-tight pr-2">{event.title}</p>
                                                    <span className="text-[9px] font-medium text-slate-400 whitespace-nowrap">
                                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className={cn(
                                                        "text-[8px] h-3.5 px-1 py-0 border-none font-bold uppercase",
                                                        event.status === 'STARTED' || event.status === 'COMPLETED' || event.status === 'APPROVED' ? "bg-emerald-50 text-emerald-700" :
                                                            event.status === 'STOPPED' || event.status === 'DISCONTINUED' ? "bg-rose-50 text-rose-700" : "bg-slate-50 text-slate-600"
                                                    )}>
                                                        {event.status}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 truncate italic">
                                                        {event.details}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {timeline.length === 0 && (
                                        <div className="text-center py-8">
                                            <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs text-slate-400 italic">No recent activity found</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-3 border-t bg-slate-50/30">
                                <Button variant="ghost" size="sm" className="w-full text-[10px] h-6 text-slate-500">
                                    Load Full History
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
