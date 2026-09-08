import React, { useState } from 'react';
import {
  Train as TrainIcon,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
import { Train, TrainCategory } from '../../types';

interface TrainOperationsScreenProps {
  trains: Train[];
  onNavigateToConflict: (blockId?: string) => void;
  onNavigateToBlockTimeline: () => void;
}

export const TrainOperationsScreen: React.FC<TrainOperationsScreenProps> = ({
  trains,
  onNavigateToConflict,
  onNavigateToBlockTimeline,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterConflictOnly, setFilterConflictOnly] = useState(false);

  const filteredTrains = trains.filter((t) => {
    if (filterCategory !== 'ALL' && t.category !== filterCategory) return false;
    if (filterCorridor !== 'ALL' && t.corridorId !== filterCorridor) return false;
    if (filterConflictOnly && !t.conflictWithBlockId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.trainNumber.toLowerCase().includes(q) ||
        t.trainName.toLowerCase().includes(q) ||
        t.originStation.toLowerCase().includes(q) ||
        t.destinationStation.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const conflictTrainsCount = trains.filter((t) => t.conflictWithBlockId).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <TrainIcon className="w-5 h-5 text-indigo-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Train Timetable & Passenger Schedule Operations
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 9 / 120 TRAINS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Authoritative railway timetable across passenger & freight categories. Highlighting train-block conflicts requiring maintenance rescheduling.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onNavigateToBlockTimeline}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium"
            >
              View Dual-Axis Timeline
            </button>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#0a1020] p-4 rounded-xl border border-sky-950/80 shadow-inner flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search Train No, Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 font-mono">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            <option value="VANDE_BHARAT">Vande Bharat</option>
            <option value="RAJDHANI">Rajdhani Express</option>
            <option value="SHATABDI">Shatabdi Express</option>
            <option value="SUPERFAST">Superfast Express</option>
            <option value="EXPRESS">Express</option>
            <option value="FREIGHT">Freight</option>
          </select>

          <select
            value={filterCorridor}
            onChange={(e) => setFilterCorridor(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Corridors</option>
            <option value="C001">C001</option>
            <option value="C002">C002</option>
            <option value="C003">C003</option>
            <option value="C004">C004</option>
          </select>

          <button
            onClick={() => setFilterConflictOnly(!filterConflictOnly)}
            className={`px-3 py-1.5 rounded border text-xs transition-colors ${
              filterConflictOnly
                ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            {filterConflictOnly ? 'Train Conflicts Only ⚠' : 'Show All Trains'}
          </button>
        </div>
      </div>

      {/* 120 TRAINS TABLE */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Operational Train Timetable ({filteredTrains.length} of {trains.length} Trains)
            </h3>
            <p className="text-[11px] text-slate-400">
              High-priority passenger paths take precedence over discretionary maintenance windows
            </p>
          </div>
          {conflictTrainsCount > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
              {conflictTrainsCount} TRAINS IMPACTED BY OVERLAPS
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[600px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Train No</th>
                <th className="py-2.5 px-3">Train Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Corridor</th>
                <th className="py-2.5 px-3">Route (Origin → Dest)</th>
                <th className="py-2.5 px-3">Corridor Window</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Conflict Check</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredTrains.map((t, idx) => (
                <tr key={`${t.trainNumber}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-sky-300">{t.trainNumber}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-medium">{t.trainName}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        t.category === 'VANDE_BHARAT'
                          ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                          : t.category === 'RAJDHANI' || t.category === 'SHATABDI'
                          ? 'bg-blue-950/80 text-blue-300 border border-blue-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {t.category.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">{t.corridorId}</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {t.originStation} → {t.destinationStation}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-semibold">
                    {t.arrivalTime} – {t.departureTime}
                  </td>
                  <td className="py-2.5 px-3 text-amber-300 font-bold">P{t.priority}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-emerald-400">{t.status}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {t.conflictWithBlockId ? (
                      <button
                        onClick={() => onNavigateToConflict(t.conflictWithBlockId)}
                        className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-mono inline-flex items-center gap-1 font-bold"
                      >
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>OVERLAPS {t.conflictWithBlockId}</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> CLEAR
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
