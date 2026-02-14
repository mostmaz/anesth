import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Skeleton } from '../components/ui/skeleton';
import PatientHeader from '../features/patient/PatientHeader';
import VitalsTab from '../features/vitals/VitalsTab';
import MARTab from '../features/medication/MARTab';
import IOTab from '../features/io/IOTab';
import OrdersTab from '../features/orders/OrdersTab';
import InvestigationsTab from '../features/investigations/InvestigationsTab';
import NotesTab from '../features/notes/NotesTab';
import HandoverTab from '../features/handover/HandoverTab';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { type Patient } from '../types';

export default function PatientDetails() {
    const { id } = useParams();
    const [patient, setPatient] = useState<Patient | null>(null);

    const fetchPatient = () => {
        if (id) {
            apiClient.get<Patient>(`/patients/${id}`)
                .then(setPatient)
                .catch(console.error);
        }
    };

    useEffect(() => {
        fetchPatient();
    }, [id]);

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

    return (
        <div className="min-h-screen bg-slate-50/50 pb-20">
            <PatientHeader patient={patient} onUpdate={fetchPatient} />

            <main className="max-w-7xl mx-auto px-4 py-6">
                <Tabs defaultValue="vitals" className="w-full">
                    <TabsList className="grid w-full grid-cols-7 lg:w-[900px] mb-8">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="handover">Handover</TabsTrigger>
                        <TabsTrigger value="vitals">Vitals</TabsTrigger>
                        <TabsTrigger value="mar">MAR</TabsTrigger>
                        <TabsTrigger value="orders">Orders</TabsTrigger>
                        <TabsTrigger value="io">I/O</TabsTrigger>
                        <TabsTrigger value="investigations">Investigations</TabsTrigger>
                        <TabsTrigger value="radiology">Radiology</TabsTrigger>
                        <TabsTrigger value="cardiology">Cardiology</TabsTrigger>
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Patient Summary Card */}
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
                                            <label className="text-xs font-bold text-slate-500 uppercase">Code Status</label>
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                                                <span className="text-sm font-bold text-red-700">Full Code</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity / Status Card (Placeholder for now) */}
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold mb-4 text-slate-800">Current Status</h3>
                                <div className="space-y-4 text-sm text-slate-600">
                                    <p>• Latest Vitals: Stable (See Vitals tab)</p>
                                    <p>• Active Orders: 3 Pending (See Orders tab)</p>
                                    <p>• Last Rounding Note: "Patient resting comfortably..."</p>
                                </div>
                                <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-100 text-blue-800 text-sm">
                                    <strong>Plan for Today:</strong> Continue current antibiotics, monitor renal function.
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="handover">
                        <HandoverTab patientId={patient.id} />
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
                        <InvestigationsTab patientId={patient.id} defaultTab="labs" />
                    </TabsContent>

                    <TabsContent value="radiology">
                        <InvestigationsTab patientId={patient.id} defaultTab="imaging" />
                    </TabsContent>

                    <TabsContent value="cardiology">
                        <InvestigationsTab patientId={patient.id} defaultTab="cardiology" />
                    </TabsContent>

                    <TabsContent value="notes">
                        <NotesTab patientId={patient.id} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
