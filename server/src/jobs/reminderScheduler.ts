import { PrismaClient } from '@prisma/client';
import { broadcastNotification } from '../routes/notifications.routes';

const prisma = new PrismaClient();

// Map repetition codes → next-interval in ms.
// Returns null for one-off orders (no next reminder).
export function repetitionToMs(rep?: string | null): number | null {
    if (!rep) return null;
    switch (rep.toUpperCase()) {
        case 'Q1H':   return 1 * 60 * 60_000;
        case 'Q2H':   return 2 * 60 * 60_000;
        case 'Q4H':   return 4 * 60 * 60_000;
        case 'Q6H':   return 6 * 60 * 60_000;
        case 'Q8H':   return 8 * 60 * 60_000;
        case 'Q12H':  return 12 * 60 * 60_000;
        case 'DAILY': return 24 * 60 * 60_000;
        case 'ONCE':
        default:      return null;
    }
}

export const startReminderScheduler = () => {
    console.log("Starting Intervention Reminder Scheduler (Every 1 Minute)");

    setInterval(async () => {
        try {
            const now = new Date();

            // Fire reminders for both PROCEDURE (one-off interventions) and
            // NURSING (recurring nursing tasks: turn q2h, dressing daily, etc.)
            const dueReminders = await prisma.clinicalOrder.findMany({
                where: {
                    type: { in: ['PROCEDURE', 'NURSING'] as any },
                    status: { in: ['PENDING', 'APPROVED'] },
                    // @ts-ignore
                    reminderAt: { lte: now, not: null },
                    // @ts-ignore
                    reminderSent: false,
                },
                include: {
                    // @ts-ignore
                    patient: { select: { name: true, mrn: true } },
                    // @ts-ignore
                    author: { select: { name: true } },
                },
            });

            if (dueReminders.length === 0) return;
            console.log(`[ReminderCron] Found ${dueReminders.length} due reminders.`);

            for (const order of dueReminders) {
                // Broadcast
                broadcastNotification('intervention_reminder', {
                    type: 'intervention_reminder',
                    orderId: order.id,
                    // @ts-ignore
                    patientId: order.patientId,
                    // @ts-ignore
                    patientName: order.patient?.name,
                    title: order.title,
                    // @ts-ignore
                    message: `Reminder: "${order.title}" is due for ${order.patient?.name}.`,
                    timestamp: new Date(),
                });

                // Recurrence: if this order has a repetition, schedule the next reminder
                // (advance reminderAt by the interval, keep reminderSent=false so it fires again).
                // If no repetition (one-off), mark reminderSent=true.
                // @ts-ignore
                const repetition = (order.details as any)?.repetition as string | undefined;
                const intervalMs = repetitionToMs(repetition);

                if (intervalMs && order.status !== 'COMPLETED') {
                    // Compute the next reminderAt — advance from the original time so we
                    // don't drift if the scheduler is late firing.
                    // @ts-ignore
                    const prevAt = order.reminderAt ? new Date(order.reminderAt).getTime() : now.getTime();
                    let nextAt = prevAt + intervalMs;
                    // If we're catching up after a long downtime, fast-forward past 'now'
                    while (nextAt <= now.getTime()) nextAt += intervalMs;

                    await prisma.clinicalOrder.update({
                        where: { id: order.id },
                        data: {
                            // @ts-ignore
                            reminderAt: new Date(nextAt),
                            // @ts-ignore
                            reminderSent: false,
                        },
                    });
                } else {
                    await prisma.clinicalOrder.update({
                        where: { id: order.id },
                        // @ts-ignore
                        data: { reminderSent: true },
                    });
                }
            }
        } catch (error) {
            console.error("[ReminderCron] Error checking for reminders:", error);
        }
    }, 60 * 1000);
};
