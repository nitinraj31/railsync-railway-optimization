import React from 'react';
import {
  ShieldAlert,
  Clock,
  Gauge,
  TrendingUp,
  Flame,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  X,
  Layers,
  Activity,
  ArrowRight,
  Info,
  Building2,
  Sliders,
} from 'lucide-react';
import { PredictiveRiskScoreResult } from '../../services/predictiveRiskScoringService';
import { railwayAudio } from '../../services/railwayAudio';

interface PredictiveRiskScoreDetailModalProps {
  scoreResult: PredictiveRiskScoreResult | null;
  onClose: () => void;
  onOpenPredictiveTimeline?: (defectId: string) => void;
}

export const PredictiveRiskScoreDetailModal: React.FC<PredictiveRiskScoreDetailModalProps> = ({
  scoreResult,
  onClose,
  onOpenPredictiveTimeline,
}) => {
  if (!scoreResult) return null;

  const is30dCritical = scoreResult.isLikelyCriticalWithin30Days;
  const isCritNow = scoreResult.isCurrentlyCritical;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#0b1324] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${
            isCritNow
              ? 'bg-rose-950/80 border-rose-800/80'
              : is30dCritical
              ? 'bg-gradient-to-r from-rose-950/90 via-amber-950/80 to-[#0b1324] border-rose-700/80'
              : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                isCritNow
                  ? 'bg-rose-900/60 border-rose-600 text-rose-300'
                  : is30dCritical
                  ? 'bg-rose-900/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-sky-400'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                  Defect {scoreResult.defectId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    scoreResult.currentSeverity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-200 border-rose-700'
                      : scoreResult.currentSeverity === 'HIGH'
                      ? 'bg-amber-950 text-amber-200 border-amber-700'
                      : scoreResult.currentSeverity === 'MEDIUM'
                      ? 'bg-sky-950 text-sky-200 border-sky-700'
                      : 'bg-emerald-950 text-emerald-200 border-emerald-700'
                  }`}
                >
                  Current: {scoreResult.currentSeverity}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Predictive Risk Score &amp; 30-Day Criticality Forecast
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.04);
              onClose();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto font-sans text-xs">
          {/* Main Risk Score Card */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isCritNow
                ? 'bg-rose-950/40 border-rose-700/80'
                : is30dCritical
                ? 'bg-gradient-to-r from-rose-950/50 to-amber-950/30 border-rose-700'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center border font-mono font-black ${
                  isCritNow
                    ? 'bg-rose-900/80 border-rose-500 text-rose-100'
                    : is30dCritical
                    ? 'bg-rose-900/60 border-rose-500 text-rose-100 shadow-lg shadow-rose-950/50'
                    : 'bg-sky-950/70 border-sky-700 text-sky-200'
                }`}
              >
                <span className="text-2xl leading-none">{scoreResult.predictiveRiskScore}</span>
                <span className="text-[9px] font-sans opacity-75 uppercase">Risk Score</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide uppercase border ${
                      isCritNow
                        ? 'bg-rose-950 text-rose-300 border-rose-700'
                        : is30dCritical
                        ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                        : scoreResult.riskTier === 'ELEVATED_30_60D'
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    }`}
                  >
                    {scoreResult.riskLabel}
                  </span>
                  {is30dCritical && !isCritNow && (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 border border-amber-700 text-[10px] font-bold">
                      ⚠️ Escalates &lt;30 Days
                    </span>
                  )}
                </div>
                <div className="mt-1.5 text-slate-300 font-mono text-[11px]">
                  {isCritNow ? (
                    <span className="text-rose-300 font-semibold">
                      This defect has already reached the statutory critical safety threshold.
                    </span>
                  ) : (
                    <span>
                      Forecasted Critical Horizon:{' '}
                      <strong className="text-amber-300">
                        {scoreResult.forecastedDaysUntilCritical.toFixed(1)} days
                      </strong>{' '}
                      ({scoreResult.forecastedCriticalDate})
                    </span>
                  )}
                </div>
                <div className="text-slate-400 text-[10.5px] mt-0.5">
                  {is30dCritical && !isCritNow
                    ? '⚡ Maintenance possession required prior to critical horizon to prevent unplanned line halt.'
                    : 'Condition currently within stable tracking limits; monitor periodically.'}
                </div>
              </div>
            </div>

            {onOpenPredictiveTimeline && (
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(880, 0.04);
                  onOpenPredictiveTimeline(scoreResult.defectId);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Open Timeline Map</span>
              </button>
            )}
          </div>

          {/* Model Breakdown Grid: Asset Historical Failure Rates + Corridor Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Factor 1: Asset Type & Historical Failure Rate */}
            <div className="p-3.5 rounded-lg bg-[#070d19] border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-sky-400 font-mono font-bold text-[11px]">
                <Layers className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Asset Failure Rate Profile</span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Asset Name / Type:</span>
                  <span className="font-semibold text-slate-200 text-right truncate max-w-[180px]" title={scoreResult.assetType}>
                    {scoreResult.assetType}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Historical Annual Failure Rate:</span>
                  <span className="font-bold font-mono text-amber-300">
                    {scoreResult.historicalAnnualFailureRatePercent}% / yr
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Mean Time Between Failures (MTBF):</span>
                  <span className="font-mono text-slate-200">{scoreResult.meanTimeBetweenFailuresDays} days</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Failure Acceleration Multiplier:</span>
                  <span className="font-bold font-mono text-rose-400">
                    {scoreResult.assetFailureMultiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                <strong className="text-slate-300">Typical Critical Mode: </strong>
                {scoreResult.typicalCriticalFailureMode}
              </div>
            </div>

            {/* Factor 2: Corridor Infrastructure Age */}
            <div className="p-3.5 rounded-lg bg-[#070d19] border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-[11px]">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Corridor Infrastructure Age Profile</span>
              </div>
              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Corridor ID &amp; Section:</span>
                  <span className="font-semibold text-slate-200 font-mono">{scoreResult.corridorId}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Corridor Infrastructure Age:</span>
                  <span className="font-bold font-mono text-amber-300">
                    {scoreResult.corridorAgeYears} Years (Built {scoreResult.corridorCommissioningYear})
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1">
                  <span className="text-slate-400">Annual Traffic Volume (GMT):</span>
                  <span className="font-mono text-slate-200">{scoreResult.annualTonnageGMT} GMT / yr</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-400">Corridor Aging Multiplier:</span>
                  <span className="font-bold font-mono text-rose-400">
                    {scoreResult.corridorAgeMultiplier.toFixed(2)}x
                  </span>
                </div>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400">
                <strong className="text-slate-300">Aging Impact: </strong>
                Higher cumulative track fatigue and dynamic soil settlement amplify micro-crack propagation velocity.
              </div>
            </div>
          </div>

          {/* Mathematical Forecast Formulation Banner */}
          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/60 font-mono text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Forecast Degradation Formulation</span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Days to Critical = (Base Days ÷ (Asset Failure Multiplier × Corridor Age Multiplier)) − Days Elapsed
            </p>
            <div className="p-2 rounded bg-black/40 border border-indigo-950 font-mono text-[10.5px] text-indigo-200 flex flex-wrap items-center justify-between gap-2">
              <span>
                Rate Multiplier: {scoreResult.assetFailureMultiplier.toFixed(2)}x × Age Multiplier:{' '}
                {scoreResult.corridorAgeMultiplier.toFixed(2)}x ={' '}
                <strong className="text-white">
                  {(scoreResult.assetFailureMultiplier * scoreResult.corridorAgeMultiplier).toFixed(2)}x Velocity
                </strong>
              </span>
              <span>
                Days Elapsed: <strong>{scoreResult.daysElapsedSinceDetection}d</strong>
              </span>
            </div>
          </div>

          {/* Primary Risk Driver & Recommendation */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-bold font-mono text-slate-200 text-xs">Analysis &amp; Recommended Action</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{scoreResult.primaryRiskDriver}</p>
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-200 text-[11px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-rose-300">Preventive Protocol: </strong>
                {scoreResult.recommendedPreventiveAction}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#070d19] border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            Forecast Horizon: Indian Railways Asset Reliability Index (30-Day Criticality Model)
          </span>
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.04);
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
