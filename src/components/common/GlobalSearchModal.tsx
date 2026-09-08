import React, { useState, useMemo } from 'react';
import { Search, X, Train, AlertTriangle, Wrench, FileText, Bug, ArrowRight, Layers } from 'lucide-react';
import { mockStore } from '../../services/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string, itemData?: any) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const results: Array<{
      type: 'BLOCK' | 'TRAIN' | 'ASSET' | 'REQUEST' | 'DEFECT' | 'CORRIDOR' | 'CONFLICT';
      id: string;
      title: string;
      subtitle: string;
      screen: string;
      badge: string;
      data?: any;
    }> = [];

    // Search Blocks
    mockStore.getOptimizedBlocks().forEach((b) => {
      if (b.blockId.toLowerCase().includes(q) || b.taskId.toLowerCase().includes(q) || b.assetId.toLowerCase().includes(q)) {
        results.push({
          type: 'BLOCK',
          id: b.blockId,
          title: `${b.blockId} (${b.department} - ${b.assetId})`,
          subtitle: `Time: ${b.startTime}–${b.endTime} on ${b.corridorId} | Status: ${b.status}`,
          screen: 'timeline',
          badge: b.hasConflict ? 'CONFLICT' : 'VALID',
          data: b,
        });
      }
    });

    // Search Trains
    mockStore.getTrains().forEach((t) => {
      if (t.trainNumber.toLowerCase().includes(q) || t.trainName.toLowerCase().includes(q)) {
        results.push({
          type: 'TRAIN',
          id: t.trainNumber,
          title: `${t.trainNumber} - ${t.trainName}`,
          subtitle: `Corridor: ${t.corridorId} | ${t.arrivalTime} → ${t.departureTime} (${t.category})`,
          screen: 'trains',
          badge: t.conflictWithBlockId ? 'CONFLICT' : t.status,
          data: t,
        });
      }
    });

    // Search Assets
    mockStore.getAssets().forEach((a) => {
      if (a.id.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q)) {
        results.push({
          type: 'ASSET',
          id: a.id,
          title: `${a.id} — ${a.name}`,
          subtitle: `${a.department} | Corridor: ${a.corridorId} | Condition: ${a.condition}`,
          screen: 'maintenance_assets',
          badge: a.priority,
          data: a,
        });
      }
    });

    // Search Requests
    mockStore.getBlockRequests().forEach((r) => {
      if (r.requestId.toLowerCase().includes(q) || r.assetId.toLowerCase().includes(q) || r.taskType.toLowerCase().includes(q)) {
        results.push({
          type: 'REQUEST',
          id: r.requestId,
          title: `${r.requestId} (${r.taskType})`,
          subtitle: `Asset: ${r.assetId} | Corr: ${r.corridorId} | Req: ${r.requester}`,
          screen: 'requests',
          badge: r.status,
          data: r,
        });
      }
    });

    // Search Defects
    mockStore.getDefects().forEach((d) => {
      if (d.defectId.toLowerCase().includes(q) || d.assetId.toLowerCase().includes(q) || d.defectType.toLowerCase().includes(q)) {
        results.push({
          type: 'DEFECT',
          id: d.defectId,
          title: `${d.defectId} — ${d.defectType}`,
          subtitle: `Asset: ${d.assetId} on ${d.corridorId} | Severity: ${d.severity}`,
          screen: 'defects',
          badge: d.severity,
          data: d,
        });
      }
    });

    // Search Conflicts
    mockStore.getConflicts().forEach((c) => {
      if (c.conflictId.toLowerCase().includes(q) || c.blockId.toLowerCase().includes(q) || c.trainNumber.toLowerCase().includes(q)) {
        results.push({
          type: 'CONFLICT',
          id: c.conflictId,
          title: `Conflict: ${c.blockId} ↔ ${c.trainNumber}`,
          subtitle: `${c.description} (${c.maintenanceInterval} vs ${c.trainInterval})`,
          screen: 'conflicts',
          badge: c.status,
          data: c,
        });
      }
    });

    return results.slice(0, 15);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-[#0e162c] border border-sky-800/60 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-sky-950/80 bg-[#0a1020]">
          <Search className="w-5 h-5 text-sky-400 mr-3 shrink-0" />
          <input
            type="text"
            placeholder="Search Block (BLK-T012), Train (TR106), Asset (A018), Request, Defect..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 hover:text-white text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="ml-2 text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-slate-800">
            ESC
          </button>
        </div>

        {/* Quick Filter Tags */}
        <div className="px-4 py-2 bg-slate-900/60 border-b border-slate-800/60 flex items-center gap-2 text-[11px] text-slate-400 overflow-x-auto">
          <span>Quick queries:</span>
          {['BLK-T012', 'TR106', 'A018', 'C003', 'REQ-2026-001', 'DEF-2026-001'].map((tag) => (
            <button
              key={tag}
              onClick={() => setQuery(tag)}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-sky-950 hover:text-sky-300 font-mono border border-slate-700/60 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {searchResults.length > 0 ? (
            searchResults.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  onNavigate(item.screen, item.data);
                  onClose();
                }}
                className="p-2.5 rounded-lg hover:bg-slate-800/70 cursor-pointer flex items-center justify-between group transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-slate-900 border border-slate-700/70 text-sky-400">
                    {item.type === 'TRAIN' ? (
                      <Train className="w-4 h-4" />
                    ) : item.type === 'BLOCK' ? (
                      <Layers className="w-4 h-4" />
                    ) : item.type === 'ASSET' ? (
                      <Wrench className="w-4 h-4" />
                    ) : item.type === 'DEFECT' ? (
                      <Bug className="w-4 h-4 text-rose-400" />
                    ) : item.type === 'CONFLICT' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-200">{item.title}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-300 border border-slate-700">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      item.badge === 'CRITICAL' || item.badge === 'CONFLICT'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-800/60'
                        : item.badge === 'RESOLVED' || item.badge === 'VALID' || item.badge === 'ON_TIME'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
                </div>
              </div>
            ))
          ) : query.trim() ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No matching records found for "{query}". Try searching by ID like BLK-T012 or TR106.
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Type any ID, asset name, corridor, or train number to search across all 28 assets, 120 trains, and 42 blocks.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
