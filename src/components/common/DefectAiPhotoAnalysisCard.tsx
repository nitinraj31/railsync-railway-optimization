import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Gauge,
  FileText,
  RotateCw,
  Eye,
  Check,
  Clock,
  Scan,
  Activity,
  Layers,
  Cpu,
  Target,
  ShieldCheck,
  Crosshair,
  Loader2,
} from 'lucide-react';
import { DefectAiVisualAnalysis, PriorityLevel } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';

interface DefectAiPhotoAnalysisCardProps {
  analysis: DefectAiVisualAnalysis | null;
  analyzing: boolean;
  photoUrl?: string;
  assetId?: string;
  corridorId?: string;
  defectType?: string;
  currentSeverity: PriorityLevel;
  onApplyPriority: (severity: PriorityLevel) => void;
  currentSpeedRestriction?: number;
  onApplySpeedRestriction?: (speedKmph: number) => void;
  onAppendToDescription?: (textToAppend: string) => void;
  onReanalyze: () => void;
  hasPhoto: boolean;
}

interface InspectionStage {
  id: number;
  name: string;
  shortLabel: string;
  description: string;
  threshold: number; // percentage where this stage starts
}

const INSPECTION_STAGES: InspectionStage[] = [
  {
    id: 1,
    name: 'RASTER INGESTION',
    shortLabel: '1. Ingestion',
    description: 'Calibrating RGB color balance, lighting contrast & ballast noise reduction...',
    threshold: 0,
  },
  {
    id: 2,
    name: 'FEATURE SCAN',
    shortLabel: '2. Feature Extraction',
    description: 'Scanning railhead contours, gauge corner fissures, and fastener displacements...',
    threshold: 25,
  },
  {
    id: 3,
    name: 'RDSO MATCHING',
    shortLabel: '3. Defect Library',
    description: 'Cross-referencing IRPWM tolerance thresholds, ultrasonic flaw logs & fatigue curves...',
    threshold: 60,
  },
  {
    id: 4,
    name: 'RISK SYNTHESIS',
    shortLabel: '4. Priority Synthesis',
    description: 'Synthesizing structural risk level, caution speed order, and immediate intervention action...',
    threshold: 85,
  },
];

export const DefectAiPhotoAnalysisCard: React.FC<DefectAiPhotoAnalysisCardProps> = ({
  analysis,
  analyzing,
  photoUrl,
  assetId = 'TRACK-ASSET',
  corridorId = 'IR-CORRIDOR',
  defectType = '',
  currentSeverity,
  onApplyPriority,
  currentSpeedRestriction,
  onApplySpeedRestriction,
  onAppendToDescription,
  onReanalyze,
  hasPhoto,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0);
  const [showCompletionFlash, setShowCompletionFlash] = useState<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Manage progress bar animation during analyzing state
  useEffect(() => {
    if (analyzing) {
      setProgress(5);
      setActiveStageIndex(0);
      setShowCompletionFlash(false);
      startTimeRef.current = performance.now();

      const durationMs = 1750; // Total simulated time to reach ~94%

      const tick = (now: number) => {
        if (!startTimeRef.current) return;
        const elapsed = now - startTimeRef.current;
        const rawPct = Math.min(94, Math.round((elapsed / durationMs) * 94));
        // Add subtle non-linear easing for natural feeling
        const easedPct = Math.min(94, Math.max(5, rawPct));

        setProgress(easedPct);

        if (easedPct >= 85) {
          setActiveStageIndex(3);
        } else if (easedPct >= 60) {
          setActiveStageIndex(2);
        } else if (easedPct >= 25) {
          setActiveStageIndex(1);
        } else {
          setActiveStageIndex(0);
        }

        if (rawPct < 94) {
          animationFrameRef.current = requestAnimationFrame(tick);
        }
      };

      animationFrameRef.current = requestAnimationFrame(tick);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else if (analysis) {
      // Finished analyzing: animate to 100% and show completion badge
      setProgress(100);
      setActiveStageIndex(3);
      setShowCompletionFlash(true);
      const timer = setTimeout(() => {
        setShowCompletionFlash(false);
      }, 1200);
      return () => clearTimeout(timer);
    } else {
      setProgress(0);
      setActiveStageIndex(0);
    }
  }, [analyzing, analysis]);

  if (!hasPhoto) {
    return null;
  }

  const isSeverityAligned = analysis && currentSeverity === analysis.suggestedPriority;
  const hasSpeedSuggestion =
    analysis?.suggestedSpeedRestrictionKmph !== null &&
    analysis?.suggestedSpeedRestrictionKmph !== undefined &&
    analysis.suggestedSpeedRestrictionKmph > 0;
  const isSpeedAligned =
    hasSpeedSuggestion && currentSpeedRestriction === analysis.suggestedSpeedRestrictionKmph;

  const handleApply = (sev: PriorityLevel) => {
    onApplyPriority(sev);
    railwayAudio.playBeep(880, 0.08);
  };

  const handleApplySpeed = (speed: number) => {
    if (onApplySpeedRestriction) {
      onApplySpeedRestriction(speed);
      railwayAudio.playBeep(720, 0.06);
    }
  };

  const handleAppendText = () => {
    if (!analysis || !onAppendToDescription) return;
    const notes = `\n[AI Visual Diagnosis - ${analysis.detectedDefectCategory || 'Defect Pattern'}]: ${
      analysis.structuralRiskSummary
    } Immediate Action: ${analysis.recommendedImmediateAction}`;
    onAppendToDescription(notes);
    railwayAudio.playBeep(600, 0.06);
  };

  const currentStage = INSPECTION_STAGES[activeStageIndex] || INSPECTION_STAGES[0];

  return (
    <div
      id="defect-ai-photo-analysis-card"
      className="p-3.5 rounded-xl bg-[#090f1d] border border-sky-500/60 shadow-xl space-y-3 font-mono text-slate-200 transition-all duration-300 relative overflow-hidden"
    >
      {/* Subtle background ambient pulse during analysis */}
      {analyzing && (
        <div className="absolute inset-0 bg-radial from-sky-500/5 to-transparent pointer-events-none animate-pulse" />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-950 border border-sky-600 text-sky-400 shrink-0">
            <Sparkles className={`w-4 h-4 text-sky-300 ${analyzing ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                AI Visual Pattern Analysis
              </span>
              {analyzing ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-600 flex items-center gap-1.5 shadow-xs shadow-amber-950">
                  <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                  <span>ANALYZING DEFECT ({progress}%)</span>
                </span>
              ) : showCompletionFlash ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500 flex items-center gap-1 animate-pulse">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>CALIBRATION COMPLETE (100%)</span>
                </span>
              ) : analysis ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>ANALYSIS COMPLETE</span>
                </span>
              ) : null}
            </div>
            <p className="text-[10px] text-slate-400">
              Powered by <span className="text-sky-300 font-semibold">{analysis?.modelUsed || 'Gemini 3.8 Flash (Vision Engine)'}</span>
            </p>
          </div>
        </div>

        {/* Re-analyze Button */}
        <button
          type="button"
          id="btn-reanalyze-photo"
          onClick={onReanalyze}
          disabled={analyzing}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
          title="Re-run AI Visual Pattern Scan on current photo"
        >
          <RotateCw className={`w-3.5 h-3.5 text-sky-400 ${analyzing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{analyzing ? 'Scanning...' : 'Re-Scan'}</span>
        </button>
      </div>

      {/* ACTIVE ANALYZING STATE: Scanner Animation & Progress Bar */}
      {analyzing && (
        <div
          id="ai-analysis-progress-container"
          className="p-3 rounded-lg bg-slate-950/90 border border-sky-500/40 space-y-3 relative z-10 shadow-inner"
        >
          {/* Laser Scanning Viewport with Reticle Overlay */}
          <div className="relative w-full h-36 sm:h-44 bg-slate-900 rounded-lg overflow-hidden border border-sky-800/80 shadow-md flex items-center justify-center">
            {/* Background Defect Image with Dark Filter */}
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Defect Under AI Scan"
                className="w-full h-full object-cover opacity-65 filter contrast-125 brightness-90"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-radial from-slate-900 to-slate-950 text-slate-500">
                <Scan className="w-10 h-10 text-sky-400/50 mb-1" />
                <span className="text-[11px] font-mono text-slate-400">Optical Pattern Matrix</span>
              </div>
            )}

            {/* Tactical HUD Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#38bdf812_1px,transparent_1px),linear-gradient(to_bottom,#38bdf812_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

            {/* HUD Reticle Corner Brackets */}
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-sky-400 pointer-events-none" />
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-sky-400 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-sky-400 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-sky-400 pointer-events-none" />

            {/* Center Targeting Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-16 h-16 rounded-full border border-sky-400/30 flex items-center justify-center animate-spin">
                <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
              </div>
              <Crosshair className="absolute w-6 h-6 text-sky-400/70" />
            </div>

            {/* Sweeping Laser Beam Animation */}
            <motion.div
              animate={{ top: ['4%', '92%', '4%'] }}
              transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_12px_#38bdf8] pointer-events-none z-10"
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-cyan-300/40 blur-xs rounded-full" />
            </motion.div>

            {/* Ambient Vertical Scanning Light Cone */}
            <motion.div
              animate={{ top: ['-8%', '82%', '-8%'] }}
              transition={{ duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
              className="absolute inset-x-0 h-10 bg-gradient-to-b from-cyan-400/15 via-sky-500/10 to-transparent pointer-events-none"
            />

            {/* Dynamic AI Detection Region Boxes */}
            <AnimatePresence>
              {progress >= 20 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-4 left-6 px-2 py-1 bg-black/75 border border-sky-400/80 rounded text-[9px] font-mono text-sky-200 pointer-events-none flex items-center gap-1 shadow-md"
                >
                  <Target className="w-2.5 h-2.5 text-sky-300 animate-pulse" />
                  <span>ROI: Structural Surface</span>
                </motion.div>
              )}

              {progress >= 55 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 right-6 px-2 py-1 bg-black/75 border border-amber-400/80 rounded text-[9px] font-mono text-amber-200 pointer-events-none flex items-center gap-1 shadow-md"
                >
                  <Activity className="w-2.5 h-2.5 text-amber-300 animate-pulse" />
                  <span>Discontinuity Detected</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HUD Status Bar at Bottom of Scanner Viewport */}
            <div className="absolute inset-x-0 bottom-0 bg-black/85 backdrop-blur-xs px-2.5 py-1 border-t border-sky-900/60 flex items-center justify-between text-[9px] font-mono text-sky-300/90 z-20">
              <span className="flex items-center gap-1">
                <Cpu className="w-2.5 h-2.5 text-sky-400" />
                <span>IR-VISION: {assetId}</span>
              </span>
              <span className="text-slate-400">
                STAGE {activeStageIndex + 1}/4: {currentStage.name}
              </span>
              <span className="text-emerald-400 font-bold">
                {progress}% INFERENCING
              </span>
            </div>
          </div>

          {/* DYNAMIC PROGRESS BAR & STAGE FEEDBACK */}
          <div className="space-y-2 pt-1">
            {/* Stage Title and Progress Percentage */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-sky-200">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Stage {activeStageIndex + 1} of 4: {currentStage.shortLabel}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-sky-300">
                <span className="text-white text-sm">{progress}%</span>
                <span className="text-[10px] text-slate-400">Complete</span>
              </div>
            </div>

            {/* The Main Animated Progress Bar Track */}
            <div
              id="ai-defect-progress-bar-track"
              className="h-3 w-full bg-slate-950 rounded-full border border-sky-800/80 p-0.5 overflow-hidden relative shadow-inner"
            >
              <motion.div
                id="ai-defect-progress-bar-fill"
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 relative overflow-hidden shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                initial={{ width: '4%' }}
                animate={{ width: `${Math.max(progress, 4)}%` }}
                transition={{ duration: 0.1, ease: 'easeOut' }}
              >
                {/* Moving light shimmer inside progress bar */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-full"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>

            {/* Live Explanatory Stage Description */}
            <p className="text-[11px] text-slate-300 leading-relaxed min-h-[2rem] flex items-center">
              {currentStage.description}
            </p>

            {/* 4 Pipeline Stage Stepper Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              {INSPECTION_STAGES.map((stg, idx) => {
                const isPassed = progress > stg.threshold + 20 && activeStageIndex > idx;
                const isCurrent = activeStageIndex === idx;

                return (
                  <div
                    key={stg.id}
                    className={`px-2 py-1 rounded text-[10px] border flex items-center gap-1.5 font-mono transition-all ${
                      isPassed
                        ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300'
                        : isCurrent
                        ? 'bg-sky-950 border-sky-500 text-sky-200 ring-1 ring-sky-400/40 shadow-xs'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                  >
                    {isPassed ? (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3 h-3 text-sky-400 animate-spin shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600 shrink-0" />
                    )}
                    <span className="truncate">{stg.shortLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ANALYSIS RESULTS DISPLAY (When Analysis Complete) */}
      {!analyzing && analysis && (
        <div className="space-y-3 animate-in fade-in duration-300 relative z-10">
          {/* Priority Recommendation Highlight Banner */}
          <div
            className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              analysis.suggestedPriority === 'CRITICAL'
                ? 'bg-rose-950/50 border-rose-600/80 text-rose-200'
                : analysis.suggestedPriority === 'HIGH'
                ? 'bg-amber-950/50 border-amber-600/80 text-amber-200'
                : analysis.suggestedPriority === 'MEDIUM'
                ? 'bg-sky-950/50 border-sky-600/80 text-sky-200'
                : 'bg-emerald-950/50 border-emerald-600/80 text-emerald-200'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                  SUGGESTED MAINTENANCE PRIORITY:
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 border border-current font-bold">
                  {analysis.confidencePercent}% CONFIDENCE
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-wide font-mono">
                  {analysis.suggestedPriority}
                </span>
                <span className="text-xs text-slate-300">
                  • {analysis.detectedDefectCategory || 'Structural Defect'}
                </span>
              </div>
            </div>

            {/* One-Click Apply Button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-apply-ai-priority"
                onClick={() => handleApply(analysis.suggestedPriority)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                  isSeverityAligned
                    ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500 cursor-default'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white border border-rose-400 shadow-rose-950 hover:scale-102'
                }`}
                title="Apply AI recommended priority level to the defect report"
              >
                {isSeverityAligned ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Priority Applied ✓</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>Apply {analysis.suggestedPriority} Priority</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form Alignment Status */}
          <div className="flex items-center justify-between text-[11px] px-1">
            <div className="flex items-center gap-1.5">
              {isSeverityAligned ? (
                <span className="text-emerald-400 flex items-center gap-1 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Form Severity Level is aligned ({currentSeverity})
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Form currently set to <strong className="underline">{currentSeverity}</strong>. Suggested:{' '}
                  <strong className="underline">{analysis.suggestedPriority}</strong>.
                </span>
              )}
            </div>

            <span className="text-[10px] text-slate-500">
              Assessed {new Date(analysis.analyzedAt).toLocaleTimeString()}
            </span>
          </div>

          {/* Detected Visual Patterns Chips */}
          <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              DETECTED VISUAL PATTERNS & ANOMALIES:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis.detectedVisualPatterns.map((pattern, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 rounded text-[10.5px] bg-slate-900 border border-slate-700 text-slate-300 flex items-center gap-1"
                >
                  <Eye className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>{pattern}</span>
                </span>
              ))}
            </div>
          </div>

          {/* Structural Risk & Action Protocol */}
          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                STRUCTURAL RISK ASSESSMENT:
              </span>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                {analysis.structuralRiskSummary}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                RECOMMENDED ACTION PROTOCOL:
              </span>
              <p className="text-xs text-sky-300 leading-relaxed mt-0.5">
                {analysis.recommendedImmediateAction}
              </p>
            </div>
          </div>

          {/* Quick Helper Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Optional Speed Restriction Sync */}
              {hasSpeedSuggestion && (
                <button
                  type="button"
                  id="btn-apply-speed-restriction"
                  onClick={() => handleApplySpeed(analysis.suggestedSpeedRestrictionKmph!)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors border cursor-pointer ${
                    isSpeedAligned
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-700/80'
                  }`}
                  title="Apply suggested speed restriction to form"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>
                    {isSpeedAligned
                      ? `Speed Set to ${analysis.suggestedSpeedRestrictionKmph} km/h ✓`
                      : `Set Speed: ${analysis.suggestedSpeedRestrictionKmph} km/h`}
                  </span>
                </button>
              )}

              {/* Append Notes to Description */}
              {onAppendToDescription && (
                <button
                  type="button"
                  id="btn-append-ai-notes"
                  onClick={handleAppendText}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-mono border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Append AI diagnosis details into the Description field"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>Append to Description</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
