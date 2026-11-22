import prisma from '../prisma';
import { broadcastNotification } from '../routes/notifications.routes';
import { notifyPatient, nursesFor } from '../services/pushService';
import { overdueDose } from '../shared/dosing';

// Tells the bedside nurse when a scheduled dose has not been charted.
//
// One alert per missed dose: the due time already alerted is stored on the
// prescription. Charts that nobody is using (no entry and no new prescription
// in the last two days) are left alone, so stale records do not raise alarms.

const CHECK_EVERY_MS = 5 * 60_000;
const ACTIVE_CHART_MS = 48 * 60 * 60_000;
const TIME_ZONE = process.env.CLINIC_TIME_ZONE || 'Asia/Baghdad';

const clock = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' });

export interface OverdueDoseItem {
    patientId: string;
    patientName: string;
    medicationId: string;
    name: string;
    dose: string;
    route: string;
    dueAt: Date;
    overdueMinutes: number;
    firstDose: boolean;
    // The due time the nurse was already alerted about, if any.
    alertedFor: Date | null;
}

// Scheduled doses that are overdue right now, for patients currently admitted
// whose chart is in active use.
export async function listOverdueDoses(now: Date = new Date(), patientId?: string): Promise<OverdueDoseItem[]> {
    const since = new Date(now.getTime() - 3 * 24 * 60 * 60_000);
    const meds = await prisma.medication.findMany({
        where: {
            isActive: true,
            patientId: patientId ? patientId : { not: null },
            patient: { admissions: { some: { dischargedAt: null } } },
        },
        include: {
            patient: { select: { id: true, name: true } },
            administrations: { where: { timestamp: { gte: since } }, orderBy: { timestamp: 'desc' }, take: 60 },
        },
    });

    const items: OverdueDoseItem[] = [];
    for (const med of meds) {
        if (!med.patient) continue;
        const due = overdueDose({
            route: med.route,
            frequency: med.frequency,
            isActive: med.isActive,
            startedAt: med.startedAt,
            administrations: med.administrations,
        }, now);
        if (!due) continue;

        // Only charts in active use count.
        const lastActivity = Math.max(
            med.startedAt.getTime(),
            med.administrations[0]?.timestamp.getTime() ?? 0,
        );
        if (now.getTime() - lastActivity > ACTIVE_CHART_MS) continue;

        items.push({
            patientId: med.patient.id,
            patientName: med.patient.name,
            medicationId: med.id,
            name: med.name,
            dose: med.defaultDose,
            route: med.route,
            dueAt: due.dueAt,
            overdueMinutes: due.overdueMinutes,
            firstDose: due.firstDose,
            alertedFor: med.overdueAlertFor,
        });
    }
    return items.sort((a, b) => b.overdueMinutes - a.overdueMinutes);
}

export async function checkOverdueDoses(now: Date = new Date()): Promise<number> {
    let alerts = 0;
    for (const item of await listOverdueDoses(now)) {
        if (item.alertedFor && item.alertedFor.getTime() === item.dueAt.getTime()) continue;

        await prisma.medication.update({ where: { id: item.medicationId }, data: { overdueAlertFor: item.dueAt } });
        const title = item.firstDose ? 'First dose not yet given' : 'Dose overdue';
        const body = `${item.name} ${item.dose} for ${item.patientName} — due ${clock(item.dueAt)}`;
        const nurses = await nursesFor(item.patientId);
        broadcastNotification('dose_overdue', {
            _to: nurses,
            patientId: item.patientId,
            patientName: item.patientName,
            medicationId: item.medicationId,
            title: `${item.name} ${item.dose}`,
            dueAt: item.dueAt,
            message: body,
        });
        notifyPatient(item.patientId, 'nurse', title, body, { type: 'dose_overdue', medicationId: item.medicationId });
        alerts++;
    }
    return alerts;
}

export function startOverdueDoseScheduler() {
    console.log('Starting Overdue Dose Scheduler (Every 5 Minutes)');
    setInterval(() => {
        checkOverdueDoses()
            .then(n => { if (n) console.log(`[OverdueDoses] ${n} alert(s) sent`); })
            .catch(e => console.error('[OverdueDoses] check failed:', e?.message || e));
    }, CHECK_EVERY_MS);
}
