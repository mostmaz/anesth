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
import { Textarea } from '../../components/ui/textarea'; // Assuming exists, if not use Input
import { marApi } from '../../api/marApi';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface AddMedicationDialogProps {
    patientId: string;
    onMedicationAdded: () => void;
}

export function AddMedicationDialog({ patientId, onMedicationAdded }: AddMedicationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [route, setRoute] = useState('IV');
    const [frequency, setFrequency] = useState('Q4H');
    const [infusionRate, setInfusionRate] = useState('');
    const [instructions, setInstructions] = useState('');

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<{ name: string, defaultDose?: string, defaultRoute?: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (name.length > 1) {
            const timeout = setTimeout(() => {
                marApi.searchDrugs(name).then(setSuggestions).catch(() => setSuggestions([]));
            }, 300);
            return () => clearTimeout(timeout);
        } else {
            setSuggestions([]);
        }
    }, [name]);

    const handleSelectSuggestion = (drug: { name: string, defaultDose?: string, defaultRoute?: string }) => {
        setName(drug.name);
        if (drug.defaultDose) setDose(drug.defaultDose);
        if (drug.defaultRoute) setRoute(drug.defaultRoute);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await marApi.prescribeMedication({
                patientId,
                name,
                dose,
                route,
                frequency,
                infusionRate,
                otherInstructions: instructions
            });
            toast.success("Medication added");
            setOpen(false);
            onMedicationAdded();
            // Reset
            setName('');
            setDose('');
            setInfusionRate('');
            setInstructions('');
        } catch (error) {
            toast.error("Failed to add medication");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Medication
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Medication Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2 relative">
                        <Label htmlFor="name">Medication Name</Label>
                        <Input
                            id="name"
                            required
                            value={name}
                            onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                            placeholder="Type to search catalog..."
                            autoComplete="off"
                        />
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-40 overflow-auto top-full mt-1">
                                {suggestions.map((drug) => (
                                    <div
                                        key={drug.name}
                                        className="p-2 hover:bg-slate-100 cursor-pointer text-sm"
                                        onClick={() => handleSelectSuggestion(drug)}
                                    >
                                        {drug.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dose">Dose</Label>
                            <Input id="dose" required value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 1g, 500mg" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="route">Route</Label>
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
                            <Label htmlFor="freq">Frequency</Label>
                            <Input id="freq" required value={frequency} onChange={e => setFrequency(e.target.value)} placeholder="e.g. Q4H, BD, OD" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rate">Infusion Rate (Optional)</Label>
                            <Input id="rate" value={infusionRate} onChange={e => setInfusionRate(e.target.value)} placeholder="e.g. 5ml/hr" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="instructions">Other Instructions</Label>
                        <Input id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Optional details..." />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Adding...' : 'Add Order'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
