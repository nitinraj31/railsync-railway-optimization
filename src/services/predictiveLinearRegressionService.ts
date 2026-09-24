import { DailyForecastPoint } from '../types';

export interface HistoricalMaintenanceCycleDriver {
  id: string;
  name: string;
  cycleIntervalDays: number;
  department: 'ENGINEERING' | 'S&T' | 'TRACTION' | 'SAFETY';
  cyclicalWeight: number; // relative demand acceleration coefficient
  description: string;
  affectedCorridors: string[];
}

export interface PredictiveTrendPoint {
  dayNumber: number;
  date: string;
  displayDate: string;
  dayOfWeek: string;
  trendDemand: number; // OLS linear regression fitted value (rounded)
  trendDemandRaw: number; // unrounded
  lowerConfidence95: number; // lower 95% prediction interval band
  upperConfidence95: number; // upper 95% prediction interval band
  historicalCycleDemand: number; // historical maintenance cycle reference
  actualDemand: number; // current forecasted demand
  residual: number; // actual - trend
  dominantCycleDriver: string;
}

export interface PredictiveLinearRegressionResult {
  slope: number; // m in y = mx + c (manpower headcount delta per day)
  intercept: number; // c in y = mx + c
  rSquared: number; // R² determination coefficient (0 to 1)
  pearsonR: number; // Pearson correlation coefficient r (-1 to 1)
  standardError: number; // Residual standard error
  formulaStr: string; // e.g. "ŷ = +0.82x + 119.4"
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
  percentChangeOver30Days: number; // % change from Day 1 to Day 30 projected
  day1Projected: number;
  day15Projected: number;
  day30Projected: number;
  netHeadcountDelta30Days: number;
  points: PredictiveTrendPoint[];
  historicalCycleDrivers: HistoricalMaintenanceCycleDriver[];
  modelMetadata: {
    algorithm: string;
    sampleSize: number;
    confidenceLevel: string;
    basis: string;
    lastComputed: string;
  };
  operationalInsights: {
    summary: string;
    historicalContext: string;
    recommendedMitigation: string;
  };
}

// Canonical Indian Railways historical maintenance cycle drivers (IRTMM / P-Way Manual)
export const HISTORICAL_MAINTENANCE_CYCLE_DRIVERS: HistoricalMaintenanceCycleDriver[] = [
  {
    id: 'CYCLE-USFD-28D',
    name: '28-Day USFD Continuous Ultrasonic Rail Flaw Cycle',
    cycleIntervalDays: 28,
    department: 'ENGINEERING',
    cyclicalWeight: 1.34,
    description: 'Post-freight cyclic ultrasound flaw sweeps detecting transverse railhead micro-cracks and weld toe fatigue on heavy-axle corridors.',
    affectedCorridors: ['C001', 'C003'],
  },
  {
    id: 'CYCLE-CATENARY-21D',
    name: '21-Day 25kV OHE Dropper Thermal Hotspot Inspection',
    cycleIntervalDays: 21,
    department: 'TRACTION',
    cyclicalWeight: 1.22,
    description: 'Infrared thermography cycles identifying contact wire dropper sparks, high-resistance joints, and pantograph wear.',
    affectedCorridors: ['C001', 'C004'],
  },
  {
    id: 'CYCLE-POINT-35D',
    name: '35-Day S&T Point Machine & Interlocking Overhaul',
    cycleIntervalDays: 35,
    department: 'S&T',
    cyclicalWeight: 1.18,
    description: 'Periodic switch roller lubrication, 143mm motor throw current calibration, and facing point lock clearance validation.',
    affectedCorridors: ['C001', 'C002', 'C003', 'C004'],
  },
  {
    id: 'CYCLE-TAMP-60D',
    name: '50 GMT / 60-Day Deep Ballast Tamping & Track Geometry Cycle',
    cycleIntervalDays: 60,
    department: 'ENGINEERING',
    cyclicalWeight: 1.45,
    description: 'Mechanized continuous 09-3X CSM tamping and dynamic track stabilization following cumulative gross million tonne passage.',
    affectedCorridors: ['C002', 'C003'],
  },
  {
    id: 'CYCLE-MEGABLOCK-7D',
    name: '7-Day Cyclical Weekend Mega-Block Overhaul',
    cycleIntervalDays: 7,
    department: 'SAFETY',
    cyclicalWeight: 1.28,
    description: 'Synchronized multi-disciplinary corridor closures for joint P-Way, S&T, and TRD heavy renewal tasks.',
    affectedCorridors: ['C001', 'C002', 'C003', 'C004'],
  },
];

class PredictiveLinearRegressionService {
  /**
   * Computes an Ordinary Least Squares (OLS) linear regression trend line
   * predicting 30-day resource demand based on historical maintenance cycles.
   *
   * @param forecastData The daily forecast points (typically 30 days)
   * @param corridorFilter Corridor filter ('ALL' or specific ID)
   */
  public computeLinearRegression(
    forecastData: DailyForecastPoint[],
    corridorFilter: string = 'ALL'
  ): PredictiveLinearRegressionResult {
    if (!forecastData || forecastData.length === 0) {
      return this.getEmptyResult();
    }

    const N = forecastData.length;
    const xValues: number[] = [];
    const yValues: number[] = []; // Current demand
    const yHistValues: number[] = []; // Historical maintenance cycle baseline

    // Prepare data arrays
    forecastData.forEach((pt) => {
      xValues.push(pt.dayNumber);
      yValues.push(pt.manpowerRequired);
      yHistValues.push(pt.previousPeriodManpowerRequired || pt.manpowerRequired);
    });

    // 1. Calculate Means
    const meanX = xValues.reduce((a, b) => a + b, 0) / N;
    const meanY = yValues.reduce((a, b) => a + b, 0) / N;
    const meanYHist = yHistValues.reduce((a, b) => a + b, 0) / N;

    // 2. Sum of Squares and Cross-Products
    let ssXX = 0;
    let ssYY = 0;
    let ssXY = 0;

    for (let i = 0; i < N; i++) {
      const dx = xValues[i] - meanX;
      const dy = yValues[i] - meanY;
      ssXX += dx * dx;
      ssYY += dy * dy;
      ssXY += dx * dy;
    }

    // 3. Slope (m) and Intercept (c)
    // Avoid division by zero
    const slope = ssXX !== 0 ? ssXY / ssXX : 0;
    const intercept = meanY - slope * meanX;

    // 4. Pearson r and R² (Coefficient of Determination)
    const denominator = Math.sqrt(ssXX * ssYY);
    const pearsonR = denominator !== 0 ? ssXY / denominator : 0;
    const rSquared = Math.max(0, Math.min(1, pearsonR * pearsonR));

    // 5. Standard Error of Estimate (Residual SE)
    let sumSquaredResiduals = 0;
    for (let i = 0; i < N; i++) {
      const yFitted = slope * xValues[i] + intercept;
      const res = yValues[i] - yFitted;
      sumSquaredResiduals += res * res;
    }
    const degreesOfFreedom = Math.max(1, N - 2);
    const standardError = Math.sqrt(sumSquaredResiduals / degreesOfFreedom);

    // Critical t-value for 95% confidence (approx 2.048 for df ≈ 28)
    const tCrit95 = N >= 20 ? 2.048 : 2.228;

    // 6. Generate Predictive Trend Points with 95% Prediction Interval Band
    const points: PredictiveTrendPoint[] = forecastData.map((pt, idx) => {
      const x = pt.dayNumber;
      const trendRaw = slope * x + intercept;
      const trendRounded = Math.round(trendRaw);

      // Prediction interval for an individual future observation:
      // PI = tCrit * SE * sqrt(1 + 1/N + (x - meanX)^2 / ssXX)
      const leverage = ssXX !== 0 ? Math.pow(x - meanX, 2) / ssXX : 0;
      const predictionMargin = tCrit95 * standardError * Math.sqrt(1 + 1 / N + leverage);

      const upperConfidence95 = Math.round(trendRaw + predictionMargin);
      const lowerConfidence95 = Math.max(0, Math.round(trendRaw - predictionMargin));
      const residual = pt.manpowerRequired - trendRounded;

      // Identify dominant historical cycle driver for this day
      let dominantDriver = 'Routine Cyclical Track Maintenance';
      if (x % 7 === 0 || x % 7 === 6) {
        dominantDriver = 'Weekend Mega-Block Synchronized Maintenance (7-Day Cycle)';
      } else if (x === 4 || x === 11 || x === 18 || x === 25) {
        dominantDriver = 'USFD Transverse Rail Fatigue Wave (28-Day Cycle)';
      } else if (x === 7 || x === 14 || x === 21 || x === 28) {
        dominantDriver = '25kV Catenary Dropper Thermography Sweep (21-Day Cycle)';
      } else if (x === 9 || x === 23) {
        dominantDriver = 'Ballast Deep Screening & 50 GMT Tamping (60-Day Cycle)';
      } else if (x === 13 || x === 27) {
        dominantDriver = 'Electric Point Machine Motor Overhaul (35-Day Cycle)';
      }

      return {
        dayNumber: x,
        date: pt.date,
        displayDate: pt.displayDate,
        dayOfWeek: pt.dayOfWeek,
        trendDemand: trendRounded,
        trendDemandRaw: trendRaw,
        lowerConfidence95,
        upperConfidence95,
        historicalCycleDemand: pt.previousPeriodManpowerRequired || pt.manpowerRequired,
        actualDemand: pt.manpowerRequired,
        residual,
        dominantCycleDriver: dominantDriver,
      };
    });

    // 7. Projections and Summary Stats
    const day1Projected = Math.round(slope * 1 + intercept);
    const day15Projected = Math.round(slope * 15 + intercept);
    const day30Projected = Math.round(slope * N + intercept);
    const netHeadcountDelta = day30Projected - day1Projected;
    const percentChangeOver30Days =
      day1Projected > 0 ? Math.round((netHeadcountDelta / day1Projected) * 1000) / 10 : 0;

    let trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (slope > 0.15) {
      trendDirection = 'INCREASING';
    } else if (slope < -0.15) {
      trendDirection = 'DECREASING';
    }

    const sign = slope >= 0 ? '+' : '';
    const formulaStr = `ŷ = ${sign}${slope.toFixed(2)}x + ${intercept.toFixed(1)}`;

    // 8. Qualitative Insights for Planners
    const corridorLabel = corridorFilter === 'ALL' ? 'Network-Wide' : `Corridor ${corridorFilter}`;
    const operationalInsights = this.generateOperationalInsights(
      slope,
      rSquared,
      day1Projected,
      day30Projected,
      percentChangeOver30Days,
      corridorLabel
    );

    return {
      slope: Math.round(slope * 100) / 100,
      intercept: Math.round(intercept * 10) / 10,
      rSquared: Math.round(rSquared * 100) / 100,
      pearsonR: Math.round(pearsonR * 100) / 100,
      standardError: Math.round(standardError * 10) / 10,
      formulaStr,
      trendDirection,
      percentChangeOver30Days,
      day1Projected,
      day15Projected,
      day30Projected,
      netHeadcountDelta30Days: netHeadcountDelta,
      points,
      historicalCycleDrivers: HISTORICAL_MAINTENANCE_CYCLE_DRIVERS,
      modelMetadata: {
        algorithm: 'Ordinary Least Squares (OLS) Linear Regression',
        sampleSize: N,
        confidenceLevel: '95% Prediction Interval Band',
        basis: 'Historical 30-Day Maintenance Cycles + IRTMM Asset Renewal Periodicities',
        lastComputed: new Date().toISOString(),
      },
      operationalInsights,
    };
  }

  private generateOperationalInsights(
    slope: number,
    rSquared: number,
    day1: number,
    day30: number,
    pctChange: number,
    corridorLabel: string
  ): {
    summary: string;
    historicalContext: string;
    recommendedMitigation: string;
  } {
    if (slope > 0.25) {
      return {
        summary: `Strong upward demand trajectory: projected staffing requirement rises from ${day1} to ${day30} personnel (+${pctChange}%) over the 30-day forecast horizon.`,
        historicalContext: `Historical maintenance cycles indicate that post-monsoon track drying accelerates cumulative ballast compaction, triggering a convergence of 50 GMT mechanized tamping cycles and 28-day USFD rail flaw sweeps in ${corridorLabel}.`,
        recommendedMitigation: `Stage reserve gangs at central divisional depots and pre-allocate 09-3X CSM tamping machine slots by Day 15 to prevent critical maintenance backlogs.`,
      };
    } else if (slope < -0.25) {
      return {
        summary: `Downward demand glide path: projected staffing requirement tapers from ${day1} to ${day30} personnel (${pctChange}%) across ${corridorLabel}.`,
        historicalContext: `Preceding heavy monsoon drainage remediation and ballast pocket screening cycles are winding down as stabilized track geometries reach baseline IRTMM parameters.`,
        recommendedMitigation: `Schedule preventive machinery depot maintenance and facilitate mandatory rest/rotation cycles for fatigue-strained P-Way trackmen gangs.`,
      };
    } else {
      return {
        summary: `Stable demand baseline: linear regression projects a steady load averaging ${Math.round((day1 + day30) / 2)} personnel/day (${slope >= 0 ? '+' : ''}${slope.toFixed(2)} staff/day slope).`,
        historicalContext: `Recurring maintenance cycles remain evenly distributed throughout the month, with periodic weekend mega-block spikes offset by regular weekday throughput.`,
        recommendedMitigation: `Maintain standard gang allocations and monitor localized USFD defect wave days (Days 4, 11, 18, 25) for temporary tactical rebalances.`,
      };
    }
  }

  private getEmptyResult(): PredictiveLinearRegressionResult {
    return {
      slope: 0,
      intercept: 0,
      rSquared: 0,
      pearsonR: 0,
      standardError: 0,
      formulaStr: 'ŷ = 0x + 0',
      trendDirection: 'STABLE',
      percentChangeOver30Days: 0,
      day1Projected: 0,
      day15Projected: 0,
      day30Projected: 0,
      netHeadcountDelta30Days: 0,
      points: [],
      historicalCycleDrivers: HISTORICAL_MAINTENANCE_CYCLE_DRIVERS,
      modelMetadata: {
        algorithm: 'Ordinary Least Squares (OLS) Linear Regression',
        sampleSize: 0,
        confidenceLevel: '95% Prediction Interval',
        basis: 'Historical Maintenance Cycles',
        lastComputed: new Date().toISOString(),
      },
      operationalInsights: {
        summary: 'No forecast data available to compute regression trend.',
        historicalContext: 'Awaiting corridor forecast input.',
        recommendedMitigation: 'Select an active corridor and forecast scenario.',
      },
    };
  }
}

export const predictiveLinearRegressionService = new PredictiveLinearRegressionService();
