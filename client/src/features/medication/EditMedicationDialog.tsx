import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { marApi, type Medication } from '../../api/marApi';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

interface EditMedicationDialogProps {
    medication: Medication;
    onMedicationEdited: () => void;
}

export function EditMedicationDialog({ medication, onMedicationEdited }: EditMedicationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [dose, setDose] = useState(medication.defaultDose || '');
    const [route, setRoute] = useState(medication.route || 'IV');

    // Reverse map frequency label to value for dropdown
    const getFreqValue = (label?: string) => {
        if (!label) return '1';
        if (label.includes('OD')) return '1';
        if (label.includes('BD')) return '2';
        if (label.includes('TDS')) return '3';
        if (label.includes('QID')) return '4';
        if (label.includes('5x')) return '5';
        if (label.includes('Q4H') || label.includes('6x')) return '6';
        return '1';
    };

    const [frequency, setFrequency] = useState(getFreqValue(medication.frequency));
    const [infusionRate, setInfusionRate] = useState(medication.infusionRate || '');
    const [instructions, setInstructions] = useState(medication.otherInstructions || '');

    useEffect(() => {
        if (open) {
            setDose(medication.defaultDose || '');
            setRoute(medication.route || 'IV');
            setFrequency(getFreqValue(medication.frequency));
            setInfusionRate(medication.infusionRate || '');
            setInstructions(medication.otherInstructions || '');
        }
    }, [open, medication]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let freqLabel = frequency;
            switch (frequency) {
                case '1': freqLabel = 'OD (Once Daily)'; break;
                case '2': freqLabel = 'BD (Twice Daily)'; break;
                case '3': freqLabel = 'TDS (Thrice Daily)'; break;
                case '4': freqLabel = 'QID (Four times)'; break;
                case '5': freqLabel = '5x/Day'; break;
                case '6': freqLabel = '6x/Day (Q4H)'; break;
            }

            await marApi.editMedication(medication.id, {
                dose,
                route,
                frequency: freqLabel,
                infusionRate,
                otherInstructions: instructions
            });
            toast.success("Medication updated successfully");
            setOpen(false);
            onMedicationEdited();
        } catch (error) {
            toast.error("Failed to update medication");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600">
                    <Pencil className="w-4 h-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Edit Medication Order: {medication.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-dose">Dose</Label>
                            <Input id="edit-dose" required value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 1g, 500mg" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-route">Route</Label>
                            <Select value={route} onValueChange={setRoute}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IV">IV (Intravenous)</SelectItem>
                                    <SelectItem value="PO">PO (Oral)</SelectItem>
                                    <SelectItem value="IM">IM (Intramuscular)</SelectItem>
                                    <SelectItem value="SC">SC (Subcutaneous)</SelectItem>
                                    <SelectItem value="NEB">Nebulizer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-freq">Frequency (Times per day)</Label>
                            <Select value={frequency} onValueChange={setFrequency}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 (OD - Once Daily)</SelectItem>
                                    <SelectItem value="2">2 (BD - Twice Daily)</SelectItem>
                                    <SelectItem value="3">3 (TDS - Thrice Daily)</SelectItem>
                                    <SelectItem value="4">4 (QID - Four times)</SelectItem>
                                    <SelectItem value="5">5 (5 times/day)</SelectItem>
                                    <SelectItem value="6">6 (Q4H - Six times)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-rate">Infusion Rate (Optional)</Label>
                            <Input id="edit-rate" value={infusionRate} onChange={e => setInfusionRate(e.target.value)} placeholder="e.g. 5ml/hr" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-instructions">Other Instructions</Label>
                        <Input id="edit-instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Optional details..." />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
