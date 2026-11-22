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
import labRoutes from './lab.routes';
import assignmentRoutes from './assignment.routes';
import userRoutes from './user.routes';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import ventilatorRoutes from './ventilator.routes';
import skinRoutes from './skin.routes';
import reportRoutes from './report.routes';
import devicesRoutes from './devices.routes';
import linesRoutes from './lines.routes';
import scoresRoutes from './scores.routes';
import signoffRoutes from './signoff.routes';
import auditRoutes from './audit.routes';
import clientErrorRoutes from './clientError.routes';
import { requireAuth } from '../middleware/auth';
import { auditTrail } from '../middleware/audit';
import { idempotency } from '../middleware/idempotency';

const router = Router();

// Sign-in is public; every route below this line needs a valid session token.
router.use('/auth', authRoutes);
router.use(requireAuth);
// Every change is written to the audit trail, and a request the phone app
// re-sends after a dropped connection is answered without saving it twice.
router.use(auditTrail);
router.use(idempotency);

router.use('/users', userRoutes);

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
router.use('/lab', labRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/doctors', doctorRoutes);
router.use('/ventilator', ventilatorRoutes);
router.use('/skin', skinRoutes);
router.use('/reports', reportRoutes);
router.use('/devices', devicesRoutes);
router.use('/lines', linesRoutes);
router.use('/scores', scoresRoutes);
router.use('/mar-signoff', signoffRoutes);
router.use('/audit', auditRoutes);
router.use('/client-errors', clientErrorRoutes);

export default router;
