
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Patient } from '../../types';
import { ClinicalOrder } from '../../api/ordersApi';
import { Investigation } from '../../api/investigationsApi';
import { ClinicalNote } from '../../api/notesApi';

import { Badge } from '../../components/ui/badge';

interface PrintData {
    patient: Patient | null;
    orders: ClinicalOrder[];
    investigations: Investigation[];
    notes: ClinicalNote[];
    vitals: any[]; // Using any for simplicity for now
}

export default function PrintableChart() {
    const { id } = useParams();
    const [data, setData] = useState<PrintData>({
        patient: null,
        orders: [],
        investigations: [],
        notes: [],
        vitals: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                // Parallel fetch for speed
                const [patient, orders, investigations, notes, vitals] = await Promise.all([
                    apiClient.get<Patient>(`/patients/${id}`),
                    apiClient.get<ClinicalOrder[]>(`/orders/${id}`),
                    apiClient.get<Investigation[]>(`/investigations/${id}`),
                    apiClient.get<ClinicalNote[]>(`/notes/${id}?type=PROGRESS`), // Focus on progress notes
                    apiClient.get<any[]>(`/vitals/${id}`) // Assuming vitals endpoint returns array
                ]);

                setData({
                    patient,
                    orders: orders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING'),
                    investigations: investigations.slice(0, 5), // Last 5
                    notes: notes.slice(0, 3), // Last 3 progress notes
                    vitals: vitals // All recent vitals for the chart
                });
            } catch (error) {
                console.error("Failed to load chart data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Preparing chart...</div>;
    if (!data.patient) return <div className="p-8 text-center">Patient not found</div>;

    const { patient } = data;

    return (
        <div className="p-8 max-w-5xl mx-auto bg-white min-h-screen text-slate-900 print:p-0 print:max-w-none">
            <div className="flex justify-between items-start border-b pb-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-tight">ICU Daily Chart</h1>
                    <div className="text-sm text-slate-500">Generated: {new Date().toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                        <span>MRN: {patient.mrn}</span>
                        <span>DOB: {new Date(patient.dob).toLocaleDateString()} ({patient.gender})</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-8 print:block print:space-y-6">

                {/* Vitals & Trends Section (Table Format) */}
                <section className="mb-6 col-span-2 border p-4 rounded-lg bg-slate-50 print:bg-white print:border-slate-300">
                    <h3 className="text-lg font-bold mb-4 uppercase text-slate-700">Recent Vital Signs Table</h3>

                    {data.vitals.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse bg-white">
                                <thead>
                                    <tr className="bg-slate-100 border">
                                        <th className="border p-2">Time</th>
                                        <th className="border p-2 text-center text-red-700">HR</th>
                                        <th className="border p-2 text-center text-blue-700">BP</th>
                                        <th className="border p-2 text-center text-emerald-700">SpO2</th>
                                        <th className="border p-2 text-center text-amber-700">Temp</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...data.vitals].reverse().slice(0, 10).map((v) => (
                                        <tr key={v.id} className="border hover:bg-slate-50 transition-colors">
                                            <td className="border p-2 font-medium">
                                                {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="border p-2 text-center font-bold text-red-600">{v.heartRate || '--'}</td>
                                            <td className="border p-2 text-center font-bold text-blue-600">
                                                {v.bpSys}/{v.bpDia}
                                            </td>
                                            <td className="border p-2 text-center font-bold text-emerald-600">{v.spo2}%</td>
                                            <td className="border p-2 text-center font-bold text-amber-600">{v.temp || '--'}°C</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <p className="text-[10px] text-slate-400 mt-2 text-right italic">
                                * Showing latest 10 readings
                            </p>
                        </div>
                    ) : <div className="text-slate-500 italic">No recent vitals recorded</div>}
                </section>

                {/* Active Orders */}
                <section className="mb-6 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b mb-2 uppercase text-slate-700">Active Orders</h3>
                    <div className="space-y-2">
                        {data.orders.length === 0 ? <div className="text-slate-500 italic">No active orders</div> : (
                            data.orders.map(order => (
                                <div key={order.id} className="flex justify-between items-start p-2 border rounded-sm">
                                    <div>
                                        <div className="font-bold">{order.title}</div>
                                        {order.details && <div className="text-sm text-slate-600">{JSON.stringify(order.details)}</div>}
                                    </div>
                                    <Badge variant="outline">{order.type}</Badge>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Recent Labs */}
                <section className="mb-6 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b mb-2 uppercase text-slate-700">Recent Investigations</h3>
                    <div className="space-y-2">
                        {data.investigations.length === 0 ? <div className="text-slate-500 italic">No recent results</div> : (
                            data.investigations.map(inv => (
                                <div key={inv.id} className="p-2 border rounded-sm">
                                    <div className="flex justify-between">
                                        <span className="font-bold">{inv.title}</span>
                                        <span className="text-xs text-slate-500">{new Date(inv.conductedAt).toLocaleString()}</span>
                                    </div>
                                    <div className="text-sm font-mono mt-1 whitespace-pre-wrap">
                                        {inv.impression || JSON.stringify(inv.result)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Recent Notes */}
                <section className="mb-6 break-inside-avoid">
                    <h3 className="text-lg font-bold border-b mb-2 uppercase text-slate-700">Recent Progress Notes</h3>
                    <div className="space-y-4">
                        {data.notes.length === 0 ? <div className="text-slate-500 italic">No recent notes</div> : (
                            data.notes.map(note => (
                                <div key={note.id} className="border-l-4 border-slate-300 pl-4 py-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="font-bold">{note.title}</span>
                                        <span className="text-xs text-slate-500">
                                            {note.author.name} • {new Date(note.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-sm whitespace-pre-wrap leading-relaxed">
                                        {note.content}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                <div className="text-center text-xs text-slate-400 mt-8 print:fixed print:bottom-4 print:w-full">
                    Printed from ICU Manager • Confidential Patient Information
                </div>
            </div>
        </div>
    );
}
