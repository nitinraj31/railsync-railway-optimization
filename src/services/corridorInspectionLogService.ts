import { Corridor, MaintenanceTask, DepartmentType } from '../types';
import { mockStore } from './api';

export interface DefectSeverityLogPoint {
  logId: string;
  logIndex: number; // 1 to 5
  dateStr: string;
  displayDate: string;
  daysAgo: number;
  inspectionType: string;
  severityScore: number; // 0 to 100
  recordedTDI: number;
  recordedGaugeDeviationMm: number;
  inspectorInitials: string;
  statusTag: 'CRITICAL' | 'HIGH' | 'MONITORED' | 'STABLE';
  logSummary: string;
}

export interface DefectLocationInspectionLog {
  id: string;
  locationName: string;
  chainage: string;
  trackLine: string;
  assetId: string;
  defectType: string;
  defectCategory: 'TRACK_GEOMETRY' | 'RAIL_FLAW' | 'TURNOUT_FATIGUE' | 'OHE_INTERLOCKING' | 'BALLAST_SUBGRADE';
  currentSeverity: number; // 0 - 100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CLEAR';
  speedRestrictionKmph?: number;
  recommendedDepartment: DepartmentType;
  recommendedTaskType: string;
  recommendedDurationMinutes: number;
  recommendedMachineryAsset: string;
  recommendedAction: string;
  primaryCause: string;
  safetyViolationRisk: string;
  last5Logs: DefectSeverityLogPoint[];
  followUpTaskId?: string;
  followUpScheduledDate?: string;
}

export interface DateInspectionReport {
  id: string;
  dateStr: string;
  displayDate: string;
  dayNumber: number;
  isProjected: boolean;
  corridorId: string;
  corridorName: string;
  corridorCode: string;
  inspectorName: string;
  inspectorDesignation: string;
  inspectionUnit: string;
  inspectionMethodology: string;
  shiftWindow: string;
  weatherCondition: string;
  ambientTemperatureC: number;
  railTemperatureC: number;
  ballastMoisturePercent: number;
  recordedTDI: number;
  recordedHealthScore: number;
  criticalThreshold: number;
  isExceedingThreshold: boolean;
  recordedGeometry: {
    gaugeDeviationMm: number; // e.g. +2.4 mm
    crossLevelTwistMmPerM: number; // e.g. 1.8 mm/m
    verticalUnevennessMm: number; // e.g. 3.2 mm
    alignmentDriftMm: number; // e.g. 2.7 mm
    trackGeometryIndexTGI: number; // e.g. 78 / 100
    rideComfortIndex: number; // e.g. 2.85
  };
  executiveObservation: string;
  correctivePriorityRecommendation: string;
  defectLocations: DefectLocationInspectionLog[];
}

class CorridorInspectionLogService {
  /**
   * Generate or retrieve detailed date inspection report for a specific data point
   */
  public getDateInspectionReport(
    dateStr: string,
    dayNumber: number,
    corridor: Corridor,
    recordedTDI: number,
    recordedHealthScore: number,
    criticalThreshold: number,
    isProjected: boolean
  ): DateInspectionReport {
    const reportDate = new Date(dateStr);
    const displayDate = reportDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const isExceeding = recordedTDI >= criticalThreshold;

    // Realistic inspection units and inspectors based on corridor
    const inspectors = [
      { name: 'Er. Rajesh K. Sharma', desig: 'Senior Section Engineer (P-Way)', unit: 'Ghaziabad P-Way Division' },
      { name: 'Dr. Anita Roy', desig: 'Assistant Divisional Engineer (Track)', unit: 'Delhi Track Monitoring Cell' },
      { name: 'Er. Vivek Murthy', desig: 'Senior Divisional Signal & Telecom Engineer', unit: 'S&T Interlocking Inspection Wing' },
      { name: 'Er. S. Balachandran', desig: 'Executive Engineer (OHE / TRD)', unit: 'Traction Distribution Rapid Squad' },
    ];
    const inspector = inspectors[(dayNumber + corridor.name.length) % inspectors.length];

    // Methodologies
    const methodologies = isProjected
      ? 'Forward Predictive Degradation Vector Model (RDSO 7-Day Cycle Extrapolation)'
      : dayNumber % 3 === 0
      ? 'Continuous Laser Track Geometry Car (TRC-790) & USFD Flaw Scanner'
      : dayNumber % 2 === 0
      ? 'Ultrasonic Rail Flaw Detection (USFD-Double Rail Trolley) + High-Res Video'
      : 'Foot-Patrol Keyman & SSE (P-Way) Manual Track Gauge & Optical Level Inspection';

    // Geometry telemetry based on TDI
    const gaugeDeviationMm = +(1.2 + (recordedTDI / 100) * 2.8).toFixed(1);
    const crossLevelTwistMmPerM = +(0.8 + (recordedTDI / 100) * 2.2).toFixed(1);
    const verticalUnevennessMm = +(1.5 + (recordedTDI / 100) * 3.4).toFixed(1);
    const alignmentDriftMm = +(1.1 + (recordedTDI / 100) * 2.6).toFixed(1);
    const trackGeometryIndexTGI = Math.max(48, Math.round(92 - recordedTDI * 0.45));
    const rideComfortIndex = +(2.1 + (recordedTDI / 100) * 1.5).toFixed(2);

    // Weather condition
    const temps = [34, 37, 39, 36, 35, 38];
    const ambTemp = temps[dayNumber % temps.length];
    const railTemp = ambTemp + 7;
    const moisture = Math.max(8, Math.min(32, Math.round(14 + Math.sin(dayNumber) * 8)));

    // Generate location logs with 5-point historical severity sparkline
    const defectLocations = this.generateDefectLocations(
      corridor,
      dayNumber,
      dateStr,
      recordedTDI,
      criticalThreshold,
      isProjected
    );

    const reportId = `INSP-${corridor.id}-${dateStr}`;

    return {
      id: reportId,
      dateStr,
      displayDate,
      dayNumber,
      isProjected,
      corridorId: corridor.id,
      corridorName: corridor.name,
      corridorCode: corridor.code || corridor.id,
      inspectorName: inspector.name,
      inspectorDesignation: inspector.desig,
      inspectionUnit: inspector.unit,
      inspectionMethodology: methodologies,
      shiftWindow: isProjected
        ? 'Projected Maintenance Window (Planned Shift)'
        : dayNumber % 2 === 0
        ? '05:30 – 09:30 IST (Morning Shadow Patrol)'
        : '01:30 – 04:30 IST (Night Mega-Block Window)',
      weatherCondition:
        moisture > 22
          ? 'Post-Monsoon High Subgrade Moisture & Soil Softening'
          : ambTemp > 37
          ? 'High Ambient Thermal Track Expansion (Thermal Stress Peak)'
          : 'Normal Autumn Conditions, Stable Ballast Drainage',
      ambientTemperatureC: ambTemp,
      railTemperatureC: railTemp,
      ballastMoisturePercent: moisture,
      recordedTDI,
      recordedHealthScore,
      criticalThreshold,
      isExceedingThreshold: isExceeding,
      recordedGeometry: {
        gaugeDeviationMm,
        crossLevelTwistMmPerM,
        verticalUnevennessMm,
        alignmentDriftMm,
        trackGeometryIndexTGI,
        rideComfortIndex,
      },
      executiveObservation: isProjected
        ? `Model predicts accelerated wear on ${corridor.name} reaching ${recordedTDI} TDI by ${displayDate}. Without corrective tamping and fishplate torque calibration, turnout tolerance margins will erode into caution order territory.`
        : isExceeding
        ? `CRITICAL ALERT: Recorded Track Degradation Index of ${recordedTDI} TDI exceeds maximum corridor tolerance (${criticalThreshold} TDI). Rapid defect severity escalation detected at turnout clusters and bridge approaches. Immediate follow-up track maintenance block mandated under RDSO guidelines.`
        : `Inspection recorded ${recordedTDI} TDI with Track Geometry Index at ${trackGeometryIndexTGI}/100. Localized fatigue detected at heavy axle-load crossover junctions, but overall line condition remains within safe operating parameters.`,
      correctivePriorityRecommendation: isExceeding
        ? 'Mandate 2.5h Night Mega-Block within 48 hours for continuous action tamping (CSM-902) and USFD flaw clamp renewal.'
        : 'Schedule routine follow-up maintenance during next scheduled off-peak window for ballast packing and switch joint lubrication.',
      defectLocations,
    };
  }

  /**
   * Generates location-specific defect logs including 5-historical severity trend points for sparklines
   */
  private generateDefectLocations(
    corridor: Corridor,
    dayNumber: number,
    baseDateStr: string,
    corridorTDI: number,
    criticalThreshold: number,
    isProjected: boolean
  ): DefectLocationInspectionLog[] {
    const baseDate = new Date(baseDateStr);

    // Specific landmark templates for realistic railway track sections
    const templateLocations = [
      {
        locationName: 'Sahibabad Junction Crossover & Turnout 104A',
        chainage: 'KM 24.200 – KM 25.100',
        trackLine: 'Up Fast Trunk Line',
        defectType: 'Point Machine Tongue Rail Clearance Deficit & USFD Flaw',
        category: 'TURNOUT_FATIGUE' as const,
        recommendedDepartment: 'ENGINEERING' as const,
        recommendedTaskType: 'TURNOUT_RENEWAL_TAMPING',
        recommendedDurationMinutes: 150,
        recommendedMachineryAsset: 'CSM-902 Duomatic Tamping Unit',
        primaryCause: 'High axle-load freight divergence generating lateral dynamic shock on switch toe',
        safetyViolationRisk: 'Flange climbing propensity during 110 km/h train facing movements',
        baseSeverity: Math.min(95, Math.round(corridorTDI * 0.95 + 12)),
        speedRestrictionKmph: corridorTDI >= criticalThreshold ? 45 : undefined,
      },
      {
        locationName: 'Anand Vihar Terminal Approach Crossover',
        chainage: 'KM 15.400 – KM 16.200',
        trackLine: 'Down Fast Line & Loop Entry',
        defectType: 'Rail Head Micro-Spalling & Gauge Face Wear',
        category: 'RAIL_FLAW' as const,
        recommendedDepartment: 'ENGINEERING' as const,
        recommendedTaskType: 'RAIL_GRINDING_PROFILING',
        recommendedDurationMinutes: 120,
        recommendedMachineryAsset: 'RG-30 Rail Grinding Machine',
        primaryCause: 'Wheel-rail contact rolling contact fatigue (RCF) due to dense suburban EMU braking',
        safetyViolationRisk: 'Transverse fissure growth risking catastrophic rail break',
        baseSeverity: Math.min(92, Math.round(corridorTDI * 0.88 + 8)),
        speedRestrictionKmph: corridorTDI >= criticalThreshold ? 60 : undefined,
      },
      {
        locationName: 'Yamuna River Major Bridge No. 24 Pier Approach',
        chainage: 'KM 08.200 – KM 09.000',
        trackLine: 'Up & Down Reversible Line',
        defectType: 'Bridge Sleeper Pad Relaxation & Expansion Joint Gap Drift',
        category: 'TRACK_GEOMETRY' as const,
        recommendedDepartment: 'ENGINEERING' as const,
        recommendedTaskType: 'BRIDGE_EXPANSION_MAINTENANCE',
        recommendedDurationMinutes: 90,
        recommendedMachineryAsset: 'Bridge Inspection Hydraulic Gang & Torque Rig',
        primaryCause: 'Thermal contraction differential between steel girder spans and concrete approach sleepers',
        safetyViolationRisk: 'Vertical track jerk causing excessive bridge structural vibration',
        baseSeverity: Math.min(84, Math.round(corridorTDI * 0.76 + 5)),
      },
      {
        locationName: 'Ghaziabad Outer Yard Interlocking Throat',
        chainage: 'KM 33.600 – KM 34.800',
        trackLine: 'Freight Bypass & Main Trunk',
        defectType: 'Catenary Dropper Thermal Slack & Arcing Hotspot',
        category: 'OHE_INTERLOCKING' as const,
        recommendedDepartment: 'TRACTION' as const,
        recommendedTaskType: 'OHE_CATENARY_TENSIONING',
        recommendedDurationMinutes: 120,
        recommendedMachineryAsset: 'TRD-04 Overhead Tower Wagon',
        primaryCause: 'Current collection contact wire grooving from high-tonnage freight electric locomotives',
        safetyViolationRisk: 'Pantograph entanglement risking corridor power shutdown',
        baseSeverity: Math.min(88, Math.round(corridorTDI * 0.82 + 6)),
      },
      {
        locationName: 'Chander Nagar Curve Transition Spiral',
        chainage: 'KM 19.800 – KM 20.600',
        trackLine: 'Up Main Track',
        defectType: 'Ballast Cavitation & Sleepers Pumping Mud',
        category: 'BALLAST_SUBGRADE' as const,
        recommendedDepartment: 'ENGINEERING' as const,
        recommendedTaskType: 'BALLAST_CLEANING_PACKING',
        recommendedDurationMinutes: 180,
        recommendedMachineryAsset: 'BCM-03 Ballast Cleaning Machine',
        primaryCause: 'Subgrade water stagnation from defective cess drainage after heavy monsoon rain',
        safetyViolationRisk: 'Differential track settlement and cross-level twist instability',
        baseSeverity: Math.min(80, Math.round(corridorTDI * 0.72 + 2)),
      },
    ];

    return templateLocations.map((tpl, idx) => {
      // Calculate 5 historical severity log points leading up to this date
      const last5Logs: DefectSeverityLogPoint[] = [];

      // Determine progression pattern (escalating vs stable)
      const isRapidEscalator = idx === 0 || corridorTDI >= criticalThreshold;
      const currentSev = Math.min(98, Math.max(25, tpl.baseSeverity + (idx === 0 && isProjected ? 6 : 0)));

      for (let step = 4; step >= 0; step--) {
        const logDate = new Date(baseDate);
        logDate.setDate(baseDate.getDate() - step * 5); // 5 inspection intervals (every 5-6 days)

        const daysAgo = step * 5;
        const progressFromOldest = (4 - step) / 4; // 0 (oldest) to 1 (current)

        let stepSeverity: number;
        if (isRapidEscalator) {
          // Accelerating upwards: e.g. 42 -> 56 -> 68 -> 79 -> 88
          const initialSeverity = Math.max(22, Math.round(currentSev * 0.52));
          stepSeverity = Math.round(
            initialSeverity + (currentSev - initialSeverity) * Math.pow(progressFromOldest, 1.3)
          );
        } else if (idx === 3) {
          // Fluctuating moderate: e.g. 48 -> 55 -> 50 -> 60 -> 64
          stepSeverity = Math.round(currentSev * 0.75 + Math.sin(step) * 6 + progressFromOldest * 10);
        } else {
          // Slow steady rise: e.g. 35 -> 38 -> 42 -> 45 -> 48
          stepSeverity = Math.round(currentSev * 0.7 + progressFromOldest * (currentSev * 0.3));
        }

        stepSeverity = Math.max(15, Math.min(99, stepSeverity));

        const statusTag: 'CRITICAL' | 'HIGH' | 'MONITORED' | 'STABLE' =
          stepSeverity >= 80 ? 'CRITICAL' : stepSeverity >= 60 ? 'HIGH' : stepSeverity >= 40 ? 'MONITORED' : 'STABLE';

        const types = [
          'Routine Manual Gauge Trolley Scan',
          'Laser Profile TRC Track Run',
          'Specialist P-Way Night Foot Patrol',
          'Automated USFD Acoustic Scanner',
          'Integrated Telemetry Inspection',
        ];

        last5Logs.push({
          logId: `LOG-${corridor.id}-${idx + 1}-S${5 - step}`,
          logIndex: 5 - step,
          dateStr: logDate.toISOString().split('T')[0],
          displayDate: logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          daysAgo,
          inspectionType: types[(idx + step) % types.length],
          severityScore: stepSeverity,
          recordedTDI: Math.max(20, Math.min(96, Math.round(stepSeverity * 0.92 + 4))),
          recordedGaugeDeviationMm: +(1.0 + (stepSeverity / 100) * 3.0).toFixed(1),
          inspectorInitials: ['RKS', 'AR', 'VM', 'SB', 'DPT'][(idx + step) % 5],
          statusTag,
          logSummary:
            stepSeverity >= 80
              ? `Critical stress threshold reached; ${tpl.defectType} observed with high dynamic oscillation`
              : stepSeverity >= 60
              ? `Elevated wear recorded; accelerated degradation noted under freight haulage`
              : `Nominal progression within acceptable tolerance; monitoring scheduled`,
        });
      }

      const riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'CLEAR' =
        currentSev >= 80 ? 'CRITICAL' : currentSev >= 60 ? 'HIGH' : currentSev >= 40 ? 'MEDIUM' : 'CLEAR';

      return {
        id: `LOC-${corridor.id}-${idx + 1}`,
        locationName: tpl.locationName,
        chainage: tpl.chainage,
        trackLine: tpl.trackLine,
        assetId: `TRK-${corridor.id}-${100 + idx * 12}`,
        defectType: tpl.defectType,
        defectCategory: tpl.category,
        currentSeverity: currentSev,
        riskLevel,
        speedRestrictionKmph: tpl.speedRestrictionKmph,
        recommendedDepartment: tpl.recommendedDepartment,
        recommendedTaskType: tpl.recommendedTaskType,
        recommendedDurationMinutes: tpl.recommendedDurationMinutes,
        recommendedMachineryAsset: tpl.recommendedMachineryAsset,
        recommendedAction: `Deploy ${tpl.recommendedMachineryAsset} during a ${tpl.recommendedDurationMinutes} min block to address ${tpl.defectType}.`,
        primaryCause: tpl.primaryCause,
        safetyViolationRisk: tpl.safetyViolationRisk,
        last5Logs,
      };
    });
  }

  /**
   * Schedule a new maintenance task for the specific defect location
   */
  public scheduleFollowUpTask(
    defectLocation: DefectLocationInspectionLog,
    report: DateInspectionReport,
    corridor: Corridor,
    customTimeWindow?: string,
    customDate?: string
  ): MaintenanceTask {
    const today = new Date();
    // Schedule for upcoming night or 1-2 days ahead
    const followUpDate = customDate || new Date(today.getTime() + 86400000 * 2).toISOString().split('T')[0];
    const taskIdNumber = Math.floor(1000 + Math.random() * 9000);
    const taskId = `TSK-${taskIdNumber}`;

    const newTask: MaintenanceTask = {
      id: `TASK-${corridor.id}-${defectLocation.id}-${Date.now()}`,
      taskId,
      assetId: defectLocation.assetId,
      department: defectLocation.recommendedDepartment,
      taskType: defectLocation.recommendedTaskType,
      description: `Follow-up maintenance for ${defectLocation.defectType} at ${defectLocation.chainage} (${defectLocation.locationName}) based on ${report.displayDate} inspection (Severity: ${defectLocation.currentSeverity}/100, TDI: ${report.recordedTDI})`,
      corridorId: corridor.id,
      durationMinutes: defectLocation.recommendedDurationMinutes || 120,
      priority: defectLocation.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      status: 'SCHEDULED',
      preferredTimeWindow: customTimeWindow || '01:30 - 04:00 (Night Mega-Block)',
      requestedDate: followUpDate,
    };

    // Persist into mockStore
    mockStore.addMaintenanceTask(newTask);

    // Update in-memory reference
    defectLocation.followUpTaskId = taskId;
    defectLocation.followUpScheduledDate = followUpDate;

    return newTask;
  }
}

export const corridorInspectionLogService = new CorridorInspectionLogService();
