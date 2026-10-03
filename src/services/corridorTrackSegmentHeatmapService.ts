import * as d3 from 'd3';
import { DepartmentType } from '../types';

export type MaintenanceSeverityTier = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'HEALTHY';

export interface HeatmapTrackSegment {
  segmentId: string;
  corridorId: string; // 'C001' | 'C002' | 'C003' | 'C004'
  corridorCode: string;
  corridorName: string;
  fromStation: string;
  toStation: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  trackLine: string;
  railStructure: string;
  speedLimitKmph: number;

  // Maintenance Severity (0 - 100%)
  maintenanceSeverityScore: number;
  severityTier: MaintenanceSeverityTier;
  failureRiskProbabilityPct: number;
  trackDegradationIndex: number; // 0 - 100
  gaugeSpreadMm: number; // deviation from nominal 1676mm

  // Expected Repair Duration
  expectedRepairDurationMinutes: number; // e.g. 30 to 180 min
  expectedRepairDurationHours: number; // e.g. 0.5h to 3.0h
  durationCategory: 'EXTENDED_MEGA' | 'HEAVY_BLOCK' | 'MEDIUM_WINDOW' | 'LIGHT_POSSESSION' | 'ROUTINE_QUICK';

  // Work Requisition Profile
  recommendedDepartment: DepartmentType;
  primaryDefectCategory: string;
  defectSummary: string;
  recommendedMachinery: string;
  requiredGangStrength: number;
  tractionIsolationRequired: boolean;
  recommendedTimeSlot: string;
  threatenedTrainsCount: number;
  projectedPunctualityLossMinutes: number;
  statutoryStandard: string;
}

export interface CorridorHeatmapSummary {
  corridorId: string;
  corridorName: string;
  totalSegments: number;
  totalRouteKm: number;
  criticalSegmentsCount: number;
  highSegmentsCount: number;
  moderateSegmentsCount: number;
  healthySegmentsCount: number;
  averageSeverityScore: number;
  totalRepairDurationMinutes: number;
  totalRepairDurationHours: number;
  threatenedTrainsTotal: number;
}

// Complete realistic segments across Indian Railways Delhi Division 4 Main Corridors
export const CORRIDOR_HEATMAP_SEGMENTS: HeatmapTrackSegment[] = [
  // =========================================================================
  // CORRIDOR C001: Northern Main Trunk (142 KM)
  // =========================================================================
  {
    segmentId: 'C001-S1-NDLS-SBB',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'New Delhi (NDLS)',
    toStation: 'Sahibabad (SBB)',
    startKm: 0.0,
    endKm: 18.2,
    lengthKm: 18.2,
    trackLine: 'UP & DOWN Quad Lines',
    railStructure: '60kg UIC / PSC Sleepers 1660/km / Elastic Rail Clips Mark-V',
    speedLimitKmph: 130,

    maintenanceSeverityScore: 22,
    severityTier: 'HEALTHY',
    failureRiskProbabilityPct: 18,
    trackDegradationIndex: 28,
    gaugeSpreadMm: 0.8,

    expectedRepairDurationMinutes: 30,
    expectedRepairDurationHours: 0.5,
    durationCategory: 'ROUTINE_QUICK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Nominal Track Settlement & Routine Joint Check',
    defectSummary: 'Track alignment verified within permissible limits by OMS-2000. Minor ballast packing needed at approach apron.',
    recommendedMachinery: 'Light Packing Unit (Off-Track Manual Kit)',
    requiredGangStrength: 4,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '11:00–11:30 (Midday suburban interval)',
    threatenedTrainsCount: 2,
    projectedPunctualityLossMinutes: 8,
    statutoryStandard: 'IRPW Manual Para 210 (Monthly Foot Patrol Audit)',
  },
  {
    segmentId: 'C001-S2-SBB-GZB',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'Sahibabad (SBB)',
    toStation: 'Ghaziabad Junction (GZB)',
    startKm: 18.2,
    endKm: 28.5,
    lengthKm: 10.3,
    trackLine: 'UP Main Fast Line',
    railStructure: '60kg UIC / Continuous Welded Rail / Heavy Freight Corridor',
    speedLimitKmph: 130,

    maintenanceSeverityScore: 92,
    severityTier: 'CRITICAL',
    failureRiskProbabilityPct: 92,
    trackDegradationIndex: 88,
    gaugeSpreadMm: 4.8,

    expectedRepairDurationMinutes: 150,
    expectedRepairDurationHours: 2.5,
    durationCategory: 'EXTENDED_MEGA',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'CWR Fatigue Micro-Cracking (IMR Flaw WJ-108)',
    defectSummary: 'Severe ultrasonic echo attenuation at weld joint WJ-108 with 18mm web penetration. Mandatory rail replacement within 72h.',
    recommendedMachinery: 'CSM-900 Duo Tamping Machine + Rail Tensor RT-70',
    requiredGangStrength: 18,
    tractionIsolationRequired: true,
    recommendedTimeSlot: '01:30–04:00 (Night Mega-Block post-Prayagraj Express)',
    threatenedTrainsCount: 16,
    projectedPunctualityLossMinutes: 145,
    statutoryStandard: 'IRPW Manual Para 224 (Immediate Removal within 72h)',
  },
  {
    segmentId: 'C001-S3-GZB-ALJN',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'Ghaziabad (GZB)',
    toStation: 'Aligarh Junction (ALJN)',
    startKm: 28.5,
    endKm: 85.0,
    lengthKm: 56.5,
    trackLine: 'Double Fast Line',
    railStructure: '60kg UIC / PSC Sleepers / Auto-Block Signaling',
    speedLimitKmph: 130,

    maintenanceSeverityScore: 58,
    severityTier: 'MODERATE',
    failureRiskProbabilityPct: 54,
    trackDegradationIndex: 54,
    gaugeSpreadMm: 3.2,

    expectedRepairDurationMinutes: 120,
    expectedRepairDurationHours: 2.0,
    durationCategory: 'HEAVY_BLOCK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Track Geometry Index (TGI) Twist & Gauge Drift',
    defectSummary: 'Ballast consolidation variance causing +3.2mm gauge widening across 6km subgrade plain between Somna and Kulwa.',
    recommendedMachinery: '09-3X Continuous Action Tamping Machine',
    requiredGangStrength: 12,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '11:30–13:30 (Midday freight lull slot)',
    threatenedTrainsCount: 18,
    projectedPunctualityLossMinutes: 45,
    statutoryStandard: 'IRPW Manual Para 501 (Tamping Frequency Rules)',
  },
  {
    segmentId: 'C001-S4-ALJN-TDL',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'Aligarh Junction (ALJN)',
    toStation: 'Tundla Junction (TDL)',
    startKm: 85.0,
    endKm: 142.0,
    lengthKm: 57.0,
    trackLine: 'Double Fast Line',
    railStructure: '60kg PSC / Route Relay Interlocking / CWR',
    speedLimitKmph: 130,

    maintenanceSeverityScore: 36,
    severityTier: 'LOW',
    failureRiskProbabilityPct: 32,
    trackDegradationIndex: 40,
    gaugeSpreadMm: 1.6,

    expectedRepairDurationMinutes: 60,
    expectedRepairDurationHours: 1.0,
    durationCategory: 'LIGHT_POSSESSION',

    recommendedDepartment: 'TRACTION',
    primaryDefectCategory: 'Catenary Cantilever Insulator Washing & Drop Check',
    defectSummary: 'Saline and dust accretion on 25kV porcelain insulators near brick kiln area. High-pressure jet wash scheduled.',
    recommendedMachinery: 'Self-Propelled Tower Inspection Car',
    requiredGangStrength: 6,
    tractionIsolationRequired: true,
    recommendedTimeSlot: '14:00–15:00 (Afternoon window)',
    threatenedTrainsCount: 6,
    projectedPunctualityLossMinutes: 15,
    statutoryStandard: 'ACTM Para 20450 (Pollution Zone Washing Rules)',
  },

  // =========================================================================
  // CORRIDOR C002: High-Speed Passenger Corridor (98 KM)
  // =========================================================================
  {
    segmentId: 'C002-S1-DLI-SZM',
    corridorId: 'C002',
    corridorCode: 'C002',
    corridorName: 'High-Speed Passenger Corridor',
    fromStation: 'Delhi Junction (DLI)',
    toStation: 'Sabzi Mandi (SZM)',
    startKm: 0.0,
    endKm: 4.8,
    lengthKm: 4.8,
    trackLine: 'Double Track Auto-Signaled',
    railStructure: '60kg PSC / Electronic Point Machines / High Frequency Throat',
    speedLimitKmph: 160,

    maintenanceSeverityScore: 74,
    severityTier: 'HIGH',
    failureRiskProbabilityPct: 76,
    trackDegradationIndex: 69,
    gaugeSpreadMm: 2.8,

    expectedRepairDurationMinutes: 90,
    expectedRepairDurationHours: 1.5,
    durationCategory: 'MEDIUM_WINDOW',

    recommendedDepartment: 'S&T',
    primaryDefectCategory: 'Electric Point Machine Motor Stall Current Spikes',
    defectSummary: 'Point Machine PM-14B throw time breached 4.9s safety threshold. Slide friction high due to dust accumulation in busy throat.',
    recommendedMachinery: 'S&T Point Calibration Kit + Switch Roller Lubricator Squad',
    requiredGangStrength: 8,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '02:00–03:30 (Midnight station lull)',
    threatenedTrainsCount: 22,
    projectedPunctualityLossMinutes: 180,
    statutoryStandard: 'Signal Engineering Manual (SEM Part II) Section 19',
  },
  {
    segmentId: 'C002-S2-SZM-ANDI',
    corridorId: 'C002',
    corridorCode: 'C002',
    corridorName: 'High-Speed Passenger Corridor',
    fromStation: 'Sabzi Mandi (SZM)',
    toStation: 'Adarsh Nagar (ANDI)',
    startKm: 4.8,
    endKm: 22.0,
    lengthKm: 17.2,
    trackLine: 'Double Track Auto-Signaled',
    railStructure: '60kg PSC / 160 km/h Vande Bharat Track Bed',
    speedLimitKmph: 160,

    maintenanceSeverityScore: 82,
    severityTier: 'CRITICAL',
    failureRiskProbabilityPct: 84,
    trackDegradationIndex: 78,
    gaugeSpreadMm: 4.1,

    expectedRepairDurationMinutes: 135,
    expectedRepairDurationHours: 2.25,
    durationCategory: 'HEAVY_BLOCK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'High-Speed Curve Transition Dynamic Track Irregularity',
    defectSummary: 'Ride Index accelerometer peak 3.8m/s² recorded by OMS car at Curve 12. Ballast voiding under outer rail sleeper pads.',
    recommendedMachinery: 'Dynamic Track Stabilizer (DTS) + CSM-900',
    requiredGangStrength: 16,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '00:30–02:45 (Pre-morning Vande Bharat departures)',
    threatenedTrainsCount: 20,
    projectedPunctualityLossMinutes: 165,
    statutoryStandard: 'Track Safety Standards for 160 km/h Operation (TSS-160)',
  },
  {
    segmentId: 'C002-S3-ANDI-SNP',
    corridorId: 'C002',
    corridorCode: 'C002',
    corridorName: 'High-Speed Passenger Corridor',
    fromStation: 'Adarsh Nagar (ANDI)',
    toStation: 'Sonipat Junction (SNP)',
    startKm: 22.0,
    endKm: 54.0,
    lengthKm: 32.0,
    trackLine: 'Double Track Auto-Signaled',
    railStructure: '60kg PSC / Heavy Ballast Cushion 350mm',
    speedLimitKmph: 160,

    maintenanceSeverityScore: 16,
    severityTier: 'HEALTHY',
    failureRiskProbabilityPct: 12,
    trackDegradationIndex: 22,
    gaugeSpreadMm: 0.6,

    expectedRepairDurationMinutes: 25,
    expectedRepairDurationHours: 0.4,
    durationCategory: 'ROUTINE_QUICK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Nominal Ballast Profile & Shoulder Grooming',
    defectSummary: 'Recently tamped section. Nominal track geometry parameters, excellent ride index 2.1.',
    recommendedMachinery: 'Ballast Regulating Machine (BRM)',
    requiredGangStrength: 4,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '12:30–13:00 (Post-noon traffic lull)',
    threatenedTrainsCount: 0,
    projectedPunctualityLossMinutes: 0,
    statutoryStandard: 'IRPW Manual Para 215',
  },
  {
    segmentId: 'C002-S4-SNP-PNP',
    corridorId: 'C002',
    corridorCode: 'C002',
    corridorName: 'High-Speed Passenger Corridor',
    fromStation: 'Sonipat (SNP)',
    toStation: 'Panipat Junction (PNP)',
    startKm: 54.0,
    endKm: 98.0,
    lengthKm: 44.0,
    trackLine: 'Double Track Auto-Signaled',
    railStructure: '60kg PSC / Continuous Welded Rail / Digital Axle Counters',
    speedLimitKmph: 160,

    maintenanceSeverityScore: 44,
    severityTier: 'LOW',
    failureRiskProbabilityPct: 38,
    trackDegradationIndex: 44,
    gaugeSpreadMm: 1.9,

    expectedRepairDurationMinutes: 60,
    expectedRepairDurationHours: 1.0,
    durationCategory: 'LIGHT_POSSESSION',

    recommendedDepartment: 'S&T',
    primaryDefectCategory: 'Digital Axle Counter (DAC) Sensor Reset & Rail Bond Check',
    defectSummary: 'Occasional intermittent track circuit flickering flagged at Ganaur loop turnout during damp weather.',
    recommendedMachinery: 'Electronic Signal Diagnostic Trolley',
    requiredGangStrength: 5,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '14:30–15:30 (Afternoon window)',
    threatenedTrainsCount: 8,
    projectedPunctualityLossMinutes: 20,
    statutoryStandard: 'SEM Part I Para 722',
  },

  // =========================================================================
  // CORRIDOR C003: Western Heavy Freight & Mixed Traffic Link (165 KM)
  // =========================================================================
  {
    segmentId: 'C003-S1-SSB-BGZ',
    corridorId: 'C003',
    corridorCode: 'C003',
    corridorName: 'Mixed Traffic Freight Link',
    fromStation: 'Shakurbasti (SSB)',
    toStation: 'Bahadurgarh (BGZ)',
    startKm: 0.0,
    endKm: 29.5,
    lengthKm: 29.5,
    trackLine: 'Freight Marshalling & Main Line',
    railStructure: '60kg PSC / High Axle Load 25T Coal Corridor',
    speedLimitKmph: 110,

    maintenanceSeverityScore: 65,
    severityTier: 'MODERATE',
    failureRiskProbabilityPct: 62,
    trackDegradationIndex: 64,
    gaugeSpreadMm: 3.4,

    expectedRepairDurationMinutes: 105,
    expectedRepairDurationHours: 1.75,
    durationCategory: 'MEDIUM_WINDOW',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Turnout Switch Tongue Rail Chipping & Slide Chair Friction',
    defectSummary: 'Heavy freight divergence over turnout #12 at SSB west yard causing wear on curved switch rail.',
    recommendedMachinery: 'Turnout Tamping Machine (Unimat 08-475)',
    requiredGangStrength: 10,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '10:00–11:45 (Freight inter-train margin)',
    threatenedTrainsCount: 10,
    projectedPunctualityLossMinutes: 55,
    statutoryStandard: 'IRPW Manual Para 237 (Points & Crossings Standards)',
  },
  {
    segmentId: 'C003-S2-BGZ-SPZ',
    corridorId: 'C003',
    corridorCode: 'C003',
    corridorName: 'Mixed Traffic Freight Link',
    fromStation: 'Bahadurgarh (BGZ)',
    toStation: 'Sampla (SPZ)',
    startKm: 29.5,
    endKm: 46.0,
    lengthKm: 16.5,
    trackLine: 'Single Freight Trunk Line with Passing Loops',
    railStructure: '60kg PSC / Deep Ballast Cushion 350mm',
    speedLimitKmph: 110,

    maintenanceSeverityScore: 88,
    severityTier: 'CRITICAL',
    failureRiskProbabilityPct: 90,
    trackDegradationIndex: 84,
    gaugeSpreadMm: 5.4,

    expectedRepairDurationMinutes: 180,
    expectedRepairDurationHours: 3.0,
    durationCategory: 'EXTENDED_MEGA',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Ballast Pocket Fouling & Subgrade Mud Pumping',
    defectSummary: 'Severe track alignment drift (-5.2mm cross-level twist) and clay slurry intrusion over 420m stretch near culvert 48.',
    recommendedMachinery: 'Ballast Cleaning Machine (BCM-350) + Dynamic Track Stabilizer (DTS)',
    requiredGangStrength: 24,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '12:00–15:00 (Daylight freight traffic lull)',
    threatenedTrainsCount: 12,
    projectedPunctualityLossMinutes: 210,
    statutoryStandard: 'Section 175 Railways Act / Track Safety Standards Rule 4.2',
  },
  {
    segmentId: 'C003-S3-SPZ-ROK',
    corridorId: 'C003',
    corridorCode: 'C003',
    corridorName: 'Mixed Traffic Freight Link',
    fromStation: 'Sampla (SPZ)',
    toStation: 'Rohtak Junction (ROK)',
    startKm: 46.0,
    endKm: 70.0,
    lengthKm: 24.0,
    trackLine: 'Single Line with Double Passing Loops',
    railStructure: '52kg PSC Sleepers / Passing Loop Expansion',
    speedLimitKmph: 110,

    maintenanceSeverityScore: 78,
    severityTier: 'HIGH',
    failureRiskProbabilityPct: 75,
    trackDegradationIndex: 72,
    gaugeSpreadMm: 3.8,

    expectedRepairDurationMinutes: 140,
    expectedRepairDurationHours: 2.33,
    durationCategory: 'HEAVY_BLOCK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Fishplated Rail Joint Sag & Bolt Hole Elongation',
    defectSummary: 'Passing loop approaches showing sleeper spacing irregularity and joint bolt elongation under repetitive diesel braking.',
    recommendedMachinery: 'Rail Joint De-stressing & Hydraulic Tamping Gang',
    requiredGangStrength: 14,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '13:00–15:20 (Post-express departure slot)',
    threatenedTrainsCount: 14,
    projectedPunctualityLossMinutes: 115,
    statutoryStandard: 'IRPW Manual Para 218',
  },
  {
    segmentId: 'C003-S4-ROK-JIND',
    corridorId: 'C003',
    corridorCode: 'C003',
    corridorName: 'Mixed Traffic Freight Link',
    fromStation: 'Rohtak Junction (ROK)',
    toStation: 'Jind Junction (JIND)',
    startKm: 70.0,
    endKm: 165.0,
    lengthKm: 95.0,
    trackLine: 'Mixed Single Track Territory',
    railStructure: '60kg PSC Sleepers / Elastic Rail Clips',
    speedLimitKmph: 110,

    maintenanceSeverityScore: 28,
    severityTier: 'HEALTHY',
    failureRiskProbabilityPct: 24,
    trackDegradationIndex: 32,
    gaugeSpreadMm: 1.2,

    expectedRepairDurationMinutes: 35,
    expectedRepairDurationHours: 0.58,
    durationCategory: 'ROUTINE_QUICK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Track Clearance Inspection & Fastener Greasing',
    defectSummary: 'Clean ballast shoulders, regular patrol completed. Minor fastener greasing required across culvert 112.',
    recommendedMachinery: 'Mobile P-Way Inspection Push Trolley',
    requiredGangStrength: 4,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '10:30–11:05 (Midday rural window)',
    threatenedTrainsCount: 2,
    projectedPunctualityLossMinutes: 5,
    statutoryStandard: 'IRPW Manual Para 211',
  },

  // =========================================================================
  // CORRIDOR C004: Southern Industrial Branch & Mineral Corridor (115 KM)
  // =========================================================================
  {
    segmentId: 'C004-S1-TKD-FDB',
    corridorId: 'C004',
    corridorCode: 'C004',
    corridorName: 'Southern Industrial Branch',
    fromStation: 'Tuglakabad ICD (TKD)',
    toStation: 'Faridabad (FDB)',
    startKm: 0.0,
    endKm: 28.0,
    lengthKm: 28.0,
    trackLine: 'Container Double Track',
    railStructure: '52kg PSC Sleepers / Dense Container Siding Interlocking',
    speedLimitKmph: 100,

    maintenanceSeverityScore: 48,
    severityTier: 'LOW',
    failureRiskProbabilityPct: 44,
    trackDegradationIndex: 48,
    gaugeSpreadMm: 2.2,

    expectedRepairDurationMinutes: 60,
    expectedRepairDurationHours: 1.0,
    durationCategory: 'LIGHT_POSSESSION',

    recommendedDepartment: 'TRACTION',
    primaryDefectCategory: 'Container Yard 25kV OHE Neutral Section Carbon Cleaning',
    defectSummary: 'Locomotive arc burn deposits on neutral section ceramic beads. Standard chemical swab and wiper blade cleaning.',
    recommendedMachinery: 'DETC-08 OHE Tower Wagon',
    requiredGangStrength: 6,
    tractionIsolationRequired: true,
    recommendedTimeSlot: '11:00–12:00 (Yard container shifting break)',
    threatenedTrainsCount: 6,
    projectedPunctualityLossMinutes: 25,
    statutoryStandard: 'ACTM Para 20430',
  },
  {
    segmentId: 'C004-S2-FDB-BVH',
    corridorId: 'C004',
    corridorCode: 'C004',
    corridorName: 'Southern Industrial Branch',
    fromStation: 'Faridabad (FDB)',
    toStation: 'Ballabgarh (BVH)',
    startKm: 28.0,
    endKm: 37.4,
    lengthKm: 9.4,
    trackLine: 'DOWN Main Line',
    railStructure: '52kg PSC Sleepers / Automatic Signaling Territory',
    speedLimitKmph: 100,

    maintenanceSeverityScore: 76,
    severityTier: 'HIGH',
    failureRiskProbabilityPct: 78,
    trackDegradationIndex: 72,
    gaugeSpreadMm: 2.4,

    expectedRepairDurationMinutes: 120,
    expectedRepairDurationHours: 2.0,
    durationCategory: 'HEAVY_BLOCK',

    recommendedDepartment: 'TRACTION',
    primaryDefectCategory: '25kV Catenary Contact Wire Dropper 82°C Thermal Hotspot',
    defectSummary: 'Infrared drone recorded 82°C thermal surge at Mast 42/14. Contact wire worn to 68mm² with pantograph entanglement risk.',
    recommendedMachinery: 'Self-Propelled OHE Inspection & Tower Car (DETC-08)',
    requiredGangStrength: 10,
    tractionIsolationRequired: true,
    recommendedTimeSlot: '13:00–15:00 (Post-EMU suburban peak lull)',
    threatenedTrainsCount: 14,
    projectedPunctualityLossMinutes: 120,
    statutoryStandard: 'ACTM Volume II Para 20433',
  },
  {
    segmentId: 'C004-S3-BVH-PWL',
    corridorId: 'C004',
    corridorCode: 'C004',
    corridorName: 'Southern Industrial Branch',
    fromStation: 'Ballabgarh (BVH)',
    toStation: 'Palwal Junction (PWL)',
    startKm: 37.4,
    endKm: 62.0,
    lengthKm: 24.6,
    trackLine: 'Double Track Mineral Corridor',
    railStructure: '60kg PSC / Route Relay Interlocking / Steel Girder Bridges',
    speedLimitKmph: 100,

    maintenanceSeverityScore: 86,
    severityTier: 'CRITICAL',
    failureRiskProbabilityPct: 88,
    trackDegradationIndex: 82,
    gaugeSpreadMm: 4.6,

    expectedRepairDurationMinutes: 160,
    expectedRepairDurationHours: 2.67,
    durationCategory: 'EXTENDED_MEGA',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Bridge Approach Transition Track Settlement & Rail Corrugation',
    defectSummary: 'Major ballast settling at abutment of Bridge #84. Heavy corrugation depth 0.9mm causing high impact vibration on freight wheelsets.',
    recommendedMachinery: 'Rail Grinding Machine (RGM-72) + Bridge Tamping Unit',
    requiredGangStrength: 20,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '01:00–03:40 (Night freight halt window)',
    threatenedTrainsCount: 18,
    projectedPunctualityLossMinutes: 190,
    statutoryStandard: 'IRPW Manual Para 274 (Bridge Approaches Maintenance)',
  },
  {
    segmentId: 'C004-S4-PWL-KSV',
    corridorId: 'C004',
    corridorCode: 'C004',
    corridorName: 'Southern Industrial Branch',
    fromStation: 'Palwal (PWL)',
    toStation: 'Kosi Kalan (KSV)',
    startKm: 62.0,
    endKm: 115.0,
    lengthKm: 53.0,
    trackLine: 'Double Track Mineral Corridor',
    railStructure: '60kg UIC / PSC Sleepers / Continuous Welded Rail',
    speedLimitKmph: 100,

    maintenanceSeverityScore: 24,
    severityTier: 'HEALTHY',
    failureRiskProbabilityPct: 20,
    trackDegradationIndex: 26,
    gaugeSpreadMm: 1.0,

    expectedRepairDurationMinutes: 30,
    expectedRepairDurationHours: 0.5,
    durationCategory: 'ROUTINE_QUICK',

    recommendedDepartment: 'ENGINEERING',
    primaryDefectCategory: 'Clean Ballast Cushion Routine Observation',
    defectSummary: 'Recently rehabilitated section. High TGI rating 86, ballast deep-screened 4 months ago.',
    recommendedMachinery: 'Light Motorized Trolley',
    requiredGangStrength: 4,
    tractionIsolationRequired: false,
    recommendedTimeSlot: '11:30–12:00 (Routine midday inspection)',
    threatenedTrainsCount: 1,
    projectedPunctualityLossMinutes: 0,
    statutoryStandard: 'IRPW Manual Para 212',
  },
];

// =========================================================================
// COLOR CODING HELPER UTILITIES (Red-to-Green Spectrum)
// =========================================================================

/**
 * Continuous D3 color interpolation for Maintenance Severity (0% to 100%)
 * 0% = Deep Emerald Green (#10b981) -> 25% = Lime (#84cc16) -> 50% = Amber (#eab308) -> 75% = Orange (#f97316) -> 100% = Crimson Red (#ef4444)
 */
export const getSeverityColorHex = d3
  .scaleLinear<string>()
  .domain([0, 25, 50, 75, 100])
  .range(['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'])
  .clamp(true);

/**
 * Continuous D3 color interpolation for Expected Repair Duration (20m to 180m)
 * ≤30m = Deep Emerald Green -> 60m = Lime -> 90m = Amber -> 135m = Orange -> ≥180m = Crimson Red
 */
export const getDurationColorHex = d3
  .scaleLinear<string>()
  .domain([20, 50, 85, 130, 180])
  .range(['#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444'])
  .clamp(true);

/**
 * Composite Maintenance Heatmap Score (Severity 60% + Duration 40% normalized)
 */
export function getCompositeHeatScore(severityScore: number, durationMinutes: number): number {
  // Duration normalized: 20m = 0%, 180m = 100%
  const durationNormalized = Math.min(100, Math.max(0, ((durationMinutes - 20) / (180 - 20)) * 100));
  return Math.round(severityScore * 0.6 + durationNormalized * 0.4);
}

export function getCompositeColorHex(compositeScore: number): string {
  return getSeverityColorHex(compositeScore);
}

/**
 * UI Badging & Tailwind Color Tokens for Severity
 */
export function getSeverityBadgeProps(severityScore: number) {
  if (severityScore >= 80) {
    return {
      label: 'CRITICAL SEVERITY',
      bgClass: 'bg-rose-950/80',
      borderClass: 'border-rose-500',
      textClass: 'text-rose-200',
      dotClass: 'bg-rose-500',
      hex: '#ef4444',
    };
  }
  if (severityScore >= 65) {
    return {
      label: 'HIGH SEVERITY',
      bgClass: 'bg-orange-950/80',
      borderClass: 'border-orange-500',
      textClass: 'text-orange-200',
      dotClass: 'bg-orange-500',
      hex: '#f97316',
    };
  }
  if (severityScore >= 45) {
    return {
      label: 'MODERATE SEVERITY',
      bgClass: 'bg-amber-950/80',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-200',
      dotClass: 'bg-amber-400',
      hex: '#eab308',
    };
  }
  if (severityScore >= 25) {
    return {
      label: 'LOW / WATCHLIST',
      bgClass: 'bg-lime-950/80',
      borderClass: 'border-lime-500',
      textClass: 'text-lime-200',
      dotClass: 'bg-lime-400',
      hex: '#84cc16',
    };
  }
  return {
    label: 'HEALTHY / NOMINAL',
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-200',
    dotClass: 'bg-emerald-400',
    hex: '#10b981',
  };
}

/**
 * UI Badging & Tailwind Color Tokens for Expected Repair Duration
 */
export function getDurationBadgeProps(durationMins: number) {
  if (durationMins >= 150) {
    return {
      label: `${durationMins}m (Extended Block)`,
      bgClass: 'bg-rose-950/80',
      borderClass: 'border-rose-500',
      textClass: 'text-rose-200',
      dotClass: 'bg-rose-500',
      hex: '#ef4444',
    };
  }
  if (durationMins >= 110) {
    return {
      label: `${durationMins}m (Heavy Window)`,
      bgClass: 'bg-orange-950/80',
      borderClass: 'border-orange-500',
      textClass: 'text-orange-200',
      dotClass: 'bg-orange-500',
      hex: '#f97316',
    };
  }
  if (durationMins >= 70) {
    return {
      label: `${durationMins}m (Medium Window)`,
      bgClass: 'bg-amber-950/80',
      borderClass: 'border-amber-500',
      textClass: 'text-amber-200',
      dotClass: 'bg-amber-400',
      hex: '#eab308',
    };
  }
  if (durationMins >= 40) {
    return {
      label: `${durationMins}m (Light Possession)`,
      bgClass: 'bg-lime-950/80',
      borderClass: 'border-lime-500',
      textClass: 'text-lime-200',
      dotClass: 'bg-lime-400',
      hex: '#84cc16',
    };
  }
  return {
    label: `${durationMins}m (Routine Quick)`,
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-200',
    dotClass: 'bg-emerald-400',
    hex: '#10b981',
  };
}

class CorridorTrackSegmentHeatmapService {
  /**
   * Get track segments filtered by corridor
   */
  public getSegments(corridorId = 'ALL'): HeatmapTrackSegment[] {
    if (corridorId === 'ALL') {
      return CORRIDOR_HEATMAP_SEGMENTS;
    }
    return CORRIDOR_HEATMAP_SEGMENTS.filter((s) => s.corridorId === corridorId);
  }

  /**
   * Get single segment by ID
   */
  public getSegmentById(segmentId: string): HeatmapTrackSegment | undefined {
    return CORRIDOR_HEATMAP_SEGMENTS.find((s) => s.segmentId === segmentId);
  }

  /**
   * Calculate network summary metrics
   */
  public getNetworkSummary(corridorId = 'ALL'): CorridorHeatmapSummary {
    const list = this.getSegments(corridorId);
    const critical = list.filter((s) => s.severityTier === 'CRITICAL').length;
    const high = list.filter((s) => s.severityTier === 'HIGH').length;
    const moderate = list.filter((s) => s.severityTier === 'MODERATE').length;
    const healthy = list.filter((s) => s.severityTier === 'HEALTHY' || s.severityTier === 'LOW').length;

    const totalKm = list.reduce((acc, s) => acc + s.lengthKm, 0);
    const totalMins = list.reduce((acc, s) => acc + s.expectedRepairDurationMinutes, 0);
    const avgSeverity = list.length > 0 ? Math.round(list.reduce((acc, s) => acc + s.maintenanceSeverityScore, 0) / list.length) : 0;
    const threatened = list.reduce((acc, s) => acc + s.threatenedTrainsCount, 0);

    return {
      corridorId,
      corridorName: corridorId === 'ALL' ? 'Total Delhi Division Network' : (list[0]?.corridorName || corridorId),
      totalSegments: list.length,
      totalRouteKm: +totalKm.toFixed(1),
      criticalSegmentsCount: critical,
      highSegmentsCount: high,
      moderateSegmentsCount: moderate,
      healthySegmentsCount: healthy,
      averageSeverityScore: avgSeverity,
      totalRepairDurationMinutes: totalMins,
      totalRepairDurationHours: +(totalMins / 60).toFixed(1),
      threatenedTrainsTotal: threatened,
    };
  }
}

export const corridorTrackSegmentHeatmapService = new CorridorTrackSegmentHeatmapService();
