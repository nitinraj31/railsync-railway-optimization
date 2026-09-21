import React, { useState, useEffect } from 'react';
import {
  CloudUpload,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Database,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  scheduleAutoSaveService,
  ScheduleAutoSaveState,
  ScheduleChangeRecord,
} from '../../services/scheduleAutoSaveService';

interface ScheduleAutoSaveNotificationProps {
  onCommitSuccess?: () => void;
  className?: string;
}

export const ScheduleAutoSaveNotification: React.FC<ScheduleAutoSaveNotificationProps> = ({
  onCommitSuccess,
  className = '',
}) => {
  const [autoSaveState, setAutoSaveState] = useState<ScheduleAutoSaveState>(
    scheduleAutoSaveService.getState()
  );
  const [showDiffModal, setShowDiffModal] = useState<boolean>(false);
  const [justCommitted, setJustCommitted] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribe = scheduleAutoSaveService.subscribe((newState) => {
      setAutoSaveState(newState);
    });
    return () => unsubscribe();
  }, []);

  // Flash animation trigger whenever a new change is auto-saved
  useEffect(() => {
    if (autoSaveState.flashTrigger > 0) {
      setIsFlashing(true);
      const timer = setTimeout(() => {
        setIsFlashing(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [autoSaveState.flashTrigger]);

  // Global hotkey (Ctrl+S / Cmd+S) to commit uncommitted schedule changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (autoSaveState.uncommittedChanges.length > 0 && !autoSaveState.isCommitting) {
          e.preventDefault();
          handleCommit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [autoSaveState.uncommittedChanges.length, autoSaveState.isCommitting]);

  const handleCommit = async () => {
    const res = await scheduleAutoSaveService.commitChangesToBackend();
    if (res.success) {
      setJustCommitted(true);
      setShowDiffModal(false);
      onCommitSuccess?.();
      setTimeout(() => {
        setJustCommitted(false);
      }, 5000);
    }
  };

  const handleDiscard = () => {
    if (
      window.confirm(
        `Are you sure you want to discard ${autoSaveState.uncommittedChanges.length} uncommitted schedule change(s)? Draft changes will be reverted.`
      )
    ) {
      scheduleAutoSaveService.discardUncommittedChanges();
      setShowDiffModal(false);
      onCommitSuccess?.();
    }
  };

  const hasUncommitted = autoSaveState.uncommittedChanges.length > 0;
  const recentChange = autoSaveState.uncommittedChanges[0];

  // If no uncommitted changes and didn't just commit, render compact idle indicator or return null
  if (!hasUncommitted && !justCommitted) {
    return (
      <div
        id="schedule-autosave-idle-bar"
        className={`bg-[#0a1128]/80 border border-sky-950/70 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500/50 animate-ping absolute"></span>
          </div>
          <span className="text-slate-300 font-medium">
            Schedule Synchronized:
          </span>
          <span className="text-slate-400">
            {autoSaveState.lastCommittedAt
              ? `Last committed at ${autoSaveState.lastCommittedAt}`
              : 'All corridor blocking schedules up to date'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => scheduleAutoSaveService.simulateQuickScheduleChange()}
            className="px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-sky-300 hover:text-sky-200 border border-slate-700 text-[11px] font-mono flex items-center gap-1.5 transition-colors shadow-sm"
            title="Simulate a blocking schedule time shift to test the auto-save flash and commit flow"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Test Schedule Change</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="schedule-autosave-notification-card"
      className={`relative rounded-2xl transition-all duration-300 shadow-2xl overflow-hidden ${
        justCommitted
          ? 'bg-gradient-to-r from-emerald-950/90 via-slate-900 to-[#081026] border-2 border-emerald-500/60 shadow-emerald-950/40'
          : isFlashing
          ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950/80 border-2 border-amber-400 shadow-amber-500/30 ring-4 ring-amber-500/20'
          : 'bg-gradient-to-r from-amber-950/80 via-slate-900 to-[#081026] border-2 border-amber-500/60 shadow-amber-950/40'
      } ${className}`}
    >
      {/* Visual pulse glow bar on top edge */}
      <div
        className={`h-1 w-full ${
          justCommitted
            ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400'
            : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 animate-pulse'
        }`}
      />

      <div className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* LEFT: STATUS, FLASH INDICATOR & RECENT CHANGE INFO */}
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-xl shrink-0 flex items-center justify-center border shadow-inner transition-all ${
                justCommitted
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : isFlashing
                  ? 'bg-amber-400/30 text-amber-300 border-amber-400 animate-bounce'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
              }`}
            >
              {justCommitted ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <div className="relative flex items-center justify-center">
                  <Database className="w-6 h-6 text-amber-400" />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {justCommitted ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Changes Committed to Backend
                  </span>
                ) : (
                  <>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold tracking-wide uppercase border flex items-center gap-1.5 ${
                        isFlashing
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-400/50 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Auto-Saved Draft Ready
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
                      {autoSaveState.uncommittedChanges.length} Uncommitted Revision
                      {autoSaveState.uncommittedChanges.length > 1 ? 's' : ''}
                    </span>
                  </>
                )}

                {autoSaveState.lastAutoSavedAt && (
                  <span className="text-[11px] font-mono text-amber-300/80 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Auto-saved at {autoSaveState.lastAutoSavedAt}</span>
                  </span>
                )}
              </div>

              {/* Description */}
              {justCommitted ? (
                <p className="text-xs text-slate-300">
                  All schedule modifications have been committed to the Railway
                  Operations backend and synchronized with the Indian Railways NTP
                  server.
                </p>
              ) : (
                <div className="text-xs text-slate-300">
                  {recentChange ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-100">
                        {recentChange.blockId}:
                      </span>
                      <span>{recentChange.changeDescription}</span>
                    </div>
                  ) : (
                    <span>
                      Modifications detected in blocking schedules. Changes are currently
                      preserved in local draft memory.
                    </span>
                  )}
                  <p className="text-[11px] text-amber-400/90 mt-0.5 font-mono">
                    ⚠️ Changes must be committed to the backend to notify the Central
                    Control Room, update train charts, and publish caution orders.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CALL TO ACTION BUTTONS */}
          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center flex-wrap">
            {hasUncommitted && (
              <>
                <button
                  type="button"
                  onClick={() => setShowDiffModal(!showDiffModal)}
                  className="px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="View side-by-side diff of uncommitted schedule revisions"
                >
                  <span>Review Revisions ({autoSaveState.uncommittedChanges.length})</span>
                  {showDiffModal ? (
                    <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={autoSaveState.isCommitting}
                  className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-mono flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Discard local draft changes and revert to last committed schedule"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard</span>
                </button>

                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={autoSaveState.isCommitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-amber-950/50 transition-all active:scale-95 disabled:opacity-60"
                  title="Commit changes to remote backend server (Ctrl+S / Cmd+S)"
                >
                  {autoSaveState.isCommitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Committing to Backend...</span>
                    </>
                  ) : (
                    <>
                      <CloudUpload className="w-4 h-4" />
                      <span>Commit Changes to Backend</span>
                      <span className="hidden sm:inline-block px-1.5 py-0.2 rounded bg-slate-950/20 text-slate-900 text-[10px] border border-slate-950/20">
                        ⌘S
                      </span>
                    </>
                  )}
                </button>
              </>
            )}

            {justCommitted && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-700/50">
                <CheckCircle2 className="w-4 h-4" />
                <span>Synchronized with Central Backend</span>
              </span>
            )}
          </div>
        </div>

        {/* EXPANDABLE REVISIONS DIFF DRAWER */}
        <AnimatePresence>
          {showDiffModal && hasUncommitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-slate-800/80 space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="font-semibold text-slate-300">
                  SCHEDULE MODIFICATION DIFF ({autoSaveState.uncommittedChanges.length} BLOCK
                  {autoSaveState.uncommittedChanges.length > 1 ? 'S' : ''})
                </span>
                <span className="text-[11px] text-amber-400">
                  Auto-saved in browser local storage
                </span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {autoSaveState.uncommittedChanges.map((change) => (
                  <div
                    key={change.id}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-300">
                          {change.blockId}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {change.corridorId}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {change.department}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        {change.changeDescription}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded border border-slate-800 shrink-0">
                      <span className="text-slate-400 line-through">
                        {change.oldValue}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-emerald-400 font-bold">
                        {change.newValue}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-slate-400">
                <span>
                  Pressing <strong>Commit Changes to Backend</strong> writes updates to the
                  Railway Server and generates formal audit logs.
                </span>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={autoSaveState.isCommitting}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
                >
                  Commit Now →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
