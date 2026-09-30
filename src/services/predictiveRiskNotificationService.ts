import { Corridor } from '../types';
import { railwayAudio } from './railwayAudio';

export interface PredictiveRiskAlert {
  id: string;
  corridorId: string;
  corridorCode: string;
  corridorName: string;
  currentTDI: number;
  threshold: number;
  degradationRate: number;
  segmentName: string;
  timestamp: string;
  source: 'THRESHOLD_BREACH' | 'SIMULATED_TEST' | 'USFD_ACCELERATION';
  dismissed: boolean;
}

const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: 'railsync_predictive_risk_notifications_enabled',
  SOUND_ENABLED: 'railsync_predictive_risk_sound_enabled',
  ALERT_HISTORY: 'railsync_predictive_risk_alert_history',
};

class PredictiveRiskNotificationService {
  private isEnabled: boolean = true;
  private isSoundEnabled: boolean = true;
  private activeAlerts: PredictiveRiskAlert[] = [];
  private listeners: Set<(alerts: PredictiveRiskAlert[]) => void> = new Set();
  private lastAlertTimestamps: Map<string, number> = new Map();
  private readonly COOLDOWN_MS = 25000; // 25 seconds per corridor to prevent repetitive spamming

  constructor() {
    // Load enabled setting, default to TRUE for rich interactive demonstration
    const savedEnabled = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    if (savedEnabled !== null) {
      this.isEnabled = savedEnabled === 'true';
    } else {
      this.isEnabled = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, 'true');
    }

    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    if (savedSound !== null) {
      this.isSoundEnabled = savedSound === 'true';
    } else {
      this.isSoundEnabled = true;
    }

    try {
      const savedHistory = localStorage.getItem(STORAGE_KEYS.ALERT_HISTORY);
      if (savedHistory) {
        this.activeAlerts = JSON.parse(savedHistory).slice(0, 10);
      }
    } catch {
      this.activeAlerts = [];
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setIsEnabled(enabled: boolean): boolean {
    this.isEnabled = enabled;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
    if (enabled) {
      this.requestPermission();
    }
    this.notifyListeners();
    return this.isEnabled;
  }

  public toggleIsEnabled(): boolean {
    return this.setIsEnabled(!this.isEnabled);
  }

  public getIsSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setIsSoundEnabled(enabled: boolean): void {
    this.isSoundEnabled = enabled;
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
  }

  public getPermissionStatus(): 'default' | 'granted' | 'denied' | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  public async requestPermission(): Promise<'default' | 'granted' | 'denied' | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        return result;
      }
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  public notifyThresholdBreach(params: {
    corridor: Corridor;
    currentTDI: number;
    threshold: number;
    degradationRate: number;
    segmentName?: string;
    bypassCooldown?: boolean;
    source?: 'THRESHOLD_BREACH' | 'SIMULATED_TEST' | 'USFD_ACCELERATION';
  }): PredictiveRiskAlert | null {
    if (!this.isEnabled || !params.corridor) return null;

    const corridorId = params.corridor.id;
    const now = Date.now();
    const lastTime = this.lastAlertTimestamps.get(corridorId) || 0;

    // Check cooldown unless bypassed
    if (!params.bypassCooldown && now - lastTime < this.COOLDOWN_MS) {
      return null;
    }

    this.lastAlertTimestamps.set(corridorId, now);

    const alert: PredictiveRiskAlert = {
      id: `PRA-${Date.now()}-${corridorId}`,
      corridorId,
      corridorCode: params.corridor.code || corridorId,
      corridorName: params.corridor.name,
      currentTDI: params.currentTDI,
      threshold: params.threshold,
      degradationRate: params.degradationRate,
      segmentName: params.segmentName || 'Critical Track Crossover / USFD Hotspot',
      timestamp: new Date().toISOString(),
      source: params.source || 'THRESHOLD_BREACH',
      dismissed: false,
    };

    // 1. Play authentic Railway Emergency audio chime if sound is enabled
    if (this.isSoundEnabled) {
      try {
        railwayAudio.playSupervisorEmergencyKlaxon();
      } catch {
        // Suppress audio failure
      }
    }

    // 2. Mobile vibration feedback if supported
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200, 100, 400]);
      } catch {
        // Suppress vibration error
      }
    }

    // 3. Native Browser Notification invocation
    this.sendNativeBrowserNotification(alert);

    // 4. Record to in-app active alerts
    this.activeAlerts = [alert, ...this.activeAlerts.filter((a) => a.id !== alert.id)].slice(0, 15);
    try {
      localStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(this.activeAlerts));
    } catch {
      // Ignore storage errors
    }

    this.notifyListeners();
    return alert;
  }

  private sendNativeBrowserNotification(alert: PredictiveRiskAlert) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    try {
      if (Notification.permission === 'granted') {
        const title = `⚠️ HIGH RISK: ${alert.corridorCode} Degradation Exceeded!`;
        const body = `Corridor "${alert.corridorName}" degradation trend reached ${alert.currentTDI} TDI (Critical Threshold: ${alert.threshold} TDI). Upcoming vulnerable segment: ${alert.segmentName}. Immediate track inspection advised.`;

        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          tag: `predictive-risk-alert-${alert.corridorId}`,
          badge: '/favicon.ico',
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          const target = document.getElementById('corridor-predictive-health-section');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
          notification.close();
        };
      }
    } catch (e) {
      console.warn('Native browser notification dispatch failed (likely iframe restriction):', e);
    }
  }

  public triggerTestAlert(corridor?: Corridor): PredictiveRiskAlert {
    const testCorridor: Corridor = corridor || {
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
    };

    const alert = this.notifyThresholdBreach({
      corridor: testCorridor,
      currentTDI: 84,
      threshold: 70,
      degradationRate: 28.6,
      segmentName: 'KM 34.2 – KM 41.0 Up Heavy Freight (Bahadurgarh-Sampla)',
      bypassCooldown: true,
      source: 'SIMULATED_TEST',
    });

    return (
      alert || {
        id: `PRA-TEST-${Date.now()}`,
        corridorId: testCorridor.id,
        corridorCode: testCorridor.code || testCorridor.id,
        corridorName: testCorridor.name,
        currentTDI: 84,
        threshold: 70,
        degradationRate: 28.6,
        segmentName: 'KM 34.2 – KM 41.0 Up Heavy Freight Track',
        timestamp: new Date().toISOString(),
        source: 'SIMULATED_TEST',
        dismissed: false,
      }
    );
  }

  public dismissAlert(alertId: string) {
    this.activeAlerts = this.activeAlerts.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a));
    try {
      localStorage.setItem(STORAGE_KEYS.ALERT_HISTORY, JSON.stringify(this.activeAlerts));
    } catch {
      // Ignore storage errors
    }
    this.notifyListeners();
  }

  public clearAllAlerts() {
    this.activeAlerts = [];
    try {
      localStorage.removeItem(STORAGE_KEYS.ALERT_HISTORY);
    } catch {
      // Ignore
    }
    this.notifyListeners();
  }

  public getActiveAlerts(): PredictiveRiskAlert[] {
    return this.activeAlerts.filter((a) => !a.dismissed);
  }

  public getAllAlertHistory(): PredictiveRiskAlert[] {
    return this.activeAlerts;
  }

  public subscribe(listener: (alerts: PredictiveRiskAlert[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getActiveAlerts());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const unDismissed = this.getActiveAlerts();
    this.listeners.forEach((fn) => {
      try {
        fn(unDismissed);
      } catch (err) {
        console.error('Error notifying predictive alert listener:', err);
      }
    });
  }
}

export const predictiveRiskNotificationService = new PredictiveRiskNotificationService();
