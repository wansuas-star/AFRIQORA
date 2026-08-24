import { Router } from 'express';
import { sendMessage, getMessages } from './messaging.controller';
import { requireAuth } from '../../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', sendMessage);
router.get('/:peerId', getMessages);

export default router;
