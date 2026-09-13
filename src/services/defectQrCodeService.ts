import QRCode from 'qrcode';
import { Defect, DepartmentType } from '../types';

export interface DefectSafetyProtocol {
  department: DepartmentType;
  title: string;
  irManualReference: string;
  mandatoryPpe: string[];
  mandatorySteps: {
    stepNumber: number;
    action: string;
    protocolDetail: string;
    criticalRule: boolean;
  }[];
  emergencyContacts: {
    role: string;
    contactChannel: string;
    authority: string;
  }[];
  warningNotice: string;
}

/**
 * Builds a universal deep link / inspection URL for a specific defect
 */
export function getDefectInspectionUrl(defectId: string): string {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    return `${origin}${pathname}?defectId=${encodeURIComponent(defectId)}#defect=${encodeURIComponent(defectId)}`;
  }
  return `https://railsync.indianrailways.gov.in/defects/inspect?defectId=${encodeURIComponent(defectId)}`;
}

/**
 * Generates a PNG Base64 Data URL for the defect QR code
 */
export async function generateDefectQrDataUrl(defectId: string): Promise<string> {
  const url = getDefectInspectionUrl(defectId);
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'H',
      margin: 2,
      scale: 8,
      color: {
        dark: '#020617', // slate-950
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR data URL:', err);
    throw err;
  }
}

/**
 * Generates an SVG string for the defect QR code
 */
export async function generateDefectQrSvg(defectId: string): Promise<string> {
  const url = getDefectInspectionUrl(defectId);
  try {
    return await QRCode.toString(url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Error generating QR SVG:', err);
    throw err;
  }
}

/**
 * Returns comprehensive, statutory Indian Railways safety protocols based on department and defect type
 */
export function getDepartmentSafetyProtocols(defect: Defect): DefectSafetyProtocol {
  const { department, speedRestrictionKmph, severity } = defect;

  switch (department) {
    case 'ENGINEERING':
      return {
        department: 'ENGINEERING',
        title: 'Permanent Way (P-Way) Track Protection & Rail Fracture Protocol',
        irManualReference: 'Indian Railways Permanent Way Manual (IRPWM) Chapter 6 & G&SR Rule 15.09',
        mandatoryPpe: [
          'High-Visibility Fluorescent Orange Retroreflective Jacket (Class 3)',
          'Hard Hat / Industrial Safety Helmet with Chin Strap (Yellow/White)',
          'Heavy-Duty Steel-Toe Ballast-Resistant Boots with Ankle Support',
          'Cut-Resistant Ballast Handling Gloves (EN 388 Level 4)',
          'Audible Whistle / Hooter for Look-out Protection',
        ],
        mandatorySteps: [
          {
            stepNumber: 1,
            action: 'Immediate Track Banner Flag & Detonator Protection',
            protocolDetail:
              'Erect Red Banner Flag at 600m from defect site on approach track. Post 3 detonator caps at 10-meter intervals 1200m before site if traffic is not blocked.',
            criticalRule: true,
          },
          {
            stepNumber: 2,
            action: 'Emergency Fishplate Clamping & Rail Continuity',
            protocolDetail:
              'For rail fractures or weld separation, apply 1-meter joggled fishplates with 4 special C-clamps or through-bolts tightened to 450 N·m torque prior to permitting test train movement.',
            criticalRule: true,
          },
          {
            stepNumber: 3,
            action: 'Imposition of Caution Order & Speed Restriction',
            protocolDetail: `Issue Engineering Caution Order Form T/409 imposing immediate speed restriction of ${
              speedRestrictionKmph ? `${speedRestrictionKmph} km/h` : '30 km/h'
            } over defective chainage (${defect.geoCoordinates?.railwayChainageKm || defect.corridorId}).`,
            criticalRule: severity === 'CRITICAL',
          },
          {
            stepNumber: 4,
            action: 'Dedicated Look-out Man Posting',
            protocolDetail:
              'Station a designated competent gangman with red flag and whistle at 800m sighting distance to warn crew of approaching traffic on adjacent lines.',
            criticalRule: true,
          },
        ],
        emergencyContacts: [
          { role: 'Section Controller (Engineering)', contactChannel: 'Railway VHF Ch 4 / Auto 4210', authority: 'Northern Railway Control' },
          { role: 'Senior Section Engineer (P-Way)', contactChannel: 'Mobile CUG / RLY 9412', authority: 'Delhi Division P-Way' },
          { role: 'Divisional Safety Officer', contactChannel: 'Emergency Hot-Line Ext 1072', authority: 'Safety Directorate' },
        ],
        warningNotice:
          'DO NOT commence rail cutting or unfastening without formal Line Clear Block / Shadow Block possession sanction in RailSync ITMS.',
      };

    case 'TRACTION':
      return {
        department: 'TRACTION',
        title: '25 kV AC Traction Overhead Equipment (OHE) Isolation & Earthing Protocol',
        irManualReference: 'ACTM (AC Traction Manual) Volume II & Indian Electricity Rules 1956 Rule 43',
        mandatoryPpe: [
          'High-Voltage Dielectric Insulated Gloves (Class 4 - 36 kV tested)',
          'Dielectric Safety Helmet with Full Face Arc Flash Shield',
          'Arc-Rated Flame Resistant Overalls (NFPA 70E Level 2)',
          'Insulated Discharge Rod with Heavy-Duty Copper Earth Bond (25 mm²)',
          'Non-conductive Fiberglass Ladders only',
        ],
        mandatorySteps: [
          {
            stepNumber: 1,
            action: 'Power Block Grant & Permit-to-Work (PTW)',
            protocolDetail:
              'Obtain formal PTW Form ETR-4 from Traction Power Controller (TPC). Ensure physical breaker trip, lock-out/tag-out (LOTO), and SCADA cross-check.',
            criticalRule: true,
          },
          {
            stepNumber: 2,
            action: 'Test for Voltage & Residual Static Charge',
            protocolDetail:
              'Verify absence of residual voltage using approved non-contact optical/acoustic high-voltage detector wand before mounting cantilever or ladder.',
            criticalRule: true,
          },
          {
            stepNumber: 3,
            action: 'Double-Sided Discharge Rod Earthing',
            protocolDetail:
              'Clamp heavy-duty discharge earthing rod to the running rail web first, then attach to the 25 kV catenary wire on BOTH sides of work area at 100m distance.',
            criticalRule: true,
          },
          {
            stepNumber: 4,
            action: 'Induction Voltage Clearance on Adjacent Lines',
            protocolDetail:
              'Maintain minimum 2.0 meter safe electrical clearance from energized 25 kV feeders on adjacent operating tracks at all times.',
            criticalRule: false,
          },
        ],
        emergencyContacts: [
          { role: 'Traction Power Controller (TPC)', contactChannel: 'Direct SCADA Hot-line Ext 3301', authority: 'Traction Control Hub' },
          { role: 'Senior Section Engineer (TRD)', contactChannel: 'CUG 98710-OHE / VHF Ch 2', authority: 'TRD Section Office' },
          { role: 'Sub-Station Operator', contactChannel: 'Traction Sub-Station (TSS) SBC', authority: '25kV Supply Grid' },
        ],
        warningNotice:
          'All catenary and dropper wires MUST be treated as LIVE at 25,000 Volts until discharge rods are firmly bolted to the track return rail!',
      };

    case 'S&T':
      return {
        department: 'S&T',
        title: 'Point Machine, Track Circuit & Interlocking Fail-Safe Disconnection Protocol',
        irManualReference: 'Signal Engineering Manual (SEM) Part II Chapter 11 & G&SR 15.08',
        mandatoryPpe: [
          'Electrostatically Dissipative Safety Boots (ESD)',
          'Anti-Pinch Mechanical Work Gloves',
          'Safety Eyewear / Polycarbonate Glasses',
          'Fluorescent High-Vis Safety Vest',
        ],
        mandatorySteps: [
          {
            stepNumber: 1,
            action: 'Issue Statutory Disconnection Memo Form S&T (T/351)',
            protocolDetail:
              'Deliver official Disconnection Memo Form S&T-T/351 to on-duty Station Master. Ensure entry in Station Diary and obtain signed counter-foil BEFORE loosening any terminal or point rod.',
            criticalRule: true,
          },
          {
            stepNumber: 2,
            action: 'Mechanical Clamping of Facing Points',
            protocolDetail:
              'Apply heavy facing point clamp and brass padlock with key retained by Station Master to lock points in Normal or Reverse set position during inspection.',
            criticalRule: true,
          },
          {
            stepNumber: 3,
            action: 'Signal Aspect Hold at Danger',
            protocolDetail:
              'Ensure home, routing, and starter signals protecting the defective turnout or block section are permanently slotted at Red (Danger).',
            criticalRule: true,
          },
          {
            stepNumber: 4,
            action: 'Reconnection Testing with Station Master (T/351B)',
            protocolDetail:
              'Following repair, execute joint correspondence test (Normal, Reverse, and Track Lock clearance) with SM before delivering Reconnection Memo Form S&T-T/351B.',
            criticalRule: true,
          },
        ],
        emergencyContacts: [
          { role: 'Station Master / On-Duty Dy. SS', contactChannel: 'Station Intercom Ext 101', authority: 'Operational Station Office' },
          { role: 'Chief Signal Inspector (SSE/Sig)', contactChannel: 'Railway CUG 97901-SIG', authority: 'S&T Directorate' },
          { role: 'Signal Fault Control Room', contactChannel: 'Auto Line 4412', authority: 'Central Signal Hub' },
        ],
        warningNotice:
          'NEVER bypass or strap relay contacts or track circuit feeds. Defective axle counters must only be reset following physical track vacancy confirmation.',
      };

    default:
      return {
        department: 'OPERATIONS',
        title: 'Standard Trackside Inspection & Personnel Protection Protocol',
        irManualReference: 'General & Subsidiary Rules (G&SR) Chapter 15',
        mandatoryPpe: [
          'High-Visibility Retroreflective Safety Vest',
          'Industrial Safety Helmet',
          'Steel-Toe Safety Boots',
          'Communication Radio / VHF Handset',
        ],
        mandatorySteps: [
          {
            stepNumber: 1,
            action: 'Station Master Notification',
            protocolDetail: 'Advise on-duty Station Master and Section Controller of track entry and exit times.',
            criticalRule: true,
          },
          {
            stepNumber: 2,
            action: 'Safe Refuge & Cess Clearance',
            protocolDetail: 'Stay in the cess; step into safe refuge trolley refuges at least 2 minutes prior to train passage.',
            criticalRule: true,
          },
          {
            stepNumber: 3,
            action: 'Adjacent Track Monitoring',
            protocolDetail: 'Never stand on an adjacent track when a train is approaching on any line.',
            criticalRule: true,
          },
        ],
        emergencyContacts: [
          { role: 'Section Controller', contactChannel: 'Railway Auto 4100', authority: 'Central Control Hub' },
          { role: 'Station Master', contactChannel: 'VHF Ch 1', authority: 'Local Station' },
        ],
        warningNotice: 'Always walk facing oncoming traffic on double line sections.',
      };
  }
}
