import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { type Patient } from '../../types';
import { calculateAge } from '../../lib/utils';

export default function PatientList() {
    const navigate = useNavigate();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const data = await apiClient.get<any[]>('/patients'); // Cast to any to access admissions
                // Filter out fully discharged patients
                const active = data.filter((p: any) => {
                    const hasAdmissions = p.admissions && p.admissions.length > 0;
                    if (!hasAdmissions) return true; // Keep new patients
                    return p.admissions.some((a: any) => !a.dischargedAt);
                });
                setPatients(active);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, []);

    if (loading) return <div className="p-4">Loading patients...</div>;
    if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MRN</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {patients.map((patient) => (
                        <tr
                            key={patient.id}
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{patient.mrn}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{patient.gender}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {calculateAge(patient.dob)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
