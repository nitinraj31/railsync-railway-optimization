import React, { useState } from 'react';
import {
  ShadowBlockTelemetry,
  SlipstreamScenario,
} from '../../types';
import { generateMovingBlockPermit } from '../../services/shadowBlockService';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Printer,
  FileCheck2,
  QrCode,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface ShadowBlockPermitModalProps {
  isOpen: boolean;
  onClose: () => void;
  telemetry: ShadowBlockTelemetry;
  scenario: SlipstreamScenario;
  onCommitToMasterSchedule: () => void;
}

export const ShadowBlockPermitModal: React.FC<ShadowBlockPermitModalProps> = ({
  isOpen,
  onClose,
  telemetry,
  scenario,
  onCommitToMasterSchedule,
}) => {
  const [committed, setCommitted] = useState(false);

  if (!isOpen) return null;

  const permit = generateMovingBlockPermit(telemetry, scenario);

  const handleCommit = () => {
    setCommitted(true);
    setTimeout(() => {
      onCommitToMasterSchedule();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0b1329] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative overflow-hidden flex flex-col gap-5 text-slate-200 font-mono">
        {/* Decorative Watermark */}
        <div className="absolute right-[-40px] bottom-[-40px] opacity-5 pointer-events-none text-white">
          <ShieldCheck className="w-80 h-80" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-sky-900/60 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  INDIAN RAILWAYS MOVING BLOCK AUTHORIZATION
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  FORM T/A-912-MB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official Authorization under General & Subsidiary Rules (G&SR 4.08/MB)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="bg-[#070c1a] p-5 rounded-xl border border-slate-800 space-y-4 text-xs relative z-10">
          <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-slate-400 block text-[11px]">Permit Number:</span>
              <span className="text-white font-bold text-sm tracking-wider">{permit.permitNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Issuing Authority:</span>
              <span className="text-cyan-300 font-bold">{permit.issuedBy}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Authorized Machine:</span>
              <span className="text-white font-bold">{scenario.machine.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Crew Chief / Pilot:</span>
              <span className="text-slate-300">{scenario.machine.crewChief}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-slate-400 block text-[11px]">Authorized Corridor Track:</span>
              <span className="text-white font-semibold">{permit.authorizedSection}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block text-[11px]">Mandatory Egress Siding:</span>
                <span className="text-purple-300 font-bold">{permit.mandatoryEgressStation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Kavach Safety Headway Envelope:</span>
                <span className="text-emerald-300 font-bold">
                  {permit.safetyEnvelopeKm.toFixed(1)} KM minimum
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Hash & RDSO Validation Token */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-cyan-900/40 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3 text-cyan-400" />
                Cryptographic ATP Dispatch Token
              </span>
              <span className="text-cyan-300 font-mono text-[11px] font-bold">
                {permit.authorizationToken}
              </span>
            </div>
            <div className="p-2 bg-white rounded border border-slate-300 shadow-sm shrink-0">
              <QrCode className="w-6 h-6 text-slate-950" />
            </div>
          </div>

          {/* Zero Delay Verification Box */}
          <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-500/40 flex items-center gap-2.5 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              <strong>Zero Passenger Delay Certified:</strong> Trailing train ({scenario.trailTrain.name}) maintains unrestricted clear line speed with Kavach SIL-4 dynamic headway protection.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 relative z-10">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Printer className="w-4 h-4" />
            <span>Print Form</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Dismiss
            </button>

            <button
              id="commit-shadow-block-schedule-btn"
              onClick={handleCommit}
              disabled={committed}
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-950/60 transition-all disabled:opacity-50"
            >
              {committed ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Committed to Master Schedule!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>Commit to Master Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
