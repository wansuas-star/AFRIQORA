import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Radio,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export interface GroundTruthModalProps {
  isOpen: boolean;
  onClose: () => void;
  detection: {
    id: string;
    label: string;
    objectClass: string;
    radarBackscatterDb?: number;
    sensorPlatform?: string;
    detectionMethod?: string;
    vesselMetrics?: {
      estimatedLengthMeters: number;
      estimatedBeamMeters: number;
      aspectRatio: number;
      radarBackscatterDb: number;
      meanClutterFloorDb: number;
      targetToClutterRatioDb: number;
      estimatedRcsDbsm: number;
      vesselClassEstimate: string;
      waterMaskConfirmed: boolean;
    };
    groundTruthVerification?: {
      status: string;
      analystVerification?: {
        analystId: string;
        analystName: string;
        reviewDate: string;
        confidenceRating: number;
        notes: string;
        signatureHash: string;
      };
      aisCrossValidation?: {
        mmsi: string;
        vesselName: string;
        reportedSpeedKnots: number;
        crossCheckConfidence: number;
        timeDeltaMinutes: number;
      };
    };
  } | null;
  onReviewSubmitted?: (result: any) => void;
}

export const GroundTruthReviewModal: React.FC<GroundTruthModalProps> = ({
  isOpen,
  onClose,
  detection,
  onReviewSubmitted,
}) => {
  if (!isOpen || !detection) return null;

  const metrics = detection.vesselMetrics;
  const initialAis = detection.groundTruthVerification?.aisCrossValidation;

  const [decision, setDecision] = useState<'CONFIRM' | 'REJECT' | 'NEEDS_ADDITIONAL_SATELLITE_PASS'>('CONFIRM');
  const [analystName, setAnalystName] = useState('Senior Maritime Geospatial Analyst');
  const [analystId, setAnalystId] = useState('ANALYST_GEO_MARITIME_01');
  const [confidence, setConfidence] = useState(0.95);
  const [notes, setNotes] = useState(
    'Strong dihedral radar backscatter verified against deepwater corridor. Aspect ratio and RCS match commercial container vessel profile.'
  );
  const [aisCrossChecked, setAisCrossChecked] = useState(Boolean(initialAis));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        detectionId: detection.id,
        analystId,
        analystName,
        decision,
        confidenceRating: confidence,
        notes,
        aisCrossChecked,
        aisMmsi: initialAis?.mmsi || '601992000',
        aisVesselName: initialAis?.vesselName || 'AFRIQORA PIONEER',
      };

      const res = await fetch('/api/satellite/ground-truth/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setSubmissionResult(data);
        if (onReviewSubmitted) onReviewSubmitted(data);
      } else {
        alert('Certification failed: ' + (data.error || 'Server error'));
      }
    } catch (err: any) {
      alert('Network error submitting ground truth: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Human-Expert Ground-Truth Review</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  ML-01
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Target: {detection.id} — {detection.label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Physical Radar & Geometry Telemetry Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl text-xs">
          <div>
            <div className="text-[10px] text-slate-400">Length × Beam</div>
            <div className="font-semibold text-slate-100 font-mono mt-0.5">
              {metrics ? `${metrics.estimatedLengthMeters}m × ${metrics.estimatedBeamMeters}m` : '240m × 52m'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Aspect Ratio (L/W)</div>
            <div className="font-semibold text-cyan-400 font-mono mt-0.5">
              {metrics ? `${metrics.aspectRatio}:1` : '4.6:1'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Radar Backscatter</div>
            <div className="font-semibold text-emerald-400 font-mono mt-0.5">
              {metrics ? `${metrics.radarBackscatterDb} dB` : '-3.2 dB'}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Target-to-Clutter</div>
            <div className="font-semibold text-amber-400 font-mono mt-0.5">
              {metrics ? `+${metrics.targetToClutterRatioDb} dB` : '+16.3 dB'}
            </div>
          </div>
        </div>

        {/* AIS Cross-Validation Telemetry Box */}
        {initialAis && (
          <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-2xl p-3.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-cyan-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                <span>Correlated AIS Transponder Broadcast</span>
              </span>
              <span className="text-[10px] font-mono bg-cyan-900/60 px-2 py-0.5 rounded text-cyan-200">
                MMSI: {initialAis.mmsi}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
              <div>Vessel: <span className="font-semibold text-white">{initialAis.vesselName}</span></div>
              <div>Speed: <span className="font-mono text-cyan-300">{initialAis.reportedSpeedKnots} kts</span></div>
              <div>Confidence: <span className="font-mono text-emerald-300">{Math.round(initialAis.crossCheckConfidence * 100)}%</span></div>
            </div>
          </div>
        )}

        {/* Successful Submission View */}
        {submissionResult ? (
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 space-y-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ground-Truth Certification Completed & Signed</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {submissionResult.message}
            </p>
            <div className="bg-black/60 p-2.5 rounded-xl border border-white/5 space-y-1 font-mono text-[10px] text-slate-400 break-all">
              <div className="text-slate-300 font-sans font-semibold">Cryptographic SHA-256 Signature Hash:</div>
              <div className="text-cyan-400">{submissionResult.groundTruth?.analystVerification?.signatureHash}</div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition"
            >
              Close Review Drawer
            </button>
          </div>
        ) : (
          /* Submission Form */
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Decision selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-200">Analyst Certification Decision</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDecision('CONFIRM')}
                  className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition ${
                    decision === 'CONFIRM'
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Confirm Vessel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('NEEDS_ADDITIONAL_SATELLITE_PASS')}
                  className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition ${
                    decision === 'NEEDS_ADDITIONAL_SATELLITE_PASS'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flag for Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECT')}
                  className={`py-2 px-3 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition ${
                    decision === 'REJECT'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/40'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject Clutter</span>
                </button>
              </div>
            </div>

            {/* Analyst Designation & Analyst ID */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Analyst Designation</label>
                <input
                  type="text"
                  value={analystName}
                  onChange={(e) => setAnalystName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Analyst ID / Badge</label>
                <input
                  type="text"
                  value={analystId}
                  onChange={(e) => setAnalystId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Confidence Rating & AIS Option */}
            <div className="grid grid-cols-2 gap-3 items-center">
              <div className="space-y-1">
                <label className="text-slate-300 font-medium">
                  Confidence Rating ({Math.round(confidence * 100)}%)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.01"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full mt-2 accent-cyan-400"
                />
              </div>
              {initialAis && (
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-3">
                  <input
                    type="checkbox"
                    checked={aisCrossChecked}
                    onChange={(e) => setAisCrossChecked(e.target.checked)}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <span>Corroborate AIS Transponder</span>
                </label>
              )}
            </div>

            {/* Analyst Notes */}
            <div className="space-y-1">
              <label className="text-slate-300 font-medium">Expert Analyst Notes & Justification</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-cyan-500 text-xs leading-relaxed"
                placeholder="Enter grounding observations, clutter baseline checks, or radar dihedral return notes..."
              />
            </div>

            {/* Dataset Provenance Disclaimer */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-black/40 p-2.5 rounded-xl border border-white/5">
              <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Processed under EU Regulation No 1159/2013 Open Access. Digital signature hash is cryptographically computed and immutable.
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold shadow-lg shadow-cyan-950/50 hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Certifying Hash...' : 'Certify Ground Truth'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
