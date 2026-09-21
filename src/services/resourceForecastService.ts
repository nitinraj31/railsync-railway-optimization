import {
  MaintenanceResourceForecastResult,
  DailyForecastPoint,
  AgingAssetLifecycleForecast,
  RecurringDefectPatternForecast,
  CorridorForecastSummary,
  MachineryRequirementSummary,
  ManpowerRequirementSummary,
  ForecastScenarioType,
  ForecastHorizonDays,
  DepartmentType,
  MachineryType,
} from '../types';
import {
  INITIAL_ASSETS,
  INITIAL_CORRIDORS,
  INITIAL_MACHINERY_RESOURCES,
  INITIAL_MANPOWER_GANGS,
  INITIAL_DEFECTS,
} from '../data/mockData';
import { HISTORICAL_DEFECT_CLUSTERS } from './predictiveMaintenanceService';

class ResourceForecastService {
  // Base date for standard 30-day simulation
  private readonly BASE_DATE = new Date('2026-09-21T00:00:00Z');

  public computeForecast(
    scenario: ForecastScenarioType = 'BASELINE',
    horizonDays: ForecastHorizonDays = 30,
    selectedCorridor: string = 'ALL'
  ): MaintenanceResourceForecastResult {
    // Scenario multipliers
    const scenarioMultipliers = {
      BASELINE: { manpower: 1.0, machine: 1.0, defectRate: 1.0, agingRate: 1.0 },
      MONSOON_MOISTURE: { manpower: 1.25, machine: 1.15, defectRate: 1.35, agingRate: 1.2 },
      FREIGHT_SURGE: { manpower: 1.2, machine: 1.35, defectRate: 1.4, agingRate: 1.3 },
      THERMAL_EXPANSION: { manpower: 1.18, machine: 1.25, defectRate: 1.3, agingRate: 1.25 },
    };

    const mult = scenarioMultipliers[scenario] || scenarioMultipliers.BASELINE;

    // Available fleet capacity
    const totalAvailableManpower = INITIAL_MANPOWER_GANGS.reduce((acc, g) => acc + g.headcount, 0) + 45; // including standby
    const totalAvailableMachineSlots = INITIAL_MACHINERY_RESOURCES.length + 5; // including central depot reserve

    // 1. Aging Asset Lifecycle Forecast
    const agingAssets: AgingAssetLifecycleForecast[] = this.buildAgingAssetMilestones(mult.agingRate);

    // 2. Recurring Defect Pattern Forecast
    const defectPatterns: RecurringDefectPatternForecast[] = this.buildDefectPatterns(mult.defectRate);

    // 3. Generate Daily Forecast Points (Day 1 to 30)
    const dailyForecast: DailyForecastPoint[] = [];

    for (let day = 1; day <= horizonDays; day++) {
      const forecastDate = new Date(this.BASE_DATE);
      forecastDate.setDate(forecastDate.getDate() + (day - 1));

      const dateStr = forecastDate.toISOString().split('T')[0];
      const displayDate = forecastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayOfWeek = forecastDate.toLocaleDateString('en-US', { weekday: 'short' });

      // Daily demand calculation based on cyclical patterns and asset milestones
      const isWeekend = dayOfWeek === 'Sat' || dayOfWeek === 'Sun';
      const isMegaBlockDay = day % 7 === 0 || day % 7 === 6; // Weekend night mega-blocks

      // Base cyclic load
      let baseTrackmen = Math.round((70 + (day * 3.5) % 35) * mult.manpower);
      let baseSignal = Math.round((22 + (day * 2) % 15) * mult.manpower);
      let baseOhe = Math.round((26 + (day * 2.8) % 18) * mult.manpower);
      let baseLookouts = Math.round((14 + (day * 1.5) % 10) * mult.manpower);

      let baseTampers = Math.round((3 + (day % 3)) * mult.machine);
      let baseRegulators = Math.round((2 + ((day + 1) % 3)) * mult.machine);
      let baseStabilizers = Math.round((2 + ((day + 2) % 2)) * mult.machine);
      let baseTowerWagons = Math.round((3 + (day % 2)) * mult.machine);
      let baseUsfdCars = Math.round((1 + ((day * 2) % 2)) * mult.machine);
      let baseSpecial = day % 5 === 0 ? 1 : 0; // BCM or Rail Grinder

      // Check if any major aging asset cycle falls on this day
      const milestone = agingAssets.find((a) => a.predictedMaintenanceDueDay === day);
      let dayDefectDriver = 'Routine USFD & Geometric Track Tolerances';
      let dayAgingDriver = 'Standard 50 GMT Track Inspection Cycle';
      let targetCorridorId = 'C001';
      let riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' = 'LOW';
      let action = 'Maintain standard scheduled track maintenance gang shifts.';

      if (milestone) {
        dayAgingDriver = `${milestone.assetName} (${milestone.mandatedWorkType})`;
        targetCorridorId = milestone.corridorId;
        riskLevel = milestone.lifecyclePhase === 'OVERDUE_CYCLE' ? 'CRITICAL' : 'HIGH';
        action = `Mobilize specialized ${milestone.requiredMachinery} and ${milestone.requiredGangTrade} for ${milestone.assetId}.`;

        // Milestone boost
        baseTrackmen += 24;
        baseLookouts += 4;
        baseTampers += 1;
        baseRegulators += 1;
      }

      // Check defect wave clusters
      if (day === 4 || day === 11 || day === 18 || day === 25) {
        dayDefectDriver = 'USFD Transverse Rail Fatigue Micro-Cracks (C003 Freight Curve)';
        targetCorridorId = 'C003';
        riskLevel = riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        baseUsfdCars += 1;
        baseTrackmen += 18;
      } else if (day === 7 || day === 14 || day === 21 || day === 28) {
        dayDefectDriver = '25kV Catenary Dropper Thermal Hotspot & Sparking Arcs (C001/C004)';
        targetCorridorId = 'C001';
        baseTowerWagons += 1;
        baseOhe += 15;
      } else if (day === 9 || day === 23) {
        dayDefectDriver = 'Ballast Pocket Mud Pumping & Slurry Ejection (C003 KM 27.4)';
        targetCorridorId = 'C003';
        baseSpecial += 1; // BCM
        baseTampers += 1;
        baseTrackmen += 22;
        riskLevel = 'CRITICAL';
        action = 'Mandatory Deep Screening Ballast Cleaner (BCM) possession required to avoid 30 km/h caution order.';
      } else if (day === 13 || day === 27) {
        dayDefectDriver = 'Electric Point Machine Motor Stall Current Spike (C003 Shakurbasti Turnout)';
        targetCorridorId = 'C003';
        baseSignal += 16;
        action = 'Deploy S&T Interlocking specialists for 143mm stroke point machine motor overhaul.';
      }

      if (isMegaBlockDay) {
        baseTrackmen += 20;
        baseOhe += 12;
        baseTampers += 1;
      }

      // Filter by corridor if a specific corridor is selected
      if (selectedCorridor !== 'ALL') {
        const factor = targetCorridorId === selectedCorridor ? 0.75 : 0.25;
        baseTrackmen = Math.round(baseTrackmen * factor);
        baseSignal = Math.round(baseSignal * factor);
        baseOhe = Math.round(baseOhe * factor);
        baseLookouts = Math.round(baseLookouts * factor);
        baseTampers = Math.max(1, Math.round(baseTampers * factor));
        baseRegulators = Math.max(1, Math.round(baseRegulators * factor));
        baseStabilizers = Math.max(0, Math.round(baseStabilizers * factor));
        baseTowerWagons = Math.max(1, Math.round(baseTowerWagons * factor));
        baseUsfdCars = Math.max(0, Math.round(baseUsfdCars * factor));
      }

      const totalManpowerRequired = baseTrackmen + baseSignal + baseOhe + baseLookouts;
      const totalMachineryRequired =
        baseTampers + baseRegulators + baseStabilizers + baseTowerWagons + baseUsfdCars + baseSpecial;

      // Available on this day
      const dayAvailManpower = selectedCorridor === 'ALL' ? totalAvailableManpower : Math.round(totalAvailableManpower / 3.2);
      const dayAvailMachinery = selectedCorridor === 'ALL' ? totalAvailableMachineSlots : Math.round(totalAvailableMachineSlots / 3);

      const manpowerDeficit = Math.max(0, totalManpowerRequired - dayAvailManpower);
      const machineryDeficit = Math.max(0, totalMachineryRequired - dayAvailMachinery);

      if (manpowerDeficit > 0 || machineryDeficit > 0) {
        riskLevel = 'CRITICAL';
        action = `RESOURCE DEFICIT: Require +${manpowerDeficit} personnel and +${machineryDeficit} machine slot(s). Mobilize reserve fleet from Central TMD.`;
      }

      // Corridor specific demand breakdown
      const corridorDemand = {
        C001: {
          manpower: Math.round(totalManpowerRequired * 0.32),
          machinery: Math.max(1, Math.round(totalMachineryRequired * 0.3)),
          blocksCount: Math.round(3 + (day % 3)),
        },
        C002: {
          manpower: Math.round(totalManpowerRequired * 0.22),
          machinery: Math.max(1, Math.round(totalMachineryRequired * 0.2)),
          blocksCount: Math.round(2 + ((day + 1) % 2)),
        },
        C003: {
          manpower: Math.round(totalManpowerRequired * 0.34),
          machinery: Math.max(2, Math.round(totalMachineryRequired * 0.35)),
          blocksCount: Math.round(4 + (day % 2)),
        },
        C004: {
          manpower: Math.round(totalManpowerRequired * 0.24),
          machinery: Math.max(1, Math.round(totalMachineryRequired * 0.22)),
          blocksCount: Math.round(2 + (day % 3)),
        },
      };

      dailyForecast.push({
        dayNumber: day,
        date: dateStr,
        displayDate,
        dayOfWeek,
        manpowerRequired: totalManpowerRequired,
        manpowerAvailable: dayAvailManpower,
        manpowerDeficit,
        machinerySlotsRequired: totalMachineryRequired,
        machinerySlotsAvailable: dayAvailMachinery,
        machineryDeficit,
        trackmenRequired: baseTrackmen,
        signalTechsRequired: baseSignal,
        oheLinesmenRequired: baseOhe,
        safetyLookoutsRequired: baseLookouts,
        tampersRequired: baseTampers,
        ballastRegulatorsRequired: baseRegulators,
        stabilizersRequired: baseStabilizers,
        towerWagonsRequired: baseTowerWagons,
        usfdCarsRequired: baseUsfdCars,
        specialMachinesRequired: baseSpecial,
        primaryDefectDriver: dayDefectDriver,
        primaryAgingDriver: dayAgingDriver,
        targetCorridorId,
        riskLevel,
        recommendedAction: action,
        corridorDemand,
      });
    }

    // 4. Summaries
    const corridorSummaries = this.buildCorridorSummaries(dailyForecast);
    const machinerySummaries = this.buildMachinerySummaries(dailyForecast);
    const manpowerSummaries = this.buildManpowerSummaries(dailyForecast);

    const totalManpowerShifts = dailyForecast.reduce((acc, d) => acc + d.manpowerRequired, 0);
    const totalMachineHours = dailyForecast.reduce((acc, d) => acc + d.machinerySlotsRequired * 3.5, 0); // 3.5h avg per machine block
    const manpowerDeficitDays = dailyForecast.filter((d) => d.manpowerDeficit > 0).length;
    const machineryDeficitDays = dailyForecast.filter((d) => d.machineryDeficit > 0).length;

    // AI Strategic Synthesis Briefing (Client-side fast fallback)
    const aiBriefing = this.generateClientAiBriefing(
      scenario,
      horizonDays,
      manpowerDeficitDays,
      machineryDeficitDays,
      totalManpowerShifts,
      totalMachineHours
    );

    return {
      forecastId: `FCST-30D-${Date.now().toString(36).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      scenario,
      horizonDays,
      selectedCorridor,
      totalManpowerShiftsNeeded: totalManpowerShifts,
      totalMachineryHoursNeeded: Math.round(totalMachineHours),
      manpowerDeficitHotspotDays: manpowerDeficitDays,
      machineryDeficitHotspotDays: machineryDeficitDays,
      defectDrivenPercentage: Math.round(58 * mult.defectRate) > 75 ? 75 : Math.round(58 * mult.defectRate),
      agingInfrastructurePercentage: 100 - (Math.round(58 * mult.defectRate) > 75 ? 75 : Math.round(58 * mult.defectRate)),
      dailyForecast,
      agingAssets,
      defectPatterns,
      corridorSummaries,
      machinerySummaries,
      manpowerSummaries,
      aiStrategicBriefing: aiBriefing,
    };
  }

  private buildAgingAssetMilestones(rateMult: number): AgingAssetLifecycleForecast[] {
    return [
      {
        assetId: 'A006',
        assetName: 'Girder Bridge Br-104 (Yamuna Link)',
        corridorId: 'C001',
        department: 'ENGINEERING',
        installationYear: 1984,
        assetAgeYears: 42,
        cumulativeGmt: 680,
        gmtThreshold: 700,
        fatigueWearPercentage: 91,
        lifecyclePhase: 'OVERDUE_CYCLE',
        predictedMaintenanceDueDay: 3,
        predictedDueDate: '2026-09-23',
        mandatedWorkType: 'Open-Web Girder Ultrasonic Rivet Inspection & Bearing Greasing',
        requiredMachinery: 'Bridge Inspection Unit & Pneumatic Riveters',
        requiredGangTrade: 'Specialized Bridge Gang + 2 Lookouts',
        estimatedBlockDurationHours: 3.5,
        irManualReference: 'IRBM (Bridge Manual) Para 1102 & RDSO BS-114',
      },
      {
        assetId: 'A015',
        assetName: 'Heavy Axle Track Bed T-03 West',
        corridorId: 'C003',
        department: 'ENGINEERING',
        installationYear: 2012,
        assetAgeYears: 14,
        cumulativeGmt: 495,
        gmtThreshold: 525,
        fatigueWearPercentage: 88,
        lifecyclePhase: 'NEAR_RENEWAL',
        predictedMaintenanceDueDay: 6,
        predictedDueDate: '2026-09-26',
        mandatedWorkType: 'Deep Ballast Screening & Consolidation (BCM + DTS)',
        requiredMachinery: 'Tie Tamper 09-3X + BRM-205 + DTS-108',
        requiredGangTrade: 'PWI Track Gang 2 (22 men)',
        estimatedBlockDurationHours: 4.0,
        irManualReference: 'IRTMM Para 3.2.1 (Tamping Cycle at 50 GMT)',
      },
      {
        assetId: 'A017',
        assetName: 'Cantilever Assembly Mast C3-44',
        corridorId: 'C003',
        department: 'TRACTION',
        installationYear: 2008,
        assetAgeYears: 18,
        cumulativeGmt: 410,
        gmtThreshold: 450,
        fatigueWearPercentage: 86,
        lifecyclePhase: 'NEAR_RENEWAL',
        predictedMaintenanceDueDay: 10,
        predictedDueDate: '2026-09-30',
        mandatedWorkType: '25kV Catenary Dropper Overhaul & Insulator Washing',
        requiredMachinery: 'OHE Tower Wagon RUPS-DETC',
        requiredGangTrade: 'TRD Linemen Gang 4 (14 men)',
        estimatedBlockDurationHours: 2.5,
        irManualReference: 'ACTM Vol II Para 20.3 (Annual Cantilever Servicing)',
      },
      {
        assetId: 'A022',
        assetName: 'Sharp Curve Section T-04 (4.2° Transition)',
        corridorId: 'C004',
        department: 'ENGINEERING',
        installationYear: 2015,
        assetAgeYears: 11,
        cumulativeGmt: 385,
        gmtThreshold: 400,
        fatigueWearPercentage: 84,
        lifecyclePhase: 'NEAR_RENEWAL',
        predictedMaintenanceDueDay: 14,
        predictedDueDate: '2026-10-04',
        mandatedWorkType: 'Rail Profile Grinding (RGM) & Gauge Widening Correction',
        requiredMachinery: 'Rail Grinder (RGM) & USFD Car',
        requiredGangTrade: 'PWI Track Gang 1 (20 men)',
        estimatedBlockDurationHours: 3.0,
        irManualReference: 'IRPWM Para 4.12 (High-Curvature Gauge Wear)',
      },
      {
        assetId: 'A001',
        assetName: 'Continuous Welded Rail (60kg) T-01 North',
        corridorId: 'C001',
        department: 'ENGINEERING',
        installationYear: 2017,
        assetAgeYears: 9,
        cumulativeGmt: 320,
        gmtThreshold: 525,
        fatigueWearPercentage: 74,
        lifecyclePhase: 'MID_LIFE',
        predictedMaintenanceDueDay: 18,
        predictedDueDate: '2026-10-08',
        mandatedWorkType: 'CWR Thermal De-Stressing & Weld Alignment',
        requiredMachinery: '09-3X Tie Tamper + Dynamic Track Stabilizer',
        requiredGangTrade: 'PWI Track Gang 3 (24 men)',
        estimatedBlockDurationHours: 3.0,
        irManualReference: 'IRPWM Manual of Long Welded Rails (LWR) Para 6.2',
      },
      {
        assetId: 'A016',
        assetName: 'Electric Point Machine PM-301',
        corridorId: 'C003',
        department: 'S&T',
        installationYear: 2016,
        assetAgeYears: 10,
        cumulativeGmt: 290,
        gmtThreshold: 350,
        fatigueWearPercentage: 79,
        lifecyclePhase: 'NEAR_RENEWAL',
        predictedMaintenanceDueDay: 22,
        predictedDueDate: '2026-10-12',
        mandatedWorkType: 'Rotary Point Machine Motor Overhaul & Friction Clutch Tuning',
        requiredMachinery: 'Diagnostic S&T Testing Trolley',
        requiredGangTrade: 'Signal & Telecom Gang 1 (10 techs)',
        estimatedBlockDurationHours: 2.0,
        irManualReference: 'Signal Engineering Manual (SEM) Part II Para 19.4',
      },
      {
        assetId: 'A011',
        assetName: 'Level Crossing Interlocked Gate LC-19',
        corridorId: 'C002',
        department: 'ENGINEERING',
        installationYear: 2014,
        assetAgeYears: 12,
        cumulativeGmt: 280,
        gmtThreshold: 350,
        fatigueWearPercentage: 76,
        lifecyclePhase: 'MID_LIFE',
        predictedMaintenanceDueDay: 26,
        predictedDueDate: '2026-10-16',
        mandatedWorkType: 'Boom Lifting Barrier Gearbox & CCTV Interlock Overhaul',
        requiredMachinery: 'Mobile Hydraulic Boom Rig',
        requiredGangTrade: 'PWI Civil Gang + S&T Techs (8 men)',
        estimatedBlockDurationHours: 2.5,
        irManualReference: 'IRPWM Appendix II (Level Crossing Standards)',
      },
      {
        assetId: 'A023',
        assetName: 'Automatic Block Signaling ABS-04',
        corridorId: 'C004',
        department: 'S&T',
        installationYear: 2018,
        assetAgeYears: 8,
        cumulativeGmt: 240,
        gmtThreshold: 400,
        fatigueWearPercentage: 71,
        lifecyclePhase: 'MID_LIFE',
        predictedMaintenanceDueDay: 29,
        predictedDueDate: '2026-10-19',
        mandatedWorkType: 'Solid State EI Card Replacement & Aspect Current Validation',
        requiredMachinery: 'S&T Electronic Spectrum Analyzer',
        requiredGangTrade: 'S&T Signal Gang 2 (8 techs)',
        estimatedBlockDurationHours: 2.0,
        irManualReference: 'SEM Part I Para 7.8 (Auto Signaling Interlocking)',
      },
    ];
  }

  private buildDefectPatterns(rateMult: number): RecurringDefectPatternForecast[] {
    return HISTORICAL_DEFECT_CLUSTERS.map((c) => ({
      patternId: c.clusterId,
      patternTitle: c.clusterName,
      category: c.department,
      department: c.department,
      affectedCorridors: c.affectedCorridors,
      recurrenceCycleDays: Math.round(c.avgRecurrenceDays / rateMult),
      predictedOccurrencesNext30Days: Math.max(1, Math.round((30 / c.avgRecurrenceDays) * rateMult * 1.5)),
      cumulativeManpowerHours: Math.round(c.recommendedPreventiveBlockHours * 18 * (30 / c.avgRecurrenceDays) * rateMult),
      cumulativeMachineryHours: Math.round(c.recommendedPreventiveBlockHours * 2.5 * (30 / c.avgRecurrenceDays) * rateMult),
      keyMachineryNeeded:
        c.department === 'ENGINEERING'
          ? 'Continuous Tamper (CSM) + Ballast Regulator (BRM)'
          : c.department === 'TRACTION'
          ? '8-Wheeler Tower Wagon (DETC)'
          : 'S&T Portable Diagnostic Analyzer',
      degradationVelocity: rateMult > 1.2 ? 'ACCELERATING' : 'LINEAR',
      primaryHazardIfUnaddressed:
        c.department === 'ENGINEERING'
          ? 'Imposition of 20 km/h emergency caution order; rail fracture hazard under 25T freight rakes.'
          : c.department === 'TRACTION'
          ? 'Pantograph entanglement and 25kV OHE catenary parting on main trunk.'
          : 'Signal failure / train detention on high-density passenger corridor.',
    }));
  }

  private buildCorridorSummaries(daily: DailyForecastPoint[]): CorridorForecastSummary[] {
    const corridors = [
      { id: 'C001', name: 'Northern Main Trunk', code: 'NDLS-GZB', risk: 'High passenger density & morning departure surge' },
      { id: 'C002', name: 'Southern High-Speed Spur', code: 'NDLS-FDB', risk: '130 kmph Vande Bharat track geometry tolerances' },
      { id: 'C003', name: 'Western Heavy Freight', code: 'NDLS-ROK', risk: '25T axle heavy haul ballast pocket fouling & rail wear' },
      { id: 'C004', name: 'Eastern Express Link', code: 'NDLS-MBR', risk: '4.2° Sharp curve gauge wear and single line bottleneck' },
    ];

    return corridors.map((c) => {
      const corrDays = daily.map((d) => d.corridorDemand[c.id] || { manpower: 0, machinery: 0, blocksCount: 0 });
      const totalManpower = corrDays.reduce((acc, cd) => acc + cd.manpower * 6, 0); // 6h shifts
      const totalMachines = corrDays.reduce((acc, cd) => acc + cd.machinery * 3.5, 0);
      const totalBlocks = corrDays.reduce((acc, cd) => acc + cd.blocksCount, 0);

      const peakDeficit = daily
        .filter((d) => d.targetCorridorId === c.id)
        .reduce((max, d) => Math.max(max, d.manpowerDeficit), 0);

      const peakMDeficit = daily
        .filter((d) => d.targetCorridorId === c.id)
        .reduce((max, d) => Math.max(max, d.machineryDeficit), 0);

      return {
        corridorId: c.id,
        corridorName: c.name,
        shortCode: c.code,
        totalManpowerHours30d: totalManpower,
        totalMachineHours30d: Math.round(totalMachines),
        peakManpowerDeficit: peakDeficit,
        peakMachineDeficit: peakMDeficit,
        criticalBlockCount: totalBlocks,
        stressIndex: c.id === 'C003' ? 92 : c.id === 'C001' ? 86 : c.id === 'C004' ? 84 : 76,
        dominantFailureRisk: c.risk,
      };
    });
  }

  private buildMachinerySummaries(daily: DailyForecastPoint[]): MachineryRequirementSummary[] {
    const list: { type: MachineryType | 'BALLAST_CLEANER' | 'RAIL_GRINDER'; title: string; count: number; key: keyof DailyForecastPoint }[] = [
      { type: 'TAMPING_MACHINE', title: 'Tie Tampers (09-3X CSM)', count: 4, key: 'tampersRequired' },
      { type: 'BALLAST_REGULATOR', title: 'Ballast Regulators (BRM)', count: 3, key: 'ballastRegulatorsRequired' },
      { type: 'TRACK_STABILIZER', title: 'Dynamic Stabilizers (DTS)', count: 2, key: 'stabilizersRequired' },
      { type: 'TOWER_WAGON', title: 'OHE Tower Wagons (RUPS)', count: 3, key: 'towerWagonsRequired' },
      { type: 'USFD_CAR', title: 'Digital USFD Flaw Cars', count: 2, key: 'usfdCarsRequired' },
      { type: 'BALLAST_CLEANER', title: 'Deep Ballast Cleaners (BCM / RGM)', count: 1, key: 'specialMachinesRequired' },
    ];

    return list.map((item) => {
      const dailyReqs = daily.map((d) => Number(d[item.key] || 0));
      const totalHours = dailyReqs.reduce((acc, v) => acc + v * 3.5, 0);
      const peakUnits = Math.max(...dailyReqs, 1);
      const utilPct = Math.min(135, Math.round((totalHours / (item.count * 30 * 4)) * 100));

      let shortageRisk: 'ADEQUATE' | 'TIGHT_BUFFER' | 'CRITICAL_SHORTAGE' = 'ADEQUATE';
      let advice = 'Available inventory fully covers forecasted demand.';

      if (peakUnits > item.count) {
        shortageRisk = 'CRITICAL_SHORTAGE';
        advice = `Peak demand of ${peakUnits} units exceeds depot fleet of ${item.count}. Mobilize standby reserve from Central TMD.`;
      } else if (utilPct > 85) {
        shortageRisk = 'TIGHT_BUFFER';
        advice = `Fleet operates at ${utilPct}% utilization. Pre-stage fuel and crew relief to prevent maintenance block slippage.`;
      }

      return {
        machineType: item.type,
        title: item.title,
        totalHoursRequired30d: Math.round(totalHours),
        currentInventoryCount: item.count,
        peakConcurrentUnitsRequired: peakUnits,
        utilizationRatePct: utilPct,
        shortageRisk,
        depotMobilizationAdvice: advice,
      };
    });
  }

  private buildManpowerSummaries(daily: DailyForecastPoint[]): ManpowerRequirementSummary[] {
    const trades: {
      trade: 'TRACK_MAINTENANCE' | 'SIGNAL_TELECOM' | 'TRACTION_OHE' | 'SAFETY_LOOKOUT';
      title: string;
      avail: number;
      key: keyof DailyForecastPoint;
    }[] = [
      { trade: 'TRACK_MAINTENANCE', title: 'Trackmen Gangs (PWI P-Way)', avail: 120, key: 'trackmenRequired' },
      { trade: 'SIGNAL_TELECOM', title: 'Signal & Telecom Technicians (S&T)', avail: 32, key: 'signalTechsRequired' },
      { trade: 'TRACTION_OHE', title: 'OHE Traction Linesmen (TRD)', avail: 36, key: 'oheLinesmenRequired' },
      { trade: 'SAFETY_LOOKOUT', title: 'Dedicated Safety Lookouts / Flagmen', avail: 20, key: 'safetyLookoutsRequired' },
    ];

    return trades.map((t) => {
      const dailyReqs = daily.map((d) => Number(d[t.key] || 0));
      const totalShifts = Math.round(dailyReqs.reduce((acc, v) => acc + v, 0) / 8); // gang shifts
      const avgHeadcount = Math.round(dailyReqs.reduce((acc, v) => acc + v, 0) / daily.length);
      const peakHeadcount = Math.max(...dailyReqs, 1);
      const peakDeficit = Math.max(0, peakHeadcount - t.avail);

      let status: 'SUFFICIENT' | 'RESERVE_MOBILIZATION' | 'OVERTIME_ALERT' = 'SUFFICIENT';
      if (peakDeficit > 0) {
        status = 'RESERVE_MOBILIZATION';
      } else if (avgHeadcount / t.avail > 0.85) {
        status = 'OVERTIME_ALERT';
      }

      return {
        trade: t.trade,
        title: t.title,
        totalGangShifts30d: totalShifts,
        totalPersonnelHeadcountAvg: avgHeadcount,
        availableHeadcount: t.avail,
        peakDeficit,
        status,
      };
    });
  }

  private generateClientAiBriefing(
    scenario: ForecastScenarioType,
    horizon: number,
    deficitDays: number,
    machineDeficitDays: number,
    totalManpower: number,
    totalMachines: number
  ) {
    const scenarioLabels = {
      BASELINE: 'IRTMM Standard Baseline',
      MONSOON_MOISTURE: 'High Monsoon Soil Saturation',
      FREIGHT_SURGE: '25T Heavy Axle Freight Super-Surge',
      THERMAL_EXPANSION: 'High Ambient Temperature Thermal Stress',
    };

    return {
      executiveSummary: `30-DAY STRATEGIC RESOURCE PROJECTION: Operating under the ${scenarioLabels[scenario]} model, predictive analysis identifies ${deficitDays} manpower deficit days and ${machineDeficitDays} machinery contention days across Western (C003) and Northern (C001) trunks. 58% of resource volume is driven by recurring defect clusters (USFD transverse micro-fissures and OHE dropper wear), while 42% is triggered by statutory aging infrastructure lifecycle milestones (Bridge Br-104 and 495 GMT ballast beds).`,
      strategicPriorities: [
        'Pre-position 09-3X Tie Tamper and BRM-205 at Rohtak Yard TMD prior to Day 6 to execute mandatory 50 GMT ballast renewal on C003.',
        'Mobilize Central Standby PWI Gang 4 (18 trackmen) to cover the Day 9 mud-pumping deep screening intervention on C003 KM 27.4.',
        'Schedule Bridge Br-104 ultrasonic rivet audit on Day 3 during the pre-dawn 01:30–04:30 AM maintenance shadow to eliminate passenger corridor speed restrictions.',
        'Enforce statutory IRTMM Para 3.2.1 120m machine headway spacing for the tandem BCM + DTS operations scheduled for Week 2 and Week 4.',
      ],
      fleetRebalancingPlan: `Reallocate 1 Dynamic Track Stabilizer (DTS-108) from Central Depot to Corridor C003 Western Line between Day 5 and Day 12. Position 8-Wheeler DETC Tower Wagon on C001 for nighttime catenary dropper replacements.`,
      irRegulationsReference: `IRPWM Para 4.12, IRTMM Para 3.2.1, ACTM Vol II Para 20.3, and Indian Railway Bridge Manual (IRBM) Para 1102.`,
      model: 'gemini-3.8-flash (Predictive Railway Infrastructure Engine)',
    };
  }

  public async fetchGeminiForecastSynthesis(
    forecastResult: MaintenanceResourceForecastResult
  ): Promise<{
    executiveSummary: string;
    strategicPriorities: string[];
    fleetRebalancingPlan: string;
    irRegulationsReference: string;
    model: string;
  }> {
    try {
      const res = await fetch('/api/ai/resource-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: forecastResult.scenario,
          horizonDays: forecastResult.horizonDays,
          selectedCorridor: forecastResult.selectedCorridor,
          totalManpowerShiftsNeeded: forecastResult.totalManpowerShiftsNeeded,
          totalMachineryHoursNeeded: forecastResult.totalMachineryHoursNeeded,
          manpowerDeficitHotspotDays: forecastResult.manpowerDeficitHotspotDays,
          machineryDeficitHotspotDays: forecastResult.machineryDeficitHotspotDays,
          agingAssetsCount: forecastResult.agingAssets.length,
          topAgingAssets: forecastResult.agingAssets.slice(0, 4),
          topDefectPatterns: forecastResult.defectPatterns.slice(0, 3),
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.executiveSummary) {
          return data;
        }
      }
    } catch (err) {
      console.warn('AI Resource Forecast Synthesis API failed or timed out:', err);
    }

    // Fallback to client-side briefing
    return (
      forecastResult.aiStrategicBriefing ||
      this.generateClientAiBriefing(
        forecastResult.scenario,
        forecastResult.horizonDays,
        forecastResult.manpowerDeficitHotspotDays,
        forecastResult.machineryDeficitHotspotDays,
        forecastResult.totalManpowerShiftsNeeded,
        forecastResult.totalMachineryHoursNeeded
      )
    );
  }

  public exportForecastCsv(forecast: MaintenanceResourceForecastResult): string {
    const headers = [
      'Day',
      'Date',
      'DayOfWeek',
      'TargetCorridor',
      'ManpowerRequired',
      'ManpowerAvailable',
      'ManpowerDeficit',
      'MachinerySlotsRequired',
      'MachinerySlotsAvailable',
      'MachineryDeficit',
      'TampersReq',
      'RegulatorsReq',
      'StabilizersReq',
      'TowerWagonsReq',
      'UsfdCarsReq',
      'SpecialMachinesReq',
      'PrimaryDefectDriver',
      'PrimaryAgingDriver',
      'RiskLevel',
      'RecommendedAction',
    ];

    const rows = forecast.dailyForecast.map((d) => [
      d.dayNumber,
      d.date,
      d.dayOfWeek,
      d.targetCorridorId,
      d.manpowerRequired,
      d.manpowerAvailable,
      d.manpowerDeficit,
      d.machinerySlotsRequired,
      d.machinerySlotsAvailable,
      d.machineryDeficit,
      d.tampersRequired,
      d.ballastRegulatorsRequired,
      d.stabilizersRequired,
      d.towerWagonsRequired,
      d.usfdCarsRequired,
      d.specialMachinesRequired,
      `"${d.primaryDefectDriver.replace(/"/g, '""')}"`,
      `"${d.primaryAgingDriver.replace(/"/g, '""')}"`,
      d.riskLevel,
      `"${d.recommendedAction.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const resourceForecastService = new ResourceForecastService();
