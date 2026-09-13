import { GeoCoordinates, AuditLog } from '../types';
import { CORRIDOR_MAP_CONFIGS } from '../components/common/DefectMapThumbnail';

export interface HistoricalMaintenanceIncident {
  id: string;
  auditLogId: string;
  timestamp: string;
  dateFormatted: string;
  corridorId: string;
  assetId: string;
  chainageKm: number;
  chainagePost: string;
  latitude: number;
  longitude: number;
  track: 'UP_MAIN' | 'DN_MAIN';
  department: 'ENGINEERING' | 'S&T' | 'TRACTION';
  issueType: string;
  defectSummary: string;
  maintenanceActionTaken: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'RESOLVED' | 'RESTORED' | 'VERIFIED';
  auditedBy: string;
  auditorRole: string;
  distanceMetersFromFix: number;
  speedRestrictionImposed?: string;
}

// Master audit log historical incident repository categorized by corridor and chainage km offsets
const HISTORICAL_AUDIT_INCIDENT_ARCHIVE: Omit<HistoricalMaintenanceIncident, 'distanceMetersFromFix' | 'latitude' | 'longitude'>[] = [
  // C001 - Northern Main Trunk (NDLS - GZB, base default 28.4 km)
  {
    id: 'INC-HIST-C01-01',
    auditLogId: 'AUD-HIST-089',
    timestamp: '2026-08-18T14:35:00Z',
    dateFormatted: '18 Aug 2026, 14:35',
    corridorId: 'C001',
    assetId: 'A004',
    chainageKm: 28.4,
    chainagePost: 'KM 28.4/4 Up Main',
    track: 'UP_MAIN',
    department: 'ENGINEERING',
    issueType: 'USFD Ultrasonic Railhead Transverse Fatigue Crack',
    defectSummary: 'Micro-crack of 12mm depth detected across rail gauge corner during Sperry rail testing.',
    maintenanceActionTaken: 'Emergency joggled fishplate bolted with C-clamps; 6m rail piece cropped and thermite welded. Ultrasonic re-test certified flaw-free.',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    auditedBy: 'Er. Rajesh Verma',
    auditorRole: 'Senior Section Engineer (P-Way / Safety)',
    speedRestrictionImposed: '30 km/h Caution Order (Revoked after thermite weld)',
  },
  {
    id: 'INC-HIST-C01-02',
    auditLogId: 'AUD-HIST-064',
    timestamp: '2026-07-29T11:10:00Z',
    dateFormatted: '29 Jul 2026, 11:10',
    corridorId: 'C001',
    assetId: 'A004',
    chainageKm: 28.1,
    chainagePost: 'KM 28.1/2 Dn Main',
    track: 'DN_MAIN',
    department: 'TRACTION',
    issueType: 'OHE Catenary Wire Dropper Snap & Sparking',
    defectSummary: 'Damaged bronze dropper resulted in 45mm contact wire sag and severe electrical arcing under pantograph.',
    maintenanceActionTaken: 'Tower wagon deployed during night power block. Dropper replaced with flexible copper wire; stagger verified at 200mm.',
    severity: 'HIGH',
    status: 'RESTORED',
    auditedBy: 'S. N. Tripathi',
    auditorRole: 'SSE (Traction Distribution / OHE)',
  },
  {
    id: 'INC-HIST-C01-03',
    auditLogId: 'AUD-HIST-041',
    timestamp: '2026-06-12T16:20:00Z',
    dateFormatted: '12 Jun 2026, 16:20',
    corridorId: 'C001',
    assetId: 'A005',
    chainageKm: 28.9,
    chainagePost: 'KM 28.9/6 Up Main',
    track: 'UP_MAIN',
    department: 'S&T',
    issueType: 'Track Circuit 28-UP Random Resistance Drift',
    defectSummary: 'False track occupancy triggered at automatic signal due to ballast moisture & rusted bonding wires.',
    maintenanceActionTaken: 'Channel pin bonded wire renewed; impedance bond oil filled and clean ballast packing restored.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    auditedBy: 'Vikram Joshi',
    auditorRole: 'Divisional Signal & Telecom Engineer (DSTE)',
  },
  {
    id: 'INC-HIST-C01-04',
    auditLogId: 'AUD-HIST-022',
    timestamp: '2026-05-04T08:50:00Z',
    dateFormatted: '04 May 2026, 08:50',
    corridorId: 'C001',
    assetId: 'A003',
    chainageKm: 27.6,
    chainagePost: 'KM 27.6/1 Up Main',
    track: 'UP_MAIN',
    department: 'ENGINEERING',
    issueType: 'Track Geometry Unevenness & Ballast Mud Pumping',
    defectSummary: 'Vertical settlement of 18mm recorded by Track Recording Car (TRC) following heavy monsoon seepage.',
    maintenanceActionTaken: 'Plasser 09-3X dynamic tamping machine completed 800m continuous tamping and ballast compaction.',
    severity: 'HIGH',
    status: 'VERIFIED',
    auditedBy: 'S. K. Chaurasia',
    auditorRole: 'Chief P-Way Inspector / Safety Auditor',
  },

  // C002 - Southern High-Speed Spur (NDLS - FDB, base default 18.2 km)
  {
    id: 'INC-HIST-C02-01',
    auditLogId: 'AUD-HIST-112',
    timestamp: '2026-08-25T10:15:00Z',
    dateFormatted: '25 Aug 2026, 10:15',
    corridorId: 'C002',
    assetId: 'A011',
    chainageKm: 18.2,
    chainagePost: 'KM 18.2/4 Up Main',
    track: 'UP_MAIN',
    department: 'S&T',
    issueType: 'Kavach Radio Infill Balise Telegram Signal Loss',
    defectSummary: 'Trackside RFID balise mounting bracket loosened by ballast vibration, causing Kavach ATP warning in Vande Bharat cab.',
    maintenanceActionTaken: 'Balise mounting torqued with anti-theft bolts; RF signal field level audited at -62 dBm.',
    severity: 'HIGH',
    status: 'VERIFIED',
    auditedBy: 'Er. Amit Khare',
    auditorRole: 'SSE / Kavach Telecommunications',
  },
  {
    id: 'INC-HIST-C02-02',
    auditLogId: 'AUD-HIST-098',
    timestamp: '2026-08-03T17:40:00Z',
    dateFormatted: '03 Aug 2026, 17:40',
    corridorId: 'C002',
    assetId: 'A010',
    chainageKm: 17.8,
    chainagePost: 'KM 17.8/1 Dn Main',
    track: 'DN_MAIN',
    department: 'ENGINEERING',
    issueType: 'Switch Expansion Joint (SEJ) Gap Beyond Tolerance',
    defectSummary: 'High ambient summer temperature pushed rail thermal expansion gap to 110mm (permissible max 85mm).',
    maintenanceActionTaken: 'De-stressing operations conducted at night with tensor; sleeper fastenings re-anchored over 1.2km.',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    auditedBy: 'Smt. Preeti Mishra',
    auditorRole: 'Assistant Divisional Engineer (ADEN)',
    speedRestrictionImposed: '50 km/h Caution Order for 24 hours',
  },
  {
    id: 'INC-HIST-C02-03',
    auditLogId: 'AUD-HIST-071',
    timestamp: '2026-07-11T13:05:00Z',
    dateFormatted: '11 Jul 2026, 13:05',
    corridorId: 'C002',
    assetId: 'A012',
    chainageKm: 18.7,
    chainagePost: 'KM 18.7/3 Up Main',
    track: 'UP_MAIN',
    department: 'TRACTION',
    issueType: '25kV OHE Isolator Switch Contact Burn',
    defectSummary: 'High contact resistance during peak freight draft causing thermal discoloring on sub-station feeder switch.',
    maintenanceActionTaken: 'Copper finger contacts silver-plated and lubricated with conductive grease; thermovision re-scan cleared.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    auditedBy: 'M. P. Sharma',
    auditorRole: 'SSE (Traction Substation)',
  },

  // C003 - Western Heavy Freight & Passenger (NDLS - ROK, base default 32.6 km)
  {
    id: 'INC-HIST-C03-01',
    auditLogId: 'AUD-HIST-130',
    timestamp: '2026-09-01T07:15:00Z',
    dateFormatted: '01 Sep 2026, 07:15',
    corridorId: 'C003',
    assetId: 'A018',
    chainageKm: 32.6,
    chainagePost: 'KM 32.6/4 Up Main',
    track: 'UP_MAIN',
    department: 'ENGINEERING',
    issueType: 'Ballast Caking & Severe Track Cushion Settlement',
    defectSummary: 'Heavy axle load coal freight trains caused ballast breakdown and fine slurry accumulation over 600m track segment.',
    maintenanceActionTaken: 'Ballast Cleaning Machine (BCM-350) completed deep screening; 450 cu.m fresh granite ballast discharged and tamped.',
    severity: 'HIGH',
    status: 'VERIFIED',
    auditedBy: 'Er. Rajesh Verma',
    auditorRole: 'Senior Section Engineer (Civil P-Way)',
  },
  {
    id: 'INC-HIST-C03-02',
    auditLogId: 'AUD-HIST-082',
    timestamp: '2026-07-22T19:30:00Z',
    dateFormatted: '22 Jul 2026, 19:30',
    corridorId: 'C003',
    assetId: 'A019',
    chainageKm: 33.1,
    chainagePost: 'KM 33.1/2 Dn Main',
    track: 'DN_MAIN',
    department: 'S&T',
    issueType: 'Dual Axle Counter Head Wheel Count Mismatch',
    defectSummary: 'Intermittent magnetic flux interference from loose steel binding wire caused section fail-to-danger lock.',
    maintenanceActionTaken: 'Axle counter sensor coil realigned to 1.5mm rail flange clearance; reset verified through test trolley run.',
    severity: 'HIGH',
    status: 'RESOLVED',
    auditedBy: 'Vikram Joshi',
    auditorRole: 'DSTE Signal Maintenance',
  },
  {
    id: 'INC-HIST-C03-03',
    auditLogId: 'AUD-HIST-059',
    timestamp: '2026-06-30T15:45:00Z',
    dateFormatted: '30 Jun 2026, 15:45',
    corridorId: 'C003',
    assetId: 'A017',
    chainageKm: 31.9,
    chainagePost: 'KM 31.9/5 Up Main',
    track: 'UP_MAIN',
    department: 'TRACTION',
    issueType: 'Anti-Creep OHE Wire Clamp Slip',
    defectSummary: 'Slippage of 28mm observed on span anchor mast 32/12 following heavy gust winds.',
    maintenanceActionTaken: 'Clamp replaced with high-tensile stainless steel fastener; tension balance weights recalibrated.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    auditedBy: 'K. R. Nair',
    auditorRole: 'SSE (Traction Catenary)',
  },

  // C004 - Eastern Dedicated Freight Feeder (NDLS - PWL, base default 22.8 km & KM 28/4)
  {
    id: 'INC-HIST-C04-01',
    auditLogId: 'AUD-HIST-145',
    timestamp: '2026-08-30T11:20:00Z',
    dateFormatted: '30 Aug 2026, 11:20',
    corridorId: 'C004',
    assetId: 'A023',
    chainageKm: 28.4,
    chainagePost: 'KM 28.4/4 Up Main',
    track: 'UP_MAIN',
    department: 'S&T',
    issueType: 'Automatic Block Signaling (ABS) Aspect Lamp Fluctuation',
    defectSummary: 'Oscillating power supply on signal 42-UP. Relay chatter observed during peak transit loads.',
    maintenanceActionTaken: 'Step-down transformer replaced; LED lamp unit resistance balanced to 110V AC steady state.',
    severity: 'HIGH',
    status: 'RESOLVED',
    auditedBy: 'Vikram Joshi',
    auditorRole: 'Divisional Signal & Telecom Engineer (DSTE)',
  },
  {
    id: 'INC-HIST-C04-02',
    auditLogId: 'AUD-HIST-124',
    timestamp: '2026-08-14T09:10:00Z',
    dateFormatted: '14 Aug 2026, 09:10',
    corridorId: 'C004',
    assetId: 'A023',
    chainageKm: 28.5,
    chainagePost: 'KM 28.5/2 Dn Main',
    track: 'DN_MAIN',
    department: 'ENGINEERING',
    issueType: 'Turnout Point Machine 114-B Stalling & Gauge Spreading',
    defectSummary: 'Point drive rod obstruction due to ballast gravel trapped in switch rail housing. Locking current 6.2A (overload).',
    maintenanceActionTaken: 'Foreign debris cleared; slide chairs lubricated with graphite; split pin and lock bar checked.',
    severity: 'CRITICAL',
    status: 'VERIFIED',
    auditedBy: 'Er. Rajesh Verma',
    auditorRole: 'Safety Auditor (Commissioner of Railway Safety Team)',
    speedRestrictionImposed: '15 km/h over turnout point',
  },
  {
    id: 'INC-HIST-C04-03',
    auditLogId: 'AUD-HIST-091',
    timestamp: '2026-07-19T14:00:00Z',
    dateFormatted: '19 Jul 2026, 14:00',
    corridorId: 'C004',
    assetId: 'A024',
    chainageKm: 28.1,
    chainagePost: 'KM 28.1/1 Up Main',
    track: 'UP_MAIN',
    department: 'TRACTION',
    issueType: 'Cantilever Insulator Flashover & Carbon Deposit',
    defectSummary: 'Industrial dust and moisture pollution triggered flashover on 25kV porcelain cantilever insulator.',
    maintenanceActionTaken: 'Replaced with 1050mm creepage silicone composite insulator with anti-fog sheds. Spark test normal.',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    auditedBy: 'S. N. Tripathi',
    auditorRole: 'SSE (Traction OHE In-Charge)',
  },
  {
    id: 'INC-HIST-C04-04',
    auditLogId: 'AUD-HIST-068',
    timestamp: '2026-06-25T18:40:00Z',
    dateFormatted: '25 Jun 2026, 18:40',
    corridorId: 'C004',
    assetId: 'A022',
    chainageKm: 22.8,
    chainagePost: 'KM 22.8/3 Up Main',
    track: 'UP_MAIN',
    department: 'ENGINEERING',
    issueType: 'Glued Insulated Rail Joint (GJ) End-Post Crushing',
    defectSummary: 'Fibreglass end post crushed by longitudinal rail creep, causing micro-short between track circuits.',
    maintenanceActionTaken: 'Prefabricated glued insulated joint replaced with 52kg 60E1 assembly during 2-hour traffic block.',
    severity: 'HIGH',
    status: 'VERIFIED',
    auditedBy: 'S. K. Chaurasia',
    auditorRole: 'Chief P-Way Inspector',
  },
];

/**
 * Computes geodetic coordinates for a specific chainage on a corridor
 */
export function calculateCoordinatesForKm(corridorId: string, km: number): { lat: number; lng: number } {
  const cfg = CORRIDOR_MAP_CONFIGS[corridorId] || {
    baseLat: 28.6448,
    baseLng: 77.225,
    latPerKm: 0.0035,
    lngPerKm: 0.0072,
    defaultKm: 28.4,
  };

  const deltaKm = km - cfg.defaultKm;
  const lat = Number((cfg.baseLat + deltaKm * cfg.latPerKm).toFixed(6));
  const lng = Number((cfg.baseLng + deltaKm * cfg.lngPerKm).toFixed(6));
  return { lat, lng };
}

/**
 * Retrieve historical maintenance incidents at or near the specified GPS location & track chainage from the audit logs
 */
export function getHistoricalIncidentsForLocation(
  corridorId: string,
  centerKm: number,
  geoCoordinates?: GeoCoordinates | null
): HistoricalMaintenanceIncident[] {
  // 1. Get incidents matching this corridor, or fallback to general corridor incidents
  let matches = HISTORICAL_AUDIT_INCIDENT_ARCHIVE.filter((inc) => inc.corridorId === corridorId);

  if (matches.length === 0) {
    matches = HISTORICAL_AUDIT_INCIDENT_ARCHIVE.slice(0, 4);
  }

  // 2. Map coordinates and calculate exact distance to current GPS / pinned fix
  const populated = matches.map((inc, index) => {
    const coords = calculateCoordinatesForKm(corridorId, inc.chainageKm);

    // Calculate distance in meters along the railway track
    const diffKm = Math.abs(inc.chainageKm - centerKm);
    const distanceMetersFromFix = Math.round(diffKm * 1000);

    return {
      ...inc,
      latitude: coords.lat,
      longitude: coords.lng,
      distanceMetersFromFix,
    };
  });

  // 3. Sort by proximity to current GPS location (closest first)
  populated.sort((a, b) => a.distanceMetersFromFix - b.distanceMetersFromFix);

  return populated;
}
