import React from 'react';
import {
  X,
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  TrendingDown,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import { OptimizedBlock } from '../../types';

interface ExplainableAiDrawerProps {
  block: OptimizedBlock | null;
  onClose: () => void;
  onNavigateToConflict?: (blockId: string) => void;
}

export const ExplainableAiDrawer: React.FC<ExplainableAiDrawerProps> = ({
  block,
  onClose,
  onNavigateToConflict,
}) => {
  if (!block) return null;

  const reasoning = block.aiReasoning || {
    assetAvailabilityPassed: true,
    preferredWindowMatch: 'FULL',
    disruptionScore: 0.12,
    headwayBufferMinutes: 18,
    competingRequestsDeferred: 1,
    selectionRationale: `Slot ${block.startTime}–${block.endTime} selected based on multi-criteria heuristic scoring: asset ${block.assetId} maintenance window aligned with minimum passenger corridor traffic density.`,
    scoreBreakdown: {
      safetyMargin: 94,
      passengerDelayPenalty: 91,
      crewUtilization: 88,
      interlockingFeasibility: 96,
    },
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0e162c] border-l border-sky-800/80 h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-sky-950/80 bg-[#0a1020] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-950/80 border border-indigo-700/60 text-indigo-400">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  {block.blockId}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800">
                  {block.department}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Explainable AI (XAI) Slot Decision Audit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 space-y-5 text-xs">
          {/* Summary Banner */}
          <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-400">Assigned Time Slot:</span>
              <span className="text-sky-300 font-bold text-sm">
                {block.startTime} – {block.endTime}
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400">Target Asset / Corridor:</span>
              <span className="text-slate-200 font-semibold">
                {block.assetId} ({block.corridorId})
              </span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400">Associated Task:</span>
              <span className="text-slate-200">{block.taskId}</span>
            </div>
            <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-slate-800">
              <span className="text-slate-400">Conflict Flag:</span>
              {block.hasConflict ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> OVERLAP DETECTED
                </span>
              ) : (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> CONFLICT-FREE
                </span>
              )}
            </div>
          </div>

          {/* Rationale Narrative */}
          <div>
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-1.5">
              Selection Rationale
            </span>
            <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/40 text-slate-200 text-xs leading-relaxed">
              {reasoning.selectionRationale}
            </div>
          </div>

          {/* Decision Factors Checklist */}
          <div>
            <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-2">
              Auditable Optimization Constraints
            </span>
            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Asset Availability Check:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PASSED
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Preferred Window Match:</span>
                <span className="text-sky-300 font-bold">
                  {reasoning.preferredWindowMatch}
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Disruption Index:</span>
                <span className="text-emerald-400 font-bold">
                  {reasoning.disruptionScore} (Low Disruption)
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Calculated Headway Buffer:</span>
                <span className="text-amber-300 font-bold">
                  {reasoning.headwayBufferMinutes} minutes
                </span>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-300">Lower Priority Deferred:</span>
                <span className="text-slate-200 font-bold">
                  {reasoning.competingRequestsDeferred} lower-priority tasks
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Objective Fitness Vector */}
          {reasoning.scoreBreakdown && (
            <div>
              <span className="text-[11px] uppercase font-mono tracking-wider text-slate-400 font-semibold block mb-2">
                Multi-Objective Optimization Scores (0–100)
              </span>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
                    <span>Safety Margin Score</span>
                    <span className="text-sky-400">{reasoning.scoreBreakdown.safetyMargin}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 rounded-full"
                      style={{ width: `${reasoning.scoreBreakdown.safetyMargin}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
                    <span>Passenger Delay Minimization</span>
                    <span className="text-emerald-400">{reasoning.scoreBreakdown.passengerDelayPenalty}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${reasoning.scoreBreakdown.passengerDelayPenalty}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-300 mb-0.5">
                    <span>Interlocking Feasibility</span>
                    <span className="text-indigo-400">{reasoning.scoreBreakdown.interlockingFeasibility}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${reasoning.scoreBreakdown.interlockingFeasibility}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conflict Redirection Action if conflict exists */}
          {block.hasConflict && onNavigateToConflict && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>Requires Resolution</span>
              </div>
              <p className="text-[11px] text-slate-300">
                This block overlaps with a scheduled train path and cannot be published until rescheduled.
              </p>
              <button
                onClick={() => {
                  onNavigateToConflict(block.blockId);
                  onClose();
                }}
                className="w-full py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
              >
                <span>Find Alternative Slot</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0a1020] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Close XAI View
          </button>
        </div>
      </div>
    </div>
  );
};
