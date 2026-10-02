import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Zap,
  ShieldAlert,
  ShieldCheck,
  X,
  Volume2,
  VolumeX,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';
import {
  crewFatigueNotificationService,
  CrewFatigueAlert,
} from '../../services/crewFatigueNotificationService';

interface CrewFatigueToastNotificationProps {
  onNavigate?: (screen: string, itemData?: any) => void;
}

export const CrewFatigueToastNotification: React.FC<CrewFatigueToastNotificationProps> = ({
  onNavigate,
}) => {
  const [alerts, setAlerts] = useState<CrewFatigueAlert[]>(() =>
    crewFatigueNotificationService.getActiveAlerts()
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() =>
    crewFatigueNotificationService.getIsSoundEnabled()
  );
  const [successToast, setSuccessToast] = useState<{
    staffName: string;
    reliefGang: string;
    oldScore: number;
    newScore: number;
  } | null>(null);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);

  // Subscribe to real-time alerts
  useEffect(() => {
    const unsubscribe = crewFatigueNotificationService.subscribe((active) => {
      setAlerts(active);
      if (currentIndex >= active.length) {
        setCurrentIndex(Math.max(0, active.length - 1));
      }
    });
    return () => unsubscribe();
  }, [currentIndex]);

  const toggleSound = () => {
    const next = !soundEnabled;
    crewFatigueNotificationService.setIsSoundEnabled(next);
    setSoundEnabled(next);
  };

  const handleQuickRest = async (staffId: string) => {
    setIsSwapping(true);
    try {
      const res = await crewFatigueNotificationService.quickRest(staffId);
      if (res.success) {
        setSuccessToast({
          staffName: res.staffName,
          reliefGang: res.reliefGang,
          oldScore: res.oldScore,
          newScore: res.newScore,
        });
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (e) {
      console.error('Quick-Rest swap failed:', e);
    } finally {
      setIsSwapping(false);
    }
  };

  const handleQuickRestAll = async () => {
    setIsSwapping(true);
    try {
      const res = await crewFatigueNotificationService.quickRestAll();
      if (res.success) {
        setSuccessToast({
          staffName: `${res.relievedCount} Critical Gangs`,
          reliefGang: 'Central Standby Squads',
          oldScore: 88,
          newScore: 26,
        });
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch (e) {
      console.error('Quick-Rest All failed:', e);
    } finally {
      setIsSwapping(false);
    }
  };

  // If there's a recent success toast, display the celebratory resolution banner
  if (successToast) {
    return (
      <div
        id="crew-fatigue-success-toast"
        className="fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-[420px] bg-gradient-to-r from-emerald-950 via-slate-950 to-teal-950 border-2 border-emerald-500 rounded-xl p-4 shadow-2xl shadow-emerald-950/90 text-xs font-mono animate-in slide-in-from-bottom-5 fade-in duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 animate-bounce" />
            <span className="font-bold text-sm tracking-wide text-white uppercase">
              Shift Swap Executed!
            </span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="p-1 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-700/80 space-y-1 text-slate-200">
          <div className="font-semibold text-emerald-300">
            {successToast.staffName} transitioned to Rest Buffer
          </div>
          <p className="text-[11px] text-slate-300">
            Relieved by <strong className="text-white">{successToast.reliefGang}</strong>.
            Circadian depletion reduced from <span className="line-through text-rose-300">{successToast.oldScore}%</span> ➔{' '}
            <strong className="text-emerald-300">{successToast.newScore}% (Restored)</strong>.
          </p>
        </div>
      </div>
    );
  }

  // If no active critical alerts, render nothing
  if (alerts.length === 0) return null;

  const currentAlert = alerts[currentIndex] || alerts[0];
  if (!currentAlert) return null;

  return (
    <div
      id="crew-fatigue-toast-alert"
      className="fixed bottom-5 right-5 z-50 max-w-md w-full sm:w-[430px] bg-[#17060a] border-2 border-rose-500/90 rounded-xl p-4 shadow-2xl shadow-rose-950/95 text-xs font-mono animate-in slide-in-from-bottom-5 fade-in duration-200 space-y-3"
    >
      {/* HEADER: URGENT ALARM BADGE & CONTROLS */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-rose-900/60">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-rose-950 text-rose-300 border border-rose-600 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.4)]">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-rose-200 text-xs tracking-wider uppercase">
                CRITICAL CREW FATIGUE OVERRUN
              </span>
            </div>
            <span className="text-[10px] text-rose-400 font-bold">
              Threshold &ge; 85% Circadian Depletion Exceeded
            </span>
          </div>
        </div>

        {/* Sound toggle & Dismiss */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleSound}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute alarm chime' : 'Enable alarm chime'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-rose-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>
          <button
            type="button"
            onClick={() => crewFatigueNotificationService.dismissAlert(currentAlert.id)}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ALERT CONTENT: GANG DETAILS & CIRCADIAN TELEMETRY */}
      <div className="space-y-2.5">
        {/* Gang Title & Location */}
        <div>
          <div className="flex items-baseline justify-between">
            <h4 className="text-sm font-black text-white tracking-wide">
              {currentAlert.staffName}
            </h4>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-rose-400 animate-pulse">
                {currentAlert.circadianFatigueIndex}%
              </span>
              <span className="text-[10px] text-rose-300 font-bold">Depleted</span>
            </div>
          </div>
          <div className="text-[11px] text-slate-300 font-semibold flex items-center gap-1 mt-0.5">
            <span className="text-sky-300 font-bold">{currentAlert.gangId}</span>
            <span>· {currentAlert.gangName} ({currentAlert.role})</span>
          </div>
        </div>

        {/* Corridor & Section */}
        <div className="p-2 rounded bg-slate-950/80 border border-rose-950 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-slate-400">Corridor {currentAlert.corridorId}:</span>
            <span className="text-white font-semibold">{currentAlert.assignedSection}</span>
          </div>
        </div>

        {/* HOER Violation & Metrics */}
        <div className="grid grid-cols-2 gap-2 text-[10.5px]">
          <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60">
            <span className="text-rose-400 block text-[9.5px]">Night Duty Accumulation</span>
            <span className="text-white font-bold text-xs mt-0.5 block">
              {currentAlert.consecutiveNightShifts} Consecutive Nights
            </span>
          </div>
          <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60">
            <span className="text-rose-400 block text-[9.5px]">Sleep Debt Deficit</span>
            <span className="text-rose-300 font-bold text-xs mt-0.5 block">
              {currentAlert.sleepDebtHours} Hours Deficit
            </span>
          </div>
        </div>

        {/* Primary Driver & Risk */}
        <p className="text-[11px] text-slate-300 leading-relaxed bg-black/40 p-2 rounded border border-rose-950/80">
          <strong className="text-rose-300">Risk Assessment: </strong>
          {currentAlert.primaryFatigueDriver}
        </p>

        {/* Relief Recommendation Callout */}
        <div className="flex items-center justify-between text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded border border-emerald-900/50">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Relief Target: <strong>{currentAlert.suggestedReliefGang}</strong></span>
          </div>
          <span className="font-bold text-[10px] text-emerald-400">
            -{currentAlert.fatigueReductionPoints} pts
          </span>
        </div>
      </div>

      {/* QUICK-REST ACTION BUTTON (IMMEDIATE SHIFT SWAP) */}
      <div className="pt-1 space-y-2">
        <button
          type="button"
          id="toast-quick-rest-btn"
          disabled={isSwapping}
          onClick={() => handleQuickRest(currentAlert.staffId)}
          className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer disabled:opacity-50"
          title="Trigger immediate shift swap: Disengage fatigued gang and mobilize standby relief crew"
        >
          <Zap className="w-4 h-4 text-emerald-200 fill-emerald-200" />
          <span>{isSwapping ? 'Swapping Shift...' : '⚡ Quick-Rest: Immediate Shift Swap'}</span>
        </button>

        {/* If multiple alerts, provide Quick-Rest All and Pagination */}
        {alerts.length > 1 && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleQuickRestAll}
              disabled={isSwapping}
              className="text-[10.5px] text-teal-300 hover:text-white underline font-bold cursor-pointer"
            >
              ⚡ Quick-Rest All ({alerts.length} Gangs &ge; 85%)
            </button>

            {/* Pagination between alerts */}
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="p-0.5 rounded hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span>{currentIndex + 1} / {alerts.length}</span>
              <button
                type="button"
                disabled={currentIndex >= alerts.length - 1}
                onClick={() => setCurrentIndex((prev) => Math.min(alerts.length - 1, prev + 1))}
                className="p-0.5 rounded hover:text-white disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECONDARY NAVIGATION FOOTER */}
      <div className="pt-2 border-t border-rose-950/80 flex items-center justify-between text-[10.5px] text-slate-400">
        <button
          type="button"
          onClick={() => {
            if (onNavigate) {
              onNavigate('command_center');
              setTimeout(() => {
                const el = document.getElementById('crew-fatigue-topology-component');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }
          }}
          className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
        >
          <span>View on Topology Map</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (onNavigate) {
              onNavigate('resource_allocation', { tab: 'CREW_FATIGUE' });
            }
          }}
          className="text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Full Roster</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
