import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Flame,
  Activity,
  Calendar,
  Clock,
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  FileText,
  Zap,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info,
  MapPin,
  Compass,
  AlertCircle,
  Sliders,
  ExternalLink,
  Layers,
  X,
  Printer,
  Download,
} from 'lucide-react';
import {
  corridorDefectPredictionService,
  UrgentTrackSegmentPrediction,
  SegmentUrgencyTier,
  HistoricalInspectionLogRecord,
} from '../../services/corridorDefectPredictionService';
import { railwayAudio } from '../../services/railwayAudio';
import { DepartmentType } from '../../types';

interface CorridorDefectPredictiveModuleProps {
  selectedCorridorId?: string;
  onSelectCorridor?: (corridorId: string) => void;
  onScheduleBlock?: (segment: UrgentTrackSegmentPrediction) => void;
  onNavigateToTimeline?: () => void;
}

export const CorridorDefectPredictiveModule: React.FC<CorridorDefectPredictiveModuleProps> = ({
  selectedCorridorId = 'ALL',
  onSelectCorridor,
  onScheduleBlock,
  onNavigateToTimeline,
}) => {
  // Filters & State
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'URGENT_ONLY' | 'CRITICAL' | 'HIGH' | 'WATCHLIST'>('URGENT_ONLY');
  const [corridorFilter, setCorridorFilter] = useState<string>(selectedCorridorId === 'ALL' ? 'ALL' : selectedCorridorId);
  const [departmentFilter, setDepartmentFilter] = useState<'ALL' | DepartmentType>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Active Inspect Segment Modal
  const [inspectingSegment, setInspectingSegment] = useState<UrgentTrackSegmentPrediction | null>(null);

  // Scheduled Blocks Tracking (Simulated in session)
  const [scheduledSegmentIds, setScheduledSegmentIds] = useState<string[]>([]);
  const [showScheduleSuccessModal, setShowScheduleSuccessModal] = useState<UrgentTrackSegmentPrediction | null>(null);

  // Fetch summary and segments from service
  const summary = useMemo(() => {
    return corridorDefectPredictionService.getPredictiveSummary(corridorFilter);
  }, [corridorFilter]);

  const rawSegments = useMemo(() => {
    return corridorDefectPredictionService.getSegmentPredictions(corridorFilter);
  }, [corridorFilter]);

  // Sync internal corridorFilter if selectedCorridorId changes from parent
  React.useEffect(() => {
    if (selectedCorridorId && selectedCorridorId !== 'ALL') {
      setCorridorFilter(selectedCorridorId);
    }
  }, [selectedCorridorId]);

  // Filtered segments
  const filteredSegments = useMemo(() => {
    return rawSegments.filter((seg) => {
      // Urgency filter
      if (urgencyFilter === 'URGENT_ONLY') {
        if (seg.urgencyTier !== 'CRITICAL' && seg.urgencyTier !== 'HIGH') return false;
      } else if (urgencyFilter !== 'ALL') {
        if (seg.urgencyTier !== urgencyFilter) return false;
      }

      // Department filter
      if (departmentFilter !== 'ALL') {
        if (seg.recommendedDepartment !== departmentFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle =
          seg.segmentId.toLowerCase().includes(q) ||
          seg.fromStation.toLowerCase().includes(q) ||
          seg.toStation.toLowerCase().includes(q) ||
          seg.primaryDefectCategory.toLowerCase().includes(q) ||
          seg.primaryDefectDescription.toLowerCase().includes(q) ||
          seg.trackLine.toLowerCase().includes(q) ||
          seg.corridorCode.toLowerCase().includes(q);
        if (!matchTitle) return false;
      }

      return true;
    });
  }, [rawSegments, urgencyFilter, departmentFilter, searchQuery]);

  // Trigger automated regression scan
  const handleTriggerAutomatedScan = () => {
    railwayAudio.playBeep(750, 0.08);
    setIsScanning(true);
    setScanMessage('Ingesting USFD, OMS-2000, and TRD thermography logs across Indian Railways Delhi Division...');

    setTimeout(() => {
      setScanMessage('Calculating defect recurrence velocity & Track Degradation Index (TDI) curves...');
    }, 600);

    setTimeout(() => {
      railwayAudio.playSuccessTone();
      setIsScanning(false);
      setScanMessage('Prediction complete: 4 urgent track segments flagged for Upcoming Maintenance Cycle 26-B.');
      setTimeout(() => setScanMessage(null), 5000);
    }, 1300);
  };

  // Schedule Block Action
  const handleScheduleUrgentBlock = (segment: UrgentTrackSegmentPrediction) => {
    railwayAudio.playStationChime();
    setScheduledSegmentIds((prev) => [...new Set([...prev, segment.segmentId])]);
    setShowScheduleSuccessModal(segment);
    if (onScheduleBlock) {
      onScheduleBlock(segment);
    }
  };

  return (
    <div
      id="corridor-defect-predictive-module"
      data-testid="corridor-defect-predictive-module"
      className="bg-[#0b1328] rounded-2xl border-2 border-amber-500/60 shadow-2xl p-5 md:p-6 space-y-6 relative overflow-hidden"
    >
      {/* Background ambient decorative glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-rose-600 text-slate-950 font-bold shadow-lg shadow-amber-500/20">
              <ShieldAlert className="w-5 h-5 text-slate-950" />
            </div>
            <h2 className="text-base md:text-lg font-bold text-white font-mono tracking-wide uppercase flex items-center gap-2">
              <span>Predictive Track Segment Degradation Module</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-bold animate-pulse">
                LIVE DEFECT LOG ANALYTICS
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            Analyzes historical defect logs (USFD rail fatigue, point drag, subgrade mud pumping, catenary wear) to isolate segments requiring urgent preventive blocks in <strong className="text-amber-300">{summary.activeCycleCode} ({summary.activeCycleSpan})</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            id="btn-run-predictive-scan"
            onClick={handleTriggerAutomatedScan}
            disabled={isScanning}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-md shadow-sky-950/60 cursor-pointer transition-all disabled:opacity-50"
            title="Re-run defect log linear regression analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-amber-300' : 'text-sky-200'}`} />
            <span>{isScanning ? 'Scanning Defect Logs...' : 'Run Automated Predictive Scan'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              railwayAudio.playBeep();
              window.print();
            }}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Export official Cycle 26-B urgent track maintenance advisory"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print Cycle 26-B Advisory</span>
          </button>
        </div>
      </div>

      {/* Real-time scan banner toast if active */}
      {scanMessage && (
        <div className="relative z-10 p-3 rounded-xl bg-sky-950/90 border border-sky-500 text-xs font-mono text-sky-200 flex items-center gap-2.5 shadow-lg animate-in fade-in">
          <Activity className="w-4 h-4 text-sky-400 shrink-0 animate-pulse" />
          <span className="flex-1">{scanMessage}</span>
        </div>
      )}

      {/* EXECUTIVE PREDICTIVE KPI METRICS BAR */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
        {/* Metric 1: Urgent Attention Required */}
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-700/80 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-300 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-400" />
              Urgent Segments
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900/80 text-rose-200 border border-rose-600">
              NEXT CYCLE
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-100">
              {summary.criticalUrgentCount + summary.highPriorityCount}
            </span>
            <span className="text-[10px] text-rose-300">
              ({summary.criticalUrgentCount} Critical, {summary.highPriorityCount} High)
            </span>
          </div>
          <div className="mt-1 text-[10px] text-rose-400 font-medium">
            Requires preventive blocks
          </div>
        </div>

        {/* Metric 2: Defect Inspection Logs Processed */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-300 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              Historical Logs
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
              90-DAY TRAIL
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-200">
              {summary.historicalDefectLogsProcessed}
            </span>
            <span className="text-[10px] text-slate-400">
              Audit Records
            </span>
          </div>
          <div className="mt-1 text-[10px] text-slate-400">
            OMS, USFD & FLIR Logs
          </div>
        </div>

        {/* Metric 3: Punctuality Loss Avoidable */}
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/80 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-300 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Delay Avoidable
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/80 text-amber-200 border border-amber-600">
              SAVINGS
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-100">
              {summary.projectedPunctualityLossAvoidableMins}
            </span>
            <span className="text-[10px] text-amber-300">
              Minutes
            </span>
          </div>
          <div className="mt-1 text-[10px] text-amber-400">
            Across 52 threatened trains
          </div>
        </div>

        {/* Metric 4: Active Cycle Window */}
        <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/80 shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-sky-300 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              Upcoming Cycle
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900 text-sky-200">
              WINDOW
            </span>
          </div>
          <div className="mt-2 text-sm font-black text-slate-100">
            {summary.activeCycleCode}
          </div>
          <div className="mt-1 text-[10px] text-sky-300">
            {summary.activeCycleSpan}
          </div>
        </div>

        {/* Metric 5: Preemptive Scheduling Status */}
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/80 shadow-inner flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-emerald-300 text-[11px] font-bold">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Blocks Locked
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200">
              DISPATCH
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-100">
              {scheduledSegmentIds.length} / {summary.criticalUrgentCount + summary.highPriorityCount}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-emerald-400">
            {scheduledSegmentIds.length >= summary.criticalUrgentCount + summary.highPriorityCount
              ? 'All urgent segments covered'
              : 'Blocks awaiting controller sign-off'}
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Urgency Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5">Urgency:</span>
            {[
              { id: 'URGENT_ONLY', label: 'Urgent Attention (Critical + High)', color: 'text-amber-300' },
              { id: 'ALL', label: 'All Segments', color: 'text-slate-300' },
              { id: 'CRITICAL', label: 'Critical Only', color: 'text-rose-300' },
              { id: 'HIGH', label: 'High Only', color: 'text-amber-300' },
              { id: 'WATCHLIST', label: 'Watchlist', color: 'text-sky-300' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  railwayAudio.playBeep(650, 0.05);
                  setUrgencyFilter(btn.id as any);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                  urgencyFilter === btn.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Corridor Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase px-1.5">Corridor:</span>
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
                    ? 'bg-amber-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {corr}
              </button>
            ))}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search station, defect, KM..."
            className="pl-8 pr-7 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-52 md:w-60 font-mono"
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

      {/* TRACK SEGMENTS LIST - HIGHLIGHTING URGENT ATTENTION SEGMENTS */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Track Segments Expected to Require Urgent Attention ({filteredSegments.length})
          </span>
          <span>
            Upcoming Maintenance Cycle: <strong className="text-amber-300">Cycle 26-B (Oct 3–9)</strong>
          </span>
        </div>

        {filteredSegments.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-900/60 border border-slate-800 text-center font-mono text-xs text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="font-bold text-slate-200">No track segments matching current filters.</p>
            <p className="text-[11px] text-slate-500">
              Try switching urgency to "All Segments" or clearing the search query.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredSegments.map((segment) => {
              const isCritical = segment.urgencyTier === 'CRITICAL';
              const isHigh = segment.urgencyTier === 'HIGH';
              const isScheduled = scheduledSegmentIds.includes(segment.segmentId);

              return (
                <div
                  key={segment.segmentId}
                  id={`segment-card-${segment.segmentId}`}
                  className={`p-5 rounded-xl border-2 transition-all relative overflow-hidden flex flex-col justify-between ${
                    isCritical
                      ? 'bg-gradient-to-br from-[#1b0d18] via-[#161228] to-[#0e172e] border-rose-500/80 shadow-lg shadow-rose-950/40'
                      : isHigh
                      ? 'bg-gradient-to-br from-[#1f160b] via-[#181628] to-[#0e172e] border-amber-500/80 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Decorative corner warning beacon */}
                  {isCritical && (
                    <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                      <span className="relative flex h-5 w-5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-5 w-5 bg-rose-600 border-2 border-slate-950" />
                      </span>
                    </div>
                  )}

                  <div className="space-y-3 font-mono">
                    {/* Top Row: Corridor, Segment Bounds, & Urgency Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-950 text-sky-300 border border-sky-800">
                          {segment.corridorCode}
                        </span>
                        <span className="text-sm font-bold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{segment.fromStation}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span>{segment.toStation}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Urgency Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 uppercase tracking-wider ${
                            isCritical
                              ? 'bg-rose-950 text-rose-200 border-rose-500 shadow-sm animate-pulse'
                              : isHigh
                              ? 'bg-amber-950 text-amber-200 border-amber-500'
                              : 'bg-sky-950 text-sky-200 border-sky-600'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {segment.urgencyTier} ATTENTION REQUIRED
                        </span>

                        {isScheduled && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            BLOCK RESERVED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chainage, Track Line, Speed Limit */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                      <span>
                        Chainage: <strong className="text-slate-200">KM {segment.startKm} – {segment.endKm}</strong> ({segment.lengthKm} KM)
                      </span>
                      <span>
                        Line: <strong className="text-sky-300">{segment.trackLine}</strong>
                      </span>
                      <span>
                        Speed Limit: <strong className="text-amber-300">{segment.speedLimitKmph} km/h</strong>
                        {segment.activeSpeedRestrictionKmph ? (
                          <span className="text-rose-400 font-bold ml-1">
                            (Restricted to {segment.activeSpeedRestrictionKmph} km/h)
                          </span>
                        ) : null}
                      </span>
                    </div>

                    {/* PRIMARY DEFECT DIAGNOSTIC HIGHLIGHT */}
                    <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          {segment.primaryDefectCategory}
                        </span>
                        <span className="text-[10px] text-rose-400 font-bold">
                          {segment.defectRecurrenceVelocity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                        {segment.primaryDefectDescription}
                      </p>
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                        <span>Statutory Ref: <strong className="text-slate-300">{segment.statutoryStandard}</strong></span>
                        <span className="text-amber-400/90">
                          {segment.historicalLogs.length} historical defect logs verified
                        </span>
                      </div>
                    </div>

                    {/* CRITICAL RISK METRICS GAUGE & FAILURE PROJECTION */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      {/* Risk Score */}
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Failure Risk</span>
                        <span
                          className={`text-base font-black ${
                            segment.riskScore >= 85
                              ? 'text-rose-400'
                              : segment.riskScore >= 70
                              ? 'text-amber-400'
                              : 'text-sky-400'
                          }`}
                        >
                          {segment.riskScore}%
                        </span>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              segment.riskScore >= 85 ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${segment.riskScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Projected Failure Days */}
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Failure Window</span>
                        <span className="text-sm font-bold text-rose-300 block">
                          Within {segment.projectedFailureDays} Days
                        </span>
                        <span className="text-[9px] text-slate-400">{segment.projectedFailureDate}</span>
                      </div>

                      {/* Track Degradation Index (TDI) */}
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">TDI Degradation</span>
                        <span className="text-xs font-bold text-amber-200">
                          {segment.currentTDI} ➔ {segment.projectedTDI}
                        </span>
                        <span className="text-[9px] text-slate-400 block">Gauge: +{segment.gaugeSpreadMm}mm</span>
                      </div>

                      {/* Threatened Traffic */}
                      <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                        <span className="text-[10px] text-slate-400 block">Threatened Impact</span>
                        <span className="text-xs font-bold text-rose-300 block">
                          {segment.threatenedTrainsCount} Trains
                        </span>
                        <span className="text-[9px] text-rose-400 font-bold">
                          +{segment.projectedPunctualityLossMinutes}m delay
                        </span>
                      </div>
                    </div>

                    {/* RECOMMENDED PREVENTIVE MAINTENANCE BLOCK PROFILE */}
                    <div className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-800/60 text-[11px] space-y-1">
                      <div className="flex items-center justify-between font-bold text-sky-200">
                        <span className="flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-sky-400" />
                          Recommended Preventive Block Requisition
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-900 text-sky-200">
                          {segment.recommendedShift.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-slate-300 text-[10px] flex items-center justify-between flex-wrap gap-2">
                        <span>Duration: <strong className="text-white">{segment.recommendedBlockDurationMinutes} mins</strong> ({segment.recommendedAlternativeWindow})</span>
                        <span>Dept: <strong className="text-amber-300">{segment.recommendedDepartment}</strong></span>
                        <span>Machinery: <strong className="text-slate-200">{segment.recommendedMachinery}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-xs">
                    {/* View Historical Defect Logs */}
                    <button
                      type="button"
                      id={`btn-inspect-logs-${segment.segmentId}`}
                      onClick={() => {
                        railwayAudio.playBeep(700, 0.05);
                        setInspectingSegment(segment);
                      }}
                      className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-200 font-bold border border-sky-700/60 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      title="Inspect chronological historical defect logs and ultrasonic recordings"
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Inspect Historical Logs ({segment.historicalLogs.length})</span>
                    </button>

                    {/* Schedule Urgent Block */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        id={`btn-schedule-block-${segment.segmentId}`}
                        onClick={() => handleScheduleUrgentBlock(segment)}
                        disabled={isScheduled}
                        className={`w-full sm:w-auto px-3.5 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all ${
                          isScheduled
                            ? 'bg-emerald-800/60 text-emerald-200 border border-emerald-600/80 cursor-default'
                            : 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white shadow-amber-950/50'
                        }`}
                        title="Lock in preventive maintenance block in upcoming cycle 26-B"
                      >
                        {isScheduled ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                            <span>Block Requisitioned</span>
                          </>
                        ) : (
                          <>
                            <Wrench className="w-3.5 h-3.5 text-white" />
                            <span>Schedule Urgent Block</span>
                          </>
                        )}
                      </button>

                      {onNavigateToTimeline && (
                        <button
                          type="button"
                          onClick={() => {
                            railwayAudio.playBeep();
                            onNavigateToTimeline();
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                          title="View on Master Gantt Timeline"
                        >
                          <ChevronRight className="w-4 h-4 text-slate-400" />
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

      {/* =========================================================================
          HISTORICAL DEFECT LOG INSPECTION MODAL
          ========================================================================= */}
      {inspectingSegment && (
        <div
          id="modal-historical-defect-logs"
          data-testid="modal-historical-defect-logs"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in"
        >
          <div className="bg-[#091124] border-2 border-sky-500/80 rounded-2xl max-w-3xl w-full p-5 md:p-6 space-y-5 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800 font-mono">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-sky-950 text-sky-200 border border-sky-700">
                    {inspectingSegment.corridorCode}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Historical Defect Audit Trail: {inspectingSegment.fromStation} ↔ {inspectingSegment.toStation}
                  </h3>
                </div>
                <p className="text-xs text-slate-300">
                  Chainage KM {inspectingSegment.startKm}–{inspectingSegment.endKm} | {inspectingSegment.trackLine} | Standard: {inspectingSegment.statutoryStandard}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingSegment(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Regression Summary Box */}
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/60 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-amber-200">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Defect Degradation Regression Analysis
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900 text-amber-100 font-bold">
                  {inspectingSegment.defectRecurrenceVelocity}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {inspectingSegment.rootCauseAnalysis}
              </p>
              <div className="text-[10px] text-amber-300 flex items-center justify-between pt-1 border-t border-amber-900/50">
                <span>Consequence of Delay: <strong>{inspectingSegment.consequenceOfDelay}</strong></span>
              </div>
            </div>

            {/* Historical Logs Timeline List */}
            <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-1">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                Chronological Inspection Records ({inspectingSegment.historicalLogs.length} verified logs)
              </h4>

              <div className="space-y-2.5">
                {inspectingSegment.historicalLogs.map((log, idx) => (
                  <div
                    key={log.logId}
                    className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sky-300">{log.logId}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-200 font-medium">{log.inspectionDate}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                          {log.daysAgo} days ago
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-200 border border-sky-800">
                          {log.methodology}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            log.criticalityScore >= 80
                              ? 'bg-rose-950 text-rose-200 border-rose-700'
                              : log.criticalityScore >= 60
                              ? 'bg-amber-950 text-amber-200 border-amber-700'
                              : 'bg-emerald-950 text-emerald-200 border-emerald-700'
                          }`}
                        >
                          Crit: {log.criticalityScore}%
                        </span>
                      </div>
                    </div>

                    {/* Defect Observation recorded */}
                    <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Observation:</span>
                      {log.defectObservation}
                    </div>

                    {/* Action Recommended by Inspector */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>
                        Recommended: <strong className="text-emerald-300">{log.recommendedAction}</strong>
                      </span>
                      <span>
                        Auditor: <strong className="text-slate-300">{log.recordedBy} ({log.designation})</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  railwayAudio.playBeep();
                  window.print();
                }}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-400" />
                <span>Print Inspection Dossier</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setInspectingSegment(null)}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleScheduleUrgentBlock(inspectingSegment);
                    setInspectingSegment(null);
                  }}
                  className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Schedule Urgent Block for {inspectingSegment.upcomingCycleWindow}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SCHEDULE BLOCK SUCCESS CONFIRMATION MODAL
          ========================================================================= */}
      {showScheduleSuccessModal && (
        <div
          id="modal-schedule-block-success"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div className="bg-[#09152a] border-2 border-emerald-500/80 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500 text-slate-950 font-bold shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Preventive Block Requisition Confirmed
                </h3>
                <p className="text-[11px] text-emerald-300">
                  Scheduled into Maintenance Cycle 26-B
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Track Segment:</span>
                <span className="text-white font-bold">
                  {showScheduleSuccessModal.fromStation} ↔ {showScheduleSuccessModal.toStation}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chainage:</span>
                <span className="text-sky-300 font-bold">
                  KM {showScheduleSuccessModal.startKm}–{showScheduleSuccessModal.endKm}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Window & Duration:</span>
                <span className="text-amber-300 font-bold">
                  {showScheduleSuccessModal.recommendedAlternativeWindow} ({showScheduleSuccessModal.recommendedBlockDurationMinutes}m)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Machinery:</span>
                <span className="text-slate-200">
                  {showScheduleSuccessModal.recommendedMachinery}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Gang Strength:</span>
                <span className="text-slate-200">
                  {showScheduleSuccessModal.requiredGangStrength} PWI Trackmen
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Traction Cutoff:</span>
                <span className={showScheduleSuccessModal.tractionIsolationRequired ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {showScheduleSuccessModal.tractionIsolationRequired ? '25kV Isolation Mandated' : 'Not Required'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowScheduleSuccessModal(null)}
              className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
