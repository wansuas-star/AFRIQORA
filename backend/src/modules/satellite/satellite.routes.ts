import { Router } from 'express';
import { SatelliteController } from './satellite.controller';

const router = Router();

router.get('/auth/status', SatelliteController.getAuthStatus);
router.get('/status', SatelliteController.getStatus);
router.get('/alerts', SatelliteController.getAlerts);
router.get('/geocode', SatelliteController.geocodeLocation);
router.post('/query', SatelliteController.queryIntelligence);
router.get('/objects', SatelliteController.getDetectedObjects);
router.get('/timeseries', SatelliteController.getTimeSeries);
router.get('/reports', SatelliteController.getReports);
router.get('/targets', SatelliteController.getTargets);
router.get('/tiles/preview', SatelliteController.previewTile);

export default router;
