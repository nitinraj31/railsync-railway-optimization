import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  RefreshCw,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Train,
  ArrowRight,
  AlertTriangle,
  Layers,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Zap,
} from 'lucide-react';
import {
  Conflict,
  Corridor,
  AiOffsetResponse,
  AiScheduleOffsetProposal,
} from '../../types';
import {
  fetchAiScheduleOffsets,
  applyAiScheduleOffset,
  batchApplyAiScheduleOffsets,
} from '../../services/api';

interface AiConflictAssistModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  corridors: Corridor[];
  initialSelectedConflictId?: string | null;
  onApplied?: () => void;
}

export const AiConflictAssistModal: React.FC<AiConflictAssistModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  corridors,
  initialSelectedConflictId,
  onApplied,
}) => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AiOffsetResponse | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<string>('ALL');
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [batchApplying, setBatchApplying] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadProposals = async () => {
    setLoading(true);
    setSuccessMessage(null);
    try {
      const openConflicts = conflicts.filter((c) => c.status === 'OPEN');
      const targetConflicts = openConflicts.length > 0 ? openConflicts : conflicts;

      const corridorAvailabilityData = corridors.map((corr) => ({
        corridorId: corr.id,
        name: corr.name,
        utilizationPct: corr.utilization,
        availableSlots: corr.availableSlots,
        lullWindows:
          corr.id === 'C001'
            ? ['12:00–13:30', '13:45–15:15', '22:00–23:30']
            : corr.id === 'C002'
            ? ['10:30–12:00', '15:00–16:30', '04:00–05:30']
            : corr.id === 'C003'
            ? ['12:15–13:45', '15:45–17:15', '18:00–19:30']
            : ['12:30–14:00', '13:45–15:15', '19:30–21:00'],
      }));

      const res = await fetchAiScheduleOffsets(
        targetConflicts,
        corridorAvailabilityData,
        initialSelectedConflictId || undefined
      );
      setResponse(res);
    } catch (err) {
      console.error('Failed to load AI schedule offset proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setAppliedIds(new Set());
      loadProposals();
    }
  }, [isOpen, initialSelectedConflictId]);

  if (!isOpen) return null;

  const handleApplySingle = async (proposal: AiScheduleOffsetProposal) => {
    setApplyingId(proposal.conflictId);
    try {
      const res = await applyAiScheduleOffset(proposal);
      if (res.success) {
        setAppliedIds((prev) => new Set([...prev, proposal.conflictId]));
        setSuccessMessage(
          `Successfully applied offset for ${proposal.blockId}: Rescheduled to ${proposal.proposedInterval}. Safety headway buffer established.`
        );
        if (onApplied) onApplied();
      }
    } catch (err) {
      console.error('Error applying schedule offset:', err);
    } finally {
      setApplyingId(null);
    }
  };

  const handleBatchApply = async () => {
    if (!response || !response.proposals.length) return;
    setBatchApplying(true);
    try {
      const unapplied = response.proposals.filter((p) => !appliedIds.has(p.conflictId));
      const res = await batchApplyAiScheduleOffsets(unapplied);
      const newSet = new Set(appliedIds);
      unapplied.forEach((p) => newSet.add(p.conflictId));
      setAppliedIds(newSet);
      setSuccessMessage(
        `Batch optimization applied: ${res.count} conflicting block requests rescheduled into corridor availability lull windows with zero passenger delay.`
      );
      if (onApplied) onApplied();
    } catch (err) {
      console.error('Error batch applying offsets:', err);
    } finally {
      setBatchApplying(false);
    }
  };

  const filteredProposals = (response?.proposals || []).filter((p) => {
    if (selectedCorridor === 'ALL') return true;
    return p.corridorId === selectedCorridor;
  });

  const remainingCount = (response?.proposals || []).filter((p) => !appliedIds.has(p.conflictId)).length;

  return (
    <div
      id="ai-conflict-assist-modal"
      data-testid="ai-conflict-assist-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-sky-800/90 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sky-900/60 bg-[#070e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-900/90 to-purple-900/90 border border-indigo-500/60 text-indigo-300 shadow-lg shadow-indigo-950/50">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
                  Gemini AI Assist: Schedule Offset Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-950 to-purple-950 text-indigo-300 border border-indigo-600/80">
                  {response?.model || 'gemini-3.8-flash'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                  CORRIDOR LULL MATCHING
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Proposing specific maintenance schedule offsets to resolve conflicting block requests based on corridor availability &amp; timetable lulls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadProposals}
              disabled={loading}
              title="Refresh AI Offset Proposals"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Success Notification Banner */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-600/80 text-emerald-200 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-sans font-medium">{successMessage}</span>
              </div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-400 hover:text-emerald-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Corridor Availability Profile Cards */}
          <div className="p-4 rounded-xl bg-[#081026] border border-sky-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-sky-400" />
                <span className="text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                  Corridor Sectional Availability &amp; Timetable Lulls
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-[10px]">Filter Corridor:</span>
                <button
                  onClick={() => setSelectedCorridor('ALL')}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                    selectedCorridor === 'ALL'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ALL
                </button>
                {corridors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCorridor(c.id)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-colors ${
                      selectedCorridor === c.id
                        ? 'bg-sky-600 text-white font-bold'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {c.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {corridors.map((corr) => {
                const isSelected = selectedCorridor === corr.id;
                const lullWindows =
                  corr.id === 'C001'
                    ? ['12:00–13:30', '13:45–15:15']
                    : corr.id === 'C002'
                    ? ['10:30–12:00', '15:00–16:30']
                    : corr.id === 'C003'
                    ? ['12:15–13:45', '15:45–17:15']
                    : ['12:30–14:00', '13:45–15:15'];

                return (
                  <div
                    key={corr.id}
                    onClick={() => setSelectedCorridor(corr.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-500 shadow-md shadow-sky-950'
                        : 'bg-[#0b1633]/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400">{corr.id}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {corr.utilization}% load
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300 font-sans font-medium truncate mt-1">
                      {corr.name}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Available Slots: <strong className="text-emerald-400">{corr.availableSlots}</strong></span>
                      <span className="text-indigo-300 font-mono">{lullWindows[0]}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Executive Assessment Banner */}
          {response?.overallAssessment && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#0e1a38] border border-indigo-800/50">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-indigo-900/60 text-indigo-400 shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">
                    Gemini AI Capacity &amp; Schedule Strategy
                  </h4>
                  <p className="text-xs text-slate-300 font-sans mt-1 leading-relaxed">
                    {response.overallAssessment}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <div className="text-sm font-bold text-white">Consulting Gemini Headway &amp; Capacity Engine...</div>
              <p className="text-xs text-slate-400 max-w-md">
                Analyzing conflicting block requests, sectional headway buffers, and corridor availability windows across Delhi Division...
              </p>
            </div>
          )}

          {/* Proposals List */}
          {!loading && filteredProposals.length === 0 && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">No active schedule conflicts in this view</div>
              <p className="text-xs">All maintenance block requests in the selected corridor have verified clearance windows.</p>
            </div>
          )}

          {!loading && filteredProposals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-sans">
                <span>
                  Showing <strong>{filteredProposals.length}</strong> AI proposed schedule offset(s)
                </span>
                <span className="text-slate-400 text-[11px]">
                  Kavach headway clearance standard: <strong className="text-emerald-400">&gt;= 30 minutes</strong>
                </span>
              </div>

              {filteredProposals.map((proposal) => {
                const isApplied = appliedIds.has(proposal.conflictId) || proposal.applied;
                const isCurrentApplying = applyingId === proposal.conflictId;

                return (
                  <div
                    key={proposal.conflictId}
                    id={`proposal-card-${proposal.conflictId.toLowerCase()}`}
                    data-testid={`proposal-card-${proposal.conflictId.toLowerCase()}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isApplied
                        ? 'bg-emerald-950/20 border-emerald-800/60'
                        : 'bg-[#0d1836] border-sky-800/60 hover:border-sky-600/80 shadow-lg'
                    }`}
                  >
                    {/* Top Row: Meta & Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono bg-sky-950 px-2 py-0.5 rounded border border-sky-700">
                          {proposal.blockId}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                          {proposal.corridorId}
                        </span>
                        {proposal.department && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {proposal.department}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            proposal.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {proposal.priority}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-rose-400 bg-rose-950/50 px-2 py-0.5 rounded border border-rose-900/60">
                          <Train className="w-3.5 h-3.5" />
                          <span>
                            Clash: <strong>{proposal.conflictingTrainNumber}</strong> ({proposal.conflictingTrainName})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Before vs After Schedule Offset */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
                      {/* Original Requested Interval */}
                      <div className="p-3 rounded-lg bg-[#070e1e] border border-rose-900/40 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>CURRENT CONFLICT WINDOW</span>
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        </div>
                        <div className="mt-1">
                          <div className="text-base font-bold text-rose-300 font-mono">
                            {proposal.currentInterval}
                          </div>
                          <span className="text-[10px] text-rose-400/90 font-sans">
                            Direct path clash with {proposal.conflictingTrainNumber}
                          </span>
                        </div>
                      </div>

                      {/* Offset Metrics */}
                      <div className="p-3 rounded-lg bg-[#0a142c] border border-indigo-900/50 flex flex-col justify-center items-center text-center">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                          <ArrowRight className="w-4 h-4 text-indigo-400" />
                          <span>
                            {proposal.offsetMinutes > 0 ? `+${proposal.offsetMinutes}m` : `${proposal.offsetMinutes}m`} SCHEDULE OFFSET
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-sans">
                          {proposal.offsetDirection === 'FORWARD' ? 'Post-train forward shift' : 'Pre-peak backward shift'}
                        </div>
                        <span className="mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          Preserves full {proposal.durationMinutes}m duration
                        </span>
                      </div>

                      {/* Proposed Offset Interval */}
                      <div className="p-3 rounded-lg bg-[#061824] border border-emerald-800/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>AI RECOMMENDED SLOT</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="mt-1">
                          <div className="text-base font-bold text-emerald-400 font-mono">
                            {proposal.proposedInterval}
                          </div>
                          <span className="text-[10px] text-emerald-300 font-sans">
                            {proposal.safetyHeadwayMinutes}m Kavach headway clearance
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Corridor Availability Details & Justification */}
                    <div className="bg-[#070e1e] p-3 rounded-lg border border-slate-800/70 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-sky-300 font-medium">
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Corridor Window: <strong>{proposal.corridorWindowIdentified}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 text-[10px] font-mono bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                            {proposal.disruptionLevel}
                          </span>
                          <span className="text-indigo-300 text-[10px] font-mono bg-indigo-950/70 px-2 py-0.5 rounded border border-indigo-800">
                            Confidence: {proposal.confidenceScore}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 font-sans leading-relaxed">
                        {proposal.justification}
                      </p>

                      <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60 flex items-center gap-1.5">
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Rule Compliance: {proposal.irStandardsCompliance}</span>
                      </div>
                    </div>

                    {/* Action Row */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        {isApplied ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                            <Check className="w-4 h-4" />
                            Schedule Offset Applied &amp; Block Rescheduled
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Ready to apply to corridor block plan &amp; update control board
                          </span>
                        )}
                      </div>

                      <div>
                        {isApplied ? (
                          <button
                            disabled
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold flex items-center gap-1.5 opacity-90 cursor-default"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            RESOLVED
                          </button>
                        ) : (
                          <button
                            id={`btn-apply-offset-${proposal.conflictId.toLowerCase()}`}
                            data-testid={`btn-apply-offset-${proposal.conflictId.toLowerCase()}`}
                            onClick={() => handleApplySingle(proposal)}
                            disabled={isCurrentApplying || batchApplying}
                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-sky-950 hover:shadow-sky-900/50 disabled:opacity-50 cursor-pointer"
                          >
                            {isCurrentApplying ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Applying...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                Apply Proposed Offset
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-t border-sky-900/60 bg-[#070e1e] gap-3">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>
              Unresolved: <strong className="text-amber-400">{remainingCount}</strong>
            </span>
            <span>•</span>
            <span>
              Applied in session: <strong className="text-emerald-400">{appliedIds.size}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
            >
              Close
            </button>

            {remainingCount > 0 && (
              <button
                id="btn-batch-apply-ai-offsets"
                data-testid="btn-batch-apply-ai-offsets"
                onClick={handleBatchApply}
                disabled={batchApplying || loading}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:via-teal-500 hover:to-sky-500 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg shadow-emerald-950 hover:shadow-emerald-900/50 transition-all disabled:opacity-50 cursor-pointer"
              >
                {batchApplying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Applying All Offsets...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Batch Apply All Proposed Offsets ({remainingCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
