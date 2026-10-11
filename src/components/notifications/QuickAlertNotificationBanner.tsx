import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  X,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Activity,
  Zap,
  HardHat,
  Train,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Bell,
  Clock,
} from 'lucide-react';
import { Conflict, Defect, Corridor } from '../../types';
import { railwayAudio } from '../../services/railwayAudio';

export interface UnifiedQuickAlertIncident {
  id: string;
  sourceType: 'CONFLICT' | 'DEFECT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  priorityScore: number;
  title: string;
  corridorId: string;
  corridorName: string;
  section?: string;
  description: string;
  hazardSummary: string;
  badgeText: string;
  impactMetric?: string;
  targetScreen: 'conflicts' | 'defects';
  targetParam: any;
  timestamp?: string;
}

interface QuickAlertNotificationBannerProps {
  conflicts: Conflict[];
  defects: Defect[];
  corridors?: Corridor[];
  onNavigate: (screen: string, itemData?: any) => void;
  onRefreshData?: () => void;
}

export const QuickAlertNotificationBanner: React.FC<QuickAlertNotificationBannerProps> = ({
  conflicts,
  defects,
  corridors = [],
  onNavigate,
  onRefreshData,
}) => {
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(() => railwayAudio.getIsMuted());
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Map corridors for human-readable labels
  const corridorMap = useMemo(() => {
    const map = new Map<string, string>();
    corridors.forEach((c) => {
      map.set(c.id, `${c.code || c.id} ${c.name}`);
    });
    return map;
  }, [corridors]);

  // Dynamically evaluate and prioritize incidents from both conflicts and defects
  const activeIncidents = useMemo<UnifiedQuickAlertIncident[]>(() => {
    const list: UnifiedQuickAlertIncident[] = [];

    // 1. Process Conflicts (where status is OPEN or PENDING_REVIEW)
    conflicts.forEach((c) => {
      if (c.status === 'OPEN' || c.status === 'PENDING_REVIEW') {
        const isCritical = c.severity === 'CRITICAL';
        const isHigh = c.severity === 'HIGH';

        // Base priority weight
        let score = isCritical ? 100 : isHigh ? 75 : 40;

        // Extra weight for passenger train overlaps and dependency clashes
        if (c.conflictType === 'TRAIN_OVERLAP') score += 15;
        if (c.conflictType === 'DEPENDENCY_CONFLICT') score += 12;
        const trainNameLower = (c.trainName || '').toLowerCase();
        if (
          trainNameLower.includes('rajdhani') ||
          trainNameLower.includes('vande bharat') ||
          trainNameLower.includes('shatabdi')
        ) {
          score += 10;
        }

        const corrName = corridorMap.get(c.corridorId) || c.corridorId;
        const timeWindow = c.trainInterval ? `Clash: ${c.trainInterval}` : c.maintenanceInterval;

        list.push({
          id: c.conflictId,
          sourceType: 'CONFLICT',
          severity: c.severity,
          priorityScore: score,
          title: isCritical
            ? `Safety Interlock Collision: Train #${c.trainNumber} (${c.trainName})`
            : `Schedule Contention on Block ${c.blockId}`,
          corridorId: c.corridorId,
          corridorName: corrName,
          section: c.dependencyDetails?.section || `Interval: ${c.maintenanceInterval}`,
          description: c.description || `Spatial-temporal overlap between maintenance block ${c.blockId} and ${c.trainName}`,
          hazardSummary:
            c.conflictType === 'DEPENDENCY_CONFLICT'
              ? 'TRD Electrical vs Track Tamper Joint Interlock Violation'
              : `Direct train path overlap with ${c.trainNumber}`,
          badgeText: isCritical ? 'CRITICAL SAFETY CONFLICT' : 'HIGH PRIORITY CONFLICT',
          impactMetric: timeWindow,
          targetScreen: 'conflicts',
          targetParam: { blockId: c.blockId, conflictId: c.conflictId },
          timestamp: 'Live Safety Gate',
        });
      }
    });

    // 2. Process Defects (where status is not RECTIFIED)
    defects.forEach((d) => {
      if (d.status !== 'RECTIFIED') {
        const isCritical = d.severity === 'CRITICAL';
        const isHigh = d.severity === 'HIGH';

        if (isCritical || isHigh) {
          let score = isCritical ? 95 : 70;
          if (d.speedRestrictionKmph && d.speedRestrictionKmph <= 30) score += 18;
          if (d.status === 'PENDING_PRIORITY_ANALYSIS') score += 8;

          const descLower = (d.description || '').toLowerCase();
          if (descLower.includes('fracture') || descLower.includes('weld') || descLower.includes('ohe')) {
            score += 10;
          }

          const corrName = corridorMap.get(d.corridorId) || d.corridorId;
          const chainage = d.geoCoordinates?.railwayChainageKm
            ? `KM ${d.geoCoordinates.railwayChainageKm}`
            : undefined;

          list.push({
            id: d.defectId,
            sourceType: 'DEFECT',
            severity: d.severity,
            priorityScore: score,
            title: isCritical
              ? `Critical Track Defect: ${d.defectType} on ${d.assetId}`
              : `High Priority Track Anomaly on ${d.assetId}`,
            corridorId: d.corridorId,
            corridorName: corrName,
            section: chainage || `Corridor ${d.corridorId}`,
            description: d.description || `Structural track defect detected on ${d.assetId}`,
            hazardSummary: d.speedRestrictionKmph
              ? `Emergency ${d.speedRestrictionKmph} km/h speed restriction imposed`
              : 'Structural track integrity risk',
            badgeText: isCritical ? 'CRITICAL TRACK DEFECT' : 'HIGH PRIORITY DEFECT',
            impactMetric: d.speedRestrictionKmph ? `${d.speedRestrictionKmph} km/h Caution` : 'Urgent Repair',
            targetScreen: 'defects',
            targetParam: { defectId: d.defectId },
            timestamp: d.detectedDate || 'Recent Inspection',
          });
        }
      }
    });

    // Sort descending by priorityScore so the most critical pending incident is first!
    list.sort((a, b) => b.priorityScore - a.priorityScore);
    return list;
  }, [conflicts, defects, corridorMap]);

  // Reset index if out of range
  useEffect(() => {
    if (currentIndex >= activeIncidents.length) {
      setCurrentIndex(0);
    }
  }, [activeIncidents.length, currentIndex]);

  // Auto-cycle through incidents every 12 seconds when there are multiple and not hovered
  useEffect(() => {
    if (activeIncidents.length <= 1 || isHovered || isDismissed || isMinimized) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeIncidents.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [activeIncidents.length, isHovered, isDismissed, isMinimized]);

  // If there are no pending critical incidents, or if dismissed, hide the banner
  if (activeIncidents.length === 0 || isDismissed) {
    return null;
  }

  const currentIncident = activeIncidents[currentIndex] || activeIncidents[0];
  const isCritical = currentIncident.severity === 'CRITICAL';
  const totalCriticalCount = activeIncidents.filter((i) => i.severity === 'CRITICAL').length;

  const handleNext = () => {
    railwayAudio.playBeep(700, 0.03);
    setCurrentIndex((prev) => (prev + 1) % activeIncidents.length);
  };

  const handlePrev = () => {
    railwayAudio.playBeep(650, 0.03);
    setCurrentIndex((prev) => (prev - 1 + activeIncidents.length) % activeIncidents.length);
  };

  const handleActionClick = () => {
    railwayAudio.playBeep(880, 0.05);
    onNavigate(currentIncident.targetScreen, currentIncident.targetParam);
  };

  const handleToggleMute = () => {
    const next = railwayAudio.toggleMute();
    setIsMuted(next);
  };

  const handlePlayAlertTone = () => {
    railwayAudio.playBurstingHooter();
  };

  // Minimized Compact State: Small Floating Emergency Pill
  if (isMinimized) {
    return (
      <div
        id="quick-alert-minimized-pill"
        data-testid="quick-alert-minimized-pill"
        className="fixed top-2 right-4 z-50 flex items-center gap-2 bg-gradient-to-r from-rose-950 to-red-900 border-2 border-rose-500/90 text-white px-3 py-1.5 rounded-full shadow-2xl shadow-rose-950/80 animate-in fade-in slide-in-from-top-2 cursor-pointer transition-all hover:scale-105"
        onClick={() => setIsMinimized(false)}
        title="Click to expand high-priority Quick-Alert banner"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
        <AlertTriangle className="w-4 h-4 text-rose-300" />
        <span className="text-xs font-mono font-bold tracking-wide">
          QUICK-ALERT: {activeIncidents.length} Critical Incident{activeIncidents.length > 1 ? 's' : ''} Pending
        </span>
        <Maximize2 className="w-3.5 h-3.5 text-rose-300 ml-1" />
      </div>
    );
  }

  return (
    <div
      id="quick-alert-notification-banner"
      data-testid="quick-alert-notification-banner"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="alert"
      aria-live="assertive"
      className={`relative z-40 w-full border-b transition-all duration-200 select-none ${
        isCritical
          ? 'bg-gradient-to-r from-[#20050b] via-[#2d0711] to-[#1e050f] border-rose-600/90 shadow-2xl shadow-rose-950/60'
          : 'bg-gradient-to-r from-[#1c0d02] via-[#271203] to-[#1c0d02] border-amber-600/90 shadow-2xl shadow-amber-950/60'
      }`}
    >
      {/* Top micro strobe line */}
      <div
        className={`h-0.5 w-full bg-gradient-to-r ${
          isCritical
            ? 'from-rose-500 via-red-400 to-rose-600 animate-pulse'
            : 'from-amber-500 via-orange-400 to-amber-600'
        }`}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-5 py-2.5 sm:py-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left section: Siren Beacon + Badges + Title */}
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
            {/* Pulsing Beacon Icon */}
            <div
              className={`p-1.5 rounded-lg shrink-0 border mt-0.5 sm:mt-0 ${
                isCritical
                  ? 'bg-rose-900/90 border-rose-500 text-rose-200 shadow-md shadow-rose-950/80 animate-pulse'
                  : 'bg-amber-900/90 border-amber-500 text-amber-200 shadow-md shadow-amber-950/80'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-white" />
            </div>

            {/* Content Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
                {/* Header Flag */}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border flex items-center gap-1.5 shadow-xs ${
                    isCritical
                      ? 'bg-rose-950 text-rose-200 border-rose-600'
                      : 'bg-amber-950 text-amber-200 border-amber-600'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span>QUICK-ALERT</span>
                </span>

                {/* Specific Incident Badge */}
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                    currentIncident.sourceType === 'CONFLICT'
                      ? 'bg-purple-950/90 text-purple-200 border-purple-700'
                      : 'bg-orange-950/90 text-orange-200 border-orange-700'
                  }`}
                >
                  {currentIncident.sourceType === 'CONFLICT' ? (
                    <span className="flex items-center gap-1">
                      <Train className="w-2.5 h-2.5" />
                      <span>{currentIncident.badgeText}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <HardHat className="w-2.5 h-2.5" />
                      <span>{currentIncident.badgeText}</span>
                    </span>
                  )}
                </span>

                {/* Corridor Pill */}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-slate-300 border border-slate-700/80 hidden sm:inline-block">
                  {currentIncident.corridorName}
                </span>

                {/* Impact Metric Pill */}
                {currentIncident.impactMetric && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/90 text-rose-300 border border-rose-800 font-bold hidden md:inline-block">
                    {currentIncident.impactMetric}
                  </span>
                )}
              </div>

              {/* Title & Description Line */}
              <div className="flex items-baseline gap-2 mt-0.5 truncate">
                <span className="text-xs font-bold text-white font-mono truncate">
                  {currentIncident.title}
                </span>
                <span className="text-[11px] text-slate-300 truncate hidden lg:inline">
                  — {currentIncident.description}
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Pager + Actions + Controls */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 border-t md:border-t-0 pt-1.5 md:pt-0 border-rose-900/40">
            {/* Multi-Incident Pager Controls */}
            {activeIncidents.length > 1 && (
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-slate-800 text-[10px] font-mono text-slate-300">
                <button
                  type="button"
                  id="btn-quick-alert-prev"
                  data-testid="btn-quick-alert-prev"
                  onClick={handlePrev}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Previous incident"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="px-1 font-bold text-rose-300">
                  {currentIndex + 1} / {activeIncidents.length}
                </span>
                <button
                  type="button"
                  id="btn-quick-alert-next"
                  data-testid="btn-quick-alert-next"
                  onClick={handleNext}
                  className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                  title="Next incident"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Test Hooter Tone Button */}
            <button
              type="button"
              id="btn-quick-alert-hooter"
              data-testid="btn-quick-alert-hooter"
              onClick={handlePlayAlertTone}
              className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-slate-800 text-slate-300 hover:text-amber-300 cursor-pointer transition-colors hidden sm:block"
              title="Play railway caution siren alert tone"
            >
              <Bell className="w-3.5 h-3.5" />
            </button>

            {/* Audio Mute Toggle Button */}
            <button
              type="button"
              id="btn-quick-alert-audio-toggle"
              data-testid="btn-quick-alert-audio-toggle"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-slate-800 cursor-pointer transition-colors ${
                isMuted ? 'text-slate-500' : 'text-slate-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute alert audio' : 'Mute alert audio'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Primary Action Button: Jump directly to the incident */}
            <button
              type="button"
              id="btn-quick-alert-action"
              data-testid="btn-quick-alert-action"
              onClick={handleActionClick}
              className={`px-3 py-1.5 rounded-lg font-mono text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-[1.02] ${
                isCritical
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 shadow-rose-950/80 border border-rose-400/80'
                  : 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-600 shadow-amber-950/80 border border-amber-400/80'
              }`}
              title={`Jump to ${currentIncident.targetScreen} screen to inspect and resolve ${currentIncident.id}`}
            >
              <span>{currentIncident.sourceType === 'CONFLICT' ? 'Resolve Conflict' : 'Inspect Defect'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Minimize to compact pill */}
            <button
              type="button"
              id="btn-quick-alert-minimize"
              data-testid="btn-quick-alert-minimize"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg hover:bg-black/40 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Minimize to compact alert indicator"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close / Dismiss */}
            <button
              type="button"
              id="btn-quick-alert-dismiss"
              data-testid="btn-quick-alert-dismiss"
              onClick={() => setIsDismissed(true)}
              className="p-1.5 rounded-lg hover:bg-black/40 text-slate-400 hover:text-white cursor-pointer transition-colors"
              title="Dismiss Quick-Alert banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
