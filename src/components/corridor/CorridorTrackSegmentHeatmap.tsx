import React, { useState, useMemo } from 'react';
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
  ShieldAlert,
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
} from '../../services/corridorTrackSegmentHeatmapService';
import { railwayAudio } from '../../services/railwayAudio';

export type HeatmapMetricMode = 'SEVERITY' | 'DURATION' | 'COMPOSITE';

interface CorridorTrackSegmentHeatmapProps {
  selectedCorridorId?: string;
  onSelectCorridor?: (corridorId: string) => void;
  onScheduleBlock?: (segment: HeatmapTrackSegment) => void;
}

export const CorridorTrackSegmentHeatmap: React.FC<CorridorTrackSegmentHeatmapProps> = ({
  selectedCorridorId = 'ALL',
  onSelectCorridor,
  onScheduleBlock,
}) => {
  // State
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('SEVERITY');
  const [corridorFilter, setCorridorFilter] = useState<string>(selectedCorridorId === 'ALL' ? 'ALL' : selectedCorridorId);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | MaintenanceSeverityTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredSegment, setHoveredSegment] = useState<HeatmapTrackSegment | null>(null);
  const [activeSegmentModal, setActiveSegmentModal] = useState<HeatmapTrackSegment | null>(null);
  const [bookedSegmentIds, setBookedSegmentIds] = useState<string[]>([]);
  const [confirmationNotice, setConfirmationNotice] = useState<string | null>(null);

  // Sync corridorFilter when parent selectedCorridorId updates
  React.useEffect(() => {
    if (selectedCorridorId && selectedCorridorId !== 'ALL') {
      setCorridorFilter(selectedCorridorId);
    }
  }, [selectedCorridorId]);

  // Network summary
  const summary = useMemo(() => {
    return corridorTrackSegmentHeatmapService.getNetworkSummary(corridorFilter);
  }, [corridorFilter]);

  // All segments for active corridor
  const allSegments = useMemo(() => {
    return corridorTrackSegmentHeatmapService.getSegments(corridorFilter);
  }, [corridorFilter]);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    return allSegments.filter((seg) => {
      if (severityFilter !== 'ALL' && seg.severityTier !== severityFilter) {
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
  }, [allSegments, severityFilter, searchQuery]);

  // Grouped by corridor for linear topology strip view
  const segmentsByCorridor = useMemo(() => {
    const map = new Map<string, HeatmapTrackSegment[]>();
    const corridorKeys = corridorFilter === 'ALL' ? ['C001', 'C002', 'C003', 'C004'] : [corridorFilter];
    corridorKeys.forEach((key) => {
      map.set(
        key,
        CORRIDOR_MAP_SEGMENTS(key).filter((seg) => {
          if (severityFilter !== 'ALL' && seg.severityTier !== severityFilter) return false;
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
  }, [corridorFilter, severityFilter, searchQuery]);

  // Helper to fetch segments for a single corridor
  function CORRIDOR_MAP_SEGMENTS(corrId: string): HeatmapTrackSegment[] {
    return corridorTrackSegmentHeatmapService.getSegments(corrId);
  }

  // Handle booking of preventive maintenance block
  const handleBookBlock = (segment: HeatmapTrackSegment) => {
    railwayAudio.playStationChime();
    setBookedSegmentIds((prev) => [...new Set([...prev, segment.segmentId])]);
    setConfirmationNotice(`Preventive block requisition confirmed for ${segment.fromStation} ↔ ${segment.toStation} (${segment.expectedRepairDurationMinutes}m slot reserved).`);
    setTimeout(() => setConfirmationNotice(null), 4000);
    if (onScheduleBlock) {
      onScheduleBlock(segment);
    }
  };

  // Color resolver based on active metric mode
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
          HEADER SECTION WITH METRIC MODE SELECTOR
          ========================================================================= */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 via-amber-500 to-rose-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Layers className="w-5 h-5 text-slate-950" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white font-mono tracking-wide uppercase flex items-center gap-2">
              <span>Track Segments Maintenance Heatmap</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold">
                RED-TO-GREEN SPECTRUM
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            Color-coded heatmap mapping <strong className="text-rose-400">Critical Maintenance Needs (Red)</strong> through <strong className="text-emerald-400">Optimal / Healthy Sections (Green)</strong> alongside required repair block duration across all corridor tracks.
          </p>
        </div>

        {/* METRIC MODE TOGGLE: Severity vs Repair Duration vs Dual */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex items-center gap-1 font-mono text-xs">
            <span className="text-[10px] text-slate-400 uppercase px-2 font-bold">Heatmap Mode:</span>

            <button
              type="button"
              id="btn-heatmap-mode-severity"
              onClick={() => {
                railwayAudio.playBeep(650, 0.05);
                setMetricMode('SEVERITY');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                metricMode === 'SEVERITY'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Maintenance Severity</span>
            </button>

            <button
              type="button"
              id="btn-heatmap-mode-duration"
              onClick={() => {
                railwayAudio.playBeep(650, 0.05);
                setMetricMode('DURATION');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                metricMode === 'DURATION'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Expected Repair Duration</span>
            </button>

            <button
              type="button"
              id="btn-heatmap-mode-composite"
              onClick={() => {
                railwayAudio.playBeep(650, 0.05);
                setMetricMode('COMPOSITE');
              }}
              className={`px-3 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                metricMode === 'COMPOSITE'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Combined Index (Risk + Hours)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Banner */}
      {confirmationNotice && (
        <div className="relative z-10 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500 text-xs font-mono text-emerald-200 flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="flex-1 font-bold">{confirmationNotice}</span>
        </div>
      )}

      {/* =========================================================================
          RED-TO-GREEN COLOR SPECTRUM LEGEND BAR
          ========================================================================= */}
      <div className="relative z-10 bg-slate-950/90 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-2.5 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="font-bold text-slate-200 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
            Red-To-Green Heatmap Calibration Spectrum (
            {metricMode === 'SEVERITY'
              ? 'Maintenance Severity & Failure Probability'
              : metricMode === 'DURATION'
              ? 'Required Maintenance Block Duration (Minutes / Hours)'
              : 'Composite Maintenance Need & Block Window Index'}
            )
          </span>
          <span className="text-[10px] text-slate-400">
            Click any severity bucket below to filter segments
          </span>
        </div>

        {/* Continuous Gradient Bar */}
        <div className="h-3 rounded-full overflow-hidden w-full shadow-inner bg-gradient-to-r from-[#10b981] via-[#84cc16] via-[#eab308] via-[#f97316] to-[#ef4444]" />

        {/* 5 Distinct Spectrum Tiers */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px]">
          {/* Green Bucket: Healthy / Routine */}
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.05);
              setSeverityFilter(severityFilter === 'HEALTHY' ? 'ALL' : 'HEALTHY');
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
              severityFilter === 'HEALTHY'
                ? 'bg-emerald-950 border-emerald-400 text-emerald-100 shadow-md ring-1 ring-emerald-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-emerald-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span>Optimal / Healthy (0–25%)</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Duration: &lt; 30 min (Routine)
            </div>
          </button>

          {/* Lime Bucket: Low / Watchlist */}
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.05);
              setSeverityFilter(severityFilter === 'LOW' ? 'ALL' : 'LOW');
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
              severityFilter === 'LOW'
                ? 'bg-lime-950 border-lime-400 text-lime-100 shadow-md ring-1 ring-lime-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-lime-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-lime-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#84cc16]" />
              <span>Minor / Low (26–45%)</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Duration: 30–60 min (Possession)
            </div>
          </button>

          {/* Yellow Bucket: Moderate */}
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.05);
              setSeverityFilter(severityFilter === 'MODERATE' ? 'ALL' : 'MODERATE');
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
              severityFilter === 'MODERATE'
                ? 'bg-amber-950 border-amber-400 text-amber-100 shadow-md ring-1 ring-amber-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              <span>Moderate Need (46–65%)</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Duration: 60–120 min (Window)
            </div>
          </button>

          {/* Orange Bucket: High */}
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.05);
              setSeverityFilter(severityFilter === 'HIGH' ? 'ALL' : 'HIGH');
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
              severityFilter === 'HIGH'
                ? 'bg-orange-950 border-orange-400 text-orange-100 shadow-md ring-1 ring-orange-400'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-orange-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-orange-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
              <span>High Priority (66–84%)</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Duration: 120–150 min (Heavy)
            </div>
          </button>

          {/* Red Bucket: Critical Urgent */}
          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep(600, 0.05);
              setSeverityFilter(severityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL');
            }}
            className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
              severityFilter === 'CRITICAL'
                ? 'bg-rose-950 border-rose-400 text-rose-100 shadow-md ring-1 ring-rose-400 animate-pulse'
                : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-rose-600'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
              <span>Critical / Severe (&gt; 85%)</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">
              Duration: 150–180+ min (Mega-Block)
            </div>
          </button>
        </div>
      </div>

      {/* =========================================================================
          FILTER TOOLBAR: CORRIDOR SELECTOR & SEARCH
          ========================================================================= */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Corridor selector buttons */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5 font-bold">Corridor:</span>
            {[
              { id: 'ALL', label: 'All Corridors (Total Network)' },
              { id: 'C001', label: 'C001 (Trunk 142km)' },
              { id: 'C002', label: 'C002 (High-Speed 98km)' },
              { id: 'C003', label: 'C003 (Freight 165km)' },
              { id: 'C004', label: 'C004 (Industrial 115km)' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(650, 0.05);
                  setCorridorFilter(btn.id);
                  if (onSelectCorridor && btn.id !== 'ALL') {
                    onSelectCorridor(btn.id);
                  }
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  corridorFilter === btn.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {severityFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSeverityFilter('ALL')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset Severity Filter</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter station, defect, KM..."
            className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-52 md:w-60 font-mono"
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
          VIEW 1: LINEAR TRACK STRIP TOPOLOGY HEATMAP (RIBBON BARS)
          ========================================================================= */}
      <div className="relative z-10 bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
        <div className="flex items-center justify-between">
          <h3 className="font-bold uppercase tracking-wider text-slate-200 text-xs flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Linear Track Strip Heatmap (Contiguous Topology Ribbons)</span>
          </h3>
          <span className="text-[10px] text-slate-400">
            Segments scaled by physical length (KM) • Color = Red-to-Green Severity & Duration
          </span>
        </div>

        {/* Corridor ribbons */}
        <div className="space-y-4">
          {Array.from(segmentsByCorridor.entries()).map(([corrCode, segments]) => {
            if (segments.length === 0) return null;
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
                    <span>•</span>
                    <span className="text-amber-300">
                      Total Repair Need: {segments.reduce((a, b) => a + b.expectedRepairDurationMinutes, 0)}m
                    </span>
                  </div>
                </div>

                {/* Track Ribbon Strip with flex segments */}
                <div className="flex w-full h-11 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 p-1 gap-1">
                  {segments.map((seg) => {
                    const color = getCellColor(seg);
                    const isCrit = seg.severityTier === 'CRITICAL';
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
                        title={`${seg.fromStation} ↔ ${seg.toStation} | Severity: ${seg.maintenanceSeverityScore}% | Duration: ${seg.expectedRepairDurationMinutes}m`}
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

      {/* =========================================================================
          VIEW 2: INTERACTIVE SEGMENT HEATMAP MATRIX GRID
          ========================================================================= */}
      <div className="relative z-10 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
              <span>Track Segment Heatmap Matrix ({filteredSegments.length} Segments)</span>
            </span>
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-2">
            <span>
              Active Metric: <strong className="text-amber-300">{metricMode}</strong>
            </span>
            <span>•</span>
            <span>Click any tile to inspect defect diagnostics & schedule block</span>
          </div>
        </div>

        {filteredSegments.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-bold text-slate-200">No track segments matching the current filters.</p>
            <p className="text-[11px] text-slate-500">Try selecting "All Corridors" or resetting the severity filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
            {filteredSegments.map((segment) => {
              const hexColor = getCellColor(segment);
              const isCritical = segment.severityTier === 'CRITICAL';
              const isHigh = segment.severityTier === 'HIGH';
              const isBooked = bookedSegmentIds.includes(segment.segmentId);
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
                  {/* Background intensity indicator */}
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-20"
                    style={{ backgroundColor: hexColor }}
                  />

                  <div className="space-y-2.5">
                    {/* Top Row: Corridor, Segment Bounds, & Score Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-950 text-sky-300 border border-sky-800">
                        {segment.corridorCode}
                      </span>

                      {/* Main Metric Score Pill */}
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded shadow-sm text-slate-950 flex items-center gap-1"
                        style={{ backgroundColor: hexColor }}
                      >
                        {metricMode === 'SEVERITY' && (
                          <>
                            <Flame className="w-3 h-3 text-slate-950" />
                            <span>{segment.maintenanceSeverityScore}% SEVERITY</span>
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

                    {/* Station Pair Title */}
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{segment.fromStation} ↔ {segment.toStation}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        KM {segment.startKm}–{segment.endKm} ({segment.lengthKm} KM) | {segment.trackLine}
                      </p>
                    </div>

                    {/* Defect / Maintenance Reason summary */}
                    <div className="text-[10px] text-slate-300 bg-slate-950/70 p-2 rounded border border-slate-800/80 leading-relaxed">
                      <span className="text-amber-400 font-bold block truncate">
                        {segment.primaryDefectCategory}
                      </span>
                      <span className="text-slate-400 line-clamp-2 mt-0.5">
                        {segment.defectSummary}
                      </span>
                    </div>

                    {/* Dual Indicators: Severity & Duration Pills */}
                    <div className="grid grid-cols-2 gap-1.5 text-[9px] pt-1 border-t border-slate-800/80">
                      {/* Severity Pill */}
                      <div className={`p-1.5 rounded border ${severityBadge.bgClass} ${severityBadge.borderClass} ${severityBadge.textClass}`}>
                        <div className="text-[8px] text-slate-400 uppercase font-bold">Severity:</div>
                        <div className="font-bold flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${severityBadge.dotClass}`} />
                          <span>{segment.maintenanceSeverityScore}% ({segment.severityTier})</span>
                        </div>
                      </div>

                      {/* Duration Pill */}
                      <div className={`p-1.5 rounded border ${durationBadge.bgClass} ${durationBadge.borderClass} ${durationBadge.textClass}`}>
                        <div className="text-[8px] text-slate-400 uppercase font-bold">Block Duration:</div>
                        <div className="font-bold flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${durationBadge.dotClass}`} />
                          <span>{segment.expectedRepairDurationMinutes}m ({segment.expectedRepairDurationHours}h)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tile Bottom Actions */}
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
                        <span className="text-sky-300 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
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
                    {activeSegmentModal.maintenanceSeverityScore}% SEVERITY
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

            {/* Severity & Duration Color Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Metric 1: Maintenance Severity */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Maintenance Severity
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
                    Expected Repair Duration
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
    </div>
  );
};
