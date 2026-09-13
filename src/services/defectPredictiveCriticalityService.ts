import { Defect, DepartmentType, PriorityLevel } from '../types';
import { HISTORICAL_DEFECT_CLUSTERS } from './predictiveMaintenanceService';
import { CORRIDOR_MAP_CONFIGS } from '../components/common/DefectMapThumbnail';

export type DegradationStage =
  | 'NORMAL'
  | 'DEGRADING'
  | 'HIGH_RISK'
  | 'CRITICAL'
  | 'FAILURE_HORIZON';

export interface TimelineMilestone {
  day: number;
  date: string;
  title: string;
  stage: DegradationStage;
  healthScore: number;
  tgiIndex: number;
  speedRestrictionKmph?: number;
  description: string;
  operationalStatus: string;
  recommendedAction?: string;
  isPredictedCriticalMilestone?: boolean;
  isOptimalBlockMilestone?: boolean;
}

export interface PredictiveCriticalityResult {
  defectId: string;
  assetId: string;
  assetName: string;
  corridorId: string;
  department: DepartmentType;
  defectType: string;
  currentSeverity: PriorityLevel;
  detectedDate: string;
  currentHealthScore: number;
  dailyDegradationRate: number; // in % per day
  daysUntilCritical: number;
  predictedCriticalDate: string;
  currentKm: number;
  railwayChainageKm: string;
  latitude: number;
  longitude: number;
  confidenceScore: number;

  historicalPatternCluster: {
    clusterId: string;
    clusterName: string;
    avgRecurrenceDays: number;
    description: string;
    matchedHistoricalIncidentsCount: number;
    gmtLoadFactor: string;
    thermalRiskProfile: string;
  };

  recommendedBlockWindow: {
    startDay: number;
    optimalDate: string;
    startTime: string;
    endTime: string;
    blockDurationHours: number;
    windowType: string;
    recommendedMachinery: string;
    recommendedGang: string;
    rationale: string;
  };

  timelineMilestones: TimelineMilestone[];
  degradationCurve: {
    day: number;
    date: string;
    healthScore: number;
    tgiIndex: number;
    stage: DegradationStage;
    isCritical: boolean;
    speedRestrictionKmph?: number;
  }[];
}

// Helper to format future dates relative to today
function getFutureDate(daysAhead: number): string {
  const base = new Date('2026-09-13T12:00:00Z');
  base.setDate(base.getDate() + Math.round(daysAhead));
  return base.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Format short date e.g. "18 Sep"
function getShortFutureDate(daysAhead: number): string {
  const base = new Date('2026-09-13T12:00:00Z');
  base.setDate(base.getDate() + Math.round(daysAhead));
  return base.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// Derive chainage KM from coordinates or string
export function parseChainageKm(defect: Defect, fallbackCorridorId: string): number {
  if (defect.geoCoordinates?.railwayChainageKm) {
    const match = defect.geoCoordinates.railwayChainageKm.match(/KM\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
  }

  const corridorCfg = CORRIDOR_MAP_CONFIGS[defect.corridorId || fallbackCorridorId];
  if (defect.geoCoordinates?.latitude && corridorCfg) {
    const latDiff = defect.geoCoordinates.latitude - corridorCfg.baseLat;
    const computed = corridorCfg.defaultKm + latDiff / corridorCfg.latPerKm;
    return Math.max(1, Math.round(computed * 10) / 10);
  }

  return corridorCfg ? corridorCfg.defaultKm : 28.4;
}

/**
 * Predicts asset criticality based on historical defect recurrence clusters,
 * cumulative corridor tonnage (GMT), and initial defect severity.
 */
export function predictAssetCriticality(
  defect: Defect,
  allDefects: Defect[] = []
): PredictiveCriticalityResult {
  const corridorId = defect.corridorId || 'C001';
  const dept = defect.department || 'ENGINEERING';
  const corridorCfg = CORRIDOR_MAP_CONFIGS[corridorId] || CORRIDOR_MAP_CONFIGS['C001'];
  const currentKm = parseChainageKm(defect, corridorId);

  // Match cluster based on department & keywords
  let cluster = HISTORICAL_DEFECT_CLUSTERS.find(
    (c) =>
      c.department === dept ||
      defect.defectType.toLowerCase().includes(c.clusterName.toLowerCase().slice(0, 10))
  );

  if (!cluster) {
    cluster = HISTORICAL_DEFECT_CLUSTERS[0];
  }

  // Count matching historical and active occurrences in the corridor
  const occurrences = allDefects.filter(
    (d) => d.corridorId === corridorId && (d.assetId === defect.assetId || d.department === dept)
  ).length;

  const matchedHistoricalCount = Math.max(3, occurrences + 4);

  // Determine base health & daily degradation velocity based on severity
  let baseHealth = 78;
  let daysUntilCritical = 12.5;
  let dailyDegradationRate = 2.5;
  let confidenceScore = 91;

  switch (defect.severity) {
    case 'CRITICAL':
      baseHealth = 34; // Already at or past critical threshold (<40)
      daysUntilCritical = 1.8;
      dailyDegradationRate = 4.8;
      confidenceScore = 96;
      break;
    case 'HIGH':
      baseHealth = 58;
      daysUntilCritical = 5.4;
      dailyDegradationRate = 3.6;
      confidenceScore = 93;
      break;
    case 'MEDIUM':
      baseHealth = 76;
      daysUntilCritical = 11.8;
      dailyDegradationRate = 2.4;
      confidenceScore = 89;
      break;
    case 'LOW':
    default:
      baseHealth = 88;
      daysUntilCritical = 21.0;
      dailyDegradationRate = 1.6;
      confidenceScore = 86;
      break;
  }

  // Corridor traffic GMT acceleration factor
  const isHeavyFreightCorridor = corridorId === 'C003' || corridorId === 'C004';
  if (isHeavyFreightCorridor) {
    daysUntilCritical = Math.max(1.2, Number((daysUntilCritical * 0.85).toFixed(1)));
    dailyDegradationRate = Number((dailyDegradationRate * 1.2).toFixed(2));
  }

  const predictedCriticalDate = getFutureDate(daysUntilCritical);

  // Build 30-day degradation curve
  const degradationCurve: PredictiveCriticalityResult['degradationCurve'] = [];
  for (let day = 0; day <= 30; day++) {
    // Accelerated nonlinear drop-off as micro-flaws propagate
    const nonLinearDrop = Math.pow(day / 24, 1.35) * (dailyDegradationRate * 8);
    const linearDrop = day * dailyDegradationRate;
    const currentHealth = Math.max(8, Math.round(baseHealth - (linearDrop * 0.5 + nonLinearDrop * 0.5)));

    // Track Geometry Index (TGI) tracks health closely (Healthy = 88+, Critical < 55)
    const tgiIndex = Math.max(48, Math.round(48 + (currentHealth / 100) * 44));

    let stage: DegradationStage = 'NORMAL';
    let speedRestrictionKmph: number | undefined = undefined;

    if (currentHealth < 25) {
      stage = 'FAILURE_HORIZON';
      speedRestrictionKmph = 15;
    } else if (currentHealth <= 40) {
      stage = 'CRITICAL';
      speedRestrictionKmph = 30;
    } else if (currentHealth <= 55) {
      stage = 'HIGH_RISK';
      speedRestrictionKmph = 50;
    } else if (currentHealth <= 70) {
      stage = 'DEGRADING';
    } else {
      stage = 'NORMAL';
    }

    degradationCurve.push({
      day,
      date: getShortFutureDate(day),
      healthScore: currentHealth,
      tgiIndex,
      stage,
      isCritical: currentHealth <= 40,
      speedRestrictionKmph,
    });
  }

  // Optimal Maintenance Block Window (recommend ~2-3 days before reaching critical threshold)
  const optimalBlockDay = Math.max(1, Math.floor(daysUntilCritical * 0.6));
  const optimalBlockDate = getFutureDate(optimalBlockDay);

  let windowType = 'NIGHT_MEGA_BLOCK (01:30 - 03:30 AM)';
  let recommendedMachinery = 'CSM-902 Continuous Action Tamping Machine';
  let recommendedGang = 'SSE P-Way Flying Gang #4';

  if (dept === 'TRACTION') {
    windowType = 'EARLY_HOURS_POWER_BLOCK (00:30 - 02:30 AM)';
    recommendedMachinery = '8-Wheeler OHE Inspection Tower Wagon (TW-04)';
    recommendedGang = 'TRD Catenary Overhead Maintenance Gang #2';
  } else if (dept === 'S&T') {
    windowType = 'MIDDAY_TRAFFIC_SHADOW (13:15 - 14:45 PM)';
    recommendedMachinery = 'Point Machine Electronic Test Bench & Dynamic Shunt Analyzer';
    recommendedGang = 'Signal & Telecom Flying Overhaul Unit #3';
  }

  // Milestone Anchors for the Predictive Timeline
  const timelineMilestones: TimelineMilestone[] = [
    {
      day: 0,
      date: getShortFutureDate(0),
      title: 'Current State (Defect Logged)',
      stage: defect.severity === 'CRITICAL' ? 'CRITICAL' : defect.severity === 'HIGH' ? 'HIGH_RISK' : 'DEGRADING',
      healthScore: baseHealth,
      tgiIndex: Math.round(48 + (baseHealth / 100) * 44),
      speedRestrictionKmph: defect.speedRestrictionKmph || (defect.severity === 'CRITICAL' ? 30 : undefined),
      description: `Defect logged at ${defect.geoCoordinates?.railwayChainageKm || `KM ${currentKm}`}. Vibration & wear within track containment limits.`,
      operationalStatus: 'Normal Line Speed / Operational',
      recommendedAction: 'Log inspection parameters and set predictive degradation monitor.',
    },
    {
      day: Math.max(1, Math.round(daysUntilCritical * 0.35)),
      date: getShortFutureDate(Math.max(1, Math.round(daysUntilCritical * 0.35))),
      title: 'Accelerating Stress Threshold',
      stage: 'HIGH_RISK',
      healthScore: Math.max(48, Math.round(baseHealth - (daysUntilCritical * 0.35 * dailyDegradationRate))),
      tgiIndex: 68,
      description: 'Axle load vibrations trigger micro-crack widening and localized gauge corner wear.',
      operationalStatus: 'Vibration Exceedance Warning',
      recommendedAction: 'Pre-position maintenance gang, verify parts availability in divisional depot.',
    },
    {
      day: optimalBlockDay,
      date: getShortFutureDate(optimalBlockDay),
      title: 'Optimal Preventive Block Window',
      stage: 'HIGH_RISK',
      healthScore: Math.max(42, Math.round(baseHealth - (optimalBlockDay * dailyDegradationRate))),
      tgiIndex: 63,
      isOptimalBlockMilestone: true,
      description: `Zero passenger clashes during ${windowType}. Handback buffer 45 mins. Rectification prevents emergency caution order.`,
      operationalStatus: 'Best Intervention Window (Traffic Lull)',
      recommendedAction: `Execute scheduled ${windowType} with ${recommendedMachinery}.`,
    },
    {
      day: Math.round(daysUntilCritical),
      date: getShortFutureDate(Math.round(daysUntilCritical)),
      title: 'Predicted CRITICAL State Reached',
      stage: 'CRITICAL',
      healthScore: 38,
      tgiIndex: 54,
      isPredictedCriticalMilestone: true,
      speedRestrictionKmph: 30,
      description: 'Railhead flaw echo / throw wear crosses statutory safety limit. Emergency 30 km/h caution order mandatory.',
      operationalStatus: 'CRITICAL FAILURE HORIZON',
      recommendedAction: 'Emergency track clamp / isolation required immediately if unaddressed.',
    },
    {
      day: Math.min(30, Math.round(daysUntilCritical * 1.6 + 4)),
      date: getShortFutureDate(Math.min(30, Math.round(daysUntilCritical * 1.6 + 4))),
      title: 'Corridor Disruption / Flaw Fracture Limit',
      stage: 'FAILURE_HORIZON',
      healthScore: 18,
      tgiIndex: 48,
      speedRestrictionKmph: 15,
      description: 'Severe structural fracture or electrical catenary parting risk. Non-interlocked stop & proceed operation.',
      operationalStatus: 'Severe Outage Risk',
      recommendedAction: 'Immediate line stoppage to avoid freight/passenger train derailment.',
    },
  ];

  // Geodetic latitude / longitude
  const lat = defect.geoCoordinates?.latitude || corridorCfg.baseLat;
  const lng = defect.geoCoordinates?.longitude || corridorCfg.baseLng;
  const chainageStr = defect.geoCoordinates?.railwayChainageKm || `KM ${currentKm.toFixed(1)} Up Main`;

  return {
    defectId: defect.defectId,
    assetId: defect.assetId,
    assetName: `Asset ${defect.assetId} (${defect.department})`,
    corridorId,
    department: dept,
    defectType: defect.defectType,
    currentSeverity: defect.severity,
    detectedDate: defect.detectedDate,
    currentHealthScore: baseHealth,
    dailyDegradationRate,
    daysUntilCritical,
    predictedCriticalDate,
    currentKm,
    railwayChainageKm: chainageStr,
    latitude: lat,
    longitude: lng,
    confidenceScore,

    historicalPatternCluster: {
      clusterId: cluster.clusterId,
      clusterName: cluster.clusterName,
      avgRecurrenceDays: cluster.avgRecurrenceDays,
      description: cluster.description,
      matchedHistoricalIncidentsCount: matchedHistoricalCount,
      gmtLoadFactor: isHeavyFreightCorridor ? '25.4 GMT / Annum (High Heavy Haul)' : '16.8 GMT / Annum (High Speed)',
      thermalRiskProfile: 'Rail Neutral Temp 28°C ± 5°C with ambient heat surges',
    },

    recommendedBlockWindow: {
      startDay: optimalBlockDay,
      optimalDate: optimalBlockDate,
      startTime: windowType.includes('01:30') ? '01:30' : windowType.includes('00:30') ? '00:30' : '13:15',
      endTime: windowType.includes('01:30') ? '03:30' : windowType.includes('00:30') ? '02:30' : '14:45',
      blockDurationHours: 2.0,
      windowType,
      recommendedMachinery,
      recommendedGang,
      rationale: `Historical cluster indicates flaw escalation reaches unrecoverable state at Day ${Math.round(daysUntilCritical)}. Scheduling preventive block at Day ${optimalBlockDay} prevents emergency 30 km/h order and saves 75 mins passenger delay.`,
    },

    timelineMilestones,
    degradationCurve,
  };
}
