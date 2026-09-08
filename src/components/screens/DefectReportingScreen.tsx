import React, { useState } from 'react';
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Send,
  Search,
  Filter,
  ShieldAlert,
  Gauge,
  Calendar,
  Layers,
} from 'lucide-react';
import { Defect, DepartmentType, PriorityLevel, Asset, Corridor, User } from '../../types';
import { submitDefect } from '../../services/api';

interface DefectReportingScreenProps {
  currentUser: User | null;
  assets: Asset[];
  corridors: Corridor[];
  defects: Defect[];
  onRefreshDefects: () => void;
}

export const DefectReportingScreen: React.FC<DefectReportingScreenProps> = ({
  currentUser,
  assets,
  corridors,
  defects,
  onRefreshDefects,
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState('A023');
  const [department, setDepartment] = useState<DepartmentType>('S&T');
  const [corridorId, setCorridorId] = useState('C004');
  const [defectType, setDefectType] = useState('Automatic Block Signaling Intermittent Lamp Voltage');
  const [severity, setSeverity] = useState<PriorityLevel>('CRITICAL');
  const [detectedDate, setDetectedDate] = useState('2026-09-05');
  const [description, setDescription] = useState(
    'Oscillating signal power supply recorded during nighttime test run at KM 28/4. Potential fail-to-danger hazard if uncorrected.'
  );
  const [reportedBy, setReportedBy] = useState(
    currentUser?.name || 'Vikram Joshi (DSTE / S&T)'
  );
  const [speedRestriction, setSpeedRestriction] = useState<number | undefined>(30);

  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    id: string;
    status: string;
  } | null>(null);

  // Table Filters
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAssetSelect = (id: string) => {
    setSelectedAssetId(id);
    const asset = assets.find((a) => a.id === id);
    if (asset) {
      setCorridorId(asset.corridorId);
      setDepartment(asset.department);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const created = await submitDefect({
        assetId: selectedAssetId,
        department,
        corridorId,
        defectType,
        severity,
        detectedDate,
        description,
        reportedBy,
        speedRestrictionKmph: speedRestriction,
      });

      setSubmissionSuccess({
        id: created.defectId,
        status: created.status,
      });

      onRefreshDefects();
    } catch (err) {
      console.error('Error reporting defect:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDefects = defects.filter((d) => {
    if (filterSeverity !== 'ALL' && d.severity !== filterSeverity) return false;
    if (filterDept !== 'ALL' && d.department !== filterDept) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.defectId.toLowerCase().includes(q) ||
        d.assetId.toLowerCase().includes(q) ||
        d.defectType.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bug className="w-5 h-5 text-rose-400" />
            <div>
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                Defect Reporting & Intelligence
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Screen 3: Operational defect logging feeds directly into AI priority weightings and maintenance block allocations.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 border border-rose-800">
            {defects.length} DEFECTS LOGGED
          </span>
        </div>
      </div>

      {/* Submission Success Banner */}
      {submissionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-200 font-mono">DEFECT REPORTED</h4>
              <p className="text-xs text-slate-300 mt-1">
                Defect ID: <strong className="font-mono text-emerald-300">{submissionSuccess.id}</strong> | Status:{' '}
                <span className="font-mono text-sky-300 px-1.5 py-0.5 rounded bg-sky-950 border border-sky-800">
                  {submissionSuccess.status}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Defect sent to Python backend and registered for automatic maintenance prioritization.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-1 bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-4 pb-2 border-b border-slate-800">
            Log New Operational Defect
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Asset ID *</label>
              <select
                value={selectedAssetId}
                onChange={(e) => handleAssetSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.id} — {a.name} ({a.department})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="ENGINEERING">Engineering</option>
                  <option value="S&T">S&T</option>
                  <option value="TRACTION">Traction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Corridor</label>
                <select
                  value={corridorId}
                  onChange={(e) => setCorridorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  {corridors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Defect Classification *</label>
              <input
                type="text"
                value={defectType}
                onChange={(e) => setDefectType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Severity Level *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as PriorityLevel)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Speed Restriction</label>
                <input
                  type="number"
                  placeholder="e.g. 30 kmph"
                  value={speedRestriction || ''}
                  onChange={(e) => setSpeedRestriction(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Detected Date *</label>
              <input
                type="date"
                value={detectedDate}
                onChange={(e) => setDetectedDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Description *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              ></textarea>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Reported By *</label>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 mt-4"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting to Backend...' : 'SUBMIT DEFECT'}</span>
            </button>
          </form>
        </div>

        {/* Defects List (2 Columns) */}
        <div className="lg:col-span-2 bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Active Defect Registry ({defects.length} Tracked)
              </h3>
              <p className="text-[11px] text-slate-400">
                Defects detected by Track Recording Cars, OMS, and Footplate Patrols
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search Defect, Asset..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono w-40 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[580px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Defect ID</th>
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3">Corridor</th>
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Restriction</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredDefects.map((d) => (
                  <tr key={d.defectId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-rose-300">{d.defectId}</td>
                    <td className="py-2.5 px-3 text-slate-200 font-semibold">{d.assetId}</td>
                    <td className="py-2.5 px-3 text-slate-300">{d.corridorId}</td>
                    <td className="py-2.5 px-3 text-slate-300 truncate max-w-[180px]">
                      {d.defectType}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] ${
                          d.severity === 'CRITICAL'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                            : d.severity === 'HIGH'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {d.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-amber-300">
                      {d.speedRestrictionKmph ? `${d.speedRestrictionKmph} km/h` : 'None'}
                    </td>
                    <td className="py-2.5 px-3 text-[10px] text-slate-400">
                      {d.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
