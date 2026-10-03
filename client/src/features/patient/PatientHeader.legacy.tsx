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
import { Bed, Stethoscope, Printer, Activity, LogOut } from 'lucide-react';
import { calculateAge } from '../../lib/utils';
import { assignmentApi } from '../../api/assignmentApi';
import { useNavigate } from 'react-router-dom';

import EditPatientDialog from './EditPatientDialog';

interface PatientHeaderProps {
    patient: Patient;
    onUpdate?: () => void;
}

export default function PatientHeader({ patient, onUpdate }: PatientHeaderProps) {
    const { user } = useAuthStore();
    const { activeShift } = useShiftStore();
    const navigate = useNavigate();
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

    const handleSignOut = async () => {
        if (!user || user.role !== 'NURSE') return;
        try {
            await assignmentApi.unassign(patient.id, user.id);
            toast.success("Signed out of patient completely.");
            navigate('/');
        } catch (error) {
            toast.error("Failed to sign out from patient");
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
        <div className="bg-background border-b sticky top-0 z-30 shadow-sm print:hidden">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">

                    {/* Patient Identity */}
                    <div className="flex items-center space-x-3 sm:space-x-4">
                        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-muted shrink-0">
                            <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm sm:text-base">
                                {patient.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <h1 className="text-lg sm:text-xl font-bold text-foreground truncate max-w-[150px] sm:max-w-none">
                                    {patient.name}
                                </h1>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Badge variant="outline" className="text-muted-foreground text-[10px] sm:text-xs px-1.5 py-0">
                                        {calculateAge(patient.dob)} / {patient.gender.charAt(0)}
                                    </Badge>
                                    {onUpdate && <EditPatientDialog patient={patient} onUpdate={onUpdate} />}
                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-200 border-red-200 text-[10px] sm:text-xs px-1.5 py-0">
                                        {clinicalData.codeStatus}
                                    </Badge>
                                </div>
                            </div>
                            <div className="text-[11px] sm:text-sm text-muted-foreground flex items-center space-x-2 mt-0.5">
                                <span className="font-mono">MRN: {patient.mrn}</span>
                                <Separator orientation="vertical" className="h-3" />
                                <span className="flex items-center">
                                    <Bed className="w-3 h-3 mr-1" /> {clinicalData.bed}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Actions */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 lg:justify-end">
                        <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3" onClick={() => window.open(`/print-chart/${patient.id}`, '_blank')}>
                            <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span className="inline sm:hidden lg:inline">Print</span>
                            <span className="hidden sm:inline lg:hidden">Print Chart</span>
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3" onClick={() => window.open(`#/discharge/${patient.id}`, '_blank')}>
                            <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Discharge
                        </Button>
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 sm:gap-2 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3">
                                    <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    Check-in
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
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
                                        <Label htmlFor="airway" className="text-sm">Airway Safe / Patent</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="breathing"
                                            checked={checks.breathingOk}
                                            onCheckedChange={(c: boolean) => setChecks(prev => ({ ...prev, breathingOk: c }))}
                                        />
                                        <Label htmlFor="breathing" className="text-sm">Breathing / Vent OK</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="circulation"
                                            checked={checks.circulationOk}
                                            onCheckedChange={(c: boolean) => setChecks(prev => ({ ...prev, circulationOk: c }))}
                                        />
                                        <Label htmlFor="circulation" className="text-sm">Circulation / Hemodynamics</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm">Quick Note</Label>
                                        <Input
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Any concerns?"
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button className="w-full sm:w-auto" onClick={handleCheckIn}>Confirm Check-in</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        {user?.role === 'NURSE' && (
                            <Button variant="destructive" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-[11px] sm:text-xs px-2 sm:px-3" onClick={handleSignOut}>
                                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="inline sm:hidden lg:inline">Leave</span>
                                <span className="hidden sm:inline lg:hidden">Leave Patient</span>
                            </Button>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
