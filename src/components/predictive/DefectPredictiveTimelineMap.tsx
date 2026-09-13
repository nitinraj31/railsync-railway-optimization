import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  Layers,
  Wrench,
  CheckCircle2,
  TrendingDown,
  Activity,
  Crosshair,
  MapPin,
  ExternalLink,
  Zap,
  Gauge,
  Info,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Flame,
  Check,
  ShieldCheck,
  AlertOctagon,
} from 'lucide-react';
import { Defect, DepartmentType } from '../../types';
import {
  predictAssetCriticality,
  PredictiveCriticalityResult,
  TimelineMilestone,
} from '../../services/defectPredictiveCriticalityService';
import { railwayAudio } from '../../services/railwayAudio';
import { mockStore } from '../../services/api';

interface DefectPredictiveTimelineMapProps {
  defects: Defect[];
  selectedDefectId?: string;
  onSelectDefect?: (defectId: string) => void;
  onOpenDefectLocationModal?: (defect: Defect) => void;
  onScheduleBlockSuccess?: (blockId: string) => void;
}

export const DefectPredictiveTimelineMap: React.FC<DefectPredictiveTimelineMapProps> = ({
  defects,
  selectedDefectId,
  onSelectDefect,
  onOpenDefectLocationModal,
  onScheduleBlockSuccess,
}) => {
  // Active selected defect for prediction
  const [activeDefectId, setActiveDefectId] = useState<string>(() => {
    if (selectedDefectId && defects.some((d) => d.defectId === selectedDefectId)) {
      return selectedDefectId;
    }
    return defects.length > 0 ? defects[0].defectId : '';
  });

  // Department / Corridor filter
  const [filterDept, setFilterDept] = useState<string>('ALL');

  // Timeline scrubber state: 0 to 30 days
  const [currentTimelineDay, setCurrentTimelineDay] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x

  // Proactive block booking feedback state
  const [isBookingBlock, setIsBookingBlock] = useState<boolean>(false);
  const [bookedBlockId, setBookedBlockId] = useState<string | null>(null);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Sync activeDefectId when prop changes
  useEffect(() => {
    if (selectedDefectId && selectedDefectId !== activeDefectId) {
      setActiveDefectId(selectedDefectId);
      setCurrentTimelineDay(0);
      setIsPlaying(false);
      setBookedBlockId(null);
      setBookingSuccessMsg(null);
    }
  }, [selectedDefectId]);

  // Current defect object
  const currentDefect = useMemo(() => {
    return defects.find((d) => d.defectId === activeDefectId) || defects[0] || null;
  }, [defects, activeDefectId]);

  // Generate predictive criticality model for current defect
  const prediction = useMemo<PredictiveCriticalityResult | null>(() => {
    if (!currentDefect) return null;
    return predictAssetCriticality(currentDefect, defects);
  }, [currentDefect, defects]);

  // Filtered defects list for quick switcher
  const filteredDefectOptions = useMemo(() => {
    return defects.filter((d) => {
      if (filterDept !== 'ALL' && d.department !== filterDept) return false;
      return true;
    });
  }, [defects, filterDept]);

  // Auto-playback simulation loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying) {
      const intervalMs = 600 / playbackSpeed;
      timer = setInterval(() => {
        setCurrentTimelineDay((prev) => {
          if (prev >= 30) {
            setIsPlaying(false);
            railwayAudio.playBeep(440, 0.08);
            return 30;
          }
          const next = prev + 1;
          // Audio chime when crossing predicted critical day
          if (prediction && next === Math.round(prediction.daysUntilCritical)) {
            railwayAudio.playBeep(880, 0.1);
          }
          return next;
        });
      }, intervalMs);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed, prediction]);

  // Get degradation state for the current scrubbed timeline day
  const currentTimelinePoint = useMemo(() => {
    if (!prediction) return null;
    const clampedDay = Math.min(30, Math.max(0, currentTimelineDay));
    return (
      prediction.degradationCurve.find((p) => p.day === clampedDay) ||
      prediction.degradationCurve[prediction.degradationCurve.length - 1]
    );
  }, [prediction, currentTimelineDay]);

  const isCurrentDayCritical = useMemo(() => {
    return currentTimelinePoint ? currentTimelinePoint.isCritical : false;
  }, [currentTimelinePoint]);

  const isCurrentDayPastCritical = useMemo(() => {
    if (!prediction) return false;
    return currentTimelineDay >= prediction.daysUntilCritical;
  }, [prediction, currentTimelineDay]);

  const isCurrentDayOptimalBlock = useMemo(() => {
    if (!prediction) return false;
    return (
      currentTimelineDay >= prediction.recommendedBlockWindow.startDay - 1 &&
      currentTimelineDay <= prediction.recommendedBlockWindow.startDay + 1
    );
  }, [prediction, currentTimelineDay]);

  // Handle scheduling proactive preventive block directly from predictive timeline
  const handleSchedulePreventiveBlock = () => {
    if (!prediction || isBookingBlock) return;
    setIsBookingBlock(true);
    railwayAudio.playBeep(660, 0.06);

    setTimeout(() => {
      const blockId = `BLK-PRED-${prediction.assetId}-${Date.now().toString().slice(-4)}`;
      try {
        mockStore.addOptimizedBlock({
          blockId,
          taskId: `TSK-PRED-${prediction.assetId}`,
          department: prediction.department,
          assetId: prediction.assetId,
          corridorId: prediction.corridorId,
          section: `${prediction.corridorId} KM ${prediction.currentKm.toFixed(1)}`,
          date: prediction.recommendedBlockWindow.optimalDate,
          startTime: prediction.recommendedBlockWindow.startTime,
          endTime: prediction.recommendedBlockWindow.endTime,
          durationMinutes: prediction.recommendedBlockWindow.blockDurationHours * 60,
          priority: 'HIGH',
          status: 'SCHEDULED',
          validationStatus: 'VALID',
          hasConflict: false,
          explainability: {
            whyThisSlot: [
              `Booked via Predictive Criticality Timeline to prevent Day ${Math.round(prediction.daysUntilCritical)} failure`,
              `Preserves continuous line speed and eliminates emergency 30 km/h caution order`,
              `Machine: ${prediction.recommendedBlockWindow.recommendedMachinery}`,
            ],
            optimizationFactors: {
              priorityScore: 94,
              assetAvailability: 'Isolated during off-peak traffic lull',
              corridorAvailability: '92% traffic lull buffer',
              trainCompatibility: 'Zero passenger trains impacted',
              constraintCompatibility: 'Favorable thermal stress window',
              operationalImpact: 'Disruption risk minimized to 0.1%',
            },
            alternateEvaluatedCount: 4,
            disruptionAvoidanceMinutes: 70,
            constraintCheckSummary: 'Verified against IRPWM and safety handback guidelines',
          },
        });

        setBookedBlockId(blockId);
        setBookingSuccessMsg(
          `Proactive block ${blockId} booked for ${prediction.recommendedBlockWindow.optimalDate} (${prediction.recommendedBlockWindow.startTime}–${prediction.recommendedBlockWindow.endTime}). Asset protected from reaching CRITICAL state!`
        );
        railwayAudio.playBeep(880, 0.1);
        if (onScheduleBlockSuccess) {
          onScheduleBlockSuccess(blockId);
        }
      } catch (err: any) {
        console.error('Failed to book preventive block:', err);
      } finally {
        setIsBookingBlock(false);
      }
    }, 600);
  };

  if (!currentDefect || !prediction) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono">
        <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p>No defects currently registered for predictive degradation modeling.</p>
      </div>
    );
  }

  return (
    <div
      id="defect-predictive-timeline-map-container"
      className="bg-[#0b1329] border border-sky-900/80 rounded-2xl p-5 shadow-2xl font-mono text-slate-200 space-y-5"
    >
      {/* Top Header & Context Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-rose-950 to-amber-950 border border-amber-600 text-amber-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Historical Pattern Predictive Engine</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700 text-sky-300 font-mono">
              Model v5.2 • Indian Railways IRPWM
            </span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <span>Asset Criticality Horizon &amp; Predictive Maintenance Timeline</span>
          </h2>
          <p className="text-xs text-slate-400">
            Forecasting degradation trajectory using historical USFD fatigue, thermal cycling, and GMT tonnage patterns.
          </p>
        </div>

        {/* Quick Asset / Defect Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Dept:</span>
            <select
              id="select-predictive-dept-filter"
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-transparent text-xs text-sky-300 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="ENGINEERING">Engineering (P-Way)</option>
              <option value="S&T">S&T (Signals/Points)</option>
              <option value="TRACTION">Traction (OHE 25kV)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700 rounded-lg px-2.5 py-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Inspect Asset:</span>
            <select
              id="select-predictive-defect-picker"
              value={activeDefectId}
              onChange={(e) => {
                setActiveDefectId(e.target.value);
                if (onSelectDefect) onSelectDefect(e.target.value);
                setCurrentTimelineDay(0);
                setIsPlaying(false);
                railwayAudio.playBeep(700, 0.04);
              }}
              className="bg-transparent text-xs text-emerald-300 font-bold focus:outline-none max-w-[210px] cursor-pointer"
            >
              {filteredDefectOptions.map((d) => (
                <option key={d.defectId} value={d.defectId} className="bg-slate-900 text-slate-200">
                  {d.defectId} • {d.assetId} ({d.severity})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Criticality Horizon Summary Alert Banner */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          isCurrentDayCritical
            ? 'bg-gradient-to-r from-rose-950/90 via-slate-950 to-rose-950/80 border-rose-600 shadow-lg shadow-rose-950/50'
            : isCurrentDayPastCritical
            ? 'bg-gradient-to-r from-amber-950/90 via-slate-950 to-amber-950/80 border-amber-600'
            : 'bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/50 border-sky-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isCurrentDayCritical
                  ? 'bg-rose-900/80 border-rose-500 text-rose-300 animate-pulse'
                  : 'bg-amber-950 border-amber-500 text-amber-300'
              }`}
            >
              {isCurrentDayCritical ? (
                <AlertOctagon className="w-6 h-6" />
              ) : (
                <TrendingDown className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                  Target Asset: <span className="text-white">{prediction.assetId}</span> ({prediction.corridorId})
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {prediction.railwayChainageKm}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    prediction.currentSeverity === 'CRITICAL'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : prediction.currentSeverity === 'HIGH'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : 'bg-sky-950 text-sky-300 border border-sky-700'
                  }`}
                >
                  Current: {prediction.currentSeverity}
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-bold text-slate-200">
                  Predicted CRITICAL Failure Horizon:
                </span>
                <span className="text-base font-black text-rose-400 font-mono tracking-wide">
                  {prediction.predictedCriticalDate} (in {prediction.daysUntilCritical.toFixed(1)} Days)
                </span>
              </div>

              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Historical pattern <strong className="text-amber-300">{prediction.historicalPatternCluster.clusterName}</strong> indicates rapid fatigue propagation. Unaddressed wear forces an emergency 30 km/h caution order to avert derailment.
              </p>
            </div>
          </div>

          {/* Health & TGI Forecast Gauges */}
          <div className="flex items-center gap-3 shrink-0 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Health Index</span>
              <span
                className={`text-xl font-bold font-mono ${
                  currentTimelinePoint && currentTimelinePoint.healthScore <= 40
                    ? 'text-rose-400'
                    : currentTimelinePoint && currentTimelinePoint.healthScore <= 60
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {currentTimelinePoint?.healthScore}%
              </span>
              <span className="text-[9px] text-slate-500 block">
                {currentTimelineDay === 0 ? 'Current Day 0' : `At Day +${currentTimelineDay}`}
              </span>
            </div>

            <div className="w-px h-8 bg-slate-800"></div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Track TGI</span>
              <span
                className={`text-xl font-bold font-mono ${
                  currentTimelinePoint && currentTimelinePoint.tgiIndex <= 55
                    ? 'text-rose-400'
                    : 'text-sky-300'
                }`}
              >
                {currentTimelinePoint?.tgiIndex}
              </span>
              <span className="text-[9px] text-slate-500 block">
                {currentTimelinePoint && currentTimelinePoint.tgiIndex <= 55 ? 'Unsafe (<55)' : 'Safe (≥55)'}
              </span>
            </div>

            <div className="w-px h-8 bg-slate-800"></div>

            <div className="text-center">
              <span className="text-[10px] text-slate-400 uppercase block font-bold">Speed Order</span>
              <span
                className={`text-sm font-bold font-mono px-1.5 py-0.5 rounded ${
                  currentTimelinePoint?.speedRestrictionKmph
                    ? 'bg-rose-950 text-rose-300 border border-rose-700'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                }`}
              >
                {currentTimelinePoint?.speedRestrictionKmph
                  ? `${currentTimelinePoint.speedRestrictionKmph} km/h`
                  : 'Normal 130'}
              </span>
              <span className="text-[9px] text-slate-500 block">IRPWM Limit</span>
            </div>
          </div>
        </div>

        {/* Success Booking Notice */}
        {bookingSuccessMsg && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/90 border border-emerald-600 text-emerald-300 text-xs font-mono flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{bookingSuccessMsg}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 font-bold">
              ID: {bookedBlockId}
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          THE MAP: Predictive Maintenance Track Radar with Dynamic Spatial Timeline
         ========================================================================= */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider">
              <Crosshair className="w-4 h-4 text-rose-400" />
              <span>Corridor Track Spatial Map &amp; Kilometer-Post Projection</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Corridor {prediction.corridorId} ({prediction.railwayChainageKm})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenDefectLocationModal && (
              <button
                type="button"
                id="btn-open-geodetic-radar"
                onClick={() => {
                  onOpenDefectLocationModal(currentDefect);
                  railwayAudio.playBeep(880, 0.04);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                title="Open geodetic satellite map coordinates"
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                <span>Geodetic Fix</span>
              </button>
            )}

            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                isCurrentDayCritical
                  ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                  : isCurrentDayOptimalBlock
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-sky-950 text-sky-300 border-sky-700'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>
                Day +{currentTimelineDay}:{' '}
                {isCurrentDayCritical
                  ? 'CRITICAL DEFECT THRESHOLD'
                  : isCurrentDayOptimalBlock
                  ? 'OPTIMAL INTERVENTION WINDOW'
                  : 'DEGRADATION ACCUMULATING'}
              </span>
            </span>
          </div>
        </div>

        {/* SVG Railway Track Map Canvas */}
        <div className="relative h-64 w-full rounded-xl bg-[#050b17] border border-slate-800/90 overflow-hidden flex items-center justify-center select-none shadow-inner">
          {/* Spatial Grid Background */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-4 pointer-events-none opacity-30">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border border-sky-950/40"></div>
            ))}
          </div>

          {/* SVG Canvas for Track Lines, Kilometer Posts, Hazard Heat Rings & Machinery */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 240" preserveAspectRatio="none">
            {/* Ballast Stone Corridor Background */}
            <rect x="0" y="80" width="800" height="80" fill="#0c162d" opacity="0.8" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4,4" />
            <line x1="0" y1="160" x2="800" y2="160" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4,4" />

            {/* UP MAIN Track Bed */}
            <line x1="0" y1="105" x2="800" y2="105" stroke="#475569" strokeWidth="3" />
            <line x1="0" y1="113" x2="800" y2="113" stroke="#475569" strokeWidth="3" />
            {/* Concrete Sleepers (UP MAIN) */}
            {Array.from({ length: 40 }).map((_, idx) => (
              <line
                key={`sleeper-up-${idx}`}
                x1={idx * 20 + 10}
                y1="102"
                x2={idx * 20 + 10}
                y2="116"
                stroke="#64748b"
                strokeWidth="1.5"
                opacity="0.7"
              />
            ))}

            {/* DOWN MAIN Track Bed */}
            <line x1="0" y1="135" x2="800" y2="135" stroke="#334155" strokeWidth="2.5" />
            <line x1="0" y1="143" x2="800" y2="143" stroke="#334155" strokeWidth="2.5" />
            {/* Concrete Sleepers (DN MAIN) */}
            {Array.from({ length: 40 }).map((_, idx) => (
              <line
                key={`sleeper-dn-${idx}`}
                x1={idx * 20 + 10}
                y1="132"
                x2={idx * 20 + 10}
                y2="146"
                stroke="#475569"
                strokeWidth="1.2"
                opacity="0.6"
              />
            ))}

            {/* Track Labels */}
            <text x="25" y="98" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold">
              UP MAIN LINE → (KM {prediction.currentKm - 1.5} to {prediction.currentKm + 1.5})
            </text>
            <text x="25" y="155" fill="#64748b" fontSize="9" fontFamily="monospace">
              ← DOWN MAIN LINE
            </text>

            {/* Kilometer Posts along Bottom */}
            {[-1.0, 0, 1.0].map((kmOffset, idx) => {
              const kmVal = (prediction.currentKm + kmOffset).toFixed(1);
              const xPos = 400 + kmOffset * 240;
              const isTargetKm = kmOffset === 0;
              return (
                <g key={`km-post-${idx}`} transform={`translate(${xPos}, 175)`}>
                  <rect
                    x="-18"
                    y="0"
                    width="36"
                    height="24"
                    rx="3"
                    fill={isTargetKm ? '#fbbf24' : '#334155'}
                    stroke={isTargetKm ? '#d97706' : '#1e293b'}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="11"
                    textAnchor="middle"
                    fill={isTargetKm ? '#0f172a' : '#94a3b8'}
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    KM {kmVal}
                  </text>
                  <text
                    x="0"
                    y="20"
                    textAnchor="middle"
                    fill={isTargetKm ? '#78350f' : '#64748b'}
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    {isTargetKm ? 'TARGET FIX' : 'CHAINAGE'}
                  </text>
                </g>
              );
            })}

            {/* =========================================================
                DYNAMIC TIMELINE HEAT BUFFER: Risk spread along rail
               ========================================================= */}
            {isCurrentDayCritical && (
              <g>
                {/* Critical Hazard Radiation Area along track */}
                <rect
                  x="280"
                  y="92"
                  width="240"
                  height="34"
                  rx="6"
                  fill="url(#criticalHazardGradient)"
                  opacity="0.85"
                />
                {/* Caution Speed Restriction Warning Boards */}
                <g transform="translate(250, 68)">
                  <rect x="0" y="0" width="60" height="22" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="30" y="14" textAnchor="middle" fill="#fecaca" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    CAUTION 30
                  </text>
                </g>
                <g transform="translate(490, 68)">
                  <rect x="0" y="0" width="60" height="22" rx="4" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
                  <text x="30" y="14" textAnchor="middle" fill="#fecaca" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    CAUTION 30
                  </text>
                </g>
              </g>
            )}

            {/* Optimal Preventive Block Window Machinery Overlay on Map */}
            {isCurrentDayOptimalBlock && !isCurrentDayCritical && (
              <g transform="translate(340, 68)">
                <rect x="0" y="0" width="120" height="24" rx="5" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                <text x="60" y="15" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  🛠️ PROACTIVE BLOCK SLOT
                </text>
              </g>
            )}

            {/* Gradients */}
            <defs>
              <linearGradient id="criticalHazardGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Target Asset Dynamic Pin Marker with Pulse Ring */}
          <div
            className="absolute z-20 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{ left: '50%', top: '44%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Dynamic Hazard Halo */}
            <div className="relative flex items-center justify-center">
              {isCurrentDayCritical ? (
                <>
                  <span className="absolute -inset-4 rounded-full bg-rose-500/50 animate-ping"></span>
                  <span className="absolute -inset-2 rounded-full bg-rose-600/60 animate-pulse"></span>
                </>
              ) : isCurrentDayOptimalBlock ? (
                <>
                  <span className="absolute -inset-3 rounded-full bg-emerald-500/40 animate-ping"></span>
                </>
              ) : null}

              <div
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                  isCurrentDayCritical
                    ? 'bg-rose-600 border-white text-white scale-110 shadow-rose-950'
                    : isCurrentDayPastCritical
                    ? 'bg-amber-600 border-white text-white shadow-amber-950'
                    : isCurrentDayOptimalBlock
                    ? 'bg-emerald-600 border-white text-white shadow-emerald-950'
                    : 'bg-sky-600 border-white text-white shadow-sky-950'
                }`}
              >
                {isCurrentDayCritical ? (
                  <AlertTriangle className="w-5 h-5 text-white" />
                ) : isCurrentDayOptimalBlock ? (
                  <Wrench className="w-4 h-4 text-white" />
                ) : (
                  <Crosshair className="w-5 h-5 text-white" />
                )}
              </div>
            </div>

            {/* Asset ID & Status Badge */}
            <div
              className={`mt-1.5 px-3 py-1 rounded-lg border text-xs font-bold font-mono tracking-wider shadow-xl backdrop-blur-md flex items-center gap-1.5 ${
                isCurrentDayCritical
                  ? 'bg-rose-950/95 border-rose-500 text-rose-200'
                  : isCurrentDayOptimalBlock
                  ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950/95 border-sky-600 text-sky-200'
              }`}
            >
              <span>{prediction.assetId}</span>
              <span>•</span>
              <span>
                {isCurrentDayCritical
                  ? 'CRITICAL DEFECT'
                  : isCurrentDayOptimalBlock
                  ? 'PREVENTIVE BLOCK'
                  : `HEALTH ${currentTimelinePoint?.healthScore}%`}
              </span>
            </div>
          </div>

          {/* Legend Overlay on Map */}
          <div className="absolute top-2.5 left-2.5 z-10 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] space-y-1 font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-300">Healthy / Degr. (≥60%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-slate-300">High Risk (41–59%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-rose-300 font-bold">CRITICAL State (≤40%)</span>
            </div>
          </div>

          {/* Current Date & Timeline Day Indicator Badge */}
          <div className="absolute top-2.5 right-2.5 z-10 p-2 rounded-lg bg-slate-950/90 border border-slate-800 text-right font-mono">
            <span className="text-[10px] text-slate-400 block uppercase">Projected Date</span>
            <span className="text-xs font-bold text-sky-300">
              {currentTimelinePoint?.date || 'Today'}
            </span>
            <span className="text-[10px] text-slate-400 block font-mono">
              Day +{currentTimelineDay} of 30
            </span>
          </div>
        </div>

        {/* =========================================================================
            INTERACTIVE PREDICTIVE TIMELINE CONTROLLER & MILESTONE NODES
           ========================================================================= */}
        <div className="bg-[#091124] p-4 rounded-xl border border-slate-800/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Predictive Maintenance Degradation Timeline
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-predictive-play-pause"
                onClick={() => {
                  if (currentTimelineDay >= 30) {
                    setCurrentTimelineDay(0);
                  }
                  setIsPlaying(!isPlaying);
                  railwayAudio.playBeep(isPlaying ? 500 : 800, 0.04);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                  isPlaying
                    ? 'bg-amber-950 text-amber-300 border-amber-500 shadow-md'
                    : 'bg-sky-950 hover:bg-sky-900 text-sky-200 border-sky-600'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pause Simulation</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Play Degradation Curve</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-predictive-reset"
                onClick={() => {
                  setIsPlaying(false);
                  setCurrentTimelineDay(0);
                  railwayAudio.playBeep(440, 0.04);
                }}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
                title="Reset to Day 0 (Current State)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                id="btn-predictive-speed"
                onClick={() => {
                  const nextSpeed = playbackSpeed === 1 ? 2 : 1;
                  setPlaybackSpeed(nextSpeed);
                  railwayAudio.playBeep(600, 0.03);
                }}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono border border-slate-700 cursor-pointer"
                title="Toggle playback speed"
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>

          {/* The Interactive Timeline Range Slider */}
          <div className="relative pt-2 pb-1">
            <input
              type="range"
              id="slider-predictive-timeline"
              min="0"
              max="30"
              step="1"
              value={currentTimelineDay}
              onChange={(e) => {
                setCurrentTimelineDay(parseInt(e.target.value, 10));
                setIsPlaying(false);
              }}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
            />

            {/* Critical Day Marker Flag on Slider Track */}
            <div
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{
                left: `${(prediction.daysUntilCritical / 30) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black tracking-tight flex items-center gap-0.5 shadow-md">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>CRITICAL (Day {Math.round(prediction.daysUntilCritical)})</span>
              </div>
              <div className="w-0.5 h-3 bg-rose-500"></div>
            </div>

            {/* Optimal Preventive Block Window Marker on Slider Track */}
            <div
              className="absolute top-0 flex flex-col items-center pointer-events-none"
              style={{
                left: `${(prediction.recommendedBlockWindow.startDay / 30) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              <div className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black tracking-tight flex items-center gap-0.5 shadow-md">
                <Wrench className="w-2.5 h-2.5" />
                <span>BLOCK (Day {prediction.recommendedBlockWindow.startDay})</span>
              </div>
              <div className="w-0.5 h-3 bg-emerald-500"></div>
            </div>
          </div>

          {/* Timeline Milestone Navigation Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 text-[11px]">
            {prediction.timelineMilestones.map((m, idx) => {
              const isSelected = currentTimelineDay === m.day;
              return (
                <button
                  key={`milestone-${idx}`}
                  type="button"
                  onClick={() => {
                    setCurrentTimelineDay(m.day);
                    setIsPlaying(false);
                    railwayAudio.playBeep(m.isPredictedCriticalMilestone ? 880 : 600, 0.04);
                  }}
                  className={`p-2 rounded-lg text-left transition-all border cursor-pointer ${
                    isSelected
                      ? m.isPredictedCriticalMilestone
                        ? 'bg-rose-950 border-rose-500 text-white ring-2 ring-rose-500 shadow-md'
                        : 'bg-sky-950 border-sky-400 text-white ring-2 ring-sky-500 shadow-md'
                      : m.isPredictedCriticalMilestone
                      ? 'bg-rose-950/40 hover:bg-rose-950/70 border-rose-700/60 text-rose-300'
                      : m.isOptimalBlockMilestone
                      ? 'bg-emerald-950/40 hover:bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                      : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] mb-1 font-mono">
                    <span className="font-bold">
                      Day +{m.day} ({m.date})
                    </span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                        m.stage === 'CRITICAL'
                          ? 'bg-rose-900 text-rose-200'
                          : m.stage === 'HIGH_RISK'
                          ? 'bg-amber-900 text-amber-200'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {m.stage}
                    </span>
                  </div>
                  <strong className="text-xs block truncate" title={m.title}>
                    {m.title}
                  </strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Health: <strong className="text-slate-200">{m.healthScore}%</strong> • TGI: {m.tgiIndex}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          HISTORICAL PATTERN ROOT CAUSE & PROACTIVE BLOCK RECOMMENDATION CARD
         ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Historical Pattern Analysis Card */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4" />
              <span>Historical Pattern Corroboration</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
              Cluster: {prediction.historicalPatternCluster.clusterId}
            </span>
          </div>

          <div>
            <h4 className="text-sm font-bold text-white mb-1">
              {prediction.historicalPatternCluster.clusterName}
            </h4>
            <p className="text-xs text-slate-400">
              {prediction.historicalPatternCluster.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Avg Recurrence Cadence</span>
              <strong className="text-amber-300 font-mono">
                Every {prediction.historicalPatternCluster.avgRecurrenceDays} Days
              </strong>
            </div>

            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Corridor Tonnage Factor</span>
              <strong className="text-sky-300 font-mono">
                {prediction.historicalPatternCluster.gmtLoadFactor}
              </strong>
            </div>

            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Thermal Stress Zone</span>
              <strong className="text-slate-200 font-mono">
                {prediction.historicalPatternCluster.thermalRiskProfile}
              </strong>
            </div>

            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Model AI Confidence</span>
              <strong className="text-emerald-400 font-mono">
                {prediction.confidenceScore}% Certified
              </strong>
            </div>
          </div>
        </div>

        {/* Recommended Proactive Preventive Block Window */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border border-emerald-800/70 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-emerald-900/60">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Wrench className="w-4 h-4" />
                <span>Recommended Preventive Intervention</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold">
                Optimal Window: Day +{prediction.recommendedBlockWindow.startDay}
              </span>
            </div>

            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Recommended Date &amp; Slot:</span>
                <strong className="text-white font-mono">
                  {prediction.recommendedBlockWindow.optimalDate} ({prediction.recommendedBlockWindow.startTime}–{prediction.recommendedBlockWindow.endTime})
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Window Classification:</span>
                <strong className="text-sky-300 font-mono">
                  {prediction.recommendedBlockWindow.windowType}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Allocated Fleet Machine:</span>
                <span className="text-emerald-300 font-mono truncate max-w-[220px]" title={prediction.recommendedBlockWindow.recommendedMachinery}>
                  {prediction.recommendedBlockWindow.recommendedMachinery}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Designated Gang:</span>
                <span className="text-slate-200 font-mono truncate max-w-[220px]">
                  {prediction.recommendedBlockWindow.recommendedGang}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 pt-1 italic">
                "{prediction.recommendedBlockWindow.rationale}"
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-book-proactive-preventive-block"
            disabled={isBookingBlock || !!bookedBlockId}
            onClick={handleSchedulePreventiveBlock}
            className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              bookedBlockId
                ? 'bg-emerald-800 text-emerald-100 cursor-default'
                : 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-950/60'
            }`}
          >
            {isBookingBlock ? (
              <span>Committing Preventive Block to RailSync...</span>
            ) : bookedBlockId ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                <span>Preventive Block Scheduled ({bookedBlockId})</span>
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                <span>Schedule Proactive Block on Day +{prediction.recommendedBlockWindow.startDay}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
