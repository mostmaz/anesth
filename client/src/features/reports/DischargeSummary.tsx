
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Patient } from '../../types';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

import { toast } from 'sonner';
import { Printer, Save } from 'lucide-react';
import { notesApi } from '../../api/notesApi';
import { useAuthStore } from '../../stores/authStore';

export default function DischargeSummary() {
    const { id } = useParams();
    const { user } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);

    // Discharge Fields
    const [diagnosis, setDiagnosis] = useState('');
    const [hospitalCourse, setHospitalCourse] = useState('');
    const [dischargeMeds, setDischargeMeds] = useState('');
    const [followUp, setFollowUp] = useState('');

    useEffect(() => {
        if (!id) return;
        const fetch = async () => {
            try {
                const pt = await apiClient.get<Patient>(`/patients/${id}`);
                setPatient(pt);
                // Try to pre-fill?
                setDiagnosis("Septic Shock resolved");
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    const handleSave = async () => {
        if (!id) return;
        try {
            // Save as a note of type DISCHARGE
            await notesApi.create({
                patientId: id,
                authorId: user?.id || '',
                type: 'DISCHARGE',
                title: 'Discharge Summary',
                content: `Diagnosis: ${diagnosis}\n\nHospital Course:\n${hospitalCourse}\n\nDischarge Medications:\n${dischargeMeds}\n\nFollow-up:\n${followUp}`
            });
            toast.success("Discharge Summary saved to Notes");
        } catch (error) {
            toast.error("Failed to save summary");
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!patient) return <div>Patient not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen">
            <div className="flex justify-between items-center mb-8 print:hidden">
                <h1 className="text-2xl font-bold">Prepare Discharge Summary</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save to Notes
                    </Button>
                    <Button onClick={() => window.print()}>
                        <Printer className="w-4 h-4 mr-2" /> Print / PDF
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="border-b pb-4 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="font-semibold">Patient Name:</span> {patient.name}
                        <div className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold">{patient.name}</div>
                        <div className="text-sm">MRN: <span className="font-mono">{patient.mrn}</span></div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label className="uppercase text-slate-500 text-xs font-bold">Discharge Diagnosis</Label>
                    <Input value={diagnosis} onChange={e => setDiagnosis(e.target.value)} className="font-medium text-lg border-none shadow-none focus-visible:ring-0 px-0 rounded-none border-b resize-none" placeholder="Enter diagnosis..." />
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-slate-500 text-xs font-bold">Hospital Course</Label>
                    <Textarea
                        value={hospitalCourse}
                        onChange={e => setHospitalCourse(e.target.value)}
                        className="min-h-[150px] border-slate-200 resize-none print:border-none print:p-0 print:resize-none"
                        placeholder="Summarize the patient's stay, major events, and treatments..."
                    />
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-slate-500 text-xs font-bold">Discharge Medications</Label>
                    <Textarea
                        value={dischargeMeds}
                        onChange={e => setDischargeMeds(e.target.value)}
                        className="min-h-[100px] border-slate-200 resize-none print:border-none print:p-0 print:resize-none"
                        placeholder="List medications to continue at home..."
                    />
                </div>

                <div className="space-y-2">
                    <Label className="uppercase text-slate-500 text-xs font-bold">Follow-up Instructions</Label>
                    <Textarea
                        value={followUp}
                        onChange={e => setFollowUp(e.target.value)}
                        className="min-h-[100px] border-slate-200 resize-none print:border-none print:p-0 print:resize-none"
                        placeholder="Diet, Activity, Appointments..."
                    />
                </div>
            </div>

            <div className="mt-12 pt-8 border-t flex justify-between items-center">
                <div className="text-sm text-slate-500">
                    Electronically Signatures
                </div>
                <div className="w-64 border-b border-black h-8"></div>
            </div>

            <div className="mt-8 flex justify-end print:hidden">
                <Button
                    variant="destructive"
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={async () => {
                        if (confirm("Are you sure you want to discharge this patient? This will close their current admission.")) {
                            try {
                                await apiClient.patch(`/patients/${id}/discharge`, {});
                                toast.success("Patient discharged successfully");
                                if (window.opener) {
                                    window.opener.location.reload();
                                }
                                window.close(); // Close the tab
                            } catch (error) {
                                console.error(error);
                                toast.error("Failed to discharge patient");
                            }
                        }
                    }}
                >
                    Confirm Discharge & Close File
                </Button>
            </div>
        </div>
    );
}
