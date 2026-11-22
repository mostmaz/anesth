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
import { Checkbox } from '../../components/ui/checkbox';
import { marApi } from '../../api/marApi';
import { toast } from 'sonner';
import { Plus, AlertTriangle } from 'lucide-react';
import { allergyWarnings } from '../../shared/allergy';
import { dosePerKg } from '../../shared/dosing';
import { useLang } from '../../i18n';

interface AddMedicationDialogProps {
    patientId: string;
    onMedicationAdded: () => void;
    // The patient's recorded allergies and weight, for the prescribing checks.
    allergies?: string[];
    weightKg?: number | null;
}

// Today's date in the user's own timezone, as YYYY-MM-DD for a date input.
const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
    { name: 'Adrenaline', defaultDose: '1 mg', defaultRoute: 'IV' },
    { name: 'Dobutamine', defaultDose: '250 mg', defaultRoute: 'IV' }
];

export function AddMedicationDialog({ patientId, onMedicationAdded, allergies, weightKg }: AddMedicationDialogProps) {
    const { t } = useLang();
    const [open, setOpen] = useState(false);
    // The prescriber must tick this when the drug matches a recorded allergy.
    const [allergyAck, setAllergyAck] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [dose, setDose] = useState('');
    const [route, setRoute] = useState('IV');
    const [isFluid, setIsFluid] = useState(false);
    const [frequency, setFrequency] = useState('1'); // Default to 1 (OD)
    const [infusionRate, setInfusionRate] = useState('');
    const [dilution, setDilution] = useState('');
    const [durationReminder, setDurationReminder] = useState('');
    const [instructions, setInstructions] = useState('');
    const [startedAt, setStartedAt] = useState<string>(localToday());

    const warnings = allergyWarnings(name, allergies);
    const perKg = dosePerKg(dose, weightKg);
    // A different drug needs a fresh acknowledgement.
    useEffect(() => { setAllergyAck(false); }, [name]);

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
        if (warnings.length > 0 && !allergyAck) {
            toast.error(t('rx.ackRequired', 'Review the allergy warning before adding this drug'));
            return;
        }
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

            // Combine the chosen date with the current time-of-day. Sending a date-only
            // value made new Date("YYYY-MM-DD") midnight UTC, which rendered as ~3 AM
            // local — so every drug looked like it was added at 3:00 AM.
            const [sy, sm, sd] = startedAt.split('-').map(Number);
            const nowT = new Date();
            const startedDateTime = new Date(sy, (sm || 1) - 1, sd || 1, nowT.getHours(), nowT.getMinutes(), nowT.getSeconds());

            const saved = await marApi.prescribeMedication({
                patientId,
                name,
                dose,
                route,
                frequency: freqLabel,
                infusionRate,
                dilution: dilution ? parseFloat(dilution) : undefined,
                durationReminder: durationReminder ? parseInt(durationReminder, 10) : undefined,
                otherInstructions: instructions,
                startedAt: startedDateTime.toISOString()
            });
            // The server checks again in case an allergy was recorded in the meantime.
            if (saved.allergyWarnings?.length && warnings.length === 0) {
                toast.warning(`${t('rx.allergyWarning', 'Allergy warning')}: ${saved.allergyWarnings.map((w) => w.reason).join(' · ')}`, { duration: 15000 });
            }
            toast.success("Medication added");
            setOpen(false);
            onMedicationAdded();
            // Reset
            setName('');
            setDose('');
            setIsFluid(false);
            setInfusionRate('');
            setDilution('');
            setDurationReminder('');
            setInstructions('');
            setFrequency('1');
            setStartedAt(localToday());
            setAllergyAck(false);
        } catch (error: any) {
            toast.error(error?.message || "Failed to add medication");
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
                        {/* Only when there is something to pick, so the list never covers the allergy warning. */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute z-10 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto top-full mt-1">
                                {suggestions.map((drug) => (
                                    <div
                                        key={drug.name}
                                        className="p-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-0"
                                        onClick={() => handleSelectSuggestion(drug)}
                                    >
                                        <div className="font-medium">{drug.name}</div>
                                        {drug.defaultDose && <div className="text-xs text-slate-500">{drug.defaultDose}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {warnings.length > 0 && (
                        <div
                            role="alert"
                            className={`rounded-md border p-3 text-sm ${warnings.some((w) => w.level !== 'cross') ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}
                        >
                            <div className="flex items-center gap-2 font-semibold">
                                <AlertTriangle className="w-4 h-4" />
                                {t('rx.allergyWarning', 'Allergy warning')}
                            </div>
                            <ul className="mt-1 list-disc ps-5 space-y-0.5">
                                {warnings.map((w, i) => <li key={i}>{w.reason}</li>)}
                            </ul>
                            <label className="mt-2 flex items-center gap-2 font-medium cursor-pointer">
                                <input type="checkbox" className="h-4 w-4" checked={allergyAck} onChange={(e) => setAllergyAck(e.target.checked)} />
                                {t('rx.ack', 'I have reviewed this and want to prescribe it')}
                            </label>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {!isFluid && (
                            <div className="space-y-2">
                                <Label htmlFor="dose">Dose</Label>
                                <Input id="dose" required={!isFluid} value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 1g, 500mg" />
                                {perKg && <p className="text-xs text-slate-500">= {perKg} ({weightKg} kg)</p>}
                            </div>
                        )}
                        <div className={isFluid ? "col-span-2 space-y-2" : "space-y-2"}>
                            <Label htmlFor="route">Route</Label>
                            <Select value={route} onValueChange={setRoute}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IV">IV (Intravenous)</SelectItem>
                                    <SelectItem value="Infusion">Infusion</SelectItem>
                                    <SelectItem value="PO">PO (Oral)</SelectItem>
                                    <SelectItem value="NG">NG (Nasogastric)</SelectItem>
                                    <SelectItem value="IM">IM (Intramuscular)</SelectItem>
                                    <SelectItem value="SC">SC (Subcutaneous)</SelectItem>
                                    <SelectItem value="NEB">Nebulizer</SelectItem>
                                    <SelectItem value="Intranasal">Intranasal</SelectItem>
                                    <SelectItem value="LOCAL">Local</SelectItem>
                                    <SelectItem value="EYE_DROP">Eye Drop</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="isFluid"
                            checked={isFluid}
                            onCheckedChange={(checked) => setIsFluid(!!checked)}
                        />
                        <Label htmlFor="isFluid" className="cursor-pointer text-sm font-medium">
                            This is a fluid (no dose required)
                        </Label>
                    </div>

                    {!isFluid && (
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
                                    <SelectItem value="Once Only">Once Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="rate">Infusion Rate (Optional)</Label>
                        <Input id="rate" value={infusionRate} onChange={e => setInfusionRate(e.target.value)} placeholder="e.g. 5ml/hr" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startedAt">Start Date</Label>
                            <Input id="startedAt" type="date" required value={startedAt} onChange={e => setStartedAt(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="instructions">Other Instructions</Label>
                            <Input id="instructions" value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Optional details..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dilution">Dilution (Total Volume in mL)</Label>
                            <Input
                                id="dilution"
                                type="number"
                                value={dilution}
                                onChange={e => setDilution(e.target.value)}
                                placeholder="e.g. 50 (for mg/50cc)"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="durationReminder">Reminder After (Days)</Label>
                            <Input
                                id="durationReminder"
                                type="number"
                                min="1"
                                value={durationReminder}
                                onChange={e => setDurationReminder(e.target.value)}
                                placeholder="e.g. 3 (Optional)"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading || (warnings.length > 0 && !allergyAck)}>
                        {loading ? 'Adding...' : 'Add Order'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
