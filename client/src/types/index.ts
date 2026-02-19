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
}
