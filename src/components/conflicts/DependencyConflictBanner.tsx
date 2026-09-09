import React, { useState } from 'react';
import {
  AlertTriangle,
  Zap,
  Wrench,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Conflict } from '../../types';
import { DependencyReconciliationModal } from './DependencyReconciliationModal';
import { resolveDependencyConflict, resetDependencyConflict } from '../../services/api';

interface DependencyConflictBannerProps {
  conflicts: Conflict[];
  onRefreshConflicts: () => void;
  onNavigateToConflicts?: () => void;
  className?: string;
  compact?: boolean;
}

export const DependencyConflictBanner: React.FC<DependencyConflictBannerProps> = ({
  conflicts,
  onRefreshConflicts,
  onNavigateToConflicts,
  className = '',
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQuickApplying, setIsQuickApplying] = useState(false);

  // Find active dependency conflict
  const dependencyConflict = conflicts.find(
    (c) => c.conflictType === 'DEPENDENCY_CONFLICT' || c.conflictId === 'CONF-DEP-001'
  );

  if (!dependencyConflict) return null;

  const isOpen = dependencyConflict.status === 'OPEN';
  const details = dependencyConflict.dependencyDetails;
  const bestShift = details?.proposedTimeShifts?.[0];

  const handleQuickReconcile = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!bestShift) return;
    setIsQuickApplying(true);
    try {
      await resolveDependencyConflict(dependencyConflict.conflictId, bestShift);
      onRefreshConflicts();
    } catch (err) {
      console.error('Quick reconcile failed:', err);
    } finally {
      setIsQuickApplying(false);
    }
  };

  const handleReset = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await resetDependencyConflict(dependencyConflict.conflictId);
    onRefreshConflicts();
  };

  return (
    <>
      <div
        className={`w-full rounded-2xl transition-all shadow-xl overflow-hidden ${
          isOpen
            ? 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-slate-900 border-2 border-amber-500/60 shadow-amber-950/30'
            : 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-emerald-950/20'
        } ${className}`}
      >
        <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* LEFT: STATUS & DETAILS */}
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 flex items-center justify-center border shadow-inner ${
                isOpen
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {isOpen ? <Zap className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono border ${
                    isOpen
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {isOpen ? 'Dependency Conflict Flagged' : 'Dependency Resolved'}
                </span>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {details?.corridorId || 'C003'} • {details?.section || 'KM 28/4 to 34/2'}
                </span>

                {isOpen && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono">
                    75m Overlap Clash
                  </span>
                )}
              </div>

              <h4 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>
                  {isOpen
                    ? 'Electrical Block vs. Concurrent Track Maintenance Clashing'
                    : 'Electrical & Track Maintenance Synchronized with Safety Buffer'}
                </span>
              </h4>

              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                {isOpen ? (
                  <>
                    <strong className="text-amber-300">Electrical {details?.electricalBlockId || 'BLK-T012'}</strong> (OHE Power Isolation {details?.electricalTime || '14:00–15:30'}) collides with{' '}
                    <strong className="text-sky-300">Track {details?.trackBlockId || 'BLK-E014'}</strong> (Heavy Tamper 09-3X {details?.trackTime || '14:15–15:45'}). Under ACTM & IRPWM, simultaneous tamping alters catenary wire height and breaks discharge earthing rods.
                  </>
                ) : (
                  <>
                    {dependencyConflict.resolutionNotes ||
                      'Schedule reconciled via time shift. Sequential execution established with certified 15-minute inter-departmental safety buffer.'}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* RIGHT: ACTIONS */}
          <div className="flex items-center gap-2.5 shrink-0 self-end md:self-auto flex-wrap">
            {isOpen ? (
              <>
                <button
                  id="propose-time-shift-btn"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/60 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                  <span>Propose Time Shift</span>
                </button>

                <button
                  onClick={handleQuickReconcile}
                  disabled={isQuickApplying}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Quick-apply recommended time shift (+120 min)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Quick Reconcile</span>
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>15m Safety Buffer Locked</span>
                </div>

                <button
                  onClick={handleReset}
                  className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Simulate re-clashing for live presentation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Simulate Re-Clash</span>
                </button>
              </>
            )}

            {onNavigateToConflicts && (
              <button
                onClick={onNavigateToConflicts}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                title="View in Conflict Management Screen"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RECONCILIATION MODAL */}
      <DependencyReconciliationModal
        conflict={dependencyConflict}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onResolved={() => {
          onRefreshConflicts();
        }}
      />
    </>
  );
};
