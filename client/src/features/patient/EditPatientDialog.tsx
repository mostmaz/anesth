
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
        diagnosis: patient.diagnosis || '',
        comorbidities: patient.comorbidities ? patient.comorbidities.join(', ') : '',
        bed: ''
    });

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await apiClient.patch(`/patients/${patient.id}`, {
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
