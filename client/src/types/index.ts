export interface User {
    id: string;
    username: string;
    name: string;
    role: 'SENIOR' | 'RESIDENT' | 'NURSE';
}

export interface Shift {
    id: string;
    userId: string;
    type: 'DAY' | 'NIGHT';
    startTime: string;
    isActive: boolean;
}

export interface Patient {
    id: string;
    name: string;
    mrn: string;
    dob: string;
    gender: string;
    diagnosis?: string;
    comorbidities?: string[];
    // Basics used for dosing, tidal-volume targets and prescribing warnings.
    weightKg?: number | null;
    heightCm?: number | null;
    allergies?: string[];
    // true = asked and none known; false with an empty list = not recorded yet.
    noKnownAllergies?: boolean;
    admissions?: Admission[];
    createdAt: string;
}

export interface Admission {
    id: string;
    patientId: string;
    bed?: string;
    diagnosis?: string;
    admittedAt: string;
    dischargedAt?: string;
    doctor?: { id: string; name: string };
    specialty?: { id: string; name: string };
}
