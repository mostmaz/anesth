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
import { marApi } from '../../api/marApi';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

interface AddMedicationDialogProps {
    patientId: string;
    onMedicationAdded: () => void;
}

const COMMON_ICU_DRUGS = [
    { name: 'Norepinephrine', defaultDose: '0.05 mcg/kg/min', defaultRoute: 'IV' },
    { name: 'Propofol', defaultDose: '10 mg/ml', defaultRoute: 'IV' },
    { name: 'Fentanyl', defaultDose: '50 mcg', defaultRoute: 'IV' },
    { name: 'Midazolam', defaultDose: '2 mg', defaultRoute: 'IV' },
    { name: 'Hydrocortisone', defaultDose: '100 mg', defaultRoute: 'IV' },
    { name: 'Pantoprazole', defaultDose: '40 mg', defaultRoute: 'IV' },
    { name: 'Meropenem', defaultDose: '1 g', defaultRoute: 'IV' },
    { name: 'Piperacillin/Tazobactam', defaultDose: '4.5 g', defaultRoute: 'IV' },
    { name: 'Vancomycin', defaultDose: '1 g', defaultRoute: 'IV' },
    { name: 'Furosemide', defaultDose: '20 mg', defaultRoute: 'IV' },
    { name: 'Insulin Actrapid', defaultDose: '10 units', defaultRoute: 'SC' },
    { name: 'Paracetamol', defaultDose: '1 g', defaultRoute: 'IV' },
    { name: 'Enoxaparin', defaultDose: '40 mg', defaultRoute: 'SC' },
    { name: 'Amiodarone', defaultDose: '150 mg', defaultRoute: 'IV' },
    { name: 'Adrenaline', defaultDose: '1 mg', defaultRoute: 'IV' }
];

export function AddMedicationDialog({ patientId, onMedicationAdded }: AddMedicationDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [route, setRoute] = useState('IV');
    const [frequency, setFrequency] = useState('1'); // Default to 1 (OD)
    const [infusionRate, setInfusionRate] = useState('');
    const [instructions, setInstructions] = useState('');

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<{ name: string, defaultDose?: string, defaultRoute?: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        if (name.length > 0) {
            // Filter common drugs locally first or combine
            const filteredCommon = COMMON_ICU_DRUGS.filter(d => d.name.toLowerCase().includes(name.toLowerCase()));

            if (name.length > 1) {
                const timeout = setTimeout(() => {
                    marApi.searchDrugs(name).then(apiResults => {
                        // Merge unique by name
                        const distinct = [...filteredCommon, ...apiResults].filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
                        setSuggestions(distinct);
                    }).catch(() => setSuggestions(filteredCommon));
                }, 300);
                return () => clearTimeout(timeout);
            } else {
                setSuggestions(filteredCommon);
            }
        } else {
            setSuggestions(COMMON_ICU_DRUGS);
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
            // Map frequency number to label if needed, or just save the number/code
            let freqLabel = frequency;
            switch (frequency) {
                case '1': freqLabel = 'OD (Once Daily)'; break;
                case '2': freqLabel = 'BD (Twice Daily)'; break;
                case '3': freqLabel = 'TDS (Thrice Daily)'; break;
                case '4': freqLabel = 'QID (Four times)'; break;
                case '5': freqLabel = '5x/Day'; break;
                case '6': freqLabel = '6x/Day (Q4H)'; break;
            }

            await marApi.prescribeMedication({
                patientId,
                name,
                dose,
                route,
                frequency: freqLabel,
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
            setFrequency('1');
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
                            onFocus={() => setShowSuggestions(true)}
                            onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }}
                            placeholder="Type or select common drug..."
                            autoComplete="off"
                        />
                        {showSuggestions && (
                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto top-full mt-1">
                                {suggestions.length > 0 ? suggestions.map((drug) => (
                                    <div
                                        key={drug.name}
                                        className="p-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-0"
                                        onClick={() => handleSelectSuggestion(drug)}
                                    >
                                        <div className="font-medium">{drug.name}</div>
                                        {drug.defaultDose && <div className="text-xs text-slate-500">{drug.defaultDose}</div>}
                                    </div>
                                )) : (
                                    <div className="p-2 text-sm text-slate-500 italic">No matches found</div>
                                )}
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
                            <Label htmlFor="freq">Frequency (Times per day)</Label>
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
