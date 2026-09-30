import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  FileText,
  Printer,
  ChevronRight,
  Sparkles,
  Info,
  Thermometer,
  Gauge,
  ArrowRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Corridor, MaintenanceTask } from '../../types';
import {
  DateInspectionReport,
  DefectLocationInspectionLog,
  DefectSeverityLogPoint,
  corridorInspectionLogService,
} from '../../services/corridorInspectionLogService';

interface DateInspectionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DateInspectionReport | null;
  corridor?: Corridor;
  onNavigate?: (screen: string, params?: any) => void;
  onTaskCreated?: (task: MaintenanceTask) => void;
}

export const DateInspectionLogModal: React.FC<DateInspectionLogModalProps> = ({
  isOpen,
  onClose,
  report,
  corridor,
  onNavigate,
  onTaskCreated,
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<Record<string, MaintenanceTask>>({});
  const [activeHoveredLogPoint, setActiveHoveredLogPoint] = useState<{
    locationId: string;
    logPoint: DefectSeverityLogPoint;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen || !report) return null;

  // Safe fallback if corridor object is not yet fully loaded
  const activeCorridor: Corridor = corridor || {
    id: report.corridorId,
    code: report.corridorCode,
    name: report.corridorName,
    stationFrom: 'Origin Terminal',
    stationTo: 'Destination Terminal',
    lengthKm: 45,
    tracksCount: 2,
    speedLimitKmph: 130,
    utilization: 85,
    electrificationStatus: 'ELECTRIFIED_25KV_AC',
    signalingType: 'AUTOMATIC_BLOCK_SIGNALING',
    status: 'ACTIVE',
  };

  const handleScheduleFollowUp = (loc: DefectLocationInspectionLog) => {
    try {
      const task = corridorInspectionLogService.scheduleFollowUpTask(loc, report, activeCorridor);
      setScheduledTasks((prev) => ({ ...prev, [loc.id]: task }));
      setToastMessage(
        `✓ Follow-up Task #${task.taskId} scheduled for ${loc.chainage} (${loc.locationName}) on ${task.requestedDate}!`
      );
      if (onTaskCreated) {
        onTaskCreated(task);
      }
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error('Failed to schedule follow-up maintenance task', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b1328] border border-sky-600/70 rounded-2xl shadow-2xl overflow-hidden font-mono text-slate-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#0d1733] via-[#0f2048] to-[#0a1226] border-b border-sky-800/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                report.isExceedingThreshold
                  ? 'bg-rose-950/80 border-rose-500/80 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.35)]'
                  : 'bg-sky-950/80 border-sky-500/80 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.35)]'
              }`}
            >
              {report.isExceedingThreshold ? (
                <ShieldAlert className="w-5 h-5 animate-pulse text-rose-400" />
              ) : (
                <Calendar className="w-5 h-5 text-sky-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Detailed Inspection Log &amp; Defect Severity Drill-Down
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-bold">
                  {report.displayDate}
                </span>
                {report.isProjected ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-700 text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                    <span>7-DAY FORWARD PROJECTION</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                    DAY {report.dayNumber} OF 30D WINDOW
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Corridor: <span className="text-sky-300 font-bold">{report.corridorCode} — {report.corridorName}</span> •{' '}
                Recorded TDI: <span className={report.isExceedingThreshold ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{report.recordedTDI} TDI</span> (Threshold: {report.criticalThreshold} TDI)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
              title="Print official date inspection log report"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Log</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TOAST CONFIRMATION BANNER */}
        {toastMessage && (
          <div className="px-4 py-2.5 bg-emerald-950 border-b border-emerald-700 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{toastMessage}</span>
            </div>
            {onNavigate && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('timeline', { corridorId: activeCorridor.id });
                }}
                className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>View in Timeline</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        {/* MODAL CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* INSPECTION OVERVIEW METADATA STRIP */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Inspector & Division */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span className="uppercase text-[10px] font-bold">Inspecting Official &amp; Unit</span>
              </div>
              <div className="font-bold text-slate-100">{report.inspectorName}</div>
              <div className="text-[11px] text-sky-300">{report.inspectorDesignation}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{report.inspectionUnit}</div>
            </div>

            {/* Methodology & Shift */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="uppercase text-[10px] font-bold">Methodology &amp; Shift</span>
              </div>
              <div className="font-bold text-slate-100">{report.shiftWindow}</div>
              <div className="text-[10px] text-purple-300 mt-1 leading-snug">
                {report.inspectionMethodology}
              </div>
            </div>

            {/* Weather & Track Temperatures */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                <span className="uppercase text-[10px] font-bold">Atmospheric &amp; Subgrade</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Ambient Temp:</span>
                <span className="font-bold text-amber-300">{report.ambientTemperatureC}°C</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Rail Temperature:</span>
                <span className="font-bold text-rose-300">{report.railTemperatureC}°C</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Ballast Moisture:</span>
                <span className="font-bold text-sky-300">{report.ballastMoisturePercent}%</span>
              </div>
            </div>

            {/* Track Geometry Telemetry */}
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Gauge className="w-3.5 h-3.5 text-emerald-400" />
                <span className="uppercase text-[10px] font-bold">Geometry Indices (TGI)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Track Geometry Index:</span>
                <span className="font-bold text-emerald-400">{report.recordedGeometry.trackGeometryIndexTGI} / 100</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Gauge Deviation:</span>
                <span className="font-bold text-slate-200">+{report.recordedGeometry.gaugeDeviationMm} mm</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Cross-Level Twist:</span>
                <span className="font-bold text-slate-200">{report.recordedGeometry.crossLevelTwistMmPerM} mm/m</span>
              </div>
            </div>
          </div>

          {/* EXECUTIVE OBSERVATION CALLOUT */}
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed ${
              report.isExceedingThreshold
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                : 'bg-[#091124] border-sky-900/80 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="font-bold uppercase tracking-wider text-slate-100 text-[11px]">
                Senior Section Engineer (P-Way) Official Observation:
              </span>
            </div>
            <p>{report.executiveObservation}</p>
            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-[11px]">
              <span className="text-slate-400">
                Action Recommendation:{' '}
                <strong className="text-sky-300">{report.correctivePriorityRecommendation}</strong>
              </span>
            </div>
          </div>

          {/* DEFECT LOCATIONS & 5-LOG MINI-SPARKLINES */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Corridor Defect Locations &amp; 5-Inspection Severity Evolution
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400">
                  {report.defectLocations.length} Critical Locations Monitored
                </span>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>Mini-Sparklines depict severity score (0-100) across last 5 inspection cycles</span>
              </div>
            </div>

            {/* LOCATION CARDS */}
            <div className="space-y-3.5">
              {report.defectLocations.map((loc) => {
                const isScheduled = !!scheduledTasks[loc.id] || !!loc.followUpTaskId;
                const scheduledTask = scheduledTasks[loc.id];
                const firstScore = loc.last5Logs[0]?.severityScore || 30;
                const lastScore = loc.last5Logs[loc.last5Logs.length - 1]?.severityScore || 80;
                const deltaPoints = lastScore - firstScore;
                const isEscalating = deltaPoints > 0;
                const isCritical = loc.riskLevel === 'CRITICAL';
                const isHigh = loc.riskLevel === 'HIGH';

                return (
                  <div
                    key={loc.id}
                    className={`p-4 rounded-xl border transition-all duration-200 ${
                      isScheduled
                        ? 'bg-[#0a1827] border-emerald-600/70 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : isCritical
                        ? 'bg-gradient-to-r from-[#170a14] via-[#120f22] to-[#0c1426] border-rose-800/80 hover:border-rose-600'
                        : isHigh
                        ? 'bg-gradient-to-r from-[#17130a] via-[#120f22] to-[#0c1426] border-amber-800/80 hover:border-amber-600'
                        : 'bg-[#0c1427] border-slate-800 hover:border-sky-800'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Location & Defect details */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1 font-bold text-slate-100 text-sm">
                            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{loc.locationName}</span>
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-mono">
                            {loc.chainage}
                          </span>
                          <span className="text-xs text-slate-400">({loc.trackLine})</span>

                          {/* Severity Badge */}
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              isCritical
                                ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                                : isHigh
                                ? 'bg-amber-950 text-amber-300 border-amber-700'
                                : 'bg-sky-950 text-sky-300 border-sky-700'
                            }`}
                          >
                            Severity {loc.currentSeverity}/100 • {loc.riskLevel}
                          </span>

                          {loc.speedRestrictionKmph && (
                            <span className="px-2 py-0.5 rounded bg-yellow-950 text-yellow-300 border border-yellow-700 text-[10px] font-bold">
                              Caution Order: {loc.speedRestrictionKmph} km/h
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                          <span>{loc.defectType}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-sans sm:font-mono line-clamp-2">
                          <strong className="text-slate-300">Wear Mechanism:</strong> {loc.primaryCause} •{' '}
                          <strong className="text-rose-400">Operational Risk:</strong> {loc.safetyViolationRisk}
                        </div>
                      </div>

                      {/* Center: Mini-Sparkline (Trend over last 5 logs for this specific location) */}
                      <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-col justify-between shrink-0 min-w-[240px]">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold flex items-center gap-1 text-slate-300">
                            <Activity className="w-3 h-3 text-sky-400" />
                            <span>Last 5 Logs Trend</span>
                          </span>
                          <span
                            className={`font-black flex items-center gap-0.5 ${
                              isEscalating ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isEscalating ? (
                              <>
                                <TrendingUp className="w-3 h-3" />
                                <span>+{deltaPoints} pts escalation</span>
                              </>
                            ) : (
                              <>
                                <TrendingDown className="w-3 h-3" />
                                <span>{deltaPoints} pts change</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* MINI-SPARKLINE SVG */}
                        <div className="relative py-1">
                          <MiniSparkline
                            logs={loc.last5Logs}
                            locationId={loc.id}
                            onHoverLog={(point) =>
                              setActiveHoveredLogPoint(point ? { locationId: loc.id, logPoint: point } : null)
                            }
                          />
                        </div>

                        {/* Bottom sparkline footer: Start and End severity values */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-900">
                          <span>Log #1: {loc.last5Logs[0]?.displayDate} ({firstScore})</span>
                          <ArrowRight className="w-2.5 h-2.5 text-slate-600" />
                          <span className={lastScore >= 75 ? 'text-rose-400 font-bold' : 'text-slate-300 font-bold'}>
                            Log #5: {loc.last5Logs[4]?.displayDate} ({lastScore})
                          </span>
                        </div>
                      </div>

                      {/* Right: Schedule Follow-up Button */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-end justify-center gap-2 shrink-0">
                        {isScheduled ? (
                          <div className="p-2 rounded-lg bg-emerald-950/90 border border-emerald-600/80 text-emerald-300 text-xs text-right space-y-0.5">
                            <div className="flex items-center gap-1 font-bold text-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Follow-up Scheduled</span>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono">
                              Task: {scheduledTask?.taskId || loc.followUpTaskId}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              Night Block • {scheduledTask?.durationMinutes || loc.recommendedDurationMinutes} min
                            </div>
                          </div>
                        ) : (
                          <button
                            id={`schedule-followup-btn-${loc.id}`}
                            onClick={() => handleScheduleFollowUp(loc)}
                            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-sky-950/60 hover:shadow-sky-800/50 transition-all cursor-pointer whitespace-nowrap"
                            title={`Create and schedule a follow-up maintenance task for ${loc.locationName}`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Schedule Follow-up</span>
                          </button>
                        )}

                        <div className="text-[10px] text-slate-400 text-right">
                          Rec: {loc.recommendedDepartment} ({loc.recommendedDurationMinutes}m)
                        </div>
                      </div>
                    </div>

                    {/* HOVERED SPARKLINE DETAIL CALLOUT (When user hovers on a sparkline dot) */}
                    {activeHoveredLogPoint && activeHoveredLogPoint.locationId === loc.id && (
                      <div className="mt-2.5 p-2 rounded-lg bg-slate-900 border border-sky-800/80 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">Inspection Log #{activeHoveredLogPoint.logPoint.logIndex}:</span>
                          <span className="text-sky-300 font-bold">{activeHoveredLogPoint.logPoint.displayDate} ({activeHoveredLogPoint.logPoint.daysAgo} days ago)</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-slate-300">{activeHoveredLogPoint.logPoint.inspectionType}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>
                            Severity:{' '}
                            <strong
                              className={
                                activeHoveredLogPoint.logPoint.severityScore >= 75
                                  ? 'text-rose-400'
                                  : 'text-amber-300'
                              }
                            >
                              {activeHoveredLogPoint.logPoint.severityScore}/100
                            </strong>
                          </span>
                          <span>
                            TDI: <strong className="text-slate-200">{activeHoveredLogPoint.logPoint.recordedTDI}</strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400 text-[11px]">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              All scheduled follow-up tasks immediately synchronize with the automatic block conflict engine and resource roster.
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Close Drill-Down
            </button>
            {onNavigate && (
              <button
                onClick={() => {
                  onClose();
                  onNavigate('timeline', { corridorId: activeCorridor.id });
                }}
                className="px-4 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Open Block Timeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mini-Sparkline Component: Visualizes defect severity score trend over 5 historical logs
 */
interface MiniSparklineProps {
  logs: DefectSeverityLogPoint[];
  locationId: string;
  onHoverLog?: (point: DefectSeverityLogPoint | null) => void;
}

const MiniSparkline: React.FC<MiniSparklineProps> = ({ logs, locationId, onHoverLog }) => {
  if (!logs || logs.length === 0) return null;

  const width = 210;
  const height = 40;
  const paddingX = 10;
  const paddingY = 8;

  const minScore = 0;
  const maxScore = 100;

  // Calculate coordinates for 5 points
  const points = logs.map((log, index) => {
    const x = paddingX + (index / (logs.length - 1)) * (width - 2 * paddingX);
    // Inverted Y: 0 is top, height is bottom
    const y = height - paddingY - ((log.severityScore - minScore) / (maxScore - minScore)) * (height - 2 * paddingY);
    return { x, y, log };
  });

  // Polyline points string
  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Gradient area path string
  const areaPath = `M ${points[0].x.toFixed(1)},${height - paddingY} ` +
    points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
    ` L ${points[points.length - 1].x.toFixed(1)},${height - paddingY} Z`;

  const isEscalating = logs[logs.length - 1].severityScore > logs[0].severityScore;
  const strokeColor = isEscalating ? '#f43f5e' : '#10b981';
  const gradientId = `spark-grad-${locationId}`;

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg
        width={width}
        height={height}
        className="overflow-visible select-none"
        onMouseLeave={() => onHoverLog && onHoverLog(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Reference guide dashed line for critical 75-point mark */}
        <line
          x1={paddingX}
          y1={height - paddingY - (75 / 100) * (height - 2 * paddingY)}
          x2={width - paddingX}
          y2={height - paddingY - (75 / 100) * (height - 2 * paddingY)}
          stroke="#475569"
          strokeDasharray="2 2"
          strokeWidth={0.8}
        />

        {/* Gradient fill underneath curve */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Sparkline curve stroke */}
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylineStr}
        />

        {/* Data points */}
        {points.map((p, idx) => {
          const isLatest = idx === points.length - 1;
          const isCrit = p.log.severityScore >= 80;

          return (
            <g
              key={idx}
              className="cursor-pointer group"
              onMouseEnter={() => onHoverLog && onHoverLog(p.log)}
            >
              {/* Invisible larger hit area for easy hover */}
              <circle cx={p.x} cy={p.y} r={8} fill="transparent" />

              {/* Point circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isLatest ? 3.5 : 2.5}
                fill={isLatest ? (isCrit ? '#f43f5e' : strokeColor) : '#1e293b'}
                stroke={isLatest ? '#ffffff' : strokeColor}
                strokeWidth={isLatest ? 1.5 : 1}
                className="transition-transform group-hover:scale-125"
              />

              {/* Value label on latest point */}
              {isLatest && (
                <text
                  x={p.x + 6}
                  y={p.y + 3}
                  fill={isCrit ? '#f43f5e' : '#38bdf8'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {p.log.severityScore}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
