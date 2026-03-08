
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
    ChevronRight,
    Stethoscope,
    Heart,
    Zap,
    Microscope
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Progress } from "../../components/ui/progress";
import { marApi, type Medication } from '../../api/marApi';
import { cn } from "@/lib/utils";

interface OverviewTabProps {
    patientId: string;
}

export default function OverviewTab({ patientId }: OverviewTabProps) {
    const [lastVitals, setLastVitals] = useState<VitalSign | null>(null);
    const [ioHistory, setIoHistory] = useState<IOEntry[]>([]);
    const [latestOrders, setLatestOrders] = useState<ClinicalOrder[]>([]);
    const [latestLabs, setLatestLabs] = useState<Investigation[]>([]);
    const [medications, setMedications] = useState<Medication[]>([]);
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
                const [v, io, o, i, m] = await Promise.all([
                    vitalsApi.getVitals(patientId),
                    ioApi.getHistory(patientId),
                    ordersApi.getOrders(patientId),
                    investigationsApi.getAll(patientId),
                    marApi.getMAR(patientId)
                ]);

                if (v && v.length > 0) setLastVitals(v[0]);
                setIoHistory(io || []);
                setLatestOrders((o || []).filter((order: any) => order.type !== 'PROCEDURE').slice(0, 5));
                setLatestLabs((i || []).filter((inv: any) => inv.type === 'LAB').slice(0, 3));
                setMedications(m || []);
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
        .map(m => ({
            name: m.name,
            doseMg: m.defaultDose, // This usually contains the mg/content info
            dilution: m.dilution,
            doseMlHr: m.infusionRate
        }));

    if (loading) {
        return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6 pb-8">
            {/* --- TOP ROW: VITALS & BALANCE --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Vitals Card */}
                <Card className={cn(
                    "border-l-4 transition-all hover:shadow-md",
                    vitalsDelayed ? "border-l-rose-500 bg-rose-50/30" : "border-l-emerald-500"
                )}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Last Vitals
                            </CardTitle>
                            {vitalsDelayed && <Badge variant="destructive" className="animate-pulse">Delayed</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {lastVitals ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-baseline">
                                    <span className="text-2xl font-bold tracking-tight">
                                        {lastVitals.bpSys}/{lastVitals.bpDia}
                                    </span>
                                    <span className="text-xs text-slate-400">mmHg</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <div className="flex items-center gap-2 text-sm">
                                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                                        <span className="font-semibold">{lastVitals.heartRate}</span>
                                        <span className="text-[10px] text-slate-400">bpm</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="font-semibold">{lastVitals.spo2}%</span>
                                        <span className="text-[10px] text-slate-400">SpO2</span>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(lastVitals.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-sm">No records</p>
                        )}
                    </CardContent>
                </Card>

                {/* Fluid Balance Card */}
                <Card className={cn(
                    "border-l-4 transition-all hover:shadow-md",
                    ioDelayed ? "border-l-rose-500 bg-rose-50/30" : "border-l-blue-500"
                )}>
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                                <Droplets className="w-4 h-4" /> 12h Balance
                            </CardTitle>
                            {ioDelayed && <Badge variant="destructive" className="animate-pulse">Delayed</Badge>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline">
                                <span className={cn(
                                    "text-2xl font-bold tracking-tight",
                                    balance > 0 ? "text-blue-600" : balance < 0 ? "text-amber-600" : ""
                                )}>
                                    {balance > 0 ? '+' : ''}{balance}
                                </span>
                                <span className="text-xs text-slate-400">mL</span>
                            </div>
                            <div className="space-y-1 mt-4">
                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400">
                                    <span>In: {totalInput}</span>
                                    <span>Out: {totalOutput}</span>
                                </div>
                                <Progress value={(totalInput / (totalInput + totalOutput)) * 100 || 50} className="h-1.5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Support Card */}
                <Card className="border-l-4 border-l-amber-500 transition-all hover:shadow-md lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500 uppercase flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" /> Support (Vasopressors/Inotropes)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeSupport.length > 0 ? activeSupport.map((s, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                                        <p className="text-[10px] text-slate-500">{s.doseMg} in {s.dilution}cc</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-amber-600 leading-none">{(s.doseMlHr || '0').split(' ')[0]}</p>
                                        <p className="text-[10px] text-slate-400">ml/hr</p>
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-400 italic text-sm">No active support</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- MIDDLE ROW: ORDERS & LABS --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Latest Orders */}
                <Card className="lg:col-span-2 shadow-sm border-slate-200">
                    <CardHeader className="border-b bg-slate-50/50 py-3">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" /> Latest Clinical Orders
                            </CardTitle>
                            <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2">View All</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                            {latestOrders.map((order) => (
                                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                    <div className="flex gap-3 items-start">
                                        <div className={cn(
                                            "mt-1 p-1.5 rounded-md",
                                            order.type === 'MEDICATION' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                        )}>
                                            <Stethoscope className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 text-sm">{order.title}</p>
                                            <p className="text-xs text-slate-500">{order.notes || "No special instructions"}</p>
                                        </div>
                                    </div>
                                    <Badge variant={order.status === 'APPROVED' ? 'default' : 'secondary'} className="text-[10px]">
                                        {order.status}
                                    </Badge>
                                </div>
                            ))}
                            {latestOrders.length === 0 && <p className="p-8 text-center text-slate-400 italic text-sm">No active orders</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Investigation Summary */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="border-b bg-slate-50/50 py-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Microscope className="w-4 h-4" /> Recent Investigations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                        {latestLabs.map((lab) => (
                            <div key={lab.id} className="group cursor-pointer">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{lab.title}</p>
                                    <span className="text-[10px] text-slate-400">{new Date(lab.conductedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(lab.result || {}).filter(([k]) => k !== 'imageUrl' && k !== 'impression').slice(0, 4).map(([key, val]) => (
                                        <div key={key} className="flex justify-between text-[10px] p-1.5 bg-slate-50 rounded border border-slate-100">
                                            <span className="text-slate-500 truncate mr-1">{key}</span>
                                            <span className="font-bold text-slate-900">{String(val)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-2 flex justify-end">
                                    <Button variant="link" size="sm" className="h-4 p-0 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                        View PDF <ChevronRight className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {latestLabs.length === 0 && <p className="p-8 text-center text-slate-400 italic text-sm">No recent labs</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
