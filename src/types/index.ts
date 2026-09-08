export type UserRole =
  | 'SUPER_ADMIN'
  | 'RAILWAY_PLANNER'
  | 'ENGINEERING_OFFICER'
  | 'ST_OFFICER'
  | 'TRACTION_OFFICER'
  | 'CONTROL_ROOM'
  | 'VIEWER';

export type DepartmentType =
  | 'ENGINEERING'
  | 'S&T'
  | 'TRACTION'
  | 'OPERATIONS'
  | 'SAFETY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: DepartmentType;
  designation: string;
  division: string;
  zone: string;
  avatar?: string;
}

export type AssetCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'ATTENTION_REQUIRED' | 'CRITICAL' | 'POOR';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Asset {
  id: string;
  name: string;
  type: string;
  department: DepartmentType;
  corridorId: string;
  section: string;
  condition: AssetCondition;
  priority: PriorityLevel;
  lastMaintenance: string;
  lastMaintenanceDate?: string;
  installationYear?: number;
  nextMaintenance?: string;
  activeTasks?: number;
  healthIndex?: number; // 0 - 100
}

export interface Corridor {
  id: string;
  name: string;
  code?: string;
  fromStation?: string;
  toStation?: string;
  stationFrom?: string;
  stationTo?: string;
  lengthKm: number;
  trackType?: string;
  tracksCount?: number;
  speedLimitKmph?: number;
  maxSpeedKmph?: number;
  utilization: number; // percentage
  trainCount?: number;
  maintenanceTasks?: number;
  availableSlots: number;
  scheduledBlocks: number;
  activeConflicts: number;
  status?: 'OPERATIONAL' | 'RESTRICTED' | 'MAINTENANCE_ACTIVE';
}

export type TrainCategory =
  | 'VANDE_BHARAT'
  | 'RAJDHANI'
  | 'SHATABDI'
  | 'SUPERFAST'
  | 'EXPRESS'
  | 'PASSENGER'
  | 'FREIGHT'
  | 'PREMIUM_EXP';

export interface Train {
  trainNumber: string;
  trainName: string;
  corridorId: string;
  date?: string;
  arrivalTime: string;
  departureTime: string;
  originStation?: string;
  destinationStation?: string;
  direction?: 'UP' | 'DOWN';
  status: 'ON_TIME' | 'DELAYED' | 'REGULATED' | 'RESCHEDULED';
  category: TrainCategory;
  priority?: number;
  priorityLevel?: string;
  conflictWithBlockId?: string;
}

export type TrainSchedule = Train;

export interface MaintenanceTask {
  id: string;
  taskId: string;
  assetId: string;
  department: DepartmentType;
  taskType: string;
  description?: string;
  corridorId?: string;
  durationMinutes: number;
  priority: PriorityLevel;
  preferredTimeWindow?: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CONFLICT' | 'PENDING_APPROVAL';
  assignedBlockId?: string;
  requestedDate?: string;
}

export type BlockRequestStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'PLANNED'
  | 'CONFLICT'
  | 'RESOLVED'
  | 'VALIDATED'
  | 'REJECTED';

export interface BlockRequest {
  requestId: string;
  department: DepartmentType;
  requester: string;
  requesterRole: UserRole;
  assetId: string;
  assetType: string;
  corridorId: string;
  taskType: string;
  priority: PriorityLevel;
  requestedDate: string;
  preferredStartTime: string;
  preferredEndTime: string;
  requiredDurationMinutes: number;
  description: string;
  operationalConstraints: string;
  status: BlockRequestStatus;
  submittedAt: string;
  syncedToGoogleSheets: boolean;
}

export interface Defect {
  defectId: string;
  assetId: string;
  department: DepartmentType;
  corridorId: string;
  defectType: string;
  severity: PriorityLevel;
  detectedDate: string;
  description: string;
  reportedBy: string;
  status: 'PENDING_PRIORITY_ANALYSIS' | 'ANALYZED' | 'SCHEDULED' | 'RECTIFIED';
  speedRestrictionKmph?: number;
}

export interface OptimizationFactors {
  priorityScore: number;
  assetAvailability: string;
  corridorAvailability: string;
  trainCompatibility: string;
  constraintCompatibility: string;
  operationalImpact: string;
}

export interface ExplainableAiDetails {
  whyThisSlot: string[];
  optimizationFactors: OptimizationFactors;
  alternateEvaluatedCount: number;
  disruptionAvoidanceMinutes: number;
  constraintCheckSummary: string;
  selectionRationale?: string;
}

export interface OptimizedBlock {
  blockId: string;
  taskId: string;
  requestId?: string;
  department: DepartmentType;
  assetId: string;
  corridorId: string;
  section: string;
  date: string;
  startTime: string; // e.g. "14:00"
  endTime: string;   // e.g. "15:30"
  durationMinutes: number;
  priority: PriorityLevel;
  status: 'OPTIMIZED' | 'SCHEDULED' | 'CONFLICT_FLAGGED' | 'RESOLVED';
  validationStatus: 'VALID' | 'REQUIRES_REVIEW' | 'INVALID';
  hasConflict: boolean;
  conflictId?: string;
  explainability: ExplainableAiDetails;
  aiReasoning?: {
    selectionRationale: string;
    factors: any;
  };
}

export interface Conflict {
  conflictId: string;
  blockId: string;
  trainNumber: string;
  trainName: string;
  taskId: string;
  assetId: string;
  corridorId: string;
  department?: DepartmentType;
  taskType?: string;
  trainCategory?: string;
  conflictType: 'TRAIN_OVERLAP' | 'RESOURCE_CONTENTION' | 'CURFEW_RESTRICTION' | 'SPEED_CONSTRAINT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  status: 'OPEN' | 'RESOLVED';
  maintenanceInterval: string; // e.g. "14:00–15:30"
  trainInterval: string;       // e.g. "14:45–15:05"
  alternativeAppliedSlot?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AlternativeSlot {
  slotId: string;
  startTime: string;
  endTime: string;
  corridorId: string;
  date?: string;
  durationMinutes?: number;
  trainConflictsCount?: number;
  assetConflictsCount?: number;
  constraintStatus?: 'SATISFIED' | 'CONDITIONAL_PASS' | 'VIOLATED';
  optimizationScore: number; // e.g. 94.2
  scoreBreakdown?: string;
  rationale?: string;
  disruptionLevel?: string;
  headwayBufferMinutes?: number;
  recommendationLevel?: 'BEST_MATCH' | 'ACCEPTABLE' | 'HIGHER_DISRUPTION';
}

export interface ValidationChecklistItem {
  id: string;
  label?: string;
  name?: string;
  passed: boolean;
  detail?: string;
  details?: string;
}

export interface CriticalValidationIssue {
  id?: string;
  issueId?: string;
  blockId: string;
  trainNumber?: string;
  corridorId: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH';
  conflictId?: string;
}

export interface ValidationResult {
  status: 'SAFE_TO_PUBLISH' | 'REQUIRES_REVIEW';
  decisionText: 'NOT SAFE TO PUBLISH' | 'SAFE TO PUBLISH';
  totalBlocks: number;
  validBlocks: number;
  invalidBlocks: number;
  criticalIssuesCount: number;
  issuesCount?: number;
  checklist: ValidationChecklistItem[];
  criticalIssues: CriticalValidationIssue[];
  lastValidatedAt?: string;
  validatedBy?: string;
}

export type PublicationState =
  | 'DRAFT'
  | 'OPTIMIZED'
  | 'CONFLICT_REVIEW'
  | 'VALIDATION'
  | 'APPROVED'
  | 'PUBLISHED';

export interface PublicationInfo {
  currentState: PublicationState;
  publishedScheduleId?: string;
  publishedAt?: string;
  approvedBy?: string;
  publishedBy?: string;
  totalBlocksPublished?: number;
  scheduleVersion?: string;
  approvalReference?: string;
  auditLogId?: string;
}

export type PublicationWorkflowState = PublicationInfo;

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role?: UserRole;
  action: string;
  object?: string;
  category?: string;
  severity?: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  status?: 'SUCCESS' | 'WARNING' | 'FAILED' | 'LOCKED' | 'INFO';
  details?: string;
}

export type AuditLogEntry = AuditLog;

export interface SystemStatus {
  pythonBackend: boolean;
  googleAppsScript: boolean;
  googleSheets: boolean;
  optimizationEngine: boolean;
  conflictEngine: boolean;
  validationEngine: boolean;
  isMockMode: boolean;
  apiBaseUrl: string;
  lastSyncTime: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  timestamp: string;
  read: boolean;
  targetScreen?: string;
}

// ----------------------------------------------------
// INDIAN RAILWAYS REAL-WORLD OPERATION EXTENSION TYPES
// ----------------------------------------------------

export interface SecondaryTrainDelay {
  trainNumber: string;
  trainName: string;
  category: TrainCategory;
  originalInterval: string;
  adjustedInterval: string;
  delayMinutes: number;
  regulationType: 'UNIMPEDED' | 'LOOP_SIDING' | 'SPEED_RESTRICTION' | 'RESCHEDULED';
  priorityLevel: number;
  remarks: string;
}

export interface WhatIfSimulationResult {
  conflictId: string;
  blockId: string;
  corridorId: string;
  slotId: string;
  proposedStartTime: string;
  proposedEndTime: string;
  secondaryDelays: SecondaryTrainDelay[];
  totalSecondaryDelayMinutes: number;
  punctualityImpactPercentage: number;
  kavachSafetyStatus: 'CERTIFIED_SAFE' | 'SAFE_WITH_MARGIN' | 'RESTRICTED';
  kavachHeadwayMarginKm: number;
  kavachBrakingDistanceMeters: number;
  ohePowerCutRequired: boolean;
  oheFeederSection: string;
  passengersImpactedEst: number;
  freightRakesRegulatedCount: number;
  recommendationSummary: string;
}

export interface CautionOrderMemo {
  memoNumber: string; // e.g. T/409-NDLS-2026-098
  division: string;   // Delhi Division, Northern Railway
  zone: string;       // Northern Railway (NR)
  stationMasterOffice: string;
  sectionController: string;
  corridorId: string;
  corridorName: string;
  blockSection: string;
  trackLine: 'UP_LINE' | 'DOWN_LINE' | 'BOTH_LINES';
  kmFrom: string;
  kmTo: string;
  workNature: string;
  cautionType: 'SPEED_RESTRICTION' | 'TOTAL_TRAFFIC_BLOCK' | 'POWER_BLOCK_OHE';
  allowedSpeedKmph: number; // 0 for total block, 15/30/45 kmph for caution
  effectiveFrom: string;
  effectiveUntil: string;
  pwiIncharge: string;
  safetyOfficerApproval: string;
  issuedTimestamp: string;
  specialInstructions: string[];
}

export interface DrmAuditReportData {
  reportId: string;
  generatedAt: string;
  division: string;
  zone: string;
  totalConflictsAudited: number;
  resolvedConflictsCount: number;
  openCriticalCount: number;
  criticalSafetyCleared: boolean;
  zeroTolerancePassed: boolean;
  auditedBy: string;
  safetyOfficerApproval: string;
  corridorBreakdown: {
    corridorId: string;
    corridorName: string;
    open: number;
    resolved: number;
    status: 'CLEARED' | 'ATTENTION_REQUIRED';
  }[];
  executiveSummary: string;
}

export interface PwiDispatchMessage {
  messageId: string;
  corridorId: string;
  blockId: string;
  section: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  pwiName: string;
  gangNumber: string;
  workType: string;
  englishText: string;
  hindiText: string;
  safetyChecklist: string[];
}

export type MachineryType =
  | 'TAMPING_MACHINE'
  | 'BALLAST_REGULATOR'
  | 'TOWER_WAGON'
  | 'RAIL_GRINDER'
  | 'TRACK_STABILIZER'
  | 'USFD_CAR';

export interface MachineryResource {
  id: string;
  name: string;
  model: string;
  type: MachineryType;
  corridorId: string;
  status: 'DEPLOYED' | 'STANDBY_RESERVE' | 'MAINTENANCE_DEPOT' | 'EN_ROUTE';
  operatorName: string;
  fuelLevelPct: number;
  healthIndex: number;
  assignedBlockId?: string;
  currentSection: string;
  homeDepot: string;
  speedLimitKmph: number;
}

export interface ManpowerGang {
  id: string;
  name: string;
  corridorId: string;
  department: DepartmentType;
  trade: 'TRACK_MAINTENANCE' | 'SIGNAL_TELECOM' | 'TRACTION_OHE' | 'SAFETY_LOOKOUT';
  headcount: number;
  supervisor: string;
  assignedSection: string;
  status: 'ACTIVE_ON_TRACK' | 'STANDBY' | 'RELIEVING';
  shift: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
  safetyBriefingCompleted: boolean;
  equippedWith: string;
}

export interface CorridorResourceMetrics {
  corridorId: string;
  corridorName: string;
  shortCode: string;
  lengthKm: number;
  tracksCount: number;
  speedLimitKmph: number;
  
  // Manpower Breakdown (for stackable bar)
  trackGangsHeadcount: number;
  signalTechsHeadcount: number;
  oheLinesmenHeadcount: number;
  safetyLookoutsHeadcount: number;
  totalManpowerAllocated: number;
  manpowerCapacity: number;
  
  // Machinery Breakdown (for stackable bar)
  tampingMachines: number;
  ballastRegulators: number;
  towerWagons: number;
  railGrinders: number;
  trackStabilizers: number;
  totalMachineryAllocated: number;
  machineryCapacity: number;

  // Capacity & Load Planning
  utilizationPct: number;
  loadStatus: 'UNDER_UTILIZED' | 'BALANCED' | 'NEAR_CAPACITY' | 'OVER_CAPACITY';
  bottleneckWarnings: string[];
  activeMaintenanceBlocksCount: number;
  supervisorInCharge: string;
}

export interface ResourceReallocationPayload {
  sourceCorridorId: string;
  targetCorridorId: string;
  category: 'MACHINERY' | 'MANPOWER';
  resourceId: string;
  transferReason: string;
}

// ----------------------------------------------------
// PREDICTIVE MAINTENANCE & DEFECT PATTERN INTELLIGENCE
// ----------------------------------------------------

export interface HistoricalDefectOccurrence {
  defectId: string;
  date: string;
  severity: PriorityLevel;
  type: string;
  description: string;
  rectifiedInHours: number;
}

export interface DefectPatternAnalysis {
  patternId: string;
  patternName: string;
  category: string;
  historicalOccurrencesCount: number;
  recurrenceIntervalDays: number;
  degradationRate: 'ACCELERATING' | 'LINEAR' | 'STABLE';
  primaryRiskFactor: string;
  tgiTrendIndex: number; // Track Geometry Index (0 - 100)
  speedRestrictionAdvisedKmph?: number;
  clusterId: string;
  recentOccurrences: HistoricalDefectOccurrence[];
}

export interface SuggestedBlockWindow {
  windowType: 'NIGHT_MEGA_BLOCK' | 'MIDDAY_TRAFFIC_LULL' | 'PRE_DAWN_SHADOW' | 'EVENING_OFF_PEAK';
  suggestedDate: string;
  startTime: string; // e.g. "01:30"
  endTime: string;   // e.g. "03:30"
  durationMinutes: number;
  corridorId: string;
  trafficLullPercentage: number; // e.g. 92% lower traffic than peak
  passengerTrainsImpacted: number;
  headwayBufferMinutes: number;
  rationale: string;
  weatherThermalCondition: string;
  recommendedMachinery: string;
  recommendedGang: string;
  estimatedTrackClearingMinutes: number;
}

export interface ConfidenceFactorBreakdown {
  historicalPatternMatch: number; // e.g. 96
  trafficWindowSuitability: number; // e.g. 94
  resourceFleetAvailability: number; // e.g. 91
  trackThermalMargin: number; // e.g. 95
  overallScore: number; // e.g. 94
}

export interface PredictiveMaintenanceInsight {
  requestId: string;
  requestTitle: string;
  department: DepartmentType;
  corridorId: string;
  assetId: string;
  assetName: string;
  section: string;
  priority: PriorityLevel;
  status: BlockRequestStatus | 'SCHEDULED_VIA_PREDICTIVE';
  scheduledBlockId?: string;
  
  // Defect Pattern Analysis
  pattern: DefectPatternAnalysis;
  
  // Suggested Block Timing
  suggestedWindow: SuggestedBlockWindow;
  
  // AI Confidence Score
  confidence: ConfidenceFactorBreakdown;
  confidenceRating: 'VERY_HIGH' | 'HIGH' | 'MODERATE';
  confidenceRationale: string;
  
  // Urgency & Criticality Horizon
  daysUntilCriticalFailure: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  unaddressedConsequence: string;
  
  // Model & Execution
  modelConfidenceId: string;
  lastAnalyzedTimestamp: string;
}

export interface DefectClusterSummary {
  clusterId: string;
  clusterName: string;
  department: DepartmentType;
  totalDefectsInCluster: number;
  avgRecurrenceDays: number;
  affectedCorridors: string[];
  severityProfile: string;
  recommendedPreventiveBlockHours: number;
  description: string;
}

// ==========================================
// DYNAMIC MOVING "SHADOW-BLOCK" SLIPSTREAM TYPES
// ==========================================

export type ShadowBlockMachineType =
  | 'USFD_SPURT' // Self-Propelled Ultrasonic Rail Testing Car
  | 'OHE_LASER_PROFILER' // Overhead 25kV Catenary Laser Profiler
  | 'LIDAR_GEOMETRY_ROVER' // High-Precision Track Alignment & Gauge Rover
  | 'RAPID_FLASH_WELD'; // Mobile Rapid In-Track Flash Butt Welder

export type ShadowBlockRunStatus =
  | 'STANDBY'
  | 'SLIPSTREAM_ACTIVE'
  | 'DOCKING_LOOP'
  | 'EMERGENCY_EGRESS'
  | 'COMPLETED';

export type SignalAspect = 'GREEN' | 'DOUBLE_YELLOW' | 'YELLOW' | 'RED';

export interface SidingDockPoint {
  sidingId: string;
  name: string;
  kmMarker: number;
  turnoutSpeedLimitKmph: number;
  loopLengthMeters: number;
  isClear: boolean;
}

export interface ShadowBlockMachineConfig {
  id: string;
  name: string;
  type: ShadowBlockMachineType;
  department: DepartmentType;
  operationalSpeedKmph: number;
  maxTransitSpeedKmph: number;
  brakingDecelerationMps2: number;
  inspectionSensorName: string;
  crewChief: string;
  certificationAuthority: string;
  description: string;
}

export interface ShadowBlockTelemetry {
  leadTrainId: string;
  leadTrainName: string;
  leadKm: number;
  leadSpeedKmph: number;

  machineId: string;
  machineName: string;
  machineType: ShadowBlockMachineType;
  machineKm: number;
  machineSpeedKmph: number;
  machineStatus: ShadowBlockRunStatus;

  trailTrainId: string;
  trailTrainName: string;
  trailKm: number;
  trailSpeedKmph: number;

  // Slipstream Gap Metrics
  slipstreamGapKm: number; // Distance between trailing train and machine
  leadGapKm: number; // Distance between machine and leading train
  headwayMinutes: number; // Minutes before trailing train reaches machine
  kavachBrakingMarginKm: number; // Distance before train enters service braking zone
  isCautionZoneActive: boolean;

  // Siding Docking Telemetry
  nextSiding: SidingDockPoint;
  distanceToNextSidingKm: number;
  timeToSidingSeconds: number;
  dockWindowClearanceStatus: 'SAFE' | 'URGENT_DOCK' | 'MISSED_WINDOW';

  // Value & Progress
  trackKmScanned: number;
  defectsDetectedLive: number;
  commercialDelayMinutesAvoided: number;
  revenueLossAvoidedInr: number;
}

export interface SlipstreamScenario {
  id: string;
  name: string;
  badge: string;
  corridorId: string;
  corridorName: string;
  leadTrain: { id: string; name: string; speed: number; initialKm: number };
  trailTrain: { id: string; name: string; speed: number; initialKm: number };
  machine: ShadowBlockMachineConfig;
  initialMachineKm: number;
  initialMachineSpeed: number;
  description: string;
  operationalObjective: string;
}


