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
router.get('/change/presets', SatelliteController.getChangePresets);
router.post('/change/analyze', SatelliteController.analyzeChange);
router.get('/change/analyze', SatelliteController.analyzeChange);

// Continental African Maritime & Port Registry
router.get('/maritime/regions', SatelliteController.getMaritimeRegions);
router.get('/maritime/ports', SatelliteController.getMaritimePorts);
router.get('/maritime/ports/:id', SatelliteController.getMaritimePortById);
router.post('/maritime/ports/custom', SatelliteController.registerCustomPortAOI);

// ML-01 Maritime Vessel Annotation Validation & Ground-Truth Verification
router.get('/vessels', SatelliteController.getVesselDetections);
router.post('/vessels/validate', SatelliteController.validateVesselAnnotation);
router.post('/ground-truth/review', SatelliteController.submitGroundTruthReview);

export default router;
