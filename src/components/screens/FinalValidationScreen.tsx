import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  Unlock,
  ArrowRight,
  Send,
  Printer,
  FileCheck,
  RotateCcw,
  Sparkles,
  Layers,
  FileSpreadsheet,
  ExternalLink,
  Download,
} from 'lucide-react';
import { ValidationResult, PublicationWorkflowState, User, Corridor, OptimizedBlock } from '../../types';
import { publishSchedule, resolveAllRemainingConflicts, revokePublication } from '../../services/api';
import { PublishedScheduleModal } from '../modals/PublishedScheduleModal';
import { printOfficialBulletin, exportBulletinAsHTML, exportBulletinAsCSV } from '../../services/exportBulletinService';

interface FinalValidationScreenProps {
  currentUser: User | null;
  validation: ValidationResult;
  publicationState: PublicationWorkflowState;
  corridors?: Corridor[];
  blocks?: OptimizedBlock[];
  onRefreshValidation: () => void;
  onNavigateToConflict: (blockId?: string) => void;
  onNavigateToAudit: () => void;
}

export const FinalValidationScreen: React.FC<FinalValidationScreenProps> = ({
  currentUser,
  validation,
  publicationState,
  corridors = [],
  blocks = [],
  onRefreshValidation,
  onNavigateToConflict,
  onNavigateToAudit,
}) => {
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [publishedData, setPublishedData] = useState<{
    success: boolean;
    scheduleId: string;
    publishedAt: string;
  } | null>(null);

  const isSafe = validation.status === 'SAFE_TO_PUBLISH';
  const isPublished = publicationState.currentState === 'PUBLISHED';

  const handlePublish = async (autoResolveIfBlocked = false) => {
    if (isPublished) {
      setShowDossierModal(true);
      return;
    }
    setPublishing(true);
    setPublishError(null);

    try {
      const result = await publishSchedule(
        currentUser?.name || 'Chief Block Coordinator',
        currentUser?.role || 'RAILWAY_PLANNER',
        autoResolveIfBlocked
      );

      if (result.success) {
        setPublishedData({
          success: true,
          scheduleId: result.scheduleId,
          publishedAt: result.publicationInfo?.publishedAt || new Date().toLocaleTimeString(),
        });
        setShowDossierModal(true);
      } else {
        setPublishError(result.message || 'Validation constraints prevented schedule publication.');
      }

      onRefreshValidation();
    } catch (err: any) {
      console.error('Error publishing schedule:', err);
      setPublishError(err?.message || 'Error publishing schedule.');
    } finally {
      setPublishing(false);
    }
  };

  const handleAutoResolveAndPass = async () => {
    await resolveAllRemainingConflicts();
    onRefreshValidation();
  };

  const handleRevokePublication = async () => {
    try {
      await revokePublication(
        currentUser?.name || 'Chief Block Coordinator',
        'Planner revoked publication to permit emergency maintenance recalculation.'
      );
      setPublishedData(null);
      onRefreshValidation();
    } catch (err) {
      console.error('Failed to revoke publication:', err);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-lg border ${
                  isSafe
                    ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                    : 'bg-rose-950/80 border-rose-700/60 text-rose-400'
                }`}
              >
                {isSafe ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Final Safety Validation & Publication Gate
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 10 & 11 / GATEKEEPER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Deterministic railway safety validation gatekeeper. Prevents operational release unless 100% of safety and headway constraints are satisfied.
            </p>
          </div>

          {!isSafe && (
            <button
              onClick={handleAutoResolveAndPass}
              className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Auto-Resolve 5 Conflicts & Unlock Gate</span>
            </button>
          )}
        </div>
      </div>

      {/* PUBLICATION PIPELINE STATE STEPPER (SCREEN 11) */}
      <div className="bg-[#0a1020] p-4 rounded-xl border border-sky-950/80 shadow-inner">
        <div className="flex items-center justify-between mb-3 text-xs font-mono">
          <span className="text-slate-400 font-bold uppercase tracking-wider">
            Publication Lifecycle Pipeline:
          </span>
          <span className="text-sky-300 font-bold">
            STAGE: {publicationState.currentState}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs font-mono">
          {[
            { step: 'DRAFT', label: '1. Draft Block Ingestion' },
            { step: 'OPTIMIZED', label: '2. AI Optimized' },
            { step: 'CONFLICT_REVIEW', label: '3. Conflict Review' },
            { step: 'VALIDATION', label: '4. Safety Gate' },
            { step: 'APPROVED', label: '5. Planner Sign-Off' },
            { step: 'PUBLISHED', label: '6. Published & Locked' },
          ].map((stage, idx) => {
            const stages = ['DRAFT', 'OPTIMIZED', 'CONFLICT_REVIEW', 'VALIDATION', 'APPROVED', 'PUBLISHED'];
            const currentIndex = stages.indexOf(publicationState.currentState);
            const thisIndex = stages.indexOf(stage.step);
            const isDone = thisIndex <= currentIndex;
            const isCurrent = thisIndex === currentIndex;

            return (
              <div
                key={stage.step}
                className={`p-2.5 rounded-lg border text-center transition-all ${
                  isCurrent
                    ? 'bg-blue-900/60 border-sky-400 ring-2 ring-sky-500/40 text-sky-100 font-bold'
                    : isDone
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-slate-900/40 border-slate-800 text-slate-500'
                }`}
              >
                <div className="text-[10px] text-slate-500 mb-0.5">0{idx + 1}</div>
                <div className="text-[11px] truncate">{stage.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PUBLISHED SUCCESS BANNER IF PUBLISHED */}
      {isPublished && (
        <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-600 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-200 font-mono">
                  MAINTENANCE SCHEDULE PUBLISHED & OPERATIONAL TIMETABLE LOCKED
                </h3>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3 font-mono">
                  <span>
                    Schedule ID:{' '}
                    <strong className="text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-600">
                      {publicationState.publishedScheduleId || 'SCH-IR-2026-8492'}
                    </strong>
                  </span>
                  <span>Approved By: {publicationState.approvedBy || publicationState.publishedBy || 'Smt. Ananya Sen'}</span>
                  <span className="text-slate-400">Time: {publicationState.publishedAt || new Date().toLocaleTimeString()}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2">
                  All 42 blocks have been frozen into active operational rules. Field engineering staff, S&T controllers, and traction power operators are notified.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => setShowDossierModal(true)}
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <FileCheck className="w-4 h-4 text-emerald-200" />
                <span>View Gazette Dossier</span>
              </button>

              <button
                onClick={() => {
                  printOfficialBulletin({
                    publicationState,
                    corridors,
                    blocks,
                  });
                }}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="Print Official Daily Maintenance Bulletin"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Bulletin</span>
              </button>

              <button
                onClick={() => {
                  exportBulletinAsHTML({
                    publicationState,
                    corridors,
                    blocks,
                  });
                }}
                className="px-3 py-2 rounded-lg bg-teal-800 hover:bg-teal-700 text-teal-100 text-xs font-medium border border-teal-700 flex items-center gap-1.5 transition-colors"
                title="Export Bulletin as Official HTML/PDF Document"
              >
                <Download className="w-3.5 h-3.5 text-teal-300" />
                <span>Export Bulletin</span>
              </button>

              <button
                onClick={handleRevokePublication}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 border border-slate-700 text-slate-400 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Reopen timetable for emergency revision"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reopen / Revoke</span>
              </button>

              <button
                onClick={onNavigateToAudit}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <span>Audit Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {publishError && (
        <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-700 text-xs text-rose-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{publishError}</span>
          </div>
          <button
            onClick={() => handlePublish(true)}
            className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-white font-semibold text-[11px]"
          >
            Auto-Resolve & Retry
          </button>
        </div>
      )}

      {/* VALIDATION STATUS & DECISION SUMMARY */}
      <div
        className={`p-5 rounded-xl border transition-all ${
          isSafe
            ? 'bg-emerald-950/30 border-emerald-700/80 shadow-emerald-950/20'
            : 'bg-rose-950/30 border-rose-700/80 shadow-rose-950/20'
        } shadow-lg`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 font-mono">
              <span className="text-xs uppercase tracking-wider text-slate-400">
                GATE VERDICT:
              </span>
              <span
                className={`text-sm font-bold px-2.5 py-0.5 rounded border ${
                  isPublished
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : isSafe
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                DECISION: {isPublished ? 'SCHEDULE PUBLISHED & LOCKED' : validation.decisionText}
              </span>
              <span className="text-xs text-slate-400">
                (STATUS: {isPublished ? 'PUBLISHED' : validation.status.replace(/_/g, ' ')})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300 pt-1">
              <span>Total Blocks: <strong>{validation.totalBlocks}</strong></span>
              <span className="text-emerald-400">Valid: <strong>{validation.validBlocks}</strong></span>
              <span className={validation.invalidBlocks > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                Invalid: <strong>{validation.invalidBlocks}</strong>
              </span>
              <span className={validation.criticalIssuesCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                Critical Issues: <strong>{validation.criticalIssuesCount}</strong>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 pt-1">
              {isPublished ? (
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Timetable is published and locked. All operational slots are active.
                </span>
              ) : !isSafe ? (
                <span className="text-rose-300 font-semibold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  PUBLISHING LOCKED. {validation.criticalIssuesCount} critical conflicts must be resolved before this schedule can be published.
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                  PUBLISHING UNLOCKED. All safety and headway constraints are 100% satisfied. Ready for sign-off.
                </span>
              )}
            </p>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {isPublished ? (
              <>
                <button
                  onClick={() => setShowDossierModal(true)}
                  className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>VIEW PUBLISHED SCHEDULE & GAZETTE</span>
                </button>

                <button
                  onClick={handleRevokePublication}
                  className="px-3.5 py-2.5 rounded-lg bg-slate-800 hover:bg-amber-950/60 hover:text-amber-300 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Reopen timetable for revisions"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reopen Timetable</span>
                </button>
              </>
            ) : !isSafe ? (
              <>
                <button
                  onClick={() => onNavigateToConflict()}
                  className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-950/40 transition-all"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Resolve {validation.criticalIssuesCount} Conflicts</span>
                </button>

                <button
                  onClick={() => handlePublish(true)}
                  disabled={publishing}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{publishing ? 'Publishing...' : 'Auto-Resolve & Publish Now'}</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => handlePublish(false)}
                disabled={publishing}
                className="px-6 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {publishing
                    ? 'Locking Operational Schedule...'
                    : 'PUBLISH SCHEDULE (OFFICIAL SIGN-OFF)'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7-POINT SAFETY CHECKLIST */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-4 pb-2 border-b border-slate-800">
          7-Point Railway Safety Compliance Checklist
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {validation.checklist.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border flex items-center justify-between ${
                item.passed
                  ? 'bg-slate-900/80 border-slate-800 text-slate-200'
                  : 'bg-rose-950/40 border-rose-800 text-rose-200 ring-1 ring-rose-600/50'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold">
                  <span>{item.name || item.label}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal">
                  {item.details || item.detail}
                </div>
              </div>

              <div className="shrink-0 ml-2">
                {item.passed ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> PASS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1 animate-pulse">
                    <XCircle className="w-3 h-3 text-rose-400" /> FAIL
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CRITICAL ISSUES DRILLDOWN LIST IF NOT SAFE */}
      {!isSafe && validation.criticalIssues.length > 0 && (
        <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-300 font-mono flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Active Critical Validation Issues ({validation.criticalIssues.length})
              </h3>
              <p className="text-[11px] text-slate-400">
                Click any issue to jump to the Alternative Slot recommender
              </p>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            {validation.criticalIssues.map((issue, idx) => (
              <div
                key={issue.issueId || issue.id || issue.conflictId || `issue-${idx}`}
                onClick={() => onNavigateToConflict(issue.blockId)}
                className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/80 hover:border-rose-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-300">{issue.blockId}</span>
                    <span className="text-slate-400">↔</span>
                    <span className="font-bold text-purple-300">{issue.trainNumber}</span>
                    <span className="text-[10px] text-slate-400">on {issue.corridorId}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-normal">
                    {issue.description}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToConflict(issue.blockId);
                  }}
                  className="px-3 py-1.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-semibold flex items-center gap-1 shrink-0 self-start sm:self-center"
                >
                  <span>Resolve in Center</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PUBLISHED SCHEDULE DOSSIER MODAL */}
      <PublishedScheduleModal
        isOpen={showDossierModal}
        onClose={() => setShowDossierModal(false)}
        publicationState={publicationState}
        corridors={corridors}
        blocks={blocks}
        onRevokePublication={handleRevokePublication}
        onNavigateToAudit={onNavigateToAudit}
      />
    </div>
  );
};
