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

export async function checkOverdueDoses(now: Date = new Date()): Promise<number> {
    const since = new Date(now.getTime() - 3 * 24 * 60 * 60_000);
    const meds = await prisma.medication.findMany({
        where: {
            isActive: true,
            patientId: { not: null },
            patient: { admissions: { some: { dischargedAt: null } } },
        },
        include: {
            patient: { select: { id: true, name: true } },
            administrations: { where: { timestamp: { gte: since } }, orderBy: { timestamp: 'desc' }, take: 60 },
        },
    });

    let alerts = 0;
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
        if (med.overdueAlertFor && med.overdueAlertFor.getTime() === due.dueAt.getTime()) continue;

        // Only charts in active use raise alerts.
        const lastActivity = Math.max(
            med.startedAt.getTime(),
            med.administrations[0]?.timestamp.getTime() ?? 0,
        );
        if (now.getTime() - lastActivity > ACTIVE_CHART_MS) continue;

        await prisma.medication.update({ where: { id: med.id }, data: { overdueAlertFor: due.dueAt } });
        const title = due.firstDose ? 'First dose not yet given' : 'Dose overdue';
        const body = `${med.name} ${med.defaultDose} for ${med.patient.name} — due ${clock(due.dueAt)}`;
        const nurses = await nursesFor(med.patient.id);
        broadcastNotification('dose_overdue', {
            _to: nurses,
            patientId: med.patient.id,
            patientName: med.patient.name,
            medicationId: med.id,
            title: `${med.name} ${med.defaultDose}`,
            dueAt: due.dueAt,
            message: body,
        });
        notifyPatient(med.patient.id, 'nurse', title, body, { type: 'dose_overdue', medicationId: med.id });
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
