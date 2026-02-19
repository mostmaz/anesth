
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get active assignments
router.get('/active', async (req, res) => {
    try {
        const assignments = await prisma.patientAssignment.findMany({
            where: { isActive: true },
            include: {
                user: { select: { id: true, name: true, role: true } },
                patient: { select: { id: true, name: true, mrn: true } }
            }
        });
        res.json(assignments);
    } catch (error) {
        console.error("Error fetching assignments:", error);
        res.status(500).json({ error: 'Failed to fetch assignments' });
    }
});

// Create assignment (Sign In)
router.post('/', async (req, res) => {
    try {
        const { patientId, userId } = req.body;

        // 1. Check if Nurse is already assigned to ANY patient
        const existingNurseAssignment = await prisma.patientAssignment.findFirst({
            where: {
                userId: userId,
                isActive: true
            }
        });

        if (existingNurseAssignment) {
            return res.status(400).json({
                success: false,
                message: 'You are already signed in on another patient. Please sign out first.'
            });
        }

        // 2. Check if Patient already has an assigned nurse
        const existingPatientAssignments = await prisma.patientAssignment.findMany({
            where: {
                patientId: patientId,
                isActive: true
            }
        });

        if (existingPatientAssignments.length > 0) {
            // Rule: "if two nurse on one patient this should be done only from the senior"

            // Check if request is coming from a Senior (Admin Panel Override)
            let isAuthorized = false;
            const { assignerId } = req.body;

            if (assignerId) {
                const assigner = await prisma.user.findUnique({ where: { id: assignerId } });
                if (assigner?.role === 'SENIOR') {
                    isAuthorized = true;
                }
            }

            // Fallback: Check if the user assigning THEMSELVES is a Senior (unlikely for 2nd nurse but possible)
            if (!isAuthorized) {
                const userSigningIn = await prisma.user.findUnique({ where: { id: userId } });
                if (userSigningIn?.role === 'SENIOR') {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return res.status(403).json({
                    success: false,
                    message: 'Patient already has a nurse. Only a designated Senior can assign a second nurse.'
                });
            }
        }

        const assignment = await prisma.patientAssignment.create({
            data: {
                patientId,
                userId,
                isActive: true
            }
        });

        res.json({ success: true, data: assignment });

    } catch (error) {
        console.error("Error creating assignment:", error);
        res.status(500).json({ success: false, message: 'Failed to assign nurse' });
    }
});

// End assignment (Sign Out)
router.post('/end', async (req, res) => {
    try {
        const { patientId, userId } = req.body;

        const result = await prisma.patientAssignment.updateMany({
            where: {
                patientId: patientId,
                userId: userId,
                isActive: true
            },
            data: {
                isActive: false,
                endedAt: new Date()
            }
        });

        if (result.count === 0) {
            return res.status(404).json({ success: false, message: 'No active assignment found to end.' });
        }

        res.json({ success: true, message: 'Signed out successfully' });

    } catch (error) {
        console.error("Error ending assignment:", error);
        res.status(500).json({ success: false, message: 'Failed to sign out' });
    }
});

export default router;
