import { OpticalScenePayload, RasterGrid } from '../types';

/**
 * Modular Sentinel-2 Optical / Multispectral Processing Pipeline
 * Completely decoupled from SAR pipelines.
 *
 * Implements:
 * - Scene Classification Layer (SCL) Cloud, Cirrus, and Shadow masking
 * - Normalized Difference Vegetation Index (NDVI) = (NIR - Red) / (NIR + Red)
 * - Normalized Difference Water Index (NDWI) = (Green - NIR) / (Green + NIR)
 * - Modified Normalized Difference Water Index (MNDWI) = (Green - SWIR) / (Green + SWIR)
 * - Normalized Difference Built-up Index (NDBI) = (SWIR - NIR) / (SWIR + NIR)
 * - Enhanced Vegetation Index (EVI) = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)
 * - Soil-Adjusted Vegetation Index (SAVI) = ((NIR - Red) / (NIR + Red + L)) * (1 + L)
 * - Modified Soil-Adjusted Vegetation Index (MSAVI) = (2*NIR + 1 - sqrt((2*NIR+1)^2 - 8*(NIR-Red))) / 2
 * - Radiometric Reflectance calibration (0-10000 DN to 0.0-1.0 reflectance)
 * - Multi-band Spectral Profile Signature extraction
 * - Bi-temporal Spectral Delta calculation and surface area quantification (hectares)
 * - Robust handling of missing, zero, and NaN pixel values
 * - Multi-temporal Optical time-series progression & trend extraction
 */
export class Sentinel2OpticalPipeline {
  /**
   * Calibrate raw integer Digital Numbers (0 - 10000) into physical reflectance [0.0, 1.0]
   */
  public static calibrateReflectance(grid: RasterGrid, scaleFactor: number = 10000): RasterGrid {
    if (!grid?.data || grid.data.length === 0) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = grid.data.length;
    const width = grid.data[0]?.length || 0;
    const calibrated: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const val = grid.data[r][c];
        if (val === null || val === undefined || isNaN(val) || !isFinite(val)) {
          calibrated[r][c] = NaN;
        } else if (val > 1.0) {
          calibrated[r][c] = Number(Math.max(0, Math.min(1.0, val / scaleFactor)).toFixed(4));
        } else {
          calibrated[r][c] = Number(Math.max(0, Math.min(1.0, val)).toFixed(4));
        }
      }
    }

    return {
      width,
      height,
      bbox: grid.bbox,
      resolutionMeters: grid.resolutionMeters || 10.0,
      data: calibrated,
    };
  }

  /**
   * Compute Normalized Difference Index: (BandA - BandB) / (BandA + BandB)
   * Clamped to standard [-1.0, 1.0] range.
   * Gracefully handles NaN, null, and divide-by-zero.
   */
  public static computeNormalizedDifference(bandA: RasterGrid, bandB: RasterGrid): RasterGrid {
    if (!bandA?.data || !bandB?.data || bandA.data.length === 0 || bandB.data.length === 0) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = Math.min(bandA.data.length, bandB.data.length);
    const width = Math.min(bandA.data[0]?.length || 0, bandB.data[0]?.length || 0);
    const indexData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const a = bandA.data[r][c];
        const b = bandB.data[r][c];

        if (isNaN(a) || isNaN(b) || a === null || b === null || !isFinite(a) || !isFinite(b)) {
          indexData[r][c] = NaN;
          continue;
        }

        const denom = a + b;
        if (Math.abs(denom) > 1e-5) {
          const val = (a - b) / denom;
          indexData[r][c] = Number(Math.max(-1.0, Math.min(1.0, val)).toFixed(3));
        } else {
          indexData[r][c] = 0;
        }
      }
    }

    return {
      width,
      height,
      bbox: bandA.bbox,
      resolutionMeters: bandA.resolutionMeters || 10.0,
      data: indexData,
    };
  }

  /**
   * NDVI = (NIR - Red) / (NIR + Red)
   * High values (>0.4) indicate healthy dense vegetation.
   * Low values (<0.15) indicate bare soil, mineral excavation, or built-up surfaces.
   */
  public static computeNDVI(nirGrid: RasterGrid, redGrid: RasterGrid): RasterGrid {
    return this.computeNormalizedDifference(nirGrid, redGrid);
  }

  /**
   * NDWI = (Green - NIR) / (Green + NIR)
   * McFeeters index: Positive values (>0.0) indicate water bodies and moisture saturation.
   */
  public static computeNDWI(greenGrid: RasterGrid, nirGrid: RasterGrid): RasterGrid {
    return this.computeNormalizedDifference(greenGrid, nirGrid);
  }

  /**
   * MNDWI = (Green - SWIR) / (Green + SWIR)
   * Xu index: Strongly enhances open water features and tailings storage facilities while suppressing built-up noise.
   */
  public static computeMNDWI(greenGrid: RasterGrid, swirGrid: RasterGrid): RasterGrid {
    return this.computeNormalizedDifference(greenGrid, swirGrid);
  }

  /**
   * NDBI = (SWIR - NIR) / (SWIR + NIR)
   * Positive values indicate impervious built-up infrastructure, concrete, or dry excavation surfaces.
   */
  public static computeNDBI(swirGrid: RasterGrid, nirGrid: RasterGrid): RasterGrid {
    return this.computeNormalizedDifference(swirGrid, nirGrid);
  }

  /**
   * Enhanced Vegetation Index (EVI) = 2.5 * (NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1)
   * Superior dynamic range in dense canopy / rainforest / high-biomass terrain without saturation.
   */
  public static computeEVI(nirGrid: RasterGrid, redGrid: RasterGrid, blueGrid: RasterGrid): RasterGrid {
    if (!nirGrid?.data || !redGrid?.data || !blueGrid?.data) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = Math.min(nirGrid.data.length, redGrid.data.length, blueGrid.data.length);
    const width = Math.min(nirGrid.data[0]?.length || 0, redGrid.data[0]?.length || 0, blueGrid.data[0]?.length || 0);
    const eviData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const nir = nirGrid.data[r][c];
        const red = redGrid.data[r][c];
        const blue = blueGrid.data[r][c];

        if (isNaN(nir) || isNaN(red) || isNaN(blue) || nir === null || red === null || blue === null) {
          eviData[r][c] = NaN;
          continue;
        }

        const denom = nir + 6.0 * red - 7.5 * blue + 1.0;
        if (Math.abs(denom) > 1e-4) {
          const val = (2.5 * (nir - red)) / denom;
          eviData[r][c] = Number(Math.max(-1.0, Math.min(1.5, val)).toFixed(3));
        } else {
          eviData[r][c] = 0;
        }
      }
    }

    return {
      width,
      height,
      bbox: nirGrid.bbox,
      resolutionMeters: nirGrid.resolutionMeters || 10.0,
      data: eviData,
    };
  }

  /**
   * Soil-Adjusted Vegetation Index (SAVI) = ((NIR - Red) / (NIR + Red + L)) * (1 + L)
   * Minimizes soil brightness influences in arid / semi-arid / open mining terrains (default L = 0.5).
   */
  public static computeSAVI(nirGrid: RasterGrid, redGrid: RasterGrid, L: number = 0.5): RasterGrid {
    if (!nirGrid?.data || !redGrid?.data) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = Math.min(nirGrid.data.length, redGrid.data.length);
    const width = Math.min(nirGrid.data[0]?.length || 0, redGrid.data[0]?.length || 0);
    const saviData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const nir = nirGrid.data[r][c];
        const red = redGrid.data[r][c];

        if (isNaN(nir) || isNaN(red) || nir === null || red === null) {
          saviData[r][c] = NaN;
          continue;
        }

        const denom = nir + red + L;
        if (Math.abs(denom) > 1e-4) {
          const val = ((nir - red) / denom) * (1.0 + L);
          saviData[r][c] = Number(Math.max(-1.0, Math.min(1.5, val)).toFixed(3));
        } else {
          saviData[r][c] = 0;
        }
      }
    }

    return {
      width,
      height,
      bbox: nirGrid.bbox,
      resolutionMeters: nirGrid.resolutionMeters || 10.0,
      data: saviData,
    };
  }

  /**
   * Modified Soil-Adjusted Vegetation Index (MSAVI)
   * Self-adjusting soil factor: MSAVI = (2*NIR + 1 - sqrt((2*NIR + 1)^2 - 8*(NIR - Red))) / 2
   */
  public static computeMSAVI(nirGrid: RasterGrid, redGrid: RasterGrid): RasterGrid {
    if (!nirGrid?.data || !redGrid?.data) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = Math.min(nirGrid.data.length, redGrid.data.length);
    const width = Math.min(nirGrid.data[0]?.length || 0, redGrid.data[0]?.length || 0);
    const msaviData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const nir = nirGrid.data[r][c];
        const red = redGrid.data[r][c];

        if (isNaN(nir) || isNaN(red) || nir === null || red === null) {
          msaviData[r][c] = NaN;
          continue;
        }

        const term1 = 2 * nir + 1;
        const underSqrt = Math.max(0, term1 * term1 - 8 * (nir - red));
        const val = (term1 - Math.sqrt(underSqrt)) / 2;
        msaviData[r][c] = Number(Math.max(-1.0, Math.min(1.5, val)).toFixed(3));
      }
    }

    return {
      width,
      height,
      bbox: nirGrid.bbox,
      resolutionMeters: nirGrid.resolutionMeters || 10.0,
      data: msaviData,
    };
  }

  /**
   * Apply Sentinel-2 Scene Classification Layer (SCL) Cloud Mask
   * Valid SCL values:
   *  0: NO_DATA (Masked)
   *  1: SATURATED_OR_DEFECTIVE (Masked)
   *  2: DARK_AREA_PIXELS
   *  3: CLOUD_SHADOWS (Masked)
   *  4: VEGETATION
   *  5: NOT_VEGETATED (Bare soil)
   *  6: WATER
   *  7: UNCLASSIFIED
   *  8: CLOUD_MEDIUM_PROBABILITY (Masked)
   *  9: CLOUD_HIGH_PROBABILITY (Masked)
   * 10: THIN_CIRRUS (Masked)
   * 11: SNOW
   */
  public static applySCLCloudMask(grid: RasterGrid, sclGrid: RasterGrid, fillVal: number = NaN): RasterGrid {
    if (!grid || !grid.data || grid.data.length === 0) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }
    const height = Math.min(grid.data.length, sclGrid?.data ? sclGrid.data.length : grid.data.length);
    const width = Math.min(grid.data[0]?.length || 0, sclGrid?.data && sclGrid.data[0] ? sclGrid.data[0].length : (grid.data[0]?.length || 0));
    const maskedData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const scl = sclGrid?.data && sclGrid.data[r] ? sclGrid.data[r][c] : 4;
        const isCloudOrShadow = scl === 0 || scl === 1 || scl === 3 || scl === 8 || scl === 9 || scl === 10;
        maskedData[r][c] = isCloudOrShadow ? fillVal : grid.data[r][c];
      }
    }

    return {
      width,
      height,
      bbox: grid.bbox,
      resolutionMeters: grid.resolutionMeters || 10.0,
      data: maskedData,
    };
  }

  /**
   * Extract multi-band spectral signature curve for a specific pixel
   */
  public static extractSpectralProfile(
    scene: OpticalScenePayload,
    row: number,
    col: number
  ): { band: string; wavelengthNm: number; reflectance: number }[] {
    const clamp = (val: number) => (isNaN(val) || val === null ? 0 : Number(Math.max(0, Math.min(1, val)).toFixed(3)));
    const r = Math.min(scene.redGrid.height - 1, Math.max(0, row));
    const c = Math.min(scene.redGrid.width - 1, Math.max(0, col));

    return [
      { band: 'B02 (Blue)', wavelengthNm: 490, reflectance: clamp(scene.blueGrid.data[r][c]) },
      { band: 'B03 (Green)', wavelengthNm: 560, reflectance: clamp(scene.greenGrid.data[r][c]) },
      { band: 'B04 (Red)', wavelengthNm: 665, reflectance: clamp(scene.redGrid.data[r][c]) },
      { band: 'B08 (NIR)', wavelengthNm: 842, reflectance: clamp(scene.nirGrid.data[r][c]) },
      { band: 'B11 (SWIR)', wavelengthNm: 1610, reflectance: clamp(scene.swirGrid.data[r][c]) },
    ];
  }

  /**
   * Compute Bi-temporal NDVI Differencing (Vegetation Clearing vs Revegetation)
   * Equation: Delta_NDVI = NDVI_t2 - NDVI_t1
   */
  public static computeNDVIDifference(
    t1Ndvi: RasterGrid,
    t2Ndvi: RasterGrid,
    clearingThreshold: number = -0.15,
    greeningThreshold: number = 0.15
  ): {
    deltaNdviGrid: RasterGrid;
    meanDeltaNdvi: number;
    vegetationLossHectares: number;
    vegetationGainHectares: number;
    clearedPixelCount: number;
  } {
    if (!t1Ndvi?.data || !t2Ndvi?.data || t1Ndvi.data.length === 0 || t2Ndvi.data.length === 0) {
      return {
        deltaNdviGrid: { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] },
        meanDeltaNdvi: 0,
        vegetationLossHectares: 0,
        vegetationGainHectares: 0,
        clearedPixelCount: 0,
      };
    }

    const height = Math.min(t1Ndvi.data.length, t2Ndvi.data.length);
    const width = Math.min(t1Ndvi.data[0]?.length || 0, t2Ndvi.data[0]?.length || 0);
    const deltaData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    let sumDelta = 0;
    let validPixels = 0;
    let lossCount = 0;
    let gainCount = 0;
    const resM = t1Ndvi.resolutionMeters || 10.0;
    const pixelAreaM2 = resM * resM;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const v1 = t1Ndvi.data[r][c];
        const v2 = t2Ndvi.data[r][c];

        if (isNaN(v1) || isNaN(v2) || v1 === null || v2 === null || !isFinite(v1) || !isFinite(v2)) {
          deltaData[r][c] = 0;
          continue;
        }

        const delta = v2 - v1;
        deltaData[r][c] = Number(delta.toFixed(3));
        sumDelta += delta;
        validPixels++;

        if (delta <= clearingThreshold) {
          lossCount++;
        } else if (delta >= greeningThreshold) {
          gainCount++;
        }
      }
    }

    const meanDeltaNdvi = validPixels > 0 ? sumDelta / validPixels : 0;
    const lossHa = (lossCount * pixelAreaM2) / 10000;
    const gainHa = (gainCount * pixelAreaM2) / 10000;

    return {
      deltaNdviGrid: {
        width,
        height,
        bbox: t1Ndvi.bbox,
        resolutionMeters: resM,
        data: deltaData,
      },
      meanDeltaNdvi: Number(meanDeltaNdvi.toFixed(3)),
      vegetationLossHectares: Number(lossHa.toFixed(2)),
      vegetationGainHectares: Number(gainHa.toFixed(2)),
      clearedPixelCount: lossCount,
    };
  }

  /**
   * Multi-temporal Optical trend analysis across observation time-series
   */
  public static computeTimeSeriesTrend(
    observations: { date: Date; ndviGrid: RasterGrid; sclGrid?: RasterGrid; cloudCover?: number }[]
  ): {
    points: { date: string; meanNdvi: number; cloudFreePixelRatio: number; cloudCover: number }[];
    deltaNdvi: number;
    trendDirection: 'INCREASING_GREENNESS' | 'DECREASING_CLEARING' | 'STABLE';
    slopePerMonth: number;
  } {
    if (!observations || observations.length === 0) {
      return { points: [], deltaNdvi: 0, trendDirection: 'STABLE', slopePerMonth: 0 };
    }

    const sorted = [...observations].sort((a, b) => a.date.getTime() - b.date.getTime());
    const points = sorted.map((obs) => {
      let sum = 0;
      let valid = 0;
      let total = 0;

      const rows = obs.ndviGrid?.data?.length || 0;
      const cols = rows > 0 ? obs.ndviGrid.data[0].length : 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          total++;
          const v = obs.ndviGrid.data[r][c];
          if (v !== null && !isNaN(v) && isFinite(v)) {
            sum += v;
            valid++;
          }
        }
      }

      const meanNdvi = valid > 0 ? Number((sum / valid).toFixed(3)) : 0;
      const cloudFreePixelRatio = total > 0 ? Number((valid / total).toFixed(2)) : 1.0;

      return {
        date: obs.date.toISOString().slice(0, 10),
        meanNdvi,
        cloudFreePixelRatio,
        cloudCover: obs.cloudCover ?? 0,
      };
    });

    const baseline = points[0].meanNdvi;
    const latest = points[points.length - 1].meanNdvi;
    const deltaNdvi = Number((latest - baseline).toFixed(3));

    const totalDays = Math.max(1, (sorted[sorted.length - 1].date.getTime() - sorted[0].date.getTime()) / (24 * 3600 * 1000));
    const months = Math.max(0.1, totalDays / 30.4);
    const slopePerMonth = Number((deltaNdvi / months).toFixed(4));

    let trendDirection: 'INCREASING_GREENNESS' | 'DECREASING_CLEARING' | 'STABLE' = 'STABLE';
    if (deltaNdvi <= -0.10) {
      trendDirection = 'DECREASING_CLEARING';
    } else if (deltaNdvi >= 0.10) {
      trendDirection = 'INCREASING_GREENNESS';
    }

    return {
      points,
      deltaNdvi,
      trendDirection,
      slopePerMonth,
    };
  }
}
