import { Defect, Asset, Corridor, PriorityLevel, DepartmentType } from '../types';

export interface CorridorAgingProfile {
  corridorId: string;
  name: string;
  code: string;
  commissioningYear: number;
  corridorAgeYears: number;
  annualTonnageGMT: number;
  ageDegradationFactor: number; // Multiplier, e.g. 1.0 - 1.6x
  fatigueRiskLevel: 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOW';
  infrastructureNotes: string;
}

export interface AssetFailureProfile {
  assetTypeKey: string;
  label: string;
  department: DepartmentType;
  annualFailureRatePercent: number; // Historical annual failure rate %
  mtbfDays: number; // Mean Time Between Critical Failures in days
  failureRateMultiplier: number; // Multiplier relative to average (1.0 = baseline)
  typicalCriticalFailureMode: string;
  urgencyWeight: number; // 1.0 - 1.8
}

export interface PredictiveRiskScoreResult {
  defectId: string;
  assetId: string;
  assetName: string;
  corridorId: string;
  corridorName: string;
  department: DepartmentType;
  defectType: string;
  currentSeverity: PriorityLevel;

  // Predictive Score (0 - 100)
  predictiveRiskScore: number;
  riskTier: 'ACTIVE_CRITICAL' | 'CRITICAL_WITHIN_30D' | 'ELEVATED_30_60D' | 'MONITORED_STABLE';
  riskLabel: string;

  // 30-Day Criticality Forecast
  isCurrentlyCritical: boolean;
  isLikelyCriticalWithin30Days: boolean;
  forecastedDaysUntilCritical: number;
  forecastedCriticalDate: string;
  daysElapsedSinceDetection: number;

  // Breakdown Factors
  corridorAgeYears: number;
  corridorCommissioningYear: number;
  corridorAgeMultiplier: number;
  annualTonnageGMT: number;

  assetType: string;
  historicalAnnualFailureRatePercent: number;
  meanTimeBetweenFailuresDays: number;
  assetFailureMultiplier: number;
  typicalCriticalFailureMode: string;

  primaryRiskDriver: string;
  recommendedPreventiveAction: string;
}

// Corridor Aging Database for Indian Railways Delhi Division Corridors (Baseline year 2026)
export const CORRIDOR_AGING_PROFILES: Record<string, CorridorAgingProfile> = {
  C001: {
    corridorId: 'C001',
    name: 'Northern Main Trunk (Station A — Station B / NDLS-GZB)',
    code: 'NDLS-GZB',
    commissioningYear: 1968,
    corridorAgeYears: 58,
    annualTonnageGMT: 48.5,
    ageDegradationFactor: 1.42,
    fatigueRiskLevel: 'HIGH',
    infrastructureNotes: '58-year-old trunk corridor handling intensive 4-track mixed express & container traffic with high cumulative rail fatigue.',
  },
  C002: {
    corridorId: 'C002',
    name: 'Southern High-Speed Spur (Station A — Station C / NDLS-FDB)',
    code: 'NDLS-FDB',
    commissioningYear: 1985,
    corridorAgeYears: 41,
    annualTonnageGMT: 32.0,
    ageDegradationFactor: 1.18,
    fatigueRiskLevel: 'MODERATE',
    infrastructureNotes: '41-year-old modernised high-speed spur for Vande Bharat / Rajdhani with 140 km/h Head-Hardened rail renewals.',
  },
  C003: {
    corridorId: 'C003',
    name: 'Western Heavy Freight & Passenger (Station A — Station D / NDLS-ROK)',
    code: 'NDLS-ROK',
    commissioningYear: 1974,
    corridorAgeYears: 52,
    annualTonnageGMT: 56.8,
    ageDegradationFactor: 1.54,
    fatigueRiskLevel: 'VERY_HIGH',
    infrastructureNotes: '52-year-old heavy haul corridor carrying 25-tonne axle load coal and container rakes with severe subgrade mud pumping and switch wear.',
  },
  C004: {
    corridorId: 'C004',
    name: 'Eastern Mixed Express Link (Station A — Station E / NDLS-MBR)',
    code: 'NDLS-MBR',
    commissioningYear: 1996,
    corridorAgeYears: 30,
    annualTonnageGMT: 26.5,
    ageDegradationFactor: 1.08,
    fatigueRiskLevel: 'LOW',
    infrastructureNotes: '30-year-old double-line link with modern automatic block signaling and PSC sleepers.',
  },
};

// Historical Failure Rate Database per Asset Type based on RDSO & IR Maintenance History
export const ASSET_HISTORICAL_FAILURE_PROFILES: AssetFailureProfile[] = [
  {
    assetTypeKey: 'CROSSING_TURNOUT',
    label: 'Point & Crossing Turnout (CMS / Thick Web Switch)',
    department: 'ENGINEERING',
    annualFailureRatePercent: 18.6,
    mtbfDays: 135,
    failureRateMultiplier: 1.62,
    typicalCriticalFailureMode: 'Tongue rail chipping, nose wear >8mm, and bolt shearing under trailing load',
    urgencyWeight: 1.65,
  },
  {
    assetTypeKey: 'CWR_RAIL',
    label: 'Continuous Welded Rail (60kg Standard Rail)',
    department: 'ENGINEERING',
    annualFailureRatePercent: 14.8,
    mtbfDays: 175,
    failureRateMultiplier: 1.38,
    typicalCriticalFailureMode: 'Transverse fatigue fissure (USFD flaw) and weld fracture during night cold contraction',
    urgencyWeight: 1.50,
  },
  {
    assetTypeKey: 'POINT_MACHINE',
    label: 'Electric Point Machine (Rotary 143mm Throw)',
    department: 'S&T',
    annualFailureRatePercent: 16.4,
    mtbfDays: 152,
    failureRateMultiplier: 1.48,
    typicalCriticalFailureMode: 'Motor stall current surge, lock slide friction, and throw failure causing red lockouts',
    urgencyWeight: 1.55,
  },
  {
    assetTypeKey: 'OHE_CATENARY',
    label: '25kV Traction Catenary & Dropper Assembly',
    department: 'TRACTION',
    annualFailureRatePercent: 13.2,
    mtbfDays: 205,
    failureRateMultiplier: 1.25,
    typicalCriticalFailureMode: 'Dropper loose sparking, hot-spot thermal arcing, and contact wire parting',
    urgencyWeight: 1.35,
  },
  {
    assetTypeKey: 'TRACK_CIRCUIT',
    label: 'Audio Frequency Track Circuit (AFTC) / HV Impulse',
    department: 'S&T',
    annualFailureRatePercent: 11.5,
    mtbfDays: 235,
    failureRateMultiplier: 1.15,
    typicalCriticalFailureMode: 'Ballast impedance drop causing fail-to-danger phantom red aspect drops',
    urgencyWeight: 1.25,
  },
  {
    assetTypeKey: 'BRIDGE_GIRDER',
    label: 'Steel Girder Open Web Bridge',
    department: 'ENGINEERING',
    annualFailureRatePercent: 9.8,
    mtbfDays: 285,
    failureRateMultiplier: 1.05,
    typicalCriticalFailureMode: 'Camber deflection, rocker bearing seizure, and expansion joint fatigue',
    urgencyWeight: 1.20,
  },
  {
    assetTypeKey: 'AXLE_COUNTER',
    label: 'Digital Axle Counter (MSDAC / BPAC)',
    department: 'S&T',
    annualFailureRatePercent: 7.6,
    mtbfDays: 330,
    failureRateMultiplier: 0.82,
    typicalCriticalFailureMode: 'Wheel sensor electronic drift and count mismatch triggering automated section clamp',
    urgencyWeight: 0.95,
  },
  {
    assetTypeKey: 'BALLAST_BED',
    label: 'Track Ballast Bed & Subgrade',
    department: 'ENGINEERING',
    annualFailureRatePercent: 12.0,
    mtbfDays: 220,
    failureRateMultiplier: 1.20,
    typicalCriticalFailureMode: 'Ballast pocket fouling and track twist deformation reducing Track Geometry Index',
    urgencyWeight: 1.30,
  },
  {
    assetTypeKey: 'HEAD_HARDENED_RAIL',
    label: 'Head Hardened Rail 60kg R350HT',
    department: 'ENGINEERING',
    annualFailureRatePercent: 6.2,
    mtbfDays: 390,
    failureRateMultiplier: 0.72,
    typicalCriticalFailureMode: 'Rolling contact fatigue squats and gauge corner head checking',
    urgencyWeight: 0.85,
  },
  {
    assetTypeKey: 'TRACTION_TRANSFORMER',
    label: '132/25kV Traction Sub-Station Transformer & Breaker',
    department: 'TRACTION',
    annualFailureRatePercent: 4.8,
    mtbfDays: 480,
    failureRateMultiplier: 0.60,
    typicalCriticalFailureMode: 'Insulation breakdown, SF6 gas pressure loss, and feeder tripping',
    urgencyWeight: 0.75,
  },
  {
    assetTypeKey: 'PSC_SLEEPER',
    label: 'Pre-Stressed Concrete (PSC) Sleepers & Fastenings',
    department: 'ENGINEERING',
    annualFailureRatePercent: 5.4,
    mtbfDays: 440,
    failureRateMultiplier: 0.65,
    typicalCriticalFailureMode: 'Elastic rail clip displacement and sleeper seat cracking under dynamic impact',
    urgencyWeight: 0.80,
  },
  {
    assetTypeKey: 'DEFAULT_GENERIC',
    label: 'Standard Railway Asset',
    department: 'ENGINEERING',
    annualFailureRatePercent: 10.0,
    mtbfDays: 260,
    failureRateMultiplier: 1.00,
    typicalCriticalFailureMode: 'Standard wear and tear exceeding maintenance tolerance thresholds',
    urgencyWeight: 1.00,
  },
];

// Helper to match asset failure profile by asset name, type string, or defect classification
export function matchAssetFailureProfile(
  assetTypeOrName: string,
  defectType: string,
  department: DepartmentType
): AssetFailureProfile {
  const text = `${assetTypeOrName} ${defectType}`.toLowerCase();

  if (text.includes('turnout') || text.includes('crossing') || text.includes('switch') || text.includes('diamond')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[0]; // CROSSING_TURNOUT
  }
  if (text.includes('point machine') || text.includes('pm-') || text.includes('motor stall')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[2]; // POINT_MACHINE
  }
  if (text.includes('cwr') || text.includes('continuous welded') || text.includes('usfd') || text.includes('weld flaw') || text.includes('rail flaw')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[1]; // CWR_RAIL
  }
  if (text.includes('catenary') || text.includes('dropper') || text.includes('ohe') || text.includes('contact wire') || text.includes('arcing')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[3]; // OHE_CATENARY
  }
  if (text.includes('track circuit') || text.includes('aftc') || text.includes('voltage fluctuation') || text.includes('shunt')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[4]; // TRACK_CIRCUIT
  }
  if (text.includes('bridge') || text.includes('girder') || text.includes('expansion joint') || text.includes('culvert')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[5]; // BRIDGE_GIRDER
  }
  if (text.includes('axle counter') || text.includes('bpac') || text.includes('dac')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[6]; // AXLE_COUNTER
  }
  if (text.includes('ballast') || text.includes('mud pumping') || text.includes('subgrade')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[7]; // BALLAST_BED
  }
  if (text.includes('head hardened') || text.includes('r350ht')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[8]; // HEAD_HARDENED_RAIL
  }
  if (text.includes('transformer') || text.includes('tss') || text.includes('breaker') || text.includes('sub-station')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[9]; // TRACTION_TRANSFORMER
  }
  if (text.includes('sleeper') || text.includes('psc') || text.includes('fastening') || text.includes('fishplate')) {
    return ASSET_HISTORICAL_FAILURE_PROFILES[10]; // PSC_SLEEPER
  }

  // Department-based fallback
  if (department === 'TRACTION') return ASSET_HISTORICAL_FAILURE_PROFILES[3];
  if (department === 'S&T') return ASSET_HISTORICAL_FAILURE_PROFILES[2];
  return ASSET_HISTORICAL_FAILURE_PROFILES[11]; // DEFAULT_GENERIC
}

// Compute future date string from days ahead
function computeForecastDate(daysAhead: number): string {
  const base = new Date('2026-09-14T12:00:00Z');
  base.setDate(base.getDate() + Math.round(daysAhead));
  return base.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Calculates the Predictive Risk Score and 30-Day Criticality Forecast for any defect
 * using historical failure rates per asset type and corridor infrastructure aging.
 */
export function calculatePredictiveRiskScore(
  defect: Defect,
  assets: Asset[] = [],
  corridors: Corridor[] = []
): PredictiveRiskScoreResult {
  const corridorId = defect.corridorId || 'C001';
  const corridorProfile = CORRIDOR_AGING_PROFILES[corridorId] || CORRIDOR_AGING_PROFILES['C001'];

  // Lookup asset details
  const matchedAsset = assets.find((a) => a.id === defect.assetId);
  const assetName = matchedAsset?.name || `Asset ${defect.assetId}`;
  const assetType = matchedAsset?.type || defect.defectType;

  // Match asset historical failure profile
  const assetProfile = matchAssetFailureProfile(assetType, defect.defectType, defect.department);

  // Compute days elapsed since detection
  let daysElapsed = 6;
  if (defect.detectedDate) {
    const detected = new Date(defect.detectedDate).getTime();
    const current = new Date('2026-09-14').getTime();
    const diffDays = Math.max(0, Math.floor((current - detected) / (1000 * 60 * 60 * 24)));
    if (!isNaN(diffDays)) {
      daysElapsed = diffDays;
    }
  }

  // 1. ACTIVE CRITICAL DEFECT HANDLING
  if (defect.severity === 'CRITICAL') {
    return {
      defectId: defect.defectId,
      assetId: defect.assetId,
      assetName,
      corridorId,
      corridorName: corridorProfile.name,
      department: defect.department,
      defectType: defect.defectType,
      currentSeverity: 'CRITICAL',
      predictiveRiskScore: 100,
      riskTier: 'ACTIVE_CRITICAL',
      riskLabel: 'ACTIVE CRITICAL HAZARD',
      isCurrentlyCritical: true,
      isLikelyCriticalWithin30Days: true,
      forecastedDaysUntilCritical: 0,
      forecastedCriticalDate: 'Active Now',
      daysElapsedSinceDetection: daysElapsed,
      corridorAgeYears: corridorProfile.corridorAgeYears,
      corridorCommissioningYear: corridorProfile.commissioningYear,
      corridorAgeMultiplier: corridorProfile.ageDegradationFactor,
      annualTonnageGMT: corridorProfile.annualTonnageGMT,
      assetType: assetProfile.label,
      historicalAnnualFailureRatePercent: assetProfile.annualFailureRatePercent,
      meanTimeBetweenFailuresDays: assetProfile.mtbfDays,
      assetFailureMultiplier: assetProfile.failureRateMultiplier,
      typicalCriticalFailureMode: assetProfile.typicalCriticalFailureMode,
      primaryRiskDriver: 'Currently exceeds critical safety threshold; requires immediate emergency block.',
      recommendedPreventiveAction: 'Dispatch immediate maintenance squad for emergency clamped repair or caution order.',
    };
  }

  // 2. NON-CRITICAL DEFECT FORECASTING (HIGH, MEDIUM, LOW)
  // Baseline days until failure by initial severity
  let baseDaysToCritical = 45;
  switch (defect.severity) {
    case 'HIGH':
      baseDaysToCritical = 22; // High defects typically reach critical in ~18-28 days baseline
      break;
    case 'MEDIUM':
      baseDaysToCritical = 52; // Medium defects typically reach critical in ~45-65 days baseline
      break;
    case 'LOW':
    default:
      baseDaysToCritical = 95; // Low defects typically reach critical in ~80-120 days baseline
      break;
  }

  // Combined degradation acceleration factor:
  // Asset Failure Rate factor * Corridor Age Degradation Factor
  const combinedAcceleration = assetProfile.failureRateMultiplier * corridorProfile.ageDegradationFactor;

  // Forecast days remaining until critical transition:
  // baseDays adjusted by acceleration, minus days already elapsed with non-linear fatigue wear
  const acceleratedDays = baseDaysToCritical / combinedAcceleration;
  const daysUntilCriticalRaw = Math.max(1.5, acceleratedDays - daysElapsed * 0.75);
  const forecastedDaysUntilCritical = Math.round(daysUntilCriticalRaw * 10) / 10;

  // Is this currently non-critical defect forecasted to cross the critical threshold within 30 days?
  const isLikelyCriticalWithin30Days = forecastedDaysUntilCritical <= 30;

  // Compute Predictive Risk Score (0 - 99 for non-critical)
  let predictiveRiskScore = 50;

  if (forecastedDaysUntilCritical <= 30) {
    // Score between 70 and 99 (High Risk / Imminent Criticality within 30 days)
    // 1 day left -> 98, 7 days left -> 93, 14 days left -> 86, 25 days left -> 76, 30 days left -> 70
    const ratio = (30 - forecastedDaysUntilCritical) / 29; // 0 to 1
    predictiveRiskScore = Math.min(99, Math.max(70, Math.round(70 + ratio * 28)));
  } else if (forecastedDaysUntilCritical <= 60) {
    // Score between 45 and 69 (Elevated 31 - 60 day window)
    const ratio = (60 - forecastedDaysUntilCritical) / 30; // 0 to 1
    predictiveRiskScore = Math.min(69, Math.max(45, Math.round(45 + ratio * 24)));
  } else {
    // Score between 12 and 44 (Monitored / Stable > 60 days)
    const ratio = Math.max(0, (120 - forecastedDaysUntilCritical) / 60);
    predictiveRiskScore = Math.min(44, Math.max(12, Math.round(12 + ratio * 30)));
  }

  // Categorize Risk Tier
  let riskTier: PredictiveRiskScoreResult['riskTier'] = 'MONITORED_STABLE';
  let riskLabel = 'LOW RISK (>60D)';

  if (isLikelyCriticalWithin30Days) {
    riskTier = 'CRITICAL_WITHIN_30D';
    riskLabel = `CRITICAL IN ${forecastedDaysUntilCritical.toFixed(0)}D`;
  } else if (forecastedDaysUntilCritical <= 60) {
    riskTier = 'ELEVATED_30_60D';
    riskLabel = `ELEVATED (${forecastedDaysUntilCritical.toFixed(0)}D)`;
  }

  // Primary risk driver explanation
  const driverParts: string[] = [];
  if (assetProfile.failureRateMultiplier >= 1.3) {
    driverParts.push(`high historical failure rate of ${assetProfile.annualFailureRatePercent}% for ${assetProfile.label}`);
  }
  if (corridorProfile.corridorAgeYears >= 45) {
    driverParts.push(`severe ${corridorProfile.corridorAgeYears}-year corridor infrastructure age (${corridorProfile.code}) with ${corridorProfile.annualTonnageGMT} GMT annual load`);
  }
  if (defect.severity === 'HIGH') {
    driverParts.push('elevated initial severity stage');
  }

  const primaryRiskDriver =
    driverParts.length > 0
      ? `Accelerated by ${driverParts.join(' combined with ')}.`
      : `Standard degradation velocity across ${corridorProfile.name}.`;

  const recommendedPreventiveAction = isLikelyCriticalWithin30Days
    ? `Schedule preventive possession block within ${Math.max(2, Math.floor(forecastedDaysUntilCritical - 2))} days before condition escalates to emergency caution order.`
    : `Include in upcoming periodic maintenance schedule; monitor during weekly track patrol.`;

  return {
    defectId: defect.defectId,
    assetId: defect.assetId,
    assetName,
    corridorId,
    corridorName: corridorProfile.name,
    department: defect.department,
    defectType: defect.defectType,
    currentSeverity: defect.severity,
    predictiveRiskScore,
    riskTier,
    riskLabel,
    isCurrentlyCritical: false,
    isLikelyCriticalWithin30Days,
    forecastedDaysUntilCritical,
    forecastedCriticalDate: computeForecastDate(forecastedDaysUntilCritical),
    daysElapsedSinceDetection: daysElapsed,
    corridorAgeYears: corridorProfile.corridorAgeYears,
    corridorCommissioningYear: corridorProfile.commissioningYear,
    corridorAgeMultiplier: corridorProfile.ageDegradationFactor,
    annualTonnageGMT: corridorProfile.annualTonnageGMT,
    assetType: assetProfile.label,
    historicalAnnualFailureRatePercent: assetProfile.annualFailureRatePercent,
    meanTimeBetweenFailuresDays: assetProfile.mtbfDays,
    assetFailureMultiplier: assetProfile.failureRateMultiplier,
    typicalCriticalFailureMode: assetProfile.typicalCriticalFailureMode,
    primaryRiskDriver,
    recommendedPreventiveAction,
  };
}

/**
 * Computes predictive risk scores for an entire defect collection and aggregates 30-day metrics.
 */
export function calculateBatchPredictiveRiskScores(
  defects: Defect[],
  assets: Asset[] = [],
  corridors: Corridor[] = []
): {
  scoresMap: Map<string, PredictiveRiskScoreResult>;
  totalDefectsCount: number;
  currentlyCriticalCount: number;
  nonCriticalDefectsCount: number;
  forecastedCriticalWithin30DaysCount: number;
  elevatedCount: number;
  stableCount: number;
  averageDaysUntilCriticalNonCritical: number;
  highestRiskCorridor: { corridorId: string; corridorName: string; atRiskCount: number };
} {
  const scoresMap = new Map<string, PredictiveRiskScoreResult>();
  let currentlyCriticalCount = 0;
  let nonCriticalDefectsCount = 0;
  let forecastedCriticalWithin30DaysCount = 0;
  let elevatedCount = 0;
  let stableCount = 0;
  let totalNonCriticalDays = 0;
  const corridorRiskCountMap: Record<string, number> = {};

  for (const d of defects) {
    const res = calculatePredictiveRiskScore(d, assets, corridors);
    scoresMap.set(d.defectId, res);

    if (res.isCurrentlyCritical) {
      currentlyCriticalCount++;
    } else {
      nonCriticalDefectsCount++;
      totalNonCriticalDays += res.forecastedDaysUntilCritical;

      if (res.isLikelyCriticalWithin30Days) {
        forecastedCriticalWithin30DaysCount++;
        corridorRiskCountMap[res.corridorId] = (corridorRiskCountMap[res.corridorId] || 0) + 1;
      } else if (res.riskTier === 'ELEVATED_30_60D') {
        elevatedCount++;
      } else {
        stableCount++;
      }
    }
  }

  // Determine highest risk corridor
  let highestRiskCorridor = { corridorId: 'C001', corridorName: 'Northern Main Trunk (NDLS-GZB)', atRiskCount: 0 };
  let maxCount = -1;
  for (const [cId, count] of Object.entries(corridorRiskCountMap)) {
    if (count > maxCount) {
      maxCount = count;
      const profile = CORRIDOR_AGING_PROFILES[cId];
      highestRiskCorridor = {
        corridorId: cId,
        corridorName: profile?.name || cId,
        atRiskCount: count,
      };
    }
  }

  const averageDaysUntilCriticalNonCritical =
    nonCriticalDefectsCount > 0 ? Number((totalNonCriticalDays / nonCriticalDefectsCount).toFixed(1)) : 0;

  return {
    scoresMap,
    totalDefectsCount: defects.length,
    currentlyCriticalCount,
    nonCriticalDefectsCount,
    forecastedCriticalWithin30DaysCount,
    elevatedCount,
    stableCount,
    averageDaysUntilCriticalNonCritical,
    highestRiskCorridor,
  };
}
