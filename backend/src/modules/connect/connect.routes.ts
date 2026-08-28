import { Router } from 'express';
import { requireAuth } from '../../shared/auth.middleware';
import {
  getPermissions,
  getConnectedServices,
  connectService,
  disconnectService,
} from './connect.controller';

const router = Router();

router.get('/permissions', getPermissions);
router.get('/services', getConnectedServices);
router.post('/', requireAuth, connectService);
router.delete('/:service', requireAuth, disconnectService);

export default router;
