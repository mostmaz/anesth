import { apiFetch } from './client';

// ── Real backend shapes (server-side, verified against prod) ────

export interface RealUser {
  id: string;
  username: string;
  name: string;
  role: 'SENIOR' | 'RESIDENT' | 'NURSE';
}

export interface RealAdmission {
  id: string;
  patientId: string;
  bed: string | null;
  diagnosis: string | null;
  admittedAt: string;
  dischargedAt: string | null;
}

export interface RealPatient {
  id: string;
  mrn: string;
  name: string;
  dob: string;
  gender: string;
  diagnosis: string | null;
  comorbidities: string[];
  admissions?: RealAdmission[];
  createdAt: string;
  updatedAt: string;
}

// /vitals/:patientId returns: heartRate, bpSys, bpDia, spo2, temp, rr, rbs, timestamp, imageUrl
export interface RealVital {
  id: string;
  patientId: string;
  heartRate: number | null;
  bpSys: number | null;
  bpDia: number | null;
  spo2: number | null;
  temp: number | null;
  rr: number | null;
  rbs: number | null;
  imageUrl?: string | null;
  timestamp: string;
}

// /medications/:patientId/mar returns a flat list of medications, each with embedded administrations[]
export interface RealAdministration {
  id: string;
  patientId: string;
  medicationId: string;
  status: 'Given' | 'Missed' | 'Withheld';
  dose?: string;
  dilution?: string | number | null;
  timestamp: string;
  userId?: string;
  user?: { name: string };
}

export interface RealMedication {
  id: string;
  patientId: string;
  name: string;
  defaultDose: string;
  route: string;
  frequency: string;
  isActive: boolean;
  isFluid?: boolean;
  startedAt: string;
  discontinuedAt?: string | null;
  durationReminder?: number | null;
  infusionRate?: string | null;
  dilution?: string | null;
  otherInstructions?: string | null;
  updatedAt: string;
  administrations: RealAdministration[];
}

export interface RealOrder {
  id: string;
  patientId: string;
  type: string;
  title: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'DISCONTINUED';
  priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  authorId?: string;
  approverId?: string;
  author?: { name: string; role: string };
  approver?: { name: string };
  reminderAt?: string | null;
  details?: any;
  createdAt: string;
  updatedAt: string;
}

export interface RealIOEntry {
  id: string;
  patientId: string;
  userId?: string;
  shiftId?: string | null;
  type: 'INPUT' | 'OUTPUT';
  category: string;
  amount: number;
  notes?: string;
  timestamp: string;
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
  pendingValue?: number | null;
  user?: { name: string };
}

export interface RealInvestigation {
  id: string;
  patientId: string;
  orderId?: string | null;
  authorId?: string;
  type: string;        // 'LAB' | 'IMAGING' etc
  category?: string;
  title: string;
  status?: string;
  result: any;         // flat key/value OR structured { value, range, isAbnormal }
  impression?: string | null;
  imageUrl?: string;
  externalId?: string;
  pdfFilename?: string | null;
  conductedAt: string;
  createdAt: string;
}

export interface RealNote {
  id: string;
  patientId: string;
  authorId: string;
  type: string;
  title: string;
  content: string;
  data?: any;
  author?: { name: string; role: string };
  createdAt: string;
  updatedAt: string;
}

export interface RealSkinAssessment {
  id: string;
  patientId: string;
  bodyPart: string;
  view: 'FRONT' | 'BACK';
  type: 'LESION' | 'DRESSING';
  notes?: string;
  imageUrl?: string;
  recordedAt: string;
  author?: { name: string; role: string };
}

export interface RealShift {
  id: string;
  userId: string;
  type: 'DAY' | 'NIGHT';
  startTime: string;
  endTime?: string | null;
  isActive: boolean;
}

export interface RealAssignment {
  id: string;
  patientId: string;
  userId: string;
  isActive: boolean;
  isPending: boolean;
  user?: { id: string; name: string; role: string };
  patient?: { id: string; name: string; mrn: string };
}

// Global investigations feed item (GET /investigations) — includes patient + author
export interface RealInvestigationFeed extends RealInvestigation {
  patient?: { id: string; name: string };
  author?: { name: string; role: string };
}

// ── Endpoint functions ─────────────────────────────────────

export const login = (username: string, password: string) =>
  apiFetch<{ token: string; user: RealUser }>('/auth/login', {
    method: 'POST',
    auth: false,
    body: { username, password },
  });

export const listPatients = () => apiFetch<RealPatient[]>('/patients');
export const getPatient = (id: string) => apiFetch<RealPatient>(`/patients/${id}`);

export const createPatient = (input: {
  name: string;
  mrn: string;
  dob: string;
  gender: string;
  diagnosis?: string;
  comorbidities?: string[];
  authorId?: string;
}) => apiFetch<RealPatient>('/patients', { method: 'POST', body: input });

export const dischargePatient = (id: string) =>
  apiFetch(`/patients/${id}/discharge`, { method: 'PATCH', body: {} });

// Upload a single image as multipart/form-data → returns server-relative URL+filename
import { getToken } from './client';
import { getBaseUrl } from './config';

export const uploadImage = async (file: { uri: string; name: string; type: string }): Promise<{ url: string; filename: string }> => {
  const form = new FormData();
  // RN FormData accepts {uri, name, type} for native file refs
  form.append('files', file as any);
  const res = await fetch(`${getBaseUrl()}/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken() || ''}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json();
  // /upload returns an array of {url, filename}; take the first
  const first = Array.isArray(data) ? data[0] : data?.files?.[0] ?? data;
  return { url: first.url || first.filename, filename: first.filename || first.url };
};

// OCR analyze a previously-uploaded file. mode='VITALS' returns extracted HR/BP/SpO2/Temp
export const ocrAnalyze = (filePath: string, mode: 'VITALS' | 'LAB' = 'VITALS') =>
  apiFetch(`/ocr/analyze`, { method: 'POST', body: { filePath, mode } });

export const getUserPreferences = (userId: string) =>
  apiFetch<{ dismissedLabs: string[] }>(`/users/${userId}/preferences`);

export const dismissLab = (userId: string, labId: string) =>
  apiFetch<{ success: boolean }>(`/users/${userId}/dismiss-lab`, {
    method: 'POST',
    body: { labId },
  });

export const getVitals = (patientId: string) =>
  apiFetch<RealVital[]>(`/vitals/${patientId}`);

// Server accepts: heartRate, bpSys, bpDia, spo2, temp (+ rr, rbs if present)
export const addVital = (input: {
  patientId: string;
  heartRate?: number;
  bpSys?: number;
  bpDia?: number;
  spo2?: number;
  temp?: number;
  rr?: number;
  rbs?: number;
  imageUrl?: string;
}) => apiFetch<RealVital>('/vitals', { method: 'POST', body: input });

// /medications/:patientId/mar returns RealMedication[] with nested administrations
export const getMar = (patientId: string) =>
  apiFetch<RealMedication[]>(`/medications/${patientId}/mar`);

export const searchDrugs = (q: string) =>
  apiFetch<Array<{ name: string; defaultDose?: string; defaultRoute?: string }>>(`/medications/catalog?q=${encodeURIComponent(q)}`);

export const prescribeMedication = (input: {
  patientId: string;
  name: string;
  dose?: string;
  route: string;
  frequency: string;
  infusionRate?: string;
  dilution?: number;
  durationReminder?: number;
  otherInstructions?: string;
  startedAt?: string;
}) => apiFetch<RealMedication>('/medications/prescribe', { method: 'POST', body: input });

export const administerMedication = (input: {
  medicationId: string;
  patientId: string;
  status: 'Given' | 'Missed' | 'Withheld' | 'Held';
  userId: string;
  dose?: string;
  dilution?: string;
  administeredAt?: string; // ISO — actual give time when charted late (server clamps to last 24h)
}) => apiFetch('/medications/administer', { method: 'POST', body: input });

export const discontinueMedication = (id: string) =>
  apiFetch(`/medications/${id}/status`, { method: 'PUT', body: { isActive: false } });

export const updateMedication = (id: string, input: {
  dose?: string;
  route?: string;
  frequency?: string;
  infusionRate?: string;
  otherInstructions?: string;
  dilution?: string | number;
}) => apiFetch<RealMedication>(`/medications/${id}`, { method: 'PUT', body: input });

export const getOrders = (patientId: string) =>
  apiFetch<RealOrder[]>(`/orders/${patientId}`);

export const createOrder = (input: {
  patientId: string;
  authorId: string;
  type: string;
  title: string;
  details?: any;
  notes?: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  reminderAt?: string;
}) => apiFetch<RealOrder>('/orders', { method: 'POST', body: input });

export const updateOrderStatus = (id: string, status: RealOrder['status'], userId: string) =>
  apiFetch(`/orders/${id}/status`, { method: 'PATCH', body: { status, userId } });

export const getIO = (patientId: string) =>
  apiFetch<RealIOEntry[]>(`/io/${patientId}`);

export const addIO = (input: {
  patientId: string;
  userId: string;
  shiftId?: string | null;
  type: 'INPUT' | 'OUTPUT';
  category: string;
  amount: number;
  notes?: string;
}) => apiFetch<RealIOEntry>('/io', { method: 'POST', body: input });

export const getInvestigations = (patientId: string) =>
  apiFetch<RealInvestigation[]>(`/investigations/${patientId}`);

export const getNotes = (patientId: string, type?: string) =>
  apiFetch<RealNote[]>(`/notes/${patientId}${type ? `?type=${type}` : ''}`);

// Global recent-events feed (across all patients) for the dashboard warnings.
export interface RealEventFeed extends RealNote {
  patient?: { id: string; name: string };
}
export const getEventsFeed = () =>
  apiFetch<RealEventFeed[]>('/notes/feed/events');

export const createNote = (input: {
  patientId: string;
  authorId: string;
  type: string;
  title: string;
  content: string;
  data?: any;
}) => apiFetch<RealNote>('/notes', { method: 'POST', body: input });

export const getSkinAssessments = (patientId: string) =>
  apiFetch<RealSkinAssessment[]>(`/skin/${patientId}`);

// ── Assignments (nurse ↔ patient) ───────────────────────
export const listActiveAssignments = () =>
  apiFetch<RealAssignment[]>('/assignments/active');

// Sign a nurse in to a patient (checks out the patient to that nurse).
// Server returns 202 when it becomes a pending request needing approval.
export const assignPatient = (patientId: string, userId: string) =>
  apiFetch<{ success: boolean; pending: boolean; data: RealAssignment; message?: string; displaced?: string[] }>(
    '/assignments',
    { method: 'POST', body: { patientId, userId } },
  );

export const unassignPatient = (patientId: string, userId: string) =>
  apiFetch<{ success: boolean; message?: string }>(
    '/assignments/end',
    { method: 'POST', body: { patientId, userId } },
  );

// ── Investigations create + global feed ─────────────────
export const createInvestigation = (input: {
  patientId: string;
  authorId: string;
  type: 'LAB' | 'IMAGING' | string;
  category?: string;
  title: string;
  status?: string;
  result?: any;
  impression?: string;
  conductedAt?: string;
}) => apiFetch<RealInvestigation>('/investigations', { method: 'POST', body: input });

// Latest investigations across all patients (used for dashboard warnings)
export const getInvestigationsFeed = () =>
  apiFetch<RealInvestigationFeed[]>('/investigations');

// Host a self-contained HTML report on the server; returns a public http URL.
// Opening an http(s) URL in the device browser reliably supports Print / Save-as-PDF,
// unlike large data: URIs which Android blocks.
export const hostReport = (html: string, name?: string) =>
  apiFetch<{ url: string; filename: string }>('/reports', { method: 'POST', body: { html, name } });

// ── Ventilator ──────────────────────────────────────────
export interface RealVentilator {
  id: string;
  patientId: string;
  userId?: string;
  mode: string;
  rate: number;
  fio2: number;
  ie: string;
  ps: number;
  vt: number;
  timestamp: string;
}

export const getVentilator = (patientId: string) =>
  apiFetch<RealVentilator[]>(`/ventilator/${patientId}`);

export const addVentilator = (input: {
  patientId: string; userId: string;
  mode: string; rate: number; fio2: number; ie: string; ps: number; vt: number;
  timestamp?: string;
}) => apiFetch<RealVentilator>('/ventilator', { method: 'POST', body: input });

// ── Consultations ───────────────────────────────────────
export interface RealConsultation {
  id: string;
  patientId: string;
  authorId: string;
  doctorName: string;
  specialty: string;
  imageUrl?: string | null;
  notes?: string | null;
  timestamp: string;
}

export const getConsultations = (patientId: string) =>
  apiFetch<RealConsultation[]>(`/patients/${patientId}/consultations`);

export const addConsultation = (patientId: string, input: {
  doctorName: string; specialty: string; notes?: string; imageUrl?: string; authorId: string;
}) => apiFetch<RealConsultation>(`/patients/${patientId}/consultations`, { method: 'POST', body: input });

// ── Skin assessment (create) ────────────────────────────
export const addSkinAssessment = (input: {
  patientId: string; authorId: string; bodyPart: string;
  view: 'FRONT' | 'BACK'; type: 'LESION' | 'DRESSING'; imageUrl?: string; notes?: string;
}) => apiFetch<RealSkinAssessment>('/skin', { method: 'POST', body: input });

// ── Handover / specialist note ──────────────────────────
export interface RealHandoverNote {
  id: string;
  patientId: string;
  authorId: string;
  createdAt: string;
  date?: string;
  author?: { name: string; role: string };
  [key: string]: any;
}

export const getHandoverNotes = (patientId: string) =>
  apiFetch<RealHandoverNote[]>(`/specialist/patient/${patientId}`);

export const createHandoverNote = (input: Record<string, any>) =>
  apiFetch<RealHandoverNote>('/specialist', { method: 'POST', body: input });

// ── Push notifications: register this device's FCM token ────
export const registerDevice = (userId: string, token: string, platform = 'android') =>
  apiFetch<{ success: boolean }>('/devices/register', { method: 'POST', body: { userId, token, platform } });

// Unregister on sign-out so a signed-out device stops receiving pushes.
export const unregisterDevice = (token: string) =>
  apiFetch<{ success: boolean }>('/devices/unregister', { method: 'POST', body: { token } });

export const getActiveShift = (userId: string) =>
  apiFetch<RealShift | null>(`/shifts/active/${userId}`);

export const startShift = (userId: string, type: 'DAY' | 'NIGHT') =>
  apiFetch<RealShift>('/shifts/start', { method: 'POST', body: { userId, type } });

export const endShift = (id: string) =>
  apiFetch<RealShift>(`/shifts/${id}/end`, { method: 'PATCH' });
