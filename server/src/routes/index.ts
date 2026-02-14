import { Router } from 'express';
import patientRoutes from './patient.routes';
import governorateRoutes from './governorate.routes';
import shiftRoutes from './shift.routes';
import vitalsRoutes from './vitals.routes';
import medicationRoutes from './medication.routes';
import ioRoutes from './io.routes';
import checkinRoutes from './checkin.routes';
import orderRoutes from './order.routes';
import investigationRoutes from './investigation.routes';
import noteRoutes from './note.routes';

import specialistRoutes from './specialist.routes';
import uploadRoutes from './upload.routes';
import ocrRoutes from './ocr.routes';
import seedRoutes from './seed.routes';

const router = Router();

router.use('/patients', patientRoutes);
router.use('/shifts', shiftRoutes);
router.use('/governorates', governorateRoutes);
router.use('/vitals', vitalsRoutes);
router.use('/medications', medicationRoutes);
router.use('/io', ioRoutes);
router.use('/checkin', checkinRoutes);
router.use('/orders', orderRoutes);
router.use('/investigations', investigationRoutes);
router.use('/notes', noteRoutes);
router.use('/specialist', specialistRoutes);
router.use('/upload', uploadRoutes);
router.use('/ocr', ocrRoutes);
router.use('/seed', seedRoutes);

export default router;
