
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { vitalsApi, type VitalSign } from '../../api/vitalsApi';
import { apiClient } from '../../api/client';
import { type Patient } from '../../types';

export default function VitalsPrintView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [vitals, setVitals] = useState<VitalSign[]>([]);
    const [loading, setLoading] = useState(true);

    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const [p, v] = await Promise.all([
                    apiClient.get<Patient>(`/patients/${id}`),
                    vitalsApi.getVitals(id, startTime || undefined, endTime || undefined)
                ]);
                setPatient(p);
                setVitals(v);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                // Auto-print after a short delay to ensure rendering
                setTimeout(() => window.print(), 500);
            }
        };
        fetchData();
    }, [id, startTime, endTime]);

    if (loading) return <div className="p-10 text-center">Loading Report...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found</div>;

    return (
        <div className="p-8 bg-white min-h-screen text-slate-900 mx-auto max-w-[21cm] border shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-800">12-Hour Vitals Report</h1>
                    <p className="text-sm font-semibold text-slate-600">
                        Period: {startTime ? new Date(startTime).toLocaleString() : 'N/A'} - {endTime ? new Date(endTime).toLocaleString() : 'Now'}
                    </p>
                    <button
                        onClick={() => window.print()}
                        className="mt-2 text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 print:hidden"
                    >
                        🖨️ Print Now
                    </button>
                </div>
                <div className="text-right">
                    <div className="text-xl font-black">{patient.lastName.toUpperCase()}, {patient.firstName}</div>
                    <div className="text-sm font-mono font-bold">MRN: {patient.mrn}</div>
                    <div className="text-xs text-slate-500">POB / Gender: {patient.gender}</div>
                </div>
            </div>

            {/* Observation Table */}
            <div className="mb-8 overflow-x-auto print:overflow-visible">

                <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead>
                        <tr className="bg-slate-100 print:bg-slate-100">
                            <th className="border p-2 w-1/4">Date & Time</th>
                            <th className="border p-2 text-center text-red-700 w-1/6">HR (bpm)</th>
                            <th className="border p-2 text-center text-blue-700 w-1/4">BP (mmHg)</th>
                            <th className="border p-2 text-center text-emerald-700 w-1/6">SpO2 (%)</th>
                            <th className="border p-2 text-center text-amber-700 w-1/6">Temp (°C)</th>
                            <th className="border p-2 text-center text-purple-700 w-1/6">RBS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {vitals.map((v, i) => (
                            <tr key={v.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} print:break-inside-avoid print:bg-white`}>
                                <td className="border p-2 font-medium break-words">
                                    {new Date(v.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="border p-2 text-center font-bold">{v.heartRate || '--'}</td>
                                <td className="border p-2 text-center">{v.bpSys}/{v.bpDia}</td>
                                <td className="border p-2 text-center">{v.spo2}%</td>
                                <td className="border p-2 text-center">{v.temp || '--'}</td>
                                <td className="border p-2 text-center">{v.rbs || '--'}</td>
                            </tr>
                        ))}
                        {vitals.length === 0 && (
                            <tr>
                                <td colSpan={6} className="border p-8 text-center text-slate-400 italic">No vitals recorded in this period</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Signature */}
            <div className="mt-auto border-t pt-8 grid grid-cols-2 gap-20">
                <div className="border-b border-dotted h-12 flex items-end text-xs text-slate-500">Attending Physician Signature</div>
                <div className="border-b border-dotted h-12 flex items-end text-xs text-slate-500">Charge Nurse Signature</div>
            </div>

            <div className="text-[10px] text-slate-400 mt-12 text-center">
                Printed via ICU Manager • Confidential Clinical Document • Page 1 of 1
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1cm;
                    }
                    body {
                        background: white;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}
