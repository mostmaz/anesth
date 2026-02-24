
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
            date, shiftType, apacheScore,
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
                apacheScore, shiftType,
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

        // Sync Comorbidities to Patient
        const newComorbids = [];
        if (histHT) newComorbids.push("HTN", "Hypertension", "HT");
        if (histDM) newComorbids.push("DM", "Diabetes", "T2DM");
        if (histAsthma) newComorbids.push("Asthma");
        if (histCOPD) newComorbids.push("COPD");
        if (histIHD) newComorbids.push("IHD", "CAD");
        if (histStroke) newComorbids.push("Stroke", "CVA");

        let targetAdditions: string[] = [];
        if (histHT) targetAdditions.push("HTN");
        if (histDM) targetAdditions.push("DM");
        if (histAsthma) targetAdditions.push("Asthma");
        if (histCOPD) targetAdditions.push("COPD");
        if (histIHD) targetAdditions.push("IHD");
        if (histStroke) targetAdditions.push("Stroke");

        if (histOther && typeof histOther === 'string') {
            const others = histOther.split(',').map(s => s.trim()).filter(Boolean);
            targetAdditions = [...targetAdditions, ...others];
        }

        if (targetAdditions.length > 0) {
            const patient = await prisma.patient.findUnique({ where: { id: patientId } });
            if (patient) {
                const currentComorbidities = new Set((patient.comorbidities || []).map(c => c.toLowerCase()));
                const addedList = [...(patient.comorbidities || [])];

                for (const item of targetAdditions) {
                    // Basic duplication check
                    const lowerItem = item.toLowerCase();
                    const isDuplicate = Array.from(currentComorbidities).some(c =>
                        c === lowerItem ||
                        (lowerItem === 'htn' && (c === 'ht' || c === 'hypertension')) ||
                        (lowerItem === 'dm' && (c === 'diabetes' || c === 't2dm')) ||
                        (lowerItem === 'ihd' && c === 'cad') ||
                        (lowerItem === 'stroke' && c === 'cva')
                    );

                    if (!isDuplicate) {
                        currentComorbidities.add(lowerItem);
                        addedList.push(item);
                    }
                }

                await prisma.patient.update({
                    where: { id: patientId },
                    data: { comorbidities: addedList }
                });
            }
        }

        res.status(201).json(note);
    } catch (error) {
        console.error("Error creating specialist note:", error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

export default router;
