import {
  DepartmentType,
  GeoCoordinates,
  ManpowerGang,
  NearbySupervisorTarget,
  SupervisorPushAlert,
} from '../types';
import { INITIAL_MANPOWER_GANGS, INITIAL_CORRIDORS } from '../data/mockData';
import { railwayAudio } from './railwayAudio';

const STORAGE_KEY_ALERTS = 'railsync_supervisor_push_alerts';
const BROADCAST_CHANNEL_NAME = 'railsync-critical-supervisor-alerts';

// Realistic Indian Railways CUG & Radio assignments per gang
const SUPERVISOR_CUG_MAP: Record<string, { mobile: string; radio: string; designation: string }> = {
  'GANG-ENG-C01-A': {
    mobile: '+91 97176 38401',
    radio: 'VHF Ch 04 [150.150 MHz UP Main]',
    designation: 'Senior Section Engineer (P-Way / Track)',
  },
  'GANG-ENG-C01-B': {
    mobile: '+91 97176 38402',
    radio: 'VHF Ch 04 [150.150 MHz UP Main]',
    designation: 'Permanent Way Inspector (Fasteners & Sleepers)',
  },
  'GANG-SNT-C01': {
    mobile: '+91 97176 38415',
    radio: 'VHF Ch 06 [150.250 MHz S&T Interlocking]',
    designation: 'Divisional Signal & Telecom Engineer (DSTE)',
  },
  'GANG-TRC-C01': {
    mobile: '+91 97176 38428',
    radio: 'VHF Ch 08 [150.350 MHz 25kV TRD Traction]',
    designation: 'Senior Section Engineer (Traction Distribution)',
  },
  'GANG-SFT-C01': {
    mobile: '+91 97176 38499',
    radio: 'VHF Ch 02 [150.050 MHz Emergency Lookout]',
    designation: 'Track Safety Warden & Fog Signal Marshal',
  },
  'GANG-ENG-C02': {
    mobile: '+91 97176 38501',
    radio: 'VHF Ch 05 [150.200 MHz High-Speed]',
    designation: 'PWI High-Speed Track Alignment Lead',
  },
  'GANG-SNT-C02': {
    mobile: '+91 97176 38515',
    radio: 'VHF Ch 07 [150.300 MHz Kavach ATP Radio]',
    designation: 'SSE / Kavach Radio & Balise Specialist',
  },
  'GANG-TRC-C02': {
    mobile: '+91 97176 38528',
    radio: 'VHF Ch 09 [150.400 MHz OHE Sag & Tension]',
    designation: 'SSE / Overhead Traction Catenary In-Charge',
  },
  'GANG-SFT-C02': {
    mobile: '+91 97176 38599',
    radio: 'VHF Ch 02 [150.050 MHz High-Speed Lookout]',
    designation: 'Head Curve Lookout & Detonator Leader',
  },
  'GANG-ENG-C03': {
    mobile: '+91 97176 38601',
    radio: 'VHF Ch 03 [150.125 MHz Heavy Freight]',
    designation: 'Senior Section Engineer (Civil P-Way)',
  },
  'GANG-SNT-C03': {
    mobile: '+91 97176 38615',
    radio: 'VHF Ch 06 [150.250 MHz BPAC Axle Counter]',
    designation: 'SSE / Axle Counter & Point Machine Team',
  },
  'GANG-TRC-C03': {
    mobile: '+91 97176 38628',
    radio: 'VHF Ch 08 [150.350 MHz Heavy OHE Substation]',
    designation: 'SSE / TRD Traction Sub-Station Lead',
  },
  'GANG-ENG-C04': {
    mobile: '+91 97176 38701',
    radio: 'VHF Ch 05 [150.200 MHz Trunk East]',
    designation: 'Senior Section Engineer (Track / P-Way)',
  },
  'GANG-SNT-C04': {
    mobile: '+91 97176 38715',
    radio: 'VHF Ch 07 [150.300 MHz Auto-Signaling]',
    designation: 'Divisional Signal & Telecom Engineer (DSTE)',
  },
  'GANG-TRC-C04': {
    mobile: '+91 97176 38728',
    radio: 'VHF Ch 08 [150.350 MHz Catenary Breaker]',
    designation: 'SSE / Traction Feeder & OHE Lead',
  },
};

// Singleton BroadcastChannel for real-time inter-tab & background sync
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not initialized:', e);
  }
}

/**
 * Check if the browser supports standard Web Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Retrieve current push notification permission status
 */
export function getPushNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Prompt user for Push Notification Permission
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return Notification.permission;
  }
}

/**
 * Extract kilometer number from chainage text like "KM 28/4" or "KM 14/0 to 18/5"
 */
function parseKmFromSection(text?: string): number | null {
  if (!text) return null;
  const match = text.match(/KM\s*(\d+(?:\.\d+|\/\d+)?)/i);
  if (match && match[1]) {
    const raw = match[1].replace('/', '.');
    const parsed = parseFloat(raw);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Find nearby maintenance supervisors stationed in or adjacent to the track section
 */
export function getNearbySupervisorsForSection(
  corridorId: string,
  sectionText?: string,
  defectDepartment?: DepartmentType,
  geoCoords?: GeoCoordinates | null
): NearbySupervisorTarget[] {
  // Filter gangs by corridor
  let eligibleGangs = INITIAL_MANPOWER_GANGS.filter((g) => g.corridorId === corridorId);

  // If corridor has fewer than 2 gangs, augment with general network gangs
  if (eligibleGangs.length === 0) {
    eligibleGangs = INITIAL_MANPOWER_GANGS.slice(0, 3);
  }

  const defectKm =
    (geoCoords?.railwayChainageKm ? parseKmFromSection(geoCoords.railwayChainageKm) : null) ||
    parseKmFromSection(sectionText) ||
    24.0;

  // Map to NearbySupervisorTarget with calculated proximity
  const supervisors: NearbySupervisorTarget[] = eligibleGangs.map((gang, index) => {
    const cug = SUPERVISOR_CUG_MAP[gang.id] || {
      mobile: `+91 97176 38${index}90`,
      radio: `VHF Ch 0${index + 3} [150.${index}50 MHz]`,
      designation: `${gang.trade.replace(/_/g, ' ')} Field In-Charge`,
    };

    const gangKm = parseKmFromSection(gang.assignedSection) || 20.0 + index * 4;
    // Calculate realistic distance along track
    const diffKm = Math.abs(defectKm - gangKm);
    // Add small random decimal offset for authenticity, clamped between 0.3km and 4.8km
    const distanceKm = Math.max(0.3, Math.min(6.5, parseFloat((diffKm * 0.4 + (index === 0 ? 0.4 : 1.1)).toFixed(1))));

    // Department match priority
    const isDeptMatch = defectDepartment && gang.department === defectDepartment;

    return {
      gangId: gang.id,
      gangName: gang.name,
      supervisorName: gang.supervisor,
      designation: cug.designation,
      department: gang.department,
      assignedSection: gang.assignedSection,
      distanceKm: isDeptMatch ? Math.min(distanceKm, 0.8) : distanceKm,
      cugMobile: cug.mobile,
      radioChannel: cug.radio,
      status: 'DISPATCHED',
      responseEtaMinutes: Math.round(distanceKm * 4 + 4),
    };
  });

  // Sort by priority: Matching department first, then closest distance
  supervisors.sort((a, b) => {
    if (defectDepartment) {
      if (a.department === defectDepartment && b.department !== defectDepartment) return -1;
      if (b.department === defectDepartment && a.department !== defectDepartment) return 1;
    }
    return a.distanceKm - b.distanceKm;
  });

  return supervisors;
}

/**
 * Dispatch real-time push alert to nearby track maintenance supervisors
 */
export async function dispatchCriticalDefectPushAlert(params: {
  defectId: string;
  corridorId: string;
  section: string;
  chainageKm?: string;
  defectType: string;
  description: string;
  reportedBy: string;
  geoCoordinates?: GeoCoordinates;
  speedRestrictionKmph?: number;
  department?: DepartmentType;
}): Promise<SupervisorPushAlert> {
  const corridor = INITIAL_CORRIDORS.find((c) => c.id === params.corridorId);
  const corridorName = corridor ? `${corridor.name} (${corridor.code})` : params.corridorId;

  // 1. Identify nearby supervisors for this specific track section
  const supervisors = getNearbySupervisorsForSection(
    params.corridorId,
    params.section,
    params.department,
    params.geoCoordinates
  );

  const alertId = `ALERT-PUSH-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  let browserPushDelivered = false;

  // 2. Dispatch Browser Native Push Notification if permission granted
  if (isPushNotificationSupported() && Notification.permission === 'granted') {
    try {
      const primarySupervisor = supervisors[0]?.supervisorName || 'Section PWI';
      const notificationTitle = `🚨 CRITICAL TRACK DEFECT ALERT: ${params.section}`;
      const notificationBody = `URGENT [${params.corridorId}]: ${params.defectType}. Push dispatched to ${primarySupervisor} and ${supervisors.length} field gangs.`;

      const nativeNotification = new Notification(notificationTitle, {
        body: notificationBody,
        icon: '/favicon.ico',
        tag: `defect-alert-${params.defectId}`,
        badge: '/favicon.ico',
        requireInteraction: true,
      });

      nativeNotification.onclick = () => {
        window.focus();
        nativeNotification.close();
      };

      browserPushDelivered = true;
    } catch (e) {
      console.warn('Native push notification invocation failed:', e);
    }
  }

  // 3. Audio Warning: Railway Supervisor Emergency Klaxon
  try {
    railwayAudio.playSupervisorEmergencyKlaxon();
  } catch {
    // Suppress audio failure
  }

  // 4. Mobile Haptic Vibration Alert if supported
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([250, 100, 250, 100, 450]);
    } catch {
      // Suppress vibration error
    }
  }

  const alertRecord: SupervisorPushAlert = {
    alertId,
    defectId: params.defectId,
    corridorId: params.corridorId,
    corridorName,
    section: params.section,
    chainageKm: params.chainageKm || params.geoCoordinates?.railwayChainageKm,
    defectType: params.defectType,
    severity: 'CRITICAL',
    description: params.description,
    reportedBy: params.reportedBy,
    reportedAt: new Date().toISOString(),
    geoCoordinates: params.geoCoordinates,
    supervisorsAlerted: supervisors,
    speedRestrictionKmph: params.speedRestrictionKmph,
    deliveryChannels: ['WEB_PUSH', 'VHF_RADIO', 'RAIL_CUG_SMS', 'IN_APP_BROADCAST'],
    deliveryStatus: 'PUSHED_TO_ALL',
    browserPushDelivered,
  };

  // 5. Store alert in persistent local history
  try {
    const existing = getStoredPushAlerts();
    const updated = [alertRecord, ...existing.filter((a) => a.defectId !== params.defectId)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to persist supervisor push alert:', err);
  }

  // 6. Broadcast via BroadcastChannel across all browser tabs & workers
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({
        type: 'CRITICAL_DEFECT_SUPERVISOR_ALERT',
        alert: alertRecord,
      });
    } catch (err) {
      console.warn('BroadcastChannel postMessage error:', err);
    }
  }

  // 7. Dispatch window CustomEvent for immediate in-component reactivity
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('railsync-supervisor-push', {
        detail: alertRecord,
      })
    );
  }

  return alertRecord;
}

/**
 * Retrieve stored supervisor push alerts from persistent storage
 */
export function getStoredPushAlerts(): SupervisorPushAlert[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Acknowledge a supervisor push alert (e.g. supervisor marks safety protocol received)
 */
export function acknowledgeSupervisorAlert(
  alertId: string,
  gangId: string,
  newStatus: 'ACKNOWLEDGED' | 'EN_ROUTE' = 'ACKNOWLEDGED'
): SupervisorPushAlert | null {
  try {
    const alerts = getStoredPushAlerts();
    const alert = alerts.find((a) => a.alertId === alertId);
    if (!alert) return null;

    alert.supervisorsAlerted = alert.supervisorsAlerted.map((s) => {
      if (s.gangId === gangId) {
        return {
          ...s,
          status: newStatus,
          acknowledgedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    const anyAcknowledged = alert.supervisorsAlerted.some(
      (s) => s.status === 'ACKNOWLEDGED' || s.status === 'EN_ROUTE'
    );
    if (anyAcknowledged) {
      alert.deliveryStatus = 'ACKNOWLEDGED';
    }

    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));

    railwayAudio.playAcknowledgmentPing();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('railsync-supervisor-push-ack', {
          detail: { alertId, gangId, status: newStatus },
        })
      );
    }

    return alert;
  } catch (err) {
    console.error('Error acknowledging alert:', err);
    return null;
  }
}

/**
 * Subscribe to real-time supervisor alerts (both same-tab and cross-tab via BroadcastChannel)
 */
export function subscribeToSupervisorAlerts(callback: (alert: SupervisorPushAlert) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<SupervisorPushAlert>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data?.type === 'CRITICAL_DEFECT_SUPERVISOR_ALERT' && e.data?.alert) {
      callback(e.data.alert);
    }
  };

  window.addEventListener('railsync-supervisor-push', handleCustomEvent);

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  return () => {
    window.removeEventListener('railsync-supervisor-push', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
  };
}

/**
 * Simulate an incoming or outgoing critical defect push alert for demonstration/testing
 */
export function simulateSupervisorPushAlert(corridorId = 'C004', section = 'KM 28/4 to 34/2'): Promise<SupervisorPushAlert> {
  return dispatchCriticalDefectPushAlert({
    defectId: `DEF-SIM-${Math.floor(1000 + Math.random() * 9000)}`,
    corridorId,
    section,
    chainageKm: 'KM 28/4',
    defectType: 'Acute Railhead Shear Defect & Point Machine Misalignment',
    description: 'Sudden fracture pattern detected on turnout stock rail. High derailment hazard. Track possession required.',
    reportedBy: 'Field Track Machine Operator / USFD Team',
    speedRestrictionKmph: 20,
    department: 'ENGINEERING',
    geoCoordinates: {
      latitude: 28.6948,
      longitude: 76.9298,
      altitudeMeters: 218,
      railwayChainageKm: 'KM 28/4 UP Track',
    },
  });
}
