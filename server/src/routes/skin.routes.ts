
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// Get Skin Assessments for a Patient
router.get('/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;

        const assessments = await prisma.skinAssessment.findMany({
            where: { patientId },
            orderBy: { timestamp: 'desc' },
            include: {
                author: { select: { name: true, role: true } }
            }
        });
        res.json(assessments);
    } catch (error) {
        console.error('Error fetching skin assessments:', error);
        res.status(500).json({ error: 'Failed to fetch skin assessments' });
    }
});

// Create Skin Assessment
router.post('/', async (req, res) => {
    try {
        const { patientId, authorId, bodyPart, view, type, imageUrl, notes } = req.body;

        const assessment = await prisma.skinAssessment.create({
            data: {
                patientId,
                authorId,
                bodyPart,
                view,
                type,
                imageUrl,
                notes
            },
            include: {
                author: { select: { name: true, role: true } }
            }
        });
        res.status(201).json(assessment);
    } catch (error) {
        console.error('Error creating skin assessment:', error);
        res.status(500).json({ error: 'Failed to create skin assessment' });
    }
});

export default router;
