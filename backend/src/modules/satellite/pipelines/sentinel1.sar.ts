import { RasterGrid, SARScenePayload } from '../types';

/**
 * Modular Sentinel-1 Synthetic Aperture Radar (SAR) Processing Pipeline
 * Completely decoupled from optical pipelines.
 *
 * Implements:
 * - Radiometric calibration (Digital Numbers to Sigma0 / Gamma0 in dB)
 * - 3x3, 5x5, and NxN Lee Speckle Filter
 * - Dual-polarization cross-ratio analysis (gamma0_VH - gamma0_VV in dB)
 * - SAR backscatter change differencing (Delta gamma0 in dB)
 * - High-backscatter metallic / vessel / structural target detection
 * - Spatial radar anomaly clustering
 * - Zero, negative, and NaN missing-pixel safety validation
 * - Multi-temporal SAR stability & backscatter trend analysis
 */
export class Sentinel1SARPipeline {
  /**
   * Convert linear amplitude/intensity Digital Numbers (DN) to calibrated Gamma-0 / Sigma-0 in decibels (dB)
   * Equation: gamma0_dB = 10 * log10(max(DN^2 * calFactor, 1e-7))
   * Handles 0, negative, null, undefined, and NaN inputs safely with standard noise floor -40.0 dB.
   */
  public static calibrateDNtoDecibels(dn: number, calFactor: number = 1.0): number {
    if (dn === null || dn === undefined || isNaN(dn) || dn <= 0 || !isFinite(dn)) {
      return -40.0; // Standard radar noise floor in dB
    }
    const safeCal = isNaN(calFactor) || calFactor <= 0 || !isFinite(calFactor) ? 1.0 : calFactor;
    const intensity = Math.max(dn * dn * safeCal, 1e-7);
    return Number((10 * Math.log10(intensity)).toFixed(2));
  }

  /**
   * Apply Lee Speckle Filter on a 2D raster grid
   * Reduces radar speckle noise while preserving sharp boundaries/edges.
   * Handles NaN, zero, and irregular values safely.
   */
  public static applyLeeFilter(grid: RasterGrid, windowSize: number = 3): RasterGrid {
    if (!grid || !grid.data || grid.data.length === 0 || !grid.data[0] || grid.data[0].length === 0) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = grid.data.length;
    const width = grid.data[0].length;
    const safeWin = Math.max(3, windowSize % 2 === 0 ? windowSize + 1 : windowSize);
    const half = Math.floor(safeWin / 2);
    const filtered: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    const Cu = 0.5227; // Theoretical noise coefficient of variation for 1-look SAR

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const centerVal = grid.data[r][c];
        if (centerVal === null || centerVal === undefined || isNaN(centerVal) || !isFinite(centerVal)) {
          filtered[r][c] = -40.0;
          continue;
        }

        let sum = 0;
        let sumSq = 0;
        let count = 0;

        for (let dr = -half; dr <= half; dr++) {
          for (let dc = -half; dc <= half; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < height && nc >= 0 && nc < width) {
              const val = grid.data[nr][nc];
              if (val !== null && val !== undefined && !isNaN(val) && isFinite(val)) {
                sum += val;
                sumSq += val * val;
                count++;
              }
            }
          }
        }

        if (count < 2) {
          filtered[r][c] = centerVal;
          continue;
        }

        const mean = sum / count;
        const variance = Math.max(0, (sumSq - count * mean * mean) / (count - 1));
        const std = Math.sqrt(variance);
        const Ci = Math.abs(mean) > 1e-5 ? std / Math.abs(mean) : 0;

        let weight = 0;
        if (Ci > Cu && Ci > 1e-5) {
          weight = 1 - (Cu * Cu) / (Ci * Ci);
          weight = Math.max(0, Math.min(1.0, weight));
        }

        filtered[r][c] = Number((mean + weight * (centerVal - mean)).toFixed(2));
      }
    }

    return {
      width,
      height,
      bbox: grid.bbox || [0, 0, 0, 0],
      resolutionMeters: grid.resolutionMeters || 10.0,
      data: filtered,
    };
  }

  /**
   * Bi-temporal SAR Differencing (Delta gamma0 in dB)
   * Quantifies ground disturbances and surface modification in hectares.
   */
  public static computeSARDifference(
    t1VV: RasterGrid,
    t2VV: RasterGrid,
    thresholdDb: number = 2.5
  ): {
    diffGrid: RasterGrid;
    meanDeltaDb: number;
    positiveAnomaliesHectares: number;
    negativeAnomaliesHectares: number;
    anomalyPixelCount: number;
  } {
    if (!t1VV?.data || !t2VV?.data || t1VV.data.length === 0 || t2VV.data.length === 0) {
      return {
        diffGrid: { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] },
        meanDeltaDb: 0,
        positiveAnomaliesHectares: 0,
        negativeAnomaliesHectares: 0,
        anomalyPixelCount: 0,
      };
    }

    const height = Math.min(t1VV.data.length, t2VV.data.length);
    const width = Math.min(t1VV.data[0]?.length || 0, t2VV.data[0]?.length || 0);
    const diffData: number[][] = Array.from({ length: height }, () => new Array(width).fill(0));

    let sumDelta = 0;
    let validCount = 0;
    let posCount = 0;
    let negCount = 0;
    const resM = t1VV.resolutionMeters || 10.0;
    const pixelAreaM2 = resM * resM;

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const v1 = t1VV.data[r][c];
        const v2 = t2VV.data[r][c];

        if (isNaN(v1) || isNaN(v2) || v1 === null || v2 === null || !isFinite(v1) || !isFinite(v2)) {
          diffData[r][c] = 0;
          continue;
        }

        const delta = v2 - v1;
        diffData[r][c] = Number(delta.toFixed(2));
        sumDelta += delta;
        validCount++;

        if (delta >= thresholdDb) {
          posCount++;
        } else if (delta <= -thresholdDb) {
          negCount++;
        }
      }
    }

    const meanDeltaDb = validCount > 0 ? sumDelta / validCount : 0;
    const posHa = (posCount * pixelAreaM2) / 10000;
    const negHa = (negCount * pixelAreaM2) / 10000;

    return {
      diffGrid: {
        width,
        height,
        bbox: t1VV.bbox,
        resolutionMeters: resM,
        data: diffData,
      },
      meanDeltaDb: Number(meanDeltaDb.toFixed(2)),
      positiveAnomaliesHectares: Number(posHa.toFixed(2)),
      negativeAnomaliesHectares: Number(negHa.toFixed(2)),
      anomalyPixelCount: posCount + negCount,
    };
  }

  /**
   * Dual-Polarization Cross-Ratio (VH - VV in dB, or VH/VV linear)
   * High cross-pol ratio (> -6 dB) indicates volume scattering (dense canopy / forest).
   * Low cross-pol ratio (< -12 dB) indicates surface scattering (bare ground, calm water, open excavation).
   */
  public static computeCrossPolRatio(vhGrid: RasterGrid, vvGrid: RasterGrid): RasterGrid {
    if (!vhGrid?.data || !vvGrid?.data || vhGrid.data.length === 0 || vvGrid.data.length === 0) {
      return { width: 0, height: 0, bbox: [0, 0, 0, 0], resolutionMeters: 10, data: [] };
    }

    const height = Math.min(vhGrid.data.length, vvGrid.data.length);
    const width = Math.min(vhGrid.data[0]?.length || 0, vvGrid.data[0]?.length || 0);
    const ratioData: number[][] = Array.from({ length: height }, () => new Array(width).fill(-20.0));

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const vh = vhGrid.data[r][c];
        const vv = vvGrid.data[r][c];

        if (isNaN(vh) || isNaN(vv) || vh === null || vv === null || !isFinite(vh) || !isFinite(vv)) {
          ratioData[r][c] = -20.0;
          continue;
        }

        // Since grids are in dB, subtraction is equivalent to linear division (VH - VV)
        const ratioDb = vh - vv;
        ratioData[r][c] = Number(ratioDb.toFixed(2));
      }
    }

    return {
      width,
      height,
      bbox: vhGrid.bbox,
      resolutionMeters: vhGrid.resolutionMeters || 10.0,
      data: ratioData,
    };
  }

  /**
   * Detect high-backscatter metallic / vessel / crane / industrial structures
   * Radar double-bounce reflection causes strong returns >= brightThresholdDb
   */
  public static detectHighBackscatterTargets(
    vvGrid: RasterGrid,
    brightThresholdDb: number = -8.0
  ): { targetCount: number; targetLocations: { row: number; col: number; backscatterDb: number }[] } {
    if (!vvGrid || !vvGrid.data || vvGrid.data.length === 0) return { targetCount: 0, targetLocations: [] };
    const height = vvGrid.data.length;
    const width = vvGrid.data[0]?.length || 0;
    const targets: { row: number; col: number; backscatterDb: number }[] = [];

    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        const val = vvGrid.data[r][c];
        if (val !== null && val !== undefined && !isNaN(val) && isFinite(val) && val >= brightThresholdDb) {
          targets.push({ row: r, col: c, backscatterDb: Number(val.toFixed(1)) });
        }
      }
    }

    return {
      targetCount: targets.length,
      targetLocations: targets,
    };
  }

  /**
   * Spatial clustering of detected radar anomalies into discrete structural clusters
   */
  public static clusterAnomalies(
    targets: { row: number; col: number; backscatterDb: number }[],
    maxDistancePixels: number = 2
  ): { clusterId: number; size: number; centerRow: number; centerCol: number; maxDb: number }[] {
    if (!targets || targets.length === 0) return [];
    const visited = new Set<number>();
    const clusters: { clusterId: number; size: number; centerRow: number; centerCol: number; maxDb: number }[] = [];
    let currentId = 1;

    for (let i = 0; i < targets.length; i++) {
      if (visited.has(i)) continue;

      const clusterIndices = [i];
      visited.add(i);

      for (let j = 0; j < clusterIndices.length; j++) {
        const currIdx = clusterIndices[j];
        const curr = targets[currIdx];

        for (let k = 0; k < targets.length; k++) {
          if (visited.has(k)) continue;
          const other = targets[k];
          const dist = Math.hypot(curr.row - other.row, curr.col - other.col);
          if (dist <= maxDistancePixels) {
            visited.add(k);
            clusterIndices.push(k);
          }
        }
      }

      const clusterTargets = clusterIndices.map((idx) => targets[idx]);
      const centerRow = Number((clusterTargets.reduce((s, t) => s + t.row, 0) / clusterTargets.length).toFixed(1));
      const centerCol = Number((clusterTargets.reduce((s, t) => s + t.col, 0) / clusterTargets.length).toFixed(1));
      const maxDb = Math.max(...clusterTargets.map((t) => t.backscatterDb));

      clusters.push({
        clusterId: currentId++,
        size: clusterTargets.length,
        centerRow,
        centerCol,
        maxDb,
      });
    }

    return clusters;
  }

  /**
   * Multi-temporal SAR Backscatter stability analysis across time-series acquisitions
   */
  public static computeTimeSeriesTrend(
    observations: { date: Date; vvGrid: RasterGrid; vhGrid?: RasterGrid }[]
  ): {
    points: { date: string; meanVV: number; meanVH?: number; meanRatio?: number; validCount: number }[];
    deltaDb: number;
    stability: 'STABLE_RADAR' | 'SURFACE_MODIFIED' | 'TARGET_ADDED';
  } {
    if (!observations || observations.length === 0) {
      return { points: [], deltaDb: 0, stability: 'STABLE_RADAR' };
    }

    const sorted = [...observations].sort((a, b) => a.date.getTime() - b.date.getTime());
    const points = sorted.map((obs) => {
      let sumVV = 0;
      let sumVH = 0;
      let countVV = 0;
      let countVH = 0;

      const rows = obs.vvGrid?.data?.length || 0;
      const cols = rows > 0 ? obs.vvGrid.data[0].length : 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const vv = obs.vvGrid.data[r][c];
          if (vv !== null && !isNaN(vv) && isFinite(vv)) {
            sumVV += vv;
            countVV++;
          }
          if (obs.vhGrid?.data && obs.vhGrid.data[r]) {
            const vh = obs.vhGrid.data[r][c];
            if (vh !== null && !isNaN(vh) && isFinite(vh)) {
              sumVH += vh;
              countVH++;
            }
          }
        }
      }

      const meanVV = countVV > 0 ? Number((sumVV / countVV).toFixed(2)) : -20.0;
      const meanVH = countVH > 0 ? Number((sumVH / countVH).toFixed(2)) : undefined;
      const meanRatio = meanVH !== undefined ? Number((meanVH - meanVV).toFixed(2)) : undefined;

      return {
        date: obs.date.toISOString().slice(0, 10),
        meanVV,
        meanVH,
        meanRatio,
        validCount: countVV,
      };
    });

    const baseline = points[0].meanVV;
    const latest = points[points.length - 1].meanVV;
    const deltaDb = Number((latest - baseline).toFixed(2));

    let stability: 'STABLE_RADAR' | 'SURFACE_MODIFIED' | 'TARGET_ADDED' = 'STABLE_RADAR';
    if (Math.abs(deltaDb) >= 3.0) {
      stability = deltaDb > 0 ? 'TARGET_ADDED' : 'SURFACE_MODIFIED';
    }

    return {
      points,
      deltaDb,
      stability,
    };
  }
}
