import { useState } from 'react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { checkinApi } from '../../api/checkinApi';
import { useAuthStore } from '../../stores/authStore';
import { useShiftStore } from '../../stores/shiftStore';
import { Patient } from '../../types';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Avatar, AvatarFallback } from '../../components/ui/avatar';
import { Separator } from '../../components/ui/separator';
import { Bed, Stethoscope, Printer, Activity } from 'lucide-react';
import { calculateAge } from '../../lib/utils';

import EditPatientDialog from './EditPatientDialog';

interface PatientHeaderProps {
    patient: Patient;
    onUpdate?: () => void;
}

export default function PatientHeader({ patient, onUpdate }: PatientHeaderProps) {
    const { user } = useAuthStore();
    const { activeShift } = useShiftStore();
    const [open, setOpen] = useState(false);
    const [notes, setNotes] = useState('');
    const [checks, setChecks] = useState({
        airwaySafe: true,
        breathingOk: true,
        circulationOk: true
    });

    const handleCheckIn = async () => {
        if (!user) return;
        try {
            await checkinApi.create({
                patientId: patient.id,
                userId: user.id,
                shiftId: activeShift?.id,
                airwaySafe: checks.airwaySafe,
                breathingOk: checks.breathingOk,
                circulationOk: checks.circulationOk,
                notes
            });
            toast.success("Check-in recorded successfully");
            setOpen(false);
            setNotes('');
        } catch (error) {
            toast.error("Failed to record check-in");
        }
    };

    // Mock clinical data...
    const clinicalData = {
        weight: '75 kg',
        admissionDate: '2023-10-15',
        diagnosis: 'Septic Shock',
        codeStatus: 'Full Code',
        allergies: ['Penicillin', 'Latex'],
        isolation: 'Contact',
        bed: 'ICU-bed-1'
    };

    return (
        <div className="bg-background border-b sticky top-0 z-30 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                    {/* Patient Identity */}
                    <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12 border-2 border-muted">
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold">
                                {patient.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h1 className="text-xl font-bold text-foreground">
                                    {patient.name}
                                </h1>
                                <Badge variant="outline" className="text-muted-foreground">
                                    {calculateAge(patient.dob)} / {patient.gender.charAt(0)}
                                </Badge>
                                {onUpdate && <EditPatientDialog patient={patient} onUpdate={onUpdate} />}
                                <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200">
                                    {clinicalData.codeStatus}
                                </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center space-x-2 mt-1">
                                <span className="font-mono">MRN: {patient.mrn}</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span className="flex items-center">
                                    <Bed className="w-3 h-3 mr-1" /> {clinicalData.bed}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Actions */}
                    <div className="flex items-center gap-4">
                        <Button variant="outline" className="gap-2" onClick={() => window.open(`/print-chart/${patient.id}`, '_blank')}>
                            <Printer className="w-4 h-4" />
                            Print Chart
                        </Button>
                        <Button variant="outline" className="gap-2" onClick={() => window.open(`/discharge/${patient.id}`, '_blank')}>
                            <Activity className="w-4 h-4" />
                            Discharge
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                                    <Stethoscope className="w-4 h-4" />
                                    Nurse Check-in
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Bedside Check-in</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="airway"
                                            checked={checks.airwaySafe}
                                            onCheckedChange={(c: boolean) => setChecks(prev => ({ ...prev, airwaySafe: c }))}
                                        />
                                        <Label htmlFor="airway">Airway Safe / Paten</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="breathing"
                                            checked={checks.breathingOk}
                                            onCheckedChange={(c: boolean) => setChecks(prev => ({ ...prev, breathingOk: c }))}
                                        />
                                        <Label htmlFor="breathing">Breathing / Vent OK</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="circulation"
                                            checked={checks.circulationOk}
                                            onCheckedChange={(c: boolean) => setChecks(prev => ({ ...prev, circulationOk: c }))}
                                        />
                                        <Label htmlFor="circulation">Circulation / Hemodynamics Stable</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Quick Note</Label>
                                        <Input
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Any concerns?"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleCheckIn}>Confirm Check-in</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                </div>
            </div>
        </div>
    );
}
