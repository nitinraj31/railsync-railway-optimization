import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Flame,
  Activity,
  Clock,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  ChevronRight,
  Layers,
  Sparkles,
  MapPin,
  TrendingUp,
  X,
  Gauge,
  Sliders,
  Printer,
  Info,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldAlert,
  Radio,
  Play,
  Pause,
  RefreshCw,
  Compass,
  Zap,
} from 'lucide-react';
import {
  corridorTrackSegmentHeatmapService,
  HeatmapTrackSegment,
  MaintenanceSeverityTier,
  getSeverityColorHex,
  getDurationColorHex,
  getCompositeHeatScore,
  getSeverityBadgeProps,
  getDurationBadgeProps,
  CORRIDOR_HEATMAP_SEGMENTS,
  isZeroMaintenanceRequired,
} from '../../services/corridorTrackSegmentHeatmapService';
import { railwayAudio } from '../../services/railwayAudio';
import { MaintenanceTask } from '../../types';
import { PredictiveCriticalityAlertModal } from './PredictiveCriticalityAlertModal';

export type HeatmapMetricMode = 'SEVERITY' | 'DURATION' | 'COMPOSITE';
export type HeatmapVisualLayout = 'TOPOLOGY_CANVAS' | 'LINEAR_RIBBONS' | 'MATRIX_GRID';

interface CorridorTrackSegmentHeatmapProps {
  selectedCorridorId?: string;
  onSelectCorridor?: (corridorId: string) => void;
  onScheduleBlock?: (segment: HeatmapTrackSegment) => void;
  onTaskCreated?: (task: MaintenanceTask, segment: HeatmapTrackSegment) => void;
  metricMode?: HeatmapMetricMode;
  onMetricModeChange?: (mode: HeatmapMetricMode) => void;
  hideZeroMaintenance?: boolean;
  onToggleHideZeroMaintenance?: (hide: boolean) => void;
}

export const CorridorTrackSegmentHeatmap: React.FC<CorridorTrackSegmentHeatmapProps> = ({
  selectedCorridorId = 'ALL',
  onSelectCorridor,
  onScheduleBlock,
  onTaskCreated,
  metricMode: controlledMetricMode,
  onMetricModeChange,
  hideZeroMaintenance: controlledHideZeroMaintenance,
  onToggleHideZeroMaintenance,
}) => {
  // Metric Mode (Severity-based vs Repair Duration-based)
  const [internalMetricMode, setInternalMetricMode] = useState<HeatmapMetricMode>('SEVERITY');
  const metricMode = controlledMetricMode !== undefined ? controlledMetricMode : internalMetricMode;

  const handleSetMetricMode = (newMode: HeatmapMetricMode) => {
    setInternalMetricMode(newMode);
    if (onMetricModeChange) {
      onMetricModeChange(newMode);
    }
  };

  // Secondary Control: Show/Hide Segments with 'Zero Maintenance Required' status to declutter
  const [internalHideZeroMaintenance, setInternalHideZeroMaintenance] = useState<boolean>(false);
  const hideZeroMaintenance =
    controlledHideZeroMaintenance !== undefined
      ? controlledHideZeroMaintenance
      : internalHideZeroMaintenance;

  const handleToggleHideZeroMaintenance = (nextVal?: boolean) => {
    const newVal = nextVal !== undefined ? nextVal : !hideZeroMaintenance;
    setInternalHideZeroMaintenance(newVal);
    if (onToggleHideZeroMaintenance) {
      onToggleHideZeroMaintenance(newVal);
    }
  };

  // Visual layout tab
  const [visualLayout, setVisualLayout] = useState<HeatmapVisualLayout>('TOPOLOGY_CANVAS');

  // Corridor & Filters
  const [corridorFilter, setCorridorFilter] = useState<string>(selectedCorridorId === 'ALL' ? 'ALL' : selectedCorridorId);
  const [activeTierFilter, setActiveTierFilter] = useState<'ALL' | 'TIER_1' | 'TIER_2' | 'TIER_3' | 'TIER_4' | 'TIER_5'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Real-time live telemetry stream state
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [liveSegments, setLiveSegments] = useState<HeatmapTrackSegment[]>(() =>
    corridorTrackSegmentHeatmapService.getSegments('ALL')
  );
  const [packetCount, setPacketCount] = useState<number>(1428);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string>('Live Stream Active');
  const [liveTelemetryAlert, setLiveTelemetryAlert] = useState<string | null>(null);

  // Inspector & Booking states
  const [hoveredSegment, setHoveredSegment] = useState<HeatmapTrackSegment | null>(null);
  const [activeSegmentModal, setActiveSegmentModal] = useState<HeatmapTrackSegment | null>(null);
  const [bookedSegmentIds, setBookedSegmentIds] = useState<string[]>([]);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  // Check if segment is considered critical in active mode
  const isSegmentCriticalInMode = useCallback(
    (seg: HeatmapTrackSegment | undefined): boolean => {
      if (!seg) return false;
      if (metricMode === 'SEVERITY') {
        return seg.maintenanceSeverityScore >= 80 || seg.severityTier === 'CRITICAL';
      }
      return seg.expectedRepairDurationMinutes >= 135 || seg.durationCategory === 'EXTENDED_MEGA';
    },
    [metricMode]
  );

  // Predictive Criticality Alert Modal State
  const [criticalAlertSegment, setCriticalAlertSegment] = useState<HeatmapTrackSegment | null>(null);
  const [isCriticalAlertOpen, setIsCriticalAlertOpen] = useState<boolean>(false);
  const prevCriticalMapRef = useRef<Map<string, boolean>>(new Map());

  // Initialize prior critical state map on first load
  useEffect(() => {
    liveSegments.forEach((s) => {
      prevCriticalMapRef.current.set(s.segmentId, isSegmentCriticalInMode(s));
    });
  }, []);

  // Sync corridorFilter when parent selectedCorridorId updates
  useEffect(() => {
    if (selectedCorridorId && selectedCorridorId !== 'ALL') {
      setCorridorFilter(selectedCorridorId);
    }
  }, [selectedCorridorId]);

  // Real-time telemetry simulation interval with AUTOMATIC CRITICALITY ALERT TRIGGER
  useEffect(() => {
    if (!isLiveStreaming) return;

    const interval = setInterval(() => {
      setLiveSegments((prev) => {
        const { segments, deltaSummary } = corridorTrackSegmentHeatmapService.simulateRealTimeTelemetry(prev);
        setPacketCount((p) => p + 1);
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        setLastTelemetryTime(`TICK ${timeStr}`);
        setLiveTelemetryAlert(deltaSummary);

        // AUTOMATIC TRIGGER: Check if any segment's heat-map status switched to 'CRITICAL'
        for (const seg of segments) {
          const wasCrit = prevCriticalMapRef.current.get(seg.segmentId) ?? false;
          const isNowCrit = isSegmentCriticalInMode(seg);
          prevCriticalMapRef.current.set(seg.segmentId, isNowCrit);

          // If segment was NOT critical before and is NOW critical, trigger Predictive Criticality Alert!
          if (!wasCrit && isNowCrit) {
            setCriticalAlertSegment(seg);
            setIsCriticalAlertOpen(true);
            break; // Open alert for the first transitioned segment
          }
        }

        return segments;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveStreaming, isSegmentCriticalInMode]);

  // Check if segment matches selected tier based on current metric mode
  const segmentMatchesTier = (seg: HeatmapTrackSegment, tier: typeof activeTierFilter): boolean => {
    if (tier === 'ALL') return true;
    if (metricMode === 'SEVERITY') {
      if (tier === 'TIER_1') return seg.maintenanceSeverityScore <= 25;
      if (tier === 'TIER_2') return seg.maintenanceSeverityScore > 25 && seg.maintenanceSeverityScore <= 45;
      if (tier === 'TIER_3') return seg.maintenanceSeverityScore > 45 && seg.maintenanceSeverityScore <= 65;
      if (tier === 'TIER_4') return seg.maintenanceSeverityScore > 65 && seg.maintenanceSeverityScore <= 84;
      if (tier === 'TIER_5') return seg.maintenanceSeverityScore >= 85 || seg.severityTier === 'CRITICAL';
    } else {
      // DURATION mode
      if (tier === 'TIER_1') return seg.expectedRepairDurationMinutes < 30;
      if (tier === 'TIER_2') return seg.expectedRepairDurationMinutes >= 30 && seg.expectedRepairDurationMinutes <= 60;
      if (tier === 'TIER_3') return seg.expectedRepairDurationMinutes > 60 && seg.expectedRepairDurationMinutes <= 120;
      if (tier === 'TIER_4') return seg.expectedRepairDurationMinutes > 120 && seg.expectedRepairDurationMinutes <= 150;
      if (tier === 'TIER_5') return seg.expectedRepairDurationMinutes > 150;
    }
    return true;
  };

  // All active segments filtered by corridor
  const activeCorridorSegments = useMemo(() => {
    if (corridorFilter === 'ALL') return liveSegments;
    return liveSegments.filter((s) => s.corridorId === corridorFilter);
  }, [liveSegments, corridorFilter]);

  // Total count of segments with 'Zero Maintenance Required' status in active corridor
  const zeroMaintenanceCount = useMemo(() => {
    return activeCorridorSegments.filter((s) => isZeroMaintenanceRequired(s)).length;
  }, [activeCorridorSegments]);

  // Filtered segments by search, active tier, and zero-maintenance declutter toggle
  const filteredSegments = useMemo(() => {
    return activeCorridorSegments.filter((seg) => {
      // Secondary Control: Declutter by hiding 'Zero Maintenance Required' segments
      if (hideZeroMaintenance && isZeroMaintenanceRequired(seg)) {
        return false;
      }
      if (!segmentMatchesTier(seg, activeTierFilter)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          seg.segmentId.toLowerCase().includes(q) ||
          seg.fromStation.toLowerCase().includes(q) ||
          seg.toStation.toLowerCase().includes(q) ||
          seg.primaryDefectCategory.toLowerCase().includes(q) ||
          seg.corridorCode.toLowerCase().includes(q) ||
          seg.trackLine.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [activeCorridorSegments, activeTierFilter, hideZeroMaintenance, metricMode, searchQuery]);

  // Grouped by corridor for linear topology strip view
  const segmentsByCorridor = useMemo(() => {
    const map = new Map<string, HeatmapTrackSegment[]>();
    const corridorKeys = corridorFilter === 'ALL' ? ['C001', 'C002', 'C003', 'C004'] : [corridorFilter];
    corridorKeys.forEach((key) => {
      map.set(
        key,
        liveSegments
          .filter((s) => s.corridorId === key)
          .filter((seg) => {
            // Secondary Control: Declutter by hiding 'Zero Maintenance Required' segments
            if (hideZeroMaintenance && isZeroMaintenanceRequired(seg)) return false;
            if (!segmentMatchesTier(seg, activeTierFilter)) return false;
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                seg.segmentId.toLowerCase().includes(q) ||
                seg.fromStation.toLowerCase().includes(q) ||
                seg.toStation.toLowerCase().includes(q) ||
                seg.primaryDefectCategory.toLowerCase().includes(q)
              );
            }
            return true;
          })
      );
    });
    return map;
  }, [liveSegments, corridorFilter, activeTierFilter, hideZeroMaintenance, metricMode, searchQuery]);

  // Real-time Summary
  const summary = useMemo(() => {
    const list = activeCorridorSegments;
    const critical = list.filter((s) => s.severityTier === 'CRITICAL' || s.maintenanceSeverityScore >= 85).length;
    const high = list.filter((s) => s.maintenanceSeverityScore > 65 && s.maintenanceSeverityScore < 85).length;
    const moderate = list.filter((s) => s.maintenanceSeverityScore > 45 && s.maintenanceSeverityScore <= 65).length;
    const healthy = list.filter((s) => s.maintenanceSeverityScore <= 45).length;

    const totalKm = list.reduce((acc, s) => acc + s.lengthKm, 0);
    const totalMins = list.reduce((acc, s) => acc + s.expectedRepairDurationMinutes, 0);
    const avgSeverity = list.length > 0 ? Math.round(list.reduce((acc, s) => acc + s.maintenanceSeverityScore, 0) / list.length) : 0;
    const threatened = list.reduce((acc, s) => acc + s.threatenedTrainsCount, 0);

    return {
      corridorId: corridorFilter,
      totalSegments: list.length,
      totalRouteKm: +totalKm.toFixed(1),
      criticalSegmentsCount: critical,
      highSegmentsCount: high,
      moderateSegmentsCount: moderate,
      healthySegmentsCount: healthy,
      averageSeverityScore: avgSeverity,
      totalRepairDurationMinutes: totalMins,
      totalRepairDurationHours: +(totalMins / 60).toFixed(1),
      threatenedTrainsTotal: threatened,
    };
  }, [activeCorridorSegments, corridorFilter]);

  // Color resolver based on active metric mode (Green-to-Red)
  const getCellColor = (segment: HeatmapTrackSegment): string => {
    if (metricMode === 'SEVERITY') {
      return getSeverityColorHex(segment.maintenanceSeverityScore);
    }
    if (metricMode === 'DURATION') {
      return getDurationColorHex(segment.expectedRepairDurationMinutes);
    }
    const composite = getCompositeHeatScore(segment.maintenanceSeverityScore, segment.expectedRepairDurationMinutes);
    return getSeverityColorHex(composite);
  };

  // Dynamic Badge text for segments depending on whether mode is Severity-based or Repair Duration-based
  const getSegmentDisplayBadge = (seg: HeatmapTrackSegment | undefined): string => {
    if (!seg) return '';
    return metricMode === 'SEVERITY'
      ? `${seg.maintenanceSeverityScore}%`
      : `${seg.expectedRepairDurationMinutes}m`;
  };

  // Dynamic Warning Label on critical / severe segments
  const getSegmentWarningLabel = (seg: HeatmapTrackSegment | undefined): string => {
    if (!seg) return '';
    return metricMode === 'SEVERITY'
      ? `⚠ CRITICAL (${seg.maintenanceSeverityScore}%)`
      : `⚠ ${seg.expectedRepairDurationMinutes}m MEGA`;
  };

  // Dynamic stroke width based on selected metric
  const getSegmentStrokeWidth = (seg: HeatmapTrackSegment | undefined, base = 8): number => {
    if (!seg) return base;
    if (metricMode === 'SEVERITY') {
      return Math.round(5 + (seg.maintenanceSeverityScore / 100) * 7);
    }
    return Math.round(5 + (Math.min(180, seg.expectedRepairDurationMinutes) / 180) * 7);
  };

  // Segment counts per tier for current metric mode
  const tierCounts = useMemo(() => {
    const list = activeCorridorSegments;
    return {
      tier1: list.filter((s) => segmentMatchesTier(s, 'TIER_1')).length,
      tier2: list.filter((s) => segmentMatchesTier(s, 'TIER_2')).length,
      tier3: list.filter((s) => segmentMatchesTier(s, 'TIER_3')).length,
      tier4: list.filter((s) => segmentMatchesTier(s, 'TIER_4')).length,
      tier5: list.filter((s) => segmentMatchesTier(s, 'TIER_5')).length,
    };
  }, [activeCorridorSegments, metricMode]);

  // Trigger manual telemetry sweep
  const handleManualSweep = () => {
    railwayAudio.playBeep(800, 0.08);
    const { segments, deltaSummary } = corridorTrackSegmentHeatmapService.simulateRealTimeTelemetry(liveSegments);
    setLiveSegments(segments);
    setPacketCount((p) => p + 1);
    setLastTelemetryTime('MANUAL SWEEP EXECUTED');
    setLiveTelemetryAlert(deltaSummary);

    // Check if any segment's status transitioned to CRITICAL
    for (const seg of segments) {
      const wasCrit = prevCriticalMapRef.current.get(seg.segmentId) ?? false;
      const isNowCrit = isSegmentCriticalInMode(seg);
      prevCriticalMapRef.current.set(seg.segmentId, isNowCrit);

      if (!wasCrit && isNowCrit) {
        setCriticalAlertSegment(seg);
        setIsCriticalAlertOpen(true);
        break;
      }
    }
  };

  // Manual trigger to simulate a critical spike on a track segment for testing the alert
  const handleSimulateCriticalSpike = (targetSegId?: string) => {
    const { segments, spikedSegment, deltaSummary } = corridorTrackSegmentHeatmapService.triggerCriticalSpike(
      liveSegments,
      targetSegId
    );
    prevCriticalMapRef.current.set(spikedSegment.segmentId, true);
    setLiveSegments(segments);
    setPacketCount((p) => p + 1);
    setLastTelemetryTime('CRITICAL SPIKE INGESTED');
    setLiveTelemetryAlert(deltaSummary);

    // Automatically triggers Predictive Criticality Alert modal
    setCriticalAlertSegment(spikedSegment);
    setIsCriticalAlertOpen(true);
  };

  // Handle task created from the Predictive Criticality Alert Modal
  const handleCriticalTaskCreated = (task: MaintenanceTask, segment: HeatmapTrackSegment) => {
    setBookedSegmentIds((prev) => [...new Set([...prev, segment.segmentId])]);
    setConfirmationNotice(
      `✓ Urgent Maintenance Task ${task.taskId} created and scheduled for ${segment.fromStation} ↔ ${segment.toStation} (${task.durationMinutes}m possession).`
    );
    setTimeout(() => setConfirmationNotice(null), 5000);
    if (onTaskCreated) {
      onTaskCreated(task, segment);
    }
    if (onScheduleBlock) {
      onScheduleBlock(segment);
    }
  };

  // Handle booking of preventive maintenance block
  const handleBookBlock = (segment: HeatmapTrackSegment) => {
    railwayAudio.playStationChime();
    setBookedSegmentIds((prev) => [...new Set([...prev, segment.segmentId])]);
    setConfirmationNotice(
      `Preventive block requisition confirmed for ${segment.fromStation} ↔ ${segment.toStation} (${segment.expectedRepairDurationMinutes}m slot reserved).`
    );
    setTimeout(() => setConfirmationNotice(null), 4000);
    if (onScheduleBlock) {
      onScheduleBlock(segment);
    }
  };

  // Helper to render interactive track segment path on the Geospatial Canvas
  const renderSvgTrackSegment = (
    segId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    midX: number,
    midY: number,
    labelOffsetY = -18
  ) => {
    const s = liveSegments.find((x) => x.segmentId === segId);
    if (!s) return null;

    // Check if segment has 'Zero Maintenance Required' status
    const isZeroMaint = isZeroMaintenanceRequired(s);

    // SECONDARY CONTROL DECLUTTER:
    // If user enabled 'Hide Zero Maintenance Required', render a subtle faint dotted guide path with a calm checkmark
    // rather than intrusive colored bars, badges, or pulsing warning beacons.
    if (hideZeroMaintenance && isZeroMaint) {
      return (
        <g
          key={s.segmentId}
          id={`svg-seg-${s.segmentId}-decluttered`}
          data-testid={`svg-seg-${s.segmentId}-decluttered`}
          className="cursor-pointer group opacity-30 hover:opacity-90 transition-opacity"
          onClick={() => {
            railwayAudio.playBeep(700, 0.05);
            setActiveSegmentModal(s);
          }}
          onMouseEnter={() => setHoveredSegment(s)}
          onMouseLeave={() => setHoveredSegment(null)}
        >
          {/* Subtle muted reference alignment */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#64748b"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="transition-all"
          />
          {/* Calm checkmark node indicating zero maintenance needed */}
          <circle
            cx={midX}
            cy={midY}
            r={8}
            fill="#091124"
            stroke="#475569"
            strokeWidth="1.2"
            className="group-hover:stroke-emerald-400 group-hover:scale-110 transition-transform origin-center"
          />
          <text
            x={midX}
            y={midY + 2.5}
            fill="#94a3b8"
            fontSize="8"
            fontWeight="bold"
            textAnchor="middle"
            fontFamily="monospace"
          >
            ✓
          </text>
        </g>
      );
    }

    const col = getCellColor(s);
    const strokeW = getSegmentStrokeWidth(s);
    const badgeText = getSegmentDisplayBadge(s);
    const isCrit = isSegmentCriticalInMode(s);
    const warningLabel = getSegmentWarningLabel(s);
    const matchesFilter = segmentMatchesTier(s, activeTierFilter);
    const opacity = matchesFilter ? 0.95 : 0.2;

    return (
      <g
        key={s.segmentId}
        id={`svg-seg-${s.segmentId}`}
        data-testid={`svg-seg-${s.segmentId}`}
        className="cursor-pointer group"
        onClick={() => {
          railwayAudio.playBeep(700, 0.05);
          setActiveSegmentModal(s);
        }}
        onMouseEnter={() => setHoveredSegment(s)}
        onMouseLeave={() => setHoveredSegment(null)}
      >
        {/* Glow & Base Segment Path */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={col}
          strokeWidth={strokeW}
          strokeLinecap="round"
          filter={isCrit ? "url(#heat-glow)" : undefined}
          opacity={opacity}
          className="transition-all duration-300"
        />
        {/* Railway Track Dual Line */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#ffffff"
          strokeWidth="1.5"
          strokeDasharray="4 6"
          opacity={matchesFilter ? 0.75 : 0.15}
        />

        {/* Pulsing Beacon & Label for Critical Segments in Active Mode */}
        {isCrit && matchesFilter && (
          <>
            <circle
              cx={midX}
              cy={midY}
              r={22}
              fill="none"
              stroke={col}
              strokeWidth={1.5}
              strokeDasharray="2 2"
              className="animate-ping origin-center"
            />
            <text
              x={midX}
              y={midY + labelOffsetY}
              fill={col}
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
              fontFamily="monospace"
              className="drop-shadow"
            >
              {warningLabel}
            </text>
          </>
        )}

        {/* Central Metric Badge Node */}
        <circle
          cx={midX}
          cy={midY}
          r={isCrit ? 16 : 14}
          fill={isCrit ? '#3b0707' : '#0a1024'}
          stroke={col}
          strokeWidth={2}
          className="group-hover:scale-110 transition-transform origin-center"
        />
        <text
          x={midX}
          y={midY + 3.5}
          fill={col}
          fontSize="9"
          fontWeight="black"
          textAnchor="middle"
          fontFamily="monospace"
        >
          {badgeText}
        </text>
      </g>
    );
  };

  return (
    <div
      id="corridor-track-segment-heatmap-module"
      data-testid="corridor-track-segment-heatmap-module"
      className="bg-[#0b1328] rounded-2xl border-2 border-emerald-500/50 shadow-2xl p-5 md:p-6 space-y-6 relative overflow-hidden"
    >
      {/* Decorative gradient backdrops */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* =========================================================================
          REAL-TIME TELEMETRY STATUS BAR & HEADER
          ========================================================================= */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 via-amber-500 to-rose-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-slate-950" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white font-mono tracking-wide uppercase flex items-center gap-2">
              <span>Real-Time Track Segments Heatmap</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${isLiveStreaming ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                <span>{isLiveStreaming ? 'LIVE TELEMETRY ACTIVE' : 'STREAM PAUSED'}</span>
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            Continuous real-time sensor mapping of track segments across Delhi Division. Evaluates <strong className="text-emerald-400">Criticality Levels (Green to Red)</strong> and <strong className="text-amber-300">Estimated Repair Durations (30m to 180m)</strong>.
          </p>
        </div>

        {/* Real-Time Stream Controls & Sweep Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1 font-mono text-xs">
            <button
              type="button"
              id="btn-toggle-live-telemetry"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setIsLiveStreaming(!isLiveStreaming);
              }}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                isLiveStreaming
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title={isLiveStreaming ? 'Pause live USFD/OMS sensor streaming' : 'Resume live real-time telemetry stream'}
            >
              {isLiveStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Stream</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="btn-manual-sweep"
              onClick={handleManualSweep}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-800 hover:border-slate-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Trigger instant sensor sweep across all track segments"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Sweep Now</span>
            </button>

            {/* Manual test trigger for Predictive Criticality Alert modal */}
            <button
              type="button"
              id="btn-simulate-critical-spike"
              data-testid="btn-simulate-critical-spike"
              onClick={() => handleSimulateCriticalSpike()}
              className="px-2.5 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 hover:border-rose-600 font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              title="Simulate a sensor defect spike switching a track segment to 'CRITICAL' status to trigger the Predictive Criticality Alert modal"
            >
              <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Simulate Critical Spike</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 px-2 py-1 bg-slate-950/70 rounded-lg border border-slate-800">
            <span className="text-emerald-400 font-bold">{lastTelemetryTime}</span>
            <span className="mx-1.5 text-slate-600">|</span>
            <span>Packets: <strong className="text-slate-200">{packetCount}</strong></span>
          </div>
        </div>
      </div>

      {/* Real-time telemetry notification alert */}
      {liveTelemetryAlert && isLiveStreaming && (
        <div className="relative z-10 p-2.5 rounded-xl bg-sky-950/70 border border-sky-600/70 text-[11px] font-mono text-sky-200 flex items-center gap-2 shadow-md animate-in fade-in">
          <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0 animate-pulse" />
          <span className="flex-1 truncate">{liveTelemetryAlert}</span>
          <span className="text-[9px] text-slate-400 shrink-0 font-bold uppercase">USFD/OMS LINK LOCK</span>
        </div>
      )}

      {/* Confirmation Banner */}
      {confirmationNotice && (
        <div className="relative z-10 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-xs font-mono text-emerald-200 flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 font-bold">{confirmationNotice}</span>
        </div>
      )}

      {/* =========================================================================
          COLOR-GRADIENT SCALE (GREEN TO RED) & METRIC SELECTOR
          ========================================================================= */}
      <div
        id="heatmap-gradient-scale-container"
        data-testid="heatmap-gradient-scale-container"
        className="relative z-10 bg-slate-950/90 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-3 shadow-inner"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {metricMode === 'SEVERITY'
                    ? 'Maintenance Need Severity Gradient Scale (Green to Red)'
                    : 'Expected Repair Duration Gradient Scale (Green to Red)'}
                </span>
              </span>
              <span
                id="active-mode-gradient-pill"
                data-testid="active-mode-gradient-pill"
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  metricMode === 'SEVERITY'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                    : 'bg-amber-950/80 text-amber-300 border-amber-700'
                }`}
              >
                {metricMode === 'SEVERITY' ? '● SEVERITY-BASED CALIBRATION' : '● REPAIR DURATION-BASED CALIBRATION'}
              </span>

              {/* Secondary Control Active Status Pill in Legend Header */}
              {hideZeroMaintenance && (
                <span
                  id="legend-declutter-badge"
                  data-testid="legend-declutter-badge"
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full border bg-emerald-950/90 text-emerald-300 border-emerald-600 flex items-center gap-1 shadow-sm animate-in fade-in"
                >
                  <EyeOff className="w-2.5 h-2.5 text-emerald-400" />
                  <span>DECLUTTER ACTIVE: {zeroMaintenanceCount} ZERO-MAINT HIDDEN</span>
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {metricMode === 'SEVERITY' ? (
                <>
                  Low Risk &amp; Sound Track (<strong className="text-emerald-400">Green / 0%</strong>) ➔ Critical Urgent Structural Flaw (<strong className="text-rose-400">Red / 100%</strong>). Colors and segment highlights update dynamically.
                </>
              ) : (
                <>
                  Routine Minor Track Check (<strong className="text-emerald-400">Green / &lt;30m</strong>) ➔ Heavy Mechanized Possession (<strong className="text-rose-400">Red / 180m+ Mega-Block</strong>). Colors and segment highlights update dynamically.
                </>
              )}
            </p>
          </div>

          {/* Legend Controls: Primary Mode Selector & Secondary Zero-Maintenance Declutter Control */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Toggle: Mode Selector (Severity-based vs Repair Duration-based) */}
            <div
              id="heatmap-mode-inline-toggle"
              data-testid="heatmap-mode-inline-toggle"
              className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center gap-1 text-[11px] self-start md:self-auto shadow-inner"
            >
              <span className="text-[9px] text-slate-500 uppercase px-1.5 font-bold flex items-center gap-1">
                <Sliders className="w-3 h-3 text-sky-400" />
                <span>Mode:</span>
              </span>

              <button
                type="button"
                id="btn-metric-severity"
                data-testid="btn-metric-severity"
                onClick={() => {
                  railwayAudio.playBeep(700, 0.06);
                  handleSetMetricMode('SEVERITY');
                }}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  metricMode === 'SEVERITY'
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-md shadow-rose-950/60 ring-1 ring-rose-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Switch heatmap visualization to 'Severity-based' mode (Green to Red representing failure risk and degradation)"
              >
                <Flame className="w-3 h-3" />
                <span>Severity-based</span>
              </button>

              <button
                type="button"
                id="btn-metric-duration"
                data-testid="btn-metric-duration"
                onClick={() => {
                  railwayAudio.playBeep(750, 0.06);
                  handleSetMetricMode('DURATION');
                }}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  metricMode === 'DURATION'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md shadow-amber-950/60 ring-1 ring-amber-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Switch heatmap visualization to 'Repair Duration-based' mode (Green to Red representing estimated block duration)"
              >
                <Clock className="w-3 h-3" />
                <span>Duration-based</span>
              </button>
            </div>

            {/* SECONDARY CONTROL: Declutter Toggle to Show/Hide 'Zero Maintenance Required' Segments */}
            <div
              id="heatmap-legend-secondary-control"
              data-testid="heatmap-legend-secondary-control"
              className="bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center gap-1.5 text-[11px] self-start md:self-auto shadow-inner"
            >
              <span className="text-[9px] text-slate-500 uppercase px-1.5 font-bold flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-400" />
                <span>Declutter:</span>
              </span>

              <button
                type="button"
                id="btn-toggle-zero-maintenance"
                data-testid="btn-toggle-zero-maintenance"
                onClick={() => {
                  railwayAudio.playBeep(hideZeroMaintenance ? 650 : 550, 0.05);
                  handleToggleHideZeroMaintenance();
                }}
                className={`px-2.5 py-1 rounded font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                  hideZeroMaintenance
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title={
                  hideZeroMaintenance
                    ? `Click to SHOW all ${zeroMaintenanceCount} segments with 'Zero Maintenance Required' status`
                    : `Click to HIDE ${zeroMaintenanceCount} segments with 'Zero Maintenance Required' status to declutter visualization`
                }
              >
                {hideZeroMaintenance ? (
                  <>
                    <EyeOff className="w-3 h-3 text-emerald-200" />
                    <span>Hide Zero-Maint</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-400/80 text-emerald-200 font-mono font-bold">
                      {zeroMaintenanceCount} Hidden
                    </span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3 text-slate-400" />
                    <span>Show All Segments</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950 border border-slate-700 text-slate-400 font-mono">
                      {zeroMaintenanceCount} Zero-Maint
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Continuous Green to Red Gradient Bar */}
        <div className="relative">
          <div className="h-3 rounded-full overflow-hidden w-full shadow-inner bg-gradient-to-r from-[#10b981] via-[#84cc16] via-[#eab308] via-[#f97316] to-[#ef4444]" />
          <div className="flex justify-between text-[9px] text-slate-300 font-bold mt-1 px-1">
            {metricMode === 'SEVERITY' ? (
              <>
                <span className="text-emerald-400">🟢 0% (Healthy Nominal)</span>
                <span className="text-lime-400">🟡 25% (Low Criticality)</span>
                <span className="text-amber-400">🟡 50% (Moderate Risk)</span>
                <span className="text-orange-400">🟠 75% (High Severity)</span>
                <span className="text-rose-400">🔴 100% (Critical Emergency)</span>
              </>
            ) : (
              <>
                <span className="text-emerald-400">🟢 &lt;30m (Routine Inspection)</span>
                <span className="text-lime-400">🟡 30–60m (Light Possession)</span>
                <span className="text-amber-400">🟡 60–120m (Medium Window)</span>
                <span className="text-orange-400">🟠 120–150m (Heavy Block)</span>
                <span className="text-rose-400">🔴 150–180m+ (Mechanized Mega-Block)</span>
              </>
            )}
          </div>
        </div>

        {/* 5 Distinct Spectrum Tiers - Dynamic Content & Counts based on Active Mode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Filter segments by gradient tier:</span>
              {hideZeroMaintenance && (
                <span
                  id="tier-declutter-indicator"
                  data-testid="tier-declutter-indicator"
                  className="text-emerald-300 font-bold flex items-center gap-1 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded text-[9px]"
                >
                  <EyeOff className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Declutter active ({zeroMaintenanceCount} zero-maint segments hidden)</span>
                </span>
              )}
            </div>
            {activeTierFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(550, 0.04);
                  setActiveTierFilter('ALL');
                }}
                className="text-amber-300 hover:text-amber-200 underline cursor-pointer"
              >
                Reset Tier Filter (Show All {activeCorridorSegments.length} Segments)
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
            {/* Tier 1 (Green): Healthy / Routine */}
            <button
              type="button"
              id="btn-tier-1"
              data-testid="btn-tier-1"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setActiveTierFilter(activeTierFilter === 'TIER_1' ? 'ALL' : 'TIER_1');
              }}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                activeTierFilter === 'TIER_1'
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-100 shadow-md ring-1 ring-emerald-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                  <span>{metricMode === 'SEVERITY' ? 'Healthy Nominal' : 'Routine Quick'}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                  {tierCounts.tier1}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-between">
                <span>{metricMode === 'SEVERITY' ? 'Score: 0–25% (Sound)' : 'Duration: < 30 min (Check)'}</span>
                {hideZeroMaintenance && (
                  <span className="text-emerald-400 font-bold text-[8px] uppercase">Decluttered</span>
                )}
              </div>
            </button>

            {/* Tier 2 (Lime): Low / Light */}
            <button
              type="button"
              id="btn-tier-2"
              data-testid="btn-tier-2"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setActiveTierFilter(activeTierFilter === 'TIER_2' ? 'ALL' : 'TIER_2');
              }}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                activeTierFilter === 'TIER_2'
                  ? 'bg-lime-950 border-lime-400 text-lime-100 shadow-md ring-1 ring-lime-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-lime-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-lime-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" />
                  <span>{metricMode === 'SEVERITY' ? 'Low Criticality' : 'Light Possession'}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-lime-950 border border-lime-800 text-lime-300">
                  {tierCounts.tier2}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {metricMode === 'SEVERITY' ? 'Score: 26–45% (Patrol)' : 'Duration: 30–60 min'}
              </div>
            </button>

            {/* Tier 3 (Yellow): Moderate / Medium */}
            <button
              type="button"
              id="btn-tier-3"
              data-testid="btn-tier-3"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setActiveTierFilter(activeTierFilter === 'TIER_3' ? 'ALL' : 'TIER_3');
              }}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                activeTierFilter === 'TIER_3'
                  ? 'bg-amber-950 border-amber-400 text-amber-100 shadow-md ring-1 ring-amber-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-amber-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                  <span>{metricMode === 'SEVERITY' ? 'Moderate Risk' : 'Medium Window'}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-300">
                  {tierCounts.tier3}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {metricMode === 'SEVERITY' ? 'Score: 46–65% (Drift)' : 'Duration: 60–120 min'}
              </div>
            </button>

            {/* Tier 4 (Orange): High / Heavy */}
            <button
              type="button"
              id="btn-tier-4"
              data-testid="btn-tier-4"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setActiveTierFilter(activeTierFilter === 'TIER_4' ? 'ALL' : 'TIER_4');
              }}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                activeTierFilter === 'TIER_4'
                  ? 'bg-orange-950 border-orange-400 text-orange-100 shadow-md ring-1 ring-orange-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-orange-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-orange-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span>{metricMode === 'SEVERITY' ? 'High Criticality' : 'Heavy Window'}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-950 border border-orange-800 text-orange-300">
                  {tierCounts.tier4}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {metricMode === 'SEVERITY' ? 'Score: 66–84% (Urgent)' : 'Duration: 120–150 min'}
              </div>
            </button>

            {/* Tier 5 (Red): Critical / Mega-Block */}
            <button
              type="button"
              id="btn-tier-5"
              data-testid="btn-tier-5"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setActiveTierFilter(activeTierFilter === 'TIER_5' ? 'ALL' : 'TIER_5');
              }}
              className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                activeTierFilter === 'TIER_5'
                  ? 'bg-rose-950 border-rose-400 text-rose-100 shadow-md ring-1 ring-rose-400 animate-pulse'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-rose-600'
              }`}
            >
              <div className="flex items-center justify-between font-bold text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
                  <span>{metricMode === 'SEVERITY' ? 'Critical Flaw' : 'Mega-Block'}</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold">
                  {tierCounts.tier5}
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {metricMode === 'SEVERITY' ? 'Score: > 85% (IMR Flaw)' : 'Duration: 150–180m+'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          VIEW MODE TOGGLE: CANVAS MAP vs RIBBON BARS vs MATRIX GRID
          ========================================================================= */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Visual Layout switcher */}
          <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
            <button
              type="button"
              id="btn-layout-canvas"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setVisualLayout('TOPOLOGY_CANVAS');
              }}
              className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                visualLayout === 'TOPOLOGY_CANVAS'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Topological Map (Live Canvas)</span>
            </button>

            <button
              type="button"
              id="btn-layout-ribbons"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setVisualLayout('LINEAR_RIBBONS');
              }}
              className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                visualLayout === 'LINEAR_RIBBONS'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Linear Chainage Ribbons</span>
            </button>

            <button
              type="button"
              id="btn-layout-grid"
              onClick={() => {
                railwayAudio.playBeep(600, 0.05);
                setVisualLayout('MATRIX_GRID');
              }}
              className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                visualLayout === 'MATRIX_GRID'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Heatmap Matrix Grid</span>
            </button>
          </div>

          {/* Corridor quick selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5 font-bold">Corridor:</span>
            {['ALL', 'C001', 'C002', 'C003', 'C004'].map((corr) => (
              <button
                key={corr}
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(650, 0.05);
                  setCorridorFilter(corr);
                  if (onSelectCorridor && corr !== 'ALL') {
                    onSelectCorridor(corr);
                  }
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  corridorFilter === corr
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {corr}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station, defect, KM..."
            className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-52 md:w-56 font-mono"
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
      </div>

      {/* =========================================================================
          VIEW 1: REAL-TIME INTERACTIVE SVG TRACK TOPOLOGY CANVAS
          ========================================================================= */}
      {visualLayout === 'TOPOLOGY_CANVAS' && (
        <div className="relative z-10 bg-[#080d1e] p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs shadow-inner">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span>Geospatial Track Schematic Heatmap Canvas</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                LIVE TRAFFIC &amp; DEGRADATION
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Click any colored segment path to open maintenance inspector
            </span>
          </div>

          {/* SVG Map Container */}
          <div className="w-full overflow-x-auto bg-[#050914] rounded-xl border border-slate-800/90 p-2 relative">
            <svg
              viewBox="0 0 960 420"
              className="w-full h-auto min-w-[750px] select-none"
              style={{ maxHeight: '440px' }}
            >
              <defs>
                {/* SVG Glow Filter */}
                <filter id="heat-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
                <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.4" strokeOpacity="0.4" />
                </pattern>
              </defs>

              {/* Background blueprint grid */}
              <rect width="960" height="420" fill="url(#grid-pattern)" />

              {/* Central Hub Marker (New Delhi Junction Throat) */}
              <g transform="translate(180, 200)">
                <circle r="22" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                <circle r="12" fill="#0284c7" fillOpacity="0.3" />
                <circle r="6" fill="#38bdf8" />
                <text x="0" y="-30" fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  NEW DELHI (NDLS) / CENTRAL HUB
                </text>
                <text x="0" y="38" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">
                  DIVISION HEADQUARTERS
                </text>
              </g>

              {/* =========================================================================
                  CORRIDOR C001 (Northern Main Trunk: NDLS -> SBB -> GZB -> ALJN -> TDL)
                  ========================================================================= */}
              <g id="svg-corridor-c001">
                <text x="320" y="85" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  CORRIDOR C001: NORTHERN MAIN TRUNK (142 KM)
                </text>

                {/* C001 Track Segments */}
                {renderSvgTrackSegment('C001-S1-NDLS-SBB', 180, 190, 330, 120, 255, 155, -18)}
                {renderSvgTrackSegment('C001-S2-SBB-GZB', 330, 120, 480, 120, 405, 120, -18)}
                {renderSvgTrackSegment('C001-S3-GZB-ALJN', 480, 120, 680, 120, 580, 120, -18)}
                {renderSvgTrackSegment('C001-S4-ALJN-TDL', 680, 120, 880, 120, 780, 120, -18)}

                {/* C001 Station Nodes */}
                <circle cx="330" cy="120" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <text x="330" y="140" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontFamily="monospace">Sahibabad (SBB)</text>

                <circle cx="480" cy="120" r="7" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <text x="480" y="140" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Ghaziabad (GZB)</text>

                <circle cx="680" cy="120" r="6" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <text x="680" y="140" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontFamily="monospace">Aligarh (ALJN)</text>

                <circle cx="880" cy="120" r="5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
                <text x="880" y="140" fill="#cbd5e1" fontSize="9" textAnchor="middle" fontFamily="monospace">Tundla (TDL)</text>
              </g>

              {/* =========================================================================
                  CORRIDOR C002 (High-Speed Vande Bharat Passenger Corridor: North-West)
                  ========================================================================= */}
              <g id="svg-corridor-c002">
                <text x="180" y="30" fill="#c084fc" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  CORRIDOR C002: HIGH-SPEED PASSENGER (98 KM)
                </text>

                {/* C002 Track Segments */}
                {renderSvgTrackSegment('C002-S1-DLI-SZM', 180, 180, 260, 50, 220, 115, -18)}
                {renderSvgTrackSegment('C002-S2-SZM-ANDI', 260, 50, 430, 50, 345, 50, -18)}
                {renderSvgTrackSegment('C002-S3-ANDI-SNP', 430, 50, 620, 50, 525, 50, -18)}
                {renderSvgTrackSegment('C002-S4-SNP-PNP', 620, 50, 820, 50, 720, 50, -18)}

                {/* C002 Station Nodes */}
                <circle cx="260" cy="50" r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                <text x="260" y="68" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Sabzi Mandi</text>

                <circle cx="430" cy="50" r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                <text x="430" y="68" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Adarsh Ngr</text>

                <circle cx="620" cy="50" r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                <text x="620" y="68" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Sonipat</text>

                <circle cx="820" cy="50" r="5" fill="#c084fc" stroke="#ffffff" strokeWidth="1.5" />
                <text x="820" y="68" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Panipat (PNP)</text>
              </g>

              {/* =========================================================================
                  CORRIDOR C003 (Western Heavy Freight Link: Shakurbasti -> Rohtak -> Jind)
                  ========================================================================= */}
              <g id="svg-corridor-c003">
                <text x="180" y="270" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  CORRIDOR C003: WESTERN HEAVY FREIGHT (165 KM)
                </text>

                {/* C003 Track Segments */}
                {renderSvgTrackSegment('C003-S1-SSB-BGZ', 180, 215, 340, 285, 260, 250, -18)}
                {renderSvgTrackSegment('C003-S2-BGZ-SPZ', 340, 285, 510, 285, 425, 285, -18)}
                {renderSvgTrackSegment('C003-S3-SPZ-ROK', 510, 285, 690, 285, 600, 285, -18)}
                {renderSvgTrackSegment('C003-S4-ROK-JIND', 690, 285, 880, 285, 785, 285, -18)}

                {/* C003 Station Nodes */}
                <circle cx="340" cy="285" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text x="340" y="305" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Bahadurgarh</text>

                <circle cx="510" cy="285" r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <text x="510" y="305" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Sampla (SPZ)</text>

                <circle cx="690" cy="285" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text x="690" y="305" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Rohtak Jn</text>

                <circle cx="880" cy="285" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
                <text x="880" y="305" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Jind (JIND)</text>
              </g>

              {/* =========================================================================
                  CORRIDOR C004 (Southern Industrial Branch: TKD -> FDB -> BVH -> PWL -> KSV)
                  ========================================================================= */}
              <g id="svg-corridor-c004">
                <text x="180" y="350" fill="#2dd4bf" fontSize="10" fontWeight="bold" fontFamily="monospace">
                  CORRIDOR C004: SOUTHERN INDUSTRIAL BRANCH (115 KM)
                </text>

                {/* C004 Track Segments */}
                {renderSvgTrackSegment('C004-S1-TKD-FDB', 180, 225, 310, 385, 245, 305, -18)}
                {renderSvgTrackSegment('C004-S2-FDB-BVH', 310, 385, 480, 385, 395, 385, -18)}
                {renderSvgTrackSegment('C004-S3-BVH-PWL', 480, 385, 680, 385, 580, 385, -18)}
                {renderSvgTrackSegment('C004-S4-PWL-KSV', 680, 385, 880, 385, 780, 385, -18)}

                {/* C004 Station Nodes */}
                <circle cx="310" cy="385" r="5" fill="#2dd4bf" stroke="#ffffff" strokeWidth="1.5" />
                <text x="310" y="405" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Faridabad</text>

                <circle cx="480" cy="385" r="5" fill="#2dd4bf" stroke="#ffffff" strokeWidth="1.5" />
                <text x="480" y="405" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Ballabgarh</text>

                <circle cx="680" cy="385" r="6" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                <text x="680" y="405" fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="monospace">Palwal (PWL)</text>

                <circle cx="880" cy="385" r="5" fill="#2dd4bf" stroke="#ffffff" strokeWidth="1.5" />
                <text x="880" y="405" fill="#e2e8f0" fontSize="9" textAnchor="middle" fontFamily="monospace">Kosi Kalan</text>
              </g>
            </svg>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: LINEAR TRACK STRIP TOPOLOGY HEATMAP (RIBBON BARS)
          ========================================================================= */}
      {visualLayout === 'LINEAR_RIBBONS' && (
        <div className="relative z-10 bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase tracking-wider text-slate-200 text-xs flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>Linear Track Strip Heatmap (Contiguous Topology Ribbons)</span>
            </h3>
            <span className="text-[10px] text-slate-400">
              Segments scaled by physical length (KM) • Color = Green-to-Red Criticality &amp; Duration
            </span>
          </div>

          <div className="space-y-4">
            {Array.from(segmentsByCorridor.entries()).map(([corrCode, segments]) => {
              if (segments.length === 0) {
                return (
                  <div key={corrCode} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                    <span className="font-bold text-slate-300">{corrCode} Linear Track Ribbon</span>
                    {hideZeroMaintenance ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-mono text-[10px]">
                        <EyeOff className="w-3 h-3" />
                        All segments in this corridor have 'Zero Maintenance Required' (Decluttered from view)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">No segments found</span>
                    )}
                  </div>
                );
              }
              const corrName = segments[0]?.corridorName || corrCode;
              const maxKm = segments[segments.length - 1]?.endKm || 100;

              return (
                <div key={corrCode} className="space-y-1.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-950 text-sky-300 border border-sky-800 text-[10px]">
                        {corrCode}
                      </span>
                      <span className="font-bold text-slate-200">{corrName}</span>
                      <span className="text-[10px] text-slate-400">(0.0 to {maxKm} KM)</span>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-2">
                      <span>{segments.length} Track Segments</span>
                      {hideZeroMaintenance && (
                        <span className="text-emerald-400 font-bold">• Declutter Active</span>
                      )}
                      <span>•</span>
                      {metricMode === 'SEVERITY' ? (
                        <span className="text-rose-300 font-bold flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>Avg Severity: {Math.round(segments.reduce((a, b) => a + b.maintenanceSeverityScore, 0) / segments.length)}%</span>
                        </span>
                      ) : (
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Total Repair Need: {segments.reduce((a, b) => a + b.expectedRepairDurationMinutes, 0)}m ({(segments.reduce((a, b) => a + b.expectedRepairDurationMinutes, 0) / 60).toFixed(1)}h)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Track Ribbon Strip with flex segments */}
                  <div className="flex w-full h-11 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-1 gap-1">
                    {segments.map((seg) => {
                      const color = getCellColor(seg);
                      const isCrit = isSegmentCriticalInMode(seg);
                      const isBooked = bookedSegmentIds.includes(seg.segmentId);

                      return (
                        <div
                          key={seg.segmentId}
                          style={{
                            flex: seg.lengthKm,
                            backgroundColor: `${color}28`, // 16% opacity background tint
                            borderColor: color,
                          }}
                          onClick={() => {
                            railwayAudio.playBeep(700, 0.06);
                            setActiveSegmentModal(seg);
                          }}
                          onMouseEnter={() => setHoveredSegment(seg)}
                          onMouseLeave={() => setHoveredSegment(null)}
                          className={`group relative h-full rounded border cursor-pointer transition-all hover:scale-[1.02] hover:z-20 flex flex-col justify-center px-2 shadow-sm ${
                            isCrit ? 'ring-1 ring-rose-500 animate-pulse' : ''
                          }`}
                          title={`${seg.fromStation} ↔ ${seg.toStation} | Criticality: ${seg.maintenanceSeverityScore}% | Duration: ${seg.expectedRepairDurationMinutes}m`}
                        >
                          <div className="flex items-center justify-between overflow-hidden">
                            <span className="font-bold text-[10px] truncate" style={{ color }}>
                              {seg.fromStation}–{seg.toStation}
                            </span>
                            <span
                              className="text-[9px] font-black px-1 rounded ml-1 shrink-0 font-mono text-slate-950"
                              style={{ backgroundColor: color }}
                            >
                              {metricMode === 'SEVERITY'
                                ? `${seg.maintenanceSeverityScore}%`
                                : metricMode === 'DURATION'
                                ? `${seg.expectedRepairDurationMinutes}m`
                                : `${getCompositeHeatScore(seg.maintenanceSeverityScore, seg.expectedRepairDurationMinutes)} pts`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[8px] text-slate-400 opacity-90 truncate mt-0.5">
                            <span>KM {seg.startKm}–{seg.endKm}</span>
                            {isBooked ? (
                              <span className="text-emerald-300 font-bold">✓ BOOKED</span>
                            ) : (
                              <span>{seg.expectedRepairDurationHours}h</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: INTERACTIVE SEGMENT HEATMAP MATRIX GRID
          ========================================================================= */}
      {visualLayout === 'MATRIX_GRID' && (
        <div className="relative z-10 space-y-3 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Track Segment Heatmap Matrix ({filteredSegments.length} Segments)</span>
            </span>
            <div className="text-[10px] text-slate-400 flex items-center gap-2">
              <span>Active Metric: <strong className="text-amber-300">{metricMode}</strong></span>
              <span>•</span>
              <span>Click any card to inspect defect diagnostics &amp; schedule block</span>
            </div>
          </div>

          {filteredSegments.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 space-y-3">
              {hideZeroMaintenance && zeroMaintenanceCount > 0 ? (
                <>
                  <EyeOff className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-slate-200">
                    All {zeroMaintenanceCount} segment{zeroMaintenanceCount === 1 ? '' : 's'} in this corridor have 'Zero Maintenance Required' status.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Visualization is decluttered. Toggle the secondary control in the heatmap legend to show all segments.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      railwayAudio.playBeep(600, 0.05);
                      handleToggleHideZeroMaintenance(false);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-md transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Show Zero-Maintenance Segments</span>
                  </button>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="font-bold text-slate-200">No track segments matching the current filters.</p>
                  <p className="text-[11px] text-slate-500">Try selecting "All Corridors" or resetting the tier filter.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {filteredSegments.map((segment) => {
                const hexColor = getCellColor(segment);
                const isCritical = isSegmentCriticalInMode(segment);
                const isHigh = metricMode === 'SEVERITY'
                  ? segment.maintenanceSeverityScore >= 65 && segment.maintenanceSeverityScore < 80
                  : segment.expectedRepairDurationMinutes >= 110 && segment.expectedRepairDurationMinutes < 135;
                const isBooked = bookedSegmentIds.includes(segment.segmentId);
                const isZeroMaint = isZeroMaintenanceRequired(segment);
                const severityBadge = getSeverityBadgeProps(segment.maintenanceSeverityScore);
                const durationBadge = getDurationBadgeProps(segment.expectedRepairDurationMinutes);

                return (
                  <div
                    key={segment.segmentId}
                    id={`heatmap-tile-${segment.segmentId}`}
                    onClick={() => {
                      railwayAudio.playBeep(700, 0.05);
                      setActiveSegmentModal(segment);
                    }}
                    style={{
                      borderLeftColor: hexColor,
                      borderLeftWidth: '5px',
                    }}
                    className={`p-3.5 rounded-xl border border-slate-800 bg-[#091124] hover:bg-slate-900/90 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl hover:scale-[1.01] ${
                      isCritical
                        ? 'shadow-rose-950/40 ring-1 ring-rose-500/40'
                        : isHigh
                        ? 'shadow-orange-950/30'
                        : ''
                    }`}
                  >
                    <div
                      className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                      style={{ backgroundColor: hexColor }}
                    />

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-950 text-sky-300 border border-sky-800">
                            {segment.corridorCode}
                          </span>
                          {isZeroMaint && (
                            <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-bold flex items-center gap-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Zero-Maint</span>
                            </span>
                          )}
                        </div>

                        <span
                          className="text-[10px] font-black px-2 py-0.5 rounded shadow-sm text-slate-950 flex items-center gap-1"
                          style={{ backgroundColor: hexColor }}
                        >
                          {metricMode === 'SEVERITY' && (
                            <>
                              <Flame className="w-3 h-3 text-slate-950" />
                              <span>{segment.maintenanceSeverityScore}% CRITICALITY</span>
                            </>
                          )}
                          {metricMode === 'DURATION' && (
                            <>
                              <Clock className="w-3 h-3 text-slate-950" />
                              <span>{segment.expectedRepairDurationMinutes} MIN ({segment.expectedRepairDurationHours}h)</span>
                            </>
                          )}
                          {metricMode === 'COMPOSITE' && (
                            <>
                              <Gauge className="w-3 h-3 text-slate-950" />
                              <span>{getCompositeHeatScore(segment.maintenanceSeverityScore, segment.expectedRepairDurationMinutes)} PTS</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{segment.fromStation} ↔ {segment.toStation}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          KM {segment.startKm}–{segment.endKm} ({segment.lengthKm} KM) | {segment.trackLine}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80 leading-relaxed">
                        <span className="text-amber-400 font-bold block truncate">
                          {segment.primaryDefectCategory}
                        </span>
                        <span className="text-slate-400 line-clamp-2 mt-0.5">
                          {segment.defectSummary}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-1 border-t border-slate-800/80">
                        <div className={`p-1.5 rounded border ${severityBadge.bgClass} ${severityBadge.borderClass} ${severityBadge.textClass}`}>
                          <div className="text-[8px] text-slate-400 uppercase font-bold">Criticality:</div>
                          <div className="font-bold flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${severityBadge.dotClass}`} />
                            <span>{segment.maintenanceSeverityScore}% ({segment.severityTier})</span>
                          </div>
                        </div>

                        <div className={`p-1.5 rounded border ${durationBadge.bgClass} ${durationBadge.borderClass} ${durationBadge.textClass}`}>
                          <div className="text-[8px] text-slate-400 uppercase font-bold">Repair Window:</div>
                          <div className="font-bold flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${durationBadge.dotClass}`} />
                            <span>{segment.expectedRepairDurationMinutes}m ({segment.expectedRepairDurationHours}h)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 truncate max-w-[140px]">
                        {segment.recommendedMachinery}
                      </span>
                      <div className="flex items-center gap-1">
                        {isBooked ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Booked</span>
                          </span>
                        ) : (
                          <span className="text-sky-300 font-bold flex items-center gap-0.5">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          DETAILED SEGMENT INSPECTOR MODAL
          ========================================================================= */}
      {activeSegmentModal && (
        <div
          id="modal-track-segment-inspector"
          data-testid="modal-track-segment-inspector"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-[#091124] border-2 border-emerald-500/80 rounded-2xl max-w-2xl w-full p-5 md:p-6 space-y-5 shadow-2xl relative font-mono text-xs">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-950 text-sky-300 border border-sky-800">
                    {activeSegmentModal.corridorCode}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {activeSegmentModal.fromStation} ↔ {activeSegmentModal.toStation}
                  </h3>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded text-slate-950"
                    style={{ backgroundColor: getSeverityColorHex(activeSegmentModal.maintenanceSeverityScore) }}
                  >
                    {activeSegmentModal.maintenanceSeverityScore}% CRITICALITY
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Chainage KM {activeSegmentModal.startKm} to {activeSegmentModal.endKm} ({activeSegmentModal.lengthKm} KM) | {activeSegmentModal.trackLine}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveSegmentModal(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Maintenance Status Banner & Declutter Qualification */}
            {isZeroMaintenanceRequired(activeSegmentModal) ? (
              <div
                id="modal-zero-maint-status"
                data-testid="modal-zero-maint-status"
                className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/80 flex items-center justify-between gap-3 text-xs text-emerald-200 shadow-inner"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-xs">
                      Status: Zero Maintenance Required
                    </span>
                    <span className="text-[11px] text-emerald-300">
                      Track geometry and rail integrity within nominal permissible limits. Qualified for heatmap decluttering.
                    </span>
                  </div>
                </div>
                <span className="text-[9px] px-2.5 py-1 rounded-full bg-emerald-900 border border-emerald-400 text-emerald-100 font-bold uppercase shrink-0 shadow-sm">
                  Declutter Eligible
                </span>
              </div>
            ) : (
              <div
                id="modal-maint-required-status"
                data-testid="modal-maint-required-status"
                className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 flex items-center justify-between gap-3 text-xs text-rose-200 shadow-inner"
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block text-xs">
                      Status: Maintenance Requisition Required
                    </span>
                    <span className="text-[11px] text-rose-300">
                      Ultrasonic flaw or geometric degradation detected. Possession window recommended.
                    </span>
                  </div>
                </div>
                <span className="text-[9px] px-2.5 py-1 rounded-full bg-rose-900 border border-rose-500 text-rose-100 font-bold uppercase shrink-0 shadow-sm">
                  Action Required
                </span>
              </div>
            )}

            {/* Severity & Duration Color Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Metric 1: Maintenance Severity */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Criticality Level
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-slate-950"
                    style={{ backgroundColor: getSeverityColorHex(activeSegmentModal.maintenanceSeverityScore) }}
                  >
                    {activeSegmentModal.maintenanceSeverityScore}% ({activeSegmentModal.severityTier})
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${activeSegmentModal.maintenanceSeverityScore}%`,
                      backgroundColor: getSeverityColorHex(activeSegmentModal.maintenanceSeverityScore),
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>TDI: <strong className="text-white">{activeSegmentModal.trackDegradationIndex}</strong></span>
                  <span>Gauge Spread: <strong className="text-white">+{activeSegmentModal.gaugeSpreadMm}mm</strong></span>
                  <span>Failure Risk: <strong className="text-rose-400">{activeSegmentModal.failureRiskProbabilityPct}%</strong></span>
                </div>
              </div>

              {/* Metric 2: Expected Repair Duration */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Estimated Repair Duration
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-slate-950"
                    style={{ backgroundColor: getDurationColorHex(activeSegmentModal.expectedRepairDurationMinutes) }}
                  >
                    {activeSegmentModal.expectedRepairDurationMinutes} MIN ({activeSegmentModal.expectedRepairDurationHours}h)
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (activeSegmentModal.expectedRepairDurationMinutes / 180) * 100)}%`,
                      backgroundColor: getDurationColorHex(activeSegmentModal.expectedRepairDurationMinutes),
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span>Category: <strong className="text-white">{activeSegmentModal.durationCategory.replace('_', ' ')}</strong></span>
                  <span>Slot: <strong className="text-amber-300">{activeSegmentModal.recommendedTimeSlot}</strong></span>
                </div>
              </div>
            </div>

            {/* Diagnostic Details */}
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2 text-[11px]">
              <div className="text-xs font-bold text-amber-300">
                {activeSegmentModal.primaryDefectCategory}
              </div>
              <p className="text-slate-300 leading-relaxed font-normal">
                {activeSegmentModal.defectSummary}
              </p>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-[10px] text-slate-400">
                <span>Statutory Ref: <strong className="text-slate-300">{activeSegmentModal.statutoryStandard}</strong></span>
                <span>Speed Limit: <strong className="text-white">{activeSegmentModal.speedLimitKmph} km/h</strong></span>
              </div>
            </div>

            {/* Work Requisition Profile */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px]">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block">Department</span>
                <span className="font-bold text-amber-300 text-xs">{activeSegmentModal.recommendedDepartment}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block">Machinery Required</span>
                <span className="font-bold text-slate-200 text-[11px] truncate block">{activeSegmentModal.recommendedMachinery}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block">PWI Gang Strength</span>
                <span className="font-bold text-sky-300 text-xs">{activeSegmentModal.requiredGangStrength} Men</span>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <span className="text-slate-400 block">25kV Traction Cut</span>
                <span className={activeSegmentModal.tractionIsolationRequired ? 'text-rose-400 font-bold text-xs' : 'text-emerald-400 font-bold text-xs'}>
                  {activeSegmentModal.tractionIsolationRequired ? 'Isolation Req' : 'Live Track'}
                </span>
              </div>
            </div>

            {/* Threatened Traffic Consequence */}
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/60 text-[10px] flex items-center justify-between text-rose-300">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                Impact if Maintenance Deferred:
              </span>
              <span>
                {activeSegmentModal.threatenedTrainsCount} Express Trains threatened • Avoidable Delay: +{activeSegmentModal.projectedPunctualityLossMinutes}m
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep();
                  window.print();
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print Segment Dossier</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSegmentModal(null)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleBookBlock(activeSegmentModal);
                    setActiveSegmentModal(null);
                  }}
                  disabled={bookedSegmentIds.includes(activeSegmentModal.segmentId)}
                  className={`px-4 py-1.5 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all ${
                    bookedSegmentIds.includes(activeSegmentModal.segmentId)
                      ? 'bg-emerald-800/60 text-emerald-200 border border-emerald-600 cursor-default'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>
                    {bookedSegmentIds.includes(activeSegmentModal.segmentId)
                      ? 'Block Already Requisitioned'
                      : `Requisition ${activeSegmentModal.expectedRepairDurationMinutes}m Maintenance Block`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PREDICTIVE CRITICALITY ALERT MODAL
          Automatically triggers when a segment's heat-map status switches to 'CRITICAL',
          providing a one-click action to create a new maintenance task for that specific segment.
          ========================================================================= */}
      <PredictiveCriticalityAlertModal
        segment={criticalAlertSegment}
        isOpen={isCriticalAlertOpen}
        onClose={() => setIsCriticalAlertOpen(false)}
        onTaskCreated={handleCriticalTaskCreated}
        metricMode={metricMode}
      />
    </div>
  );
};
