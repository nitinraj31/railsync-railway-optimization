import { Corridor, Defect } from '../types';

export interface MachineHourEstimate {
  machineType: string;
  machineName: string;
  hoursRequired: number;
  targetChainage: string;
  taskDescription: string;
  hourlyOperatingCostInr: number;
}

export interface ManpowerHourEstimate {
  gangType: string;
  department: string;
  gangStrength: number;
  totalHours: number;
  primaryFocus: string;
  shiftType: string;
}

export interface MaintenanceRepairForecast {
  id: string;
  corridorId: string;
  corridorName: string;
  corridorCode: string;
  generatedAt: string;
  modelUsed: string;
  confidenceScore: number;
  baselineTDI: number;
  targetSafetyTDI: number;
  projectedRestoredTDI: number;
  targetHealthScore: number;
  projectedRestoredHealthScore: number;
  estimatedTotalManpowerHours: number;
  estimatedTotalMachineryHours: number;
  estimatedBlockShiftsCount: number;
  estimatedCostInr: number;
  executiveSummary: string;
  phasedExecutionPlan: {
    phaseNumber: number;
    phaseTitle: string;
    windowType: string;
    durationHours: number;
    tasks: string[];
    riskMitigated: string;
  }[];
  machineryHoursBreakdown: MachineHourEstimate[];
  manpowerHoursBreakdown: ManpowerHourEstimate[];
  safetyStandardRestoration: {
    speedRestrictionReliefKmph: number;
    trackGeometryIndexTarget: number;
    cautionOrderClearedChainage: string;
    derailmentRiskReductionPercent: number;
  };
}

export interface RepairForecastRequest {
  corridor: Corridor;
  currentTDI: number;
  degradationRate30Days: number;
  criticalThreshold: number;
  criticalDefectsCount: number;
  highDefectsCount: number;
  mediumDefectsCount: number;
  troubleSpotsCount: number;
  cautionOrdersCount: number;
}

/**
 * Service to generate AI Maintenance Repair Forecasts using 30-day degradation trend
 */
class PredictiveRepairForecastService {
  public async generateRepairForecast(request: RepairForecastRequest): Promise<MaintenanceRepairForecast> {
    const {
      corridor,
      currentTDI,
      degradationRate30Days,
      criticalThreshold,
      criticalDefectsCount,
      highDefectsCount,
      mediumDefectsCount,
      troubleSpotsCount,
      cautionOrdersCount,
    } = request;

    // Simulate realistic AI generation latency (600ms)
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Dynamic AI Calculations grounded in Indian Railways RDSO Maintenance Norms
    // Target safety standard: TDI <= 40 (or 50% of critical threshold)
    const targetSafetyTDI = Math.min(42, Math.round(criticalThreshold * 0.55));
    const tdiGap = Math.max(10, currentTDI - targetSafetyTDI);

    // Manpower calculation: base rate + scaling per TDI point + penalty for critical defects
    const baseManpowerHours = Math.round(
      tdiGap * 4.2 +
      criticalDefectsCount * 28 +
      highDefectsCount * 14 +
      mediumDefectsCount * 6 +
      troubleSpotsCount * 18
    );

    // Machinery calculation: Tamping + Ballast Cleaning + OHE Tower Wagon
    const tampingHours = Math.max(4.0, +(tdiGap * 0.22 + highDefectsCount * 0.6).toFixed(1));
    const ballastCleanerHours = +(Math.max(3.0, (currentTDI >= 65 ? 8.5 : 3.5) + criticalDefectsCount * 1.2)).toFixed(1);
    const stabilizerHours = +(tampingHours * 0.55).toFixed(1);
    const towerWagonHours = +(Math.max(2.0, (corridor.tracksCount > 2 ? 5.0 : 3.0) + (cautionOrdersCount > 0 ? 2.5 : 0))).toFixed(1);
    const railGrinderHours = +(Math.max(2.5, criticalDefectsCount * 1.5 + 2.0)).toFixed(1);

    const totalMachineryHours = +(
      tampingHours +
      ballastCleanerHours +
      stabilizerHours +
      towerWagonHours +
      railGrinderHours
    ).toFixed(1);

    // Number of required block shifts (typically 2.5h - 3.5h per night block window)
    const blockShifts = Math.max(2, Math.ceil(totalMachineryHours / 7.5));

    // Machinery breakdown
    const machineryHoursBreakdown: MachineHourEstimate[] = [
      {
        machineType: 'Continuous Action Tamper',
        machineName: 'CSM-902 Heavy Track Tamper',
        hoursRequired: tampingHours,
        targetChainage: corridor.id === 'C001' ? 'KM 22.0 – KM 26.8 Up Main' : 'KM 34.0 – KM 42.0 Freight Line',
        taskDescription: 'Precision 3-point alignment tamping & top levelling to eliminate vertical settlement',
        hourlyOperatingCostInr: 32000,
      },
      {
        machineType: 'Ballast Cleaning Machine',
        machineName: 'BCM-03 Deep Screening Cleaner',
        hoursRequired: ballastCleanerHours,
        targetChainage: corridor.id === 'C003' ? 'KM 36.0 – KM 41.5 Sampla' : 'KM 23.5 – KM 25.8 Sahibabad',
        taskDescription: 'Full depth screening of contaminated ballast, slurry evacuation & fresh ballast discharge',
        hourlyOperatingCostInr: 45000,
      },
      {
        machineType: 'Dynamic Track Stabilizer',
        machineName: 'DGS-01 Dynamic Stabilizer',
        hoursRequired: stabilizerHours,
        targetChainage: 'Full corridor critical spans',
        taskDescription: 'Post-tamping artificial consolidation to achieve immediate speed relaxation to 100+ km/h',
        hourlyOperatingCostInr: 24000,
      },
      {
        machineType: 'Overhead Equipment Tower Wagon',
        machineName: 'TRD Tower Wagon 04',
        hoursRequired: towerWagonHours,
        targetChainage: corridor.id === 'C004' ? 'KM 48.0 – KM 58.6 Palwal' : 'Corridor Interlocking Points',
        taskDescription: 'Contact wire stagger adjustment, dropper replacement & thermovision hotspot rectification',
        hourlyOperatingCostInr: 18000,
      },
      {
        machineType: 'Rail Grinding Machine',
        machineName: 'RG-30 Switch & Rail Grinder',
        hoursRequired: railGrinderHours,
        targetChainage: 'Station Turnouts & Outer Curves',
        taskDescription: 'Railhead profile restoration, removal of rolling contact fatigue micro-cracks & corrugation',
        hourlyOperatingCostInr: 38000,
      },
    ];

    // Manpower breakdown
    const pwayHours = Math.round(baseManpowerHours * 0.52);
    const sntHours = Math.round(baseManpowerHours * 0.20);
    const trdHours = Math.round(baseManpowerHours * 0.16);
    const usfdHours = Math.round(baseManpowerHours * 0.12);

    const manpowerHoursBreakdown: ManpowerHourEstimate[] = [
      {
        gangType: 'Permanent Way Maintenance Squad',
        department: 'ENGINEERING (P-WAY)',
        gangStrength: 18,
        totalHours: pwayHours,
        primaryFocus: 'Elastic Rail Clip (ERC) torque renewal, sleeper replacement, joggled fishplate install',
        shiftType: 'Night Mega-Block & Shadow Shifts',
      },
      {
        gangType: 'Signal & Interlocking Specialist Gang',
        department: 'SIGNAL & TELECOM (S&T)',
        gangStrength: 8,
        totalHours: sntHours,
        primaryFocus: 'Point machine 104A throw overhaul, axle counter sensitivity tuning, glued joint renewal',
        shiftType: 'Pre-Dawn Shadow Windows',
      },
      {
        gangType: 'Traction Power Overhead Line Squad',
        department: 'ELECTRICAL (TRD)',
        gangStrength: 6,
        totalHours: trdHours,
        primaryFocus: '25kV catenary tension re-balancing, jumper connector torque check, spark arcing abatement',
        shiftType: 'Traffic Lull Shadow Shifts',
      },
      {
        gangType: 'USFD Ultrasonic Testing Team',
        department: 'SAFETY & USFD',
        gangStrength: 4,
        totalHours: usfdHours,
        primaryFocus: 'Continuous multi-probe ultrasonic rail weld scan to verify crack arrest post-tamping',
        shiftType: 'Daylight Traffic Shadow Block',
      },
    ];

    // Estimated cost
    const machineryCost = machineryHoursBreakdown.reduce((sum, m) => sum + m.hoursRequired * m.hourlyOperatingCostInr, 0);
    const manpowerCost = baseManpowerHours * 750; // standard blended man-hour rate
    const totalCost = Math.round(machineryCost + manpowerCost + 85000); // 85k consumables (ERC clips, liners, grease)

    // Phased Execution Plan
    const phasedExecutionPlan = [
      {
        phaseNumber: 1,
        phaseTitle: 'Immediate Critical Defect Neutralization & USFD Stabilization',
        windowType: 'Night Mega-Block (01:00 – 04:00 hrs)',
        durationHours: 3.0,
        tasks: [
          'Install emergency joggled fishplates on identified ultrasonic rail weld flaws',
          'Overhaul point machine throw motor and lubricate switch expansion joints',
          'Deploy Tower Wagon 04 to re-stagger out-of-tolerance 25kV catenary wire',
        ],
        riskMitigated: 'Derailment risk on switches; prevents brittle weld fracture under dynamic 25T freight axles',
      },
      {
        phaseNumber: 2,
        phaseTitle: 'Deep Ballast Screening & High-Production Tamping Run',
        windowType: 'Night Mega-Block (01:30 – 05:00 hrs)',
        durationHours: 3.5,
        tasks: [
          'Deploy BCM-03 for deep screening of mud-fouled track pockets',
          'Continuous Action Tamper CSM-902 run across target high-degradation chainage',
          'Dynamic Track Stabilizer DGS-01 pass to compact ballast matrix',
        ],
        riskMitigated: 'Eliminates subgrade mud pumping and vertical alignment dips; restores Track Geometry Index',
      },
      {
        phaseNumber: 3,
        phaseTitle: 'Rail Head Profiling & Caution Order Revocation',
        windowType: 'Pre-Dawn Shadow Window (04:30 – 06:30 hrs)',
        durationHours: 2.0,
        tasks: [
          'Rail grinding pass on outer high-stress curves to remove corrugation micro-fissures',
          'Axle counter dual-channel reset and telemetry calibration test',
          'Speed trial run at 100 km/h; certify revocation of temporary caution orders',
        ],
        riskMitigated: 'Restores permissible corridor line speed from 45 km/h to nominal 120–130 km/h',
      },
    ];

    return {
      id: `FORECAST-${corridor.id}-${Date.now()}`,
      corridorId: corridor.id,
      corridorName: corridor.name,
      corridorCode: corridor.code || corridor.id,
      generatedAt: new Date().toISOString(),
      modelUsed: 'gemini-3.8-flash (RDSO Predictive Track Maintenance Model)',
      confidenceScore: 95.8,
      baselineTDI: currentTDI,
      targetSafetyTDI,
      projectedRestoredTDI: targetSafetyTDI - 2,
      targetHealthScore: 86,
      projectedRestoredHealthScore: 88,
      estimatedTotalManpowerHours: baseManpowerHours,
      estimatedTotalMachineryHours: totalMachineryHours,
      estimatedBlockShiftsCount: blockShifts,
      estimatedCostInr: totalCost,
      executiveSummary: `Based on the 30-day degradation velocity (+${degradationRate30Days}% TDI) and current track stress index of ${currentTDI} TDI, restoring ${corridor.name} to target safety standards (${targetSafetyTDI} TDI / Health Score 88%) requires an estimated ${baseManpowerHours} manpower hours across 4 engineering departments and ${totalMachineryHours} heavy machinery hours structured across ${blockShifts} night mega-block shifts. Completing this phased intervention will eliminate ${criticalDefectsCount} critical defects and permit immediate revocation of active caution orders.`,
      phasedExecutionPlan,
      machineryHoursBreakdown,
      manpowerHoursBreakdown,
      safetyStandardRestoration: {
        speedRestrictionReliefKmph: cautionOrdersCount > 0 ? (corridor.speedLimitKmph || 130) - 45 : 30,
        trackGeometryIndexTarget: 86,
        cautionOrderClearedChainage: corridor.id === 'C001' ? 'KM 22.0 – KM 26.8' : 'KM 34.0 – KM 42.0',
        derailmentRiskReductionPercent: 88.5,
      },
    };
  }
}

export const predictiveRepairForecastService = new PredictiveRepairForecastService();
