import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { apiClient } from '../../api/client';
import { doctorApi, Doctor, Specialty } from '../../api/doctorApi';
import { Patient } from '../../types';
import { toast } from 'sonner';
import { Pencil, X } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useLang } from '../../i18n';
import { PatientBasicsFields, basicsFromPatient, basicsPayload, basicsProblem, type BasicsValue } from './PatientBasicsFields';

interface EditPatientDialogProps {
    patient: Patient;
    onUpdate: () => void;
}

export default function EditPatientDialog({ patient, onUpdate }: EditPatientDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const user = useAuthStore((s) => s.user);
    const { t } = useLang();
    const [basics, setBasics] = useState<BasicsValue>(basicsFromPatient(patient));

    // Find active admission
    const activeAdmission = patient.admissions?.find((a: any) => !a.dischargedAt);

    const [formData, setFormData] = useState({
        name: patient.name,
        mrn: patient.mrn,
        diagnosis: patient.diagnosis || '',
    });

    const [comorbids, setComorbids] = useState<string[]>(patient.comorbidities || []);
    const [comorbidInput, setComorbidInput] = useState('');

    const [doctorName, setDoctorName] = useState(activeAdmission?.doctor?.name || '');
    const [specialtyName, setSpecialtyName] = useState(activeAdmission?.specialty?.name || '');

    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [specialties, setSpecialties] = useState<Specialty[]>([]);

    useEffect(() => {
        if (open) {
            Promise.all([doctorApi.getDoctors(), doctorApi.getSpecialties()])
                .then(([docs, specs]) => {
                    setDoctors(docs);
                    setSpecialties(specs);
                    // Reset state from props when opened
                    setFormData({
                        name: patient.name,
                        mrn: patient.mrn,
                        diagnosis: patient.diagnosis || '',
                    });
                    setComorbids(patient.comorbidities || []);
                    setBasics(basicsFromPatient(patient));

                    const activeAdm = patient.admissions?.find((a: any) => !a.dischargedAt);
                    setDoctorName(activeAdm?.doctor?.name || '');
                    setSpecialtyName(activeAdm?.specialty?.name || '');
                }).catch(console.error);
        }
    }, [open, patient]);

    const handleComorbidKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = comorbidInput.trim();
            if (val && !comorbids.includes(val)) {
                setComorbids([...comorbids, val]);
            }
            setComorbidInput('');
        }
    };

    const removeComorbid = (tag: string) => setComorbids(comorbids.filter(c => c !== tag));

    const handleSubmit = async () => {
        const problem = basicsProblem(basics);
        if (problem) { toast.error(problem); return; }
        setLoading(true);
        try {
            // Resolve Specialty
            let finalSpecialtyId: string | undefined = undefined;
            if (specialtyName.trim()) {
                const found = specialties.find(s => s.name.toLowerCase() === specialtyName.trim().toLowerCase());
                if (found) {
                    finalSpecialtyId = found.id;
                } else {
                    const newSpec = await doctorApi.createSpecialty({ name: specialtyName.trim() });
                    finalSpecialtyId = newSpec.id;
                }
            } else {
                // User cleared it
                finalSpecialtyId = null as any;
            }

            // Resolve Doctor
            let finalDoctorId: string | undefined = undefined;
            if (doctorName.trim()) {
                const found = doctors.find(d => d.name.toLowerCase() === doctorName.trim().toLowerCase());
                if (found) {
                    finalDoctorId = found.id;
                } else {
                    const newDoc = await doctorApi.createDoctor({ name: doctorName.trim(), specialtyId: finalSpecialtyId });
                    finalDoctorId = newDoc.id;
                }
            } else {
                finalDoctorId = null as any;
            }

            await apiClient.patch(`/patients/${patient.id}`, {
                name: formData.name,
                mrn: formData.mrn,
                diagnosis: formData.diagnosis,
                comorbidities: comorbids,
                ...basicsPayload(basics),
                doctorId: finalDoctorId,
                specialtyId: finalSpecialtyId
            });

            toast.success("Patient details updated");
            setOpen(false);
            onUpdate();
        } catch (error: any) {
            toast.error(error?.message || "Failed to update patient");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button type="button" className="icu-btn icu-btn-ghost icu-btn-sm" title={t('basics.edit', 'Edit patient details')}>
                    <Pencil className="w-3.5 h-3.5" /> <span className="hidden lg:inline">{t('btn.edit', 'Edit')}</span>
                </button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Patient Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Patient Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>MRN</Label>
                        <Input
                            value={formData.mrn}
                            onChange={(e) => setFormData(prev => ({ ...prev, mrn: e.target.value }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Admitting Doctor</Label>
                            <Input
                                list="doctors-edit-list"
                                value={doctorName}
                                onChange={e => setDoctorName(e.target.value)}
                                placeholder="Search or type new doctor..."
                            />
                            <datalist id="doctors-edit-list">
                                {doctors.map(d => <option key={d.id} value={d.name} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label>Specialty</Label>
                            <Input
                                list="specialties-edit-list"
                                value={specialtyName}
                                onChange={e => setSpecialtyName(e.target.value)}
                                placeholder="Search or type new specialty..."
                            />
                            <datalist id="specialties-edit-list">
                                {specialties.map(s => <option key={s.id} value={s.name} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Primary Diagnosis</Label>
                        <Input
                            value={formData.diagnosis}
                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            placeholder="e.g. Septic Shock"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Comorbidities</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {comorbids.map((tag, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {tag}
                                    <button type="button" onClick={() => removeComorbid(tag)} className="text-blue-600 hover:text-blue-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <Input
                            value={comorbidInput}
                            onChange={(e) => setComorbidInput(e.target.value)}
                            onKeyDown={handleComorbidKeyDown}
                            placeholder="Type and press enter or comma to add..."
                        />
                    </div>

                    <PatientBasicsFields value={basics} onChange={setBasics} />
                </div>
                <DialogFooter className="mr-auto w-full flex justify-between sm:justify-between">
                    <Button
                        variant="destructive"
                        style={{ visibility: user?.role === 'SENIOR' ? 'visible' : 'hidden' }}
                        onClick={async () => {
                            if (confirm("Are you SURE you want to delete this patient? ALL DATA will be lost permanently.")) {
                                try {
                                    await apiClient.delete(`/patients/${patient.id}`);
                                    toast.success("Patient deleted");
                                    setOpen(false);
                                    window.location.hash = '#/dashboard';
                                } catch (e: any) {
                                    toast.error(e?.message || "Failed to delete patient");
                                }
                            }
                        }}
                    >
                        Delete Patient
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
