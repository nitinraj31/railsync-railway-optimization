import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  Search,
  Sparkles,
  Train,
  X,
  Filter,
  RotateCcw,
  Check,
  ChevronDown,
  SlidersHorizontal,
  CheckSquare,
  Square,
  Eye,
  Layers,
  Activity,
  FileText,
  Award,
  Send,
  Printer,
  Zap,
  ShieldCheck,
  ListChecks,
} from 'lucide-react';
import {
  Conflict,
  AlternativeSlot,
  WhatIfSimulationResult,
  CautionOrderMemo,
  DrmAuditReportData,
  PwiDispatchMessage,
} from '../../types';
import {
  findAlternativeSlots,
  resolveConflictWithSlot,
  resolveAllRemainingConflicts,
  simulateWhatIfDelay,
  batchResolveSelectedConflicts,
  generateCautionOrderMemo,
  getDrmSafetyAuditReport,
  getPwiDispatchMessage,
} from '../../services/api';
import { WhatIfSimulatorModal } from '../modals/WhatIfSimulatorModal';
import { CautionOrderModal } from '../modals/CautionOrderModal';
import { DrmAuditReportModal } from '../modals/DrmAuditReportModal';
import { PwiDispatchModal } from '../modals/PwiDispatchModal';

interface ConflictManagementScreenProps {
  conflicts: Conflict[];
  onRefreshConflicts: () => void;
  onNavigate: (screen: string) => void;
  targetConflictBlockId?: string;
}

type SeverityFilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'LOW';

export const ConflictManagementScreen: React.FC<ConflictManagementScreenProps> = ({
  conflicts,
  onRefreshConflicts,
  onNavigate,
  targetConflictBlockId,
}) => {
  const [selectedConflict, setSelectedConflict] = useState<Conflict | null>(null);
  const [candidateSlots, setCandidateSlots] = useState<AlternativeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Filter states
  const [severityToggles, setSeverityToggles] = useState<{
    CRITICAL: boolean;
    HIGH: boolean;
    LOW: boolean;
  }>({
    CRITICAL: true,
    HIGH: true,
    LOW: true,
  });
  const [isSeverityDropdownOpen, setIsSeverityDropdownOpen] = useState(false);
  const severityDropdownRef = useRef<HTMLDivElement>(null);
  const [isOverviewDropdownOpen, setIsOverviewDropdownOpen] = useState(false);
  const overviewDropdownRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [corridorFilter, setCorridorFilter] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'OPEN' | 'RESOLVED'>('OPEN');

  // Multi-select batch resolution state
  const [selectedConflictIds, setSelectedConflictIds] = useState<string[]>([]);
  const [isBatchResolving, setIsBatchResolving] = useState(false);

  // What-If Impact Simulation state
  const [whatIfSimulation, setWhatIfSimulation] = useState<WhatIfSimulationResult | null>(null);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);
  const [simulatingConflict, setSimulatingConflict] = useState<Conflict | null>(null);

  // Caution Order T/409 state
  const [activeCautionMemo, setActiveCautionMemo] = useState<CautionOrderMemo | null>(null);
  const [isCautionModalOpen, setIsCautionModalOpen] = useState(false);

  // DRM Safety Audit Report state
  const [drmAuditData, setDrmAuditData] = useState<DrmAuditReportData | null>(null);
  const [isDrmModalOpen, setIsDrmModalOpen] = useState(false);

  // PWI Dispatch state
  const [pwiDispatchData, setPwiDispatchData] = useState<PwiDispatchMessage | null>(null);
  const [isPwiModalOpen, setIsPwiModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        severityDropdownRef.current &&
        !severityDropdownRef.current.contains(target)
      ) {
        setIsSeverityDropdownOpen(false);
      }
      if (
        overviewDropdownRef.current &&
        !overviewDropdownRef.current.contains(target)
      ) {
        setIsOverviewDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Severity toggle helper functions
  const toggleSeverity = (severity: 'CRITICAL' | 'HIGH' | 'LOW') => {
    setSeverityToggles((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  };

  const setSoleSeverity = (severity: 'CRITICAL' | 'HIGH' | 'LOW') => {
    setSeverityToggles({
      CRITICAL: severity === 'CRITICAL',
      HIGH: severity === 'HIGH',
      LOW: severity === 'LOW',
    });
  };

  const selectAllSeverities = () => {
    setSeverityToggles({
      CRITICAL: true,
      HIGH: true,
      LOW: true,
    });
  };

  const isAllSelected =
    severityToggles.CRITICAL && severityToggles.HIGH && severityToggles.LOW;
  const activeSeverityCount = [
    severityToggles.CRITICAL,
    severityToggles.HIGH,
    severityToggles.LOW,
  ].filter(Boolean).length;

  const getSelectValue = (): string => {
    if (isAllSelected) return 'ALL';
    if (severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW)
      return 'CRITICAL';
    if (!severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW)
      return 'HIGH';
    if (!severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW)
      return 'LOW';
    if (severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW)
      return 'CRITICAL_HIGH';
    return 'CUSTOM';
  };

  const handleSelectChange = (val: string) => {
    if (val === 'ALL') {
      selectAllSeverities();
    } else if (val === 'CRITICAL') {
      setSoleSeverity('CRITICAL');
    } else if (val === 'HIGH') {
      setSoleSeverity('HIGH');
    } else if (val === 'LOW') {
      setSoleSeverity('LOW');
    } else if (val === 'CRITICAL_HIGH') {
      setSeverityToggles({ CRITICAL: true, HIGH: true, LOW: false });
    }
  };

  const getDropdownLabel = () => {
    if (isAllSelected) return 'All Severities';
    if (severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW)
      return 'Critical Only';
    if (!severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW)
      return 'High Only';
    if (!severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW)
      return 'Low Only';
    if (activeSeverityCount === 0) return 'None Selected (0)';
    const active = [];
    if (severityToggles.CRITICAL) active.push('Critical');
    if (severityToggles.HIGH) active.push('High');
    if (severityToggles.LOW) active.push('Low');
    return active.join(' + ');
  };

  const handleStatCardClick = (sev: 'ALL' | 'CRITICAL' | 'HIGH' | 'LOW') => {
    if (sev === 'ALL') {
      selectAllSeverities();
    } else {
      if (
        (sev === 'CRITICAL' && severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW) ||
        (sev === 'HIGH' && !severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW) ||
        (sev === 'LOW' && !severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW)
      ) {
        selectAllSeverities();
      } else {
        setSoleSeverity(sev);
      }
    }
  };

  // Filter open conflicts vs resolved
  const openConflicts = useMemo(() => conflicts.filter((c) => c.status === 'OPEN'), [conflicts]);
  const resolvedConflicts = useMemo(() => conflicts.filter((c) => c.status === 'RESOLVED'), [conflicts]);

  // Severity counts for open conflicts
  const criticalCount = useMemo(() => openConflicts.filter((c) => c.severity === 'CRITICAL').length, [openConflicts]);
  const highCount = useMemo(() => openConflicts.filter((c) => c.severity === 'HIGH').length, [openConflicts]);
  const lowCount = useMemo(() => openConflicts.filter((c) => c.severity === 'LOW').length, [openConflicts]);
  const allOpenCount = openConflicts.length;

  // Filtered open conflicts based on severity visibility toggles, corridor, and search
  const filteredOpenConflicts = useMemo(() => {
    return openConflicts.filter((c) => {
      // Severity check
      if (!severityToggles[c.severity]) {
        return false;
      }
      // Corridor check
      if (corridorFilter !== 'ALL' && c.corridorId !== corridorFilter) {
        return false;
      }
      // Search query check
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = c.conflictId.toLowerCase().includes(query);
        const matchesBlock = c.blockId.toLowerCase().includes(query);
        const matchesTrain = c.trainNumber.toLowerCase().includes(query) || c.trainName.toLowerCase().includes(query);
        const matchesCorridor = c.corridorId.toLowerCase().includes(query);
        const matchesDesc = c.description.toLowerCase().includes(query);
        const matchesTask = (c.taskType || '').toLowerCase().includes(query);
        return matchesId || matchesBlock || matchesTrain || matchesCorridor || matchesDesc || matchesTask;
      }
      return true;
    });
  }, [openConflicts, severityToggles, corridorFilter, searchQuery]);

  // Filtered resolved conflicts
  const filteredResolvedConflicts = useMemo(() => {
    return resolvedConflicts.filter((c) => {
      if (!severityToggles[c.severity]) {
        return false;
      }
      if (corridorFilter !== 'ALL' && c.corridorId !== corridorFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          c.conflictId.toLowerCase().includes(query) ||
          c.blockId.toLowerCase().includes(query) ||
          c.trainNumber.toLowerCase().includes(query) ||
          c.corridorId.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [resolvedConflicts, severityToggles, corridorFilter, searchQuery]);

  // Counts of currently visible open conflicts broken down by severity, reflecting active filters
  const visibleCounts = useMemo(() => {
    let critical = 0;
    let high = 0;
    let low = 0;
    for (const c of filteredOpenConflicts) {
      if (c.severity === 'CRITICAL') critical++;
      else if (c.severity === 'HIGH') high++;
      else if (c.severity === 'LOW') low++;
    }
    return {
      critical,
      high,
      low,
      total: filteredOpenConflicts.length,
    };
  }, [filteredOpenConflicts]);

  const handleOpenFindAlternatives = async (conflict: Conflict) => {
    setSelectedConflict(conflict);
    setLoadingSlots(true);
    try {
      const slots = await findAlternativeSlots(conflict.conflictId);
      setCandidateSlots(slots);
    } catch (err) {
      console.error('Error fetching alternative slots:', err);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleApplySlot = async (slot: AlternativeSlot) => {
    if (!selectedConflict) return;
    setResolvingId(slot.slotId);

    try {
      await resolveConflictWithSlot(selectedConflict.conflictId, slot);
      setSelectedConflict(null);
      setCandidateSlots([]);
      onRefreshConflicts();
    } catch (err) {
      console.error('Error resolving conflict:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleResolveAllNow = async () => {
    await resolveAllRemainingConflicts();
    onRefreshConflicts();
  };

  // What-If Impact Simulator
  const handleOpenWhatIf = async (conflict: Conflict, customSlot?: AlternativeSlot) => {
    setSimulatingConflict(conflict);
    try {
      const sim = await simulateWhatIfDelay(conflict.conflictId, customSlot);
      setWhatIfSimulation(sim);
      setIsWhatIfModalOpen(true);
    } catch (err) {
      console.error('Error simulating what-if impact:', err);
    }
  };

  const handleApplyWhatIfSlot = async (slot: AlternativeSlot) => {
    if (!simulatingConflict) return;
    try {
      await resolveConflictWithSlot(simulatingConflict.conflictId, slot);
      setIsWhatIfModalOpen(false);
      setSimulatingConflict(null);
      setWhatIfSimulation(null);
      if (selectedConflict?.conflictId === simulatingConflict.conflictId) {
        setSelectedConflict(null);
      }
      onRefreshConflicts();
    } catch (err) {
      console.error('Error applying simulated slot:', err);
    }
  };

  // Indian Railways Caution Order T/409
  const handleOpenCautionOrder = async (conflictId: string) => {
    try {
      const memo = await generateCautionOrderMemo(conflictId);
      setActiveCautionMemo(memo);
      setIsCautionModalOpen(true);
    } catch (err) {
      console.error('Error generating caution order:', err);
    }
  };

  // DRM Executive Safety Audit Report
  const handleOpenDrmAudit = async () => {
    try {
      const report = await getDrmSafetyAuditReport();
      setDrmAuditData(report);
      setIsDrmModalOpen(true);
    } catch (err) {
      console.error('Error generating DRM audit report:', err);
    }
  };

  // PWI Field Gang Dispatch Message
  const handleOpenPwiDispatch = async (conflictId: string) => {
    try {
      const dispatch = await getPwiDispatchMessage(conflictId);
      setPwiDispatchData(dispatch);
      setIsPwiModalOpen(true);
    } catch (err) {
      console.error('Error generating PWI dispatch:', err);
    }
  };

  // Multi-Select Batch Actions
  const handleToggleSelectConflict = (conflictId: string) => {
    setSelectedConflictIds((prev) =>
      prev.includes(conflictId)
        ? prev.filter((id) => id !== conflictId)
        : [...prev, conflictId]
    );
  };

  const handleSelectAllVisible = () => {
    if (selectedConflictIds.length === filteredOpenConflicts.length) {
      setSelectedConflictIds([]);
    } else {
      setSelectedConflictIds(filteredOpenConflicts.map((c) => c.conflictId));
    }
  };

  const handleBatchResolveSelected = async () => {
    if (selectedConflictIds.length === 0) return;
    setIsBatchResolving(true);
    try {
      await batchResolveSelectedConflicts(selectedConflictIds);
      setSelectedConflictIds([]);
      onRefreshConflicts();
    } catch (err) {
      console.error('Error batch resolving conflicts:', err);
    } finally {
      setIsBatchResolving(false);
    }
  };

  const clearAllFilters = () => {
    selectAllSeverities();
    setCorridorFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = !isAllSelected || corridorFilter !== 'ALL' || searchQuery.trim() !== '';

  const renderSeverityBadge = (severity: Conflict['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-xs">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>CRITICAL</span>
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-xs">
            <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
            <span>HIGH</span>
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-sky-950/80 text-sky-300 border border-sky-700/80 shadow-xs">
            <Info className="w-3 h-3 text-sky-400 shrink-0" />
            <span>LOW</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            <span>{severity}</span>
          </span>
        );
    }
  };

  return (
    <div id="conflict-management-screen" className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Conflict Detection & Resolution Center
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 6 / CONFLICT RESOLUTION
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated spatial-temporal conflict detection. Filter by severity level to focus on safety-critical train clashes, high-priority resource contentions, or low-impact advisories.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-drm-safety-audit"
              data-testid="btn-drm-safety-audit"
              onClick={handleOpenDrmAudit}
              className="px-3.5 py-2 rounded-lg bg-blue-950/90 hover:bg-blue-900 border border-sky-600/70 text-sky-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors"
              title="Open Divisional Railway Manager (DRM) Executive Safety & Conflict Audit Sign-off Report"
            >
              <Award className="w-4 h-4 text-sky-400" />
              <span>DRM Safety Audit Report</span>
            </button>
            {openConflicts.length > 0 && (
              <button
                id="btn-auto-resolve-all"
                onClick={handleResolveAllNow}
                className="px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer transition-colors"
                title="Batch resolves open conflicts using top-scored AI alternative slots"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Resolve All ({openConflicts.length})</span>
              </button>
            )}
            <button
              id="btn-view-safety-gate"
              onClick={() => onNavigate('validation')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <span>View Safety Gate</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* CONFLICT OVERVIEW CARD - REFLECTING ACTIVE FILTER STATE */}
      <div
        id="conflict-overview-card"
        data-testid="conflict-overview-card"
        className="bg-[#0b1329] border border-sky-900/60 rounded-xl p-4 sm:p-5 shadow-lg space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950/90 border border-sky-800/80 text-sky-400 shrink-0 mt-0.5 sm:mt-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                  Conflict Overview
                </h2>
                <span
                  id="overview-filter-badge"
                  data-testid="overview-filter-badge"
                  className={`text-xs font-mono px-2.5 py-0.5 rounded border font-semibold ${
                    hasActiveFilters
                      ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  Active Filter State: {hasActiveFilters ? getDropdownLabel() : 'All Severities Visible'}
                </span>
                {corridorFilter !== 'ALL' && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    Corridor: {corridorFilter}
                  </span>
                )}
                {searchQuery && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 max-w-[160px] truncate">
                    &quot;{searchQuery}&quot;
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                Visible Conflicts: <strong data-testid="visible-count-total" className="text-white text-sm font-bold font-mono">{visibleCounts.total}</strong> of{' '}
                <strong className="text-slate-300 font-semibold">{allOpenCount}</strong> total open conflicts
                {hasActiveFilters && (
                  <span className="text-amber-400 font-medium ml-1.5">
                    ({allOpenCount - visibleCounts.total} filtered out by active filters)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 flex-wrap">
            {/* Filter Severity Dropdown in Conflict Overview Card */}
            <div className="relative" ref={overviewDropdownRef}>
              <button
                id="overview-severity-filter-dropdown"
                data-testid="overview-severity-filter-dropdown"
                type="button"
                onClick={() => setIsOverviewDropdownOpen(!isOverviewDropdownOpen)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 cursor-pointer shadow-sm transition-all focus:outline-none ${
                  isOverviewDropdownOpen
                    ? 'bg-sky-950 border-sky-500 text-sky-200 ring-1 ring-sky-500/50'
                    : !isAllSelected
                    ? 'bg-blue-950/80 border-sky-600 text-sky-100 ring-1 ring-sky-500/40'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                }`}
                title="Filter conflicts by toggling Critical, High, and Low severity visibility"
                aria-haspopup="true"
                aria-expanded={isOverviewDropdownOpen}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                <span>Severity Filter:</span>
                <span className="font-semibold text-sky-300">{getDropdownLabel()}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                  {activeSeverityCount}/3
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOverviewDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover Menu for Overview Card */}
              {isOverviewDropdownOpen && (
                <div
                  id="overview-severity-dropdown-menu"
                  data-testid="overview-severity-dropdown-menu"
                  className="absolute right-0 top-full mt-2 w-72 md:w-80 bg-[#0a1122] border border-sky-800/80 rounded-xl shadow-2xl z-30 p-3 text-xs font-mono space-y-2.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      Filter Severity Visibility
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={selectAllSeverities}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsOverviewDropdownOpen(false)}
                        className="text-slate-400 hover:text-white p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Critical Toggle Row */}
                  <div
                    id="overview-dropdown-toggle-critical"
                    data-testid="overview-toggle-critical"
                    onClick={() => toggleSeverity('CRITICAL')}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      severityToggles.CRITICAL
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {severityToggles.CRITICAL ? (
                        <CheckSquare className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-rose-300 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Critical
                        </span>
                        <span className="text-[10px] text-slate-400">Path collisions</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold">
                        {criticalCount}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                        severityToggles.CRITICAL ? 'bg-rose-900/50 text-rose-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {severityToggles.CRITICAL ? 'VISIBLE' : 'HIDDEN'}
                      </span>
                    </div>
                  </div>

                  {/* High Toggle Row */}
                  <div
                    id="overview-dropdown-toggle-high"
                    data-testid="overview-toggle-high"
                    onClick={() => toggleSeverity('HIGH')}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      severityToggles.HIGH
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {severityToggles.HIGH ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          High
                        </span>
                        <span className="text-[10px] text-slate-400">Resource contention</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold">
                        {highCount}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                        severityToggles.HIGH ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {severityToggles.HIGH ? 'VISIBLE' : 'HIDDEN'}
                      </span>
                    </div>
                  </div>

                  {/* Low Toggle Row */}
                  <div
                    id="overview-dropdown-toggle-low"
                    data-testid="overview-toggle-low"
                    onClick={() => toggleSeverity('LOW')}
                    className={`p-2 rounded-lg border flex items-center justify-between gap-2.5 cursor-pointer transition-all ${
                      severityToggles.LOW
                        ? 'bg-sky-950/40 border-sky-800/80 text-sky-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {severityToggles.LOW ? (
                        <CheckSquare className="w-4 h-4 text-sky-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <span className="font-bold text-sky-300 flex items-center gap-1 text-[11px]">
                          <Info className="w-3 h-3 text-sky-400" />
                          Low
                        </span>
                        <span className="text-[10px] text-slate-400">Siding advisories</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 font-bold">
                        {lowCount}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                        severityToggles.LOW ? 'bg-sky-900/50 text-sky-300' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {severityToggles.LOW ? 'VISIBLE' : 'HIDDEN'}
                      </span>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-slate-500 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('CRITICAL')}
                      className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 cursor-pointer transition-colors"
                    >
                      Critical Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('HIGH')}
                      className="px-2 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-amber-300 cursor-pointer transition-colors"
                    >
                      High Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('LOW')}
                      className="px-2 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 text-sky-300 cursor-pointer transition-colors"
                    >
                      Low Only
                    </button>
                  </div>
                </div>
              )}
            </div>

            {hasActiveFilters && (
              <button
                id="overview-btn-reset-filters"
                data-testid="overview-btn-reset-filters"
                onClick={clearAllFilters}
                className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 hover:border-slate-600 flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Reset all active filters to view all conflicts"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Severity Count Breakdown - Reflecting Active Visibility */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Critical Severity Visible */}
          <div
            id="overview-severity-critical"
            data-testid="overview-severity-critical"
            onClick={() => toggleSeverity('CRITICAL')}
            className={`p-3.5 rounded-xl border text-xs font-mono transition-all cursor-pointer select-none ${
              !severityToggles.CRITICAL
                ? 'bg-slate-900/40 border-slate-800/60 opacity-50 hover:opacity-80'
                : visibleCounts.critical > 0
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 hover:border-rose-600 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-400'
            }`}
            title="Click to toggle visibility of Critical severity conflicts"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-rose-300 tracking-wider">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                CRITICAL SEVERITY
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                  !severityToggles.CRITICAL
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : visibleCounts.critical > 0
                    ? 'bg-rose-950 text-rose-300 border-rose-800 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {!severityToggles.CRITICAL ? 'FILTER: HIDDEN' : `${visibleCounts.critical} / ${criticalCount} ACTIVE`}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <div data-testid="visible-count-critical" className="text-2xl font-bold font-mono text-rose-300">
                {visibleCounts.critical}
              </div>
              <span className="text-xs text-slate-400">
                {!severityToggles.CRITICAL ? 'toggled off by filter' : 'currently visible'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              Direct passenger clashes & headways
            </div>
          </div>

          {/* High Severity Visible */}
          <div
            id="overview-severity-high"
            data-testid="overview-severity-high"
            onClick={() => toggleSeverity('HIGH')}
            className={`p-3.5 rounded-xl border text-xs font-mono transition-all cursor-pointer select-none ${
              !severityToggles.HIGH
                ? 'bg-slate-900/40 border-slate-800/60 opacity-50 hover:opacity-80'
                : visibleCounts.high > 0
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 hover:border-amber-600 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-400'
            }`}
            title="Click to toggle visibility of High severity conflicts"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-amber-300 tracking-wider">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                HIGH SEVERITY
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                  !severityToggles.HIGH
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : visibleCounts.high > 0
                    ? 'bg-amber-950 text-amber-300 border-amber-800 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {!severityToggles.HIGH ? 'FILTER: HIDDEN' : `${visibleCounts.high} / ${highCount} ACTIVE`}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <div data-testid="visible-count-high" className="text-2xl font-bold font-mono text-amber-300">
                {visibleCounts.high}
              </div>
              <span className="text-xs text-slate-400">
                {!severityToggles.HIGH ? 'toggled off by filter' : 'currently visible'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              Resource contention & buffer alerts
            </div>
          </div>

          {/* Low Severity Visible */}
          <div
            id="overview-severity-low"
            data-testid="overview-severity-low"
            onClick={() => toggleSeverity('LOW')}
            className={`p-3.5 rounded-xl border text-xs font-mono transition-all cursor-pointer select-none ${
              !severityToggles.LOW
                ? 'bg-slate-900/40 border-slate-800/60 opacity-50 hover:opacity-80'
                : visibleCounts.low > 0
                ? 'bg-sky-950/40 border-sky-800/80 text-sky-200 hover:border-sky-600 shadow-sm'
                : 'bg-slate-900/50 border-slate-800 text-slate-400'
            }`}
            title="Click to toggle visibility of Low severity conflicts"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-sky-300 tracking-wider">
                <Info className="w-4 h-4 text-sky-400" />
                LOW SEVERITY
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                  !severityToggles.LOW
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : visibleCounts.low > 0
                    ? 'bg-sky-950 text-sky-300 border-sky-800 font-bold'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {!severityToggles.LOW ? 'FILTER: HIDDEN' : `${visibleCounts.low} / ${lowCount} ACTIVE`}
              </span>
            </div>
            <div className="flex items-baseline gap-2.5 mt-2">
              <div data-testid="visible-count-low" className="text-2xl font-bold font-mono text-sky-300">
                {visibleCounts.low}
              </div>
              <span className="text-xs text-slate-400">
                {!severityToggles.LOW ? 'toggled off by filter' : 'currently visible'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1.5">
              Siding clearance & minor delays
            </div>
          </div>
        </div>

        {/* Proportional Distribution Bar of Visible Conflicts */}
        {visibleCounts.total > 0 && (
          <div className="pt-1.5">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
              {visibleCounts.critical > 0 && (
                <div
                  className="bg-rose-500 h-full transition-all duration-300"
                  style={{ width: `${(visibleCounts.critical / visibleCounts.total) * 100}%` }}
                  title={`Critical: ${visibleCounts.critical} (${Math.round((visibleCounts.critical / visibleCounts.total) * 100)}%)`}
                />
              )}
              {visibleCounts.high > 0 && (
                <div
                  className="bg-amber-500 h-full transition-all duration-300"
                  style={{ width: `${(visibleCounts.high / visibleCounts.total) * 100}%` }}
                  title={`High: ${visibleCounts.high} (${Math.round((visibleCounts.high / visibleCounts.total) * 100)}%)`}
                />
              )}
              {visibleCounts.low > 0 && (
                <div
                  className="bg-sky-500 h-full transition-all duration-300"
                  style={{ width: `${(visibleCounts.low / visibleCounts.total) * 100}%` }}
                  title={`Low: ${visibleCounts.low} (${Math.round((visibleCounts.low / visibleCounts.total) * 100)}%)`}
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono mt-1.5">
              <div className="flex items-center gap-4 flex-wrap">
                {visibleCounts.critical > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Critical: {visibleCounts.critical} ({Math.round((visibleCounts.critical / visibleCounts.total) * 100)}%)
                  </span>
                )}
                {visibleCounts.high > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    High: {visibleCounts.high} ({Math.round((visibleCounts.high / visibleCounts.total) * 100)}%)
                  </span>
                )}
                {visibleCounts.low > 0 && (
                  <span className="flex items-center gap-1.5 text-sky-400">
                    <span className="w-2 h-2 rounded-full bg-sky-500" />
                    Low: {visibleCounts.low} ({Math.round((visibleCounts.low / visibleCounts.total) * 100)}%)
                  </span>
                )}
              </div>
              <span className="text-slate-400">
                Visible Conflicts Total: <strong className="text-white font-semibold">{visibleCounts.total}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* INTERACTIVE SEVERITY BREAKDOWN STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {/* All Active Conflicts */}
        <button
          id="stat-card-all-conflicts"
          onClick={() => handleStatCardClick('ALL')}
          className={`p-4 rounded-xl text-left border shadow-sm transition-all cursor-pointer ${
            isAllSelected
              ? 'bg-blue-950/40 border-blue-600 ring-1 ring-blue-500/50'
              : 'bg-[#0e172e] border-sky-950/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-400" />
              TOTAL ACTIVE
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-sky-300 border border-blue-800">
              ALL
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-2">{allOpenCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {allOpenCount > 0 ? `${allOpenCount} conflicts pending resolution` : 'All conflicts resolved!'}
          </p>
        </button>

        {/* Critical Severity Card */}
        <button
          id="stat-card-critical"
          onClick={() => handleStatCardClick('CRITICAL')}
          className={`p-4 rounded-xl text-left border shadow-sm transition-all cursor-pointer ${
            severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW
              ? 'bg-rose-950/50 border-rose-500 ring-1 ring-rose-500/60'
              : 'bg-[#0e172e] border-sky-950/80 hover:border-rose-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-rose-300 font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              CRITICAL
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                criticalCount > 0
                  ? 'bg-rose-900/60 text-rose-200 border-rose-700 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {criticalCount > 0 ? 'GATE BLOCKER' : 'CLEARED'}
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-2">{criticalCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Direct passenger train path collisions
          </p>
        </button>

        {/* High Severity Card */}
        <button
          id="stat-card-high"
          onClick={() => handleStatCardClick('HIGH')}
          className={`p-4 rounded-xl text-left border shadow-sm transition-all cursor-pointer ${
            !severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW
              ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/60'
              : 'bg-[#0e172e] border-sky-950/80 hover:border-amber-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-amber-300 font-bold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              HIGH
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
              CONTENTION
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">{highCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Speed restrictions & clearance envelope
          </p>
        </button>

        {/* Low Severity Card */}
        <button
          id="stat-card-low"
          onClick={() => handleStatCardClick('LOW')}
          className={`p-4 rounded-xl text-left border shadow-sm transition-all cursor-pointer ${
            !severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW
              ? 'bg-sky-950/50 border-sky-500 ring-1 ring-sky-500/60'
              : 'bg-[#0e172e] border-sky-950/80 hover:border-sky-900/60'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-sky-300 font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              LOW
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
              ADVISORY
            </span>
          </div>
          <div className="text-2xl font-bold font-mono text-sky-400 mt-2">{lowCount}</div>
          <p className="text-[11px] text-slate-400 mt-1">
            Siding buffer & turnaround clearances
          </p>
        </button>
      </div>

      {/* FILTER CONTROL BAR */}
      <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Severity Dropdown and Toggle Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* SEVERITY FILTER DROPDOWN & POPOVER */}
            <div className="relative" ref={severityDropdownRef}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-sky-400" />
                  Severity:
                </span>

                {/* Primary Dropdown Button for Toggling Severity Visibility */}
                <button
                  id="severity-filter-dropdown"
                  data-testid="severity-filter-dropdown"
                  type="button"
                  onClick={() => setIsSeverityDropdownOpen(!isSeverityDropdownOpen)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 cursor-pointer shadow-sm transition-all focus:outline-none ${
                    isSeverityDropdownOpen
                      ? 'bg-sky-950 border-sky-500 text-sky-200 ring-1 ring-sky-500/50'
                      : !isAllSelected
                      ? 'bg-blue-950/80 border-sky-600 text-sky-100 ring-1 ring-sky-500/40'
                      : 'bg-slate-900 border-slate-700 hover:border-sky-500 text-slate-200'
                  }`}
                  title="Filter conflicts by toggling Critical, High, and Low severity levels"
                  aria-haspopup="true"
                  aria-expanded={isSeverityDropdownOpen}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Filter by Severity:</span>
                  <span className="font-semibold text-sky-300">{getDropdownLabel()}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-bold">
                    {activeSeverityCount}/3
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isSeverityDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Preset Select Dropdown for direct pick */}
                <div className="relative">
                  <select
                    id="severity-filter-select"
                    data-testid="severity-filter-select"
                    aria-label="Severity Level Filter Dropdown"
                    value={getSelectValue()}
                    onChange={(e) => handleSelectChange(e.target.value)}
                    className="appearance-none pl-2.5 pr-7 py-1.5 bg-slate-900/90 border border-slate-700 hover:border-sky-500 rounded-lg text-xs font-mono font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-sm transition-all"
                  >
                    <option value="ALL">All Severities ({allOpenCount})</option>
                    <option value="CRITICAL">Critical Severity ({criticalCount})</option>
                    <option value="HIGH">High Severity ({highCount})</option>
                    <option value="LOW">Low Severity ({lowCount})</option>
                    <option value="CRITICAL_HIGH">Critical + High ({criticalCount + highCount})</option>
                    {!isAllSelected && getSelectValue() === 'CUSTOM' && (
                      <option value="CUSTOM">Custom Selection ({activeSeverityCount}/3)</option>
                    )}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Custom Popover Menu for Multi-level Visibility Toggling */}
              {isSeverityDropdownOpen && (
                <div
                  id="severity-filter-dropdown-menu"
                  className="absolute left-0 top-full mt-2 w-72 md:w-80 bg-[#0a1122] border border-sky-800/80 rounded-xl shadow-2xl z-30 p-3 text-xs font-mono space-y-2.5 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      Toggle Severity Visibility
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={selectAllSeverities}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSeverityDropdownOpen(false)}
                        className="text-slate-400 hover:text-white p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Critical Toggle Row */}
                  <div
                    id="dropdown-toggle-critical"
                    data-testid="severity-toggle-critical"
                    onClick={() => toggleSeverity('CRITICAL')}
                    className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      severityToggles.CRITICAL
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5">
                      {severityToggles.CRITICAL ? (
                        <CheckSquare className="w-4 h-4 text-rose-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-300 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="w-3 h-3 text-rose-400" />
                          Critical Severity
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold">
                            {criticalCount}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                            severityToggles.CRITICAL ? 'bg-rose-900/50 text-rose-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {severityToggles.CRITICAL ? 'VISIBLE' : 'HIDDEN'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Direct passenger train path collisions & gate blockers
                      </p>
                    </div>
                  </div>

                  {/* High Toggle Row */}
                  <div
                    id="dropdown-toggle-high"
                    data-testid="severity-toggle-high"
                    onClick={() => toggleSeverity('HIGH')}
                    className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      severityToggles.HIGH
                        ? 'bg-amber-950/40 border-amber-800/80 text-amber-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5">
                      {severityToggles.HIGH ? (
                        <CheckSquare className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          High Severity
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold">
                            {highCount}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                            severityToggles.HIGH ? 'bg-amber-900/50 text-amber-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {severityToggles.HIGH ? 'VISIBLE' : 'HIDDEN'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Resource contention & speed restriction buffers
                      </p>
                    </div>
                  </div>

                  {/* Low Toggle Row */}
                  <div
                    id="dropdown-toggle-low"
                    data-testid="severity-toggle-low"
                    onClick={() => toggleSeverity('LOW')}
                    className={`p-2 rounded-lg border flex items-start gap-2.5 cursor-pointer transition-all ${
                      severityToggles.LOW
                        ? 'bg-sky-950/40 border-sky-800/80 text-sky-200 shadow-sm'
                        : 'bg-slate-900/50 border-slate-800 text-slate-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="mt-0.5">
                      {severityToggles.LOW ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sky-300 flex items-center gap-1 text-[11px]">
                          <Info className="w-3 h-3 text-sky-400" />
                          Low Severity
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 border border-sky-800 text-sky-300 font-bold">
                            {lowCount}
                          </span>
                          <span className={`text-[9px] px-1 py-0.2 rounded uppercase font-mono ${
                            severityToggles.LOW ? 'bg-sky-900/50 text-sky-300' : 'bg-slate-800 text-slate-500'
                          }`}>
                            {severityToggles.LOW ? 'VISIBLE' : 'HIDDEN'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                        Siding buffer & turnaround clearances
                      </p>
                    </div>
                  </div>

                  {/* Quick Filter Presets */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-slate-500 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('CRITICAL')}
                      className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 cursor-pointer transition-colors"
                    >
                      Critical
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('HIGH')}
                      className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-amber-300 cursor-pointer transition-colors"
                    >
                      High
                    </button>
                    <button
                      type="button"
                      onClick={() => setSoleSeverity('LOW')}
                      className="px-2 py-1 rounded bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/60 text-sky-300 cursor-pointer transition-colors"
                    >
                      Low
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Toggle Buttons for Rapid One-Click Filter */}
            <div className="flex items-center gap-1.5">
              {/* All Toggle */}
              <button
                id="filter-toggle-all"
                onClick={selectAllSeverities}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAllSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-950/60 border border-blue-400'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <span>All</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  isAllSelected ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400'
                }`}>
                  {allOpenCount}
                </span>
              </button>

              {/* Critical Toggle */}
              <button
                id="filter-toggle-critical"
                onClick={() => toggleSeverity('CRITICAL')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  severityToggles.CRITICAL
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 border border-rose-400 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-rose-300 border border-rose-950/80 opacity-60'
                }`}
                title="Toggle visibility of Critical severity conflicts"
              >
                <AlertTriangle className={`w-3.5 h-3.5 ${severityToggles.CRITICAL ? 'text-white' : 'text-rose-400'}`} />
                <span>Critical</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  severityToggles.CRITICAL ? 'bg-rose-800 text-white' : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  {criticalCount}
                </span>
              </button>

              {/* High Toggle */}
              <button
                id="filter-toggle-high"
                onClick={() => toggleSeverity('HIGH')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  severityToggles.HIGH
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60 border border-amber-400 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-950/80 opacity-60'
                }`}
                title="Toggle visibility of High severity conflicts"
              >
                <AlertCircle className={`w-3.5 h-3.5 ${severityToggles.HIGH ? 'text-white' : 'text-amber-400'}`} />
                <span>High</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  severityToggles.HIGH ? 'bg-amber-800 text-white' : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}>
                  {highCount}
                </span>
              </button>

              {/* Low Toggle */}
              <button
                id="filter-toggle-low"
                onClick={() => toggleSeverity('LOW')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  severityToggles.LOW
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-950/60 border border-sky-400 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-sky-300 border border-sky-950/80 opacity-60'
                }`}
                title="Toggle visibility of Low severity conflicts"
              >
                <Info className={`w-3.5 h-3.5 ${severityToggles.LOW ? 'text-white' : 'text-sky-400'}`} />
                <span>Low</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  severityToggles.LOW ? 'bg-sky-800 text-white' : 'bg-sky-950 text-sky-300 border border-sky-800'
                }`}>
                  {lowCount}
                </span>
              </button>
            </div>
          </div>

          {/* Search Box & Corridor Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Corridor selector */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5">Corridor:</span>
              {['ALL', 'C001', 'C002', 'C003', 'C004'].map((corr) => (
                <button
                  key={corr}
                  id={`corridor-filter-${corr.toLowerCase()}`}
                  onClick={() => setCorridorFilter(corr)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                    corridorFilter === corr
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {corr}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-conflict-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search train, block, ID..."
                className="pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 md:w-52 font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                id="btn-clear-conflict-filters"
                onClick={clearAllFilters}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors border border-slate-700"
                title="Reset severity, corridor, and search filters"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Informative Guidance Banner based on active severity filter */}
        <div
          className={`p-2.5 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-3 ${
            severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW
              ? 'bg-rose-950/30 border-rose-900/60 text-rose-200'
              : !severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW
              ? 'bg-amber-950/30 border-amber-900/60 text-amber-200'
              : !severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW
              ? 'bg-sky-950/30 border-sky-900/60 text-sky-200'
              : activeSeverityCount === 0
              ? 'bg-slate-900/90 border-slate-800 text-slate-400'
              : 'bg-slate-900/60 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW && (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {!severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW && (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            {!severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW && (
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            {(isAllSelected || activeSeverityCount > 1) && (
              <Filter className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            {activeSeverityCount === 0 && (
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {severityToggles.CRITICAL && !severityToggles.HIGH && !severityToggles.LOW && (
                <>
                  <strong>Focused on Critical Conflicts ({criticalCount} Active):</strong> Direct passenger train clashes that violate Indian Railways safety interlocks and block schedule publication.
                </>
              )}
              {!severityToggles.CRITICAL && severityToggles.HIGH && !severityToggles.LOW && (
                <>
                  <strong>Focused on High Severity Conflicts ({highCount} Active):</strong> Resource contention, temporary speed restriction buffer violations, and adjacent track clearance envelope overlaps.
                </>
              )}
              {!severityToggles.CRITICAL && !severityToggles.HIGH && severityToggles.LOW && (
                <>
                  <strong>Focused on Low Severity Conflicts ({lowCount} Active):</strong> Siding clearances, non-critical freight regulation advisories, and maintenance team staging intervals.
                </>
              )}
              {isAllSelected && (
                <>
                  <strong>All Severities Active ({allOpenCount} Active):</strong> Displaying complete multi-department conflict register across Civil, S&T, and Electrical Traction domains.
                </>
              )}
              {!isAllSelected && activeSeverityCount > 1 && (
                <>
                  <strong>Custom Severity Filter Active ({getDropdownLabel()}):</strong> Displaying combined active severity categories.
                </>
              )}
              {activeSeverityCount === 0 && (
                <>
                  <strong>All Severities Toggled Off:</strong> Use the dropdown or pills above to toggle Critical, High, or Low conflicts back on.
                </>
              )}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 shrink-0 hidden sm:block">
            Showing {filteredOpenConflicts.length} of {allOpenCount} open
          </div>
        </div>
      </div>

      {/* CONFLICTS TABLE VIEW */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                {isAllSelected ? 'Open Conflicts' : `${getDropdownLabel()} Conflicts`} ({filteredOpenConflicts.length} Displayed)
              </h3>
              {!isAllSelected && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700 uppercase">
                  FILTERED: {getDropdownLabel()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click &quot;Find Alternative Slot&quot; to review AI-evaluated candidate windows with multi-objective trade-off scores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
              Resolved: {resolvedConflicts.length} / {conflicts.length} Total
            </span>
          </div>
        </div>

        {/* BATCH ACTION BAR FOR MULTI-SELECT RESOLUTION */}
        {selectedConflictIds.length > 0 && (
          <div
            id="batch-actions-bar"
            data-testid="batch-actions-bar"
            className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-sky-950 via-blue-950 to-indigo-950 border-2 border-sky-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-sky-500 text-slate-950 font-bold shrink-0">
                <ListChecks className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    {selectedConflictIds.length} Conflicts Selected for Batch Processing
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900 text-sky-200 border border-sky-700 font-bold">
                    BATCH ACTION
                  </span>
                </div>
                <p className="text-[11px] text-sky-300 font-mono mt-0.5">
                  Simultaneously apply top-scored candidate slots with certified headway buffers across all selected corridors.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-batch-resolve"
                data-testid="btn-batch-resolve"
                onClick={handleBatchResolveSelected}
                disabled={isBatchResolving}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/50 transition-all disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isBatchResolving ? 'Resolving Batch...' : `Batch Resolve Selected (${selectedConflictIds.length})`}</span>
              </button>

              <button
                onClick={() => setSelectedConflictIds([])}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {filteredOpenConflicts.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="p-1 rounded text-slate-400 hover:text-sky-300 transition-colors"
                      title={selectedConflictIds.length === filteredOpenConflicts.length ? 'Deselect all' : 'Select all visible'}
                    >
                      {selectedConflictIds.length === filteredOpenConflicts.length && filteredOpenConflicts.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Conflict ID</th>
                  <th className="py-3 px-3">Corridor</th>
                  <th className="py-3 px-3">Block Under Review</th>
                  <th className="py-3 px-3">Conflicting Train</th>
                  <th className="py-3 px-3">Overlapping Windows</th>
                  <th className="py-3 px-3">Impact Description</th>
                  <th className="py-3 px-3 text-right">Quick Tools & Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredOpenConflicts.map((c) => {
                  const isHighlighted = targetConflictBlockId === c.blockId;
                  const isSelected = selectedConflictIds.includes(c.conflictId);
                  const borderSeverityClass =
                    c.severity === 'CRITICAL'
                      ? 'border-l-4 border-l-rose-500'
                      : c.severity === 'HIGH'
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-sky-500';

                  return (
                    <tr
                      key={c.conflictId}
                      className={`transition-colors ${borderSeverityClass} ${
                        isSelected
                          ? 'bg-sky-950/40'
                          : isHighlighted
                          ? 'bg-rose-950/40'
                          : c.severity === 'CRITICAL'
                          ? 'hover:bg-rose-950/20'
                          : c.severity === 'HIGH'
                          ? 'hover:bg-amber-950/20'
                          : 'hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectConflict(c.conflictId)}
                          className="p-1 rounded text-slate-400 hover:text-sky-300 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-sky-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">{renderSeverityBadge(c.severity)}</td>
                      <td className="py-3 px-3 font-bold text-slate-200">{c.conflictId}</td>
                      <td className="py-3 px-3 text-slate-200 font-semibold">{c.corridorId}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-sky-300">{c.blockId}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {c.taskType || 'Maintenance Work'} ({c.assetId})
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-purple-300 flex items-center gap-1">
                          <Train className="w-3.5 h-3.5" />
                          {c.trainNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          {c.trainName} ({c.trainCategory || 'EXPRESS'})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>
                          <span className="text-slate-400 text-[10px]">Block: </span>
                          <strong className="text-amber-300">{c.maintenanceInterval}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Train: </span>
                          <strong className="text-purple-300">{c.trainInterval}</strong>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 text-[11px] leading-relaxed max-w-xs">
                        {c.description}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* What-If Simulator Quick Button */}
                          <button
                            id={`btn-what-if-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenWhatIf(c)}
                            title="Simulate knock-on ripple delay and secondary passenger train impacts"
                            className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-300 cursor-pointer transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>

                          {/* Caution Order T/409 Memo Button */}
                          <button
                            id={`btn-caution-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenCautionOrder(c.conflictId)}
                            title="Generate Indian Railways Form T/409 Caution Order & Disconnection Memo"
                            className="p-1.5 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-700/80 text-amber-300 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* PWI Field Gang Dispatch Button */}
                          <button
                            id={`btn-pwi-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenPwiDispatch(c.conflictId)}
                            title="Generate PWI Field Gang WhatsApp & SMS Operational Dispatch"
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 cursor-pointer transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Primary Find Alternative Slot Button */}
                          <button
                            id={`btn-alt-slot-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenFindAlternatives(c)}
                            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-[11px] shadow-md shadow-blue-950/40 flex items-center gap-1.5 cursor-pointer transition-all"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>FIND ALTERNATIVE</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
            {openConflicts.length === 0 ? (
              <>
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200 font-mono uppercase">
                  All Conflicts Resolved
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  There are zero train-block collisions or resource contentions remaining across any corridor. The schedule is 100% verified.
                </p>
                <button
                  onClick={() => onNavigate('validation')}
                  className="mt-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Final Safety Validation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Info className="w-8 h-8 text-sky-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-200 font-mono">
                  No Conflicts Match Filter Criteria
                </h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No open conflicts match the current filter ({!isAllSelected ? `Severity: ${getDropdownLabel()}` : ''}
                  {corridorFilter !== 'ALL' ? ` | Corridor: ${corridorFilter}` : ''}
                  {searchQuery ? ` | Query: "${searchQuery}"` : ''}).
                </p>
                <button
                  onClick={clearAllFilters}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Active Filters</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* RESOLVED CONFLICTS HISTORY */}
      {resolvedConflicts.length > 0 && (
        <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Resolved Conflicts History ({filteredResolvedConflicts.length} of {resolvedConflicts.length} Rescheduled)
              </h3>
              <p className="text-[11px] text-slate-400">
                Audit trail of resolved train clashes and approved alternative slot assignments
              </p>
            </div>
            {!isAllSelected && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                Filtered: {getDropdownLabel()}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs font-mono text-[11px]">
              <thead className="bg-[#0a1020] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Conflict ID</th>
                  <th className="py-2.5 px-3">Block ID</th>
                  <th className="py-2.5 px-3">Train</th>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Applied Alternative Slot / Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResolvedConflicts.map((c) => (
                  <tr key={c.conflictId} className="hover:bg-slate-800/30 text-slate-300">
                    <td className="py-2.5 px-3">{renderSeverityBadge(c.severity)}</td>
                    <td className="py-2.5 px-3 text-slate-400">{c.conflictId}</td>
                    <td className="py-2.5 px-3 font-semibold text-sky-300">{c.blockId}</td>
                    <td className="py-2.5 px-3 text-slate-300">{c.trainNumber}</td>
                    <td className="py-2.5 px-3 font-semibold">{c.corridorId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 w-fit">
                        <Check className="w-3 h-3 text-emerald-400" />
                        RESOLVED
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      <div className="font-semibold text-emerald-300">
                        {c.alternativeAppliedSlot || 'Rescheduled to conflict-free window'}
                      </div>
                      {c.resolutionNotes && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {c.resolutionNotes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FIND ALTERNATIVE SLOT MODAL */}
      {selectedConflict && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e162c] border border-sky-800/90 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sky-950/80 bg-[#0a1020]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded bg-blue-950 border border-blue-700 text-sky-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-100 font-mono uppercase">
                      AI Alternative Slot Recommender
                    </h3>
                    {renderSeverityBadge(selectedConflict.severity)}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rescheduling Block {selectedConflict.blockId} on Corridor {selectedConflict.corridorId} ({selectedConflict.conflictId})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConflict(null)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs font-mono">
              {/* Conflict Context Banner */}
              <div
                className={`p-3 rounded-lg border flex items-start gap-2.5 ${
                  selectedConflict.severity === 'CRITICAL'
                    ? 'bg-rose-950/40 border-rose-900/60'
                    : selectedConflict.severity === 'HIGH'
                    ? 'bg-amber-950/40 border-amber-900/60'
                    : 'bg-sky-950/40 border-sky-900/60'
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    selectedConflict.severity === 'CRITICAL'
                      ? 'text-rose-400'
                      : selectedConflict.severity === 'HIGH'
                      ? 'text-amber-400'
                      : 'text-sky-400'
                  }`}
                />
                <div className="text-[11px] leading-relaxed text-slate-200">
                  <strong>Conflict Cause ({selectedConflict.severity}):</strong> Maintenance window ({selectedConflict.maintenanceInterval}) clashes with {selectedConflict.trainName} ({selectedConflict.trainInterval}). Select an AI-evaluated alternative window below:
                </div>
              </div>

              {/* Candidate Slots */}
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                  Top Recommended Alternative Slots (Heuristic Multi-Objective Evaluated):
                </span>

                {loadingSlots ? (
                  <div className="p-8 text-center text-slate-400">
                    <Clock className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
                    <span>Evaluating candidate corridor windows against all 120 train paths...</span>
                  </div>
                ) : candidateSlots.length > 0 ? (
                  candidateSlots.map((slot) => (
                    <div
                      key={slot.slotId}
                      className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-sky-700/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-sky-300">
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-bold">
                            Score: {slot.optimizationScore}%
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                            {slot.disruptionLevel || 'Zero'} Disruption
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-normal leading-relaxed">
                          {slot.scoreBreakdown || slot.rationale}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500">
                          <span>Headway: +{slot.headwayBufferMinutes || 35} min buffer</span>
                          <span>Corridor: {selectedConflict.corridorId}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenWhatIf(selectedConflict, slot)}
                          className="px-3 py-2 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                          title="Simulate knock-on secondary train delays and safety buffer margin for this candidate slot"
                        >
                          <Activity className="w-3.5 h-3.5 text-sky-400" />
                          <span>Simulate Ripple</span>
                        </button>

                        <button
                          id={`btn-apply-slot-${slot.slotId.toLowerCase()}`}
                          onClick={() => handleApplySlot(slot)}
                          disabled={resolvingId === slot.slotId}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {resolvingId === slot.slotId ? 'Applying Slot...' : 'APPLY SLOT'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-slate-400 bg-slate-900 rounded-lg border border-slate-800">
                    No alternative slots found for this block.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-[#0a1020] flex justify-end">
              <button
                onClick={() => setSelectedConflict(null)}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHAT-IF KNOCK-ON DELAY & HEADWAY SIMULATOR MODAL */}
      <WhatIfSimulatorModal
        isOpen={isWhatIfModalOpen}
        onClose={() => {
          setIsWhatIfModalOpen(false);
          setSimulatingConflict(null);
          setWhatIfSimulation(null);
        }}
        simulation={whatIfSimulation}
        conflict={simulatingConflict}
        onApplySlot={handleApplyWhatIfSlot}
      />

      {/* INDIAN RAILWAYS FORM T/409 CAUTION ORDER & DISCONNECTION MEMO MODAL */}
      <CautionOrderModal
        isOpen={isCautionModalOpen}
        onClose={() => {
          setIsCautionModalOpen(false);
          setActiveCautionMemo(null);
        }}
        memo={activeCautionMemo}
      />

      {/* DIVISIONAL RAILWAY MANAGER (DRM) EXECUTIVE SAFETY AUDIT SIGN-OFF MODAL */}
      <DrmAuditReportModal
        isOpen={isDrmModalOpen}
        onClose={() => {
          setIsDrmModalOpen(false);
          setDrmAuditData(null);
        }}
        report={drmAuditData}
      />

      {/* PWI FIELD GANG DISPATCH (WHATSAPP/SMS) MODAL */}
      <PwiDispatchModal
        isOpen={isPwiModalOpen}
        onClose={() => {
          setIsPwiModalOpen(false);
          setPwiDispatchData(null);
        }}
        dispatchData={pwiDispatchData}
      />
    </div>
  );
};
