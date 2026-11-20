
import { Router } from 'express';
import { changePassword, login } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { loginRateLimit } from '../middleware/rateLimit';

const router = Router();

// The only endpoint that does not need a session.
router.post('/login', loginRateLimit, login);

router.post('/change-password', requireAuth, changePassword);

export default router;
