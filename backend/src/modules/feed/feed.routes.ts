import { Router } from 'express';
import { createPost, getHomeFeed } from './feed.controller';
import { requireAuth } from '../../shared/auth.middleware';

const router = Router();

router.use(requireAuth);

router.post('/', createPost);
router.get('/home', getHomeFeed);

export default router;
