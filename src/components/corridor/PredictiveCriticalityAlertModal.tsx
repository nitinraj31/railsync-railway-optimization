import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle2,
  X,
  ShieldAlert,
  ArrowRight,
  Radio,
  Layers,
  Sparkles,
  Users,
  Zap,
  Gauge,
  MapPin,
  Calendar,
} from 'lucide-react';
import { HeatmapTrackSegment } from '../../services/corridorTrackSegmentHeatmapService';
import { MaintenanceTask, DepartmentType } from '../../types';
import { addMaintenanceTask } from '../../services/api';
import { railwayAudio } from '../../services/railwayAudio';

interface PredictiveCriticalityAlertModalProps {
  segment: HeatmapTrackSegment | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: (task: MaintenanceTask, segment: HeatmapTrackSegment) => void;
  metricMode?: 'SEVERITY' | 'DURATION' | 'COMPOSITE';
}

export const PredictiveCriticalityAlertModal: React.FC<PredictiveCriticalityAlertModalProps> = ({
  segment,
  isOpen,
  onClose,
  onTaskCreated,
  metricMode = 'SEVERITY',
}) => {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdTask, setCreatedTask] = useState<MaintenanceTask | null>(null);

  // Play caution hooter when the modal automatically triggers
  useEffect(() => {
    if (isOpen && segment) {
      railwayAudio.playBurstingHooter();
      setCreatedTask(null);
    }
  }, [isOpen, segment?.segmentId]);

  if (!isOpen || !segment) return null;

  // One-click action to create a new maintenance task for this specific segment
  const handleOneClickCreateTask = async () => {
    if (!segment || isSubmitting) return;

    try {
      setIsSubmitting(true);
      railwayAudio.playBeep(750, 0.08);

      const taskIdNumber = Math.floor(1000 + Math.random() * 9000);
      const taskId = `TSK-CRIT-${taskIdNumber}`;
      const todayStr = new Date().toISOString().split('T')[0];

      // Format work requisition description
      const taskDescription = `[PREDICTIVE CRITICALITY DISPATCH] Urgent remediation of ${segment.primaryDefectCategory} on ${segment.corridorCode} (${segment.fromStation} ↔ ${segment.toStation}, KM ${segment.startKm}-${segment.endKm}). Mandatory block possession: ${segment.expectedRepairDurationMinutes}m (${segment.expectedRepairDurationHours}h). Machinery: ${segment.recommendedMachinery}. Gang strength: ${segment.requiredGangStrength} men. Threatened trains: ${segment.threatenedTrainsCount}. Standard: ${segment.statutoryStandard}.`;

      const newTask: MaintenanceTask = {
        id: `TASK-CRIT-${segment.corridorId}-${segment.segmentId}-${Date.now()}`,
        taskId,
        assetId: `TRK-${segment.segmentId}`,
        department: (segment.recommendedDepartment as DepartmentType) || 'ENGINEERING',
        taskType: 'CRITICAL_TRACK_DEFECT_REPAIR',
        description: taskDescription,
        corridorId: segment.corridorId,
        durationMinutes: segment.expectedRepairDurationMinutes || 150,
        priority: 'CRITICAL',
        status: 'SCHEDULED',
        preferredTimeWindow: segment.recommendedTimeSlot || '01:30 - 04:00 (Night Mega-Block)',
        requestedDate: todayStr,
      };

      // Persist task to application store/localStorage
      await addMaintenanceTask(newTask);

      // Auditory confirmation chime
      railwayAudio.playSuccessTone();

      setCreatedTask(newTask);

      if (onTaskCreated) {
        onTaskCreated(newTask, segment);
      }
    } catch (err) {
      console.error('Failed to create critical maintenance task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="predictive-criticality-alert-modal"
      data-testid="predictive-criticality-alert-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div className="bg-[#0b1022] border-2 border-rose-500 rounded-2xl max-w-2xl w-full p-5 md:p-6 space-y-5 shadow-2xl relative font-mono text-xs overflow-hidden ring-4 ring-rose-500/20">
        {/* Pulsing warning backdrop glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Hazard Header Banner */}
        <div className="flex items-start justify-between gap-3 pb-3.5 border-b border-rose-900/60 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1.5 rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-900/50 animate-bounce">
                <Flame className="w-4 h-4 text-white" />
              </span>
              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-950 border border-rose-600 text-rose-300 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>PREDICTIVE CRITICALITY ALERT</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-800">
                STATUS SWITCHED TO 'CRITICAL'
              </span>
            </div>

            <h2 id="alert-modal-title" className="text-base md:text-lg font-bold text-white tracking-wide pt-1">
              Corridor {segment.corridorCode}: {segment.fromStation} ↔ {segment.toStation}
            </h2>
            <p className="text-xs text-rose-300/90 flex items-center gap-2">
              <span>Chainage: KM {segment.startKm} to {segment.endKm} ({segment.lengthKm} KM)</span>
              <span>•</span>
              <span className="text-slate-300 font-bold">{segment.trackLine}</span>
            </p>
          </div>

          <button
            type="button"
            id="btn-close-critical-alert"
            data-testid="btn-close-critical-alert"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
            title="Dismiss Alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Transition & Critical Trigger Callout */}
        <div className="relative z-10 p-3 rounded-xl bg-rose-950/70 border border-rose-600/80 text-rose-200 space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-rose-300 uppercase tracking-wide text-[11px]">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Real-Time Ingestion Trigger: Threshold Breached</span>
            </span>
            <span className="text-xs font-mono font-black text-rose-400">
              {metricMode === 'SEVERITY'
                ? `SEVERITY SCORE: ${segment.maintenanceSeverityScore}% (CRITICAL)`
                : `ESTIMATED DURATION: ${segment.expectedRepairDurationMinutes} MIN (MEGA-BLOCK)`}
            </span>
          </div>
          <p className="text-[11px] text-rose-100/90 leading-relaxed">
            Automated OMS/USFD sensors flagged a severe defect spike on this segment, transitioning its heat-map status to{' '}
            <strong className="text-rose-400 font-bold underline">'CRITICAL'</strong>. Immediate maintenance intervention and possession block requisition are mandatory to avert mainline disruption.
          </p>
        </div>

        {/* Diagnostic Key Metrics Grid */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Severity Score</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-rose-400">{segment.maintenanceSeverityScore}%</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                CRITICAL
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block">TDI: {segment.trackDegradationIndex}/100</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Gauge Spread</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-amber-300">+{segment.gaugeSpreadMm}mm</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold">
                DRIFT
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block">Nominal: 1676mm</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Repair Window</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-amber-400">{segment.expectedRepairDurationMinutes}m</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold">
                {segment.expectedRepairDurationHours}h
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block">{segment.durationCategory}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase block font-bold">Failure Risk</span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-rose-500">{segment.failureRiskProbabilityPct}%</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                HIGH
              </span>
            </div>
            <span className="text-[9px] text-slate-500 block">{segment.threatenedTrainsCount} Trains At Risk</span>
          </div>
        </div>

        {/* Defect Diagnostics & Operational Threat */}
        <div className="relative z-10 p-3.5 rounded-xl bg-[#080d1c] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-bold text-xs">
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flaw Category: {segment.primaryDefectCategory}</span>
            </span>
            <span className="text-[10px] text-slate-400">{segment.statutoryStandard}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {segment.defectSummary}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px]">
            <div>
              <span className="text-slate-500 block">Recommended Dept</span>
              <span className="font-bold text-sky-300">{segment.recommendedDepartment}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Machinery Required</span>
              <span className="font-bold text-slate-200 truncate block">{segment.recommendedMachinery}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Traction Cut (OHE)</span>
              <span className={segment.tractionIsolationRequired ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {segment.tractionIsolationRequired ? '25kV Isolation Required' : 'Live Track Operation'}
              </span>
            </div>
          </div>
        </div>

        {/* Task Creation Success State or Dispatch Action */}
        <div className="relative z-10 pt-2 border-t border-slate-800 space-y-3">
          {createdTask ? (
            <div
              id="critical-task-created-banner"
              data-testid="critical-task-created-banner"
              className="p-3.5 rounded-xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 space-y-2 shadow-lg animate-in zoom-in-95"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Maintenance Task Created &amp; Requisitioned!</span>
                </span>
                <span className="px-2 py-0.5 rounded font-mono font-black bg-emerald-900 border border-emerald-400 text-emerald-100 text-xs">
                  {createdTask.taskId}
                </span>
              </div>
              <p className="text-[11px] text-emerald-300 leading-relaxed">
                Work Order logged in maintenance registry for <strong>{segment.fromStation} ↔ {segment.toStation}</strong>. Scheduled possession window:{' '}
                <strong>{createdTask.preferredTimeWindow}</strong> ({createdTask.durationMinutes} mins).
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-emerald-800/60">
                <span>Priority: <strong className="text-rose-400">CRITICAL</strong></span>
                <span>Department: <strong className="text-white">{createdTask.department}</strong></span>
                <span>Status: <strong className="text-emerald-400">{createdTask.status}</strong></span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between gap-3 text-[11px] text-amber-200">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Recommended Block Window: <strong className="text-white">{segment.recommendedTimeSlot}</strong></span>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-bold uppercase shrink-0">
                Gang: {segment.requiredGangStrength} Men
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <button
              type="button"
              id="btn-dismiss-critical-alert"
              data-testid="btn-dismiss-critical-alert"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold cursor-pointer transition-colors"
            >
              {createdTask ? 'Done / Close Alert' : 'Acknowledge / Snooze Alert'}
            </button>

            {!createdTask && (
              <button
                type="button"
                id="btn-create-critical-maintenance-task"
                data-testid="btn-create-critical-maintenance-task"
                onClick={handleOneClickCreateTask}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-white bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-xl shadow-rose-950/60 ring-2 ring-rose-400 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching Work Order...</span>
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 text-white" />
                    <span>⚡ 1-Click Create Maintenance Task for This Segment</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
