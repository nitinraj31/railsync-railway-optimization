import { Conflict, BlockRequest, Corridor, OptimizedBlock } from '../types';

export type TimelineHeatmapMode = 'COMBINED' | 'CONFLICTS' | 'MAINTENANCE_BACKLOG';

export type CorridorRiskTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface HourlyHeatmapCell {
  hour: number; // 8 to 20
  hourLabel: string; // e.g. "08:00"
  timeRange: string; // e.g. "08:00–09:00"
  conflictCount: number;
  criticalConflictCount: number;
  pendingRequestCount: number;
  criticalPendingCount: number;
  scheduledBlocksCount: number;
  strainScore: number; // 0 - 100
  tier: CorridorRiskTier;
  colorClass: string;
  bgGradient: string;
  borderClass: string;
  textClass: string;
  glowClass: string;
  summaryTooltip: string;
  conflictingItems: {
    conflictId: string;
    blockId: string;
    trainNumber: string;
    severity: string;
    description: string;
    interval: string;
  }[];
  pendingItems: {
    requestId: string;
    department: string;
    priority: string;
    taskType: string;
    preferredTime: string;
    duration: number;
  }[];
}

export interface CorridorHeatmapMetrics {
  corridorId: string;
  corridorName: string;
  totalConflicts: number;
  openConflicts: number;
  criticalConflicts: number;
  highConflicts: number;
  resolvedConflicts: number;
  totalPendingRequests: number;
  criticalPendingRequests: number;
  highPendingRequests: number;
  totalPendingDurationMinutes: number;
  compositeRiskScore: number; // 0 - 100
  conflictScore: number; // 0 - 100
  maintenanceScore: number; // 0 - 100
  riskTier: CorridorRiskTier;
  tierLabel: string;
  tierBadgeColor: string;
  cardBorderGlow: string;
  cardBackgroundTint: string;
  peakHour: string;
  peakHourStrain: number;
  hourlyCells: HourlyHeatmapCell[];
  primaryDrivers: string[];
  recommendedActions: string[];
  conflictsList: Conflict[];
  pendingRequestsList: BlockRequest[];
}

export interface TimelineHeatmapSummary {
  totalCorridors: number;
  criticalCorridorsCount: number;
  highCorridorsCount: number;
  moderateCorridorsCount: number;
  lowCorridorsCount: number;
  totalOpenConflicts: number;
  totalCriticalConflicts: number;
  totalPendingRequests: number;
  totalCriticalPendingRequests: number;
  highestRiskCorridorId: string;
  highestRiskCorridorName: string;
  highestRiskScore: number;
  peakCongestionWindow: string;
  metricsByCorridor: Record<string, CorridorHeatmapMetrics>;
}

// Convert "HH:MM" string to minutes from midnight
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  // Handle intervals formatted like "14:00–15:30" or "14:00 (TRD)"
  const clean = timeStr.replace(/[^0-9:]/g, ' ').trim().split(/\s+/)[0];
  const parts = clean.split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

// Extract start and end minutes from interval string like "14:00–15:30"
function parseIntervalToMinutes(intervalStr?: string): { start: number; end: number } | null {
  if (!intervalStr) return null;
  const parts = intervalStr.split(/[–\-—]/);
  if (parts.length >= 2) {
    const s = parseTimeToMinutes(parts[0]);
    const e = parseTimeToMinutes(parts[1]);
    if (s !== null && e !== null) {
      return { start: s, end: Math.max(s + 30, e) };
    }
  }
  const single = parseTimeToMinutes(intervalStr);
  if (single !== null) {
    return { start: single, end: single + 60 };
  }
  return null;
}

// Check if a time interval overlaps with an hour window [h*60, (h+1)*60]
function intervalOverlapsHour(startMins: number, endMins: number, hour: number): boolean {
  const hourStart = hour * 60;
  const hourEnd = (hour + 1) * 60;
  return startMins < hourEnd && endMins > hourStart;
}

// Calculate Risk Tier from a 0 - 100 score
export function getRiskTierFromScore(score: number): CorridorRiskTier {
  if (score >= 70) return 'CRITICAL';
  if (score >= 45) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

// Color and styling helpers for heatmap tiers
export function getTierVisuals(tier: CorridorRiskTier, intensity: 'SUBTLE' | 'STANDARD' | 'VIVID' = 'STANDARD') {
  switch (tier) {
    case 'CRITICAL':
      return {
        label: 'Critical Hotspot',
        badgeBg: 'bg-rose-950/90 text-rose-200 border-rose-600',
        badgeIconColor: 'text-rose-400',
        cardBorder: intensity === 'VIVID' ? 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.35)]' : 'border-rose-800/80 shadow-md shadow-rose-950/40',
        cardBg: intensity === 'VIVID' ? 'bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-rose-950/30' : 'bg-slate-900/80',
        cellBg: intensity === 'VIVID' ? 'bg-rose-600/90 hover:bg-rose-500' : intensity === 'STANDARD' ? 'bg-rose-700/80 hover:bg-rose-600' : 'bg-rose-900/60 hover:bg-rose-800',
        cellGradient: 'from-rose-600 to-red-700',
        cellBorder: 'border-rose-400/90',
        cellText: 'text-rose-100 font-bold',
        glow: 'shadow-[0_0_12px_rgba(244,63,94,0.6)] ring-1 ring-rose-400',
      };
    case 'HIGH':
      return {
        label: 'High Strain',
        badgeBg: 'bg-amber-950/90 text-amber-200 border-amber-600',
        badgeIconColor: 'text-amber-400',
        cardBorder: intensity === 'VIVID' ? 'border-amber-500 shadow-[0_0_18px_rgba(245,158,11,0.25)]' : 'border-amber-800/80 shadow-sm shadow-amber-950/30',
        cardBg: intensity === 'VIVID' ? 'bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-amber-950/20' : 'bg-slate-900/70',
        cellBg: intensity === 'VIVID' ? 'bg-amber-600/90 hover:bg-amber-500' : intensity === 'STANDARD' ? 'bg-amber-700/80 hover:bg-amber-600' : 'bg-amber-900/60 hover:bg-amber-800',
        cellGradient: 'from-amber-600 to-orange-700',
        cellBorder: 'border-amber-400/80',
        cellText: 'text-amber-100 font-bold',
        glow: 'shadow-[0_0_10px_rgba(245,158,11,0.45)] ring-1 ring-amber-400',
      };
    case 'MODERATE':
      return {
        label: 'Moderate Pressure',
        badgeBg: 'bg-yellow-950/80 text-yellow-200 border-yellow-700',
        badgeIconColor: 'text-yellow-400',
        cardBorder: 'border-yellow-900/70',
        cardBg: 'bg-slate-900/60',
        cellBg: intensity === 'VIVID' ? 'bg-yellow-600/80 hover:bg-yellow-500' : intensity === 'STANDARD' ? 'bg-yellow-700/70 hover:bg-yellow-600' : 'bg-yellow-900/50 hover:bg-yellow-800',
        cellGradient: 'from-yellow-600 to-amber-700',
        cellBorder: 'border-yellow-500/60',
        cellText: 'text-yellow-100 font-semibold',
        glow: 'shadow-[0_0_8px_rgba(234,179,8,0.3)]',
      };
    case 'LOW':
    default:
      return {
        label: 'Nominal Windows',
        badgeBg: 'bg-emerald-950/80 text-emerald-200 border-emerald-700',
        badgeIconColor: 'text-emerald-400',
        cardBorder: 'border-slate-800',
        cardBg: 'bg-slate-900/50',
        cellBg: intensity === 'VIVID' ? 'bg-emerald-800/60 hover:bg-emerald-700' : intensity === 'STANDARD' ? 'bg-emerald-950/70 hover:bg-emerald-900' : 'bg-slate-950/70 hover:bg-slate-900',
        cellGradient: 'from-emerald-900 to-teal-900',
        cellBorder: 'border-emerald-700/40',
        cellText: 'text-emerald-300 font-medium',
        glow: '',
      };
  }
}

/**
 * Main calculation engine for corridor timeline heatmap metrics
 */
export function calculateCorridorTimelineHeatmapMetrics(
  corridors: Corridor[],
  conflicts: Conflict[],
  blockRequests: BlockRequest[],
  scheduledBlocks: OptimizedBlock[],
  mode: TimelineHeatmapMode = 'COMBINED',
  intensity: 'SUBTLE' | 'STANDARD' | 'VIVID' = 'STANDARD'
): TimelineHeatmapSummary {
  const metricsByCorridor: Record<string, CorridorHeatmapMetrics> = {};

  let totalOpenConflicts = 0;
  let totalCriticalConflicts = 0;
  let totalPendingRequests = 0;
  let totalCriticalPendingRequests = 0;

  // Track max risk corridor
  let highestRiskCorridorId = corridors[0]?.id || '';
  let highestRiskCorridorName = corridors[0]?.name || '';
  let highestRiskScore = -1;

  // Track hourly conflict and pending load across entire network for peak congestion window
  const hourlyNetworkLoad: Record<number, number> = {};
  for (let h = 8; h <= 20; h++) {
    hourlyNetworkLoad[h] = 0;
  }

  corridors.forEach((corridor) => {
    // 1. Conflicts on this corridor
    const corridorConflicts = conflicts.filter((c) => c.corridorId === corridor.id);
    const openConflicts = corridorConflicts.filter((c) => c.status === 'OPEN' || c.status === 'PENDING_REVIEW');
    const criticalConflicts = openConflicts.filter((c) => c.severity === 'CRITICAL');
    const highConflicts = openConflicts.filter((c) => c.severity === 'HIGH');
    const resolvedConflicts = corridorConflicts.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED');

    totalOpenConflicts += openConflicts.length;
    totalCriticalConflicts += criticalConflicts.length;

    // 2. Pending Unresolved Maintenance Requests
    const corridorRequests = blockRequests.filter(
      (r) =>
        r.corridorId === corridor.id &&
        (r.status === 'PENDING' || r.status === 'UNDER_REVIEW' || r.status === 'CONFLICT')
    );
    const criticalPending = corridorRequests.filter((r) => r.priority === 'CRITICAL');
    const highPending = corridorRequests.filter((r) => r.priority === 'HIGH');
    const pendingDurationSum = corridorRequests.reduce((sum, r) => sum + (r.requiredDurationMinutes || 90), 0);

    totalPendingRequests += corridorRequests.length;
    totalCriticalPendingRequests += criticalPending.length;

    // 3. Scheduled Blocks for context
    const corridorBlocks = scheduledBlocks.filter((b) => b.corridorId === corridor.id);

    // 4. Calculate Conflict Score (0 to 100)
    // Critical = 32 pts each, High = 18 pts each, Others = 8 pts each
    const rawConflictScore =
      criticalConflicts.length * 32 +
      highConflicts.length * 18 +
      (openConflicts.length - criticalConflicts.length - highConflicts.length) * 8;
    const conflictScore = Math.min(100, Math.round(rawConflictScore));

    // 5. Calculate Pending Maintenance Score (0 to 100)
    // Critical = 25 pts each, High = 12 pts each, Regular = 5 pts each
    const rawMaintenanceScore =
      criticalPending.length * 25 +
      highPending.length * 12 +
      (corridorRequests.length - criticalPending.length - highPending.length) * 5;
    const maintenanceScore = Math.min(100, Math.round(rawMaintenanceScore));

    // 6. Composite Risk Score based on Mode
    let compositeRiskScore = 0;
    if (mode === 'CONFLICTS') {
      compositeRiskScore = conflictScore;
    } else if (mode === 'MAINTENANCE_BACKLOG') {
      compositeRiskScore = maintenanceScore;
    } else {
      // COMBINED: 60% conflict risk + 40% maintenance backlog pressure
      compositeRiskScore = Math.min(
        100,
        Math.round(conflictScore * 0.6 + maintenanceScore * 0.4)
      );
      // Boost if both conflicts and critical maintenance coexist
      if (criticalConflicts.length > 0 && criticalPending.length > 0) {
        compositeRiskScore = Math.min(100, compositeRiskScore + 10);
      }
    }

    const riskTier = getRiskTierFromScore(compositeRiskScore);
    const visuals = getTierVisuals(riskTier, intensity);

    // 7. Calculate Hourly Heatmap Distribution (08:00 to 20:00)
    const hourlyCells: HourlyHeatmapCell[] = [];
    let maxHourlyStrain = -1;
    let peakHourStr = '14:00';

    for (let hour = 8; hour <= 20; hour++) {
      const hourLabel = `${String(hour).padStart(2, '0')}:00`;
      const nextHourLabel = `${String(Math.min(24, hour + 1)).padStart(2, '0')}:00`;
      const timeRange = `${hourLabel}–${nextHourLabel}`;

      // Conflicts intersecting this hour
      const matchingConflicts: HourlyHeatmapCell['conflictingItems'] = [];
      let hrCritConflict = 0;

      openConflicts.forEach((conf) => {
        let matched = false;
        // Check maintenanceInterval
        const mInter = parseIntervalToMinutes(conf.maintenanceInterval);
        if (mInter && intervalOverlapsHour(mInter.start, mInter.end, hour)) {
          matched = true;
        }
        // Check trainInterval
        const tInter = parseIntervalToMinutes(conf.trainInterval);
        if (tInter && intervalOverlapsHour(tInter.start, tInter.end, hour)) {
          matched = true;
        }

        if (matched) {
          if (conf.severity === 'CRITICAL') hrCritConflict++;
          matchingConflicts.push({
            conflictId: conf.conflictId,
            blockId: conf.blockId,
            trainNumber: conf.trainNumber,
            severity: conf.severity,
            description: conf.description,
            interval: conf.maintenanceInterval || conf.trainInterval || timeRange,
          });
        }
      });

      // Pending requests intersecting this hour
      const matchingPending: HourlyHeatmapCell['pendingItems'] = [];
      let hrCritPending = 0;

      corridorRequests.forEach((req) => {
        let matched = false;
        const sMins = parseTimeToMinutes(req.preferredStartTime);
        const eMins = parseTimeToMinutes(req.preferredEndTime);
        if (sMins !== null && eMins !== null) {
          if (intervalOverlapsHour(sMins, eMins, hour)) {
            matched = true;
          }
        } else {
          // If no specific time specified, distribute based on priority or midday peak
          if (hour >= 11 && hour <= 16 && req.priority === 'CRITICAL') {
            matched = true;
          }
        }

        if (matched) {
          if (req.priority === 'CRITICAL') hrCritPending++;
          matchingPending.push({
            requestId: req.requestId,
            department: req.department,
            priority: req.priority,
            taskType: req.taskType,
            preferredTime: `${req.preferredStartTime || 'TBD'}–${req.preferredEndTime || 'TBD'}`,
            duration: req.requiredDurationMinutes,
          });
        }
      });

      // Scheduled blocks in this hour
      const hrBlocks = corridorBlocks.filter((b) => {
        const s = parseTimeToMinutes(b.startTime);
        const e = parseTimeToMinutes(b.endTime);
        return s !== null && e !== null && intervalOverlapsHour(s, e, hour);
      }).length;

      // Hourly strain calculation based on mode
      let hrStrain = 0;
      if (mode === 'CONFLICTS') {
        hrStrain = Math.min(100, matchingConflicts.length * 40 + hrCritConflict * 25);
      } else if (mode === 'MAINTENANCE_BACKLOG') {
        hrStrain = Math.min(100, matchingPending.length * 25 + hrCritPending * 30 + hrBlocks * 10);
      } else {
        hrStrain = Math.min(
          100,
          matchingConflicts.length * 35 +
            hrCritConflict * 20 +
            matchingPending.length * 20 +
            hrCritPending * 20 +
            (hrBlocks > 0 && matchingConflicts.length > 0 ? 15 : 0)
        );
      }

      const hrTier = getRiskTierFromScore(hrStrain);
      const hrVisuals = getTierVisuals(hrTier, intensity);

      if (hrStrain > maxHourlyStrain) {
        maxHourlyStrain = hrStrain;
        peakHourStr = hourLabel;
      }

      // Add to overall network hourly load
      hourlyNetworkLoad[hour] += matchingConflicts.length * 2 + matchingPending.length;

      const summaryTooltip = `${timeRange}: ${hrStrain}% Strain (${hrTier}) · ${matchingConflicts.length} Conflict(s) · ${matchingPending.length} Pending Request(s)`;

      hourlyCells.push({
        hour,
        hourLabel,
        timeRange,
        conflictCount: matchingConflicts.length,
        criticalConflictCount: hrCritConflict,
        pendingRequestCount: matchingPending.length,
        criticalPendingCount: hrCritPending,
        scheduledBlocksCount: hrBlocks,
        strainScore: hrStrain,
        tier: hrTier,
        colorClass: hrVisuals.cellBg,
        bgGradient: hrVisuals.cellGradient,
        borderClass: hrVisuals.cellBorder,
        textClass: hrVisuals.cellText,
        glowClass: hrVisuals.glow,
        summaryTooltip,
        conflictingItems: matchingConflicts,
        pendingItems: matchingPending,
      });
    }

    // 8. Generate Human-Readable Primary Drivers & Recommended Actions
    const primaryDrivers: string[] = [];
    if (criticalConflicts.length > 0) {
      primaryDrivers.push(
        `${criticalConflicts.length} open Critical Conflict(s) with express/passenger passenger paths`
      );
    }
    if (criticalPending.length > 0) {
      primaryDrivers.push(
        `${criticalPending.length} Priority-1 maintenance requests backlogged without confirmed possession`
      );
    }
    if (corridorRequests.length > 4) {
      primaryDrivers.push(
        `Heavy departmental queue (${corridorRequests.length} pending requests totaling ${Math.round(
          pendingDurationSum / 60
        )}h work)`
      );
    }
    if (primaryDrivers.length === 0) {
      primaryDrivers.push('Nominal traffic distribution with adequate lull buffer margin.');
    }

    const recommendedActions: string[] = [];
    if (criticalConflicts.length > 0) {
      recommendedActions.push(
        `Physically shift conflicting block(s) into adjacent empty lull slots or pre-dawn windows`
      );
    }
    if (criticalPending.length > 0) {
      recommendedActions.push(
        `Allocate available empty slots on ${corridor.id} to P-Way & S&T high-priority work orders`
      );
    }
    if (recommendedActions.length === 0) {
      recommendedActions.push('Maintain scheduled timetable and monitor real-time track telemetry.');
    }

    // Check if this corridor is the highest risk
    if (compositeRiskScore > highestRiskScore) {
      highestRiskScore = compositeRiskScore;
      highestRiskCorridorId = corridor.id;
      highestRiskCorridorName = corridor.name;
    }

    metricsByCorridor[corridor.id] = {
      corridorId: corridor.id,
      corridorName: corridor.name,
      totalConflicts: corridorConflicts.length,
      openConflicts: openConflicts.length,
      criticalConflicts: criticalConflicts.length,
      highConflicts: highConflicts.length,
      resolvedConflicts: resolvedConflicts.length,
      totalPendingRequests: corridorRequests.length,
      criticalPendingRequests: criticalPending.length,
      highPendingRequests: highPending.length,
      totalPendingDurationMinutes: pendingDurationSum,
      compositeRiskScore,
      conflictScore,
      maintenanceScore,
      riskTier,
      tierLabel: visuals.label,
      tierBadgeColor: visuals.badgeBg,
      cardBorderGlow: visuals.cardBorder,
      cardBackgroundTint: visuals.cardBg,
      peakHour: peakHourStr,
      peakHourStrain: maxHourlyStrain,
      hourlyCells,
      primaryDrivers,
      recommendedActions,
      conflictsList: corridorConflicts,
      pendingRequestsList: corridorRequests,
    };
  });

  // Calculate Peak Congestion Window across network
  let peakNetHour = 14;
  let maxNetLoad = -1;
  for (let h = 8; h <= 20; h++) {
    if (hourlyNetworkLoad[h] > maxNetLoad) {
      maxNetLoad = hourlyNetworkLoad[h];
      peakNetHour = h;
    }
  }
  const peakCongestionWindow = `${String(peakNetHour).padStart(2, '0')}:00 – ${String(
    Math.min(24, peakNetHour + 2)
  ).padStart(2, '0')}:00`;

  // Count corridor tiers
  let criticalCorridorsCount = 0;
  let highCorridorsCount = 0;
  let moderateCorridorsCount = 0;
  let lowCorridorsCount = 0;

  Object.values(metricsByCorridor).forEach((m) => {
    if (m.riskTier === 'CRITICAL') criticalCorridorsCount++;
    else if (m.riskTier === 'HIGH') highCorridorsCount++;
    else if (m.riskTier === 'MODERATE') moderateCorridorsCount++;
    else lowCorridorsCount++;
  });

  return {
    totalCorridors: corridors.length,
    criticalCorridorsCount,
    highCorridorsCount,
    moderateCorridorsCount,
    lowCorridorsCount,
    totalOpenConflicts,
    totalCriticalConflicts,
    totalPendingRequests,
    totalCriticalPendingRequests,
    highestRiskCorridorId,
    highestRiskCorridorName,
    highestRiskScore: Math.max(0, highestRiskScore),
    peakCongestionWindow,
    metricsByCorridor,
  };
}
