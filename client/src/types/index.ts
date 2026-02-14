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
    firstName: string;
    lastName: string;
    mrn: string;
    dob: string;
    gender: string;
    diagnosis?: string;
    comorbidities?: string[];
    createdAt: string;
}
