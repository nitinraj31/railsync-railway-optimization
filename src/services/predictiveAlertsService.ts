import { DailyForecastPoint, Corridor, DeficitAlertThresholdSettings } from '../types';
import { CORRIDOR_SEGMENTS } from './corridorSegmentHeatmapService';

export interface PredictiveCapacityAlert {
  dayNumber: number;
  date: string;
  displayDate: string;
  dayOfWeek: string;
  manpowerRequired: number;
  manpowerAvailable: number;
  manpowerUtilizationPct: number;
  machinerySlotsRequired: number;
  machinerySlotsAvailable: number;
  machineryUtilizationPct: number;
  maxUtilizationPct: number;
  isCapacityStrainExceeded90: boolean;
  primaryConflictDriver: 'Machinery Contention' | 'Manpower Shortage' | 'Simultaneous Heavy Machine & Manpower Shortage';
  driverCategory: 'MACHINERY' | 'MANPOWER';
  affectedSectionName: string;
  affectedSectionCode: string;
  corridorId: string;
  corridorName: string;
  conflictDriverJustification: string;
  rootCauseMaintenanceCycle: string;
  recommendedMitigationAction: string;
  mitigationUrgency: 'CRITICAL' | 'HIGH' | 'ELEVATED';
}

export interface PredictiveAlertsSummary {
  totalAnalyzedDays: number;
  strainDaysCount: number;
  machineryContentionCount: number;
  manpowerShortageCount: number;
  peakStrainDate: string | null;
  peakStrainPct: number;
  dominantNetworkDriver: string;
  alerts: PredictiveCapacityAlert[];
}

export class PredictiveAlertsService {
  /**
   * Evaluates each forecast day to detect dates where resource demand exceeds 90% of sectional capacity.
   * Determines the primary conflict driver (e.g. 'Machinery Contention' or 'Manpower Shortage') and produces
   * detailed engineering justifications.
   */
  public evaluatePredictiveAlerts(
    forecastPoints: DailyForecastPoint[],
    selectedCorridorId: string = 'ALL',
    corridors: Corridor[] = [],
    thresholdSettings?: DeficitAlertThresholdSettings
  ): PredictiveAlertsSummary {
    const alerts: PredictiveCapacityAlert[] = [];
    let machineryContentionCount = 0;
    let manpowerShortageCount = 0;
    let peakStrainPct = 0;
    let peakStrainDate: string | null = null;

    const corridorMap = new Map<string, Corridor>();
    corridors.forEach((c) => corridorMap.set(c.id, c));

    // Target segments
    const activeSegments =
      selectedCorridorId === 'ALL'
        ? CORRIDOR_SEGMENTS
        : CORRIDOR_SEGMENTS.filter((s) => s.corridorId === selectedCorridorId);

    forecastPoints.forEach((pt) => {
      // 1. Manpower Utilization % against available headcount
      const mpAvail = Math.max(1, pt.manpowerAvailable);
      const mpReq = pt.manpowerRequired;
      const mpUtil = Math.round((mpReq / mpAvail) * 100);

      // 2. Machinery Slots Utilization % against available slots
      const machAvail = Math.max(1, pt.machinerySlotsAvailable || 8);
      const machReq = pt.machinerySlotsRequired || 7;
      const machUtil = Math.round((machReq / machAvail) * 100);

      // 3. Sectional Capacity Analysis
      // Check individual railway segments in the corridor
      let highestSegUtil = 0;
      let worstSegment = activeSegments[0] || CORRIDOR_SEGMENTS[0];

      activeSegments.forEach((seg) => {
        const segBaseMp = Math.round(seg.tracksCount * 7.5 + (seg.lengthKm / 10) * 3);
        const segBaseMach = Math.round(seg.tracksCount * 0.75 + 1);

        // Segment demand estimation matching railway cyclic maintenance
        const cyclicWave = ((pt.dayNumber * 3 + seg.fromKm) % 7) / 7;
        let baseDemandLoad = (seg.criticality === 'CRITICAL' ? 14 : seg.criticality === 'HIGH' ? 10 : 7) + cyclicWave * 6;
        if (pt.dayOfWeek === 'Sat' || pt.dayOfWeek === 'Sun') {
          baseDemandLoad += seg.tracksCount * 2.5;
        }

        let segMp = Math.round(baseDemandLoad);
        let segMach = Math.max(1, Math.round(baseDemandLoad / 8));

        // Domain maintenance cluster spikes
        if (seg.id === 'C003-S2' && pt.dayNumber >= 9 && pt.dayNumber <= 11) {
          segMp += 28;
          segMach += 3;
        } else if (seg.id === 'C001-S1' && (pt.dayNumber === 7 || pt.dayNumber === 8)) {
          segMp += 20;
          segMach += 2;
        } else if (seg.id === 'C003-S3' && (pt.dayNumber === 18 || pt.dayNumber === 19)) {
          segMp += 22;
          segMach += 2;
        } else if (seg.id === 'C003-S2' && pt.dayNumber >= 23 && pt.dayNumber <= 25) {
          segMp += 24;
          segMach += 3;
        } else if (seg.id === 'C001-S2' && (pt.dayNumber === 14 || pt.dayNumber === 15)) {
          segMp += 18;
          segMach += 2;
        }

        const segMpPct = Math.round((segMp / Math.max(1, segBaseMp)) * 100);
        const segMachPct = Math.round((segMach / Math.max(1, segBaseMach)) * 100);
        const segMaxUtil = Math.max(segMpPct, segMachPct);

        if (segMaxUtil > highestSegUtil) {
          highestSegUtil = segMaxUtil;
          worstSegment = seg;
        }
      });

      // Overall demand utilization against capacity (maximum of corridor aggregate or critical sectional strain)
      const maxOverallPct = Math.max(mpUtil, machUtil, highestSegUtil);
      const isStrain = maxOverallPct >= 90;

      // Determine Primary Conflict Driver
      let primaryDriver: 'Machinery Contention' | 'Manpower Shortage' | 'Simultaneous Heavy Machine & Manpower Shortage';
      let driverCategory: 'MACHINERY' | 'MANPOWER';
      let conflictJustification = '';
      let rootCauseCycle = '';
      let mitigationAction = '';
      let urgency: 'CRITICAL' | 'HIGH' | 'ELEVATED' = 'ELEVATED';

      if (machUtil > mpUtil + 5 || (machUtil >= 95 && machUtil >= mpUtil)) {
        primaryDriver = 'Machinery Contention';
        driverCategory = 'MACHINERY';
        machineryContentionCount++;
        urgency = machUtil >= 105 ? 'CRITICAL' : 'HIGH';

        rootCauseCycle =
          pt.dayOfWeek === 'Sat' || pt.dayOfWeek === 'Sun'
            ? 'Weekend Mega-Block multi-machine cluster (CSM Tie Tamper + Ballast Regulator simultaneous slot claim)'
            : 'Cyclic 50 GMT track renewal & BCM ballast deep screening window competing with scheduled freight path';

        conflictJustification = `Machinery demand exceeds ${machUtil}% of sectional machine slot allowance (${pt.machinerySlotsRequired || 7} machine slots required vs ${pt.machinerySlotsAvailable || 8} available). Tie Tampers (CSM/09-3X) and Ballast Regulators are competing for identical track headway blocks on ${worstSegment?.name || 'Corridor Route'}.`;

        mitigationAction =
          'Stagger Tie Tamper block to pre-dawn shadow window (02:00 - 04:30) or mobilize Standby Track Stabilizer from adjacent depot to avoid train path cancellation.';
      } else if (mpUtil > machUtil + 5 || (mpUtil >= 95 && mpUtil >= machUtil)) {
        primaryDriver = 'Manpower Shortage';
        driverCategory = 'MANPOWER';
        manpowerShortageCount++;
        urgency = mpUtil >= 105 ? 'CRITICAL' : 'HIGH';

        rootCauseCycle =
          pt.dayNumber % 7 === 0 || pt.dayNumber % 7 === 6
            ? 'Mandatory 28D USFD ultrasonic rail flaw detection wave requiring high-density lookout gangs and manual PWI crews'
            : '21D Traction 25kV OHE catenary insulator inspection & turnout re-sleepering cycle';

        conflictJustification = `Manpower demand exceeds ${mpUtil}% of sectional gang capacity (${pt.manpowerRequired} staff required vs ${pt.manpowerAvailable} available). Trade deficits identified in P-Way Trackmen (-${Math.max(1, pt.manpowerRequired - pt.manpowerAvailable)} staff) and Traction TRD linesmen, breaching statutory safety coverage ratios.`;

        mitigationAction =
          'Mobilize Standby Reserve Gang from Central Depot or authorize authorized overtime rotation to satisfy IR-TMM lookout safety regulations.';
      } else {
        // High simultaneous saturation
        primaryDriver = 'Simultaneous Heavy Machine & Manpower Shortage';
        driverCategory = machUtil >= mpUtil ? 'MACHINERY' : 'MANPOWER';
        if (machUtil >= mpUtil) machineryContentionCount++;
        else manpowerShortageCount++;
        urgency = 'CRITICAL';

        rootCauseCycle = 'Concurrent 50 GMT Track Renewal + USFD Defect Rectification Major Possession';
        conflictJustification = `Simultaneous dual-resource bottleneck: Machine slot saturation at ${machUtil}% and gang headcount saturation at ${mpUtil}% across ${worstSegment?.shortCode || 'Section'}. High risk of block overrun.`;
        mitigationAction = 'Issue PWI caution order and reassign secondary yard gangs to cover essential lookout posts.';
      }

      if (isStrain && maxOverallPct > peakStrainPct) {
        peakStrainPct = maxOverallPct;
        peakStrainDate = pt.displayDate;
      }

      alerts.push({
        dayNumber: pt.dayNumber,
        date: pt.date,
        displayDate: pt.displayDate,
        dayOfWeek: pt.dayOfWeek,
        manpowerRequired: pt.manpowerRequired,
        manpowerAvailable: pt.manpowerAvailable,
        manpowerUtilizationPct: mpUtil,
        machinerySlotsRequired: pt.machinerySlotsRequired || 7,
        machinerySlotsAvailable: pt.machinerySlotsAvailable || 8,
        machineryUtilizationPct: machUtil,
        maxUtilizationPct: maxOverallPct,
        isCapacityStrainExceeded90: isStrain,
        primaryConflictDriver: primaryDriver,
        driverCategory,
        affectedSectionName: worstSegment?.name || 'Trunk Railway Section',
        affectedSectionCode: worstSegment?.shortCode || 'NDLS-MAIN',
        corridorId: worstSegment?.corridorId || selectedCorridorId,
        corridorName:
          corridorMap.get(worstSegment?.corridorId || selectedCorridorId)?.name || 'High Density Corridor',
        conflictDriverJustification: conflictJustification,
        rootCauseMaintenanceCycle: rootCauseCycle,
        recommendedMitigationAction: mitigationAction,
        mitigationUrgency: urgency,
      });
    });

    const strainDays = alerts.filter((a) => a.isCapacityStrainExceeded90);

    return {
      totalAnalyzedDays: forecastPoints.length,
      strainDaysCount: strainDays.length,
      machineryContentionCount,
      manpowerShortageCount,
      peakStrainDate,
      peakStrainPct,
      dominantNetworkDriver:
        machineryContentionCount >= manpowerShortageCount
          ? 'Machinery Contention (Tie Tamper & Machine Slot Saturation)'
          : 'Manpower Shortage (P-Way Gang & Safety Lookout Shortfall)',
      alerts,
    };
  }
}

export const predictiveAlertsService = new PredictiveAlertsService();
