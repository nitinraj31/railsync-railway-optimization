import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Radio,
  Phone,
  CheckCircle2,
  Clock,
  Navigation,
  ShieldAlert,
  Send,
  X,
  Volume2,
  Check,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';
import { NearbySupervisorTarget, SupervisorPushAlert } from '../../types';
import { acknowledgeSupervisorAlert } from '../../services/supervisorPushNotificationService';
import { railwayAudio } from '../../services/railwayAudio';

interface SupervisorPushAlertBannerProps {
  alert: SupervisorPushAlert | null;
  onDismiss: () => void;
  onOpenDetails?: (alert: SupervisorPushAlert) => void;
}

export const SupervisorPushAlertBanner: React.FC<SupervisorPushAlertBannerProps> = ({
  alert,
  onDismiss,
  onOpenDetails,
}) => {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [ackState, setAckState] = useState<Record<string, 'ACKNOWLEDGED' | 'EN_ROUTE'>>({});

  if (!alert) return null;

  const handleAcknowledge = (gangId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledgeSupervisorAlert(alert.alertId, gangId, 'ACKNOWLEDGED');
    setAckState((prev) => ({ ...prev, [gangId]: 'ACKNOWLEDGED' }));
  };

  const handleEnRoute = (gangId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    acknowledgeSupervisorAlert(alert.alertId, gangId, 'EN_ROUTE');
    setAckState((prev) => ({ ...prev, [gangId]: 'EN_ROUTE' }));
  };

  const handleReplayKlaxon = (e: React.MouseEvent) => {
    e.stopPropagation();
    railwayAudio.playSupervisorEmergencyKlaxon();
  };

  const totalSupervisors = alert.supervisorsAlerted.length;
  const acknowledgedCount = alert.supervisorsAlerted.filter(
    (s) => s.status === 'ACKNOWLEDGED' || s.status === 'EN_ROUTE' || ackState[s.gangId]
  ).length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.25 }}
        id="supervisor-push-realtime-banner"
        className="mb-4 rounded-xl bg-gradient-to-r from-red-950 via-slate-950 to-red-950 border-2 border-red-500 shadow-2xl shadow-red-950/80 overflow-hidden font-mono text-slate-100 relative"
      >
        {/* Animated pulsing red top indicator line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-400 to-red-600 animate-pulse" />

        {/* Ambient background alert glow */}
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Header Bar */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-red-600/30 border border-red-400 text-red-300 animate-bounce shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-red-300" />
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-red-600 text-white tracking-wider flex items-center gap-1 shadow-sm">
                    <Radio className="w-3 h-3 animate-pulse" />
                    REAL-TIME SUPERVISOR PUSH ALERT
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-black/60 border border-red-500/80 text-amber-300">
                    CRITICAL PRIORITY
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Pushed to nearby field gangs at {new Date(alert.reportedAt).toLocaleTimeString()}
                  </span>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white mt-1 flex items-center gap-2 flex-wrap">
                  <span>{alert.defectType}</span>
                  <span className="text-xs font-mono font-normal text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800">
                    Section: {alert.section} ({alert.corridorName})
                  </span>
                </h3>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleReplayKlaxon}
                className="p-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title="Replay Railway Emergency Alert Klaxon"
              >
                <Volume2 className="w-3.5 h-3.5 text-red-300" />
                <span className="hidden md:inline text-[10px] font-bold">Klaxon</span>
              </button>

              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                title={expanded ? 'Collapse Supervisors list' : 'Expand Supervisors list'}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-[10px]">Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span className="hidden md:inline text-[10px]">
                      {totalSupervisors} Gangs ({acknowledgedCount} Ack)
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
                title="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Delivery Channel Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-0.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[9px] mr-1">
              Dispatch Channels:
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-600 flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" />
              Railway VHF Radio (Auto Broadcast)
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" />
              CUG Mobile Instant Push SMS
            </span>
            <span
              className={`px-2 py-0.5 rounded border flex items-center gap-1 ${
                alert.browserPushDelivered
                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              <Zap className="w-2.5 h-2.5" />
              {alert.browserPushDelivered ? 'Web Push: Delivered ✓' : 'In-App Active Broadcast'}
            </span>
            {alert.chainageKm && (
              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                Chainage: {alert.chainageKm}
              </span>
            )}
          </div>

          {/* Expanded Supervisor Targets Grid */}
          {expanded && (
            <div className="space-y-2 pt-1 border-t border-red-900/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] font-bold text-red-200 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-red-400" />
                  <span>
                    Designated Section Maintenance Supervisors Alerted ({totalSupervisors}):
                  </span>
                </span>
                <span className="text-[10px] text-slate-300 font-bold">
                  {acknowledgedCount}/{totalSupervisors} Supervisors Acknowledged
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {alert.supervisorsAlerted.map((sup) => {
                  const currentStatus = ackState[sup.gangId] || sup.status;
                  const isAck = currentStatus === 'ACKNOWLEDGED' || currentStatus === 'EN_ROUTE';

                  return (
                    <div
                      key={sup.gangId}
                      className={`p-2.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                        isAck
                          ? 'bg-emerald-950/60 border-emerald-600/80 text-emerald-100'
                          : 'bg-black/70 border-red-800/80 text-slate-200'
                      }`}
                    >
                      {/* Supervisor Header */}
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1 text-[11.5px]">
                            <span>{sup.supervisorName}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate max-w-[210px]">
                            {sup.designation}
                          </p>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase shrink-0 ${
                            currentStatus === 'EN_ROUTE'
                              ? 'bg-blue-950 text-blue-300 border-blue-500 animate-pulse'
                              : isAck
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                              : 'bg-red-950 text-red-300 border-red-500 animate-pulse'
                          }`}
                        >
                          {currentStatus === 'EN_ROUTE' ? 'EN ROUTE' : currentStatus}
                        </span>
                      </div>

                      {/* Distance & Assigned Section */}
                      <div className="flex items-center justify-between text-[10px] text-slate-300 font-mono pt-0.5">
                        <span className="flex items-center gap-1 text-amber-300 font-bold">
                          <Navigation className="w-3 h-3 text-amber-400" />
                          <span>{sup.distanceKm} km from defect</span>
                        </span>
                        <span className="text-slate-400">ETA ~{sup.responseEtaMinutes} min</span>
                      </div>

                      <div className="text-[10px] text-slate-400 truncate">
                        Section: <span className="text-slate-200">{sup.assignedSection}</span>
                      </div>

                      {/* Contact & Radio Details */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800/80">
                        <span className="text-sky-300 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5" />
                          {sup.cugMobile}
                        </span>
                        <span className="text-slate-400 text-[9px] truncate max-w-[130px]">
                          {sup.radioChannel}
                        </span>
                      </div>

                      {/* Action buttons for testing / acknowledging */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {!isAck ? (
                          <button
                            type="button"
                            onClick={(e) => handleAcknowledge(sup.gangId, e)}
                            className="w-full py-1 rounded bg-red-900/80 hover:bg-emerald-800 text-white font-bold text-[10px] transition-colors border border-red-600 hover:border-emerald-500 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <UserCheck className="w-3 h-3 text-emerald-300" />
                            <span>Simulate Supervisor Ack</span>
                          </button>
                        ) : (
                          <div className="w-full py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] flex items-center justify-center gap-1 border border-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Safety Alert Acknowledged</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
