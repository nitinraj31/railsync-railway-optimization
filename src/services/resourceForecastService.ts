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
  generateInitialDefects,
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

      // Calculate previous month comparison (Aug 22 - Sep 20, 2026: late monsoon cyclical wave)
      const prevDate = new Date(forecastDate);
      prevDate.setDate(prevDate.getDate() - 30);
      const prevDateStr = prevDate.toISOString().split('T')[0];
      const prevDisplayDate = prevDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const prevDayOfWeek = prevDate.toLocaleDateString('en-US', { weekday: 'short' });

      // Seasonal wave model:
      // Cyclical weekend surge + Late-monsoon ballast fouling & drainage maintenance
      const prevCyclicFactor = (day % 7 === 0 || day % 7 === 6) ? 1.22 : (day % 7 === 3 ? 1.08 : 0.94);
      // Late monsoon sinusoidal moisture cycle: higher early in August (days 1-12), tapering toward September
      const monsoonSeasonalCurve = 0.88 + 0.16 * Math.cos(((day - 4) / 30) * 2 * Math.PI);
      
      let prevManpower = Math.round(
        (totalManpowerRequired * 0.90 * monsoonSeasonalCurve * (prevCyclicFactor / 1.05)) +
        (day % 5 === 0 ? 10 : -6)
      );
      // Ensure positive sensible number within 45-175
      prevManpower = Math.max(45, Math.min(175, prevManpower));
      const variancePct = Math.round(((totalManpowerRequired - prevManpower) / prevManpower) * 100);

      let seasonalDriver = 'Routine post-monsoon cyclical track geometry calibration';
      if (day >= 1 && day <= 6) {
        seasonalDriver = 'Aug Monsoon Drainage & Ballast Pocket Mud Ejection (Seasonal Wet Ground)';
      } else if (day >= 7 && day <= 13) {
        seasonalDriver = 'High-Moisture 25kV Insulator Sparking & Catenary Flashover Patrols';
      } else if (day >= 14 && day <= 20) {
        seasonalDriver = 'USFD Monsoon Rail Flaw Wave: Weld Toe Micro-Cracks Rectification';
      } else if (day >= 21 && day <= 26) {
        seasonalDriver = 'Pre-Autumn Deep Tamping Possession & Fastener Tightening Cycle';
      } else {
        seasonalDriver = 'End-of-Month Coordinated Interlocking Relay Room Overhaul';
      }

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
        previousPeriodDate: prevDateStr,
        previousPeriodDisplayDate: prevDisplayDate,
        previousPeriodDayOfWeek: prevDayOfWeek,
        previousPeriodManpowerRequired: prevManpower,
        seasonalityVariancePct: variancePct,
        seasonalityDriver: seasonalDriver,
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
      'PreviousMonthDate',
      'PreviousMonthManpowerReq',
      'SeasonalityVariancePct',
      'SeasonalityDriver',
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
      d.previousPeriodDate || '',
      d.previousPeriodManpowerRequired || '',
      d.seasonalityVariancePct !== undefined ? `${d.seasonalityVariancePct}%` : '',
      `"${(d.seasonalityDriver || '').replace(/"/g, '""')}"`,
      `"${d.primaryDefectDriver.replace(/"/g, '""')}"`,
      `"${d.primaryAgingDriver.replace(/"/g, '""')}"`,
      d.riskLevel,
      `"${d.recommendedAction.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public getDayContributingTasks(dayPoint: DailyForecastPoint): DayContributingTask[] {
    const isWeekend = dayPoint.dayOfWeek === 'Sat' || dayPoint.dayOfWeek === 'Sun';
    const cid = dayPoint.targetCorridorId || 'C001';
    const day = dayPoint.dayNumber;

    // Total deficit to distribute across tasks
    const totalDeficit = dayPoint.manpowerDeficit;
    const isHighDeficit = totalDeficit > 0;

    // Determine task departments based on drivers
    const agingIsTraction = dayPoint.primaryAgingDriver.toLowerCase().includes('catenary') || dayPoint.primaryAgingDriver.toLowerCase().includes('ohe');
    const agingIsST = dayPoint.primaryAgingDriver.toLowerCase().includes('point') || dayPoint.primaryAgingDriver.toLowerCase().includes('interlocking');
    const agingDept: DepartmentType = agingIsTraction ? 'TRACTION' : agingIsST ? 'S&T' : 'ENGINEERING';

    const defectIsTraction = dayPoint.primaryDefectDriver.toLowerCase().includes('catenary') || dayPoint.primaryDefectDriver.toLowerCase().includes('dropper') || dayPoint.primaryDefectDriver.toLowerCase().includes('ohe');
    const defectIsST = dayPoint.primaryDefectDriver.toLowerCase().includes('point') || dayPoint.primaryDefectDriver.toLowerCase().includes('turnout') || dayPoint.primaryDefectDriver.toLowerCase().includes('signal');
    const defectDept: DepartmentType = defectIsTraction ? 'TRACTION' : defectIsST ? 'S&T' : 'ENGINEERING';

    // Staffing allocations across tasks
    // Task 1: Aging asset milestone (e.g. Bridge, Track Bed, Cantilever)
    const t1Trackmen = agingDept === 'ENGINEERING' ? Math.round(dayPoint.trackmenRequired * 0.36) : Math.round(dayPoint.trackmenRequired * 0.15);
    const t1Signal = agingDept === 'S&T' ? Math.round(dayPoint.signalTechsRequired * 0.55) : 0;
    const t1Ohe = agingDept === 'TRACTION' ? Math.round(dayPoint.oheLinesmenRequired * 0.55) : 0;
    const t1Lookouts = Math.max(2, Math.round(dayPoint.safetyLookoutsRequired * 0.35));
    const t1Total = t1Trackmen + t1Signal + t1Ohe + t1Lookouts;
    const t1Deficit = isHighDeficit ? Math.min(totalDeficit, Math.ceil(totalDeficit * 0.42)) : 0;

    // Task 2: Recurring defect cluster rectification
    const t2Trackmen = defectDept === 'ENGINEERING' ? Math.round(dayPoint.trackmenRequired * 0.28) : Math.round(dayPoint.trackmenRequired * 0.1);
    const t2Signal = defectDept === 'S&T' ? Math.round(dayPoint.signalTechsRequired * 0.45) : 0;
    const t2Ohe = defectDept === 'TRACTION' ? Math.round(dayPoint.oheLinesmenRequired * 0.45) : 0;
    const t2Lookouts = Math.max(2, Math.round(dayPoint.safetyLookoutsRequired * 0.25));
    const t2Total = t2Trackmen + t2Signal + t2Ohe + t2Lookouts;
    const t2Deficit = isHighDeficit ? Math.min(totalDeficit - t1Deficit, Math.ceil(totalDeficit * 0.35)) : 0;

    // Task 3: Signal & Telecom Point Machine / Interlocking Safety Inspection
    const t3Signal = Math.max(0, dayPoint.signalTechsRequired - t1Signal - t2Signal);
    const t3Lookouts = Math.max(1, Math.round(dayPoint.safetyLookoutsRequired * 0.15));
    const t3Total = t3Signal + t3Lookouts;
    const t3Deficit = isHighDeficit ? Math.min(Math.max(0, totalDeficit - t1Deficit - t2Deficit), Math.ceil(totalDeficit * 0.15)) : 0;

    // Task 4: 25kV OHE Catenary Dropper & Insulator Power Block
    const t4Ohe = Math.max(0, dayPoint.oheLinesmenRequired - t1Ohe - t2Ohe);
    const t4Lookouts = Math.max(1, Math.round(dayPoint.safetyLookoutsRequired * 0.12));
    const t4Total = t4Ohe + t4Lookouts;
    const t4Deficit = isHighDeficit ? Math.min(Math.max(0, totalDeficit - t1Deficit - t2Deficit - t3Deficit), Math.ceil(totalDeficit * 0.1)) : 0;

    // Task 5: Mechanized Track Tamping & Ballast Consolidation
    const t5Trackmen = Math.max(0, dayPoint.trackmenRequired - t1Trackmen - t2Trackmen);
    const t5Lookouts = Math.max(1, dayPoint.safetyLookoutsRequired - t1Lookouts - t2Lookouts - t3Lookouts - t4Lookouts);
    const t5Total = t5Trackmen + t5Lookouts;
    const t5Deficit = Math.max(0, totalDeficit - t1Deficit - t2Deficit - t3Deficit - t4Deficit);

    // Corridor Asset matching
    const assetLookup: Record<string, { engineering: { id: string; name: string; section: string }; traction: { id: string; name: string; section: string }; st: { id: string; name: string; section: string } }> = {
      C001: {
        engineering: { id: 'A006', name: 'Girder Bridge Br-104 (Yamuna Link)', section: 'KM 22/4 River Span' },
        traction: { id: 'A004', name: 'OHE Catenary Section OH-01', section: 'KM 10/0 to 18/0' },
        st: { id: 'A003', name: 'Electronic Interlocking RRI-01', section: 'Cabin A Control Block' },
      },
      C002: {
        engineering: { id: 'A008', name: 'High-Speed Track Section T-02 South', section: 'KM 06/0 to 12/4' },
        traction: { id: 'A010', name: 'Section Insulator & Isolator ISO-02', section: 'KM 20/6 Neutral Section' },
        st: { id: 'A009', name: 'Digital Axle Counter DAC-02', section: 'KM 15/2 Auto Block' },
      },
      C003: {
        engineering: { id: 'A015', name: 'Heavy Axle Track Bed T-03 West', section: 'KM 12/0 to 22/0' },
        traction: { id: 'A017', name: 'Cantilever Assembly Mast C3-44', section: 'KM 28/4 to 34/2' },
        st: { id: 'A016', name: 'Electric Point Machine PM-301', section: 'Shakurbasti Outer C3' },
      },
      C004: {
        engineering: { id: 'A022', name: 'Main Track Curve Section T-04 Curve', section: 'KM 14/0 to 18/5' },
        traction: { id: 'A024', name: 'Contact Wire Dropper Span OHE-4', section: 'KM 40/0 to 48/0' },
        st: { id: 'A023', name: 'Automatic Block Signaling ABS-04', section: 'KM 22/0 to 35/0' },
      },
    };

    const corrAssets = assetLookup[cid] || assetLookup.C001;

    const tasks: DayContributingTask[] = [
      {
        id: `TSK-${cid}-D${String(day).padStart(2, '0')}-01`,
        title: dayPoint.primaryAgingDriver,
        department: agingDept,
        corridorId: cid,
        assetId: agingDept === 'TRACTION' ? corrAssets.traction.id : agingDept === 'S&T' ? corrAssets.st.id : corrAssets.engineering.id,
        assetName: agingDept === 'TRACTION' ? corrAssets.traction.name : agingDept === 'S&T' ? corrAssets.st.name : corrAssets.engineering.name,
        section: agingDept === 'TRACTION' ? corrAssets.traction.section : agingDept === 'S&T' ? corrAssets.st.section : corrAssets.engineering.section,
        timeSlot: isWeekend ? '01:00 – 05:30 (Mega-Block Window)' : '01:30 – 05:00 (Night Shadow)',
        priority: dayPoint.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        isDeficitContributor: t1Deficit > 0,
        deficitContributionReason: t1Deficit > 0
          ? `Aging asset milestone requires concentrated gang presence; roster is short by -${t1Deficit} personnel against IRTMM compliance mandate.`
          : 'Fully manned with assigned depot maintenance crew.',
        requiredStaff: {
          trackmen: t1Trackmen,
          signalTechs: t1Signal,
          oheLinesmen: t1Ohe,
          safetyLookouts: t1Lookouts,
          total: t1Total,
        },
        allocatedStaff: Math.max(0, t1Total - t1Deficit),
        staffShortfall: t1Deficit,
        requiredMachinery: dayPoint.tampersRequired > 0 ? ['Tie Tamper CSM 09-3X', 'Ballast Regulator BRM-205'] : ['Bridge Inspection Unit / Crane 140T'],
        machineryHours: dayPoint.tampersRequired > 0 ? 4.5 : 3.5,
        machineryDetails: dayPoint.tampersRequired > 0
          ? [
              { name: 'Tie Tamper CSM 09-3X', hours: 4.5, slots: 1, engineCode: 'CSM-09-3X-NDLS' },
              { name: 'Ballast Regulator BRM-205', hours: 3.5, slots: 1, engineCode: 'BRM-205-TKD' },
            ]
          : [
              { name: 'Bridge Inspection Unit / Crane 140T', hours: 3.5, slots: 1, engineCode: 'GOTTWALD-140T' },
            ],
        assignedGangs: [
          {
            id: `GANG-${cid}-PW-01`,
            name: `P-Way Main Line Gang #04 (${cid})`,
            lead: 'SSE/P-Way R. K. Meena',
            depot: `${corrAssets.engineering.section} Depot Base`,
            assignedCount: Math.max(0, t1Total - t1Deficit),
            trade: 'P-Way Gang',
            status: t1Deficit > 0 ? 'SHORT_STAFFED' : 'CONFIRMED',
          },
          {
            id: `GANG-${cid}-SAF-01`,
            name: 'Safety Lookout & Detonator Squad Alpha',
            lead: 'PWI Safety Supervisor K. Lal',
            depot: 'Delhi Division Safety Wing',
            assignedCount: t1Lookouts,
            trade: 'Safety Squad',
            status: 'CONFIRMED',
          },
        ],
        statutoryRule: 'IRTMM Para 3.2.1 / IRBM Para 1102 (Track Machine & Bridge Mandate)',
        rootCauseType: 'AGING_ASSET',
      },
      {
        id: `TSK-${cid}-D${String(day).padStart(2, '0')}-02`,
        title: dayPoint.primaryDefectDriver,
        department: defectDept,
        corridorId: cid,
        assetId: defectDept === 'TRACTION' ? corrAssets.traction.id : defectDept === 'S&T' ? corrAssets.st.id : corrAssets.engineering.id,
        assetName: defectDept === 'TRACTION' ? corrAssets.traction.name : defectDept === 'S&T' ? corrAssets.st.name : corrAssets.engineering.name,
        section: defectDept === 'TRACTION' ? corrAssets.traction.section : defectDept === 'S&T' ? corrAssets.st.section : corrAssets.engineering.section,
        timeSlot: '13:45 – 16:30 (Traffic Shadow Window)',
        priority: 'CRITICAL',
        isDeficitContributor: t2Deficit > 0,
        deficitContributionReason: t2Deficit > 0
          ? `High flaw defect density demands emergency specialized rectification team (-${t2Deficit} staff shortfall).`
          : 'Manned with qualified flaw detection crew.',
        requiredStaff: {
          trackmen: t2Trackmen,
          signalTechs: t2Signal,
          oheLinesmen: t2Ohe,
          safetyLookouts: t2Lookouts,
          total: t2Total,
        },
        allocatedStaff: Math.max(0, t2Total - t2Deficit),
        staffShortfall: t2Deficit,
        requiredMachinery: dayPoint.usfdCarsRequired > 0 ? ['USFD Rail Flaw Detection Car', 'Emergency Rail Dolly'] : ['OHE Tower Wagon (8-Wheeler DETC)'],
        machineryHours: dayPoint.usfdCarsRequired > 0 ? 3.0 : 2.5,
        machineryDetails: dayPoint.usfdCarsRequired > 0
          ? [
              { name: 'USFD Rail Flaw Detection Car', hours: 3.0, slots: 1, engineCode: 'USFD-CAR-04' },
              { name: 'Emergency Rail Dolly & Hydraulic Tensor', hours: 2.0, slots: 1, engineCode: 'DOL-HT-11' },
            ]
          : [
              { name: 'OHE Tower Wagon (8-Wheeler DETC)', hours: 2.5, slots: 1, engineCode: 'DETC-RUPS-09' },
            ],
        assignedGangs: [
          {
            id: `GANG-${cid}-USFD-02`,
            name: `USFD Ultrasonic Flaw Rectification Squad #02`,
            lead: 'JE/USFD Alok Kumar',
            depot: 'Ghaziabad Fast-Response Flaw Depot',
            assignedCount: Math.max(0, t2Total - t2Deficit),
            trade: 'P-Way Gang',
            status: t2Deficit > 0 ? 'SHORT_STAFFED' : 'CONFIRMED',
          },
        ],
        statutoryRule: 'IRPWM Para 6.4 (USFD Defect Classification & Immediate Clamping)',
        rootCauseType: 'DEFECT_CLUSTER',
      },
      {
        id: `TSK-${cid}-D${String(day).padStart(2, '0')}-03`,
        title: 'Point Machine Stroke Current & Multi-Section Axle Counter Calibration',
        department: 'S&T',
        corridorId: cid,
        assetId: corrAssets.st.id,
        assetName: corrAssets.st.name,
        section: corrAssets.st.section,
        timeSlot: '02:00 – 04:15 (Station Interlocking Shadow)',
        priority: 'HIGH',
        isDeficitContributor: t3Deficit > 0,
        deficitContributionReason: t3Deficit > 0
          ? `Shortage of certified S&T Signal Technicians (-${t3Deficit} staff) creates risk of turnout detection failure.`
          : 'Standard station signal maintenance crew on duty.',
        requiredStaff: {
          trackmen: 0,
          signalTechs: t3Signal,
          oheLinesmen: 0,
          safetyLookouts: t3Lookouts,
          total: t3Total,
        },
        allocatedStaff: Math.max(0, t3Total - t3Deficit),
        staffShortfall: t3Deficit,
        requiredMachinery: ['Portable Micro-Ohmmeter & Digital Oscilloscope Test Kit'],
        machineryHours: 2.25,
        machineryDetails: [
          { name: 'Portable Micro-Ohmmeter & Digital Oscilloscope Kit', hours: 2.25, slots: 1, engineCode: 'ST-CALIB-01' },
        ],
        assignedGangs: [
          {
            id: `GANG-${cid}-ST-07`,
            name: `S&T Interlocking Signal Gang #07`,
            lead: 'SSE/Signal Vikas Sharma',
            depot: 'Anand Vihar S&T Maintenance Depot',
            assignedCount: Math.max(0, t3Total - t3Deficit),
            trade: 'Signal Squad',
            status: t3Deficit > 0 ? 'SHORT_STAFFED' : 'CONFIRMED',
          },
        ],
        statutoryRule: 'SEM Para 19.4 (Signal Engineering Manual - Monthly Point Machine Overhaul)',
        rootCauseType: 'CYCLIC_SCHEDULE',
      },
      {
        id: `TSK-${cid}-D${String(day).padStart(2, '0')}-04`,
        title: '25kV Overhead Catenary Wire Height & Stagger Laser Profiling',
        department: 'TRACTION',
        corridorId: cid,
        assetId: corrAssets.traction.id,
        assetName: corrAssets.traction.name,
        section: corrAssets.traction.section,
        timeSlot: '14:00 – 16:00 (Regulated Power Block)',
        priority: 'MEDIUM',
        isDeficitContributor: t4Deficit > 0,
        deficitContributionReason: t4Deficit > 0
          ? `TRD Earthing discharge rods require minimum certified linesmen (-${t4Deficit} staff shortfall).`
          : 'Depot TRD Linemen Gang assigned.',
        requiredStaff: {
          trackmen: 0,
          signalTechs: 0,
          oheLinesmen: t4Ohe,
          safetyLookouts: t4Lookouts,
          total: t4Total,
        },
        allocatedStaff: Math.max(0, t4Total - t4Deficit),
        staffShortfall: t4Deficit,
        requiredMachinery: ['OHE Tower Wagon (RUPS-DETC 8W)'],
        machineryHours: 2.0,
        machineryDetails: [
          { name: 'OHE Tower Wagon (RUPS-DETC 8W)', hours: 2.0, slots: 1, engineCode: 'TW-DETC-8W-03' },
        ],
        assignedGangs: [
          {
            id: `GANG-${cid}-TRD-03`,
            name: `TRD Catenary Overhead Maintenance Gang #03`,
            lead: 'SSE/TRD Suresh Chandra',
            depot: 'OHE Maintenance Depot Sahibabad',
            assignedCount: Math.max(0, t4Total - t4Deficit),
            trade: 'TRD Tower Crew',
            status: t4Deficit > 0 ? 'SHORT_STAFFED' : 'CONFIRMED',
          },
        ],
        statutoryRule: 'ACTM Vol II Para 20.3 (Overhead Traction Isolating & Bonding Protocol)',
        rootCauseType: 'CYCLIC_SCHEDULE',
      },
      {
        id: `TSK-${cid}-D${String(day).padStart(2, '0')}-05`,
        title: 'Continuous Track Geometry Correction & Dynamic Stabilization',
        department: 'ENGINEERING',
        corridorId: cid,
        assetId: corrAssets.engineering.id,
        assetName: corrAssets.engineering.name,
        section: corrAssets.engineering.section,
        timeSlot: '01:45 – 05:00 (Integrated Track Machine Block)',
        priority: isWeekend ? 'CRITICAL' : 'HIGH',
        isDeficitContributor: t5Deficit > 0,
        deficitContributionReason: t5Deficit > 0
          ? `Heavy tamping possession requires full P-Way support gang (-${t5Deficit} staff deficit).`
          : 'PWI Section Gang fully mobilized.',
        requiredStaff: {
          trackmen: t5Trackmen,
          signalTechs: 0,
          oheLinesmen: 0,
          safetyLookouts: t5Lookouts,
          total: t5Total,
        },
        allocatedStaff: Math.max(0, t5Total - t5Deficit),
        staffShortfall: t5Deficit,
        requiredMachinery: [
          'Tie Tamper CSM 09-3X',
          'Ballast Regulator BRM-205',
          'Dynamic Track Stabilizer (DTS)',
        ],
        machineryHours: 4.75,
        machineryDetails: [
          { name: 'Tie Tamper CSM 09-3X', hours: 4.75, slots: 1, engineCode: 'CSM-09-3X-NDLS' },
          { name: 'Ballast Regulator BRM-205', hours: 4.0, slots: 1, engineCode: 'BRM-205-TKD' },
          { name: 'Dynamic Track Stabilizer (DTS)', hours: 3.5, slots: 1, engineCode: 'DTS-302-NR' },
        ],
        assignedGangs: [
          {
            id: `GANG-${cid}-MACH-11`,
            name: `Mechanized Tamping Support Gang #11`,
            lead: 'SSE/Track Machines D. P. Yadav',
            depot: 'Delhi Division P-Way Yard Shakurbasti',
            assignedCount: Math.max(0, t5Total - t5Deficit),
            trade: 'P-Way Gang',
            status: t5Deficit > 0 ? 'SHORT_STAFFED' : 'CONFIRMED',
          },
        ],
        statutoryRule: 'IRTMM Para 2.4.1 (Mechanized Maintenance Code of Practice)',
        rootCauseType: isWeekend ? 'MEGA_BLOCK' : 'CYCLIC_SCHEDULE',
      },
    ];

    return tasks;
  }

  public exportDayTasksCsv(dayPoint: DailyForecastPoint, tasks: DayContributingTask[]): string {
    const headers = [
      'TaskId',
      'Title',
      'Department',
      'CorridorId',
      'AssetId',
      'AssetName',
      'Section',
      'TimeSlot',
      'Priority',
      'IsDeficitContributor',
      'StaffRequiredTotal',
      'StaffAllocated',
      'StaffShortfall',
      'AssignedGangs',
      'MachineryHours',
      'RequiredMachinery',
      'TrackmenRequired',
      'SignalTechsRequired',
      'OheLinesmenRequired',
      'LookoutsRequired',
      'StatutoryRule',
      'RootCauseType',
      'DeficitReason',
    ];

    const rows = tasks.map((t) => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.department,
      t.corridorId,
      t.assetId,
      `"${t.assetName.replace(/"/g, '""')}"`,
      `"${t.section.replace(/"/g, '""')}"`,
      `"${t.timeSlot.replace(/"/g, '""')}"`,
      t.priority,
      t.isDeficitContributor ? 'YES' : 'NO',
      t.requiredStaff.total,
      t.allocatedStaff,
      t.staffShortfall,
      `"${t.assignedGangs.map((g) => `${g.name} (${g.lead}, ${g.assignedCount} staff)`).join('; ').replace(/"/g, '""')}"`,
      t.machineryHours,
      `"${t.requiredMachinery.join('; ').replace(/"/g, '""')}"`,
      t.requiredStaff.trackmen,
      t.requiredStaff.signalTechs,
      t.requiredStaff.oheLinesmen,
      t.requiredStaff.safetyLookouts,
      `"${t.statutoryRule.replace(/"/g, '""')}"`,
      t.rootCauseType,
      `"${t.deficitContributionReason.replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export interface AssignedGangInfo {
  id: string;
  name: string;
  lead: string;
  depot: string;
  assignedCount: number;
  trade: 'P-Way Gang' | 'Signal Squad' | 'TRD Tower Crew' | 'Safety Squad';
  status: 'CONFIRMED' | 'SHORT_STAFFED' | 'STANDBY_ALERT';
}

export interface TaskMachineryRequirement {
  name: string;
  hours: number;
  slots: number;
  engineCode?: string;
}

export interface DayContributingTask {
  id: string;
  title: string;
  department: DepartmentType;
  corridorId: string;
  assetId: string;
  assetName: string;
  section: string;
  timeSlot: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  isDeficitContributor: boolean;
  deficitContributionReason: string;
  requiredStaff: {
    trackmen: number;
    signalTechs: number;
    oheLinesmen: number;
    safetyLookouts: number;
    total: number;
  };
  allocatedStaff: number;
  staffShortfall: number;
  requiredMachinery: string[];
  machineryHours: number;
  machineryDetails: TaskMachineryRequirement[];
  assignedGangs: AssignedGangInfo[];
  statutoryRule: string;
  rootCauseType: 'AGING_ASSET' | 'DEFECT_CLUSTER' | 'CYCLIC_SCHEDULE' | 'MEGA_BLOCK';
}

export const resourceForecastService = new ResourceForecastService();
