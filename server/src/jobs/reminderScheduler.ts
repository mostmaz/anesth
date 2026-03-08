import { PrismaClient } from '@prisma/client';
import { broadcastNotification } from '../routes/notifications.routes';

const prisma = new PrismaClient();

export const startReminderScheduler = () => {
    console.log("Starting Intervention Reminder Scheduler (Every 1 Minute)");

    // Run every minute
    setInterval(async () => {
        try {
            const now = new Date();
            // Find all pending/approved procedure orders that have a reminder in the past but haven't been sent yet
            const dueReminders = await prisma.clinicalOrder.findMany({
                where: {
                    type: 'PROCEDURE',
                    status: {
                        in: ['PENDING', 'APPROVED']
                    },
                    // @ts-ignore
                    reminderAt: {
                        lte: now, // Time has passed
                        not: null
                    },
                    // @ts-ignore
                    reminderSent: false
                },
                include: {
                    // @ts-ignore
                    patient: { select: { name: true, mrn: true } },
                    // @ts-ignore
                    author: { select: { name: true } }
                }
            });

            if (dueReminders.length > 0) {
                console.log(`[ReminderCron] Found ${dueReminders.length} due reminders.`);

                for (const order of dueReminders) {
                    // Send out SSE broadcast push notification
                    const payload = {
                        type: 'intervention_reminder',
                        orderId: order.id,
                        // @ts-ignore
                        patientId: order.patientId,
                        // @ts-ignore
                        patientName: order.patient.name,
                        title: order.title,
                        // @ts-ignore
                        message: `Reminder: Intervention "${order.title}" is due for ${order.patient.name}.`,
                        timestamp: new Date()
                    };

                    broadcastNotification('intervention_reminder', payload);

                    // Mark as sent
                    await prisma.clinicalOrder.update({
                        where: { id: order.id },
                        // @ts-ignore
                        data: { reminderSent: true }
                    });
                }
            }
        } catch (error) {
            console.error("[ReminderCron] Error checking for reminders:", error);
        }
    }, 60 * 1000); // 1 minute
};
