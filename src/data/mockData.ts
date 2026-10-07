import {
  Asset,
  Corridor,
  TrainSchedule,
  BlockRequest,
  Defect,
  OptimizedBlock,
  Conflict,
  ValidationResult,
  AuditLog,
  User,
  MachineryResource,
  ManpowerGang,
  CorridorResourceMetrics,
} from '../types';

export const MOCK_USERS: User[] = [
  {
    id: 'USR-ENG-01',
    name: 'Er. Rajesh Verma',
    email: 'rajesh.verma@railnet.gov.in',
    role: 'ENGINEERING_OFFICER',
    department: 'ENGINEERING',
    designation: 'Senior Divisional Engineer (Sr. DEN / Track)',
    division: 'Delhi Division (DLI)',
    zone: 'Northern Railway',
  },
  {
    id: 'USR-PLN-01',
    name: 'Smt. Ananya Sen',
    email: 'ananya.sen@railnet.gov.in',
    role: 'RAILWAY_PLANNER',
    department: 'OPERATIONS',
    designation: 'Chief Block Coordinator & Planning Officer',
    division: 'Central Control Board',
    zone: 'Northern Railway',
  },
  {
    id: 'USR-SNT-01',
    name: 'Vikram Joshi',
    email: 'vikram.joshi@railnet.gov.in',
    role: 'ST_OFFICER',
    department: 'S&T',
    designation: 'Divisional Signal & Telecom Engineer (DSTE)',
    division: 'Delhi Division (DLI)',
    zone: 'Northern Railway',
  },
  {
    id: 'USR-TRC-01',
    name: 'Pooja Nair',
    email: 'pooja.nair@railnet.gov.in',
    role: 'TRACTION_OFFICER',
    department: 'TRACTION',
    designation: 'Senior Electrical Engineer (Sr. DEE / TRD)',
    division: 'Delhi Division (DLI)',
    zone: 'Northern Railway',
  },
  {
    id: 'USR-ADM-01',
    name: 'Dr. K. S. Murthy',
    email: 'ks.murthy@railnet.gov.in',
    role: 'SUPER_ADMIN',
    department: 'OPERATIONS',
    designation: 'Executive Director (IT & Operations)',
    division: 'Railway Board HQ',
    zone: 'Indian Railways',
  },
  {
    id: 'USR-CTL-01',
    name: 'M. Hariprasad',
    email: 'm.hariprasad@railnet.gov.in',
    role: 'CONTROL_ROOM',
    department: 'OPERATIONS',
    designation: 'Chief Controller / Section Controller',
    division: 'Delhi Central Control',
    zone: 'Northern Railway',
  },
  {
    id: 'USR-VIW-01',
    name: 'Arun Kulkarni',
    email: 'arun.kulkarni@railnet.gov.in',
    role: 'VIEWER',
    department: 'SAFETY',
    designation: 'Safety Auditor (Commissioner of Railway Safety)',
    division: 'Northern Circle',
    zone: 'CRS Northern',
  },
];

export const INITIAL_CORRIDORS: Corridor[] = [
  {
    id: 'C001',
    name: 'Northern Main Trunk (Station A — Station B)',
    code: 'NDLS-GZB',
    stationFrom: 'Station A (Central Junction)',
    stationTo: 'Station B (Ghaziabad Gateway)',
    lengthKm: 42.5,
    tracksCount: 4,
    speedLimitKmph: 130,
    utilization: 88,
    trainCount: 38,
    maintenanceTasks: 16,
    availableSlots: 12,
    scheduledBlocks: 11,
    activeConflicts: 0,
    status: 'OPERATIONAL',
  },
  {
    id: 'C002',
    name: 'Southern High-Speed Spur (Station A — Station C)',
    code: 'NDLS-FDB',
    stationFrom: 'Station A (Central Junction)',
    stationTo: 'Station C (Faridabad Cantt)',
    lengthKm: 34.2,
    tracksCount: 3,
    speedLimitKmph: 140,
    utilization: 79,
    trainCount: 26,
    maintenanceTasks: 14,
    availableSlots: 10,
    scheduledBlocks: 9,
    activeConflicts: 1,
    status: 'OPERATIONAL',
  },
  {
    id: 'C003',
    name: 'Western Heavy Freight & Passenger (Station A — Station D)',
    code: 'NDLS-ROK',
    stationFrom: 'Station A (Central Junction)',
    stationTo: 'Station D (Rohtak Yard)',
    lengthKm: 68.0,
    tracksCount: 2,
    speedLimitKmph: 110,
    utilization: 94,
    trainCount: 32,
    maintenanceTasks: 18,
    availableSlots: 14,
    scheduledBlocks: 12,
    activeConflicts: 2,
    status: 'RESTRICTED',
  },
  {
    id: 'C004',
    name: 'Eastern Mixed Express Link (Station A — Station E)',
    code: 'NDLS-MBR',
    stationFrom: 'Station A (Central Junction)',
    stationTo: 'Station E (Moradabad Interchange)',
    lengthKm: 85.6,
    tracksCount: 2,
    speedLimitKmph: 120,
    utilization: 91,
    trainCount: 24,
    maintenanceTasks: 12,
    availableSlots: 12,
    scheduledBlocks: 10,
    activeConflicts: 2,
    status: 'RESTRICTED',
  },
];

// Exact 28 Assets across Engineering, S&T, Traction
export const INITIAL_ASSETS: Asset[] = [
  { id: 'A001', name: 'Track Section T-01 North', type: 'Continuous Welded Rail (60kg)', department: 'ENGINEERING', corridorId: 'C001', section: 'KM 04/2 to 08/6', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-12', nextMaintenance: '2026-09-18', activeTasks: 2, healthIndex: 82 },
  { id: 'A002', name: 'Point & Crossing Turnout #14B', type: '1-in-12 Thick Web Switch', department: 'ENGINEERING', corridorId: 'C001', section: 'Station A North Yard', condition: 'EXCELLENT', priority: 'LOW', lastMaintenance: '2026-08-25', nextMaintenance: '2026-09-25', activeTasks: 1, healthIndex: 94 },
  { id: 'A003', name: 'Electronic Interlocking RRI-01', type: 'Solid State EI (Kyoritsu/Siemens)', department: 'S&T', corridorId: 'C001', section: 'Cabin A Control Block', condition: 'GOOD', priority: 'HIGH', lastMaintenance: '2026-08-01', nextMaintenance: '2026-09-08', activeTasks: 3, healthIndex: 86 },
  { id: 'A004', name: 'OHE Catenary Section OH-01', type: '25kV AC Traction 107sqmm', department: 'TRACTION', corridorId: 'C001', section: 'KM 10/0 to 18/0', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-07-28', nextMaintenance: '2026-09-12', activeTasks: 2, healthIndex: 88 },
  { id: 'A005', name: 'Multi-Aspect Color Light Signal S04', type: 'LED Signal Unit 4-Aspect', department: 'S&T', corridorId: 'C001', section: 'KM 14/8 Down Signal', condition: 'GOOD', priority: 'HIGH', lastMaintenance: '2026-08-19', nextMaintenance: '2026-09-15', activeTasks: 1, healthIndex: 90 },
  { id: 'A006', name: 'Girder Bridge Br-104 (Yamuna Link)', type: 'Steel Open Web Girder 45m', department: 'ENGINEERING', corridorId: 'C001', section: 'KM 22/4 River Span', condition: 'ATTENTION_REQUIRED', priority: 'CRITICAL', lastMaintenance: '2026-06-15', nextMaintenance: '2026-09-06', activeTasks: 4, healthIndex: 68 },
  { id: 'A007', name: 'Traction Sub-Station TSS-Ghaziabad', type: '132/25kV 30MVA Transformer TSS', department: 'TRACTION', corridorId: 'C001', section: 'Station B Sub-station', condition: 'EXCELLENT', priority: 'LOW', lastMaintenance: '2026-08-05', nextMaintenance: '2026-10-05', activeTasks: 1, healthIndex: 96 },
  
  { id: 'A008', name: 'High-Speed Track Section T-02 South', type: 'Head Hardened Rail 60kg R350HT', department: 'ENGINEERING', corridorId: 'C002', section: 'KM 06/0 to 12/4', condition: 'GOOD', priority: 'HIGH', lastMaintenance: '2026-08-10', nextMaintenance: '2026-09-10', activeTasks: 3, healthIndex: 85 },
  { id: 'A009', name: 'Digital Axle Counter DAC-02', type: 'High Availability Multi-Section DAC', department: 'S&T', corridorId: 'C002', section: 'KM 15/2 Auto Block', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-14', nextMaintenance: '2026-09-20', activeTasks: 1, healthIndex: 89 },
  { id: 'A010', name: 'Section Insulator & Isolator ISO-02', type: 'Neutral Section PT-Auto', department: 'TRACTION', corridorId: 'C002', section: 'KM 20/6 Neutral Section', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-07-20', nextMaintenance: '2026-09-14', activeTasks: 2, healthIndex: 84 },
  { id: 'A011', name: 'Level Crossing Interlocked Gate LC-19', type: 'Manned Lifting Barrier with CCTV', department: 'ENGINEERING', corridorId: 'C002', section: 'KM 24/1 Road Cross', condition: 'ATTENTION_REQUIRED', priority: 'HIGH', lastMaintenance: '2026-07-30', nextMaintenance: '2026-09-07', activeTasks: 3, healthIndex: 72 },
  { id: 'A012', name: 'Track Circuit High Voltage Impulse TC-21', type: 'Audio Frequency Track Circuit (AFTC)', department: 'S&T', corridorId: 'C002', section: 'KM 28/0 to 30/5', condition: 'GOOD', priority: 'LOW', lastMaintenance: '2026-08-22', nextMaintenance: '2026-09-22', activeTasks: 1, healthIndex: 91 },
  { id: 'A013', name: 'Overhead Feeder Wire F-02', type: 'Copper Feeder 150sqmm', department: 'TRACTION', corridorId: 'C002', section: 'Faridabad Feeder Bay', condition: 'GOOD', priority: 'LOW', lastMaintenance: '2026-08-18', nextMaintenance: '2026-09-28', activeTasks: 1, healthIndex: 92 },
  { id: 'A014', name: 'Diamond Crossing with Slip DX-02', type: 'Cast Manganese Steel Crossing', department: 'ENGINEERING', corridorId: 'C002', section: 'Faridabad Junction West', condition: 'FAIR', priority: 'HIGH', lastMaintenance: '2026-07-15', nextMaintenance: '2026-09-09', activeTasks: 2, healthIndex: 75 },

  { id: 'A015', name: 'Heavy Axle Track Bed T-03 West', type: '25-Tonne Axle Load Ballast Cushion', department: 'ENGINEERING', corridorId: 'C003', section: 'KM 12/0 to 22/0', condition: 'ATTENTION_REQUIRED', priority: 'CRITICAL', lastMaintenance: '2026-07-10', nextMaintenance: '2026-09-05', activeTasks: 4, healthIndex: 65 },
  { id: 'A016', name: 'Electric Point Machine PM-301', type: 'Rotary Point Machine 143mm throw', department: 'S&T', corridorId: 'C003', section: 'Shakurbasti Outer C3', condition: 'FAIR', priority: 'CRITICAL', lastMaintenance: '2026-07-25', nextMaintenance: '2026-09-06', activeTasks: 3, healthIndex: 70 },
  { id: 'A017', name: 'Cantilever Assembly Mast C3-44', type: 'Traction OHE Mast & Insulator', department: 'TRACTION', corridorId: 'C003', section: 'KM 28/4 to 34/2', condition: 'ATTENTION_REQUIRED', priority: 'CRITICAL', lastMaintenance: '2026-07-08', nextMaintenance: '2026-09-06', activeTasks: 3, healthIndex: 64 },
  { id: 'A018', name: 'Deep Ballast Bed Section DB-03', type: 'Clean Ballast Cushion 350mm', department: 'ENGINEERING', corridorId: 'C003', section: 'KM 38/0 to 45/0', condition: 'FAIR', priority: 'HIGH', lastMaintenance: '2026-06-28', nextMaintenance: '2026-09-08', activeTasks: 3, healthIndex: 74 },
  { id: 'A019', name: 'Block Proving Axle Counter BPAC-3', type: 'Dual Detection BPAC UAC', department: 'S&T', corridorId: 'C003', section: 'KM 48/0 Rohtak Approach', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-08', nextMaintenance: '2026-09-16', activeTasks: 2, healthIndex: 83 },
  { id: 'A020', name: 'Switching Post SP-Bahadurgarh', type: 'Traction Auto Sub-Sectioning Post', department: 'TRACTION', corridorId: 'C003', section: 'Bahadurgarh Yard SP', condition: 'GOOD', priority: 'LOW', lastMaintenance: '2026-08-02', nextMaintenance: '2026-09-24', activeTasks: 1, healthIndex: 88 },
  { id: 'A021', name: 'Pre-Stressed Concrete Sleeper Line PSC-3', type: 'Mono-block PSC Sleeper Set 1660/km', department: 'ENGINEERING', corridorId: 'C003', section: 'KM 56/0 to 62/0', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-16', nextMaintenance: '2026-09-26', activeTasks: 1, healthIndex: 86 },

  { id: 'A022', name: 'Main Track Curve Section T-04 Curve', type: 'Sharp Curve 4.2 Degree Transition', department: 'ENGINEERING', corridorId: 'C004', section: 'KM 14/0 to 18/5', condition: 'ATTENTION_REQUIRED', priority: 'CRITICAL', lastMaintenance: '2026-07-02', nextMaintenance: '2026-09-06', activeTasks: 4, healthIndex: 66 },
  { id: 'A023', name: 'Automatic Block Signaling ABS-04', type: 'Auto Permissive 4-Aspect System', department: 'S&T', corridorId: 'C004', section: 'KM 22/0 to 35/0', condition: 'FAIR', priority: 'CRITICAL', lastMaintenance: '2026-07-18', nextMaintenance: '2026-09-06', activeTasks: 3, healthIndex: 69 },
  { id: 'A024', name: 'Contact Wire Dropper Span OHE-4', type: 'High Tension Grooved Contact Wire 150mm', department: 'TRACTION', corridorId: 'C004', section: 'KM 40/0 to 48/0', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-11', nextMaintenance: '2026-09-19', activeTasks: 2, healthIndex: 85 },
  { id: 'A025', name: 'Major Culvert Culv-88', type: 'Arch Stone Masonry & RCC Box', department: 'ENGINEERING', corridorId: 'C004', section: 'KM 52/3 Waterway', condition: 'GOOD', priority: 'LOW', lastMaintenance: '2026-07-22', nextMaintenance: '2026-09-30', activeTasks: 1, healthIndex: 87 },
  { id: 'A026', name: 'Track Circuit Jointless Audio TF-4', type: 'Jointless UM71 High Frequency TC', department: 'S&T', corridorId: 'C004', section: 'KM 60/0 to 65/0', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-04', nextMaintenance: '2026-09-17', activeTasks: 2, healthIndex: 84 },
  { id: 'A027', name: 'Sectional Overhead Breaker CB-04', type: 'Vacuum Circuit Breaker 25kV SF6', department: 'TRACTION', corridorId: 'C004', section: 'Moradabad East Feeder', condition: 'EXCELLENT', priority: 'LOW', lastMaintenance: '2026-08-20', nextMaintenance: '2026-10-15', activeTasks: 1, healthIndex: 95 },
  { id: 'A028', name: 'Emergency Cross-Over XO-42', type: 'Scissors Crossover with Clamp Lock', department: 'ENGINEERING', corridorId: 'C004', section: 'KM 72/0 Emergency Spur', condition: 'GOOD', priority: 'MEDIUM', lastMaintenance: '2026-08-15', nextMaintenance: '2026-09-22', activeTasks: 2, healthIndex: 89 },
];

// 5 Active Critical Conflicts specifically required by SIH prompt + Electrical-Track Dependency Conflict
export const INITIAL_CONFLICTS: Conflict[] = [
  {
    conflictId: 'CONF-DEP-001',
    blockId: 'BLK-T012',
    trainNumber: 'DEP-TRD-ENG',
    trainName: 'TRD Electrical vs Civil P-Way Track Dependency',
    taskId: 'TSK-M012',
    assetId: 'A017',
    corridorId: 'C003',
    department: 'TRACTION',
    taskType: 'OHE Power Isolation & Cantilever Replacement',
    conflictType: 'DEPENDENCY_CONFLICT',
    severity: 'CRITICAL',
    description: 'Electrical Block BLK-T012 (OHE Power Isolation 14:00–15:30) conflicts with concurrent Track Maintenance Block BLK-E014 (Heavy Track Tamper 09-3X 14:15–15:45) on C003 KM 28/4–34/2. Track lifting (>25mm) and slewing alters catenary contact wire height and disrupts discharge grounding rods.',
    status: 'OPEN',
    maintenanceInterval: '14:00–15:30 (TRD)',
    trainInterval: '14:15–15:45 (Track Tamper)',
    dependencyDetails: {
      conflictId: 'CONF-DEP-001',
      corridorId: 'C003',
      section: 'KM 28/4 to 34/2 (Bahadurgarh - Rohtak)',
      electricalBlockId: 'BLK-T012',
      electricalTask: 'OHE Power Isolation & Cantilever Replacement',
      electricalTime: '14:00–15:30',
      electricalAssetId: 'A017 (Cantilever Assembly Mast C3-44)',
      electricalDepartment: 'TRACTION',
      trackBlockId: 'BLK-E014',
      trackTask: 'Continuous Heavy Track Tamping & Dynamic Stabilization',
      trackTime: '14:15–15:45',
      trackAssetId: 'A018 (Deep Ballast Bed Section DB-03)',
      trackDepartment: 'ENGINEERING',
      overlapMinutes: 75,
      hazardType: 'CATENARY_HEIGHT_VIOLATION',
      hazardExplanation: 'Under ACTM Vol II Para 20.3 & IRPWM Para 6.4, heavy track machine tamping (exceeding 25mm track lift) is strictly prohibited while TRD earthing discharge rods are anchored to overhead catenary wires. Risk of contact wire snagging and loss of traction return circuit bonding.',
      safetyRuleViolation: 'ACTM Vol II Para 20.3, IRPWM Para 6.4 & Joint Safety Protocol JPO-2026-TRD-ENG',
      proposedTimeShifts: [
        {
          shiftId: 'SHIFT-01',
          targetBlockId: 'BLK-T012',
          targetBlockTitle: 'Electrical Block BLK-T012 (TRD)',
          targetDepartment: 'TRACTION',
          currentSlot: '14:00–15:30',
          proposedSlot: '16:00–17:30',
          shiftDeltaMinutes: 120,
          safetyBufferMinutes: 15,
          rationale: 'Sequence Electrical Block after Track Tamper completes consolidation. Track geometry verified stable before catenary wire adjustment.',
          recommendationLevel: 'BEST_MATCH',
          trainPunctualityImpact: 'Zero train delay; fits cleanly into afternoon freight regulation slot.',
        },
        {
          shiftId: 'SHIFT-02',
          targetBlockId: 'BLK-E014',
          targetBlockTitle: 'Track Maintenance Block BLK-E014 (Civil)',
          targetDepartment: 'ENGINEERING',
          currentSlot: '14:15–15:45',
          proposedSlot: '02:30–04:00',
          shiftDeltaMinutes: -705,
          safetyBufferMinutes: 60,
          rationale: 'Shift heavy track tamping to pre-dawn maintenance shadow window. Full track possession with zero adjacent traffic interference.',
          recommendationLevel: 'ALTERNATIVE',
          trainPunctualityImpact: 'Zero train delay; utilizes low-traffic nighttime maintenance corridor.',
        },
        {
          shiftId: 'SHIFT-03',
          targetBlockId: 'BLK-T012',
          targetBlockTitle: 'Synchronized Joint Block (TRD + Civil)',
          targetDepartment: 'TRACTION',
          currentSlot: '14:00–15:45',
          proposedSlot: '01:30–04:00',
          shiftDeltaMinutes: -750,
          safetyBufferMinutes: 30,
          rationale: 'Convert independent blocks into single Unified Joint Block under joint permit-to-work JPO-2026-42. Simultaneous possession with bonded earthing.',
          recommendationLevel: 'JOINT_BLOCK',
          trainPunctualityImpact: 'Zero train delay; optimizes machine utilization during nighttime window.',
        },
      ],
      status: 'OPEN',
    },
  },
  {
    conflictId: 'CONF-001',
    blockId: 'BLK-T012',
    trainNumber: 'TR106',
    trainName: 'Vande Bharat Express (NDLS-ROK)',
    taskId: 'TSK-M012',
    assetId: 'A017',
    corridorId: 'C003',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-T012 OHE Power Isolation on C003 overlaps with priority Vande Bharat TR106 pass interval.',
    status: 'OPEN',
    maintenanceInterval: '14:00–15:30',
    trainInterval: '14:45–15:05',
  },
  {
    conflictId: 'CONF-002',
    blockId: 'BLK-S034',
    trainNumber: 'TR057',
    trainName: 'Rajdhani Special (NDLS-MBR)',
    taskId: 'TSK-M034',
    assetId: 'A023',
    corridorId: 'C004',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-S034 Automatic Block Signaling interlocking maintenance interrupts Rajdhani corridor movement.',
    status: 'OPEN',
    maintenanceInterval: '11:00–12:30',
    trainInterval: '11:20–11:50',
  },
  {
    conflictId: 'CONF-003',
    blockId: 'BLK-E044',
    trainNumber: 'TR034',
    trainName: 'Container Freight Express',
    taskId: 'TSK-M044',
    assetId: 'A022',
    corridorId: 'C004',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-E044 Heavy Track Tamping on Sharp Curve encroaches into Freight path slot on C004.',
    status: 'OPEN',
    maintenanceInterval: '09:00–10:30',
    trainInterval: '09:15–10:00',
  },
  {
    conflictId: 'CONF-004',
    blockId: 'BLK-S001',
    trainNumber: 'TR108',
    trainName: 'Shatabdi Express',
    taskId: 'TSK-M001',
    assetId: 'A016',
    corridorId: 'C003',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-S001 Point Machine PM-301 calibration blocks main line while TR108 is cleared for transit.',
    status: 'OPEN',
    maintenanceInterval: '16:00–17:30',
    trainInterval: '16:30–17:00',
  },
  {
    conflictId: 'CONF-005',
    blockId: 'BLK-E007',
    trainNumber: 'TR065',
    trainName: 'Jan Shatabdi Express',
    taskId: 'TSK-M007',
    assetId: 'A011',
    corridorId: 'C002',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-E007 Interlocked Level Crossing LC-19 boom replacement halts passenger run TR065 on C002.',
    status: 'OPEN',
    maintenanceInterval: '13:00–14:30',
    trainInterval: '13:10–13:40',
  },
  {
    conflictId: 'CONF-006',
    blockId: 'BLK-E019',
    trainNumber: 'TR088',
    trainName: 'Garib Rath Express (NDLS-BDTS)',
    taskId: 'TSK-M019',
    assetId: 'A019',
    corridorId: 'C001',
    conflictType: 'RESOURCE_CONTENTION',
    severity: 'HIGH',
    description: 'BLK-E019 Deep Ballast Cleaning machine track envelope encroaches on Garib Rath scheduled bypass path.',
    status: 'OPEN',
    maintenanceInterval: '10:00–11:30',
    trainInterval: '10:40–11:10',
  },
  {
    conflictId: 'CONF-007',
    blockId: 'BLK-T025',
    trainNumber: 'TR042',
    trainName: 'Tejas Express (LKO-NDLS)',
    taskId: 'TSK-M025',
    assetId: 'A025',
    corridorId: 'C002',
    conflictType: 'SPEED_CONSTRAINT',
    severity: 'HIGH',
    description: 'BLK-T025 25kV OHE Catenary renewal mandates 30 km/h temporary speed restriction buffer colliding with Tejas timetable.',
    status: 'OPEN',
    maintenanceInterval: '15:00–16:30',
    trainInterval: '15:20–15:45',
  },
  {
    conflictId: 'CONF-008',
    blockId: 'BLK-S018',
    trainNumber: 'TR091',
    trainName: 'Intercity Express',
    taskId: 'TSK-M018',
    assetId: 'A018',
    corridorId: 'C001',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'MEDIUM',
    description: 'BLK-S018 Audio Frequency Track Circuit TC-104 tuning clashes with morning departure surge for TR091.',
    status: 'OPEN',
    maintenanceInterval: '08:30–10:00',
    trainInterval: '09:10–09:35',
  },
  {
    conflictId: 'CONF-009',
    blockId: 'BLK-E031',
    trainNumber: 'TR019',
    trainName: 'Goods Container Rake (TKD-JNPT)',
    taskId: 'TSK-M031',
    assetId: 'A003',
    corridorId: 'C004',
    conflictType: 'CURFEW_RESTRICTION',
    severity: 'LOW',
    description: 'BLK-E031 Bridge bearing greasing advisory on C004 siding generates minor 6-minute non-critical regulation notice.',
    status: 'OPEN',
    maintenanceInterval: '17:30–19:00',
    trainInterval: '18:10–18:50',
  },
  {
    conflictId: 'CONF-010',
    blockId: 'BLK-T008',
    trainNumber: 'TR074',
    trainName: 'Coal Freight Special',
    taskId: 'TSK-M008',
    assetId: 'A008',
    corridorId: 'C002',
    conflictType: 'RESOURCE_CONTENTION',
    severity: 'LOW',
    description: 'BLK-T008 Night insulator wash encroaching on freight staging yard clearance buffer during turnaround.',
    status: 'OPEN',
    maintenanceInterval: '02:00–03:30',
    trainInterval: '02:40–03:15',
  },
  // Auto-Resolved Historical Conflicts with different severities
  {
    conflictId: 'CONF-011',
    blockId: 'BLK-T004',
    trainNumber: 'TR012',
    trainName: 'Paschim Superfast',
    taskId: 'TSK-M004',
    assetId: 'A004',
    corridorId: 'C001',
    conflictType: 'TRAIN_OVERLAP',
    severity: 'CRITICAL',
    description: 'BLK-T004 Section Insulator replacement path overlap with TR012.',
    status: 'RESOLVED',
    maintenanceInterval: '01:00–03:00',
    trainInterval: '01:30–02:00',
    alternativeAppliedSlot: '01:00–03:00 (C001) - Pre-dawn shadow block',
    resolvedAt: '2026-09-05T08:00:00Z',
    resolutionNotes: 'Shifted into night shadow window with zero train passes.',
  },
  {
    conflictId: 'CONF-012',
    blockId: 'BLK-S014',
    trainNumber: 'TR022',
    trainName: 'Kalka Mail',
    taskId: 'TSK-M014',
    assetId: 'A014',
    corridorId: 'C003',
    conflictType: 'RESOURCE_CONTENTION',
    severity: 'HIGH',
    description: 'Axle counter reset crew overlap during morning line clear.',
    status: 'RESOLVED',
    maintenanceInterval: '07:00–08:30',
    trainInterval: '07:45–08:15',
    alternativeAppliedSlot: '05:30–07:00 (C003)',
    resolvedAt: '2026-09-05T08:15:00Z',
    resolutionNotes: 'Advanced to dawn lull prior to passenger rush.',
  },
  {
    conflictId: 'CONF-013',
    blockId: 'BLK-E022',
    trainNumber: 'TR038',
    trainName: 'Suburban Local',
    taskId: 'TSK-M022',
    assetId: 'A022',
    corridorId: 'C002',
    conflictType: 'SPEED_CONSTRAINT',
    severity: 'LOW',
    description: 'Minor ballast consolidation 15 km/h advisory on loop line.',
    status: 'RESOLVED',
    maintenanceInterval: '12:00–13:30',
    trainInterval: '12:30–12:50',
    alternativeAppliedSlot: '12:00–13:30 (C002) - Loop line diverted',
    resolvedAt: '2026-09-05T08:30:00Z',
    resolutionNotes: 'Rerouted suburban local to Main Track 1 during loop line work.',
  },
];

// Helper to generate 42 Optimized Blocks (37 valid, 5 with critical conflict)
export function generateInitialOptimizedBlocks(): OptimizedBlock[] {
  const blocks: OptimizedBlock[] = [];

  // Add the 5 critical conflict blocks first
  blocks.push({
    blockId: 'BLK-T012',
    taskId: 'TSK-M012',
    department: 'TRACTION',
    assetId: 'A017',
    corridorId: 'C003',
    section: 'KM 28/4 to 34/2',
    date: '2026-09-06',
    startTime: '14:00',
    endTime: '15:30',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-001',
    explainability: {
      whyThisSlot: [
        'Matches requested Traction maintenance window duration (90 min)',
        'OHE isolation team scheduled at Bahadurgarh sub-depot',
        'Direct train overlap detected with Vande Bharat TR106 (14:45–15:05)',
        'Alternative conflict-free shadow slot available at 12:15–13:45',
      ],
      optimizationFactors: {
        priorityScore: 92,
        assetAvailability: 'Asset isolated, permit required',
        corridorAvailability: 'Corridor slots constrained',
        trainCompatibility: 'CRITICAL VIOLATION with TR106',
        constraintCompatibility: 'Power shutdown window requires adjustment',
        operationalImpact: 'High potential passenger disruption',
      },
      alternateEvaluatedCount: 4,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Failed train headway clearance constraint',
    },
  });

  blocks.push({
    blockId: 'BLK-E014',
    taskId: 'TSK-M014',
    department: 'ENGINEERING',
    assetId: 'A018',
    corridorId: 'C003',
    section: 'KM 28/4 to 34/2',
    date: '2026-09-06',
    startTime: '14:15',
    endTime: '15:45',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-DEP-001',
    explainability: {
      whyThisSlot: [
        'Continuous heavy track tamping & dynamic track stabilizer 09-3X',
        'Direct physical dependency clash with Electrical Block BLK-T012 (14:00–15:30)',
        'Catenary contact wire height and earthing discharge rod safety violation',
        'Requires time shift reconciliation to establish 15m safety buffer',
      ],
      optimizationFactors: {
        priorityScore: 94,
        assetAvailability: 'Tamper 09-3X staged at Shakurbasti depot',
        corridorAvailability: 'C003 blocked by simultaneous TRD possession',
        trainCompatibility: 'Clear of train headways, but inter-departmental conflict active',
        constraintCompatibility: 'VIOLATION: ACTM Para 20.3 & IRPWM Para 6.4',
        operationalImpact: 'Dual track possession hazard on single section',
      },
      alternateEvaluatedCount: 4,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Failed inter-departmental dependency safety check',
    },
  });

  blocks.push({
    blockId: 'BLK-S034',
    taskId: 'TSK-M034',
    department: 'S&T',
    assetId: 'A023',
    corridorId: 'C004',
    section: 'KM 22/0 to 35/0',
    date: '2026-09-06',
    startTime: '11:00',
    endTime: '12:30',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-002',
    explainability: {
      whyThisSlot: [
        'Automatic Signaling testing window requested by S&T Officer',
        'Coincides with daytime daylight safety protocol',
        'Direct overlap with Rajdhani TR057 corridor slot (11:20–11:50)',
        'Alternative freight shadow slot identified at 13:45–15:15',
      ],
      optimizationFactors: {
        priorityScore: 89,
        assetAvailability: 'Signal team available on site',
        corridorAvailability: 'Single line section block needed',
        trainCompatibility: 'CRITICAL VIOLATION with TR057',
        constraintCompatibility: 'Fail-safe signal bypass not permissible',
        operationalImpact: 'Severe Rajdhani delay risk',
      },
      alternateEvaluatedCount: 3,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Incompatible with high-priority passenger path',
    },
  });

  blocks.push({
    blockId: 'BLK-E044',
    taskId: 'TSK-M044',
    department: 'ENGINEERING',
    assetId: 'A022',
    corridorId: 'C004',
    section: 'KM 14/0 to 18/5',
    date: '2026-09-06',
    startTime: '09:00',
    endTime: '10:30',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-003',
    explainability: {
      whyThisSlot: [
        'Heavy tamping machine BCM-41 available in morning shift',
        'Track geometry defect requiring urgent attention',
        'Direct overlap with Goods Container Freight TR034 (09:15–10:00)',
        'Reschedule candidate available at 15:30–17:00 post-freight clearance',
      ],
      optimizationFactors: {
        priorityScore: 91,
        assetAvailability: 'Tamping machine staged at KM 12',
        corridorAvailability: 'Corridor slot occupied by freight',
        trainCompatibility: 'CRITICAL VIOLATION with TR034',
        constraintCompatibility: 'Speed restriction required post-tamp',
        operationalImpact: 'Freight loop siding overflow risk',
      },
      alternateEvaluatedCount: 5,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Freight path conflict on single track bottleneck',
    },
  });

  blocks.push({
    blockId: 'BLK-S001',
    taskId: 'TSK-M001',
    department: 'S&T',
    assetId: 'A016',
    corridorId: 'C003',
    section: 'Shakurbasti Outer C3',
    date: '2026-09-06',
    startTime: '16:00',
    endTime: '17:30',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-004',
    explainability: {
      whyThisSlot: [
        'Electric point machine PM-301 mechanical servicing',
        'Shift change maintenance window scheduled by DSTE',
        'Overlaps with Shatabdi Express TR108 (16:30–17:00)',
        'Alternative shadow window available during quiet period 11:30–13:00',
      ],
      optimizationFactors: {
        priorityScore: 88,
        assetAvailability: 'Turnout locked during servicing',
        corridorAvailability: 'Main line point clamped during work',
        trainCompatibility: 'CRITICAL VIOLATION with TR108',
        constraintCompatibility: 'Requires manual point motor disconnect',
        operationalImpact: 'High-speed Shatabdi transit blocked',
      },
      alternateEvaluatedCount: 4,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Main line turnout occupancy during passenger peak',
    },
  });

  blocks.push({
    blockId: 'BLK-E007',
    taskId: 'TSK-M007',
    department: 'ENGINEERING',
    assetId: 'A011',
    corridorId: 'C002',
    section: 'KM 24/1 Road Cross',
    date: '2026-09-06',
    startTime: '13:00',
    endTime: '14:30',
    durationMinutes: 90,
    priority: 'CRITICAL',
    status: 'CONFLICT_FLAGGED',
    validationStatus: 'INVALID',
    hasConflict: true,
    conflictId: 'CONF-005',
    explainability: {
      whyThisSlot: [
        'Level Crossing LC-19 boom barrier motor replacement',
        'Coordinated with local road traffic police permit',
        'Overlaps with Jan Shatabdi Express TR065 (13:10–13:40)',
        'Optimal alternative slot at 15:00–16:30 after TR065 clears',
      ],
      optimizationFactors: {
        priorityScore: 87,
        assetAvailability: 'Road traffic blocked during work',
        corridorAvailability: 'Train movement restricted by LC gate open',
        trainCompatibility: 'CRITICAL VIOLATION with TR065',
        constraintCompatibility: 'Civil road clearance fixed duration',
        operationalImpact: 'Direct stop signal for Jan Shatabdi',
      },
      alternateEvaluatedCount: 3,
      disruptionAvoidanceMinutes: 0,
      constraintCheckSummary: 'Level Crossing safety interlock open to rail traffic',
    },
  });

  // Generate remaining 37 valid blocks across corridors
  const departments: ('ENGINEERING' | 'S&T' | 'TRACTION')[] = ['ENGINEERING', 'S&T', 'TRACTION'];
  const corridors = ['C001', 'C002', 'C003', 'C004'];
  const times = [
    { start: '01:00', end: '03:00', dur: 120 },
    { start: '02:30', end: '04:30', dur: 120 },
    { start: '08:30', end: '10:00', dur: 90 },
    { start: '10:15', end: '11:45', dur: 90 },
    { start: '12:00', end: '13:30', dur: 90 },
    { start: '13:45', end: '15:15', dur: 90 },
    { start: '15:30', end: '17:00', dur: 90 },
    { start: '17:15', end: '18:45', dur: 90 },
    { start: '19:00', end: '20:30', dur: 90 },
    { start: '21:00', end: '23:00', dur: 120 },
  ];

  const initialBlockIds = new Set(blocks.map((b) => b.blockId));
  const initialTaskIds = new Set(blocks.map((b) => b.taskId));

  let i = 6;
  while (blocks.length < 42) {
    const dept = departments[i % 3];
    const blockId = `BLK-${dept.charAt(0)}${i.toString().padStart(3, '0')}`;
    const taskId = `TSK-M${i.toString().padStart(3, '0')}`;

    if (initialBlockIds.has(blockId) || initialTaskIds.has(taskId)) {
      i++;
      continue;
    }

    const corr = corridors[i % 4];
    const timeIdx = (i * 2) % times.length;
    const time = times[timeIdx];
    const assetNum = 1 + (i % 28);
    const assetId = `A${assetNum.toString().padStart(3, '0')}`;

    blocks.push({
      blockId,
      taskId,
      department: dept,
      assetId: assetId,
      corridorId: corr,
      section: `KM ${(i * 3) % 40 + 2}/0 to ${(i * 3) % 40 + 6}/5`,
      date: '2026-09-06',
      startTime: time.start,
      endTime: time.end,
      durationMinutes: time.dur,
      priority: i % 4 === 0 ? 'HIGH' : i % 3 === 0 ? 'MEDIUM' : 'LOW',
      status: 'SCHEDULED',
      validationStatus: 'VALID',
      hasConflict: false,
      explainability: {
        whyThisSlot: [
          'Asset available and certified for maintenance window',
          'Required duration fully satisfied in shadow period',
          'Corridor capacity verified with zero headway conflict',
          'All passenger & freight train paths evaluated and cleared',
          'Traction power / signaling interlock constraints satisfied',
          'Lowest disruption impact slot selected by AI engine',
        ],
        optimizationFactors: {
          priorityScore: 78 + (i % 18),
          assetAvailability: 'Asset fully certified and staged',
          corridorAvailability: 'Optimal headway margin > 25 mins',
          trainCompatibility: 'Zero train headway overlaps',
          constraintCompatibility: 'Full compliance with safety rules',
          operationalImpact: 'Minimal disruption index (under 2%)',
        },
        alternateEvaluatedCount: 6,
        disruptionAvoidanceMinutes: 45 + ((i * 3) % 40),
        constraintCheckSummary: 'All safety constraints satisfied',
      },
    });

    initialBlockIds.add(blockId);
    initialTaskIds.add(taskId);
    i++;
  }

  return blocks;
}

// 35 Initial Block Requests
export function generateInitialBlockRequests(): BlockRequest[] {
  const requests: BlockRequest[] = [];
  const departments: ('ENGINEERING' | 'S&T' | 'TRACTION')[] = ['ENGINEERING', 'S&T', 'TRACTION'];
  const corridors = ['C001', 'C002', 'C003', 'C004'];
  const taskTypes = [
    'Track Geometry Tamping & Lining',
    'OHE Catenary Height & Stagger Adjustment',
    'Electronic Interlocking Logic Testing',
    'Turnout & Switch Lubrication',
    'Deep Ballast Screening (BCM)',
    'Overhead 25kV Insulator Washing',
    'LED Signal Lamp & Power Check',
    'Rail Ultrasonic Flaw Detection (USFD)',
    'Level Crossing Barrier Mechanism Overhaul',
    'Bridge Girder Inspection & Painting',
  ];

  for (let i = 1; i <= 35; i++) {
    const dept = departments[i % 3];
    const corr = corridors[i % 4];
    const assetNum = 1 + (i % 28);
    const assetId = `A${assetNum.toString().padStart(3, '0')}`;
    const status: BlockRequest['status'] =
      i <= 5 ? 'CONFLICT' : i <= 25 ? 'PLANNED' : i <= 32 ? 'UNDER_REVIEW' : 'PENDING';

    requests.push({
      requestId: `REQ-2026-${i.toString().padStart(3, '0')}`,
      department: dept,
      requester:
        dept === 'ENGINEERING'
          ? 'Er. Rajesh Verma (Sr. DEN)'
          : dept === 'S&T'
          ? 'Vikram Joshi (DSTE)'
          : 'Pooja Nair (Sr. DEE)',
      requesterRole:
        dept === 'ENGINEERING'
          ? 'ENGINEERING_OFFICER'
          : dept === 'S&T'
          ? 'ST_OFFICER'
          : 'TRACTION_OFFICER',
      assetId: assetId,
      assetType:
        dept === 'ENGINEERING'
          ? 'Track / Switch / Bridge'
          : dept === 'S&T'
          ? 'Interlocking / Signal / Track Circuit'
          : '25kV OHE Catenary / Substation',
      corridorId: corr,
      taskType: taskTypes[i % taskTypes.length],
      priority: i % 5 === 0 ? 'CRITICAL' : i % 3 === 0 ? 'HIGH' : i % 2 === 0 ? 'MEDIUM' : 'LOW',
      requestedDate: '2026-09-06',
      preferredStartTime: `${(8 + (i % 10)).toString().padStart(2, '0')}:00`,
      preferredEndTime: `${(9 + (i % 10)).toString().padStart(2, '0')}:30`,
      requiredDurationMinutes: i % 2 === 0 ? 90 : 120,
      description: `Mandatory scheduled maintenance on asset ${assetId} along corridor ${corr} to ensure track safety standards.`,
      operationalConstraints:
        i % 2 === 0
          ? 'Requires traction power shutdown on adjacent line'
          : 'Requires clamp lock on facing switches during operation',
      status: status,
      submittedAt: `2026-09-04T${(10 + (i % 8)).toString().padStart(2, '0')}:15:00Z`,
      syncedToGoogleSheets: true,
    });
  }

  return requests;
}

// 55 Defects
export function generateInitialDefects(): Defect[] {
  const defects: Defect[] = [];
  const severities: ('CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const defectTypes = [
    'Rail Weld Flaw (USFD Detected)',
    'OHE Dropper Loose / Arcing',
    'Point Machine Motor Stall Current High',
    'Track Circuit Voltage Fluctuation',
    'Fishplate Bolt Missing / Loose',
    'Catenary Wire Stagger Beyond Permissible Limit',
    'Axle Counter Section Inconsistent Reset',
    'Bridge Expansion Joint Debris Accumulation',
    'Ballast Pockets & Mud Pumping',
    'Signal Aspect Lamp Resistance Anomaly',
  ];

  for (let i = 1; i <= 55; i++) {
    const sev = i <= 6 ? 'CRITICAL' : i <= 22 ? 'HIGH' : i <= 42 ? 'MEDIUM' : 'LOW';
    const dept: ('ENGINEERING' | 'S&T' | 'TRACTION') = i % 3 === 0 ? 'ENGINEERING' : i % 3 === 1 ? 'S&T' : 'TRACTION';
    const corr = ['C001', 'C002', 'C003', 'C004'][i % 4];
    const assetNum = 1 + (i % 28);
    const assetId = `A${assetNum.toString().padStart(3, '0')}`;

    // Realistic corridor alignment and cluster anchors for Northern Railway Delhi Division
    const corridorBaseCoords: Record<string, [number, number]> = {
      C001: [28.6448, 77.2250], // NDLS - GZB
      C002: [28.6650, 77.2150], // DLI - PNP
      C003: [28.6920, 76.9210], // BGZ - ROK
      C004: [28.5830, 77.2450], // NZM - PWL
    };

    // Specific hot zones where railway defects cluster naturally
    let clusterLat = 0;
    let clusterLng = 0;
    let chainageDisplay = `KM ${(12 + (i * 1.8)).toFixed(1)} Up Main`;

    if (i === 1 || i === 5 || i === 9 || i === 21 || i === 33) {
      // Hotspot Cluster 1 (Sahibabad Junction C001: KM 22-26) - 2 CRITICAL (i=1,5), 1 HIGH (i=9,21), 1 MEDIUM (i=33)
      clusterLat = 28.6680 + ((i % 5) - 2) * 0.0035;
      clusterLng = 77.3590 + ((i % 3) - 1) * 0.0042;
      chainageDisplay = `KM ${(22.4 + (i % 4) * 0.8).toFixed(1)} Up Main (Sahibabad Jxn)`;
    } else if (i === 2 || i === 6 || i === 14 || i === 26 || i === 38) {
      // Hotspot Cluster 2 (Faridabad South C004: KM 30-34) - 2 CRITICAL (i=2,6), 1 HIGH (i=14,26), 1 MEDIUM (i=38)
      clusterLat = 28.4110 + ((i % 5) - 2) * 0.0038;
      clusterLng = 77.3150 + ((i % 3) - 1) * 0.0032;
      chainageDisplay = `KM ${(30.2 + (i % 4) * 0.9).toFixed(1)} Dn Main (Faridabad)`;
    } else if (i === 3 || i === 11 || i === 19 || i === 31) {
      // Hotspot Cluster 3 (Sonipat Jxn C002: KM 42-45) - 1 CRITICAL (i=3), 2 HIGH (i=11,19), 1 MEDIUM (i=31)
      clusterLat = 28.9890 + ((i % 4) - 1.5) * 0.0040;
      clusterLng = 77.0210 + ((i % 3) - 1) * 0.0035;
      chainageDisplay = `KM ${(43.1 + (i % 4) * 0.6).toFixed(1)} Up Line (Sonipat)`;
    } else if (i === 4 || i === 16 || i === 24 || i === 40) {
      // Hotspot Cluster 4 (Bahadurgarh Yard C003: KM 26-29) - 1 CRITICAL (i=4), 2 HIGH (i=16,24), 1 MEDIUM (i=40)
      clusterLat = 28.6920 + ((i % 4) - 1.5) * 0.0036;
      clusterLng = 76.9210 + ((i % 3) - 1) * 0.0038;
      chainageDisplay = `KM ${(27.4 + (i % 4) * 0.7).toFixed(1)} Freight Bypass (Bahadurgarh)`;
    } else if (i === 7 || i === 15 || i === 27 || i === 39) {
      // Cluster 5 (Anand Vihar C001: KM 12-14) - 0 CRITICAL, 2 HIGH (i=7,15), 1 MEDIUM (i=27), 1 LOW (i=39)
      clusterLat = 28.6498 + ((i % 4) - 1.5) * 0.0028;
      clusterLng = 77.3160 + ((i % 3) - 1) * 0.0030;
      chainageDisplay = `KM ${(13.2 + (i % 3) * 0.5).toFixed(1)} Terminal Approach (Anand Vihar)`;
    } else {
      // Realistic spread along the corridor line
      const baseCoord = corridorBaseCoords[corr] || [28.6139, 77.2090];
      const latOffset = (i * 0.0075) % 0.28;
      const lngOffset = (i * 0.0092) % 0.32;
      clusterLat = baseCoord[0] + latOffset;
      clusterLng = baseCoord[1] + lngOffset;
    }

    // Sample photographic evidence for railway defects
    let photoAttachment: any = undefined;
    let aiVisualAnalysis: any = undefined;
    if (i % 3 === 0) {
      const pType = i % 2 === 0 ? 'Rail Head Fatigue Flaw' : 'Overhead Catenary Wire Dropper Snap';
      const color = sev === 'CRITICAL' ? '#f43f5e' : '#f59e0b';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 280" width="400" height="280"><rect width="400" height="280" fill="#0b1329"/><path d="M0 140 L400 140 L400 190 L0 190 Z" fill="#334155"/><path d="M170 140 Q190 160 185 180" stroke="${color}" stroke-width="4" fill="none"/><circle cx="185" cy="160" r="22" stroke="${color}" stroke-width="1.5" stroke-dasharray="3,3" fill="none"/><rect x="0" y="235" width="400" height="45" fill="#020617" opacity="0.95"/><text x="12" y="252" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="bold">IR FIELD DEFECT EVIDENCE | ${assetId} (${corr})</text><text x="12" y="268" fill="#e2e8f0" font-family="monospace" font-size="8.5">${pType} - DETECTED ON PATROL</text></svg>`;
      
      aiVisualAnalysis = {
        suggestedPriority: sev,
        confidencePercent: 90 + (i % 8),
        detectedVisualPatterns: [
          i % 2 === 0 ? 'Transverse rail gauge crack' : 'OHE dropper snap & contact sag',
          'Surface micro-spalling & metal fatigue',
          'Geometric alignment variance',
        ],
        structuralRiskSummary:
          sev === 'CRITICAL'
            ? 'High risk of brittle rail fracture under dynamic 25T freight loading.'
            : 'Wear pattern requires scheduled remedial restoration within next block window.',
        recommendedImmediateAction:
          sev === 'CRITICAL'
            ? 'Impose 30 km/h caution order. Deploy P-Way emergency squad with clamps.'
            : 'Schedule sectional maintenance within 48-hour corridor window.',
        suggestedSpeedRestrictionKmph: sev === 'CRITICAL' ? 30 : 50,
        detectedDefectCategory: i % 2 === 0 ? 'Permanent Way Railhead Fracture' : 'Traction OHE Disruption',
        analyzedAt: `2026-09-0${1 + (i % 5)}T10:${(10 + i).toString().padStart(2, '0')}:00Z`,
        modelUsed: 'gemini-3.8-flash (Vision API)',
      };

      photoAttachment = {
        dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
        capturedAt: `2026-09-0${1 + (i % 5)}T10:${(10 + i).toString().padStart(2, '0')}:00Z`,
        fileName: `patrol-photo-${assetId}.jpg`,
        fileSizeBytes: 42800,
        source: 'FIELD_PRESET' as const,
        caption: `${pType} recorded during corridor patrol on ${assetId}`,
        aiAnalysis: aiVisualAnalysis,
      };
    } else {
      // Sensor-based AI priority analysis from TRC / OMS / ultrasonic cars
      aiVisualAnalysis = {
        suggestedPriority: sev,
        confidencePercent: 86 + (i % 12),
        detectedVisualPatterns: [
          i % 2 === 0 ? 'TRC track geometry alignment anomaly' : 'Acoustic axle vibration spectral peak',
          'Automated condition profile variance',
          'Dynamic deflection threshold proximity',
        ],
        structuralRiskSummary:
          sev === 'CRITICAL'
            ? 'Ultrasonic flaw detector indicates high risk of rapid crack elongation under heavy freight loading.'
            : sev === 'HIGH'
            ? 'Condition parameters show structural degradation requiring priority maintenance block intervention.'
            : sev === 'MEDIUM'
            ? 'Track roughness indices within permissible limits but trending toward intervention threshold.'
            : 'Minor baseline deviation. Low operational risk; maintain standard monitoring cycle.',
        recommendedImmediateAction:
          sev === 'CRITICAL'
            ? 'Impose 30 km/h caution order. Immediate emergency track block requested.'
            : sev === 'HIGH'
            ? 'Schedule 90-minute maintenance block within next 48 hours.'
            : sev === 'MEDIUM'
            ? 'Include in upcoming weekend corridor maintenance schedule.'
            : 'Continue routine inspection schedule.',
        suggestedSpeedRestrictionKmph: sev === 'CRITICAL' ? 30 : sev === 'HIGH' ? 50 : undefined,
        detectedDefectCategory: i % 2 === 0 ? 'Track Recording Car Sensor Analysis' : 'OMS Vibration Spectral Analysis',
        analyzedAt: `2026-09-0${1 + (i % 5)}T08:${(10 + i).toString().padStart(2, '0')}:00Z`,
        modelUsed: 'gemini-3.8-flash (Railway Anomaly Engine)',
      };
    }

    defects.push({
      defectId: `DEF-2026-${i.toString().padStart(3, '0')}`,
      assetId: assetId,
      department: dept,
      corridorId: corr,
      defectType: defectTypes[i % defectTypes.length],
      severity: sev,
      detectedDate: `2026-09-${(1 + (i % 5)).toString().padStart(2, '0')}`,
      description: `Defect observed during OMS trolley inspection on ${assetId} at corridor ${corr}. Prompt mitigation required.`,
      reportedBy: i % 2 === 0 ? 'Track Inspection Patrol' : 'Traction Line Inspection Unit',
      status: i <= 5 ? 'PENDING_PRIORITY_ANALYSIS' : i <= 25 ? 'ANALYZED' : 'SCHEDULED',
      speedRestrictionKmph: sev === 'CRITICAL' ? 30 : sev === 'HIGH' ? 50 : undefined,
      geoCoordinates: {
        latitude: Number(clusterLat.toFixed(6)),
        longitude: Number(clusterLng.toFixed(6)),
        accuracyMeters: 2.0 + (i % 4),
        capturedAt: `2026-09-0${1 + (i % 5)}T10:${(10 + i).toString().padStart(2, '0')}:00Z`,
        source: 'GPS_DEVICE',
        railwayChainageKm: chainageDisplay,
      },
      photoAttachment,
      aiVisualAnalysis,
    });
  }

  return defects;
}

// 120 Train Schedules
export function generateInitialTrains(): TrainSchedule[] {
  const trains: TrainSchedule[] = [];
  const corridors = ['C001', 'C002', 'C003', 'C004'];
  const categories: ('PREMIUM_EXP' | 'EXPRESS' | 'PASSENGER' | 'FREIGHT')[] = [
    'PREMIUM_EXP',
    'EXPRESS',
    'PASSENGER',
    'FREIGHT',
  ];

  // Specific 5 trains that conflict with blocks initially
  trains.push({
    trainNumber: 'TR106',
    trainName: 'Vande Bharat Express (NDLS-ROK)',
    corridorId: 'C003',
    date: '2026-09-06',
    arrivalTime: '14:45',
    departureTime: '15:05',
    direction: 'DOWN',
    status: 'ON_TIME',
    category: 'PREMIUM_EXP',
    priorityLevel: 'P1_VANDE_BHARAT',
    conflictWithBlockId: 'BLK-T012',
  });

  trains.push({
    trainNumber: 'TR057',
    trainName: 'Rajdhani Special (NDLS-MBR)',
    corridorId: 'C004',
    date: '2026-09-06',
    arrivalTime: '11:20',
    departureTime: '11:50',
    direction: 'UP',
    status: 'ON_TIME',
    category: 'PREMIUM_EXP',
    priorityLevel: 'P2_RAJDHANI',
    conflictWithBlockId: 'BLK-S034',
  });

  trains.push({
    trainNumber: 'TR034',
    trainName: 'Container Freight Express',
    corridorId: 'C004',
    date: '2026-09-06',
    arrivalTime: '09:15',
    departureTime: '10:00',
    direction: 'DOWN',
    status: 'ON_TIME',
    category: 'FREIGHT',
    priorityLevel: 'P5_FREIGHT',
    conflictWithBlockId: 'BLK-E044',
  });

  trains.push({
    trainNumber: 'TR108',
    trainName: 'Shatabdi Express',
    corridorId: 'C003',
    date: '2026-09-06',
    arrivalTime: '16:30',
    departureTime: '17:00',
    direction: 'UP',
    status: 'ON_TIME',
    category: 'PREMIUM_EXP',
    priorityLevel: 'P1_VANDE_BHARAT',
    conflictWithBlockId: 'BLK-S001',
  });

  trains.push({
    trainNumber: 'TR065',
    trainName: 'Jan Shatabdi Express',
    corridorId: 'C002',
    date: '2026-09-06',
    arrivalTime: '13:10',
    departureTime: '13:40',
    direction: 'DOWN',
    status: 'ON_TIME',
    category: 'EXPRESS',
    priorityLevel: 'P3_SUPERFAST',
    conflictWithBlockId: 'BLK-E007',
  });

  // Generate remaining 115 trains
  const names = [
    'Tejas Express',
    'Garib Rath',
    'Duronto Express',
    'Intercity Express',
    'Goods Container Rake',
    'Coal Freight Special',
    'Suburban Passenger Local',
    'Express Parcel Van',
    'Humsafar Express',
    'Kalka Mail',
  ];

  const existingTrainNumbers = new Set(trains.map((t) => t.trainNumber));

  let i = 6;
  while (trains.length < 120) {
    const trainNum = `TR${i.toString().padStart(3, '0')}`;
    if (existingTrainNumbers.has(trainNum)) {
      i++;
      continue;
    }

    const corr = corridors[i % 4];
    const cat = categories[i % 4];
    const hour = Math.floor((i * 12) / 60) % 24;
    const min = (i * 17) % 60;
    const arrH = hour.toString().padStart(2, '0');
    const arrM = min.toString().padStart(2, '0');
    const depH = ((hour + (min > 35 ? 1 : 0)) % 24).toString().padStart(2, '0');
    const depM = ((min + 25) % 60).toString().padStart(2, '0');

    trains.push({
      trainNumber: trainNum,
      trainName: `${names[i % names.length]} (${corr})`,
      corridorId: corr,
      date: '2026-09-06',
      arrivalTime: `${arrH}:${arrM}`,
      departureTime: `${depH}:${depM}`,
      direction: i % 2 === 0 ? 'UP' : 'DOWN',
      status: i % 11 === 0 ? 'DELAYED' : 'ON_TIME',
      category: cat,
      priorityLevel:
        cat === 'PREMIUM_EXP'
          ? 'P1_VANDE_BHARAT'
          : cat === 'EXPRESS'
          ? 'P3_SUPERFAST'
          : cat === 'PASSENGER'
          ? 'P4_MAIL'
          : 'P5_FREIGHT',
    });

    existingTrainNumbers.add(trainNum);
    i++;
  }

  return trains;
}

// 60 Maintenance Tasks
export function generateInitialMaintenanceTasks() {
  const tasks = [];
  const departments: ('ENGINEERING' | 'S&T' | 'TRACTION')[] = ['ENGINEERING', 'S&T', 'TRACTION'];
  const corridors = ['C001', 'C002', 'C003', 'C004'];

  for (let i = 1; i <= 60; i++) {
    const dept = departments[i % 3];
    const corr = corridors[i % 4];
    const assetNum = 1 + (i % 28);
    const assetId = `A${assetNum.toString().padStart(3, '0')}`;

    tasks.push({
      taskId: `TSK-M${i.toString().padStart(3, '0')}`,
      department: dept,
      assetId: assetId,
      corridorId: corr,
      priority: i <= 5 ? 'CRITICAL' : i <= 20 ? 'HIGH' : i <= 45 ? 'MEDIUM' : 'LOW',
      durationMinutes: i % 2 === 0 ? 90 : 120,
      requestedDate: '2026-09-06',
      status: i <= 5 ? 'CONFLICT' : i <= 42 ? 'SCHEDULED' : 'PENDING_APPROVAL',
      description: `Periodic overhaul maintenance on asset ${assetId} at corridor ${corr}.`,
    });
  }

  return tasks;
}

// Alternative slot candidate database for conflict resolution
export const ALTERNATIVE_SLOTS_DB: Record<string, { [blockId: string]: any[] }> = {
  candidates: {
    'BLK-T012': [
      {
        slotId: 'SLOT-ALT-T01',
        startTime: '12:15',
        endTime: '13:45',
        corridorId: 'C003',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 96.4,
        scoreBreakdown: 'Zero passenger headway overlaps; 32 mins buffer before TR106.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-T02',
        startTime: '15:45',
        endTime: '17:15',
        corridorId: 'C003',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 89.1,
        scoreBreakdown: 'Executes immediately after TR106 departure with 40 min gap.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-S034': [
      {
        slotId: 'SLOT-ALT-S01',
        startTime: '13:45',
        endTime: '15:15',
        corridorId: 'C004',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 97.8,
        scoreBreakdown: 'Quiet corridor window; zero passenger conflicts.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-S02',
        startTime: '07:30',
        endTime: '09:00',
        corridorId: 'C004',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 91.5,
        scoreBreakdown: 'Early morning window with ample sunlight.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-E044': [
      {
        slotId: 'SLOT-ALT-E01',
        startTime: '15:30',
        endTime: '17:00',
        corridorId: 'C004',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 95.2,
        scoreBreakdown: 'Clear of freight line TR034 pass window; speed restriction buffers ok.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-E02',
        startTime: '21:00',
        endTime: '22:30',
        corridorId: 'C004',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 88.0,
        scoreBreakdown: 'Night shadow window.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-S001': [
      {
        slotId: 'SLOT-ALT-S03',
        startTime: '11:30',
        endTime: '13:00',
        corridorId: 'C003',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 98.1,
        scoreBreakdown: 'Perfect midday lull; zero switch movement interference.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-S04',
        startTime: '18:00',
        endTime: '19:30',
        corridorId: 'C003',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 90.3,
        scoreBreakdown: 'Evening shadow slot.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-E007': [
      {
        slotId: 'SLOT-ALT-E03',
        startTime: '15:00',
        endTime: '16:30',
        corridorId: 'C002',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 96.0,
        scoreBreakdown: 'Post-TR065 passage with 80 min clear buffer before next train.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-E04',
        startTime: '10:30',
        endTime: '12:00',
        corridorId: 'C002',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 92.4,
        scoreBreakdown: 'Morning window before Jan Shatabdi entry.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-E019': [
      {
        slotId: 'SLOT-ALT-E05',
        startTime: '13:00',
        endTime: '14:30',
        corridorId: 'C001',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 97.2,
        scoreBreakdown: 'Afternoon traffic lull on C001; bypass track clear of all passenger paths.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-E06',
        startTime: '22:00',
        endTime: '23:30',
        corridorId: 'C001',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 91.0,
        scoreBreakdown: 'Night maintenance window with zero adjacent envelope restriction.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-T025': [
      {
        slotId: 'SLOT-ALT-T03',
        startTime: '11:00',
        endTime: '12:30',
        corridorId: 'C002',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 95.8,
        scoreBreakdown: 'Midday slot provides 45 min buffer before Tejas Express entry.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-T04',
        startTime: '17:30',
        endTime: '19:00',
        corridorId: 'C002',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 88.5,
        scoreBreakdown: 'Post-evening departure wave with regulated freight buffer.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-S018': [
      {
        slotId: 'SLOT-ALT-S05',
        startTime: '12:00',
        endTime: '13:30',
        corridorId: 'C001',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 96.7,
        scoreBreakdown: 'Quiet switch track interval; clears morning departure rush for TR091.',
        recommendationLevel: 'BEST_MATCH',
      },
      {
        slotId: 'SLOT-ALT-S06',
        startTime: '15:15',
        endTime: '16:45',
        corridorId: 'C001',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 90.1,
        scoreBreakdown: 'Late afternoon window with clear track circuit telemetry.',
        recommendationLevel: 'ACCEPTABLE',
      },
    ],
    'BLK-E031': [
      {
        slotId: 'SLOT-ALT-E07',
        startTime: '14:00',
        endTime: '15:30',
        corridorId: 'C004',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 98.4,
        scoreBreakdown: 'Siding unoccupied; eliminates 6-min freight regulation completely.',
        recommendationLevel: 'BEST_MATCH',
      },
    ],
    'BLK-T008': [
      {
        slotId: 'SLOT-ALT-T05',
        startTime: '04:00',
        endTime: '05:30',
        corridorId: 'C002',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 96.1,
        scoreBreakdown: 'Pre-dawn slot after freight turnaround departure completes.',
        recommendationLevel: 'BEST_MATCH',
      },
    ],
  },
};

export const generateHistoricalAuditLogs = (): AuditLog[] => {
  const currentLogs: AuditLog[] = [
    {
      id: 'AUD-001',
      timestamp: '2026-09-05T10:14:22Z',
      user: 'Smt. Ananya Sen (Railway Planner)',
      role: 'RAILWAY_PLANNER',
      action: 'Optimization Engine Invocation',
      object: 'AI Planning Engine / 42 Blocks',
      status: 'SUCCESS',
      severity: 'SUCCESS',
      category: 'OPTIMIZATION',
      details: 'Triggered batch scheduling for 35 maintenance requests against 120 train movements.',
    },
    {
      id: 'AUD-002',
      timestamp: '2026-09-05T10:14:35Z',
      user: 'AI Engine / Conflict Detector',
      role: 'SUPER_ADMIN',
      action: 'Initial Conflict Analysis Completed',
      object: 'Corridors C001, C002, C003, C004',
      status: 'WARNING',
      severity: 'WARNING',
      category: 'CONFLICT_RESOLUTION',
      details: '23 initial conflicts detected across raw requests. 18 resolved by algorithm; 5 require manual planner review.',
    },
    {
      id: 'AUD-003',
      timestamp: '2026-09-05T10:15:10Z',
      user: 'Safety Gate Automation',
      role: 'SUPER_ADMIN',
      action: 'Final Safety Validation Started',
      object: 'Schedule Publication Gate',
      status: 'LOCKED',
      severity: 'CRITICAL',
      category: 'SAFETY_GATE',
      details: 'Publishing locked: 5 critical issues detected on corridors C002, C003, C004.',
    },
    {
      id: 'AUD-004',
      timestamp: '2026-09-05T09:40:12Z',
      user: 'Er. Rajesh Verma',
      role: 'ENGINEERING_OFFICER',
      action: 'Maintenance Request Submitted',
      object: 'REQ-2026-035 (Asset A018)',
      status: 'SUCCESS',
      severity: 'SUCCESS',
      category: 'MAINTENANCE_EXECUTION',
      details: 'Ballast screening request submitted for C003; synchronized to backend.',
    },
    {
      id: 'AUD-005',
      timestamp: '2026-09-05T09:12:00Z',
      user: 'Vikram Joshi',
      role: 'ST_OFFICER',
      action: 'Defect Submitted',
      object: 'DEF-2026-055 (Asset A023)',
      status: 'SUCCESS',
      severity: 'NORMAL',
      category: 'DEFECT_REPORTING',
      details: 'ABS Signaling intermittent lamp voltage defect registered on C004.',
    },
  ];

  // Curated historical telemetry events across the last 30 days (2026-08-07 to 2026-09-04)
  const historicalDaysSpec = [
    {
      daysAgo: 1,
      date: '2026-09-04',
      events: [
        { time: '04:15:00Z', user: 'TRD Controller', role: 'ENGINEERING_OFFICER' as const, action: 'OHE Power Clearance Issued', object: 'C001 KM 12/0-16/0', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACTION_OHE', details: 'Pre-dawn maintenance isolation grounded successfully.' },
        { time: '11:30:20Z', user: 'Smt. Ananya Sen', role: 'RAILWAY_PLANNER' as const, action: 'Schedule Re-optimization', object: 'Genetic Engine / 38 Blocks', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Zero headway violations across all 4 corridors.' },
        { time: '16:45:10Z', user: 'Signal Inspector Verma', role: 'ST_OFFICER' as const, action: 'Interlocking Health Cycle Check', object: 'C002 Western High Speed', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'All 64 route relays verified nominal.' },
        { time: '22:10:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Night Mega Block Pre-Validation', object: 'C003 Heavy Freight', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Block shadow windows aligned with freight pauses.' }
      ]
    },
    {
      daysAgo: 2,
      date: '2026-09-03',
      events: [
        { time: '06:20:00Z', user: 'P-Way In-Charge', role: 'ENGINEERING_OFFICER' as const, action: 'Ultrasonic Rail Flaw Audit (USFD)', object: 'C001 Rail Welds 14-22', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: 'Zero transverse fissures detected.' },
        { time: '13:10:45Z', user: 'AI Conflict Detector', role: 'SUPER_ADMIN' as const, action: 'Auto-Resolved Freight Conflict', object: 'C004 Express Spur', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'CONFLICT_RESOLUTION', details: 'Buffer increased by 18 minutes to accommodate mail rake.' },
        { time: '19:40:00Z', user: 'Chief Controller Raman', role: 'RAILWAY_PLANNER' as const, action: 'Slot Optimization Complete', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Fleet roster capacity utilization at 91.4%.' }
      ]
    },
    {
      daysAgo: 3,
      date: '2026-09-02',
      events: [
        // Peak Day: 99.8% Reliability
        { time: '02:00:00Z', user: 'Track Machine Pilot', role: 'ENGINEERING_OFFICER' as const, action: 'Continuous Tamping Signoff', object: 'CSM-09-3X-401 (C001)', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'MAINTENANCE_EXECUTION', details: '3.8km continuous tamping executed; track geometry restored to 99.4 index.' },
        { time: '08:30:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: '100% Zero-Defect Safety Clearance', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'All 7 safety gates cleared with zero overrides.' },
        { time: '15:15:00Z', user: 'KAVACH Ground System', role: 'SUPER_ADMIN' as const, action: 'Station Balise RF Health Verification', object: 'Corridors C001 & C002', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'KAVACH_TELEMETRY', details: '100% packets acknowledged with sub-20ms latency.' },
        { time: '21:50:00Z', user: 'Er. Rajesh Verma', role: 'ENGINEERING_OFFICER' as const, action: 'Bridge Inspection Certified', object: 'Bridge BR-104 (C001)', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACK_INSPECTION', details: 'Bedplate expansion joints certified nominal.' }
      ]
    },
    {
      daysAgo: 4,
      date: '2026-09-01',
      events: [
        { time: '05:40:00Z', user: 'TRD Power Controller', role: 'ENGINEERING_OFFICER' as const, action: 'Catenary Wire Tension Measurement', object: 'C004 Sector 3', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACTION_OHE', details: 'Contact wire height verified within 5.50m - 5.80m tolerance.' },
        { time: '12:00:15Z', user: 'Signal Maintenance Team', role: 'ST_OFFICER' as const, action: 'Point Machine Detection Gap Audit', object: 'Switch 102B (C002)', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Obstacle test passed at 3.2mm limit.' },
        { time: '18:25:30Z', user: 'AI Planning Engine', role: 'SUPER_ADMIN' as const, action: 'Pre-Shift Conflict Elimination', object: 'C003 Heavy Freight', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: '12 freight movements rescheduled without congestion.' }
      ]
    },
    {
      daysAgo: 5,
      date: '2026-08-31',
      events: [
        { time: '03:10:00Z', user: 'Track Gang Supervisor', role: 'ENGINEERING_OFFICER' as const, action: 'Manual P-Way Deep Screening Audit', object: 'C001 KM 09/2', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'MAINTENANCE_EXECUTION', details: 'Ballast cushion replenished and compacted.' },
        { time: '14:20:00Z', user: 'Vikram Joshi', role: 'ST_OFFICER' as const, action: 'Axle Counter Wheel Sensor Ping', object: 'Dual Axle Counter DAC-08', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Phase drift well within 5% tolerance.' },
        { time: '20:15:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Night Slot Safety Gate Validation', object: 'C002 High Speed Spur', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'All safety buffers verified.' }
      ]
    },
    {
      daysAgo: 6,
      date: '2026-08-30',
      events: [
        { time: '07:45:00Z', user: 'P-Way In-Charge', role: 'ENGINEERING_OFFICER' as const, action: 'Speed Restriction Revocation Log', object: 'C003 KM 28/0', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: '30 km/h caution order canceled; track cleared for 100 km/h line speed.' },
        { time: '16:00:00Z', user: 'Smt. Ananya Sen', role: 'RAILWAY_PLANNER' as const, action: 'Multi-corridor Slot Optimization', object: 'Corridors C001-C004', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Conflict density dropped below 0.02 conflicts/km.' }
      ]
    },
    {
      daysAgo: 7,
      date: '2026-08-29',
      events: [
        { time: '09:12:00Z', user: 'Signal Inspector', role: 'ST_OFFICER' as const, action: 'Track Circuit Drop Voltage Log', object: 'C001 TC-14B', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Relay pick-up voltage verified at 1.45V nominal.' },
        { time: '18:30:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Corridor Safety Gate Audit', object: 'C004 Express Link', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Automated clearance issued for 8 maintenance blocks.' }
      ]
    },
    {
      daysAgo: 8,
      date: '2026-08-28',
      events: [
        // Dip / Warning Day: 96.1%
        { time: '03:40:00Z', user: 'AI Conflict Detector', role: 'SUPER_ADMIN' as const, action: 'Priority Rake Conflict Detected', object: 'C004 Express Link', status: 'WARNING' as const, severity: 'WARNING' as const, category: 'CONFLICT_RESOLUTION', details: 'Overlapping maintenance window with priority Vande Bharat rake path detected.' },
        { time: '04:15:00Z', user: 'Smt. Ananya Sen', role: 'RAILWAY_PLANNER' as const, action: 'Dynamic Slot Shift Resolution', object: 'Block BLK-C004-03', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Shifted block forward by 45 minutes; clearance restored.' },
        { time: '15:20:00Z', user: 'TRD Controller', role: 'ENGINEERING_OFFICER' as const, action: 'Neutral Section Insulator Cleanse', object: 'C002 OHE Section', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACTION_OHE', details: 'Flashover risk mitigated.' }
      ]
    },
    {
      daysAgo: 9,
      date: '2026-08-27',
      events: [
        { time: '08:00:00Z', user: 'Er. Rajesh Verma', role: 'ENGINEERING_OFFICER' as const, action: 'Curvature Alignment Verification', object: 'C001 KM 18/4 Curve 4R', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: 'Versine deviation measured at 2mm (within 4mm tolerance).' },
        { time: '14:50:00Z', user: 'KAVACH Stationary Telemetry', role: 'SUPER_ADMIN' as const, action: 'Automatic Train Protection Sync', object: 'Station Loop Lines', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'KAVACH_TELEMETRY', details: 'Emergency brake trigger health verified.' }
      ]
    },
    {
      daysAgo: 10,
      date: '2026-08-26',
      events: [
        { time: '05:30:00Z', user: 'Track Maintenance Gang 02', role: 'ENGINEERING_OFFICER' as const, action: 'Turnout Fitting Tightening', object: 'C003 Points 21 & 22', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'MAINTENANCE_EXECUTION', details: '100% check-rail bolts torqued to IRTMM spec.' },
        { time: '17:10:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Automated 7-Point Gate Verification', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Verified non-conflicting passenger train paths.' }
      ]
    },
    {
      daysAgo: 11,
      date: '2026-08-25',
      events: [
        { time: '06:45:00Z', user: 'Signal Inspector Joshi', role: 'ST_OFFICER' as const, action: 'LED Signal Aspect Lux Verification', object: 'C001 Home Signal 04', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Light output meets Railway Board visibility requirements.' },
        { time: '13:30:00Z', user: 'AI Planning Engine', role: 'RAILWAY_PLANNER' as const, action: 'Corridor Capacity Recalibration', object: 'Corridors C001, C003', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Increased throughput by 14% via intelligent slack absorption.' }
      ]
    },
    {
      daysAgo: 12,
      date: '2026-08-24',
      events: [
        { time: '04:10:00Z', user: 'TRD Section Engineer', role: 'ENGINEERING_OFFICER' as const, action: 'OHE Pantograph Shock Absorber Test', object: 'C002 KM 04/0', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACTION_OHE', details: 'Dynamic uplift within 60mm limit at 130 km/h.' },
        { time: '16:40:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Interlock Conflict Verification', object: 'C001 & C004', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'All safety interlocks operational.' }
      ]
    },
    {
      daysAgo: 13,
      date: '2026-08-23',
      events: [
        { time: '07:20:00Z', user: 'Track Inspector Yadav', role: 'ENGINEERING_OFFICER' as const, action: 'Switch Expansion Joint (SEJ) Gap Measurement', object: 'C001 SEJ-02', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACK_INSPECTION', details: 'Gap verified at 58mm at 34°C rail temp.' },
        { time: '15:15:00Z', user: 'AI Conflict Engine', role: 'SUPER_ADMIN' as const, action: 'Auto-Resolved Headway Gap', object: 'C003 Freight Loop', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'CONFLICT_RESOLUTION', details: '10-minute headway enforced automatically.' }
      ]
    },
    {
      daysAgo: 14,
      date: '2026-08-22',
      events: [
        { time: '05:00:00Z', user: 'P-Way In-Charge', role: 'ENGINEERING_OFFICER' as const, action: 'Level Crossing Safety Interlocking Check', object: 'LC Gate 44 (C001)', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Boom lock proving contacts verified nominal.' },
        { time: '14:45:00Z', user: 'Smt. Ananya Sen', role: 'RAILWAY_PLANNER' as const, action: 'Fortnightly Schedule Baseline Audit', object: 'Schedule Publication Gate', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Historical conflict rate reduced by 34%.' }
      ]
    },
    {
      daysAgo: 15,
      date: '2026-08-21',
      events: [
        // Trough / Anomaly Day: 93.8% Reliability (Major Safety Lock)
        { time: '02:15:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Emergency Safety Gate Lockdown', object: 'C003 Western Freight Siding', status: 'LOCKED' as const, severity: 'CRITICAL' as const, category: 'SAFETY_GATE', details: 'Safety lock engaged: Unsanctioned siding shunt attempt detected during active block window.' },
        { time: '02:40:00Z', user: 'Chief Operating Controller', role: 'SUPER_ADMIN' as const, action: 'Emergency Track Protection Dispatched', object: 'C003 Siding Points', status: 'WARNING' as const, severity: 'WARNING' as const, category: 'SAFETY_GATE', details: 'Automatic derailer set to trap position; shunting halted.' },
        { time: '04:10:00Z', user: 'Safety Directorate Team', role: 'SUPER_ADMIN' as const, action: 'Incident Cleared & Gate Re-validated', object: 'C003 Corridor', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Physical track inspection verified clear; safety lockout released.' }
      ]
    },
    {
      daysAgo: 16,
      date: '2026-08-20',
      events: [
        { time: '08:30:00Z', user: 'Signal Inspector Verma', role: 'ST_OFFICER' as const, action: 'Relay Room Dual Key Access Audit', object: 'Relay Room R-02 (C001)', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SECURITY_AUDIT', details: 'Electro-mechanical key interlocking verified tamper-proof.' },
        { time: '18:10:00Z', user: 'AI Planning Engine', role: 'RAILWAY_PLANNER' as const, action: 'Routine Schedule Optimization', object: 'Corridors C001-C004', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Optimal allocation of track maintenance slots.' }
      ]
    },
    {
      daysAgo: 17,
      date: '2026-08-19',
      events: [
        { time: '06:00:00Z', user: 'Track Machine Crew', role: 'ENGINEERING_OFFICER' as const, action: 'Ballast Regulating Machine Run', object: 'BRM-204 (C001)', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'MAINTENANCE_EXECUTION', details: 'Ballast shoulder profile graded to 1:1.5 standard.' },
        { time: '15:20:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Schedule Validation Cycle', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Zero safety anomalies.' }
      ]
    },
    {
      daysAgo: 18,
      date: '2026-08-18',
      events: [
        { time: '04:45:00Z', user: 'TRD Controller', role: 'ENGINEERING_OFFICER' as const, action: 'Substation Transformer Bushing Audit', object: 'Traction Substation TSS-01', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACTION_OHE', details: 'Infrared thermography scan shows zero hotspots.' },
        { time: '13:15:00Z', user: 'Signal Inspector Joshi', role: 'ST_OFFICER' as const, action: 'Electronic Interlocking VDU Diagnostics', object: 'EI Cabin North', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Dual processor redundancy switchover tested in 45ms.' }
      ]
    },
    {
      daysAgo: 19,
      date: '2026-08-17',
      events: [
        { time: '07:10:00Z', user: 'Er. Rajesh Verma', role: 'ENGINEERING_OFFICER' as const, action: 'Welded Rail De-stressing Log', object: 'C002 KM 08/0-12/0', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: 'De-stressing executed at reference rail temperature of 38°C.' },
        { time: '16:30:00Z', user: 'AI Conflict Engine', role: 'SUPER_ADMIN' as const, action: 'Dynamic Headway Buffer Enforcement', object: 'C001 Northern Trunk', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'CONFLICT_RESOLUTION', details: 'Headway guaranteed across 4 consecutive express blocks.' }
      ]
    },
    {
      daysAgo: 20,
      date: '2026-08-16',
      events: [
        { time: '05:25:00Z', user: 'P-Way In-Charge', role: 'ENGINEERING_OFFICER' as const, action: 'Track Gauge & Twist Telemetry Audit', object: 'C004 Express Link', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: 'Gauge variance within +/-2mm limit.' },
        { time: '19:00:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Pre-Publication Safety Validation', object: 'Schedule Publication Gate', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Safety clearance approved.' }
      ]
    },
    {
      daysAgo: 21,
      date: '2026-08-15',
      events: [
        // Independence Day Protocol: 99.4%
        { time: '06:00:00Z', user: 'Safety Directorate Team', role: 'SUPER_ADMIN' as const, action: 'National Holiday High-Alert Protocol', object: 'Network-Wide Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SECURITY_AUDIT', details: '24-hour continuous surveillance and automated interlocking freeze enforced.' },
        { time: '12:00:00Z', user: 'Chief Controller Raman', role: 'RAILWAY_PLANNER' as const, action: 'VIP Special Train Movement Validation', object: 'C001 Northern Trunk', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Clear path guaranteed with 25-minute isolation buffer.' }
      ]
    },
    {
      daysAgo: 22,
      date: '2026-08-14',
      events: [
        // Warning Day: 96.4%
        { time: '13:10:00Z', user: 'Signal Telemetry Monitor', role: 'ST_OFFICER' as const, action: 'Axle Counter Thermal Drift Warning', object: 'C003 Axle Counter DAC-14', status: 'WARNING' as const, severity: 'WARNING' as const, category: 'SIGNALING', details: 'Ambient temperature reached 43°C; oscillator circuit drift warning generated.' },
        { time: '14:05:00Z', user: 'Signal Inspector Joshi', role: 'ST_OFFICER' as const, action: 'Cooling Shroud Installed & Re-calibrated', object: 'DAC-14 (C003)', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SIGNALING', details: 'Signal integrity restored to 100%.' }
      ]
    },
    {
      daysAgo: 23,
      date: '2026-08-13',
      events: [
        { time: '04:30:00Z', user: 'TRD Power Controller', role: 'ENGINEERING_OFFICER' as const, action: 'OHE Section Isolator Switch Inspection', object: 'C001 Sector 1', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACTION_OHE', details: 'Contact resistance verified below 15 micro-ohms.' },
        { time: '17:40:00Z', user: 'AI Planning Engine', role: 'SUPER_ADMIN' as const, action: 'Optimization Batch Execution', object: '34 Maintenance Requests', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Total maintenance window allocation: 8.4 hours.' }
      ]
    },
    {
      daysAgo: 24,
      date: '2026-08-12',
      events: [
        { time: '08:15:00Z', user: 'Track Inspector Yadav', role: 'ENGINEERING_OFFICER' as const, action: 'Bridge Scour & Pier Foundation Audit', object: 'Major River Bridge BR-08', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'TRACK_INSPECTION', details: 'Sonar scour measurement shows no erosion beyond safe limit.' },
        { time: '15:50:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Seven-Point Gate Inspection', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'All safety constraints satisfied.' }
      ]
    },
    {
      daysAgo: 25,
      date: '2026-08-11',
      events: [
        { time: '06:05:00Z', user: 'Signal Team North', role: 'ST_OFFICER' as const, action: 'Automatic Block Signaling Lamp Voltage', object: 'C004 ABS Sector', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'SIGNALING', details: 'Secondary filament circuit auto-switch tested.' },
        { time: '14:20:00Z', user: 'Smt. Ananya Sen', role: 'RAILWAY_PLANNER' as const, action: 'Heuristic Slack Tuning', object: 'C002 Western Spur', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: 'Peak hour buffer tightened without passenger delay.' }
      ]
    },
    {
      daysAgo: 26,
      date: '2026-08-10',
      events: [
        { time: '03:50:00Z', user: 'Track Machine Pilot', role: 'ENGINEERING_OFFICER' as const, action: 'Dynamic Track Stabilizer Run', object: 'DGS-62 (C001)', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'MAINTENANCE_EXECUTION', details: 'Consolidation equivalent to 100,000 tonnes of traffic achieved.' },
        { time: '18:15:00Z', user: 'AI Conflict Engine', role: 'SUPER_ADMIN' as const, action: 'Multi-Asset Overlap Prevention', object: 'C003 Freight Corridor', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'CONFLICT_RESOLUTION', details: 'Prevented concurrent possession by tamper and OHE car.' }
      ]
    },
    {
      daysAgo: 27,
      date: '2026-08-09',
      events: [
        { time: '07:30:00Z', user: 'P-Way In-Charge', role: 'ENGINEERING_OFFICER' as const, action: 'Creep Indicator Observation', object: 'C001 KM 15/0', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACK_INSPECTION', details: 'Creep within acceptable limit (<20mm).' },
        { time: '16:00:00Z', user: 'Safety Gate Automation', role: 'SUPER_ADMIN' as const, action: 'Corridor Safety Health Check', object: 'All Corridors', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Interlocking state verified nominal.' }
      ]
    },
    {
      daysAgo: 28,
      date: '2026-08-08',
      events: [
        { time: '05:15:00Z', user: 'TRD Section Engineer', role: 'ENGINEERING_OFFICER' as const, action: 'Cantilever Assembly Insulation Inspection', object: 'C004 Express Spur', status: 'SUCCESS' as const, severity: 'NORMAL' as const, category: 'TRACTION_OHE', details: '9-ton insulator resistance > 500 Megohms.' },
        { time: '13:45:00Z', user: 'AI Planning Engine', role: 'RAILWAY_PLANNER' as const, action: 'Initial Monthly Planning Run', object: 'Schedule Publication Gate', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'OPTIMIZATION', details: '30-day master maintenance forecast scheduled.' }
      ]
    },
    {
      daysAgo: 29,
      date: '2026-08-07',
      events: [
        { time: '06:00:00Z', user: 'Er. Rajesh Verma', role: 'ENGINEERING_OFFICER' as const, action: 'Ultrasonic Axle Counter Base Calibration', object: 'C001, C002, C003', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SIGNALING', details: 'Master benchmark synchronized across all station loops.' },
        { time: '11:20:00Z', user: 'Safety Directorate Team', role: 'SUPER_ADMIN' as const, action: '30-Day Safety Protocol Kickoff', object: 'Network-Wide Safety Gate', status: 'SUCCESS' as const, severity: 'SUCCESS' as const, category: 'SAFETY_GATE', details: 'Audit baseline established under Indian Railways G&SR and IRTMM protocols.' }
      ]
    }
  ];

  const historicalLogs: AuditLog[] = [];
  historicalDaysSpec.forEach((daySpec, dIdx) => {
    daySpec.events.forEach((ev, eIdx) => {
      historicalLogs.push({
        id: `AUD-H-${(dIdx + 1).toString().padStart(2, '0')}-${(eIdx + 1).toString().padStart(2, '0')}`,
        timestamp: `${daySpec.date}T${ev.time}`,
        user: ev.user,
        role: ev.role,
        action: ev.action,
        object: ev.object,
        status: ev.status,
        severity: ev.severity,
        category: ev.category,
        details: ev.details,
      });
    });
  });

  return [...currentLogs, ...historicalLogs];
};

export const INITIAL_AUDIT_LOGS: AuditLog[] = generateHistoricalAuditLogs();

// ============================================================================
// RAILWAY RESOURCE ALLOCATION FLEET: MACHINERY & MANPOWER
// ============================================================================

export const INITIAL_MACHINERY_RESOURCES: MachineryResource[] = [
  // C001 - Northern Main Trunk
  {
    id: 'CSM-09-3X-401',
    name: 'Plasser 09-3X Dynamic Continuous Tamping Machine',
    model: '09-3X Continuous Action 3-Sleeper Tamper',
    type: 'TAMPING_MACHINE',
    corridorId: 'C001',
    status: 'DEPLOYED',
    operatorName: 'S. K. Chaurasia (Sr. Machine Operator)',
    fuelLevelPct: 88,
    healthIndex: 94,
    assignedBlockId: 'BLK-C001-01',
    currentSection: 'KM 12/4 to 16/8 UP Line',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 80,
  },
  {
    id: 'BRM-204',
    name: 'Plasser Quick Ballast Regulating Machine',
    model: 'BRM-2000 Profile Shaper & Broom',
    type: 'BALLAST_REGULATOR',
    corridorId: 'C001',
    status: 'DEPLOYED',
    operatorName: 'Mahendra Yadav (TMD Pilot)',
    fuelLevelPct: 76,
    healthIndex: 89,
    assignedBlockId: 'BLK-C001-01',
    currentSection: 'KM 14/0 to 18/2 UP Line',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 65,
  },
  {
    id: 'RUPS-OHE-08',
    name: '8-Wheeler Self-Propelled OHE Inspection Car / Tower Wagon',
    model: 'DETC-8W Hydraulic Cantilever Platform',
    type: 'TOWER_WAGON',
    corridorId: 'C001',
    status: 'DEPLOYED',
    operatorName: 'D. N. Mishra (Loco Pilot TRD)',
    fuelLevelPct: 92,
    healthIndex: 96,
    assignedBlockId: 'BLK-C001-02',
    currentSection: 'KM 08/0 to 11/6 Both Lines',
    homeDepot: 'Ghaziabad Electric Loco Shed',
    speedLimitKmph: 100,
  },

  // C002 - Southern High-Speed Spur
  {
    id: 'RUPS-OHE-12',
    name: '4-Wheeler High-Speed OHE Wiring & Inspection Wagon',
    model: 'RUPS-4W Overhead Cantilever Wagon',
    type: 'TOWER_WAGON',
    corridorId: 'C002',
    status: 'DEPLOYED',
    operatorName: 'G. Parthasarathy (TRD Pilot)',
    fuelLevelPct: 82,
    healthIndex: 91,
    assignedBlockId: 'BLK-C002-01',
    currentSection: 'KM 05/2 to 12/0 Down Line',
    homeDepot: 'Faridabad Traction Substation',
    speedLimitKmph: 90,
  },
  {
    id: 'USFD-31',
    name: 'Continuous Ultrasonic Rail Flaw Detection (USFD) Car',
    model: 'Sperry Digital Multi-Probe USFD System',
    type: 'USFD_CAR',
    corridorId: 'C002',
    status: 'DEPLOYED',
    operatorName: 'Praveen Tiwari (USFD Sr. Inspector)',
    fuelLevelPct: 95,
    healthIndex: 98,
    assignedBlockId: 'BLK-C002-02',
    currentSection: 'KM 18/0 to 24/5 High-Speed Section',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 70,
  },

  // C003 - Western Heavy Freight & Passenger (Critical Heavy Workload)
  {
    id: 'CSM-09-3X-402',
    name: '09-32 CSM Heavy Duty Continuous Tie Tamper',
    model: 'Plasser Duomatic 09-32 Continuous Tamper',
    type: 'TAMPING_MACHINE',
    corridorId: 'C003',
    status: 'DEPLOYED',
    operatorName: 'Satish Kumar (Master Operator)',
    fuelLevelPct: 68,
    healthIndex: 82,
    assignedBlockId: 'BLK-C003-01',
    currentSection: 'KM 22/0 to 28/4 Western Freight Line',
    homeDepot: 'Rohtak Marshalling TMD',
    speedLimitKmph: 75,
  },
  {
    id: 'BRM-205',
    name: 'Heavy Duty Ballast Regulator & Equalizer',
    model: 'Kershaw Heavy Ballast Regulator Model 46',
    type: 'BALLAST_REGULATOR',
    corridorId: 'C003',
    status: 'DEPLOYED',
    operatorName: 'Jagdish Meena (Operator)',
    fuelLevelPct: 70,
    healthIndex: 84,
    assignedBlockId: 'BLK-C003-01',
    currentSection: 'KM 24/0 to 30/0 Western Line',
    homeDepot: 'Rohtak Marshalling TMD',
    speedLimitKmph: 60,
  },
  {
    id: 'DTS-108',
    name: 'Dynamic Track Stabilizer Machine',
    model: 'Plasser DGS 62-N Track Stabilizer',
    type: 'TRACK_STABILIZER',
    corridorId: 'C003',
    status: 'DEPLOYED',
    operatorName: 'V. Ramanathan (TMD Technician)',
    fuelLevelPct: 85,
    healthIndex: 92,
    assignedBlockId: 'BLK-C003-02',
    currentSection: 'KM 21/5 to 26/0 Track Settling Area',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 80,
  },
  {
    id: 'RUPS-OHE-10',
    name: 'Heavy Duty Traction Tower Wagon',
    model: 'DETC-8W High-Lift OHE Platform',
    type: 'TOWER_WAGON',
    corridorId: 'C003',
    status: 'DEPLOYED',
    operatorName: 'M. K. Joshi (TRD Loco Pilot)',
    fuelLevelPct: 62,
    healthIndex: 78,
    assignedBlockId: 'BLK-C003-03',
    currentSection: 'KM 14/0 to 20/0 Freight Lead',
    homeDepot: 'Rohtak Marshalling TMD',
    speedLimitKmph: 85,
  },

  // C004 - Eastern Mixed Express Link
  {
    id: 'RGM-96',
    name: 'Loram 72-Stone Heavy Rail Grinding Machine (RGM)',
    model: 'Loram RG-400 Series Switch & Rail Grinder',
    type: 'RAIL_GRINDER',
    corridorId: 'C004',
    status: 'DEPLOYED',
    operatorName: 'Captain A. R. Dixit (RGM In-Charge)',
    fuelLevelPct: 81,
    healthIndex: 90,
    assignedBlockId: 'BLK-C004-01',
    currentSection: 'KM 42/0 to 48/6 UP Main',
    homeDepot: 'Moradabad Heavy Machine Siding',
    speedLimitKmph: 70,
  },
  {
    id: 'RUPS-OHE-14',
    name: '8-Wheeler TRD Tower Car with Pantograph Testing Mast',
    model: 'DETC-8W Testing Platform',
    type: 'TOWER_WAGON',
    corridorId: 'C004',
    status: 'DEPLOYED',
    operatorName: 'K. L. Sharma (Senior Section Engineer TRD)',
    fuelLevelPct: 74,
    healthIndex: 86,
    assignedBlockId: 'BLK-C004-02',
    currentSection: 'KM 30/2 to 38/0 Electrified Trunk',
    homeDepot: 'Moradabad Heavy Machine Siding',
    speedLimitKmph: 95,
  },
  {
    id: 'BRM-208',
    name: 'Secondary Ballast Profiler & Broom',
    model: 'BRM-100 Compact Profiler',
    type: 'BALLAST_REGULATOR',
    corridorId: 'C004',
    status: 'DEPLOYED',
    operatorName: 'N. K. Pandey (Operator)',
    fuelLevelPct: 84,
    healthIndex: 92,
    assignedBlockId: 'BLK-C004-01',
    currentSection: 'KM 40/0 to 45/0 Moradabad Section',
    homeDepot: 'Moradabad Heavy Machine Siding',
    speedLimitKmph: 65,
  },

  // Standby & Reserve Units (Central Base Track Machine Depot)
  {
    id: 'CSM-RESERVE-03',
    name: 'Standby Duomatic Tie Tamping Machine (Emergency Reserve)',
    model: 'Plasser Duomatic 08-32 Tamping Machine',
    type: 'TAMPING_MACHINE',
    corridorId: 'CENTRAL_DEPOT',
    status: 'STANDBY_RESERVE',
    operatorName: 'Reserve Crew Alpha (Ready on 30m Callout)',
    fuelLevelPct: 100,
    healthIndex: 98,
    currentSection: 'Central TMD Holding Siding Bay 2',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 75,
  },
  {
    id: 'RUPS-RESERVE-04',
    name: 'Standby 8-Wheeler TRD Tower Wagon (Accident Relief / OHE Breakdown)',
    model: 'DETC-8W Breakdown Special',
    type: 'TOWER_WAGON',
    corridorId: 'CENTRAL_DEPOT',
    status: 'STANDBY_RESERVE',
    operatorName: 'TRD Emergency Reaction Team Beta',
    fuelLevelPct: 100,
    healthIndex: 100,
    currentSection: 'Central Junction Emergency Siding',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 105,
  },
  {
    id: 'BRM-RESERVE-01',
    name: 'Standby Ballast Regulator Unit 01',
    model: 'BRM-2000 Quick Shaper',
    type: 'BALLAST_REGULATOR',
    corridorId: 'CENTRAL_DEPOT',
    status: 'STANDBY_RESERVE',
    operatorName: 'Standby Crew Gamma',
    fuelLevelPct: 95,
    healthIndex: 94,
    currentSection: 'Central TMD Bay 4',
    homeDepot: 'Central Base Track Machine Depot (C-TMD)',
    speedLimitKmph: 65,
  },
];

export const INITIAL_MANPOWER_GANGS: ManpowerGang[] = [
  // C001 - Northern Main Trunk
  {
    id: 'GANG-ENG-C01-A',
    name: 'PWI Unit 01 Main Line Heavy Maintenance Gang',
    corridorId: 'C001',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 24,
    supervisor: 'PWI Ramesh Chand (Senior Section Engineer Track)',
    assignedSection: 'KM 10/0 to 18/0 UP Trunk',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Hydraulic Rail Jacks, Heavy Rail Tensor, Flash Butt Welder',
  },
  {
    id: 'GANG-ENG-C01-B',
    name: 'PWI Unit 02 Sleeper & Fastening Renewal Crew',
    corridorId: 'C001',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 18,
    supervisor: 'PWI Rajesh Gaur',
    assignedSection: 'KM 04/0 to 10/0 Both Lines',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Pandrol Clip Pushers, Torque Wrenches, Portable Generator',
  },
  {
    id: 'GANG-SNT-C01',
    name: 'S&T Point Machine & Electronic Interlocking Team',
    corridorId: 'C001',
    department: 'S&T',
    trade: 'SIGNAL_TELECOM',
    headcount: 12,
    supervisor: 'DSTE Alok Srivastava',
    assignedSection: 'Central Junction Interlocking Yard',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Digital Multimeters, Relay Test Kits, Point Lubricators',
  },
  {
    id: 'GANG-TRC-C01',
    name: 'TRD 25kV OHE Tensioning & Section Insulator Crew',
    corridorId: 'C001',
    department: 'TRACTION',
    trade: 'TRACTION_OHE',
    headcount: 14,
    supervisor: 'SSE/TRD Mohan Das',
    assignedSection: 'TSS Sector C001-A',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Tirfor Pullers, Earthing Discharge Rods, Wire Straining Kits',
  },
  {
    id: 'GANG-SFT-C01',
    name: 'Safety Marshals, Lookout Flagmen & Fog Signal Detonator Unit',
    corridorId: 'C001',
    department: 'SAFETY',
    trade: 'SAFETY_LOOKOUT',
    headcount: 8,
    supervisor: 'Safety Warden B. K. Gupta',
    assignedSection: 'Perimeter of KM 10/0 to 18/0 UP Trunk',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'High-Decibel Klaxons, Red Hand Signal Flags, Detonator Boxes, LED Flasher Lamps',
  },

  // C002 - Southern High-Speed Spur
  {
    id: 'GANG-ENG-C02',
    name: 'PWI High-Speed Track Alignment & USFD Verification Gang',
    corridorId: 'C002',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 20,
    supervisor: 'PWI Tarun Sengupta',
    assignedSection: 'KM 12/0 to 26/0 Curve Section',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Optical Versine Gauges, Electronic Track Level Cross-Level Recorders',
  },
  {
    id: 'GANG-SNT-C02',
    name: 'Kavach Automatic Train Protection & Radio Unit',
    corridorId: 'C002',
    department: 'S&T',
    trade: 'SIGNAL_TELECOM',
    headcount: 10,
    supervisor: 'SSE/Signal Rohit Saxena',
    assignedSection: 'Faridabad Cantt Block Section',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'RFID Balise Calibrators, VHF Radio Field Analyzers',
  },
  {
    id: 'GANG-TRC-C02',
    name: 'High-Speed Contact Wire Sag & Stagger Correction Crew',
    corridorId: 'C002',
    department: 'TRACTION',
    trade: 'TRACTION_OHE',
    headcount: 12,
    supervisor: 'SSE/TRD Suresh Menon',
    assignedSection: 'KM 05/0 to 18/0 High-Speed Catenary',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Laser Height Gauges, Dynamic Sag Meters',
  },
  {
    id: 'GANG-SFT-C02',
    name: 'High-Speed Curve Safety Lookouts',
    corridorId: 'C002',
    department: 'SAFETY',
    trade: 'SAFETY_LOOKOUT',
    headcount: 6,
    supervisor: 'Head Lookout Maninder Singh',
    assignedSection: 'KM 14/0 to 22/0 C-Curve Lookout',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Walkie-Talkie Channel 4, Remote Caution Horns, Safety Whistles',
  },

  // C003 - Western Heavy Freight & Passenger
  {
    id: 'GANG-ENG-C03-A',
    name: 'PWI Heavy Freight Track Deep Screening Gang',
    corridorId: 'C003',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 32,
    supervisor: 'PWI Devendra Prasad (Sr. DEN Western)',
    assignedSection: 'KM 20/0 to 34/0 Heavy Axle Track',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Ballast Tampers, Heavy Lifting Jacks, Rail Shifting Rollers',
  },
  {
    id: 'GANG-ENG-C03-B',
    name: 'Turnout & Diamond Crossing Overhaul Gang',
    corridorId: 'C003',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 22,
    supervisor: 'PWI C. L. Bansal',
    assignedSection: 'Rohtak Yard Approaches',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Crossing Gauge Rulers, CMS Point Grinding Tools',
  },
  {
    id: 'GANG-SNT-C03',
    name: 'Western Automatic Block Signaling Maintenance Squad',
    corridorId: 'C003',
    department: 'S&T',
    trade: 'SIGNAL_TELECOM',
    headcount: 14,
    supervisor: 'SSE/Signal Anand Swaroop',
    assignedSection: 'KM 15/0 to 35/0 Block Cabins',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Track Circuit Drop Testers, Insulated Joint Replacements',
  },
  {
    id: 'GANG-TRC-C03',
    name: 'Western Feeder Heavy Catenary Inspection Team',
    corridorId: 'C003',
    department: 'TRACTION',
    trade: 'TRACTION_OHE',
    headcount: 16,
    supervisor: 'SSE/TRD Nitin Gadkari (Traction)',
    assignedSection: 'KM 12/0 to 28/0 OHE Line',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Heavy Catenary Tension Pullers, Contact Dropper Jigs',
  },
  {
    id: 'GANG-SFT-C03',
    name: 'Heavy Freight Corridor Safety Marshall Unit',
    corridorId: 'C003',
    department: 'SAFETY',
    trade: 'SAFETY_LOOKOUT',
    headcount: 10,
    supervisor: 'Safety Marshal Pradeep Rawat',
    assignedSection: 'KM 20/0 to 34/0 Corridor Flank',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Portable Banner Flags, Signal Flare Kits, Audible Warning Sirens',
  },

  // C004 - Eastern Mixed Express Link
  {
    id: 'GANG-ENG-C04',
    name: 'PWI Mixed Traffic Rail Renewal & Grinding Support Gang',
    corridorId: 'C004',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 26,
    supervisor: 'PWI H. S. Rawat',
    assignedSection: 'KM 36/0 to 52/0 Moradabad Link',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Rail Temperature Gauges, Thermit Welding Pre-heaters, Rail Clamps',
  },
  {
    id: 'GANG-SNT-C04',
    name: 'Eastern Optical Fiber & Axle Counter Squad',
    corridorId: 'C004',
    department: 'S&T',
    trade: 'SIGNAL_TELECOM',
    headcount: 12,
    supervisor: 'DSTE K. G. Bhatia',
    assignedSection: 'KM 30/0 to 45/0 Track Detectors',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'OTDR Fiber Testers, Wheel Sensor Calibration Units',
  },
  {
    id: 'GANG-TRC-C04',
    name: 'Eastern Feeder OHE Catenary Wire Splicing Crew',
    corridorId: 'C004',
    department: 'TRACTION',
    trade: 'TRACTION_OHE',
    headcount: 14,
    supervisor: 'SSE/TRD R. P. Singh',
    assignedSection: 'KM 32/0 to 50/0 Trunk Line',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Copper Wire Splicing Sleeves, Hydraulic Crimping Tools',
  },
  {
    id: 'GANG-SFT-C04',
    name: 'Eastern Trunk Line Lookouts & Banner Flag Gang',
    corridorId: 'C004',
    department: 'SAFETY',
    trade: 'SAFETY_LOOKOUT',
    headcount: 8,
    supervisor: 'Lookout Chief Sunil Dutt',
    assignedSection: 'KM 36/0 to 52/0 Warning Zone',
    status: 'ACTIVE_ON_TRACK',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'High-Visibility Day-Glo Vests, Air Horns, Stop Flags',
  },

  // Central Standby Reserve (Headquarters Base)
  {
    id: 'GANG-RESERVE-ENG-01',
    name: 'Divisional Mobile Emergency Track Gang Alpha',
    corridorId: 'CENTRAL_DEPOT',
    department: 'ENGINEERING',
    trade: 'TRACK_MAINTENANCE',
    headcount: 20,
    supervisor: 'Emergency PWI O. P. Verma',
    assignedSection: 'Central Base Reserve Siding (Standby on 20 min notice)',
    status: 'STANDBY',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Mobile Rail Saw, Power Track Drill, Emergency Fishplates',
  },
  {
    id: 'GANG-RESERVE-SNT-01',
    name: 'Central S&T Incident Response Team',
    corridorId: 'CENTRAL_DEPOT',
    department: 'S&T',
    trade: 'SIGNAL_TELECOM',
    headcount: 8,
    supervisor: 'SSE/Signal Standby Lead Deepak Joshi',
    assignedSection: 'Central Signaling Workshop',
    status: 'STANDBY',
    shift: 'DAY_SHIFT',
    safetyBriefingCompleted: true,
    equippedWith: 'Emergency Cable Jointers, Spares Kits',
  },
];

export function calculateCorridorResourceMetrics(
  corridors: Corridor[],
  machinery: MachineryResource[],
  gangs: ManpowerGang[],
  shift: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK' = 'DAY_SHIFT'
): CorridorResourceMetrics[] {
  // Shift multipliers for capacity planning
  // Day shift: standard capacity
  // Afternoon shift: lower machine slot capacity due to passenger peak
  // Night mega block: maximum machine headroom (heavy window)
  const capacityMultipliers = {
    DAY_SHIFT: { manpower: 1.0, machinery: 1.0 },
    AFTERNOON_SHIFT: { manpower: 0.85, machinery: 0.75 },
    NIGHT_MEGA_BLOCK: { manpower: 1.3, machinery: 1.6 },
  };

  const mult = capacityMultipliers[shift];

  // Base corridor capacity configuration
  const baseCapacities: Record<string, { manpower: number; machinery: number; supervisor: string }> = {
    C001: { manpower: 80, machinery: 4, supervisor: 'Sr. DEN Track Ramesh Verma' },
    C002: { manpower: 55, machinery: 3, supervisor: 'Sr. DEN South Tarun Sengupta' },
    C003: { manpower: 95, machinery: 4, supervisor: 'Sr. DEN West Devendra Prasad' },
    C004: { manpower: 65, machinery: 3, supervisor: 'Sr. DEN East H. S. Rawat' },
  };

  return corridors.map((corridor) => {
    const corridorId = corridor.id;
    const base = baseCapacities[corridorId] || { manpower: 60, machinery: 3, supervisor: 'Divisional Section Engineer' };

    const corridorGangs = gangs.filter((g) => g.corridorId === corridorId);
    const corridorMachines = machinery.filter((m) => m.corridorId === corridorId && m.status === 'DEPLOYED');

    // Manpower breakdown
    const trackGangsHeadcount = corridorGangs
      .filter((g) => g.trade === 'TRACK_MAINTENANCE')
      .reduce((acc, g) => acc + g.headcount, 0);

    const signalTechsHeadcount = corridorGangs
      .filter((g) => g.trade === 'SIGNAL_TELECOM')
      .reduce((acc, g) => acc + g.headcount, 0);

    const oheLinesmenHeadcount = corridorGangs
      .filter((g) => g.trade === 'TRACTION_OHE')
      .reduce((acc, g) => acc + g.headcount, 0);

    const safetyLookoutsHeadcount = corridorGangs
      .filter((g) => g.trade === 'SAFETY_LOOKOUT')
      .reduce((acc, g) => acc + g.headcount, 0);

    const totalManpowerAllocated = trackGangsHeadcount + signalTechsHeadcount + oheLinesmenHeadcount + safetyLookoutsHeadcount;
    const manpowerCapacity = Math.round(base.manpower * mult.manpower);

    // Machinery breakdown
    const tampingMachines = corridorMachines.filter((m) => m.type === 'TAMPING_MACHINE').length;
    const ballastRegulators = corridorMachines.filter((m) => m.type === 'BALLAST_REGULATOR').length;
    const towerWagons = corridorMachines.filter((m) => m.type === 'TOWER_WAGON').length;
    const railGrinders = corridorMachines.filter((m) => m.type === 'RAIL_GRINDER' || m.type === 'USFD_CAR').length;
    const trackStabilizers = corridorMachines.filter((m) => m.type === 'TRACK_STABILIZER').length;

    const totalMachineryAllocated = corridorMachines.length;
    const machineryCapacity = Math.max(1, Math.round(base.machinery * mult.machinery));

    // Calculate blended utilization percentage
    const manpowerRatio = manpowerCapacity > 0 ? (totalManpowerAllocated / manpowerCapacity) * 100 : 0;
    const machineryRatio = machineryCapacity > 0 ? (totalMachineryAllocated / machineryCapacity) * 100 : 0;
    const utilizationPct = Math.round((manpowerRatio * 0.45 + machineryRatio * 0.55));

    // Bottlenecks & Load Status
    const bottleneckWarnings: string[] = [];
    let loadStatus: 'UNDER_UTILIZED' | 'BALANCED' | 'NEAR_CAPACITY' | 'OVER_CAPACITY' = 'BALANCED';

    if (machineryRatio > 100) {
      bottleneckWarnings.push(`Machinery slots exceeded (${totalMachineryAllocated}/${machineryCapacity} machines). Risk of block overrun.`);
      loadStatus = 'OVER_CAPACITY';
    } else if (machineryRatio >= 90) {
      bottleneckWarnings.push(`High machine slot saturation (${totalMachineryAllocated}/${machineryCapacity}). Tight clearing window.`);
      loadStatus = 'NEAR_CAPACITY';
    }

    if (manpowerRatio > 105) {
      bottleneckWarnings.push(`Track gang crowd density high on ${corridor.tracksCount || 2}-track segment.`);
      loadStatus = 'OVER_CAPACITY';
    } else if (manpowerRatio < 60) {
      bottleneckWarnings.push(`Staffing below corridor target. Potential delay in maintenance completion.`);
      if (loadStatus !== 'OVER_CAPACITY') loadStatus = 'UNDER_UTILIZED';
    }

    // Check minimum safety lookout quota rule (at least 1 lookout per 10 trackmen)
    if (trackGangsHeadcount > 0 && safetyLookoutsHeadcount < Math.ceil(trackGangsHeadcount / 10)) {
      bottleneckWarnings.push(`Safety Rule Infraction: Insufficient safety lookouts (${safetyLookoutsHeadcount}) for ${trackGangsHeadcount} trackmen.`);
    }

    return {
      corridorId,
      corridorName: corridor.name,
      shortCode: corridor.code || corridor.id,
      lengthKm: corridor.lengthKm,
      tracksCount: corridor.tracksCount || 2,
      speedLimitKmph: corridor.speedLimitKmph || 120,
      trackGangsHeadcount,
      signalTechsHeadcount,
      oheLinesmenHeadcount,
      safetyLookoutsHeadcount,
      totalManpowerAllocated,
      manpowerCapacity,
      tampingMachines,
      ballastRegulators,
      towerWagons,
      railGrinders,
      trackStabilizers,
      totalMachineryAllocated,
      machineryCapacity,
      utilizationPct,
      loadStatus,
      bottleneckWarnings,
      activeMaintenanceBlocksCount: corridor.scheduledBlocks || 2,
      supervisorInCharge: base.supervisor,
    };
  });
}
