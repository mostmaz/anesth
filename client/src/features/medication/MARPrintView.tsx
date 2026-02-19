import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { marApi, type Medication } from '../../api/marApi';
import { assignmentApi } from '../../api/assignmentApi';
import { apiClient } from '../../api/client';
import { type Patient } from '../../types';

export default function MARPrintView() {
    const { id } = useParams();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Calculate dates for the last 7 days (or next? usually current + history)
    // Let's assume current week view: Today and previous 6 days?
    // Or Today and next 6? "continued for 7 days". Usually standard MAR is 7 days.
    // Let's show Today - 6 to Today.
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return d;
    });

    useEffect(() => {
        if (!id) return;
        const fetchData = async () => {
            try {
                const [p, m, a] = await Promise.all([
                    apiClient.get<Patient>(`/patients/${id}`),
                    marApi.getMAR(id),
                    assignmentApi.getActive().catch(() => [])
                ]);
                setPatient(p);
                setMedications(m);
                setAssignments(a);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
                // Auto-print after a short delay
                setTimeout(() => window.print(), 500);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-10 text-center">Loading MAR...</div>;
    if (!patient) return <div className="p-10 text-center">Patient not found</div>;

    const assignedNurses = assignments
        .filter((a: any) => a.patientId === patient.id)
        .map((a: any) => a.user.name)
        .join(', ');

    const getAdminsForDate = (med: Medication, date: Date) => {
        const dateStr = date.toLocaleDateString();
        return med.administrations?.filter(a => new Date(a.timestamp).toLocaleDateString() === dateStr) || [];
    };

    return (
        <div className="p-8 bg-white min-h-screen text-slate-900 mx-auto max-w-[29.7cm] landscape:max-w-none border shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-slate-800">Medication Administration Record (7-Day)</h1>
                    <p className="text-sm font-semibold text-slate-600">
                        Week of: {dates[0].toLocaleDateString()} - {dates[6].toLocaleDateString()}
                    </p>
                    <button
                        onClick={() => window.print()}
                        className="mt-2 text-xs bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 print:hidden"
                    >
                        🖨️ Print Now
                    </button>
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

            {/* MAR Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse table-fixed">
                    <thead>
                        <tr className="bg-slate-100 border-y-2 border-slate-800">
                            <th className="border p-2 w-[20%] text-left">Medication / Dose / Route</th>
                            {dates.map(date => (
                                <th key={date.toISOString()} className="border p-2 text-center w-[11%]">
                                    <div className="font-bold">{date.toLocaleDateString([], { weekday: 'short' })}</div>
                                    <div className="text-[10px] text-slate-500">{date.toLocaleDateString([], { month: 'numeric', day: 'numeric' })}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {medications.map((med, i) => (
                            <tr key={med.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="border p-2 align-top">
                                    <div className="font-bold text-sm">{med.name}</div>
                                    <div className="mt-1">
                                        <span className="font-mono bg-slate-200 px-1 rounded">{med.defaultDose}</span> • {med.route}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1 italic">
                                        {med.frequency} {med.infusionRate && `• ${med.infusionRate}`}
                                    </div>
                                    {med.otherInstructions && (
                                        <div className="text-[10px] text-slate-500 mt-1 border-t pt-1">
                                            {med.otherInstructions}
                                        </div>
                                    )}
                                </td>
                                {dates.map(date => {
                                    const admins = getAdminsForDate(med, date);
                                    return (
                                        <td key={date.toISOString()} className="border p-1 align-top h-24">
                                            <div className="flex flex-col gap-1 h-full">
                                                {admins.map(admin => (
                                                    <div key={admin.id} className="bg-slate-100 p-1 rounded border text-[9px]">
                                                        <div className="font-bold text-center">
                                                            {new Date(admin.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-center truncate max-w-full" title={admin.user?.name}>
                                                            {admin.user?.name ? admin.user.name.split(' ').map(n => n[0]).join('') : 'RN'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                        {medications.length === 0 && (
                            <tr>
                                <td colSpan={8} className="p-8 text-center text-slate-400 italic">No active medications</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="text-[10px] text-slate-400 mt-12 text-center">
                Printed via ICU Manager • Confidential Clinical Document • Page 1 of 1
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 1cm;
                    }
                    body {
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
