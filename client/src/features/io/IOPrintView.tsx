
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ioApi, type IOEntry } from '../../api/ioApi';
import { assignmentApi } from '../../api/assignmentApi';
import { apiClient } from '../../api/client';
import { type Patient } from '../../types';

export default function IOPrintView() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [history, setHistory] = useState<IOEntry[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            try {
                const [p, h, a] = await Promise.all([
                    apiClient.get<Patient>(`/patients/${id}`),
                    ioApi.getHistory(id), // Ideally backend supports filtering, but for now we filter locally or add backend support later. 
                    assignmentApi.getActive().catch(() => [])
                ]);

                let filteredHistory = h;
                if (startTime && endTime) {
                    const start = new Date(startTime).getTime();
                    const end = new Date(endTime).getTime();
                    filteredHistory = h.filter(e => {
                        const t = new Date(e.timestamp).getTime();
                        return t >= start && t <= end;
                    });
                }

                setPatient(p);
                setHistory(filteredHistory);
                setAssignments(a);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, startTime, endTime]);

    if (loading) return <div className="p-10 text-center">Loading Report...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found</div>;

    const totalInput = history.filter(h => h.type === 'INPUT').reduce((acc, curr) => acc + curr.amount, 0);
    const totalOutput = history.filter(h => h.type === 'OUTPUT').reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalInput - totalOutput;

    const assignedNurses = assignments
        .filter((a: any) => a.patientId === patient.id)
        .map((a: any) => a.user.name)
        .join(', ');

    return (
        <div className="p-8 bg-white min-h-screen text-slate-900 mx-auto max-w-[21cm] border shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-800">12-Hour Fluid Balance</h1>
                    <p className="text-sm font-semibold text-slate-600">
                        Period: {startTime ? new Date(startTime).toLocaleString() : 'N/A'} - {endTime ? new Date(endTime).toLocaleString() : 'Now'}
                    </p>
                </div>
                <div className="text-right">
                    <div>
                        <h1 className="text-2xl font-bold">{patient.name}</h1>
                        <p>MRN: {patient.mrn} | DOB: {new Date(patient.dob).toLocaleDateString()}</p>
                    </div>
                    <div className="text-xs text-slate-500">POB / Gender: {patient.gender}</div>
                    {assignedNurses && (
                        <div className="text-xs text-slate-700 font-bold mt-1">
                            Nurse: {assignedNurses}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Box */}
            <div className="mb-8 grid grid-cols-3 gap-4 border p-4 rounded bg-slate-50 print:bg-white print:border-slate-300">
                <div className="text-center">
                    <div className="text-xs font-bold uppercase text-slate-500">Total Input</div>
                    <div className="text-2xl font-bold text-blue-700">{totalInput} mL</div>
                </div>
                <div className="text-center border-x border-slate-300">
                    <div className="text-xs font-bold uppercase text-slate-500">Total Output</div>
                    <div className="text-2xl font-bold text-amber-700">{totalOutput} mL</div>
                </div>
                <div className="text-center">
                    <div className="text-xs font-bold uppercase text-slate-500">Net Balance</div>
                    <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {balance > 0 ? '+' : ''}{balance} mL
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="mb-4 overflow-x-auto">
                <table className="w-full text-[10px] text-left border-collapse table-fixed">
                    <thead>
                        <tr className="bg-slate-100 border-b border-slate-300">
                            <th className="border-r p-1 w-1/6">Time</th>
                            <th className="border-r p-1 w-1/6">Type</th>
                            <th className="border-r p-1 w-1/4">Category</th>
                            <th className="border-r p-1 text-right w-1/6">Amount (mL)</th>
                            <th className="p-1 w-1/4">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((entry, i) => (
                            <tr key={entry.id} className={`border-b border-slate-200 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                                <td className="border-r p-1 font-mono">
                                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="border-r p-1 font-bold">
                                    <span className={entry.type === 'INPUT' ? 'text-blue-700' : 'text-amber-700'}>
                                        {entry.type}
                                    </span>
                                </td>
                                <td className="border-r p-1">{entry.category}</td>
                                <td className="border-r p-1 text-right font-mono">{entry.amount}</td>
                                <td className="p-1 italic text-slate-500">{entry.notes || '-'}</td>
                            </tr>
                        ))}
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-4 text-center text-slate-400 italic">No entries recorded in this period</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Signature */}
            <div className="mt-auto border-t pt-4 grid grid-cols-2 gap-20">
                <div className="border-b border-dotted h-8 flex items-end text-[10px] text-slate-500">Attending Physician Signature</div>
                <div className="border-b border-dotted h-8 flex items-end text-[10px] text-slate-500">Charge Nurse Signature</div>
            </div>

            <div className="text-[9px] text-slate-400 mt-4 text-center">
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
