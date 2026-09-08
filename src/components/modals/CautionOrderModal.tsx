import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Copy,
  Check,
  Share2,
  X,
  AlertTriangle,
  ShieldCheck,
  Train,
} from 'lucide-react';
import { CautionOrderMemo } from '../../types';

interface CautionOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  memo: CautionOrderMemo | null;
}

export const CautionOrderModal: React.FC<CautionOrderModalProps> = ({
  isOpen,
  onClose,
  memo,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !memo) return null;

  const handleCopy = () => {
    const text = `
INDIAN RAILWAYS - FORM T/409 (CAUTION ORDER & DISCONNECTION MEMO)
================================================================
MEMO NO: ${memo.memoNumber}
DATE & TIME: ${memo.issuedTimestamp}
DIVISION: ${memo.division} (${memo.zone})
STATION MASTER OFFICE: ${memo.stationMasterOffice}
SECTION CONTROLLER: ${memo.sectionController}
----------------------------------------------------------------
CORRIDOR: ${memo.corridorName} (${memo.corridorId})
BLOCK SECTION: ${memo.blockSection}
TRACK LINE: ${memo.trackLine} | KM: ${memo.kmFrom} to ${memo.kmTo}
NATURE OF WORK: ${memo.workNature}
CAUTION TYPE: ${memo.cautionType} (SPEED LIMIT: ${memo.allowedSpeedKmph} KM/H)
EFFECTIVE DURATION: ${memo.effectiveFrom} to ${memo.effectiveUntil}
PWI INCHARGE: ${memo.pwiIncharge}
AUTHORITY: ${memo.safetyOfficerApproval}
----------------------------------------------------------------
SPECIAL INSTRUCTIONS:
${memo.specialInstructions.map((ins, idx) => `${idx + 1}. ${ins}`).join('\n')}
================================================================
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="caution-order-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-amber-800/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-900/60 bg-[#0d1629]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-950 border border-amber-700/80 text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-amber-200 font-mono tracking-wide uppercase">
                  Indian Railways Form T/409 Caution Order
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                  G&SR COMPLIANT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory Track Disconnection & Speed Restriction Memo for Loco-Pilot, Guard & Station Master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Paper Document Preview */}
        <div className="p-6 overflow-y-auto text-slate-800 text-xs font-mono">
          <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-300/80 shadow-inner space-y-4 relative overflow-hidden">
            {/* Watermark seal */}
            <div className="absolute right-4 top-4 opacity-10 pointer-events-none select-none">
              <Train className="w-48 h-48 text-amber-900" />
            </div>

            {/* IR Formal Header */}
            <div className="text-center border-b border-amber-900/20 pb-3">
              <div className="text-[11px] font-bold tracking-widest text-amber-900 uppercase">
                {memo.zone} • {memo.division}
              </div>
              <h1 className="text-base font-black text-amber-950 tracking-wider uppercase mt-0.5">
                FORM T/409: CAUTION ORDER & TRAFFIC BLOCK MEMO
              </h1>
              <div className="text-[10px] text-amber-800 mt-0.5">
                Issued in accordance with Indian Railways General Rules 4.09 & Subsidiary Rules (G&SR)
              </div>
            </div>

            {/* Memo Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-amber-100/70 p-3 rounded-lg border border-amber-200">
              <div>
                <span className="text-amber-700 block text-[10px]">MEMO NUMBER:</span>
                <span className="font-bold text-amber-950">{memo.memoNumber}</span>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px]">ISSUED AT:</span>
                <span className="font-bold text-amber-950">{memo.issuedTimestamp}</span>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px]">CORRIDOR:</span>
                <span className="font-bold text-amber-950">{memo.corridorId}</span>
              </div>
              <div>
                <span className="text-amber-700 block text-[10px]">LINE STATUS:</span>
                <span className="font-bold text-rose-800 uppercase">{memo.trackLine}</span>
              </div>
            </div>

            {/* Operational Block Details */}
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-white/80 border border-amber-200">
                  <span className="text-slate-500 text-[10px] block">BLOCK SECTION:</span>
                  <span className="font-bold text-slate-900">{memo.blockSection}</span>
                </div>
                <div className="p-2.5 rounded bg-white/80 border border-amber-200">
                  <span className="text-slate-500 text-[10px] block">KILOMETER LIMITS:</span>
                  <span className="font-bold text-slate-900">{memo.kmFrom} to {memo.kmTo}</span>
                </div>
              </div>

              <div className="p-2.5 rounded bg-rose-100/70 border border-rose-300 text-rose-950 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase text-[11px]">
                    Caution Restriction: {memo.cautionType} (Speed: {memo.allowedSpeedKmph} km/h)
                  </span>
                  <span className="text-[10px] text-rose-800 leading-snug">
                    Effective: {memo.effectiveFrom} to {memo.effectiveUntil}. Total Line Disconnection granted for track & point machine maintenance.
                  </span>
                </div>
              </div>
            </div>

            {/* Nature of Work */}
            <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-[11px]">
              <span className="text-amber-900 font-bold block text-[10px] uppercase">Nature of Engineering Work:</span>
              <p className="text-slate-800 mt-0.5">{memo.workNature}</p>
            </div>

            {/* Mandatory Safety Instructions */}
            <div className="bg-white/80 p-3 rounded-lg border border-amber-200 text-[11px] space-y-1">
              <span className="text-amber-900 font-bold block text-[10px] uppercase">
                Special Operating & Safety Instructions (Mandatory):
              </span>
              <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[10px]">
                {memo.specialInstructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            {/* Signatures & Approvals */}
            <div className="pt-2 border-t border-amber-900/20 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] text-amber-900">
              <div>
                <span className="text-amber-700 block">PWI / SSE (P-WAY):</span>
                <span className="font-bold text-slate-900">{memo.pwiIncharge}</span>
              </div>
              <div>
                <span className="text-amber-700 block">STATION MASTER:</span>
                <span className="font-bold text-slate-900">Signed & Countersigned</span>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-amber-700 block">SAFETY CERTIFICATION:</span>
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {memo.safetyOfficerApproval}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-amber-900/60 bg-[#0d1629] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Certified copy can be dispatched electronically to Station Master Cabins.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Memo Text'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-sky-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors border border-blue-700"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official T/409</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs font-mono cursor-pointer transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
