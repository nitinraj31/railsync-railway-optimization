import { CrewFatigueProfile, DepartmentType } from '../types';
import { crewFatigueService } from './crewFatigueService';
import { railwayAudio } from './railwayAudio';

export interface CrewFatigueAlert {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  department: DepartmentType;
  gangId: string;
  gangName: string;
  corridorId: string;
  assignedSection: string;
  circadianFatigueIndex: number; // >= 85
  sleepDebtHours: number;
  consecutiveNightShifts: number;
  primaryFatigueDriver: string;
  suggestedReliefGang: string;
  targetShift: string;
  fatigueReductionPoints: number;
  timestamp: string;
  dismissed: boolean;
}

const STORAGE_KEYS = {
  NOTIFICATIONS_ENABLED: 'railsync_crew_fatigue_notifications_enabled',
  SOUND_ENABLED: 'railsync_crew_fatigue_sound_enabled',
  DISMISSED_ALERT_KEYS: 'railsync_crew_fatigue_dismissed_keys',
};

class CrewFatigueNotificationService {
  private readonly FATIGUE_THRESHOLD = 85; // 85% circadian depletion threshold
  private isEnabled: boolean = true;
  private isSoundEnabled: boolean = true;
  private activeAlerts: CrewFatigueAlert[] = [];
  private dismissedAlertIds: Set<string> = new Set();
  private listeners: Set<(alerts: CrewFatigueAlert[]) => void> = new Set();
  private lastAlertSoundTimestamp: number = 0;
  private checkIntervalTimer: any = null;

  constructor() {
    const savedEnabled = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
    this.isEnabled = savedEnabled !== null ? savedEnabled === 'true' : true;

    const savedSound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    this.isSoundEnabled = savedSound !== null ? savedSound === 'true' : true;

    try {
      const savedDismissed = localStorage.getItem(STORAGE_KEYS.DISMISSED_ALERT_KEYS);
      if (savedDismissed) {
        this.dismissedAlertIds = new Set(JSON.parse(savedDismissed));
      }
    } catch {
      this.dismissedAlertIds = new Set();
    }

    // Subscribe to live crew roster changes
    crewFatigueService.subscribe((profiles) => {
      this.evaluateProfiles(profiles);
    });

    // Initial check
    this.evaluateProfiles(crewFatigueService.getProfiles());

    // Continuous background monitor (evaluates every 8 seconds)
    if (typeof window !== 'undefined') {
      this.checkIntervalTimer = setInterval(() => {
        this.evaluateProfiles(crewFatigueService.getProfiles());
      }, 8000);
    }
  }

  public getThreshold(): number {
    return this.FATIGUE_THRESHOLD;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public setIsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
    if (!enabled) {
      this.activeAlerts = [];
      this.notifyListeners();
    } else {
      this.evaluateProfiles(crewFatigueService.getProfiles());
    }
  }

  public getIsSoundEnabled(): boolean {
    return this.isSoundEnabled;
  }

  public setIsSoundEnabled(sound: boolean): void {
    this.isSoundEnabled = sound;
    localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(sound));
  }

  public getActiveAlerts(): CrewFatigueAlert[] {
    return this.activeAlerts.filter((a) => !a.dismissed);
  }

  public subscribe(listener: (alerts: CrewFatigueAlert[]) => void): () => void {
    this.listeners.add(listener);
    // Emit immediate current state
    listener(this.getActiveAlerts());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const alerts = this.getActiveAlerts();
    this.listeners.forEach((fn) => {
      try {
        fn(alerts);
      } catch (err) {
        console.error('CrewFatigueNotificationService listener error:', err);
      }
    });
  }

  // Core Evaluation: Detects gangs crossing >= 85% circadian depletion
  public evaluateProfiles(profiles: CrewFatigueProfile[]): void {
    if (!this.isEnabled) return;

    const currentMatchingAlerts: CrewFatigueAlert[] = [];
    let hasNewBreach = false;

    profiles.forEach((profile) => {
      // Condition: Active maintenance gang crossing >= 85% circadian depletion
      if (profile.circadianFatigueIndex >= this.FATIGUE_THRESHOLD) {
        const alertUniqueKey = `CFA-${profile.staffId}-${profile.circadianFatigueIndex}`;
        const isDismissed = this.dismissedAlertIds.has(alertUniqueKey);

        const alert: CrewFatigueAlert = {
          id: alertUniqueKey,
          staffId: profile.staffId,
          staffName: profile.staffName,
          role: profile.role,
          department: profile.department,
          gangId: profile.gangId,
          gangName: profile.gangName,
          corridorId: profile.corridorId,
          assignedSection: profile.assignedSection,
          circadianFatigueIndex: profile.circadianFatigueIndex,
          sleepDebtHours: profile.sleepDebtHours,
          consecutiveNightShifts: profile.consecutiveNightShifts,
          primaryFatigueDriver: profile.primaryFatigueDriver,
          suggestedReliefGang:
            profile.suggestedRestRotation?.reliefStaffOrGang || 'Central Standby Squad G06',
          targetShift: profile.suggestedRestRotation?.targetShift || 'REST_PERIOD',
          fatigueReductionPoints: profile.suggestedRestRotation?.fatigueReductionPoints || 55,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          dismissed: isDismissed,
        };

        currentMatchingAlerts.push(alert);

        // Check if this is a newly surfaced un-dismissed critical alert
        const existingAlert = this.activeAlerts.find((a) => a.id === alert.id);
        if (!existingAlert && !isDismissed) {
          hasNewBreach = true;
        }
      }
    });

    this.activeAlerts = currentMatchingAlerts;
    this.notifyListeners();

    // Sound chime if new breach detected and sound enabled (with 15s throttle)
    if (hasNewBreach && this.isSoundEnabled) {
      const now = Date.now();
      if (now - this.lastAlertSoundTimestamp > 15000) {
        this.lastAlertSoundTimestamp = now;
        try {
          railwayAudio.playBeep(880, 0.1);
        } catch {
          // ignore audio failure
        }
      }
    }
  }

  // Dismiss a specific toast alert
  public dismissAlert(alertId: string): void {
    this.dismissedAlertIds.add(alertId);
    try {
      localStorage.setItem(
        STORAGE_KEYS.DISMISSED_ALERT_KEYS,
        JSON.stringify(Array.from(this.dismissedAlertIds).slice(-30))
      );
    } catch {}
    this.activeAlerts = this.activeAlerts.map((a) => (a.id === alertId ? { ...a, dismissed: true } : a));
    this.notifyListeners();
  }

  // Quick-Rest Button Handler: Immediately triggers shift swap via crewFatigueService
  public async quickRest(staffId: string): Promise<{
    success: boolean;
    staffName: string;
    gangName: string;
    reliefGang: string;
    oldScore: number;
    newScore: number;
  }> {
    const profileBefore = crewFatigueService.getProfiles().find((p) => p.staffId === staffId);
    const oldScore = profileBefore?.circadianFatigueIndex || 88;

    // Apply rotation for single crew member via crewFatigueService
    const result = crewFatigueService.applyRotationForStaff(staffId);
    const profileAfter = result.profiles.find((p) => p.staffId === staffId);
    const newScore = profileAfter?.circadianFatigueIndex || 26;

    // Play successful relief tone
    try {
      railwayAudio.playSuccessTone();
    } catch {}

    // Dismiss active alerts for this staff
    this.activeAlerts = this.activeAlerts.filter((a) => a.staffId !== staffId);
    this.notifyListeners();

    return {
      success: true,
      staffName: profileBefore?.staffName || 'Gang Leader',
      gangName: profileBefore?.gangName || 'Maintenance Gang',
      reliefGang: profileBefore?.suggestedRestRotation?.reliefStaffOrGang || 'Standby Relief Squad',
      oldScore,
      newScore,
    };
  }

  // Quick-Rest All: Immediately swap all gangs currently crossing >= 85% threshold
  public async quickRestAll(): Promise<{
    success: boolean;
    relievedCount: number;
  }> {
    const criticals = this.getActiveAlerts();
    if (criticals.length === 0) return { success: false, relievedCount: 0 };

    criticals.forEach((c) => {
      crewFatigueService.applyRotationForStaff(c.staffId);
    });

    try {
      railwayAudio.playSuccessTone();
    } catch {}

    this.activeAlerts = [];
    this.notifyListeners();

    return {
      success: true,
      relievedCount: criticals.length,
    };
  }

  // Manual Trigger for demonstration & testing: Spikes fatigue to >= 85%
  public triggerTestSpike(staffId = 'STAFF-101', score = 89): void {
    // Clear dismissed state for this staffId so toast displays fresh
    this.dismissedAlertIds = new Set(
      Array.from(this.dismissedAlertIds).filter((k) => !k.includes(staffId))
    );
    try {
      localStorage.setItem(
        STORAGE_KEYS.DISMISSED_ALERT_KEYS,
        JSON.stringify(Array.from(this.dismissedAlertIds))
      );
    } catch {}

    crewFatigueService.simulateFatigueSpike(staffId, score);
  }

  public resetBaseline(): void {
    this.dismissedAlertIds.clear();
    try {
      localStorage.removeItem(STORAGE_KEYS.DISMISSED_ALERT_KEYS);
    } catch {}
    crewFatigueService.resetToBaseline();
  }
}

export const crewFatigueNotificationService = new CrewFatigueNotificationService();
