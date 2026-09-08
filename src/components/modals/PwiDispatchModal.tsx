import React, { useState } from 'react';
import {
  Send,
  Copy,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  Clock,
  MapPin,
  Users,
} from 'lucide-react';
import { PwiDispatchMessage } from '../../types';

interface PwiDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  dispatchData: PwiDispatchMessage | null;
}

export const PwiDispatchModal: React.FC<PwiDispatchModalProps> = ({
  isOpen,
  onClose,
  dispatchData,
}) => {
  const [activeTab, setActiveTab] = useState<'ENGLISH' | 'HINDI'>('HINDI');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !dispatchData) return null;

  const currentText = activeTab === 'HINDI' ? dispatchData.hindiText : dispatchData.englishText;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(currentText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div
      id="pwi-dispatch-modal"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-[#0b1329] border border-emerald-800/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/60 bg-[#070e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950 border border-emerald-600/80 text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono tracking-wide uppercase">
                  PWI Field Gang Operational Dispatch
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                  DIRECT MEMO
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant WhatsApp / SMS Dispatch for Section PWI & Track Maintenance Gang
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono text-slate-200">
          {/* Target Metadata Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" /> SECTION
              </span>
              <span className="font-bold text-slate-200">{dispatchData.section}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> TIME SLOT
              </span>
              <span className="font-bold text-amber-300">{dispatchData.startTime}–{dispatchData.endTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] flex items-center gap-1">
                <Users className="w-3 h-3 text-emerald-400" /> FIELD GANG
              </span>
              <span className="font-bold text-emerald-400">{dispatchData.gangNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">PWI INCHARGE</span>
              <span className="font-bold text-slate-200">{dispatchData.pwiName}</span>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Dispatch Message Preview:</span>
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('HINDI')}
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  activeTab === 'HINDI'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिन्दी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ENGLISH')}
                className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                  activeTab === 'ENGLISH'
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
            </div>
          </div>

          {/* Formatted Message Box */}
          <div className="p-4 rounded-xl bg-[#070e1e] border border-slate-800 text-slate-300 whitespace-pre-line leading-relaxed font-mono text-[11px] relative shadow-inner">
            {currentText}
          </div>

          {/* Field Safety Checklist */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <span className="text-emerald-400 font-bold text-[11px] uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Pre-Block Site Clearance Protocol:
            </span>
            <ul className="space-y-1 text-slate-400 text-[10px] pl-4 list-disc">
              {dispatchData.safetyChecklist.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-emerald-900/60 bg-[#070e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400">
            Dispatches encrypted message to field supervisor WhatsApp & Railway CUG mobile.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Message'}</span>
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Share via WhatsApp / SMS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
