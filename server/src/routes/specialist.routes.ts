
import { Router } from 'express';
import prisma from '../prisma';

const router = Router();

// GET all notes for a patient
router.get('/patient/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const notes = await prisma.specialistNote.findMany({
            where: { patientId },
            orderBy: { createdAt: 'desc' },
            include: { author: { select: { name: true, role: true } } }
        });
        res.json(notes);
    } catch (error) {
        console.error("Error fetching specialist notes:", error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// POST create a new note
router.post('/', async (req, res) => {
    try {
        const {
            patientId, authorId,
            date, apacheScore,
            histHT, histDM, histAsthma, histCOPD, histIHD, histStroke, histOther,
            neuroGCS, neuroRASS,
            respChest, respRoomAir, respO2Therapy, respVentMode, respVentModeText, respFio2, respPS,
            intCVLine, intArtLine, intETT, intTrach, intDoubleLumen,
            hydNormovolemia, hydHypervolemia, hydHypovolemia, hydUOP, hydIVC, hydCVP,
            hemoStable, hemoUnstable, hemoVasopressor,
            feedOral, feedNG, feedTPN, feedRate, ivFluidsRate,
            sedPropofol, sedKetamine, sedMidazolam, sedRemif, sedMR, sedOther,
            clinicalNotes,
            planVentilatory, planPhysio, planConsult, planInvestigation, planOther, planFuture, planHomeTeam
        } = req.body;

        const note = await prisma.specialistNote.create({
            data: {
                patientId, authorId,
                apacheScore,
                histHT, histDM, histAsthma, histCOPD, histIHD, histStroke, histOther,
                neuroGCS, neuroRASS,
                respChest, respRoomAir, respO2Therapy, respVentMode, respVentModeText, respFio2, respPS,
                intCVLine, intArtLine, intETT, intTrach, intDoubleLumen,
                hydNormovolemia, hydHypervolemia, hydHypovolemia, hydUOP, hydIVC, hydCVP,
                hemoStable, hemoUnstable, hemoVasopressor,
                feedOral, feedNG, feedTPN, feedRate, ivFluidsRate,
                sedPropofol, sedKetamine, sedMidazolam, sedRemif, sedMR, sedOther,
                clinicalNotes,
                planVentilatory, planPhysio, planConsult, planInvestigation, planOther, planFuture, planHomeTeam,
                date: date ? new Date(date) : undefined
            }
        });
        res.status(201).json(note);
    } catch (error) {
        console.error("Error creating specialist note:", error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

export default router;
