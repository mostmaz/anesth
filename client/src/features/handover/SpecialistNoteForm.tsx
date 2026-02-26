
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'sonner';
import { Patient } from '../../types';

interface SpecialistNoteFormProps {
    patient: Patient;
    onSuccess: () => void;
    initialData?: any;
}

export default function SpecialistNoteForm({ patient, onSuccess, initialData }: SpecialistNoteFormProps) {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);

    // Compute default background checks based on patient comorbidities if initialData is lacking
    const pmh = patient.comorbidities?.map(c => c.toLowerCase()) || [];

    // Find comorbidities that don't match the standard checkboxes to put in "Other"
    const knownComorbidities = ['htn', 'hypertension', 'ht', 'dm', 'diabetes', 't2dm', 'asthma', 'copd', 'ihd', 'cad', 'stroke', 'cva'];
    const otherComorbidities = patient.comorbidities?.filter(c => !knownComorbidities.includes(c.toLowerCase())) || [];
    const defaultOther = otherComorbidities.join(', ');

    const { register, handleSubmit, setValue, watch, reset } = useForm({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            shiftType: 'Day',
            apacheScore: '',

            // Persistent fields (Background)
            histHT: initialData?.histHT ?? (pmh.includes('htn') || pmh.includes('hypertension') || pmh.includes('ht')),
            histDM: initialData?.histDM ?? (pmh.includes('dm') || pmh.includes('diabetes') || pmh.includes('t2dm')),
            histAsthma: initialData?.histAsthma ?? (pmh.includes('asthma')),
            histCOPD: initialData?.histCOPD ?? (pmh.includes('copd')),
            histIHD: initialData?.histIHD ?? (pmh.includes('ihd') || pmh.includes('cad')),
            histStroke: initialData?.histStroke ?? (pmh.includes('stroke') || pmh.includes('cva')),
            histOther: initialData?.histOther ?? defaultOther,

            neuroGCS: '',
            neuroRASS: '',

            respChest: '', // Ventilatory Chest
            respRoomAir: false,
            respO2Therapy: false,
            respVentMode: false,
            respVentModeText: '',
            respFio2: '',
            respPS: '',

            // Persistent fields (Interventions)
            intCVLine: initialData?.intCVLine ?? false,
            intArtLine: initialData?.intArtLine ?? false,
            intETT: initialData?.intETT ?? false,
            intTrach: initialData?.intTrach ?? false,
            intDoubleLumen: initialData?.intDoubleLumen ?? false,

            hydNormovolemia: false,
            hydHypervolemia: false,
            hydHypovolemia: false,
            hydUOP: '',
            hydIVC: '',
            hydCVP: '',

            hemoStable: false,
            hemoUnstable: false,
            hemoVasopressor: false,

            feedOral: false,
            feedNG: false,
            feedTPN: false,
            feedRate: '',
            ivFluidsRate: '',

            sedPropofol: false,
            sedKetamine: false,
            sedMidazolam: false,
            sedRemif: false,
            sedMR: false,
            sedOther: '',

            clinicalNotes: '',

            planVentilatory: '',
            planPhysio: '',
            planConsult: '',
            planInvestigation: '',
            planOther: '',
            planFuture: '',
            planHomeTeam: ''
        }
    });

    const onSubmit = async (data: any) => {
        if (!user) return;
        setLoading(true);
        try {
            await apiClient.post('/specialist', {
                ...data,
                patientId: patient.id,
                authorId: user.id
            });
            toast.success("Handover note saved");
            reset();
            onSuccess();
        } catch (error) {
            console.error(error);
            toast.error("Failed to save note");
        } finally {
            setLoading(false);
        }
    };

    // Helper for controlled Checkbox with RHF
    const RHFCheckbox = ({ name, label }: { name: any, label: string }) => {
        const val = watch(name);
        return (
            <div className="flex items-center space-x-2">
                <Checkbox
                    id={name}
                    checked={val}
                    onCheckedChange={(c: boolean) => setValue(name, c)}
                />
                <Label htmlFor={name} className="text-sm font-normal cursor-pointer">{label}</Label>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="text-center text-xl font-serif">ICU Specialists Note</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input type="date" {...register('date')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Shift</Label>
                            <select
                                {...register('shiftType')}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="Day">Day Shift</option>
                                <option value="Night">Night Shift</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>APACHE Score</Label>
                            <Input {...register('apacheScore')} placeholder="Score" />
                        </div>
                    </div>

                    <Separator />

                    {/* Background */}
                    <div>
                        <Label className="font-bold mb-2 block bg-slate-100 p-1">Background</Label>
                        <div className="flex flex-wrap gap-x-6 gap-y-3">
                            <RHFCheckbox name="histHT" label="HT" />
                            <RHFCheckbox name="histDM" label="DM" />
                            <RHFCheckbox name="histAsthma" label="Asthma" />
                            <RHFCheckbox name="histCOPD" label="COPD" />
                            <RHFCheckbox name="histIHD" label="IHD" />
                            <RHFCheckbox name="histStroke" label="Stroke" />
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Label className="whitespace-nowrap">Others:</Label>
                                <Input className="h-8 w-full sm:w-64" {...register('histOther')} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Current Status */}
                    <div>
                        <Label className="font-bold mb-4 block bg-slate-800 text-white p-1">Current Status</Label>

                        {/* Neuro */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex flex-wrap items-center gap-4 border p-3 rounded bg-slate-50">
                                <Label className="font-bold w-full sm:w-auto mb-1 sm:mb-0">Neurological Status:</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">GCS:</span>
                                    <Input className="h-8 w-16" {...register('neuroGCS')} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">RASS:</span>
                                    <Input className="h-8 w-16" {...register('neuroRASS')} />
                                </div>
                            </div>
                        </div>

                        {/* Ventilatory & Hemodynamic Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                            {/* Ventilatory */}
                            <div className="border p-4 rounded space-y-3">
                                <Label className="font-bold underline">Ventilatory / Chest</Label>
                                <div className="flex items-center gap-2">
                                    <Label className="w-16">Chest:</Label>
                                    <Input className="h-8" {...register('respChest')} placeholder="Findings..." />
                                </div>
                                <div className="space-y-1">
                                    <RHFCheckbox name="respRoomAir" label="Room Air" />
                                    <RHFCheckbox name="respO2Therapy" label="O2 Therapy" />
                                    <div className="flex items-center gap-2">
                                        <RHFCheckbox name="respVentMode" label="Ventilatory mode" />
                                        <Input className="h-8 w-32" {...register('respVentModeText')} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <Label>FiO2:</Label>
                                        <Input className="h-8 w-20" {...register('respFio2')} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Label>P.S:</Label>
                                        <Input className="h-8 w-20" {...register('respPS')} />
                                    </div>
                                </div>
                            </div>

                            {/* Interventions & Hemo */}
                            <div className="space-y-4">
                                <div className="border p-4 rounded">
                                    <Label className="font-bold underline mb-2 block">Interventions</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <RHFCheckbox name="intCVLine" label="CV Line" />
                                        <RHFCheckbox name="intArtLine" label="Arterial Line" />
                                        <RHFCheckbox name="intETT" label="ETT" />
                                        <RHFCheckbox name="intTrach" label="Tracheostomy" />
                                        <RHFCheckbox name="intDoubleLumen" label="Double lumen" />
                                    </div>
                                </div>

                                <div className="border p-4 rounded">
                                    <Label className="font-bold underline mb-2 block">Hemodynamic State</Label>
                                    <div className="space-y-2">
                                        <div className="flex gap-4">
                                            <RHFCheckbox name="hemoStable" label="Stable" />
                                            <RHFCheckbox name="hemoUnstable" label="Unstable" />
                                        </div>
                                        <RHFCheckbox name="hemoVasopressor" label="Vasopressor" />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* Hydration */}
                        <div className="border p-4 rounded mt-4">
                            <Label className="font-bold underline mb-2 block">Hydration State</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <RHFCheckbox name="hydNormovolemia" label="Normovolemia" />
                                    <RHFCheckbox name="hydHypervolemia" label="Hypervolemia" />
                                    <RHFCheckbox name="hydHypovolemia" label="Hypovolemia" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                        <Label>U.O.P:</Label>
                                        <Input className="h-8" {...register('hydUOP')} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Label>IVC:</Label>
                                        <Input className="h-8" {...register('hydIVC')} />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Label>CVP:</Label>
                                        <Input className="h-8" {...register('hydCVP')} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Feeding & Sedation */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                            <div className="border p-4 rounded">
                                <Label className="font-bold underline mb-2 block">Feeding & Fluids</Label>
                                <div className="flex flex-wrap gap-4 mb-2">
                                    <RHFCheckbox name="feedOral" label="Oral" />
                                    <RHFCheckbox name="feedNG" label="NG" />
                                    <RHFCheckbox name="feedTPN" label="TPN" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Label className="w-20">Rate:</Label>
                                        <Input className="h-8" {...register('feedRate')} placeholder="ml/hr" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label className="w-20">IV Fluids:</Label>
                                        <Input className="h-8" {...register('ivFluidsRate')} placeholder="Rate ml/hr" />
                                    </div>
                                </div>
                            </div>

                            <div className="border p-4 rounded">
                                <Label className="font-bold underline mb-2 block">Sedation</Label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <RHFCheckbox name="sedPropofol" label="Propofol" />
                                    <RHFCheckbox name="sedKetamine" label="Ketamine" />
                                    <RHFCheckbox name="sedMidazolam" label="Midazolam" />
                                    <RHFCheckbox name="sedRemif" label="Remif" />
                                    <RHFCheckbox name="sedMR" label="M.R" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label>Other:</Label>
                                    <Input className="h-8" {...register('sedOther')} />
                                </div>
                            </div>
                        </div>

                        {/* Notes Area */}
                        <div className="mt-4">
                            <Label className="font-bold mb-1 block">General Notes</Label>
                            <Textarea {...register('clinicalNotes')} className="min-h-[80px]" />
                        </div>

                    </div>

                    <Separator />

                    {/* Plan for Therapy */}
                    <div>
                        <Label className="font-bold mb-4 block bg-slate-800 text-white p-1">Plan for Therapy / Recommendations</Label>
                        <div className="space-y-3">
                            <div>
                                <Label>- Ventilatory:</Label>
                                <Input className="mt-1" {...register('planVentilatory')} />
                            </div>
                            <div>
                                <Label>- Physiotherapy:</Label>
                                <Input className="mt-1" {...register('planPhysio')} />
                            </div>
                            <div>
                                <Label>- Consultation:</Label>
                                <Input className="mt-1" {...register('planConsult')} />
                            </div>
                            <div>
                                <Label>- Required Investigation:</Label>
                                <Input className="mt-1" {...register('planInvestigation')} />
                            </div>
                            <div>
                                <Label>- Others:</Label>
                                <Input className="mt-1" {...register('planOther')} />
                            </div>
                            <div>
                                <Label>- Plan for Future:</Label>
                                <Input className="mt-1" {...register('planFuture')} />
                            </div>
                            <div>
                                <Label>- Home Team Opinion:</Label>
                                <Input className="mt-1" {...register('planHomeTeam')} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="lg" className="bg-slate-900 text-white" disabled={loading}>
                            {loading ? "Saving..." : "Save Specialist Note"}
                        </Button>
                    </div>

                </CardContent>
            </Card>
        </form>
    );
}
