
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { apiClient } from '../../api/client';
import { Patient } from '../../types';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface EditPatientDialogProps {
    patient: Patient;
    onUpdate: () => void;
}

export default function EditPatientDialog({ patient, onUpdate }: EditPatientDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: patient.name,
        mrn: patient.mrn,
        diagnosis: patient.diagnosis || '',
        comorbidities: patient.comorbidities ? patient.comorbidities.join(', ') : '',
        bed: ''
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await apiClient.patch(`/patients/${patient.id}`, {
                name: formData.name,
                mrn: formData.mrn,
                diagnosis: formData.diagnosis,
                comorbidities: formData.comorbidities.split(',').map(s => s.trim()).filter(Boolean)
            });
            toast.success("Patient details updated");
            setOpen(false);
            onUpdate();
        } catch (error) {
            toast.error("Failed to update patient");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Pencil className="w-3 h-3 text-slate-500" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Patient Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
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
                    <div className="space-y-2">
                        <Label>Primary Diagnosis</Label>
                        <Input
                            value={formData.diagnosis}
                            onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                            placeholder="e.g. Septic Shock"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Comorbidities (comma separated)</Label>
                        <Textarea
                            value={formData.comorbidities}
                            onChange={(e) => setFormData(prev => ({ ...prev, comorbidities: e.target.value }))}
                            placeholder="e.g. HTN, T2DM, COPD"
                        />
                    </div>
                </div>
                <DialogFooter className="mr-auto w-full flex justify-between sm:justify-between">
                    <Button
                        variant="destructive"
                        onClick={async () => {
                            if (confirm("Are you SURE you want to delete this patient? ALL DATA will be lost permanently.")) {
                                try {
                                    await apiClient.delete(`/patients/${patient.id}`);
                                    toast.success("Patient deleted");
                                    setOpen(false);
                                    // Refresh window or navigate to home? 
                                    // Ideally, onUpdate should handle it, but if we are viewing the patient details, we should leave.
                                    // Assuming onUpdate handles list refresh.
                                    // If we are on details page, we might want to go back.
                                    window.location.href = '/dashboard';
                                } catch (e) {
                                    toast.error("Failed to delete patient");
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
