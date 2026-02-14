
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Loader2 } from 'lucide-react';

export default function ShiftPrintView() {
    const { id } = useParams();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShiftData = async () => {
            try {
                const response = await apiClient.get(`/shifts/${id}/report`);
                setData(response.data);
            } catch (error) {
                console.error("Failed to load shift report", error);
            } finally {
                setLoading(false);
            }
        };
        fetchShiftData();
    }, [id]);

    useEffect(() => {
        if (data) {
            setTimeout(() => window.print(), 1000);
        }
    }, [data]);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /> Loading Report...</div>;
    if (!data) return <div>Shift not found</div>;

    return (
        <div className="p-8 max-w-5xl mx-auto bg-white text-black print:p-0">
            <div className="border-b pb-4 mb-6">
                <h1 className="text-2xl font-bold">Shift Report</h1>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <div>
                        <span className="font-semibold">Nurse:</span> {data.user.name} ({data.user.role})
                    </div>
                    <div>
                        <span className="font-semibold">Shift:</span> {data.type}
                    </div>
                    <div>
                        <span className="font-semibold">Date:</span> {new Date(data.startTime).toLocaleDateString()}
                    </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold">Time:</span> {new Date(data.startTime).toLocaleTimeString()} - {data.endTime ? new Date(data.endTime).toLocaleTimeString() : 'Active'}
                </div>
            </div>

            {/* Vitals Taken */}
            <div className="mb-8">
                <h2 className="text-lg font-bold border-b mb-3 pb-1">Vitals Recorded ({data.vitalsCount})</h2>
                {data.vitals?.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-1 text-left">Time</th>
                                <th className="border p-1 text-left">Patient</th>
                                <th className="border p-1 text-center">HR</th>
                                <th className="border p-1 text-center">BP</th>
                                <th className="border p-1 text-center">SpO2</th>
                                <th className="border p-1 text-center">Temp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.vitals.map((v: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="border p-1">{new Date(v.timestamp).toLocaleTimeString()}</td>
                                    <td className="border p-1">{v.patient.lastName}, {v.patient.firstName}</td>
                                    <td className="border p-1 text-center">{v.heartRate}</td>
                                    <td className="border p-1 text-center">{v.bpSys}/{v.bpDia}</td>
                                    <td className="border p-1 text-center">{v.spo2}%</td>
                                    <td className="border p-1 text-center">{v.temp}°C</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-gray-500 italic">No vitals recorded.</p>}
            </div>

            {/* Meds Administered */}
            <div className="mb-8">
                <h2 className="text-lg font-bold border-b mb-3 pb-1">Medications Administered ({data.medsCount})</h2>
                {data.meds?.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-1 text-left">Time</th>
                                <th className="border p-1 text-left">Patient</th>
                                <th className="border p-1 text-left">Medication</th>
                                <th className="border p-1 text-center">Dose</th>
                                <th className="border p-1 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.meds.map((m: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="border p-1">{new Date(m.timestamp).toLocaleTimeString()}</td>
                                    <td className="border p-1">{m.patient.lastName}, {m.patient.firstName}</td>
                                    <td className="border p-1">{m.medication.name}</td>
                                    <td className="border p-1 text-center">{m.dose}</td>
                                    <td className="border p-1 text-center">{m.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-gray-500 italic">No medications administered.</p>}
            </div>

            {/* IO Recorded */}
            <div className="mb-8">
                <h2 className="text-lg font-bold border-b mb-3 pb-1">Intake / Output ({data.ioCount})</h2>
                {data.io?.length > 0 ? (
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-1 text-left">Time</th>
                                <th className="border p-1 text-left">Patient</th>
                                <th className="border p-1 text-center">Type</th>
                                <th className="border p-1 text-left">Category</th>
                                <th className="border p-1 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.io.map((io: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="border p-1">{new Date(io.timestamp).toLocaleTimeString()}</td>
                                    <td className="border p-1">{io.patient.lastName}, {io.patient.firstName}</td>
                                    <td className="border p-1 text-center">
                                        <span className={io.type === 'INPUT' ? 'text-blue-600' : 'text-amber-600 font-bold'}>
                                            {io.type}
                                        </span>
                                    </td>
                                    <td className="border p-1">{io.category}</td>
                                    <td className="border p-1 text-right">{io.amount} ml</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-gray-500 italic">No I/O recorded.</p>}
            </div>

            <div className="mt-12 text-center text-xs text-gray-400">
                Generated by ICU Manager on {new Date().toLocaleString()}
            </div>
        </div>
    );
}
