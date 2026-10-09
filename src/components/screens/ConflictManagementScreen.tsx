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
  Archive,
  Database,
  ArchiveRestore,
} from 'lucide-react';
import {
  Conflict,
  AlternativeSlot,
  WhatIfSimulationResult,
  CautionOrderMemo,
  DrmAuditReportData,
  PwiDispatchMessage,
  PublicationInfo,
  OptimizedBlock,
  BlockRequest,
  Corridor,
} from '../../types';
import {
  findAlternativeSlots,
  resolveConflictWithSlot,
  resolveAllRemainingConflicts,
  simulateWhatIfDelay,
  batchResolveSelectedConflicts,
  batchUpdateConflictStatus,
  generateCautionOrderMemo,
  getDrmSafetyAuditReport,
  getPwiDispatchMessage,
  getAutoArchiveSetting,
  setAutoArchiveSetting,
  autoArchiveResolvedConflicts,
  closeConflict,
  reopenClosedConflict,
  publishSchedule,
  getPublicationState,
} from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';
import { WhatIfSimulatorModal } from '../modals/WhatIfSimulatorModal';
import { CautionOrderModal } from '../modals/CautionOrderModal';
import { DrmAuditReportModal } from '../modals/DrmAuditReportModal';
import { PwiDispatchModal } from '../modals/PwiDispatchModal';
import { DependencyConflictBanner } from '../conflicts/DependencyConflictBanner';
import { DependencyReconciliationModal } from '../conflicts/DependencyReconciliationModal';
import { AiConflictAssistModal } from '../modals/AiConflictAssistModal';
import { BatchConflictResolutionPanel } from '../conflicts/BatchConflictResolutionPanel';
import { WhatIfMaintenanceBlockSimulator } from '../conflicts/WhatIfMaintenanceBlockSimulator';
import { INITIAL_CORRIDORS } from '../../data/mockData';

interface ConflictManagementScreenProps {
  conflicts: Conflict[];
  onRefreshConflicts: () => void;
  onNavigate: (screen: string) => void;
  targetConflictBlockId?: string;
  publicationState?: PublicationInfo;
  corridors?: Corridor[];
  blocks?: OptimizedBlock[];
  blockRequests?: BlockRequest[];
}

type SeverityFilterType = 'ALL' | 'CRITICAL' | 'HIGH' | 'LOW';

export const ConflictManagementScreen: React.FC<ConflictManagementScreenProps> = ({
  conflicts,
  onRefreshConflicts,
  onNavigate,
  targetConflictBlockId,
  publicationState,
  corridors = INITIAL_CORRIDORS,
  blocks,
  blockRequests,
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
  const [activeTab, setActiveTab] = useState<'OPEN' | 'PENDING_REVIEW' | 'BATCH_GROUPS' | 'RESOLVED' | 'CLOSED' | 'WHAT_IF_SIMULATOR'>('OPEN');
  const [openConflictsViewMode, setOpenConflictsViewMode] = useState<'TABLE' | 'CLUSTERS'>('TABLE');

  // Checkbox-based batch action menu states
  const [isBatchActionMenuOpen, setIsBatchActionMenuOpen] = useState(false);
  const batchMenuRef = useRef<HTMLDivElement>(null);
  const [isMovingStatus, setIsMovingStatus] = useState(false);
  const [batchActionNotification, setBatchActionNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-Archive Resolved state & publication tracking
  const [autoArchiveResolved, setAutoArchiveResolved] = useState<boolean>(true);
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveNotification, setArchiveNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const [publicationInfo, setPublicationInfo] = useState<PublicationInfo | null>(publicationState || null);

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

  // Dependency Conflict Reconciliation state
  const [selectedDependencyConflict, setSelectedDependencyConflict] = useState<Conflict | null>(null);
  const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);

  // Gemini AI Assist Corridor Schedule Offset state
  const [isAiAssistModalOpen, setIsAiAssistModalOpen] = useState(false);
  const [aiAssistSelectedConflictId, setAiAssistSelectedConflictId] = useState<string | null>(null);

  const handleOpenAiAssist = (conflictId?: string) => {
    setAiAssistSelectedConflictId(conflictId || null);
    setIsAiAssistModalOpen(true);
  };

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
      if (
        batchMenuRef.current &&
        !batchMenuRef.current.contains(target)
      ) {
        setIsBatchActionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch initial auto-archive setting and publication status
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [setting, pub] = await Promise.all([
          getAutoArchiveSetting(),
          getPublicationState(),
        ]);
        if (active) {
          setAutoArchiveResolved(setting);
          setPublicationInfo(pub);
        }
      } catch (err) {
        console.error('Failed to load auto-archive configuration:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Sync incoming publicationState prop
  useEffect(() => {
    if (publicationState) {
      setPublicationInfo(publicationState);
    }
  }, [publicationState]);

  // When auto-archive is active and schedule is published, auto-transition resolved conflicts to CLOSED
  useEffect(() => {
    if (autoArchiveResolved && publicationInfo?.currentState === 'PUBLISHED') {
      const eligible = conflicts.filter((c) => c.status === 'RESOLVED');
      if (eligible.length > 0) {
        autoArchiveResolvedConflicts().then((res) => {
          if (res.transitionedCount > 0) {
            onRefreshConflicts();
            setArchiveNotification({
              message: `Auto-Archive Resolved: Automatically transitioned ${res.transitionedCount} resolved conflict(s) to 'Closed' in database once underlying block request was published and cleared.`,
              type: 'success',
            });
            setTimeout(() => setArchiveNotification(null), 6000);
          }
        });
      }
    }
  }, [conflicts, autoArchiveResolved, publicationInfo?.currentState, onRefreshConflicts]);

  // Auto-Archive setting toggle handler
  const handleToggleAutoArchive = async (enabled: boolean) => {
    setAutoArchiveResolved(enabled);
    try {
      const res = await setAutoArchiveSetting(enabled);
      if (enabled && res.transitionedCount > 0) {
        onRefreshConflicts();
        setArchiveNotification({
          message: `Auto-Archive Enabled: Automatically transitioned ${res.transitionedCount} resolved conflict(s) to 'Closed' in database.`,
          type: 'success',
        });
        setTimeout(() => setArchiveNotification(null), 5000);
      } else {
        setArchiveNotification({
          message: enabled
            ? 'Auto-Archive Enabled: Conflicts in Resolved status will automatically transition to Closed once block requests are published.'
            : 'Auto-Archive Disabled: Resolved conflicts will remain in Resolved queue until manually closed.',
          type: 'info',
        });
        setTimeout(() => setArchiveNotification(null), 4000);
      }
    } catch (err) {
      console.error('Failed to update auto-archive setting:', err);
    }
  };

  // Immediate manual trigger for auto-archive database evaluation
  const handleTriggerAutoArchiveNow = async () => {
    setIsArchiving(true);
    try {
      const res = await autoArchiveResolvedConflicts();
      onRefreshConflicts();
      if (res.transitionedCount > 0) {
        setArchiveNotification({
          message: `Auto-Archive Run Complete: Transitioned ${res.transitionedCount} resolved conflict(s) to 'Closed' state in database.`,
          type: 'success',
        });
      } else {
        const isPublished = publicationInfo?.currentState === 'PUBLISHED';
        setArchiveNotification({
          message: isPublished
            ? 'Evaluation complete: All eligible resolved conflicts are already archived and closed in database.'
            : 'Schedule is currently in draft validation. Auto-archive will automatically close resolved conflicts when published, or you can archive conflicts individually.',
          type: 'info',
        });
      }
      setTimeout(() => setArchiveNotification(null), 5000);
    } catch (err) {
      console.error('Failed to trigger auto-archive:', err);
    } finally {
      setIsArchiving(false);
    }
  };

  // Manual transition of a resolved conflict to CLOSED
  const handleManualCloseConflict = async (conflictId: string, customReason?: string) => {
    try {
      const res = await closeConflict(
        conflictId,
        customReason || 'Manually closed by Chief Block Coordinator: Resolution validated and archived in database.'
      );
      if (res.success) {
        onRefreshConflicts();
        setArchiveNotification({
          message: `Conflict ${conflictId} has been archived to Closed state in database.`,
          type: 'success',
        });
        setTimeout(() => setArchiveNotification(null), 4000);
      }
    } catch (err) {
      console.error('Failed to close conflict:', err);
    }
  };

  // Reopen a closed conflict back to RESOLVED status
  const handleReopenConflict = async (conflictId: string) => {
    try {
      const res = await reopenClosedConflict(conflictId);
      if (res.success) {
        onRefreshConflicts();
        setArchiveNotification({
          message: `Conflict ${conflictId} restored from Closed archive to Resolved status.`,
          type: 'info',
        });
        setTimeout(() => setArchiveNotification(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reopen conflict:', err);
    }
  };

  // Batch archive all resolved conflicts to Closed state
  const handleCloseAllResolved = async () => {
    if (resolvedConflicts.length === 0) return;
    setIsArchiving(true);
    try {
      let count = 0;
      for (const c of resolvedConflicts) {
        const res = await closeConflict(
          c.conflictId,
          `Batch closed: Resolved slot ${c.alternativeAppliedSlot || 'assigned'} confirmed in database.`
        );
        if (res.success) count++;
      }
      onRefreshConflicts();
      setArchiveNotification({
        message: `Batch Archival Complete: ${count} resolved conflict(s) transitioned to 'Closed' in database.`,
        type: 'success',
      });
      setTimeout(() => setArchiveNotification(null), 5000);
    } catch (err) {
      console.error('Error closing all resolved conflicts:', err);
    } finally {
      setIsArchiving(false);
    }
  };

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

  // Filter open conflicts vs pending review vs resolved vs closed (database archive)
  const openConflicts = useMemo(() => conflicts.filter((c) => c.status === 'OPEN'), [conflicts]);
  const pendingReviewConflicts = useMemo(() => conflicts.filter((c) => c.status === 'PENDING_REVIEW'), [conflicts]);
  const resolvedConflicts = useMemo(() => conflicts.filter((c) => c.status === 'RESOLVED'), [conflicts]);
  const closedConflicts = useMemo(() => conflicts.filter((c) => c.status === 'CLOSED'), [conflicts]);

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

  // Filtered pending review conflicts
  const filteredPendingReviewConflicts = useMemo(() => {
    return pendingReviewConflicts.filter((c) => {
      if (!severityToggles[c.severity]) {
        return false;
      }
      if (corridorFilter !== 'ALL' && c.corridorId !== corridorFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesId = c.conflictId.toLowerCase().includes(query);
        const matchesBlock = c.blockId.toLowerCase().includes(query);
        const matchesTrain = c.trainNumber.toLowerCase().includes(query) || c.trainName.toLowerCase().includes(query);
        const matchesCorridor = c.corridorId.toLowerCase().includes(query);
        const matchesDesc = c.description.toLowerCase().includes(query);
        const matchesTask = (c.taskType || '').toLowerCase().includes(query);
        const matchesNotes = (c.resolutionNotes || '').toLowerCase().includes(query);
        return matchesId || matchesBlock || matchesTrain || matchesCorridor || matchesDesc || matchesTask || matchesNotes;
      }
      return true;
    });
  }, [pendingReviewConflicts, severityToggles, corridorFilter, searchQuery]);

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

  // Filtered closed conflicts (Database Archive)
  const filteredClosedConflicts = useMemo(() => {
    return closedConflicts.filter((c) => {
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
          c.corridorId.toLowerCase().includes(query) ||
          (c.closedReason || '').toLowerCase().includes(query) ||
          (c.resolutionNotes || '').toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [closedConflicts, severityToggles, corridorFilter, searchQuery]);

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

  const currentVisibleConflicts =
    activeTab === 'PENDING_REVIEW'
      ? filteredPendingReviewConflicts
      : filteredOpenConflicts;

  const handleSelectAllVisible = () => {
    if (
      selectedConflictIds.length === currentVisibleConflicts.length &&
      currentVisibleConflicts.length > 0
    ) {
      setSelectedConflictIds([]);
    } else {
      setSelectedConflictIds(currentVisibleConflicts.map((c) => c.conflictId));
    }
  };

  const handleSelectAllCritical = () => {
    const criticals = currentVisibleConflicts.filter((c) => c.severity === 'CRITICAL');
    setSelectedConflictIds(criticals.map((c) => c.conflictId));
  };

  const handleBatchMoveToStatus = async (
    targetStatus: 'PENDING_REVIEW' | 'RESOLVED' | 'OPEN',
    reason?: string
  ) => {
    if (selectedConflictIds.length === 0) return;
    setIsMovingStatus(true);
    try {
      railwayAudio.playBeep(targetStatus === 'RESOLVED' ? 880 : 720, 0.04);
      const res = await batchUpdateConflictStatus(selectedConflictIds, targetStatus, {
        reason:
          reason ||
          `Batch updated to ${targetStatus} via Conflict Management batch action menu by Senior Controller.`,
      });
      if (res.success) {
        railwayAudio.playStationChime();
        const statusLabel =
          targetStatus === 'PENDING_REVIEW'
            ? "'Pending Review'"
            : targetStatus === 'RESOLVED'
            ? "'Resolved'"
            : "'Open'";
        setBatchActionNotification({
          message: `Batch Action Success: Successfully moved ${res.updatedCount} selected conflict(s) to ${statusLabel} state.`,
          type: 'success',
        });
        setTimeout(() => setBatchActionNotification(null), 5500);
        setSelectedConflictIds([]);
        onRefreshConflicts();
      }
    } catch (err) {
      console.error(`Failed to batch move conflicts to ${targetStatus}:`, err);
      setBatchActionNotification({
        message: `Failed to update conflicts to ${targetStatus}. Please verify network and try again.`,
        type: 'error',
      });
      setTimeout(() => setBatchActionNotification(null), 5000);
    } finally {
      setIsMovingStatus(false);
      setIsBatchActionMenuOpen(false);
    }
  };

  const handleBatchResolveSelected = async () => {
    await handleBatchMoveToStatus('RESOLVED');
  };

  const clearAllFilters = () => {
    selectAllSeverities();
    setCorridorFilter('ALL');
    setSearchQuery('');
  };

  const hasActiveFilters = !isAllSelected || corridorFilter !== 'ALL' || searchQuery.trim() !== '';

  const renderSeverityBadge = (severity: Conflict['severity'], conflictType?: string) => {
    if (conflictType === 'DEPENDENCY_CONFLICT') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-amber-950/90 text-amber-300 border border-amber-500 shadow-xs">
          <Zap className="w-3 h-3 text-amber-400 shrink-0" />
          <span>DEPENDENCY</span>
        </span>
      );
    }
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

  const renderStatusBadge = (status: Conflict['status']) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-amber-950 text-amber-300 border border-amber-600 shadow-xs">
            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
            <span>PENDING REVIEW</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-xs">
            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>RESOLVED</span>
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-slate-900 text-slate-400 border border-slate-700">
            <Archive className="w-3 h-3 text-slate-400 shrink-0" />
            <span>CLOSED</span>
          </span>
        );
      case 'OPEN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-xs">
            <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
            <span>OPEN</span>
          </span>
        );
    }
  };

  const renderBatchActionBar = () => {
    if (selectedConflictIds.length === 0) return null;

    return (
      <div
        id="batch-actions-bar"
        data-testid="batch-actions-bar"
        className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#0b1736] via-[#102048] to-[#121c3b] border-2 border-sky-500/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xl animate-in fade-in"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500 text-slate-950 font-bold shrink-0 shadow-md">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {selectedConflictIds.length} Conflict{selectedConflictIds.length > 1 ? 's' : ''} Selected
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900 text-sky-200 border border-sky-600 font-bold">
                BATCH ACTION MENU
              </span>
            </div>
            <p className="text-[11px] text-sky-300/90 font-mono mt-0.5">
              Apply single-action state transitions across all checked conflicts (move to 'Pending Review' or 'Resolved').
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action 1: Move to Pending Review */}
          <button
            type="button"
            id="btn-batch-move-pending-review"
            data-testid="btn-batch-move-pending-review"
            onClick={() => handleBatchMoveToStatus('PENDING_REVIEW')}
            disabled={isMovingStatus}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-950/50 transition-all disabled:opacity-50"
            title="Move all selected conflicts to 'Pending Review' state in a single action"
          >
            <Clock className="w-4 h-4 text-amber-100" />
            <span>Move to 'Pending Review' ({selectedConflictIds.length})</span>
          </button>

          {/* Action 2: Move to Resolved */}
          <button
            type="button"
            id="btn-batch-move-resolved"
            data-testid="btn-batch-move-resolved"
            onClick={() => handleBatchMoveToStatus('RESOLVED')}
            disabled={isMovingStatus}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/50 transition-all disabled:opacity-50"
            title="Move all selected conflicts to 'Resolved' state in a single action"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-100" />
            <span>Move to 'Resolved' ({selectedConflictIds.length})</span>
          </button>

          {/* Checkbox-based Batch Action Menu Dropdown */}
          <div className="relative" ref={batchMenuRef}>
            <button
              type="button"
              id="btn-batch-action-menu"
              data-testid="btn-batch-action-menu"
              onClick={() => setIsBatchActionMenuOpen(!isBatchActionMenuOpen)}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-200 border border-sky-600/70 font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              title="Open batch action menu for state transitions and optimizations"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              <span>Batch Actions Menu</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBatchActionMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isBatchActionMenuOpen && (
              <div
                id="batch-action-menu-dropdown"
                data-testid="batch-action-menu-dropdown"
                className="absolute right-0 mt-1.5 w-72 rounded-xl bg-[#091124] border border-sky-600/80 shadow-2xl p-2 z-50 text-xs font-mono animate-in fade-in"
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Target State Transition ({selectedConflictIds.length} Selected)
                </div>

                <button
                  type="button"
                  id="menu-action-move-pending-review"
                  onClick={() => handleBatchMoveToStatus('PENDING_REVIEW')}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-amber-950/70 text-amber-200 flex items-center gap-2.5 cursor-pointer transition-colors mt-1"
                >
                  <div className="p-1.5 rounded bg-amber-950 border border-amber-700 text-amber-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Move to 'Pending Review'</div>
                    <div className="text-[10px] text-slate-400">Mark for Section Controller sign-off</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="menu-action-move-resolved"
                  onClick={() => handleBatchMoveToStatus('RESOLVED')}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-emerald-950/70 text-emerald-200 flex items-center gap-2.5 cursor-pointer transition-colors mt-1"
                >
                  <div className="p-1.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Move to 'Resolved'</div>
                    <div className="text-[10px] text-slate-400">Assign certified alternative window</div>
                  </div>
                </button>

                <button
                  type="button"
                  id="menu-action-move-open"
                  onClick={() => handleBatchMoveToStatus('OPEN')}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-rose-950/70 text-rose-200 flex items-center gap-2.5 cursor-pointer transition-colors border-t border-slate-800/80 mt-1"
                >
                  <div className="p-1.5 rounded bg-rose-950 border border-rose-700 text-rose-400">
                    <RotateCcw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold">Revert to 'Open'</div>
                    <div className="text-[10px] text-slate-400">Restore to active unaddressed queue</div>
                  </div>
                </button>

                <div className="border-t border-slate-800/80 my-1 pt-1">
                  <button
                    type="button"
                    id="menu-action-batch-group-offsets"
                    onClick={() => {
                      setIsBatchActionMenuOpen(false);
                      setActiveTab('BATCH_GROUPS');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-950/60 text-indigo-200 flex items-center gap-2 cursor-pointer transition-colors text-[11px]"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Group &amp; Apply AI Offsets</span>
                  </button>
                  <button
                    type="button"
                    id="menu-action-select-critical"
                    onClick={() => {
                      handleSelectAllCritical();
                      setIsBatchActionMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-slate-800 text-sky-300 flex items-center gap-2 cursor-pointer transition-colors text-[11px]"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-rose-400" />
                    <span>Select Critical Only</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSelectedConflictIds([])}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono cursor-pointer transition-colors"
          >
            Clear Selection
          </button>
        </div>
      </div>
    );
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
            {/* AI Assist Button calling Gemini engine for schedule offsets */}
            <button
              id="btn-conflict-ai-assist"
              data-testid="btn-conflict-ai-assist"
              onClick={() => handleOpenAiAssist()}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-800 via-purple-800 to-sky-800 hover:from-indigo-700 hover:via-purple-700 hover:to-sky-700 border border-indigo-400/60 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/60 transition-all hover:scale-[1.02]"
              title="Call Gemini engine to propose specific maintenance schedule offsets to resolve conflicting block requests based on corridor availability"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>AI Assist</span>
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-black/40 text-indigo-200 border border-indigo-300/40">
                Gemini
              </span>
            </button>

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

            {/* What-If Simulator Tool Header Action */}
            <button
              id="btn-open-what-if-tool"
              data-testid="btn-open-what-if-tool"
              onClick={() => setActiveTab('WHAT_IF_SIMULATOR')}
              className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-800 to-teal-800 hover:from-emerald-700 hover:to-teal-700 border border-emerald-400/60 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/60 transition-all hover:scale-[1.02]"
              title="Open interactive What-If delay simulator tool to toggle specific maintenance blocks off and update train delay projections"
            >
              <Activity className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>&quot;What-If&quot; Delay Simulator</span>
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-black/40 text-emerald-200 border border-emerald-300/40">
                Tool
              </span>
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

      {/* DEPENDENCY CONFLICT NOTIFICATION & RECONCILIATION BANNER */}
      <DependencyConflictBanner
        conflicts={conflicts}
        onRefreshConflicts={onRefreshConflicts}
        className="mb-6"
      />

      {/* AUTO-ARCHIVE NOTIFICATION BANNER */}
      {archiveNotification && (
        <div
          id="archive-notification-banner"
          data-testid="archive-notification-banner"
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            archiveNotification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
              : 'bg-sky-950/80 border-sky-500/80 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Archive className="w-5 h-5 shrink-0 text-emerald-400" />
            <span>{archiveNotification.message}</span>
          </div>
          <button
            onClick={() => setArchiveNotification(null)}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* AUTO-ARCHIVE RESOLVED TO DATABASE CONTROLLER */}
      <div
        id="auto-archive-control-card"
        data-testid="auto-archive-control-card"
        className="bg-[#0b1429] border border-blue-900/60 rounded-xl p-4 sm:p-5 shadow-lg space-y-3"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              autoArchiveResolved
                ? 'bg-emerald-950/90 border-emerald-600/80 text-emerald-400 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono flex items-center gap-1.5">
                  <Archive className="w-4 h-4 text-sky-400" />
                  Auto-Archive Resolved Conflicts
                </h3>
                <span
                  id="badge-auto-archive-status"
                  data-testid="badge-auto-archive-status"
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider border ${
                    autoArchiveResolved
                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}
                >
                  {autoArchiveResolved ? 'AUTO-ARCHIVE: ACTIVE' : 'MANUAL ARCHIVE ONLY'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  publicationInfo?.currentState === 'PUBLISHED'
                    ? 'bg-blue-950 text-sky-300 border-blue-700 font-bold'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}>
                  {publicationInfo?.currentState === 'PUBLISHED'
                    ? `TIMETABLE: PUBLISHED (${publicationInfo.publishedScheduleId || publicationInfo.scheduleVersion})`
                    : 'TIMETABLE: DRAFT / VALIDATION'}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-1">
                When enabled, conflicts in <span className="text-emerald-400 font-semibold">&apos;Resolved&apos;</span> state automatically transition to <span className="text-sky-300 font-semibold">&apos;Closed&apos;</span> in the database as soon as the associated block request is published and operational clearance is certified.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center flex-wrap">
            {/* Toggle Switch */}
            <label
              htmlFor="toggle-auto-archive-resolved"
              className="flex items-center gap-2.5 cursor-pointer bg-slate-900/90 hover:bg-slate-900 border border-slate-700 hover:border-sky-500 px-3 py-1.5 rounded-lg transition-all"
            >
              <span className="text-xs font-mono text-slate-200 font-semibold">
                Auto-Archive:
              </span>
              <input
                id="toggle-auto-archive-resolved"
                data-testid="toggle-auto-archive-resolved"
                type="checkbox"
                checked={autoArchiveResolved}
                onChange={(e) => handleToggleAutoArchive(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                  autoArchiveResolved ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoArchiveResolved ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </div>
              <span className={`text-xs font-mono font-bold ${autoArchiveResolved ? 'text-emerald-400' : 'text-slate-400'}`}>
                {autoArchiveResolved ? 'ON' : 'OFF'}
              </span>
            </label>

            {/* Run Auto-Archive Now Button */}
            <button
              id="btn-run-auto-archive"
              data-testid="btn-run-auto-archive"
              onClick={handleTriggerAutoArchiveNow}
              disabled={isArchiving}
              className="px-3.5 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-600/80 text-sky-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors disabled:opacity-50"
              title="Trigger immediate auto-archive database check for resolved conflicts"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-sky-400 ${isArchiving ? 'animate-spin' : ''}`} />
              <span>{isArchiving ? 'Archiving...' : 'Trigger Archive Now'}</span>
            </button>
          </div>
        </div>

        {/* Database Hygiene Summary Stats Strip */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Open Pending: <strong className="text-slate-200 font-bold">{openConflicts.length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Resolved Queue: <strong className="text-slate-200 font-bold">{resolvedConflicts.length}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              Closed / Archived in DB: <strong className="text-slate-200 font-bold">{closedConflicts.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('CLOSED')}
              className="text-[10px] text-sky-400 hover:text-sky-300 underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              <ArchiveRestore className="w-3 h-3" />
              <span>Inspect Closed Archive ({closedConflicts.length})</span>
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

      {/* CONFLICT QUEUE TABS: OPEN / RESOLVED / CLOSED ARCHIVE */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
        <button
          id="tab-conflicts-open"
          data-testid="tab-conflicts-open"
          onClick={() => setActiveTab('OPEN')}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'OPEN'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/60 border border-blue-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'OPEN' ? 'text-white' : 'text-amber-400'}`} />
          <span>Open Conflicts</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
            activeTab === 'OPEN' ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {filteredOpenConflicts.length} / {openConflicts.length}
          </span>
        </button>

        {/* PENDING REVIEW TAB */}
        <button
          id="tab-conflicts-pending-review"
          data-testid="tab-conflicts-pending-review"
          onClick={() => {
            setActiveTab('PENDING_REVIEW');
            setSelectedConflictIds([]);
          }}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'PENDING_REVIEW'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-950/60 border border-amber-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Clock className={`w-3.5 h-3.5 ${activeTab === 'PENDING_REVIEW' ? 'text-white' : 'text-amber-400'}`} />
          <span>Pending Review</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
            activeTab === 'PENDING_REVIEW' ? 'bg-amber-800 text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {filteredPendingReviewConflicts.length} / {pendingReviewConflicts.length}
          </span>
        </button>

        {/* BATCH RESOLVE CLUSTERS TAB */}
        <button
          id="tab-conflicts-batch-groups"
          data-testid="tab-conflicts-batch-groups"
          onClick={() => setActiveTab('BATCH_GROUPS')}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'BATCH_GROUPS'
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-950/60 border border-indigo-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Sparkles className={`w-3.5 h-3.5 ${activeTab === 'BATCH_GROUPS' ? 'text-amber-300' : 'text-indigo-400'}`} />
          <span>Batch Resolve Clusters</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            activeTab === 'BATCH_GROUPS'
              ? 'bg-indigo-900 text-white'
              : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
          }`}>
            AI OFFSETS
          </span>
        </button>

        <button
          id="tab-conflicts-resolved"
          data-testid="tab-conflicts-resolved"
          onClick={() => setActiveTab('RESOLVED')}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'RESOLVED'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <CheckCircle2 className={`w-3.5 h-3.5 ${activeTab === 'RESOLVED' ? 'text-white' : 'text-emerald-400'}`} />
          <span>Resolved History</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
            activeTab === 'RESOLVED' ? 'bg-emerald-800 text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {filteredResolvedConflicts.length} / {resolvedConflicts.length}
          </span>
        </button>

        <button
          id="tab-conflicts-closed"
          data-testid="tab-conflicts-closed"
          onClick={() => setActiveTab('CLOSED')}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'CLOSED'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/60 border border-sky-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
        >
          <Archive className={`w-3.5 h-3.5 ${activeTab === 'CLOSED' ? 'text-white' : 'text-sky-400'}`} />
          <span>Closed Archive (Database)</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
            activeTab === 'CLOSED' ? 'bg-sky-800 text-white' : 'bg-slate-800 text-slate-300'
          }`}>
            {filteredClosedConflicts.length} / {closedConflicts.length}
          </span>
        </button>

        {/* WHAT-IF SIMULATOR TOOL TAB */}
        <button
          id="tab-conflicts-what-if"
          data-testid="tab-conflicts-what-if"
          onClick={() => setActiveTab('WHAT_IF_SIMULATOR')}
          className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'WHAT_IF_SIMULATOR'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60 border border-emerald-400'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
          }`}
          title="Open 'What-If' simulator tool to toggle specific maintenance blocks off and instantly update train delay projections"
        >
          <Activity className={`w-3.5 h-3.5 ${activeTab === 'WHAT_IF_SIMULATOR' ? 'text-white' : 'text-emerald-400'}`} />
          <span>&quot;What-If&quot; Delay Simulator</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            activeTab === 'WHAT_IF_SIMULATOR'
              ? 'bg-emerald-900 text-white'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
          }`}>
            SIMULATOR
          </span>
        </button>
      </div>

      {/* CONFLICTS TABLE VIEW */}
      {activeTab === 'OPEN' && (
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

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Switcher between Table & Cluster Groups */}
            <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-[11px] font-mono">
              <button
                type="button"
                id="btn-view-mode-table"
                onClick={() => setOpenConflictsViewMode('TABLE')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  openConflictsViewMode === 'TABLE'
                    ? 'bg-sky-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                id="btn-view-mode-clusters"
                onClick={() => setOpenConflictsViewMode('CLUSTERS')}
                className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                  openConflictsViewMode === 'CLUSTERS'
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Cluster Groups</span>
              </button>
            </div>

            <button
              id="btn-switch-to-batch-groups-tab"
              onClick={() => setActiveTab('BATCH_GROUPS')}
              className="px-3 py-1 rounded-lg bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open full Batch Conflict Resolution & Cluster Offsets panel"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Batch AI Offsets</span>
            </button>

            <span className="text-[10px] font-mono px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800">
              Resolved: {resolvedConflicts.length} / {conflicts.length} Total
            </span>
          </div>
        </div>

        {/* BATCH ACTION NOTIFICATION & ACTION BAR */}
        {batchActionNotification && (
          <div
            id="batch-action-notification-toast"
            className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in ${
              batchActionNotification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600 shadow-lg'
                : 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {batchActionNotification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              )}
              <span className="font-bold">{batchActionNotification.message}</span>
            </div>
            <button
              onClick={() => setBatchActionNotification(null)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {renderBatchActionBar()}

        {openConflictsViewMode === 'CLUSTERS' ? (
          <div className="mt-2">
            <BatchConflictResolutionPanel
              conflicts={conflicts}
              corridors={corridors}
              blocks={blocks}
              onRefreshConflicts={onRefreshConflicts}
              onNavigateToConflictDetail={(cId) => {
                const found = conflicts.find((c) => c.conflictId === cId);
                if (found) {
                  setOpenConflictsViewMode('TABLE');
                  handleOpenFindAlternatives(found);
                }
              }}
            />
          </div>
        ) : filteredOpenConflicts.length > 0 ? (
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
                      <td className="py-3 px-3 whitespace-nowrap">{renderSeverityBadge(c.severity, c.conflictType)}</td>
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
                          {c.conflictType === 'DEPENDENCY_CONFLICT' ? (
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Train className="w-3.5 h-3.5" />
                          )}
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
                          {/* Gemini AI Assist Quick Button */}
                          <button
                            id={`btn-ai-assist-${c.conflictId.toLowerCase()}`}
                            data-testid={`btn-ai-assist-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenAiAssist(c.conflictId)}
                            title="Call Gemini AI to propose schedule offsets for this conflict based on corridor availability"
                            className="p-1.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-300 cursor-pointer transition-colors shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          </button>

                          {/* What-If Simulator Quick Button */}
                          <button
                            id={`btn-what-if-${c.conflictId.toLowerCase()}`}
                            onClick={() => handleOpenWhatIf(c)}
                            title="Simulate knock-on ripple delay and secondary passenger train impacts"
                            className="p-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-700/80 text-sky-300 cursor-pointer transition-colors"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>

                          {/* What-If Simulator Tool Switch Button */}
                          <button
                            id={`btn-what-if-tool-${c.conflictId.toLowerCase()}`}
                            data-testid={`btn-what-if-tool-${c.conflictId.toLowerCase()}`}
                            onClick={() => {
                              setActiveTab('WHAT_IF_SIMULATOR');
                            }}
                            title="Open 'What-If' Delay Simulator Tool to toggle this block off and instantly update train delay projections"
                            className="p-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 cursor-pointer transition-colors shadow-xs"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
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

                          {/* Primary Action Button: Propose Time Shift for Dependency Conflicts, Find Alternative for train conflicts */}
                          {c.conflictType === 'DEPENDENCY_CONFLICT' || !!c.dependencyDetails ? (
                            <button
                              id={`btn-propose-shift-${c.conflictId.toLowerCase()}`}
                              onClick={() => {
                                setSelectedDependencyConflict(c);
                                setIsDependencyModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-[11px] shadow-md shadow-amber-950/40 flex items-center gap-1.5 cursor-pointer transition-all animate-pulse"
                              title="Propose Time Shift to reconcile Electrical vs. Track maintenance dependency"
                            >
                              <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>PROPOSE TIME SHIFT</span>
                            </button>
                          ) : (
                            <button
                              id={`btn-alt-slot-${c.conflictId.toLowerCase()}`}
                              onClick={() => handleOpenFindAlternatives(c)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-semibold text-[11px] shadow-md shadow-blue-950/40 flex items-center gap-1.5 cursor-pointer transition-all"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>FIND ALTERNATIVE</span>
                            </button>
                          )}
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
      )}

      {/* PENDING REVIEW CONFLICTS TAB VIEW */}
      {activeTab === 'PENDING_REVIEW' && (
        <div id="pending-review-conflicts-section" data-testid="pending-review-conflicts-section" className="bg-[#0e172e] p-5 rounded-xl border border-amber-950/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-amber-950 border border-amber-700 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Pending Review Conflicts ({filteredPendingReviewConflicts.length} of {pendingReviewConflicts.length} Under Review)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  CONTROLLER REVIEW QUEUE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Conflicts moved to 'Pending Review' awaiting Section Controller review or joint department sign-off. Use checkboxes to select multiple conflicts and resolve or revert them in a single action.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                id="btn-pending-select-all"
                data-testid="btn-pending-select-all"
                onClick={handleSelectAllVisible}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {selectedConflictIds.length === filteredPendingReviewConflicts.length && filteredPendingReviewConflicts.length > 0
                    ? 'Deselect All'
                    : `Select All (${filteredPendingReviewConflicts.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* BATCH ACTION NOTIFICATION & ACTION BAR */}
          {batchActionNotification && (
            <div
              id="batch-action-notification-toast"
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in ${
                batchActionNotification.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600 shadow-lg'
                  : 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-lg'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {batchActionNotification.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                )}
                <span className="font-bold">{batchActionNotification.message}</span>
              </div>
              <button
                onClick={() => setBatchActionNotification(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {renderBatchActionBar()}

          {filteredPendingReviewConflicts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs font-mono text-[11px]">
                <thead className="bg-[#0a1020] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllVisible}
                        className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
                        title="Select all visible"
                      >
                        {selectedConflictIds.length === filteredPendingReviewConflicts.length && filteredPendingReviewConflicts.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Conflict ID</th>
                    <th className="py-2.5 px-3">Corridor</th>
                    <th className="py-2.5 px-3">Block ID</th>
                    <th className="py-2.5 px-3">Conflicting Train</th>
                    <th className="py-2.5 px-3">Review Notes / Reason</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredPendingReviewConflicts.map((c) => {
                    const isSelected = selectedConflictIds.includes(c.conflictId);
                    return (
                      <tr
                        key={c.conflictId}
                        className={`transition-colors border-l-4 border-l-amber-500 ${
                          isSelected ? 'bg-amber-950/40' : 'hover:bg-slate-800/30 text-slate-300'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectConflict(c.conflictId)}
                            className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">{renderSeverityBadge(c.severity, c.conflictType)}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-bold">{c.conflictId}</td>
                        <td className="py-2.5 px-3 font-semibold text-sky-300">{c.corridorId}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {c.blockId}
                          <span className="text-[10px] text-slate-400 block font-normal">{c.taskType}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-bold text-purple-300">{c.trainNumber}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{c.trainName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div className="text-amber-300 font-medium">
                            {c.resolutionNotes || 'Pending Controller Clearance'}
                          </div>
                          <div className="text-[10px] text-slate-400">{c.description}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              id={`btn-resolve-pending-${c.conflictId}`}
                              data-testid={`btn-resolve-pending-${c.conflictId}`}
                              onClick={() => {
                                setSelectedConflictIds([c.conflictId]);
                                handleBatchMoveToStatus('RESOLVED');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Resolve</span>
                            </button>
                            <button
                              type="button"
                              id={`btn-reopen-pending-${c.conflictId}`}
                              data-testid={`btn-reopen-pending-${c.conflictId}`}
                              onClick={() => {
                                setSelectedConflictIds([c.conflictId]);
                                handleBatchMoveToStatus('OPEN');
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 text-slate-400" />
                              <span>Revert to Open</span>
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
              <Clock className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-200 font-mono uppercase">
                No Conflicts in Pending Review
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {pendingReviewConflicts.length === 0
                  ? "Select multiple conflicts using checkboxes on the 'Open Conflicts' tab and use the Batch Action Menu to move them to 'Pending Review'."
                  : 'No pending review conflicts match the active filter criteria.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* BATCH RESOLVE CLUSTERS TAB VIEW */}
      {activeTab === 'BATCH_GROUPS' && (
        <BatchConflictResolutionPanel
          conflicts={conflicts}
          corridors={corridors}
          blocks={blocks}
          onRefreshConflicts={onRefreshConflicts}
          onNavigateToConflictDetail={(cId) => {
            const found = conflicts.find((c) => c.conflictId === cId);
            if (found) {
              setActiveTab('OPEN');
              setOpenConflictsViewMode('TABLE');
              handleOpenFindAlternatives(found);
            }
          }}
        />
      )}

      {/* RESOLVED CONFLICTS SECTION (Visible on RESOLVED tab or as preview when OPEN) */}
      {(activeTab === 'RESOLVED' || (activeTab === 'OPEN' && resolvedConflicts.length > 0)) && (
        <div id="resolved-conflicts-section" data-testid="resolved-conflicts-section" className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Resolved Conflicts History ({filteredResolvedConflicts.length} of {resolvedConflicts.length} Rescheduled)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  RESOLVED QUEUE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Audit trail of resolved train clashes and approved alternative slot assignments awaiting timetable publication or manual database closure.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isAllSelected && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                  Filtered: {getDropdownLabel()}
                </span>
              )}
              <button
                id="btn-archive-all-resolved"
                data-testid="btn-archive-all-resolved"
                onClick={handleCloseAllResolved}
                disabled={isArchiving || resolvedConflicts.length === 0}
                className="px-3 py-1.5 rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-600/80 text-sky-200 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors disabled:opacity-50"
                title="Archive all resolved conflicts to Closed status in database"
              >
                <Archive className="w-3.5 h-3.5 text-sky-400" />
                <span>Archive All to DB ({resolvedConflicts.length})</span>
              </button>
            </div>
          </div>

          {filteredResolvedConflicts.length > 0 ? (
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
                    <th className="py-2.5 px-3 text-right">Archival Action</th>
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
                      <td className="py-2.5 px-3 text-right">
                        <button
                          id={`btn-close-conflict-${c.conflictId}`}
                          data-testid={`btn-close-conflict-${c.conflictId}`}
                          onClick={() => handleManualCloseConflict(c.conflictId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Archive this resolved conflict to Closed state in database"
                        >
                          <Archive className="w-3 h-3 text-sky-400" />
                          <span>Close / Archive</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-900/60 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 font-mono">
                {resolvedConflicts.length === 0
                  ? 'No resolved conflicts in queue. Resolve open conflicts with AI alternative slots to view them here.'
                  : 'No resolved conflicts match the active filter criteria.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CLOSED CONFLICTS ARCHIVE SECTION (DATABASE) */}
      {activeTab === 'CLOSED' && (
        <div id="closed-conflicts-archive-section" data-testid="closed-conflicts-archive-section" className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-sky-950 border border-sky-700 text-sky-400">
                  <Archive className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                  Closed Conflicts Archive ({filteredClosedConflicts.length} of {closedConflicts.length} in Database)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold">
                  DATABASE ARCHIVE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Permanent operational records of resolved conflicts transitioned to &apos;Closed&apos; state once their underlying block request was formally published and cleared in the operational timetable.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-900 text-sky-300 border border-slate-800">
                {autoArchiveResolved ? 'Auto-Archive Policy: Active' : 'Manual Archival Mode'}
              </span>
            </div>
          </div>

          {filteredClosedConflicts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-left text-xs font-mono text-[11px]">
                <thead className="bg-[#0a1020] text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Severity</th>
                    <th className="py-2.5 px-3">Conflict ID</th>
                    <th className="py-2.5 px-3">Corridor & Block</th>
                    <th className="py-2.5 px-3">Conflicting Train</th>
                    <th className="py-2.5 px-3">Closure Timestamp</th>
                    <th className="py-2.5 px-3">Database Clearance Rationale</th>
                    <th className="py-2.5 px-3">Database State</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredClosedConflicts.map((c) => (
                    <tr key={c.conflictId} className="hover:bg-slate-800/30 text-slate-300">
                      <td className="py-2.5 px-3">{renderSeverityBadge(c.severity)}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-400">{c.conflictId}</td>
                      <td className="py-2.5 px-3 font-semibold text-sky-300">
                        {c.corridorId} - {c.blockId}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300">{c.trainNumber}</td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                        {c.closedAt ? new Date(c.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Published'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-xs">
                        <div className="font-medium text-emerald-300 truncate" title={c.closedReason || 'Operational clearance certified.'}>
                          {c.closedReason || 'Auto-archived upon timetable publication and clearance.'}
                        </div>
                        {c.alternativeAppliedSlot && (
                          <div className="text-[10px] text-slate-400">
                            Applied Slot: {c.alternativeAppliedSlot}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 border border-sky-800 flex items-center gap-1 w-fit font-bold">
                          <Database className="w-3 h-3 text-sky-400" />
                          CLOSED
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          id={`btn-reopen-conflict-${c.conflictId}`}
                          data-testid={`btn-reopen-conflict-${c.conflictId}`}
                          onClick={() => handleReopenConflict(c.conflictId)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[10px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                          title="Reopen this conflict and restore it to the Resolved queue"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Reopen</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/60 rounded-lg border border-slate-800 space-y-2">
              <Archive className="w-8 h-8 text-sky-400 mx-auto opacity-70" />
              <h4 className="text-sm font-bold text-slate-200 font-mono">
                {closedConflicts.length === 0 ? 'No Archived Conflicts Yet' : 'No Closed Conflicts Match Current Filters'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {closedConflicts.length === 0
                  ? "When 'Auto-Archive Resolved' is ON, resolved conflicts automatically transition to this database archive as soon as the maintenance block schedule is published in the Final Safety Gate. You can also manually archive individual resolved conflicts from the Resolved tab."
                  : 'Adjust your corridor, severity, or search filters to see all closed conflict records in the database.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* WHAT-IF MAINTENANCE BLOCK DELAY SIMULATOR VIEW */}
      {activeTab === 'WHAT_IF_SIMULATOR' && (
        <div
          id="what-if-delay-simulator-view"
          data-testid="what-if-delay-simulator-view"
          className="animate-in fade-in duration-200"
        >
          <WhatIfMaintenanceBlockSimulator
            conflicts={conflicts}
            corridors={corridors}
            blocks={blocks}
            onRefreshConflicts={onRefreshConflicts}
            onNavigateToScreen={onNavigate}
            initialTargetBlockId={targetConflictBlockId}
          />
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

      {/* DEPENDENCY CONFLICT RECONCILIATION MODAL */}
      {selectedDependencyConflict && (
        <DependencyReconciliationModal
          conflict={selectedDependencyConflict}
          isOpen={isDependencyModalOpen}
          onClose={() => {
            setIsDependencyModalOpen(false);
            setSelectedDependencyConflict(null);
          }}
          onResolved={() => {
            onRefreshConflicts();
          }}
        />
      )}

      {/* GEMINI AI CONFLICT ASSIST SCHEDULE OFFSET MODAL */}
      <AiConflictAssistModal
        isOpen={isAiAssistModalOpen}
        onClose={() => {
          setIsAiAssistModalOpen(false);
          setAiAssistSelectedConflictId(null);
        }}
        conflicts={conflicts}
        corridors={INITIAL_CORRIDORS}
        initialSelectedConflictId={aiAssistSelectedConflictId}
        onApplied={() => {
          onRefreshConflicts();
        }}
      />
    </div>
  );
};
