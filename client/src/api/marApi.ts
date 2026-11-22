import { apiClient } from './client';
import type { AllergyWarning } from '../shared/allergy';

export interface Medication {
    id: string;
    name: string;
    defaultDose: string;
    route: string;
    frequency?: string;
    infusionRate?: string;
    otherInstructions?: string;
    isActive: boolean;
    startedAt: string;
    discontinuedAt?: string;
    dilution?: number;
    durationReminder?: number;
    administrations: MedicationAdministration[];
    // Present on the answer to a new prescription when the drug matches a recorded allergy.
    allergyWarnings?: AllergyWarning[];
}

export type AdministrationStatus = 'Scheduled' | 'Given' | 'Held' | 'NotGiven' | 'Paused' | 'Resumed';

export interface MedicationAdministration {
    id: string;
    patientId: string;
    medicationId: string;
    status: AdministrationStatus;
    dose?: string;
    dilution?: number;
    timestamp: string;   // actual administration time (may be back-dated)
    chartedAt?: string;  // when charted; differs from timestamp on late entries
    userId?: string;
    user?: { id?: string; name: string; role?: string }; // who charted it
}

export interface OverdueDose {
    patientId: string;
    patientName: string;
    medicationId: string;
    name: string;
    dose: string;
    route: string;
    dueAt: string;
    overdueMinutes: number;
    firstDose: boolean;
}

export interface SignOffItem {
    id: string;
    medicationId: string;
    drug: string;
    dose: string | null;
    route: string;
    status: string;
    timestamp: string;
    chartedAt: string | null;
    userId: string | null;
    by: string | null;
}

export interface SignOffCounts {
    total: number;
    byStatus: Record<string, number>;
}

export interface SignOffPreview {
    items: SignOffItem[];
    counts: SignOffCounts;
    contentHash: string;
}

export interface SignOff {
    id: string;
    shiftType: 'DAY' | 'NIGHT';
    periodStart: string;
    periodEnd: string;
    signedAt: string;
    note: string | null;
    user: { id: string; name: string; role: string };
    counts: SignOffCounts | null;
    // true when the MAR entries for that period no longer match what was signed.
    changedSince: boolean;
}

export const marApi = {
    getMAR: (patientId: string) => apiClient.get<Medication[]>(`/medications/${patientId}/mar`),

    getOverdue: (patientId?: string) =>
        apiClient.get<OverdueDose[]>(`/medications/overdue${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ''}`),

    searchDrugs: (query: string) => apiClient.get<any[]>(`/medications/catalog?q=${encodeURIComponent(query)}`),

    prescribeMedication: (data: {
        patientId: string;
        name: string;
        dose: string;
        route: string;
        frequency?: string;
        infusionRate?: string;
        otherInstructions?: string;
        dilution?: number;
        durationReminder?: number;
        startedAt?: string;
    }) => apiClient.post<Medication>('/medications/prescribe', data),

    // The server records the signed-in user as the person who gave the dose.
    administerMedication: (data: {
        patientId: string;
        medicationId: string;
        status: AdministrationStatus;
        dose?: string;
        dilution?: number;
        administeredAt?: string;
    }) => apiClient.post<MedicationAdministration>('/medications/administer', data),

    editMedication: (id: string, data: {
        dose: string; route: string; frequency?: string; infusionRate?: string;
        otherInstructions?: string; dilution?: number; durationReminder?: number;
    }) => apiClient.put<Medication>(`/medications/${id}`, data),

    discontinueMedication: (id: string) => apiClient.put<Medication>(`/medications/${id}/status`, { isActive: false }),

    deleteAdministration: (id: string) => apiClient.delete<{ success: boolean }>(`/medications/administration/${id}`),

    // ── End-of-shift sign-off ──────────────────────────────────
    signOffPreview: (patientId: string, start: Date, end: Date) =>
        apiClient.get<SignOffPreview>(`/mar-signoff/${patientId}/preview?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`),

    signOffs: (patientId: string) => apiClient.get<SignOff[]>(`/mar-signoff/${patientId}`),

    signOff: (data: {
        patientId: string;
        shiftType: 'DAY' | 'NIGHT';
        periodStart: string;
        periodEnd: string;
        password: string;
        contentHash: string;
        note?: string;
    }) => apiClient.post<SignOff>('/mar-signoff', data),
};
