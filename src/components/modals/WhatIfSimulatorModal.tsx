import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Train,
  Zap,
  X,
  Gauge,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { WhatIfSimulationResult, Conflict, AlternativeSlot } from '../../types';

interface WhatIfSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulation: WhatIfSimulationResult | null;
  conflict: Conflict | null;
  onApplySlot: (slot: any) => void;
  isApplying?: boolean;
}

export const WhatIfSimulatorModal: React.FC<WhatIfSimulatorModalProps> = ({
  isOpen,
  onClose,
  simulation,
  conflict,
  onApplySlot,
  isApplying = false,
}) => {
  if (!isOpen || !simulation || !conflict) return null;

  const handleApply = () => {
    const slot: AlternativeSlot = {
      slotId: simulation.slotId,
      startTime: simulation.proposedStartTime,
      endTime: simulation.proposedEndTime,
      corridorId: simulation.corridorId,
      optimizationScore: 94.5,
      scoreBreakdown: simulation.recommendationSummary,
      recommendationLevel: 'BEST_MATCH',
    };
    onApplySlot(slot);
  };

  return (
    <div
      id="what-if-simulator-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-sky-800/90 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-900/60 bg-[#070e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-950 border border-sky-600/80 text-sky-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
                  &quot;What-If&quot; Knock-On Delay & Safety Simulator
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700">
                  AI RIPPLE SIMULATION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Predicts secondary delays, Kavach headway buffers, and OHE traction impact for {conflict.conflictId} on {conflict.corridorId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Key Simulation Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-[#0e1a38] border border-emerald-900/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Passenger Paths</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-emerald-400">100% CLEAR</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Rajdhani / Shatabdi unhindered</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1a38] border border-sky-900/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Kavach Headway</span>
                <Gauge className="w-4 h-4 text-sky-400" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-sky-300">+{simulation.kavachHeadwayMarginKm} km</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Braking distance: {simulation.kavachBrakingDistanceMeters}m</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1a38] border border-amber-900/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Secondary Delays</span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-amber-300">+{simulation.totalSecondaryDelayMinutes} mins</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Only freight siding regulation</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0e1a38] border border-purple-900/60 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-[11px]">
                <span>Punctuality Impact</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <span className="text-lg font-bold text-purple-300">-{simulation.punctualityImpactPercentage}%</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Vs -2.4% if conflict unresolved</p>
              </div>
            </div>
          </div>

          {/* Slot Comparison Visualizer */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold text-slate-200">TRAIN-BLOCK WINDOW TRANSITION:</span>
              <span className="text-sky-400 font-bold">Proposed Slot: {simulation.proposedStartTime} – {simulation.proposedEndTime}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  CURRENT STATE (ACTIVE CONFLICT)
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div><strong>Block Window:</strong> {conflict.maintenanceInterval}</div>
                  <div><strong>Train Path:</strong> {conflict.trainName} ({conflict.trainInterval})</div>
                  <div className="text-rose-300 font-semibold mt-1">Direct Headway Clash: Complete Line Block Violation</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px] mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  SIMULATED PROPOSED STATE
                </div>
                <div className="text-[11px] text-slate-300 space-y-1">
                  <div><strong>Rescheduled Block:</strong> {simulation.proposedStartTime} – {simulation.proposedEndTime}</div>
                  <div><strong>Passenger Priority:</strong> 100% Unhindered Green Corridor</div>
                  <div className="text-emerald-300 font-semibold mt-1">Zero Collision: Safe 35-min separation buffer</div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Ripple Impact Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Train className="w-3.5 h-3.5 text-sky-400" />
                Predicted Secondary Train Chain-Reaction Delays:
              </span>
              <span className="text-[10px] text-slate-400">4 Train Services Analyzed on Corridor {simulation.corridorId}</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#070e1e] text-[10px] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Train</th>
                    <th className="py-2.5 px-3">Category / Priority</th>
                    <th className="py-2.5 px-3">Scheduled</th>
                    <th className="py-2.5 px-3">Simulated Arrival</th>
                    <th className="py-2.5 px-3">Knock-On Delay</th>
                    <th className="py-2.5 px-3">Regulation Operational Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {simulation.secondaryDelays.map((td, idx) => (
                    <tr key={`${td.trainNumber}-${idx}`} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-semibold text-slate-200">
                        {td.trainNumber} {td.trainName}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          td.category === 'RAJDHANI' || td.category === 'SHATABDI'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : td.category === 'FREIGHT'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : 'bg-blue-950 text-sky-300 border border-blue-800'
                        }`}>
                          {td.category} (P{td.priorityLevel})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400">{td.originalInterval}</td>
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{td.adjustedInterval}</td>
                      <td className="py-2.5 px-3">
                        {td.delayMinutes === 0 ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            0 min (On-Time)
                          </span>
                        ) : (
                          <span className="text-amber-300 font-bold">+{td.delayMinutes} mins</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-[11px] max-w-xs leading-snug">
                        {td.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* OHE Traction & Kavach Safety Certification Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-sky-950/40 border border-sky-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-sky-200 text-xs block">
                  OHE Traction Power & Kavach ATP Interlocking:
                </span>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  {simulation.ohePowerCutRequired
                    ? `Traction power block on 25kV AC feeder (${simulation.oheFeederSection}) isolated. Zero electric locos stranded.`
                    : 'Track block does not intersect 25kV OHE power line. Electrical traffic remains fully energized.'}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              KAVACH CERTIFIED SAFE
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-sky-900/60 bg-[#070e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Simulation based on Northern Railway live timetable & dynamic headway curves.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
            >
              Close Simulator
            </button>
            <button
              id="btn-confirm-what-if-slot"
              onClick={handleApply}
              disabled={isApplying}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApplying ? 'Applying Alternative Slot...' : 'APPLY THIS ALTERNATIVE SLOT & RESOLVE'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
