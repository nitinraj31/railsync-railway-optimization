import {
  DailyForecastPoint,
  ForecastHorizonDays,
  ForecastScenarioType,
  DeficitAlertThresholdSettings,
} from '../types';

export interface CorridorSegment {
  id: string; // e.g. 'C001-S1'
  corridorId: string; // 'C001'
  corridorName: string;
  name: string; // 'Central Jct — Anand Vihar Terminal'
  shortCode: string; // 'NDLS-ANVT'
  fromKm: number;
  toKm: number;
  lengthKm: number;
  tracksCount: number;
  trackType: string;
  speedLimitKmph: number;
  criticality: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  primaryAssetTypes: string[];
}

export interface SegmentDailyIntensity {
  segmentId: string;
  corridorId: string;
  segmentName: string;
  shortCode: string;
  dayNumber: number;
  date: string;
  displayDate: string;
  dayOfWeek: string;
  
  // Consumption Intensity Metrics (0 to 100+%)
  intensityPct: number; // Overall resource consumption index (0-100+)
  manpowerIntensityPct: number;
  machineryIntensityPct: number;
  intensityLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'PEAK_CLUSTER';

  // Specific Resource Quantities
  manpowerRequired: number;
  manpowerAvailable: number;
  manpowerDeficit: number;
  machinerySlotsRequired: number;
  machinerySlotsAvailable: number;
  machineryDeficit: number;
  activeMachineryTypes: string[];

  // Operational Context
  primaryWorkDriver: string;
  assetTarget: string;
  isPeakCluster: boolean;
  clusterId?: string;
  clusterTitle?: string;
  mitigationRecommendation: string;
}

export interface PeakDemandCluster {
  clusterId: string;
  clusterTitle: string;
  segmentId: string;
  segmentName: string;
  corridorId: string;
  corridorName: string;
  startDay: number;
  endDay: number;
  peakDay: number;
  durationDays: number;
  maxIntensityPct: number;
  totalManpowerDeficit: number;
  totalMachineryDeficit: number;
  primaryWorkDriver: string;
  requiredMachinery: string[];
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  suggestedAction: string;
}

export const CORRIDOR_SEGMENTS: CorridorSegment[] = [
  {
    id: 'C001-S1',
    corridorId: 'C001',
    corridorName: 'Northern Main Trunk',
    name: 'Central Jct — Anand Vihar Terminal',
    shortCode: 'NDLS-ANVT',
    fromKm: 0.0,
    toKm: 14.5,
    lengthKm: 14.5,
    tracksCount: 4,
    trackType: '60kg PSC Sleeper / Quad Track',
    speedLimitKmph: 130,
    criticality: 'CRITICAL',
    primaryAssetTypes: ['Electronic Interlocking RRI-01', 'Point & Crossing Turnout #14B', '25kV Catenary OHE'],
  },
  {
    id: 'C001-S2',
    corridorId: 'C001',
    corridorName: 'Northern Main Trunk',
    name: 'Anand Vihar — Ghaziabad Gateway',
    shortCode: 'ANVT-GZB',
    fromKm: 14.5,
    toKm: 42.5,
    lengthKm: 28.0,
    tracksCount: 4,
    trackType: 'Continuous Welded Rail (60kg)',
    speedLimitKmph: 130,
    criticality: 'HIGH',
    primaryAssetTypes: ['Continuous Welded Rail T-01', 'Traction Substation TSS-01', 'Automatic Signaling Block'],
  },
  {
    id: 'C002-S1',
    corridorId: 'C002',
    corridorName: 'Southern High-Speed Spur',
    name: 'Central Jct — Okhla Urban Section',
    shortCode: 'NDLS-OKA',
    fromKm: 0.0,
    toKm: 15.8,
    lengthKm: 15.8,
    tracksCount: 3,
    trackType: 'Heavy Density Commuter Triple Track',
    speedLimitKmph: 120,
    criticality: 'HIGH',
    primaryAssetTypes: ['Okhla Junction Interlocking', 'Overhead Catenary Feeder', 'Axle Counter Block'],
  },
  {
    id: 'C002-S2',
    corridorId: 'C002',
    corridorName: 'Southern High-Speed Spur',
    name: 'Okhla — Faridabad Cantt High-Speed',
    shortCode: 'OKA-FDB',
    fromKm: 15.8,
    toKm: 34.2,
    lengthKm: 18.4,
    tracksCount: 3,
    trackType: '140km/h Vande Bharat High-Speed Track',
    speedLimitKmph: 140,
    criticality: 'CRITICAL',
    primaryAssetTypes: ['Vande Bharat Track Bed', 'Digital Axle Counters DAC-03', 'Cantt Section Turnouts'],
  },
  {
    id: 'C003-S1',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    name: 'Central Jct — Shakurbasti Freight Yard',
    shortCode: 'NDLS-SSB',
    fromKm: 0.0,
    toKm: 24.2,
    lengthKm: 24.2,
    tracksCount: 2,
    trackType: 'Freight Marshalling & Yard Approaches',
    speedLimitKmph: 100,
    criticality: 'HIGH',
    primaryAssetTypes: ['Shakurbasti Point Machine PM-04', 'Freight Yard Marshalling Track', '25kV Switching Post'],
  },
  {
    id: 'C003-S2',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    name: 'Shakurbasti — Bahadurgarh Ballast Zone',
    shortCode: 'SSB-BGZ',
    fromKm: 24.2,
    toKm: 46.0,
    lengthKm: 21.8,
    tracksCount: 2,
    trackType: '25-Tonne Axle Load Heavy Freight Double Track',
    speedLimitKmph: 110,
    criticality: 'CRITICAL',
    primaryAssetTypes: ['KM 27.4 Ballast Pocket Slurry Zone', 'Heavy Haul Rail Bed', 'Track Section T-03 West'],
  },
  {
    id: 'C003-S3',
    corridorId: 'C003',
    corridorName: 'Western Heavy Freight & Passenger',
    name: 'Bahadurgarh — Rohtak Yard Heavy Curve',
    shortCode: 'BGZ-ROK',
    fromKm: 46.0,
    toKm: 68.0,
    lengthKm: 22.0,
    tracksCount: 2,
    trackType: 'Heavy Curvature High-Wear Freight Track',
    speedLimitKmph: 110,
    criticality: 'CRITICAL',
    primaryAssetTypes: ['Rohtak Yard Approaches', 'USFD Rail Flaw Detection Sector', 'Diamond Crossing Turnout'],
  },
  {
    id: 'C004-S1',
    corridorId: 'C004',
    corridorName: 'Eastern Mixed Express Link',
    name: 'Ghaziabad — Hapur Junction Sector',
    shortCode: 'GZB-HPU',
    fromKm: 0.0,
    toKm: 38.0,
    lengthKm: 38.0,
    tracksCount: 2,
    trackType: 'Mixed Express Double Track',
    speedLimitKmph: 120,
    criticality: 'MEDIUM',
    primaryAssetTypes: ['Hapur Junction Relay Cabin', 'Continuous Welded Rail T-04', 'Overhead Section Insulator'],
  },
  {
    id: 'C004-S2',
    corridorId: 'C004',
    corridorName: 'Eastern Mixed Express Link',
    name: 'Hapur — Moradabad Interchange Line',
    shortCode: 'HPU-MBR',
    fromKm: 38.0,
    toKm: 85.6,
    lengthKm: 47.6,
    tracksCount: 2,
    trackType: 'Long-Distance Express Trunk Corridor',
    speedLimitKmph: 120,
    criticality: 'HIGH',
    primaryAssetTypes: ['Subgrade Stabilization Sector', 'Moradabad Catenary Section', 'Automatic Block Signal AB-08'],
  },
];

class CorridorSegmentHeatmapService {
  /**
   * Computes the 2D matrix of daily resource consumption intensity across corridor segments.
   */
  public computeSegmentDailyIntensityMatrix(
    dailyForecastPoints: DailyForecastPoint[],
    scenario: ForecastScenarioType = 'BASELINE',
    corridorFilter: string = 'ALL',
    thresholdSettings?: DeficitAlertThresholdSettings
  ): {
    matrix: SegmentDailyIntensity[];
    segments: CorridorSegment[];
    clusters: PeakDemandCluster[];
    maxIntensityAcrossBoard: number;
    peakClusterCount: number;
  } {
    // Filter segments if corridor is filtered
    const activeSegments =
      corridorFilter === 'ALL'
        ? CORRIDOR_SEGMENTS
        : CORRIDOR_SEGMENTS.filter((s) => s.corridorId === corridorFilter);

    const matrix: SegmentDailyIntensity[] = [];

    // Scenario load multiplier
    const scenarioFactors: Record<ForecastScenarioType, number> = {
      BASELINE: 1.0,
      MONSOON_MOISTURE: 1.25,
      FREIGHT_SURGE: 1.2,
      THERMAL_EXPANSION: 1.18,
    };
    const sFactor = scenarioFactors[scenario] || 1.0;

    dailyForecastPoints.forEach((point) => {
      const day = point.dayNumber;
      const isWeekend = point.dayOfWeek === 'Sat' || point.dayOfWeek === 'Sun';

      activeSegments.forEach((segment) => {
        // Base capacity for this segment's trade section
        const segBaseManpowerCapacity = Math.round(
          segment.tracksCount * 7.5 + (segment.lengthKm / 10) * 3
        );
        const segBaseMachineryCapacity = Math.round(segment.tracksCount * 0.75 + 1);

        // Calculate segment demand share based on infrastructure criticality, assets and defect clusters
        let segmentManpowerDemand = 0;
        let segmentMachineryDemand = 0;
        const activeMachines: string[] = [];
        let workDriver = 'Routine preventive track geometry & clearance inspection';
        let targetAsset = segment.primaryAssetTypes[0] || 'Track Infrastructure';
        let isPeakCluster = false;
        let clusterId: string | undefined;
        let clusterTitle: string | undefined;

        // Baseline cyclic consumption
        const cyclicWave = ((day * 3 + segment.fromKm) % 7) / 7;
        let baseDemandLoad = (segment.criticality === 'CRITICAL' ? 14 : segment.criticality === 'HIGH' ? 10 : 7) + cyclicWave * 6;

        // Weekend Mega-Block surge on main segments
        if (isWeekend) {
          baseDemandLoad += segment.tracksCount * 2.5;
        }

        segmentManpowerDemand = Math.round(baseDemandLoad * sFactor);
        segmentMachineryDemand = Math.max(1, Math.round((baseDemandLoad / 8) * sFactor));
        activeMachines.push('09-3X Dynamic Tamping Machine');

        // Segment-specific domain events matching Indian Railways maintenance reality:
        // Cluster 1: C003-S2 Ballast Mud Pumping & BCM Deep Screening (Days 9 - 11)
        if (segment.id === 'C003-S2' && day >= 9 && day <= 11) {
          isPeakCluster = true;
          clusterId = 'CLUSTER-BCM-MUD';
          clusterTitle = 'Ballast Deep Screening & Mud Pumping Cluster';
          workDriver = 'Deep Screening Ballast Cleaner (BCM) possession & slurry pocket excavation at KM 27.4';
          targetAsset = 'KM 27.4 Ballast Pocket Slurry Zone';
          segmentManpowerDemand += 28;
          segmentMachineryDemand += 3;
          activeMachines.push('Ballast Cleaning Machine (BCM)', 'Ballast Regulating Machine (BRM)', 'Track Stabilizer');
        }

        // Cluster 2: C001-S1 Catenary Thermal Hotspots & Dropper Sparking (Days 7 - 8)
        else if (segment.id === 'C001-S1' && (day === 7 || day === 8)) {
          isPeakCluster = true;
          clusterId = 'CLUSTER-OHE-HOTSPOT';
          clusterTitle = '25kV Catenary Dropper Thermal Hotspot Cluster';
          workDriver = 'High-tension 25kV catenary dropper thermal hotspot scan & insulator replacement during night mega-block';
          targetAsset = '25kV Catenary OHE & Section Insulators';
          segmentManpowerDemand += 20;
          segmentMachineryDemand += 2;
          activeMachines.push('Self-Propelled 8-Wheeler Tower Wagon', 'Thermal Imaging Patrol Car');
        }

        // Cluster 3: C003-S3 USFD Transverse Rail Fatigue Micro-Cracks (Days 18 - 19)
        else if (segment.id === 'C003-S3' && (day === 18 || day === 19)) {
          isPeakCluster = true;
          clusterId = 'CLUSTER-USFD-FATIGUE';
          clusterTitle = 'High-Curvature USFD Rail Fatigue Rectification Cluster';
          workDriver = 'USFD ultrasonic transverse micro-crack detection & immediate emergency rail insert welding';
          targetAsset = 'USFD Rail Flaw Detection Sector (Rohtak Curve)';
          segmentManpowerDemand += 22;
          segmentMachineryDemand += 2;
          activeMachines.push('USFD Ultrasonic Rail Testing Car', 'Mobile Flash Butt Welding Machine');
        }

        // Cluster 4: C003-S2 Heavy Freight Track Stabilization (Days 23 - 25)
        else if (segment.id === 'C003-S2' && day >= 23 && day <= 25) {
          isPeakCluster = true;
          clusterId = 'CLUSTER-FREIGHT-WEAR';
          clusterTitle = 'Heavy Haul Freight Track Geometric Stabilization Cluster';
          workDriver = 'Post-monsoon subgrade drainage restoration & 09-3X continuous tamping over 12km stretch';
          targetAsset = 'Heavy Haul Rail Bed (KM 24-46)';
          segmentManpowerDemand += 24;
          segmentMachineryDemand += 3;
          activeMachines.push('Continuous Action Tamper (09-3X)', 'Dynamic Track Stabilizer (DGS)');
        }

        // Cluster 5: C001-S2 Quad Track Rail Joint Renewal (Days 14 - 15)
        else if (segment.id === 'C001-S2' && (day === 14 || day === 15)) {
          isPeakCluster = true;
          clusterId = 'CLUSTER-TRUNK-RENEWAL';
          clusterTitle = 'Quad-Track High-Density Rail Joint Renewal Cluster';
          workDriver = 'Glued insulated rail joint (GJ) replacement & turnout crossing re-sleepering';
          targetAsset = 'Continuous Welded Rail T-01 North';
          segmentManpowerDemand += 18;
          segmentMachineryDemand += 2;
          activeMachines.push('Unimat Point & Crossing Tamper', 'Utility Rail Crane');
        }

        // Periodic minor surges
        else if (day === 4 && segment.id.startsWith('C003')) {
          segmentManpowerDemand += 12;
          segmentMachineryDemand += 1;
          activeMachines.push('USFD Hand-Pushed Flaw Detector');
          workDriver = 'Ultrasonic flaw inspection on 25T axle-load turnouts';
        } else if (day === 13 && segment.id === 'C003-S1') {
          segmentManpowerDemand += 14;
          segmentMachineryDemand += 1;
          activeMachines.push('S&T Test Van');
          workDriver = 'Shakurbasti electric point machine 143mm stroke motor overhaul';
          targetAsset = 'Shakurbasti Point Machine PM-04';
        } else if (day === 27 && (segment.id === 'C002-S2' || segment.id === 'C004-S2')) {
          segmentManpowerDemand += 11;
          activeMachines.push('Track Recording Car (TRC)');
          workDriver = 'High-speed laser track geometry compliance survey (Vande Bharat standard)';
        }

        // Adjust if planner override exists for this day
        if (point.isManualOverride) {
          const overrideRatio = point.manpowerRequired / Math.max(1, (point.manpowerAvailable || 100));
          if (overrideRatio > 1.1) {
            segmentManpowerDemand = Math.round(segmentManpowerDemand * (1 + (overrideRatio - 1) * 0.7));
          }
        }

        // Calculate Deficits
        const segManpowerDeficit = Math.max(0, segmentManpowerDemand - segBaseManpowerCapacity);
        const segMachineryDeficit = Math.max(0, segmentMachineryDemand - segBaseMachineryCapacity);

        // Consumption intensity score (0 to 100+ %):
        // 55% weight to manpower utilization + 35% weight to machinery utilization + 10% deficit penalty
        const manpowerUtil = (segmentManpowerDemand / Math.max(1, segBaseManpowerCapacity)) * 100;
        const machineryUtil = (segmentMachineryDemand / Math.max(1, segBaseMachineryCapacity)) * 100;
        let intensityScore = Math.round(manpowerUtil * 0.6 + machineryUtil * 0.4);

        if (segManpowerDeficit > 0) {
          intensityScore += Math.min(25, segManpowerDeficit * 3);
        }

        // Clamp intensity
        intensityScore = Math.max(15, Math.min(130, intensityScore));

        // Evaluate level
        let intensityLevel: 'LOW' | 'MODERATE' | 'ELEVATED' | 'PEAK_CLUSTER' = 'LOW';
        if (intensityScore >= 85 || isPeakCluster || segManpowerDeficit >= 8) {
          intensityLevel = 'PEAK_CLUSTER';
          isPeakCluster = true;
        } else if (intensityScore >= 68 || segManpowerDeficit > 0) {
          intensityLevel = 'ELEVATED';
        } else if (intensityScore >= 45) {
          intensityLevel = 'MODERATE';
        } else {
          intensityLevel = 'LOW';
        }

        // Mitigation suggestion
        let mitigation = 'Standard shift rosters adequate. No special block priority adjustments required.';
        if (intensityLevel === 'PEAK_CLUSTER') {
          mitigation = `PEAK CLUSTER: Pre-position reserve gangs and assign priority mega-block window. Mobilize ${activeMachines[0] || 'heavy tamper'}.`;
        } else if (intensityLevel === 'ELEVATED') {
          mitigation = 'Elevated consumption: Combine track and traction work into a single coordinated possession.';
        }

        matrix.push({
          segmentId: segment.id,
          corridorId: segment.corridorId,
          segmentName: segment.name,
          shortCode: segment.shortCode,
          dayNumber: day,
          date: point.date,
          displayDate: point.displayDate,
          dayOfWeek: point.dayOfWeek,
          intensityPct: intensityScore,
          manpowerIntensityPct: Math.round(manpowerUtil),
          machineryIntensityPct: Math.round(machineryUtil),
          intensityLevel,
          manpowerRequired: segmentManpowerDemand,
          manpowerAvailable: segBaseManpowerCapacity,
          manpowerDeficit: segManpowerDeficit,
          machinerySlotsRequired: segmentMachineryDemand,
          machinerySlotsAvailable: segBaseMachineryCapacity,
          machineryDeficit: segMachineryDeficit,
          activeMachineryTypes: activeMachines,
          primaryWorkDriver: workDriver,
          assetTarget: targetAsset,
          isPeakCluster,
          clusterId,
          clusterTitle,
          mitigationRecommendation: mitigation,
        });
      });
    });

    // Detect and group peak clusters
    const clusters = this.detectPeakClusters(matrix, activeSegments);

    const maxIntensity = matrix.reduce((max, item) => Math.max(max, item.intensityPct), 0);
    const peakClustersCount = clusters.length;

    return {
      matrix,
      segments: activeSegments,
      clusters,
      maxIntensityAcrossBoard: maxIntensity,
      peakClusterCount: peakClustersCount,
    };
  }

  /**
   * Identifies contiguous and high-density peak demand clusters across corridor segments.
   */
  private detectPeakClusters(
    matrix: SegmentDailyIntensity[],
    segments: CorridorSegment[]
  ): PeakDemandCluster[] {
    const clusters: PeakDemandCluster[] = [];

    segments.forEach((segment) => {
      const segItems = matrix
        .filter((m) => m.segmentId === segment.id)
        .sort((a, b) => a.dayNumber - b.dayNumber);

      let currentCluster: SegmentDailyIntensity[] = [];

      segItems.forEach((item) => {
        if (item.isPeakCluster || item.intensityPct >= 85) {
          currentCluster.push(item);
        } else {
          if (currentCluster.length >= 1) {
            clusters.push(this.formatCluster(currentCluster, segment));
            currentCluster = [];
          }
        }
      });

      if (currentCluster.length >= 1) {
        clusters.push(this.formatCluster(currentCluster, segment));
      }
    });

    // Sort by peak intensity descending
    return clusters.sort((a, b) => b.maxIntensityPct - a.maxIntensityPct);
  }

  private formatCluster(
    items: SegmentDailyIntensity[],
    segment: CorridorSegment
  ): PeakDemandCluster {
    const startDay = items[0].dayNumber;
    const endDay = items[items.length - 1].dayNumber;
    let peakDayItem = items[0];
    let maxIntensity = items[0].intensityPct;
    let totalManDef = 0;
    let totalMacDef = 0;
    const machinesSet = new Set<string>();

    items.forEach((it) => {
      if (it.intensityPct > maxIntensity) {
        maxIntensity = it.intensityPct;
        peakDayItem = it;
      }
      totalManDef += it.manpowerDeficit;
      totalMacDef += it.machineryDeficit;
      it.activeMachineryTypes.forEach((m) => machinesSet.add(m));
    });

    const isMultiDay = startDay !== endDay;
    const title =
      peakDayItem.clusterTitle ||
      `${segment.shortCode} ${isMultiDay ? `Days ${startDay}–${endDay}` : `Day ${startDay}`} Demand Surge`;

    return {
      clusterId: `CLUSTER-${segment.id}-D${startDay}-D${endDay}`,
      clusterTitle: title,
      segmentId: segment.id,
      segmentName: segment.name,
      corridorId: segment.corridorId,
      corridorName: segment.corridorName,
      startDay,
      endDay,
      peakDay: peakDayItem.dayNumber,
      durationDays: items.length,
      maxIntensityPct: maxIntensity,
      totalManpowerDeficit: totalManDef,
      totalMachineryDeficit: totalMacDef,
      primaryWorkDriver: peakDayItem.primaryWorkDriver,
      requiredMachinery: Array.from(machinesSet),
      severity: maxIntensity >= 95 ? 'CRITICAL' : maxIntensity >= 85 ? 'HIGH' : 'MODERATE',
      suggestedAction: peakDayItem.mitigationRecommendation,
    };
  }

  /**
   * Helper to return CSS color mapping for a given intensity percentage or level.
   */
  public getIntensityColor(intensityPct: number): {
    fillColor: string;
    strokeColor: string;
    textColor: string;
    label: string;
  } {
    if (intensityPct >= 85) {
      return {
        fillColor: '#881337', // Deep crimson red
        strokeColor: '#f43f5e', // Rose neon
        textColor: '#ffe4e6',
        label: 'Peak Demand Cluster (Critical)',
      };
    }
    if (intensityPct >= 68) {
      return {
        fillColor: '#c2410c', // Bright orange
        strokeColor: '#fb923c',
        textColor: '#ffedd5',
        label: 'Elevated Demand',
      };
    }
    if (intensityPct >= 45) {
      return {
        fillColor: '#0f766e', // Deep Teal / Yellow-green
        strokeColor: '#2dd4bf',
        textColor: '#ccfbf1',
        label: 'Moderate (Balanced)',
      };
    }
    return {
      fillColor: '#064e3b', // Emerald forest green
      strokeColor: '#10b981',
      textColor: '#d1fae5',
      label: 'Low (Surplus / Safe)',
    };
  }
}

export const corridorSegmentHeatmapService = new CorridorSegmentHeatmapService();
