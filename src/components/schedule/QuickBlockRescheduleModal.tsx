import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { OptimizedBlock } from '../../types';
import { scheduleAutoSaveService } from '../../services/scheduleAutoSaveService';

interface QuickBlockRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: OptimizedBlock[];
  initialBlockId?: string | null;
  onScheduleUpdated?: () => void;
}

export const QuickBlockRescheduleModal: React.FC<QuickBlockRescheduleModalProps> = ({
  isOpen,
  onClose,
  blocks,
  initialBlockId,
  onScheduleUpdated,
}) => {
  if (!isOpen) return null;

  const defaultBlock =
    (initialBlockId && blocks.find((b) => b.blockId === initialBlockId)) ||
    blocks[0] ||
    null;

  const [selectedBlockId, setSelectedBlockId] = useState<string>(
    defaultBlock?.blockId || ''
  );
  const currentBlock = blocks.find((b) => b.blockId === selectedBlockId) || defaultBlock;

  const [startTime, setStartTime] = useState<string>(currentBlock?.startTime || '10:00');
  const [endTime, setEndTime] = useState<string>(currentBlock?.endTime || '11:30');
  const [duration, setDuration] = useState<number>(currentBlock?.durationMinutes || 90);
  const [reason, setReason] = useState<string>('Pre-emptive safety buffer adjustment');
  const [bufferAdd, setBufferAdd] = useState<number>(15);

  // When selected block changes, sync times
  const handleBlockChange = (blockId: string) => {
    setSelectedBlockId(blockId);
    const b = blocks.find((x) => x.blockId === blockId);
    if (b) {
      setStartTime(b.startTime);
      setEndTime(b.endTime);
      setDuration(b.durationMinutes || 90);
    }
  };

  const handleApplyQuickShift = (minutes: number) => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return;

    const startTotal = (sh * 60 + sm + minutes + 1440) % 1440;
    const endTotal = (eh * 60 + em + minutes + 1440) % 1440;

    const pad = (n: number) => n.toString().padStart(2, '0');
    setStartTime(`${pad(Math.floor(startTotal / 60))}:${pad(startTotal % 60)}`);
    setEndTime(`${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}`);
    setReason(`Time shift applied: ${minutes > 0 ? `+${minutes}` : minutes} minutes buffer`);
  };

  const handleSaveDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBlock) return;

    scheduleAutoSaveService.updateBlockSchedule(
      currentBlock.blockId,
      {
        startTime,
        endTime,
        durationMinutes: duration,
      },
      reason
    );

    onScheduleUpdated?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0b1329] border border-sky-800/60 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-sky-950 via-[#0e172e] to-[#080f24] border-b border-sky-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 font-mono">
                Reschedule Blocking Window
              </h3>
              <p className="text-xs text-slate-400">
                Changes will auto-save locally and prompt for backend commit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSaveDraft} className="p-5 space-y-4">
          {/* SELECT BLOCK */}
          <div>
            <label className="block text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
              Select Maintenance Block to Reschedule
            </label>
            <select
              value={selectedBlockId}
              onChange={(e) => handleBlockChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {blocks.map((b) => (
                <option key={b.blockId} value={b.blockId}>
                  {b.blockId} — Corridor {b.corridorId} ({b.department}) [{b.startTime}–{b.endTime}]
                </option>
              ))}
            </select>
          </div>

          {currentBlock && (
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 font-mono text-xs flex flex-wrap items-center justify-between gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">SECTION</span>
                <span>{currentBlock.section}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CORRIDOR</span>
                <span className="text-sky-400 font-bold">{currentBlock.corridorId}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">CURRENT SLOT</span>
                <span className="text-amber-400 font-bold">
                  {currentBlock.startTime}–{currentBlock.endTime}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">STATUS</span>
                <span className="text-emerald-400">{currentBlock.status}</span>
              </div>
            </div>
          )}

          {/* QUICK SHIFT SHORTCUTS */}
          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wide mb-1.5">
              Quick Safety Buffer Adjustments
            </label>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => handleApplyQuickShift(-15)}
                className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors text-center"
              >
                -15m Earlier
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickShift(15)}
                className="p-2 rounded bg-amber-950/50 hover:bg-amber-900/60 border border-amber-700/60 text-amber-300 font-bold transition-colors text-center"
              >
                +15m Later
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickShift(30)}
                className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors text-center"
              >
                +30m Later
              </button>
              <button
                type="button"
                onClick={() => handleApplyQuickShift(60)}
                className="p-2 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors text-center"
              >
                +60m Later
              </button>
            </div>
          </div>

          {/* TIME INPUTS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                New Start Time (HH:MM)
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                New End Time (HH:MM)
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* DURATION & REASON */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={30}
                max={360}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase tracking-wide mb-1.5">
                Modification Justification
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                placeholder="e.g. Avoid train clash with Express #12004"
              />
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              <span>Auto-save will immediately record this draft</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-amber-950/40 transition-colors"
              >
                <span>Apply Schedule Revision</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
