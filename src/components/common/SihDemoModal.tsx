import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BrainCircuit,
  Wrench,
  AlertTriangle,
  CalendarClock,
  Layers,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { UserRole } from '../../types';

interface SihDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
  onSelectRole: (role: UserRole) => void;
  onTriggerGeneratePlan: () => void;
  onAutoResolveConflicts: () => void;
}

interface Step {
  num: number;
  title: string;
  role: UserRole;
  roleLabel: string;
  screen: string;
  description: string;
  actionText: string;
  keyObservation: string;
  tag: string;
}

export const SihDemoModal: React.FC<SihDemoModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectRole,
  onTriggerGeneratePlan,
  onAutoResolveConflicts,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const steps: Step[] = [
    {
      num: 1,
      title: 'Login as Engineering Officer',
      role: 'ENGINEERING_OFFICER',
      roleLabel: 'Er. Rajesh Verma (Sr. DEN / Track)',
      screen: 'requests',
      description:
        'Start the demonstration as the Engineering Officer responsible for track maintenance on the Northern Main Corridors.',
      actionText: 'Switch Persona & Open Submit Request',
      keyObservation:
        'Shows role-tailored view with departmental asset filters and pending request tracker.',
      tag: 'Step 1 of 15',
    },
    {
      num: 2,
      title: 'Submit New Maintenance Block Request',
      role: 'ENGINEERING_OFFICER',
      roleLabel: 'Engineering Officer',
      screen: 'requests',
      description:
        'Submit a real maintenance block request for Asset A018 on Corridor C003 with 90-minute required duration and priority HIGH.',
      actionText: 'Open Request Form',
      keyObservation:
        'The frontend sends this request to the Python backend which syncs with Google Apps Script & Sheets.',
      tag: 'Step 2 of 15',
    },
    {
      num: 3,
      title: 'Generate Official Request ID',
      role: 'ENGINEERING_OFFICER',
      roleLabel: 'Engineering Officer',
      screen: 'requests',
      description:
        'Upon submission, the system generates a standardized ID like REQ-2026-036 with status PENDING AI PLANNING.',
      actionText: 'Inspect Request History List',
      keyObservation:
        'Demonstrates live operational acceptance rather than static pre-baked dashboard data.',
      tag: 'Step 3 of 15',
    },
    {
      num: 4,
      title: 'Switch Role to Railway Planner',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Smt. Ananya Sen (Chief Block Coordinator)',
      screen: 'planning',
      description:
        'Switch persona to the Railway Planner at Central Operations Control to initiate centralized AI block planning.',
      actionText: 'Switch to Planner Persona',
      keyObservation:
        'Role-based access activates the AI Planning Engine, Conflict Management, and Publication gates.',
      tag: 'Step 4 of 15',
    },
    {
      num: 5,
      title: 'Run AI-Powered Optimization Engine',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'planning',
      description:
        'Click "GENERATE OPTIMIZED PLAN" to execute multi-department priority analysis, defect matching, and train headway collision detection.',
      actionText: 'Open Planning & Run Engine',
      keyObservation:
        'Visualizes the 9-stage pipeline from Data Ingestion down to Conflict Resolution and Final Validation.',
      tag: 'Step 5 of 15',
    },
    {
      num: 6,
      title: 'Inspect Explainable AI (XAI) Slot Factors',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'planning',
      description:
        'Open the "WHY THIS SLOT?" explainability drawer for any block to inspect asset availability, headway buffers, and disruption factors.',
      actionText: 'View Explainable AI Panel',
      keyObservation:
        'No black box AI — every scheduled slot has explicit, auditable constraint check results.',
      tag: 'Step 6 of 15',
    },
    {
      num: 7,
      title: 'Open Block Timeline Grid',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'timeline',
      description:
        'Inspect the multi-corridor Gantt schedule across C001, C002, C003, and C004 from 08:00 to 20:00.',
      actionText: 'View Corridor Schedule Timeline',
      keyObservation:
        'Visual comparison of train paths (e.g. Vande Bharat TR106) with maintenance blocks.',
      tag: 'Step 7 of 15',
    },
    {
      num: 8,
      title: 'Detect Train-Block Overlap Conflict',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'timeline',
      description:
        'Identify the critical conflict on Corridor C003: BLK-T012 (14:00–15:30) overlaps directly with Vande Bharat TR106 (14:45–15:05).',
      actionText: 'Highlight Conflict BLK-T012 ⚠',
      keyObservation:
        'Conflicts are clearly surfaced with flashing warning indicators rather than silently hidden.',
      tag: 'Step 8 of 15',
    },
    {
      num: 9,
      title: 'Open Conflict & Resolution Center',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'conflicts',
      description:
        'View the 5 remaining critical validation issues: BLK-T012, BLK-S034, BLK-E044, BLK-S001, BLK-E007.',
      actionText: 'Go to Conflict Center',
      keyObservation:
        'Summary demonstrates 23 initial conflicts reduced down to 5 critical validation blockers.',
      tag: 'Step 9 of 15',
    },
    {
      num: 10,
      title: 'Query Candidate Alternative Slots',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'conflicts',
      description:
        'Click "FIND ALTERNATIVE SLOT" on BLK-T012 to receive AI-evaluated candidate slots with optimization scores.',
      actionText: 'Inspect Alternative Slots',
      keyObservation:
        'Backend algorithm ranks alternatives by disruption minimization and headway safety margin.',
      tag: 'Step 10 of 15',
    },
    {
      num: 11,
      title: 'Apply Alternative Slot & Reschedule',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'conflicts',
      description:
        'Select slot 12:15–13:45 (Score: 96.4) and click "APPLY ALTERNATIVE SLOT" to resolve the conflict.',
      actionText: 'Apply Slot & Resolve',
      keyObservation:
        'Block is updated on the live timeline and the train path conflict is cleared.',
      tag: 'Step 11 of 15',
    },
    {
      num: 12,
      title: 'Check Final Safety Validation Gate',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'validation',
      description:
        'Navigate to Final Safety Validation to view the 7-point safety checklist and publishing lock status.',
      actionText: 'Open Final Safety Gate',
      keyObservation:
        'If any critical issues remain, the system enforces PUBLISHING LOCKED to prevent unsafe operations.',
      tag: 'Step 12 of 15',
    },
    {
      num: 13,
      title: 'Clear All Conflicts & Pass Safety Gate',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'validation',
      description:
        'Resolve the remaining conflicts to achieve 100% checklist pass and switch gate status to SAFE TO PUBLISH.',
      actionText: 'Resolve Remaining & Pass Gate',
      keyObservation:
        'All 42 blocks now verified valid, unlocking the formal publication workflow.',
      tag: 'Step 13 of 15',
    },
    {
      num: 14,
      title: 'Publish Approved Maintenance Schedule',
      role: 'RAILWAY_PLANNER',
      roleLabel: 'Railway Planner',
      screen: 'validation',
      description:
        'Execute controlled publication with planner sign-off, locking the operational timetable.',
      actionText: 'Publish Schedule',
      keyObservation:
        'System updates publication state from VALIDATION to APPROVED and PUBLISHED.',
      tag: 'Step 14 of 15',
    },
    {
      num: 15,
      title: 'Verify Traceable Audit Log',
      role: 'SUPER_ADMIN',
      roleLabel: 'Super Admin / Safety Auditor',
      screen: 'system',
      description:
        'Review the complete timestamped audit trail showing every user action, AI optimization run, conflict resolution, and publication event.',
      actionText: 'View Audit Log Trail',
      keyObservation:
        'Full compliance with Indian Railways safety auditing and decision-support traceability standards.',
      tag: 'Step 15 of 15',
    },
  ];

  if (!isOpen) return null;

  const currentStep = steps[currentStepIndex];

  const handleExecuteCurrentStep = () => {
    onSelectRole(currentStep.role);
    onNavigate(currentStep.screen);

    if (currentStep.num === 5) {
      onTriggerGeneratePlan();
    } else if (currentStep.num === 13) {
      onAutoResolveConflicts();
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0e162c] border border-sky-800/80 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sky-950/80 bg-[#0a1020]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-blue-600/30 border border-blue-500/40 text-sky-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                  Smart India Hackathon Live Evaluation Guide
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800">
                  {currentStep.tag}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                15-step interactive demonstration of the end-to-end operational workflow
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:text-white text-slate-400 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="h-1 bg-slate-800 w-full">
          <div
            className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        {/* Step Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 font-semibold">
                Step {currentStep.num}: {currentStep.title}
              </span>
              <h2 className="text-lg font-bold text-slate-100 mt-1 leading-snug">
                {currentStep.title}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-mono text-slate-400 block">Active Persona:</span>
              <span className="text-xs font-semibold text-amber-300 font-mono">
                {currentStep.roleLabel}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            {currentStep.description}
          </p>

          <div className="p-3 rounded-lg bg-blue-950/30 border border-sky-900/40 text-xs">
            <div className="text-[10px] uppercase font-mono tracking-wider text-sky-400 font-semibold mb-1">
              Key SIH Evaluation Checkpoint:
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {currentStep.keyObservation}
            </p>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs flex items-center gap-1 font-medium"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous Step
            </button>

            <button
              type="button"
              onClick={handleExecuteCurrentStep}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-blue-900/40 transform active:scale-95 transition-all"
            >
              <span>{currentStep.actionText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Jump Carousel */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-[#0a1020] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[440px]">
            {steps.map((s, idx) => (
              <button
                key={s.num}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-6 h-6 rounded-full text-[10px] font-mono flex items-center justify-center transition-all ${
                  idx === currentStepIndex
                    ? 'bg-sky-500 text-white font-bold ring-2 ring-sky-400/50'
                    : idx < currentStepIndex
                    ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    : 'bg-slate-900 text-slate-600 hover:bg-slate-800'
                }`}
                title={s.title}
              >
                {s.num}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
