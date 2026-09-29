import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  X,
  BellRing,
  ExternalLink,
  MapPin,
  Clock,
  ArrowRight,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  predictiveRiskNotificationService,
  PredictiveRiskAlert,
} from '../../services/predictiveRiskNotificationService';

interface PredictiveRiskAlertBannerProps {
  onNavigate?: (screen: string, params?: any) => void;
  onSelectCorridor?: (corridorId: string) => void;
}

export const PredictiveRiskAlertBanner: React.FC<PredictiveRiskAlertBannerProps> = ({
  onNavigate,
  onSelectCorridor,
}) => {
  const [alerts, setAlerts] = useState<PredictiveRiskAlert[]>([]);

  useEffect(() => {
    const unsubscribe = predictiveRiskNotificationService.subscribe((activeAlerts) => {
      setAlerts(activeAlerts);
    });
    return () => unsubscribe();
  }, []);

  if (alerts.length === 0) return null;

  // Show the latest alert prominently
  const latestAlert = alerts[0];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="bg-[#181124] border-2 border-rose-500 rounded-xl p-4 shadow-[0_0_30px_rgba(244,63,94,0.4)] text-slate-100 font-mono relative backdrop-blur-md">
        {/* Pulsing beacon glow */}
        <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-rose-900/60">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-950 border border-rose-700 text-rose-300 animate-pulse">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase text-rose-300 tracking-wider">
                  PREDICTIVE RISK BROWSER ALERT
                </span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </div>
              <span className="text-[10px] text-slate-400">
                30-Day Degradation Trend Threshold Exceeded
              </span>
            </div>
          </div>

          <button
            onClick={() => predictiveRiskNotificationService.dismissAlert(latestAlert.id)}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert Details */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="px-2 py-0.5 rounded bg-rose-950/90 text-rose-200 border border-rose-700 font-bold">
              {latestAlert.corridorCode}
            </span>
            <span className="text-rose-400 font-black text-sm">
              {latestAlert.currentTDI} TDI{' '}
              <span className="text-[10px] font-normal text-slate-400">
                (&gt; {latestAlert.threshold} Threshold)
              </span>
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-100 leading-snug">
            {latestAlert.corridorName}
          </h4>

          <div className="p-2 rounded bg-slate-950/80 border border-rose-950 text-[11px] text-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="line-clamp-1">{latestAlert.segmentName}</span>
            </div>
            <div className="text-[10px] text-slate-400 pl-5">
              30-day degradation velocity: <strong className="text-rose-400">+{latestAlert.degradationRate}%</strong>. Failure probability elevated under current traffic cycle.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={() => {
              if (onSelectCorridor) {
                onSelectCorridor(latestAlert.corridorId);
              }
              const el = document.getElementById('corridor-predictive-health-section');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
              }
              predictiveRiskNotificationService.dismissAlert(latestAlert.id);
            }}
            className="px-3 py-1.5 rounded-lg bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-700 flex items-center gap-1 font-bold text-[11px] transition-colors"
          >
            <span>Inspect Trend Line</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('timeline', { corridorId: latestAlert.corridorId });
              }
              predictiveRiskNotificationService.dismissAlert(latestAlert.id);
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 border border-rose-600 flex items-center gap-1 font-bold text-[11px] transition-colors"
          >
            <span>Plan Urgent Block</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {alerts.length > 1 && (
          <div className="mt-2 text-center text-[10px] text-slate-500 font-mono">
            + {alerts.length - 1} more corridor risk alert(s) in queue
          </div>
        )}
      </div>
    </div>
  );
};
