const assert = require('assert');
const path = require('path');

console.log('======================================================================');
console.log('AFRIQORA ML-01: VESSEL ANNOTATION, GROUND-TRUTH & PROVENANCE SUITE');
console.log('======================================================================\n');

const backendDist = path.resolve(__dirname, '../backend/dist');
const { VesselValidationEngine } = require(path.join(backendDist, 'modules/satellite/ml/vesselValidation'));
const { ObjectDetectionEngine } = require(path.join(backendDist, 'modules/satellite/ml/objectDetection'));
const { SatelliteController } = require(path.join(backendDist, 'modules/satellite/satellite.controller'));

let passed = 0;
let total = 0;

function check(title, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [${total}] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [${total}] FAIL: ${title}`);
    console.error(`     ${err.message}`);
  }
}

async function asyncCheck(title, fn) {
  total++;
  try {
    await fn();
    console.log(`  ✔ [${total}] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [${total}] FAIL: ${title}`);
    console.error(`     ${err.message}`);
  }
}

async function runSuite() {
  const maritimeBbox = [32.00, -28.82, 32.12, -28.74]; // Port of Richards Bay maritime anchorage

  // Baseline 8x8 SAR grid representing port water basin with a metallic vessel target
  const makeSARGrid = (waterVal = -21.0, vesselPeak = -3.5) => ({
    width: 8,
    height: 8,
    bbox: maritimeBbox,
    resolutionMeters: 10.0,
    data: [
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
      [waterVal, waterVal, vesselPeak, vesselPeak - 0.5, vesselPeak - 0.2, waterVal, waterVal, waterVal], // High-backscatter vessel hull
      [waterVal, waterVal, vesselPeak - 0.8, vesselPeak - 0.4, vesselPeak - 0.6, waterVal, waterVal, waterVal],
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
      [waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal, waterVal],
    ]
  });

  const sarPayload = {
    sceneId: 'S1A_IW_GRDH_1SDV_20261010T163210_MARITIME',
    acquisitionDate: new Date('2026-10-10T16:32:10Z'),
    polarization: 'VV+VH',
    resolutionMeters: 10.0,
    vvGridDb: makeSARGrid(-21.0, -3.5),
    vhGridDb: makeSARGrid(-27.0, -9.5),
    isRealData: true,
  };

  // -------------------------------------------------------------------------
  // SECTION 1: MARITIME VESSEL CFAR DETECTION & PHYSICAL METRICS
  // -------------------------------------------------------------------------
  console.log('--- SECTION 1: MARITIME VESSEL CFAR DETECTION & PHYSICAL METRICS ---');

  check('CFAR Detection: Distinguishes sea clutter floor from metallic vessel hulls', () => {
    const res = VesselValidationEngine.detectVesselsFromSAR({
      sarScene: sarPayload,
      bbox: maritimeBbox,
    });

    assert(res.vessels.length >= 1, `Expected at least 1 vessel, detected ${res.vessels.length}`);
    const v = res.vessels[0];
    assert(v.metrics.radarBackscatterDb >= -4.0, `Expected backscatter >= -4 dB, got ${v.metrics.radarBackscatterDb}`);
    assert(v.metrics.meanClutterFloorDb <= -18.0, `Expected sea clutter <= -18 dB, got ${v.metrics.meanClutterFloorDb}`);
    assert(v.metrics.targetToClutterRatioDb >= 14.0, `Expected TCR >= 14 dB, got ${v.metrics.targetToClutterRatioDb}`);
    assert(v.metrics.aspectRatio >= 2.0, `Expected valid aspect ratio, got ${v.metrics.aspectRatio}`);
    assert(v.metrics.waterMaskConfirmed === true, 'Water mask confirmed');
  });

  check('Physical Geometry Estimation: Length, beam, and vessel displacement classification', () => {
    const res = VesselValidationEngine.detectVesselsFromSAR({
      sarScene: sarPayload,
      bbox: maritimeBbox,
    });
    const v = res.vessels[0];
    assert(v.metrics.estimatedLengthMeters >= 40, `Estimated length: ${v.metrics.estimatedLengthMeters}m`);
    assert(v.metrics.estimatedBeamMeters >= 10, `Estimated beam: ${v.metrics.estimatedBeamMeters}m`);
    assert(typeof v.metrics.estimatedRcsDbsm === 'number', 'Estimated RCS in dBsm present');
    assert(v.confidence >= 0.85, `Confidence score: ${v.confidence}`);
  });

  // -------------------------------------------------------------------------
  // SECTION 2: VESSEL ANNOTATION BOUNDING-BOX VALIDATION RULES
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 2: VESSEL ANNOTATION BOUNDING-BOX VALIDATION ---');

  check('Annotation Rule 1: High-confidence vessel candidate passes validation', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_VALID_01',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV+VH',
      bbox: maritimeBbox,
      radarBackscatterDb: -3.5,
      estimatedLengthMeters: 220,
      estimatedBeamMeters: 45,
      aspectRatio: 4.9,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === true, 'High-confidence candidate is valid');
    assert(val.validationGrade === 'VALIDATED_HIGH_CONFIDENCE', `Expected VALIDATED_HIGH_CONFIDENCE, got ${val.validationGrade}`);
    assert(val.vesselClassEstimate === 'CONTAINER_CARGO_VESSEL', `Expected CONTAINER_CARGO_VESSEL, got ${val.vesselClassEstimate}`);
    assert(val.qualityScore >= 0.9, `Quality score: ${val.qualityScore}`);
    assert(val.provenance.calibrationStandard.includes('ESA_SAR_RADIOMETRIC_CAL_V2'), 'Preserves calibration provenance');
  });

  check('Annotation Rule 2: Rejection of weak sea clutter false alarm', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_CLUTTER_02',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: maritimeBbox,
      radarBackscatterDb: -14.2, // Below metallic vessel threshold
      estimatedLengthMeters: 80,
      estimatedBeamMeters: 20,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === false, 'Clutter anomaly rejected as invalid');
    assert(val.validationGrade === 'REJECTED_FALSE_ALARM', `Expected REJECTED_FALSE_ALARM, got ${val.validationGrade}`);
    assert(val.validationNotice.includes('Backscatter too weak'), 'Explains rejection rationale');
  });

  check('Annotation Rule 3: Rejection of sub-GSD unresolvable targets (<15m)', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_SUBPIXEL_03',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: maritimeBbox,
      radarBackscatterDb: -5.0,
      estimatedLengthMeters: 8, // Below 15m GSD limit
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === false, 'Sub-GSD object rejected as unresolvable');
    assert(val.validationGrade === 'UNRESOLVABLE_AT_CURRENT_GSD', `Expected UNRESOLVABLE_AT_CURRENT_GSD, got ${val.validationGrade}`);
  });

  check('Annotation Rule 4: Rejection of inland land interference false alarm', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_LAND_04',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: [26.15, -10.65, 26.25, -10.55], // Inland mine area
      radarBackscatterDb: -4.0,
      estimatedLengthMeters: 100,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: false, // Land detected
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === false, 'Land interference rejected');
    assert(val.validationGrade === 'REJECTED_LAND_INTERFERENCE', `Expected REJECTED_LAND_INTERFERENCE, got ${val.validationGrade}`);
  });

  check('Annotation Rule 5: Rejection of irregular geometry (non-vessel aspect ratio)', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_IRREGULAR_05',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: maritimeBbox,
      radarBackscatterDb: -4.5,
      estimatedLengthMeters: 200,
      estimatedBeamMeters: 180, // Aspect ratio ~1.1:1 (circular shoal / island rock)
      aspectRatio: 1.1,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === false, 'Irregular aspect ratio rejected');
    assert(val.validationGrade === 'REJECTED_FALSE_ALARM', `Expected REJECTED_FALSE_ALARM, got ${val.validationGrade}`);
  });

  check('Annotation Rule 6: Rejection of out-of-bounds WGS84 geographic coordinates', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_BAD_COORDS_06',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: [195.0, -105.0, 205.0, -95.0], // Out of standard [-180, 180], [-90, 90] bounds
      radarBackscatterDb: -4.0,
      estimatedLengthMeters: 150,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    assert(val.isValid === false, 'Out-of-bounds coordinates rejected');
    assert(val.validationNotice.includes('exceeds standard WGS84 bounds'), 'Explains coordinate boundary error');
  });

  check('Annotation Rule 7: Adaptive sea clutter floor overrides default -19.5 dB baseline', () => {
    const candidate = {
      annotationId: 'ANN_VESSEL_ADAPTIVE_CLUTTER_07',
      sourceSceneId: 'S1A_IW_GRDH_1SDV_20261010T163210',
      sensorPlatform: 'Sentinel-1A',
      polarization: 'VV',
      bbox: maritimeBbox,
      radarBackscatterDb: -5.0,
      localClutterDb: -15.0, // High sea state clutter (-15 dB vs default -19.5 dB)
      estimatedLengthMeters: 160,
      estimatedBeamMeters: 32,
      aspectRatio: 5.0,
      annotatorType: 'ALGORITHM_CFAR',
      waterMaskConfirmed: true,
    };

    const val = VesselValidationEngine.validateAnnotation(candidate);
    // TCR = -5.0 - (-15.0) = 10.0 dB (instead of 14.5 dB with default -19.5)
    assert.strictEqual(val.targetToClutterRatioDb, 10.0, 'Calculates TCR using custom sea-state clutter floor');
    assert(val.isValid === true, 'Validates with dynamic clutter floor');
  });

  // -------------------------------------------------------------------------
  // SECTION 3: HUMAN-EXPERT GROUND-TRUTH QUALITY VERIFICATION
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 3: HUMAN-EXPERT GROUND-TRUTH QUALITY VERIFICATION ---');

  check('Ground-Truth Check: Geospatial analyst certification with SHA-256 integrity signature', () => {
    const review = {
      detectionId: 'DET_VESSEL_01',
      analystId: 'GEO_ANALYST_ZA_09',
      analystName: 'Senior Maritime Intelligence Officer',
      decision: 'CONFIRM',
      confidenceRating: 0.98,
      notes: 'Confirmed 240m bulk carrier anchored off Richards Bay Coal Terminal. Aspect ratio 4.8:1 verified against harbor master logs.',
      aisCrossChecked: true,
      aisMmsi: '601992000',
      aisVesselName: 'AFRIQORA PIONEER',
    };

    const certified = VesselValidationEngine.verifyGroundTruth(review);
    assert(certified.status === 'AIS_CROSS_VALIDATED', `Expected AIS_CROSS_VALIDATED, got ${certified.status}`);
    assert(certified.analystVerification.analystId === 'GEO_ANALYST_ZA_09', 'Preserved analyst ID');
    assert(certified.analystVerification.signatureHash.length === 64, 'Generated valid SHA-256 signature hash');
    assert(certified.aisCrossValidation.mmsi === '601992000', 'Preserved AIS MMSI');
    assert(certified.aisCrossValidation.crossCheckConfidence >= 0.95, 'High cross-check confidence');
  });

  check('Ground-Truth Check: Analyst rejection sets status to REJECTED_FALSE_ALARM', () => {
    const review = {
      detectionId: 'DET_VESSEL_FALSE_01',
      analystId: 'GEO_ANALYST_ZA_09',
      analystName: 'Senior Maritime Intelligence Officer',
      decision: 'REJECT',
      confidenceRating: 0.95,
      notes: 'Tug wash / sea wake artifact confirmed upon inspecting polarization ratio. No vessel present.',
    };

    const certified = VesselValidationEngine.verifyGroundTruth(review);
    assert(certified.status === 'REJECTED_FALSE_ALARM', `Expected REJECTED_FALSE_ALARM, got ${certified.status}`);
    assert(certified.analystVerification.signatureHash.length === 64, 'Generated valid signature hash');
  });

  // -------------------------------------------------------------------------
  // SECTION 4: DATASET PROVENANCE AUDIT LEDGER
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 4: DATASET PROVENANCE AUDIT LEDGER ---');

  check('Provenance Audit: Sentinel-1 SAR & Sentinel-2 Optical remain strictly separated', () => {
    const sarAudit = VesselValidationEngine.createDatasetProvenanceAudit({
      datasetId: 'DATASET_S1_RICHARDS_BAY',
      sensorPipeline: 'SENTINEL_1_SAR',
      sceneIds: ['S1A_IW_GRDH_1SDV_20261010T163210_B0F4'],
      actualAcquisitionDates: ['2026-10-10'],
      orbitPass: 'ASCENDING',
      polarizationOrBands: ['VV', 'VH'],
      radiometricStandard: 'ESA_SAR_RADIOMETRIC_CAL_V2',
      speckleFilterOrAtmosphericCorrection: 'Lee_3x3_Cu_0.5227',
      pixelGridSpacingMeters: 10.0,
      trueGroundSamplingDistanceMeters: 20.0,
    });

    const optAudit = VesselValidationEngine.createDatasetProvenanceAudit({
      datasetId: 'DATASET_S2_RICHARDS_BAY',
      sensorPipeline: 'SENTINEL_2_OPTICAL',
      sceneIds: ['S2A_MSIL2A_20261008T082021_N0500'],
      actualAcquisitionDates: ['2026-10-08'],
      polarizationOrBands: ['B02', 'B03', 'B04', 'B08', 'B11'],
      radiometricStandard: 'Sen2Cor_BOA_SurfaceReflectance_L2A',
      speckleFilterOrAtmosphericCorrection: 'SceneClassificationLayer_SCL_v2',
      pixelGridSpacingMeters: 10.0,
      trueGroundSamplingDistanceMeters: 10.0,
    });

    assert(sarAudit.sensorPipeline === 'SENTINEL_1_SAR', 'SAR pipeline decoupled');
    assert(optAudit.sensorPipeline === 'SENTINEL_2_OPTICAL', 'Optical pipeline decoupled');
    assert(sarAudit.dataPolicyAttribution.includes('Synthetic Aperture Radar'), 'Accurate SAR attribution');
    assert(optAudit.dataPolicyAttribution.includes('Multi-Spectral Instrument'), 'Accurate Optical attribution');
    assert(sarAudit.integrityHashSha256.length === 64, 'SAR SHA-256 audit hash valid');
    assert(optAudit.integrityHashSha256.length === 64, 'Optical SHA-256 audit hash valid');
    assert(sarAudit.integrityHashSha256 !== optAudit.integrityHashSha256, 'Distinct provenance hashes');
  });

  // -------------------------------------------------------------------------
  // SECTION 5: OBJECT DETECTION ENGINE WITH MARITIME VESSEL
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 5: OBJECT DETECTION ENGINE INTEGRATION ---');

  check('Object Detection: detectObjects includes MARITIME_VESSEL when SAR data is present', () => {
    const res = ObjectDetectionEngine.detectObjects({
      bbox: maritimeBbox,
      sarScene: sarPayload,
    });

    const vesselObj = res.objects.find(o => o.objectClass === 'MARITIME_VESSEL');
    assert(vesselObj !== undefined, 'Found MARITIME_VESSEL object');
    assert(vesselObj.radarBackscatterDb === -3.2, 'Accurate radar backscatter dB');
    assert(vesselObj.vesselMetrics !== undefined, 'Contains vesselMetrics');
    assert(vesselObj.vesselMetrics.estimatedLengthMeters === 240, 'Length 240m preserved');
    assert(vesselObj.vesselMetrics.vesselClassEstimate === 'CONTAINER_CARGO_VESSEL', 'Class estimate preserved');
    assert(vesselObj.groundTruthVerification !== undefined, 'Contains groundTruthVerification');
    assert(vesselObj.groundTruthVerification.aisCrossValidation.mmsi === '601992000', 'AIS MMSI preserved');
  });

  // -------------------------------------------------------------------------
  // SECTION 6: SATELLITE CONTROLLER ENDPOINTS
  // -------------------------------------------------------------------------
  console.log('\n--- SECTION 6: SATELLITE CONTROLLER ENDPOINTS ---');

  await asyncCheck('Controller Endpoint: POST /api/satellite/vessels/validate', async () => {
    let resultJson = null;
    let statusCode = 200;

    const mockReq = {
      body: {
        annotationId: 'ANN_API_TEST_01',
        sourceSceneId: 'S1A_IW_GRDH_20261010',
        sensorPlatform: 'Sentinel-1A',
        polarization: 'VV',
        bbox: maritimeBbox,
        radarBackscatterDb: -4.0,
        estimatedLengthMeters: 190,
        estimatedBeamMeters: 38,
        annotatorType: 'ALGORITHM_CFAR',
        waterMaskConfirmed: true,
      }
    };

    const mockRes = {
      json: (data) => { resultJson = data; },
      status: (code) => { statusCode = code; return mockRes; },
    };

    await SatelliteController.validateVesselAnnotation(mockReq, mockRes);
    assert(statusCode === 200, `Expected HTTP 200, got ${statusCode}`);
    assert(resultJson && resultJson.ok === true, 'Endpoint succeeded');
    assert(resultJson.validation && resultJson.validation.isValid === true, 'Validation is valid');
    assert(resultJson.validation.validationGrade === 'VALIDATED_HIGH_CONFIDENCE', 'Validated high confidence');
  });

  await asyncCheck('Controller Endpoint: POST /api/satellite/ground-truth/review', async () => {
    let resultJson = null;
    let statusCode = 200;

    const mockReq = {
      body: {
        detectionId: 'DET_VESSEL_API_01',
        analystId: 'GEO_ANALYST_01',
        analystName: 'Lead Maritime Analyst',
        decision: 'CONFIRM',
        confidenceRating: 0.99,
        notes: 'Ground-truth confirmed via AIS transponder broadcast.',
        aisCrossChecked: true,
        aisMmsi: '601992000',
        aisVesselName: 'AFRIQORA PIONEER',
      }
    };

    const mockRes = {
      json: (data) => { resultJson = data; },
      status: (code) => { statusCode = code; return mockRes; },
    };

    await SatelliteController.submitGroundTruthReview(mockReq, mockRes);
    assert(statusCode === 200, `Expected HTTP 200, got ${statusCode}`);
    assert(resultJson && resultJson.ok === true, 'Endpoint succeeded');
    assert(resultJson.groundTruth.status === 'AIS_CROSS_VALIDATED', 'Certified AIS status');
    assert(resultJson.groundTruth.analystVerification.signatureHash.length === 64, 'Valid signature hash');
  });

  await asyncCheck('Controller Endpoint: GET /api/satellite/vessels (Port of Richards Bay)', async () => {
    let resultJson = null;
    let statusCode = 200;

    const mockReq = {
      query: {
        bbox: '32.00,-28.82,32.12,-28.74',
        thresholdDb: '-7.0',
      }
    };

    const mockRes = {
      json: (data) => { resultJson = data; },
      status: (code) => { statusCode = code; return mockRes; },
    };

    await SatelliteController.getVesselDetections(mockReq, mockRes);
    assert(statusCode === 200, `Expected HTTP 200, got ${statusCode}`);
    assert(resultJson && resultJson.ok === true, 'Endpoint succeeded');
    assert(typeof resultJson.vesselCount === 'number', 'Returns vesselCount');
    assert(resultJson.provenance && resultJson.provenance.sensorPipeline === 'SENTINEL_1_SAR', 'Returns SAR provenance');
  });

  await asyncCheck('Controller Endpoint: GET /api/satellite/vessels (Lekki Deep Sea Port)', async () => {
    let resultJson = null;
    let statusCode = 200;

    const mockReq = {
      query: {
        bbox: '3.94,6.40,4.06,6.48',
        thresholdDb: '-7.0',
      }
    };

    const mockRes = {
      json: (data) => { resultJson = data; },
      status: (code) => { statusCode = code; return mockRes; },
    };

    await SatelliteController.getVesselDetections(mockReq, mockRes);
    assert(statusCode === 200, `Expected HTTP 200, got ${statusCode}`);
    assert(resultJson && resultJson.ok === true, 'Endpoint succeeded');
    assert(typeof resultJson.vesselCount === 'number' && resultJson.vesselCount >= 1, 'Returns Lekki vessel detections');
    assert(resultJson.provenance && resultJson.provenance.sensorPipeline === 'SENTINEL_1_SAR', 'Returns SAR provenance');
  });

  console.log('\n======================================================================');
  console.log(`ML-01 VESSEL, GROUND-TRUTH & PROVENANCE SUITE RESULT: ${passed}/${total} PASSED`);
  console.log('======================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
