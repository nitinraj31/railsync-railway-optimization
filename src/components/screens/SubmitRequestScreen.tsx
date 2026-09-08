import React, { useState } from 'react';
import {
  FilePlus2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Search,
  Filter,
  ArrowRight,
  Send,
  FileSpreadsheet,
  Server,
  Sparkles,
  Info,
} from 'lucide-react';
import { BlockRequest, DepartmentType, PriorityLevel, User, Asset, Corridor } from '../../types';
import { submitMaintenanceRequest } from '../../services/api';

interface SubmitRequestScreenProps {
  currentUser: User | null;
  assets: Asset[];
  corridors: Corridor[];
  requests: BlockRequest[];
  onRefreshRequests: () => void;
  onNavigate: (screen: string) => void;
}

export const SubmitRequestScreen: React.FC<SubmitRequestScreenProps> = ({
  currentUser,
  assets,
  corridors,
  requests,
  onRefreshRequests,
  onNavigate,
}) => {
  // Form State
  const [department, setDepartment] = useState<DepartmentType>(
    currentUser?.department || 'ENGINEERING'
  );
  const [requester, setRequester] = useState(
    currentUser?.name || 'Er. Rajesh Verma (Sr. DEN / Track)'
  );
  const [selectedAssetId, setSelectedAssetId] = useState('A018');
  const [assetType, setAssetType] = useState('Deep Ballast Bed Section DB-03 (Clean Ballast Cushion 350mm)');
  const [corridorId, setCorridorId] = useState('C003');
  const [taskType, setTaskType] = useState('Deep Ballast Screening & Machine Tamping (BCM-41)');
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [requestedDate, setRequestedDate] = useState('2026-09-06');
  const [preferredStartTime, setPreferredStartTime] = useState('14:00');
  const [preferredEndTime, setPreferredEndTime] = useState('15:30');
  const [requiredDurationMinutes, setRequiredDurationMinutes] = useState(90);
  const [description, setDescription] = useState(
    'Urgent ballast cleaning required to mitigate OMS lateral acceleration exceedance on C003 western approach.'
  );
  const [operationalConstraints, setOperationalConstraints] = useState(
    'Requires traction power shutdown on adjacent line + clamp lock on facing switch points during tamping.'
  );

  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    success: boolean;
    requestId: string;
    submittedAt: string;
  } | null>(null);

  // Filters for Request History Table
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterCorridor, setFilterCorridor] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Handle Asset Selection change
  const handleAssetSelect = (id: string) => {
    setSelectedAssetId(id);
    const found = assets.find((a) => a.id === id);
    if (found) {
      setAssetType(`${found.name} (${found.type})`);
      setCorridorId(found.corridorId);
      if (found.department) {
        setDepartment(found.department);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await submitMaintenanceRequest({
        department,
        requester,
        requesterRole: currentUser?.role || 'ENGINEERING_OFFICER',
        assetId: selectedAssetId,
        assetType,
        corridorId,
        taskType,
        priority,
        requestedDate,
        preferredStartTime,
        preferredEndTime,
        requiredDurationMinutes,
        description,
        operationalConstraints,
        status: 'PENDING',
      });

      setSubmissionSuccess({
        success: true,
        requestId: result.requestId,
        submittedAt: new Date().toLocaleTimeString(),
      });

      onRefreshRequests();
    } catch (err) {
      console.error('Error submitting block request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterDept !== 'ALL' && r.department !== filterDept) return false;
    if (filterCorridor !== 'ALL' && r.corridorId !== filterCorridor) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.requestId.toLowerCase().includes(q) ||
        r.assetId.toLowerCase().includes(q) ||
        r.taskType.toLowerCase().includes(q) ||
        r.requester.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FilePlus2 className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                New Maintenance Block Request
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 2 / OPERATIONAL ENTRY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Railway departments submit maintenance demands. Data is transferred to the Python backend and synchronized to Google Sheets via Google Apps Script.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Bi-Directional Sheets Bridge</span>
            <span className="text-emerald-400 font-bold">● ACTIVE</span>
          </div>
        </div>
      </div>

      {/* Submission Success Alert */}
      {submissionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/80 shadow-lg animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-emerald-200 font-mono">
                  REQUEST SUBMITTED SUCCESSFULLY
                </h3>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-3 font-mono">
                  <span>
                    Official Request ID:{' '}
                    <strong className="text-emerald-300 bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-600">
                      {submissionSuccess.requestId}
                    </strong>
                  </span>
                  <span>
                    Initial Status:{' '}
                    <strong className="text-sky-300 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">
                      PENDING AI PLANNING
                    </strong>
                  </span>
                  <span className="text-slate-400">Time: {submissionSuccess.submittedAt}</span>
                </div>
                <p className="text-[11px] text-slate-300 mt-2">
                  This request has been ingested by the system. The Railway Planner can now open{' '}
                  <button
                    onClick={() => onNavigate('planning')}
                    className="text-sky-400 underline font-semibold hover:text-sky-300"
                  >
                    AI Planning Engine
                  </button>{' '}
                  to generate the conflict-aware maintenance schedule.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('planning')}
              className="px-3.5 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <span>Go to AI Planning</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Form & Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* The Form (2 Columns) */}
        <div className="lg:col-span-2 bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Maintenance Block Application Form
            </span>
            <span className="text-[11px] text-slate-400 font-mono">FORM: IR-OPT-BLK/01</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Department */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Department *</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as DepartmentType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                  required
                >
                  <option value="ENGINEERING">Civil Engineering (Track & Bridges)</option>
                  <option value="S&T">Signaling & Telecommunication (S&T)</option>
                  <option value="TRACTION">Electrical Traction (TRD / 25kV OHE)</option>
                  <option value="OPERATIONS">Operating / Traffic Coordination</option>
                  <option value="SAFETY">Safety Directorate</option>
                </select>
              </div>

              {/* Requester */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Requester / Official Officer *
                </label>
                <input
                  type="text"
                  value={requester}
                  onChange={(e) => setRequester(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              {/* Asset Selector */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Asset ID *</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => handleAssetSelect(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                  required
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} — {a.name} ({a.department} on {a.corridorId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Type */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Asset Type Details</label>
                <input
                  type="text"
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Corridor */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Corridor Code *</label>
                <select
                  value={corridorId}
                  onChange={(e) => setCorridorId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                  required
                >
                  {corridors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Priority Level *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                  required
                >
                  <option value="CRITICAL">CRITICAL (Direct safety issue or speed restriction)</option>
                  <option value="HIGH">HIGH (Periodic overdue / essential renewal)</option>
                  <option value="MEDIUM">MEDIUM (Standard maintenance cycle)</option>
                  <option value="LOW">LOW (Routine aesthetic / preventive cleaning)</option>
                </select>
              </div>
            </div>

            {/* Task Type */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Task Type *</label>
              <input
                type="text"
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono focus:border-sky-500 focus:outline-none"
                required
              />
            </div>

            {/* Timing Row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Requested Date *</label>
                <input
                  type="date"
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred Start</label>
                <input
                  type="time"
                  value={preferredStartTime}
                  onChange={(e) => setPreferredStartTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Preferred End</label>
                <input
                  type="time"
                  value={preferredEndTime}
                  onChange={(e) => setPreferredEndTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Required Duration</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="30"
                    max="360"
                    step="15"
                    value={requiredDurationMinutes}
                    onChange={(e) => setRequiredDurationMinutes(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                    required
                  />
                  <span className="text-[11px] text-slate-400 font-mono">min</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Description *</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
                required
              ></textarea>
            </div>

            {/* Operational Constraints */}
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Operational Constraints (Power shutdown, siding diversion, machine staging)
              </label>
              <input
                type="text"
                value={operationalConstraints}
                onChange={(e) => setOperationalConstraints(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-xs focus:border-sky-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>Sends record to Python REST backend & Google Apps Script</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-900/40 transform active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'Submitting to Backend...' : 'SUBMIT REQUEST'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live System Context Info Panel */}
        <div className="space-y-4">
          <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md text-xs space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 font-mono block">
              SIH Live Demo Workflow Verification
            </span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              When an Engineering Officer submits a request, RAILSYNC demonstrates real operational responsiveness:
            </p>

            <div className="space-y-2 text-[11px] font-mono">
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">
                1. Generates Request ID (e.g. REQ-2026-036)
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">
                2. Ingested with status PENDING
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">
                3. Transferred to Python Backend
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-sky-300">
                4. Included in next AI Planning Batch
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedAssetId('A018');
                  setCorridorId('C003');
                  setRequiredDurationMinutes(90);
                  setPriority('HIGH');
                }}
                className="w-full py-1.5 px-2.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800 text-[11px] font-mono hover:bg-blue-900/60"
              >
                Load SIH Demo Scenario (A018 / C003 / 90m)
              </button>
            </div>
          </div>

          <div className="bg-[#0e172e] p-4 rounded-xl border border-sky-950/80 shadow-md text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-300 font-bold uppercase">
                Active Department Assets
              </span>
              <span className="text-[10px] text-sky-400 font-mono">28 ASSETS TOTAL</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {assets.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  onClick={() => handleAssetSelect(a.id)}
                  className={`p-2 rounded border cursor-pointer text-[11px] transition-colors ${
                    selectedAssetId === a.id
                      ? 'bg-blue-950/60 border-sky-600 text-sky-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between font-mono">
                    <span className="font-semibold">{a.id}</span>
                    <span className="text-[10px] text-slate-400">{a.corridorId}</span>
                  </div>
                  <div className="truncate text-slate-400 text-[10px]">{a.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* REQUEST HISTORY TABLE */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Submitted Maintenance Block Requests ({requests.length} Total)
            </h3>
            <p className="text-[11px] text-slate-400">
              Traceable record of departmental submissions synced to backend data stores
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search REQ, Asset, Task..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded pl-8 pr-2.5 py-1.5 text-xs text-slate-200 font-mono w-44 focus:outline-none focus:border-sky-500"
              />
            </div>

            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Depts</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="S&T">S&T</option>
              <option value="TRACTION">Traction</option>
            </select>

            <select
              value={filterCorridor}
              onChange={(e) => setFilterCorridor(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Corridors</option>
              <option value="C001">C001</option>
              <option value="C002">C002</option>
              <option value="C003">C003</option>
              <option value="C004">C004</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300 font-mono focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="PLANNED">Planned</option>
              <option value="CONFLICT">Conflict</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a1020] text-[11px] font-mono text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Request ID</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Asset</th>
                <th className="py-2.5 px-3">Corridor</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Date / Window</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Submitted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredRequests.map((r) => (
                <tr key={r.requestId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-sky-300">{r.requestId}</td>
                  <td className="py-2.5 px-3 text-slate-300">{r.department}</td>
                  <td className="py-2.5 px-3 text-slate-200">
                    <span className="font-semibold">{r.assetId}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-semibold">{r.corridorId}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.priority === 'CRITICAL'
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          : r.priority === 'HIGH'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {r.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {r.requestedDate} ({r.preferredStartTime}–{r.preferredEndTime})
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{r.requiredDurationMinutes} min</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] border ${
                        r.status === 'CONFLICT'
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                          : r.status === 'PLANNED' || r.status === 'RESOLVED'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                          : 'bg-sky-950/60 text-sky-300 border-sky-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 truncate max-w-[150px]">
                    {r.requester}
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
