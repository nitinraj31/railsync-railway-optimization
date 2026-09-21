import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  Wrench,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  X,
  RotateCcw,
  Check,
  AlertCircle,
  FileText,
  Sliders,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Conflict, ProposedTimeShift } from '../../types';
import { resolveDependencyConflict, resetDependencyConflict } from '../../services/api';
import { scheduleAutoSaveService } from '../../services/scheduleAutoSaveService';

interface DependencyReconciliationModalProps {
  conflict: Conflict;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export const DependencyReconciliationModal: React.FC<DependencyReconciliationModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolved,
}) => {
  const details = conflict.dependencyDetails;
  const shifts = details?.proposedTimeShifts || [];

  const [selectedShiftId, setSelectedShiftId] = useState<string>(
    shifts[0]?.shiftId || 'SHIFT-01'
  );
  const [isApplying, setIsApplying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reconciledResult, setReconciledResult] = useState<ProposedTimeShift | null>(null);

  if (!isOpen) return null;

  const selectedShift = shifts.find((s) => s.shiftId === selectedShiftId) || shifts[0];

  const handleApplyShift = async () => {
    if (!selectedShift) return;
    setIsApplying(true);
    try {
      await resolveDependencyConflict(conflict.conflictId, selectedShift);
      scheduleAutoSaveService.registerScheduleChange({
        blockId: selectedShift.targetBlockId,
        corridorId: conflict.corridorId,
        department: 'ELECTRICAL',
        section: 'OHE Sector 4A (25kV AC)',
        fieldModified: 'SCHEDULE_SLOT',
        oldValue: selectedShift.currentSlot,
        newValue: selectedShift.proposedSlot,
        changeDescription: `Dependency conflict reconciled: ${selectedShift.targetBlockTitle} shifted from ${selectedShift.currentSlot} to ${selectedShift.proposedSlot} (+${selectedShift.safetyBufferMinutes}m safety buffer).`,
        impactSummary: `Corridor ${conflict.corridorId} | Inter-departmental safety clearance established`,
      });
      setReconciledResult(selectedShift);
      setIsSuccess(true);
      onResolved();
    } catch (err) {
      console.error('Failed to reconcile dependency conflict:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleResetForDemo = async () => {
    await resetDependencyConflict(conflict.conflictId);
    setIsSuccess(false);
    setReconciledResult(null);
    onResolved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* MODAL HEADER */}
        <div className="p-6 bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                  Dependency Conflict Engine
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                  ACTM & IRPWM Safety Violation
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">
                Electrical vs. Track Maintenance Reconciliation
              </h2>
              <p className="text-xs text-slate-400">
                Corridor {details?.corridorId || 'C003'} • Section {details?.section || 'KM 28/4 to 34/2'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* SUCCESS RECONCILED VIEW */}
          {isSuccess && reconciledResult ? (
            <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-emerald-200">
                  Dependency Conflict Successfully Reconciled!
                </h3>
                <p className="text-sm text-emerald-300/80 mt-1 max-w-lg mx-auto">
                  {reconciledResult.targetBlockTitle} has been rescheduled to{' '}
                  <strong className="text-white font-mono">{reconciledResult.proposedSlot}</strong>.
                  A verified <strong className="text-emerald-200">{reconciledResult.safetyBufferMinutes}-minute</strong> inter-departmental safety buffer is now locked in.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left text-xs">
                <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-800/40">
                  <div className="text-slate-400 text-[10px] font-mono uppercase">Applied Slot</div>
                  <div className="font-bold text-white mt-0.5">{reconciledResult.proposedSlot}</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-800/40">
                  <div className="text-slate-400 text-[10px] font-mono uppercase">Inter-Dept Clearance</div>
                  <div className="font-bold text-emerald-400 mt-0.5">+{reconciledResult.safetyBufferMinutes}m Safety Window</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/90 border border-emerald-800/40">
                  <div className="text-slate-400 text-[10px] font-mono uppercase">Safety Compliance</div>
                  <div className="font-bold text-emerald-400 mt-0.5">ACTM / IRPWM Certified</div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/40 transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={handleResetForDemo}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Reset to clashing state to test again"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-test Conflict Simulation</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* SIDE BY SIDE CONFLICTING BLOCKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ELECTRICAL BLOCK CARD */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 border-b border-l border-amber-500/30 text-[10px] font-mono text-amber-300 font-bold uppercase rounded-bl-lg">
                    Traction (TRD)
                  </div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
                    <Zap className="w-4 h-4" />
                    <span>{details?.electricalBlockId || 'BLK-T012'}: OHE Power Isolation</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 font-medium">
                    {details?.electricalTask || 'OHE Power Isolation & Cantilever Replacement'}
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Time Window:</span>
                      <span className="text-amber-300 font-bold">{details?.electricalTime || '14:00–15:30'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Asset Target:</span>
                      <span className="text-slate-200">{details?.electricalAssetId || 'A017 (Cantilever Mast)'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Permit Status:</span>
                      <span className="text-rose-400 font-bold">LOCKED IN COLLISION</span>
                    </div>
                  </div>
                </div>

                {/* TRACK MAINTENANCE BLOCK CARD */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-sky-500/20 border-b border-l border-sky-500/30 text-[10px] font-mono text-sky-300 font-bold uppercase rounded-bl-lg">
                    Engineering (P-Way)
                  </div>
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm mb-2">
                    <Wrench className="w-4 h-4" />
                    <span>{details?.trackBlockId || 'BLK-E014'}: Track Tamper 09-3X</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3 font-medium">
                    {details?.trackTask || 'Continuous Heavy Track Tamping & Dynamic Stabilization'}
                  </p>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Time Window:</span>
                      <span className="text-sky-300 font-bold">{details?.trackTime || '14:15–15:45'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Asset Target:</span>
                      <span className="text-slate-200">{details?.trackAssetId || 'A018 (Ballast Bed Section)'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Permit Status:</span>
                      <span className="text-rose-400 font-bold">LOCKED IN COLLISION</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* HAZARD DESCRIPTION BOX */}
              <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Physical & Electrical Safety Clashing Explanation</span>
                </div>
                <p className="text-xs text-rose-200/90 leading-relaxed">
                  {details?.hazardExplanation ||
                    'Under ACTM Vol II Para 20.3 & IRPWM Para 6.4, heavy track machine tamping (exceeding 25mm track lift) is strictly prohibited while TRD earthing discharge rods are anchored to overhead catenary wires. Risk of contact wire snagging and loss of traction return circuit bonding.'}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-rose-300 font-mono pt-1">
                  <span className="px-1.5 py-0.5 rounded bg-rose-900/60 border border-rose-700/50">
                    Direct Collision: {details?.overlapMinutes || 75} Minutes (14:15–15:30)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span>Safety Ref: {details?.safetyRuleViolation || 'ACTM Vol II / IRPWM'}</span>
                </div>
              </div>

              {/* VISUAL TIMELINE COMPARISON: BEFORE VS PROPOSED */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Visual Conflict Timeline (Before vs. After Shift)</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">Span: 13:30 to 18:00</span>
                </div>

                {/* CURRENT OVERLAPPING TIMELINE */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Current: Severe Overlap Collision
                    </span>
                    <span className="text-rose-400">75 min contention</span>
                  </div>
                  <div className="relative h-9 bg-slate-900 rounded-lg overflow-hidden border border-rose-900/50 flex items-center px-2">
                    {/* Electrical bar */}
                    <div
                      className="absolute top-1.5 h-3 rounded bg-amber-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5 shadow"
                      style={{ left: '15%', width: '40%' }}
                    >
                      BLK-T012 (14:00–15:30)
                    </div>
                    {/* Track bar */}
                    <div
                      className="absolute bottom-1.5 h-3 rounded bg-sky-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5 shadow"
                      style={{ left: '22%', width: '40%' }}
                    >
                      BLK-E014 (14:15–15:45)
                    </div>
                    {/* Conflict clash zone */}
                    <div
                      className="absolute top-0 bottom-0 bg-rose-500/25 border-x-2 border-rose-500 flex items-center justify-center text-[10px] font-bold text-rose-200"
                      style={{ left: '22%', width: '33%' }}
                    >
                      ⚠️ CLASH ZONE
                    </div>
                  </div>
                </div>

                {/* RECONCILED TIMELINE PREVIEW */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Proposed: Sequential with Safety Clearance
                    </span>
                    <span className="text-emerald-400">+{selectedShift?.safetyBufferMinutes || 15}m Buffer</span>
                  </div>
                  <div className="relative h-9 bg-slate-900 rounded-lg overflow-hidden border border-emerald-900/50 flex items-center px-2">
                    {selectedShift?.targetDepartment === 'TRACTION' ? (
                      <>
                        {/* Track bar unchanged */}
                        <div
                          className="absolute top-1.5 h-3 rounded bg-sky-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5"
                          style={{ left: '22%', width: '40%' }}
                        >
                          BLK-E014 (14:15–15:45)
                        </div>
                        {/* Buffer zone */}
                        <div
                          className="absolute top-0 bottom-0 bg-emerald-500/20 border-x border-emerald-500/40 flex items-center justify-center text-[9px] font-mono text-emerald-300"
                          style={{ left: '62%', width: '6%' }}
                        >
                          Buffer
                        </div>
                        {/* Shifted Electrical bar */}
                        <div
                          className="absolute bottom-1.5 h-3 rounded bg-amber-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5 shadow animate-pulse"
                          style={{ left: '68%', width: '30%' }}
                        >
                          BLK-T012 (16:00–17:30)
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Electrical bar */}
                        <div
                          className="absolute top-1.5 h-3 rounded bg-amber-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5"
                          style={{ left: '15%', width: '40%' }}
                        >
                          BLK-T012 (14:00–15:30)
                        </div>
                        {/* Shifted track bar */}
                        <div
                          className="absolute bottom-1.5 h-3 rounded bg-sky-500 text-[9px] font-mono text-slate-950 font-bold flex items-center px-1.5 shadow"
                          style={{ left: '70%', width: '28%' }}
                        >
                          Shifted ({selectedShift?.proposedSlot})
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* INTELLIGENT TIME SHIFT PROPOSALS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Time Shift Proposal</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Calculated by AI Railway Conflict Engine
                  </span>
                </div>

                <div className="space-y-2.5">
                  {shifts.map((shift) => {
                    const isSelected = shift.shiftId === selectedShiftId;
                    return (
                      <div
                        key={shift.shiftId}
                        onClick={() => setSelectedShiftId(shift.shiftId)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-950/30 border-amber-500/70 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/50'
                            : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-5 h-5 rounded-full mt-0.5 flex items-center justify-center border transition-colors ${
                                isSelected
                                  ? 'bg-amber-500 border-amber-400 text-slate-950'
                                  : 'border-slate-700 bg-slate-900 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-white">
                                  {shift.targetBlockTitle}
                                </span>
                                {shift.recommendationLevel === 'BEST_MATCH' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider font-mono">
                                    Recommended / Best Match
                                  </span>
                                )}
                                {shift.recommendationLevel === 'JOINT_BLOCK' && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider font-mono">
                                    Joint JPO Protocol
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 leading-relaxed">
                                {shift.rationale}
                              </p>
                              <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                                <span className="text-amber-300">
                                  Reschedule: <strong>{shift.currentSlot}</strong> ➔{' '}
                                  <strong className="text-white font-bold">{shift.proposedSlot}</strong>
                                </span>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold">
                                  +{shift.safetyBufferMinutes}m Safety Buffer
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-slate-400 font-mono uppercase">
                              Punctuality Impact
                            </div>
                            <div className="text-xs font-bold text-emerald-400">
                              0 Train Delays
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* MODAL FOOTER */}
        {!isSuccess && (
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Safety Rule: JPO Form T/351 Disconnection Synchronized</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                id="apply-time-shift-btn"
                onClick={handleApplyShift}
                disabled={isApplying || !selectedShift}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Applying Time Shift...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Apply Time Shift & Reconcile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
