export class ConfidenceCalculator {
  /**
   * Compute evidence confidence score (0.0 to 1.0) and level ('HIGH' | 'MEDIUM' | 'LOW')
   * Evaluates:
   * 1. Optical cloud cover interference (0% cloud = 1.0, 50% cloud = 0.5)
   * 2. Spatial resolution factor (10m = 1.0, 30m = 0.8, 250m = 0.4)
   * 3. Temporal observation density (multiple observations across interval)
   * 4. Multi-sensor cross-validation (SAR + Optical agreement boosts confidence)
   */
  public static calculateConfidence(params: {
    cloudCover?: number;
    resolutionMeters: number;
    observationCount: number;
    hasMultiSensorAgreement: boolean;
    changeMagnitude: number;
  }): { score: number; level: 'HIGH' | 'MEDIUM' | 'LOW'; breakdown: Record<string, number> } {
    const { cloudCover = 0, resolutionMeters, observationCount, hasMultiSensorAgreement, changeMagnitude } = params;

    // 1. Cloud penalty (only for optical)
    const cloudPenalty = Math.max(0, Math.min(0.4, (cloudCover / 100) * 0.4));
    const cloudScore = 1.0 - cloudPenalty;

    // 2. Resolution score (10m Sentinel = 0.95, sub-meter = 1.0)
    const resScore = Math.max(0.6, 1.0 - (resolutionMeters - 0.5) / 100);

    // 3. Temporal density score
    const temporalScore = Math.min(1.0, 0.7 + observationCount * 0.05);

    // 4. Multi-sensor cross agreement bonus
    const sensorBonus = hasMultiSensorAgreement ? 0.15 : 0.0;

    // 5. Signal to noise / change magnitude
    const magnitudeScore = Math.min(1.0, 0.75 + Math.abs(changeMagnitude) * 0.25);

    // Weighted composite
    let rawScore =
      cloudScore * 0.35 +
      resScore * 0.20 +
      temporalScore * 0.20 +
      magnitudeScore * 0.25 +
      sensorBonus;

    rawScore = Math.max(0.1, Math.min(0.98, rawScore));
    const finalScore = Number(rawScore.toFixed(2));

    let level: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (finalScore >= 0.82) {
      level = 'HIGH';
    } else if (finalScore < 0.65) {
      level = 'LOW';
    }

    return {
      score: finalScore,
      level,
      breakdown: {
        cloudScore: Number(cloudScore.toFixed(2)),
        resScore: Number(resScore.toFixed(2)),
        temporalScore: Number(temporalScore.toFixed(2)),
        sensorBonus: Number(sensorBonus.toFixed(2)),
      },
    };
  }
}
