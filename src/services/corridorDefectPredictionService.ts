import { Corridor, OptimizedBlock, Defect, DepartmentType, PriorityLevel } from '../types';

export type SegmentUrgencyTier = 'CRITICAL' | 'HIGH' | 'WATCHLIST' | 'STABLE';

export interface HistoricalInspectionLogRecord {
  logId: string;
  inspectionDate: string;
  daysAgo: number;
  recordedBy: string;
  designation: string;
  methodology: string; // e.g. "USFD Ultrasonic Trolley", "Track Recording Car OMS", "OHE Thermal Infrared Drone"
  trackDegradationIndex: number; // 0 - 100
  gaugeDeviationMm: number; // +/- mm
  criticalityScore: number; // 0 - 100
  defectObservation: string;
  recommendedAction: string;
}

export interface UrgentTrackSegmentPrediction {
  segmentId: string;
  corridorId: string;
  corridorCode: string;
  corridorName: string;
  fromStation: string;
  toStation: string;
  startKm: number;
  endKm: number;
  lengthKm: number;
  trackLine: string; // e.g. "UP Fast Line"
  railStructure: string; // e.g. "60kg UIC / PSC Sleepers (1660/km)"
  speedLimitKmph: number;

  // Predictive Urgency & Failure Risk
  urgencyTier: SegmentUrgencyTier;
  riskScore: number; // 0 - 100%
  projectedFailureDays: number; // e.g. 2 to 7 days
  projectedFailureDate: string;
  upcomingCycleWindow: string; // e.g. "Cycle 26-B (Oct 3–9)"
  
  // Defect Diagnostics
  primaryDefectCategory: string; // e.g. "USFD Rail Fatigue", "Point Machine Throw Drag"
  primaryDefectDescription: string;
  defectRecurrenceVelocity: string; // e.g. "+38% recurrence over past 30 days"
  rootCauseAnalysis: string;
  statutoryStandard: string; // e.g. "IRPW Manual Para 224 / Section 175"
  activeSpeedRestrictionKmph?: number;

  // Metrics from Historical Logs
  historicalDefectCount: number;
  currentTDI: number; // Track Degradation Index
  projectedTDI: number;
  gaugeSpreadMm: number;
  tgiRating: number; // Track Geometry Index

  // Operational Consequence if not repaired
  consequenceOfDelay: string;
  threatenedTrainsCount: number;
  projectedPunctualityLossMinutes: number;

  // Recommended Preventive Maintenance Block
  recommendedBlockDurationMinutes: number;
  recommendedDepartment: DepartmentType;
  recommendedMachinery: string;
  requiredGangStrength: number;
  tractionIsolationRequired: boolean;
  recommendedShift: 'DAY_SHIFT' | 'NIGHT_MEGA_BLOCK' | 'AFTERNOON_WINDOW';
  recommendedAlternativeWindow: string;

  // Historical Inspection Logs Trail
  historicalLogs: HistoricalInspectionLogRecord[];
}

export interface CorridorPredictiveSummary {
  totalSegmentsAnalyzed: number;
  criticalUrgentCount: number;
  highPriorityCount: number;
  watchlistCount: number;
  historicalDefectLogsProcessed: number;
  projectedPunctualityLossAvoidableMins: number;
  activeCycleCode: string;
  activeCycleSpan: string;
}

// Comprehensive Historical Segment Data across Delhi Division 4 Main Corridors
export const TRACK_SEGMENTS_PREDICTIVE_DATA: UrgentTrackSegmentPrediction[] = [
  {
    segmentId: 'SEG-C001-SBB-GZB',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'Sahibabad (SBB)',
    toStation: 'Ghaziabad Junction (GZB)',
    startKm: 18.2,
    endKm: 28.5,
    lengthKm: 10.3,
    trackLine: 'UP Main Fast Line',
    railStructure: '60kg UIC / PSC Sleepers 1660/km / Elastic Rail Clips Mark-III',
    speedLimitKmph: 130,

    urgencyTier: 'CRITICAL',
    riskScore: 92,
    projectedFailureDays: 2,
    projectedFailureDate: '2026-10-04',
    upcomingCycleWindow: 'Upcoming Cycle Window (Next 48–72h)',

    primaryDefectCategory: 'Continuous Welded Rail (USFD) Fatigue Micro-Cracking',
    primaryDefectDescription: 'Transverse fatigue fissure detected at KM 23.4 (Welded Joint WJ-108). Ultrasonic probe signal attenuation >14dB.',
    defectRecurrenceVelocity: '+42% defect velocity across past 45 days (3 repeat alarms)',
    rootCauseAnalysis: 'High axle-load freight traffic (25-tonne rakes) overlapping with 130 km/h passenger corridor induces severe rail head contact shear stress.',
    statutoryStandard: 'IRPW Manual Para 224 (Mandatory Rail Replacement for IMR flaw within 72h)',
    activeSpeedRestrictionKmph: 45,

    historicalDefectCount: 14,
    currentTDI: 88,
    projectedTDI: 94,
    gaugeSpreadMm: 4.8,
    tgiRating: 68,

    consequenceOfDelay: 'Imposes mandatory 30 km/h Caution Order T/409, delaying 8 Shatabdi/Rajdhani express services by 18–25 minutes and bottlenecking Ghaziabad junction throat.',
    threatenedTrainsCount: 16,
    projectedPunctualityLossMinutes: 145,

    recommendedBlockDurationMinutes: 150,
    recommendedDepartment: 'ENGINEERING',
    recommendedMachinery: 'CSM-900 Duo Tamping Machine + Rail Tensor RT-70',
    requiredGangStrength: 18,
    tractionIsolationRequired: true,
    recommendedShift: 'NIGHT_MEGA_BLOCK',
    recommendedAlternativeWindow: '01:30–04:00 (Post-Prayagraj Express transit)',

    historicalLogs: [
      {
        logId: 'LOG-SBB-01',
        inspectionDate: '2026-07-12',
        daysAgo: 82,
        recordedBy: 'R. K. Sharma',
        designation: 'Senior Section Engineer (P-Way)',
        methodology: 'Track Recording Car (OMS-2000)',
        trackDegradationIndex: 52,
        gaugeDeviationMm: 1.8,
        criticalityScore: 48,
        defectObservation: 'Slight vertical unevenness at switch expansion joint.',
        recommendedAction: 'Packing and ballast tamping scheduled.',
      },
      {
        logId: 'LOG-SBB-02',
        inspectionDate: '2026-08-04',
        daysAgo: 59,
        recordedBy: 'P. Verma',
        designation: 'PWI Ultrasonic Testing Inspector',
        methodology: 'USFD Digital Ultrasonic Flaw Detector',
        trackDegradationIndex: 64,
        gaugeDeviationMm: 2.6,
        criticalityScore: 61,
        defectObservation: 'Echo peak 6dB at rail head running surface. OBS (Observation) classification.',
        recommendedAction: 'Fortnightly ultrasonic monitoring assigned.',
      },
      {
        logId: 'LOG-SBB-03',
        inspectionDate: '2026-08-25',
        daysAgo: 38,
        recordedBy: 'R. K. Sharma',
        designation: 'Senior Section Engineer (P-Way)',
        methodology: 'Comprehensive OMS Trolley Run',
        trackDegradationIndex: 75,
        gaugeDeviationMm: 3.7,
        criticalityScore: 73,
        defectObservation: 'Weld joint WJ-108 micro-fissure expansion. Sleeper spacing irregularity.',
        recommendedAction: 'Speed restricted to 75 km/h. Urgent block requisition submitted.',
      },
      {
        logId: 'LOG-SBB-04',
        inspectionDate: '2026-09-16',
        daysAgo: 16,
        recordedBy: 'V. Sundaram',
        designation: 'Divisional Safety Officer',
        methodology: 'USFD Re-calibration Sweep',
        trackDegradationIndex: 83,
        gaugeDeviationMm: 4.2,
        criticalityScore: 84,
        defectObservation: 'Fissure depth advanced to 18mm into web. Class IMR (Immediate Removal).',
        recommendedAction: 'Emergency clamping applied. Mandatory rail piece replacement required.',
      },
      {
        logId: 'LOG-SBB-05',
        inspectionDate: '2026-09-30',
        daysAgo: 2,
        recordedBy: 'A. K. Meena',
        designation: 'Senior Divisional Engineer (Coordination)',
        methodology: 'Joint Engineering & Safety Inspection',
        trackDegradationIndex: 88,
        gaugeDeviationMm: 4.8,
        criticalityScore: 92,
        defectObservation: 'TDI critical breach at 88. Micro-fracture risks rail parting under high-frequency impact.',
        recommendedAction: 'Immediate 2.5h Mega-Block replacement mandated in upcoming maintenance cycle.',
      },
    ],
  },
  {
    segmentId: 'SEG-C003-BGZ-SPZ',
    corridorId: 'C003',
    corridorCode: 'C003',
    corridorName: 'Western Heavy Freight Link',
    fromStation: 'Bahadurgarh (BGZ)',
    toStation: 'Sampla (SPZ)',
    startKm: 29.5,
    endKm: 46.0,
    lengthKm: 16.5,
    trackLine: 'Single Freight Trunk Line',
    railStructure: '60kg PSC / Deep Ballast Cushion 350mm',
    speedLimitKmph: 110,

    urgencyTier: 'CRITICAL',
    riskScore: 88,
    projectedFailureDays: 3,
    projectedFailureDate: '2026-10-05',
    upcomingCycleWindow: 'Upcoming Cycle Window (Day 3–4)',

    primaryDefectCategory: 'Ballast Pocket Fouling & Subgrade Mud Pumping',
    primaryDefectDescription: 'Heavy ballast voiding and water stagnation over 420m stretch. Severe track alignment drift (-5.2mm cross-level twist).',
    defectRecurrenceVelocity: '+35% degradation velocity over monsoon aftermath',
    rootCauseAnalysis: 'Repeated 25T axle load coal rakes coupled with clogged side drainage channels causing subgrade slurrying.',
    statutoryStandard: 'Section 175 Railways Act / Track Safety Standards Rule 4.2',
    activeSpeedRestrictionKmph: 30,

    historicalDefectCount: 11,
    currentTDI: 84,
    projectedTDI: 91,
    gaugeSpreadMm: 5.4,
    tgiRating: 64,

    consequenceOfDelay: 'Unregulated freight derailment hazard. Causes loop-line siding congestion blocking 5 coal trains heading to Dadri NTPC power plant.',
    threatenedTrainsCount: 12,
    projectedPunctualityLossMinutes: 210,

    recommendedBlockDurationMinutes: 180,
    recommendedDepartment: 'ENGINEERING',
    recommendedMachinery: 'Ballast Cleaning Machine (BCM-350) + Dynamic Track Stabilizer (DTS)',
    requiredGangStrength: 24,
    tractionIsolationRequired: false,
    recommendedShift: 'DAY_SHIFT',
    recommendedAlternativeWindow: '12:00–15:00 (Freight traffic lull slot)',

    historicalLogs: [
      {
        logId: 'LOG-BGZ-01',
        inspectionDate: '2026-07-20',
        daysAgo: 74,
        recordedBy: 'M. P. Yadav',
        designation: 'PWI In-charge BGZ',
        methodology: 'Visual & Footplate Inspection',
        trackDegradationIndex: 56,
        gaugeDeviationMm: 2.1,
        criticalityScore: 50,
        defectObservation: 'Fine soil accumulation in ballast shoulders near culvert 48.',
        recommendedAction: 'Shoulder cleaning planned.',
      },
      {
        logId: 'LOG-BGZ-02',
        inspectionDate: '2026-08-11',
        daysAgo: 52,
        recordedBy: 'K. S. Rathore',
        designation: 'Track Machine Officer',
        methodology: 'OMS-2000 Accelerometer Run',
        trackDegradationIndex: 68,
        gaugeDeviationMm: 3.4,
        criticalityScore: 65,
        defectObservation: 'Ride index dipped below 3.2. Mud pumping observed during rain spells.',
        recommendedAction: 'Local lifting and packing executed.',
      },
      {
        logId: 'LOG-BGZ-03',
        inspectionDate: '2026-09-02',
        daysAgo: 30,
        recordedBy: 'M. P. Yadav',
        designation: 'PWI In-charge BGZ',
        methodology: 'Geotechnical Soil Probe',
        trackDegradationIndex: 76,
        gaugeDeviationMm: 4.1,
        criticalityScore: 78,
        defectObservation: 'Subgrade clay intrusion into ballast matrix. Ballast elasticity loss.',
        recommendedAction: 'Caution order 45 km/h enforced. BCM deep screening requisitioned.',
      },
      {
        logId: 'LOG-BGZ-04',
        inspectionDate: '2026-09-24',
        daysAgo: 8,
        recordedBy: 'S. N. Gupta',
        designation: 'Senior Divisional Safety Officer',
        methodology: 'Special Monsoon Audit',
        trackDegradationIndex: 84,
        gaugeDeviationMm: 5.4,
        criticalityScore: 88,
        defectObservation: 'Alignment twist exceeding permissible limit of 3.6 mm/m. Track pumping 12mm under loaded rake pass.',
        recommendedAction: 'Mandatory 3.0h deep screening & shoulder ballast replacement in upcoming cycle.',
      },
    ],
  },
  {
    segmentId: 'SEG-C004-FDB-BVH',
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

    urgencyTier: 'HIGH',
    riskScore: 76,
    projectedFailureDays: 5,
    projectedFailureDate: '2026-10-07',
    upcomingCycleWindow: 'Upcoming Cycle Window (Day 5–6)',

    primaryDefectCategory: '25kV Catenary Contact Wire Dropper Thermal Hotspot',
    primaryDefectDescription: 'Infrared thermography records 82°C hotspot at Mast 42/14. Contact wire wear profile reduced to 68mm² cross-section.',
    defectRecurrenceVelocity: '+24% contact wire thermal wear in high-humidity corridor',
    rootCauseAnalysis: 'Repeated arcing during electric locomotive acceleration out of Ballabgarh industrial container siding.',
    statutoryStandard: 'ACTM Volume II (AC Traction Manual) Para 20433',
    activeSpeedRestrictionKmph: 0,

    historicalDefectCount: 8,
    currentTDI: 72,
    projectedTDI: 81,
    gaugeSpreadMm: 2.4,
    tgiRating: 77,

    consequenceOfDelay: 'Risk of catenary wire parting / pantograph entanglement, leading to complete 25kV OHE tripping and 3+ hours total power outage across Faridabad section.',
    threatenedTrainsCount: 14,
    projectedPunctualityLossMinutes: 120,

    recommendedBlockDurationMinutes: 120,
    recommendedDepartment: 'TRACTION',
    recommendedMachinery: 'Self-Propelled OHE Inspection & Tower Car (DETC-08)',
    requiredGangStrength: 10,
    tractionIsolationRequired: true,
    recommendedShift: 'AFTERNOON_WINDOW',
    recommendedAlternativeWindow: '13:00–15:00 (Post-EMU suburban peak lull)',

    historicalLogs: [
      {
        logId: 'LOG-FDB-01',
        inspectionDate: '2026-08-01',
        daysAgo: 62,
        recordedBy: 'C. P. Joshi',
        designation: 'Senior Section Engineer (TRD)',
        methodology: 'Tower Car Patrol',
        trackDegradationIndex: 58,
        gaugeDeviationMm: 1.2,
        criticalityScore: 45,
        defectObservation: 'Minor carbon deposition on dropper 3 near mast 42/14.',
        recommendedAction: 'Cleaned and retightened.',
      },
      {
        logId: 'LOG-FDB-02',
        inspectionDate: '2026-08-28',
        daysAgo: 35,
        recordedBy: 'T. R. Sreenivas',
        designation: 'TRD Thermal Specialist',
        methodology: 'Thermal FLIR Drone Thermography',
        trackDegradationIndex: 65,
        gaugeDeviationMm: 1.8,
        criticalityScore: 62,
        defectObservation: 'Temperature delta +18°C above ambient under full load draw.',
        recommendedAction: 'Flagged for tension adjustment.',
      },
      {
        logId: 'LOG-FDB-03',
        inspectionDate: '2026-09-22',
        daysAgo: 10,
        recordedBy: 'C. P. Joshi',
        designation: 'Senior Section Engineer (TRD)',
        methodology: 'Comprehensive OHE Foot Patrol',
        trackDegradationIndex: 72,
        gaugeDeviationMm: 2.4,
        criticalityScore: 76,
        defectObservation: 'Hotspot surged to 82°C. Contact wire cross section worn past 70% threshold.',
        recommendedAction: 'Urgent splice replacement and contact wire dropper renewal required in cycle 26-B.',
      },
    ],
  },
  {
    segmentId: 'SEG-C002-DLI-SZM',
    corridorId: 'C002',
    corridorCode: 'C002',
    corridorName: 'High-Speed Passenger Corridor',
    fromStation: 'Delhi Junction (DLI)',
    toStation: 'Sabzi Mandi (SZM)',
    startKm: 0.0,
    endKm: 4.8,
    lengthKm: 4.8,
    trackLine: 'UP & DOWN Double Track Auto-Signaled',
    railStructure: '60kg PSC / Route Relay Interlocking / Electronic Point Machines',
    speedLimitKmph: 160,

    urgencyTier: 'HIGH',
    riskScore: 74,
    projectedFailureDays: 6,
    projectedFailureDate: '2026-10-08',
    upcomingCycleWindow: 'Upcoming Cycle Window (Day 6–7)',

    primaryDefectCategory: 'Electric Point Machine High Motor Stall Current & Throw Drag',
    primaryDefectDescription: 'Point Machine PM-14B throw time deteriorated from 2.8s to 4.9s. Motor current surges to 4.6A during reverse crossover operation.',
    defectRecurrenceVelocity: '+30% throw drag velocity due to switch slide friction',
    rootCauseAnalysis: 'Ballast dust contamination and heavy grease hardening along the tongue rail slide chairs in dense suburban throat.',
    statutoryStandard: 'Signal Engineering Manual (SEM Part II) Section 19',
    activeSpeedRestrictionKmph: 0,

    historicalDefectCount: 9,
    currentTDI: 69,
    projectedTDI: 78,
    gaugeSpreadMm: 2.8,
    tgiRating: 81,

    consequenceOfDelay: 'Point detection failure (NWKR/RWKR flash), forcing clamp-and-padlock manual operation. Delays Vande Bharat and EMU commuter trains entering New Delhi by 25–40 minutes.',
    threatenedTrainsCount: 22,
    projectedPunctualityLossMinutes: 180,

    recommendedBlockDurationMinutes: 90,
    recommendedDepartment: 'S&T',
    recommendedMachinery: 'S&T Joint Calibration Trolley + Switch Roller Lubrication Squad',
    requiredGangStrength: 8,
    tractionIsolationRequired: false,
    recommendedShift: 'NIGHT_MEGA_BLOCK',
    recommendedAlternativeWindow: '02:00–03:30 (Midnight station lull)',

    historicalLogs: [
      {
        logId: 'LOG-DLI-01',
        inspectionDate: '2026-07-28',
        daysAgo: 66,
        recordedBy: 'A. Saxena',
        designation: 'Section Engineer (Signals)',
        methodology: 'Quarterly Electronic Interlocking Test',
        trackDegradationIndex: 51,
        gaugeDeviationMm: 1.1,
        criticalityScore: 40,
        defectObservation: 'Point throw operating within standard limits (3.1s).',
        recommendedAction: 'Standard slide lubrication performed.',
      },
      {
        logId: 'LOG-DLI-02',
        inspectionDate: '2026-08-30',
        daysAgo: 33,
        recordedBy: 'M. Farooqui',
        designation: 'Signal Data Logger Specialist',
        methodology: 'Automated Fault Logger Analytics',
        trackDegradationIndex: 61,
        gaugeDeviationMm: 2.0,
        criticalityScore: 58,
        defectObservation: 'Motor stall current spikes flagged 3 times on reverse throw.',
        recommendedAction: 'Switch roller gap check recommended.',
      },
      {
        logId: 'LOG-DLI-03',
        inspectionDate: '2026-09-26',
        daysAgo: 6,
        recordedBy: 'A. Saxena',
        designation: 'Section Engineer (Signals)',
        methodology: 'Emergency Point Audit',
        trackDegradationIndex: 69,
        gaugeDeviationMm: 2.8,
        criticalityScore: 74,
        defectObservation: 'Throw time breached 4.9s safety threshold. Slide friction heavy.',
        recommendedAction: 'Joint S&T and P-Way point renewal and motor brush replacement required in cycle 26-B.',
      },
    ],
  },
  {
    segmentId: 'SEG-C001-GZB-ALJN',
    corridorId: 'C001',
    corridorCode: 'C001',
    corridorName: 'Northern Main Trunk',
    fromStation: 'Ghaziabad (GZB)',
    toStation: 'Aligarh Junction (ALJN)',
    startKm: 28.5,
    endKm: 85.0,
    lengthKm: 56.5,
    trackLine: 'Double Fast Corridor',
    railStructure: '60kg UIC / PSC Sleeper Quad / Thick Web Switches',
    speedLimitKmph: 130,

    urgencyTier: 'WATCHLIST',
    riskScore: 58,
    projectedFailureDays: 14,
    projectedFailureDate: '2026-10-16',
    upcomingCycleWindow: 'Subsequent Cycle Window (Cycle 26-C)',

    primaryDefectCategory: 'Track Geometry Index (TGI) Twist & Gauge Degradation',
    primaryDefectDescription: 'Progressive ballast consolidation variance causing +3.2mm gauge widening over 6km section between Somna and Kulwa.',
    defectRecurrenceVelocity: '+15% alignment drift across past 60 days',
    rootCauseAnalysis: 'Seasonal temperature variations and heavy mixed freight transit through rural subgrade plain.',
    statutoryStandard: 'IRPW Manual Para 501 (Tamping Frequency Rules)',
    activeSpeedRestrictionKmph: 0,

    historicalDefectCount: 6,
    currentTDI: 54,
    projectedTDI: 64,
    gaugeSpreadMm: 3.2,
    tgiRating: 74,

    consequenceOfDelay: 'Degradation of ride index, potential ride quality complaint from premium passenger services and eventual speed deceleration.',
    threatenedTrainsCount: 18,
    projectedPunctualityLossMinutes: 45,

    recommendedBlockDurationMinutes: 120,
    recommendedDepartment: 'ENGINEERING',
    recommendedMachinery: '09-3X Continuous Action Tamping Machine',
    requiredGangStrength: 12,
    tractionIsolationRequired: false,
    recommendedShift: 'DAY_SHIFT',
    recommendedAlternativeWindow: '11:30–13:30 (Midday freight slot)',

    historicalLogs: [
      {
        logId: 'LOG-GZB-01',
        inspectionDate: '2026-08-10',
        daysAgo: 53,
        recordedBy: 'S. K. Bansal',
        designation: 'PWI ALJN',
        methodology: 'Track Recording Car Run',
        trackDegradationIndex: 44,
        gaugeDeviationMm: 1.8,
        criticalityScore: 35,
        defectObservation: 'Nominal track geometry parameters. TGI at 82.',
        recommendedAction: 'Routine monitoring.',
      },
      {
        logId: 'LOG-GZB-02',
        inspectionDate: '2026-09-18',
        daysAgo: 14,
        recordedBy: 'S. K. Bansal',
        designation: 'PWI ALJN',
        methodology: 'OMS-2000 Peak Recording',
        trackDegradationIndex: 54,
        gaugeDeviationMm: 3.2,
        criticalityScore: 58,
        defectObservation: 'TGI declined to 74. Ballast settling unevenly near culvert 72.',
        recommendedAction: 'Schedule for mechanized tamping in maintenance cycle 26-C.',
      },
    ],
  },
];

class CorridorDefectPredictionService {
  /**
   * Get all predictive track segment predictions, optionally filtered by corridor
   */
  public getSegmentPredictions(corridorId = 'ALL'): UrgentTrackSegmentPrediction[] {
    if (corridorId === 'ALL') {
      return TRACK_SEGMENTS_PREDICTIVE_DATA;
    }
    return TRACK_SEGMENTS_PREDICTIVE_DATA.filter((s) => s.corridorId === corridorId);
  }

  /**
   * Get segments that require URGENT attention within the upcoming maintenance cycle (CRITICAL + HIGH)
   */
  public getUrgentAttentionSegments(corridorId = 'ALL'): UrgentTrackSegmentPrediction[] {
    const list = this.getSegmentPredictions(corridorId);
    return list.filter((s) => s.urgencyTier === 'CRITICAL' || s.urgencyTier === 'HIGH');
  }

  /**
   * Get summary analytics across all historical defect logs
   */
  public getPredictiveSummary(corridorId = 'ALL'): CorridorPredictiveSummary {
    const segments = this.getSegmentPredictions(corridorId);
    const critical = segments.filter((s) => s.urgencyTier === 'CRITICAL').length;
    const high = segments.filter((s) => s.urgencyTier === 'HIGH').length;
    const watchlist = segments.filter((s) => s.urgencyTier === 'WATCHLIST').length;

    const totalLogs = segments.reduce((sum, s) => sum + s.historicalLogs.length, 0);
    const punctualitySaved = segments
      .filter((s) => s.urgencyTier === 'CRITICAL' || s.urgencyTier === 'HIGH')
      .reduce((sum, s) => sum + s.projectedPunctualityLossMinutes, 0);

    return {
      totalSegmentsAnalyzed: segments.length,
      criticalUrgentCount: critical,
      highPriorityCount: high,
      watchlistCount: watchlist,
      historicalDefectLogsProcessed: totalLogs,
      projectedPunctualityLossAvoidableMins: punctualitySaved,
      activeCycleCode: 'CYCLE-26-B',
      activeCycleSpan: 'Oct 03 – Oct 09, 2026',
    };
  }

  /**
   * Find specific segment by ID
   */
  public getSegmentById(segmentId: string): UrgentTrackSegmentPrediction | undefined {
    return TRACK_SEGMENTS_PREDICTIVE_DATA.find((s) => s.segmentId === segmentId);
  }
}

export const corridorDefectPredictionService = new CorridorDefectPredictionService();
