import { Router, Request, Response } from 'express';

const router = Router();

const decommissionedSocialHandler = (_req: Request, res: Response) => {
  res.status(410).json({
    error: 'AFRIQORA is an intelligence, information, and space-technology platform. Social-media functionality has been permanently decommissioned.',
    code: 'SOCIAL_MEDIA_DECOMMISSIONED'
  });
};

router.use(decommissionedSocialHandler);

export default router;
