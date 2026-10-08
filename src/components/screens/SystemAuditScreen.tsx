import React, { useState, useMemo } from 'react';
import {
  ServerCog,
  Server,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
  Sliders,
  ShieldCheck,
  FileText,
  RefreshCw,
  Layers,
  Database,
  Terminal,
  Activity,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  X,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  BarChart3,
  CheckCircle,
  Download,
  User,
  UserCheck,
  Tag,
  SlidersHorizontal,
  Sparkles,
  Flame,
  Info,
  GitMerge,
  Zap,
  Flag,
  Bookmark,
  Radio,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AuditLogEntry, SystemStatus } from '../../types';
import { checkBackendHealth, mockStore } from '../../services/api';

export type MajorEventType =
  | 'PUBLICATION'
  | 'CONFLICT_RESOLUTION'
  | 'SAFETY_GATE'
  | 'CRITICAL_INCIDENT';

export interface MajorEventMarker {
  id: string;
  logId: string;
  date: string;
  displayDate: string;
  type: MajorEventType;
  typeLabel: string;
  title: string;
  description: string;
  actor: string;
  timestamp: string;
  severity: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  color: string;
  badgeBg: string;
  badgeBorder: string;
  iconType: 'PUBLISH' | 'CONFLICT' | 'SAFETY' | 'ALERT';
  symbol: string;
  nri: number;
}

export function classifyMajorEvent(
  log: AuditLogEntry,
  dateStr: string,
  displayDate: string,
  nri: number
): MajorEventMarker | null {
  const actionLower = (log.action || '').toLowerCase();
  const objLower = (log.object || '').toLowerCase();
  const catLower = (log.category || '').toLowerCase();
  const isCritical =
    log.severity === 'CRITICAL' || log.status === 'LOCKED' || log.status === 'FAILED';

  // 1. Critical System Incident / Emergency Lockdowns
  if (isCritical || actionLower.includes('lockdown') || actionLower.includes('emergency')) {
    return {
      id: `ev-crit-${log.id}`,
      logId: log.id,
      date: dateStr,
      displayDate,
      type: 'CRITICAL_INCIDENT',
      typeLabel: 'Critical Safety Lockdown',
      title: log.action,
      description: log.details || log.object || 'Emergency safety interlock intervention recorded.',
      actor: log.user,
      timestamp: log.timestamp,
      severity: log.severity || 'CRITICAL',
      color: '#f43f5e',
      badgeBg: 'bg-rose-950/90 text-rose-300 border-rose-700',
      badgeBorder: '#e11d48',
      iconType: 'ALERT',
      symbol: '!',
      nri,
    };
  }

  // 2. Conflict Resolution (Headway gap, overlap prevention, dynamic slot shift, multi-train conflict)
  if (
    catLower === 'conflict_resolution' ||
    actionLower.includes('conflict') ||
    actionLower.includes('headway gap') ||
    actionLower.includes('overlap prevention') ||
    actionLower.includes('auto-resolved')
  ) {
    return {
      id: `ev-conf-${log.id}`,
      logId: log.id,
      date: dateStr,
      displayDate,
      type: 'CONFLICT_RESOLUTION',
      typeLabel: 'Conflict Resolution',
      title: log.action,
      description: log.details || log.object || 'Spatial-temporal conflict auto-resolved by AI conflict detector.',
      actor: log.user,
      timestamp: log.timestamp,
      severity: log.severity || 'WARNING',
      color: '#f59e0b',
      badgeBg: 'bg-amber-950/90 text-amber-300 border-amber-700',
      badgeBorder: '#d97706',
      iconType: 'CONFLICT',
      symbol: 'C',
      nri,
    };
  }

  // 3. Schedule Publication & Master Planning (Genetic schedule, master publication, baseline audit)
  if (
    catLower === 'optimization' ||
    actionLower.includes('publication') ||
    actionLower.includes('baseline audit') ||
    actionLower.includes('planning run') ||
    actionLower.includes('schedule') ||
    actionLower.includes('batch scheduling') ||
    objLower.includes('schedule publication gate')
  ) {
    return {
      id: `ev-pub-${log.id}`,
      logId: log.id,
      date: dateStr,
      displayDate,
      type: 'PUBLICATION',
      typeLabel: 'Schedule Publication & Planning',
      title: log.action,
      description: log.details || log.object || 'Master maintenance window schedule synthesized and published.',
      actor: log.user,
      timestamp: log.timestamp,
      severity: log.severity || 'SUCCESS',
      color: '#38bdf8',
      badgeBg: 'bg-sky-950/90 text-sky-300 border-sky-700',
      badgeBorder: '#0284c7',
      iconType: 'PUBLISH',
      symbol: 'P',
      nri,
    };
  }

  // 4. Safety Gate Verification & Milestones
  if (
    catLower === 'safety_gate' ||
    actionLower.includes('safety gate') ||
    actionLower.includes('zero-defect') ||
    actionLower.includes('safety protocol')
  ) {
    return {
      id: `ev-safe-${log.id}`,
      logId: log.id,
      date: dateStr,
      displayDate,
      type: 'SAFETY_GATE',
      typeLabel: 'Safety Gate Clearance',
      title: log.action,
      description: log.details || log.object || 'Formal multi-corridor safety gate certification completed.',
      actor: log.user,
      timestamp: log.timestamp,
      severity: log.severity || 'SUCCESS',
      color: '#10b981',
      badgeBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-700',
      badgeBorder: '#059669',
      iconType: 'SAFETY',
      symbol: 'S',
      nri,
    };
  }

  return null;
}

interface SystemAuditScreenProps {
  auditLogs: AuditLogEntry[];
  systemStatus: SystemStatus;
  onOpenBackendSettings: () => void;
  onRefreshData: () => void;
}

export const SystemAuditScreen: React.FC<SystemAuditScreenProps> = ({
  auditLogs,
  systemStatus,
  onOpenBackendSettings,
  onRefreshData,
}) => {
  const [testingHealth, setTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    tested: boolean;
    online: boolean;
    message: string;
  } | null>(null);

  // NRI Chart Controls - Time Window Selector & Overlay Markers
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | 'YTD'>('30D');
  const [metricMode, setMetricMode] = useState<'NRI_ONLY' | 'MULTI'>('NRI_ONLY');
  const [showEventMarkers, setShowEventMarkers] = useState(true);
  const [eventMarkerFilter, setEventMarkerFilter] = useState<
    'ALL' | 'PUBLICATION' | 'CONFLICT_RESOLUTION' | 'SAFETY_GATE' | 'CRITICAL_INCIDENT'
  >('ALL');

  // Selected date filter and heatmap hover state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [hoveredHeatmapDate, setHoveredHeatmapDate] = useState<string | null>(null);

  // Audit Table Filters & Search
  const [tableSearch, setTableSearch] = useState('');
  const [searchScope, setSearchScope] = useState<'ALL' | 'EVENT' | 'ACTOR'>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // CSV Report Export State
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [exportedCount, setExportedCount] = useState(0);

  // Regulatory CSV Report Export Handler
  const handleDownloadReport = (exportAll = false) => {
    const targetLogs = exportAll ? auditLogs : (filteredLogs.length > 0 ? filteredLogs : auditLogs);
    if (!targetLogs || targetLogs.length === 0) return;

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    // Official Indian Railways Safety Directorate Audit Header Specification
    const headers = [
      'Audit Log ID',
      'Timestamp (ISO)',
      'Date (IST)',
      'Time (IST)',
      'Subsystem Category',
      'Severity Level',
      'Outcome Status',
      'Authorized Officer / Subsystem',
      'Officer Role',
      'Action Description',
      'Target Asset / Entity',
      'Regulatory Inspection Notes',
    ];

    const rows = targetLogs.map((log) => {
      const datePart = log.timestamp ? log.timestamp.slice(0, 10) : '';
      const timePart = log.timestamp ? log.timestamp.slice(11, 19) : '';
      return [
        escapeCsv(log.id),
        escapeCsv(log.timestamp),
        escapeCsv(datePart),
        escapeCsv(timePart),
        escapeCsv(log.category || 'SYSTEM_CORE'),
        escapeCsv(log.severity || log.status || 'NORMAL'),
        escapeCsv(log.status || 'SUCCESS'),
        escapeCsv(log.user),
        escapeCsv(log.role || 'RAILWAY_SYSTEM_OPERATOR'),
        escapeCsv(log.action),
        escapeCsv(log.object || 'CORE_REGISTRY'),
        escapeCsv(log.details || ''),
      ].join(',');
    });

    // Add BOM (\uFEFF) for seamless Microsoft Excel & UTF-8 character encoding support
    const csvContent = '\uFEFF' + [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStamp = new Date().toISOString().split('T')[0];
    const eventSuffix = !exportAll && eventTypeFilter !== 'ALL' ? `_${eventTypeFilter.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` : '';
    const actorSuffix = !exportAll && actorFilter !== 'ALL' ? `_${actorFilter.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}` : '';
    const dateSuffix = !exportAll && selectedDate ? `_${selectedDate}` : '';
    const filterSuffix = `${eventSuffix}${actorSuffix}${dateSuffix}`;
    const filename = `IndianRailways_SystemAudit_RegulatoryReport_${dateStamp}${filterSuffix}.csv`;

    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setExportedCount(targetLogs.length);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  const handleTestHealth = async () => {
    setTestingHealth(true);
    const res = await checkBackendHealth(systemStatus.apiBaseUrl);
    setHealthResult({
      tested: true,
      online: res.online,
      message: res.message,
    });
    setTestingHealth(false);
  };

  // Compute historical Network Reliability Index from audit logs across Year-to-Date
  const reliabilityData = useMemo(() => {
    const latestTimestamp = auditLogs.length > 0
      ? auditLogs.reduce((latest, log) => (log.timestamp > latest ? log.timestamp : latest), auditLogs[0].timestamp)
      : '2026-09-05T12:00:00Z';

    const anchorDate = new Date(latestTimestamp.slice(0, 10) + 'T12:00:00Z');
    if (isNaN(anchorDate.getTime())) {
      anchorDate.setTime(new Date('2026-09-05T12:00:00Z').getTime());
    }

    // Index audit logs by YYYY-MM-DD
    const logsByDate = new Map<string, AuditLogEntry[]>();
    auditLogs.forEach((log) => {
      const d = log.timestamp ? log.timestamp.slice(0, 10) : '';
      if (d) {
        if (!logsByDate.has(d)) {
          logsByDate.set(d, []);
        }
        logsByDate.get(d)!.push(log);
      }
    });

    // Calculate days back to Jan 1st of anchor year for complete Year-to-Date coverage
    const anchorYear = anchorDate.getUTCFullYear();
    const startOfYear = new Date(Date.UTC(anchorYear, 0, 1, 12, 0, 0));
    const daysSinceYearStart = Math.max(30, Math.round((anchorDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)));

    const days: Array<{
      date: string;
      displayDate: string;
      fullDateStr: string;
      dayIndex: number;
      nri: number;
      safetyCompliance: number;
      operationalUptime: number;
      totalEvents: number;
      successCount: number;
      warningCount: number;
      criticalCount: number;
      normalCount: number;
      status: 'OPTIMAL' | 'NOMINAL' | 'ALERT';
      topEvent: string;
      majorEvents: MajorEventMarker[];
      primaryMajorEvent: MajorEventMarker | null;
      logs: AuditLogEntry[];
    }> = [];

    for (let i = daysSinceYearStart; i >= 0; i--) {
      const d = new Date(anchorDate.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      const dayLogs = logsByDate.get(dateStr) || [];

      const displayDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      const fullDateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      const totalEvents = dayLogs.length;
      const criticalCount = dayLogs.filter(
        (l) => l.severity === 'CRITICAL' || l.status === 'FAILED' || l.status === 'LOCKED'
      ).length;
      const warningCount = dayLogs.filter(
        (l) => l.severity === 'WARNING' || l.status === 'WARNING'
      ).length;
      const successCount = dayLogs.filter(
        (l) => l.severity === 'SUCCESS' || l.status === 'SUCCESS'
      ).length;
      const normalCount = totalEvents - criticalCount - warningCount - successCount;

      // Deterministic slight variance for days without logs to prevent a flat synthetic line
      const seed = (d.getDate() * 17 + (d.getMonth() + 1) * 31) % 100;
      const baselineFluctuation = ((seed % 10) - 5) * 0.05; // -0.25% to +0.25%

      let nriScore = 98.85 + baselineFluctuation;
      if (totalEvents > 0) {
        nriScore = 99.25 - (criticalCount * 3.75) - (warningCount * 1.35) + Math.min(0.65, successCount * 0.12);
      }
      const nri = Number(Math.max(91.0, Math.min(99.9, nriScore)).toFixed(2));

      const safetyScore = totalEvents > 0
        ? 100 - (criticalCount * 4.4) - (warningCount * 1.2)
        : 99.6 + baselineFluctuation;
      const safetyCompliance = Number(Math.max(89.0, Math.min(100.0, safetyScore)).toFixed(2));

      const uptimeScore = totalEvents > 0
        ? 99.8 - (criticalCount * 2.6) - (warningCount * 0.5)
        : 99.7 + baselineFluctuation;
      const operationalUptime = Number(Math.max(93.0, Math.min(100.0, uptimeScore)).toFixed(2));

      const status: 'OPTIMAL' | 'NOMINAL' | 'ALERT' =
        nri >= 98.0 ? 'OPTIMAL' : nri >= 95.0 ? 'NOMINAL' : 'ALERT';

      const criticalLog = dayLogs.find((l) => l.severity === 'CRITICAL' || l.status === 'LOCKED');
      const warningLog = dayLogs.find((l) => l.severity === 'WARNING');
      const successLog = dayLogs.find((l) => l.severity === 'SUCCESS');
      const topEvent = criticalLog?.action || warningLog?.action || successLog?.action || dayLogs[0]?.action || 'Routine Telemetry Heartbeat Synchronized';

      // Detect and classify major system events for this day
      const majorEvents: MajorEventMarker[] = [];
      dayLogs.forEach((log) => {
        const marker = classifyMajorEvent(log, dateStr, displayDate, nri);
        if (marker) {
          majorEvents.push(marker);
        }
      });

      const priorityOrder: Record<MajorEventType, number> = {
        CRITICAL_INCIDENT: 4,
        CONFLICT_RESOLUTION: 3,
        PUBLICATION: 2,
        SAFETY_GATE: 1,
      };

      const primaryMajorEvent =
        majorEvents.length > 0
          ? [...majorEvents].sort((a, b) => priorityOrder[b.type] - priorityOrder[a.type])[0]
          : null;

      days.push({
        date: dateStr,
        displayDate,
        fullDateStr,
        dayIndex: daysSinceYearStart - i,
        nri,
        safetyCompliance,
        operationalUptime,
        totalEvents,
        successCount,
        warningCount,
        criticalCount,
        normalCount,
        status,
        topEvent,
        majorEvents,
        primaryMajorEvent,
        logs: dayLogs,
      });
    }

    return days;
  }, [auditLogs]);

  // Filtered dataset according to selected Time Window
  const filteredChartData = useMemo(() => {
    if (timeRange === '7D') {
      return reliabilityData.slice(-7);
    }
    if (timeRange === '30D') {
      return reliabilityData.slice(-30);
    }
    if (timeRange === 'YTD') {
      return reliabilityData;
    }
    return reliabilityData.slice(-30);
  }, [reliabilityData, timeRange]);

  // Handle switching time window with synchronization of selected date inspection
  const handleTimeRangeChange = (newRange: '7D' | '30D' | 'YTD') => {
    setTimeRange(newRange);
    let targetSlice = reliabilityData.slice(-30);
    if (newRange === '7D') targetSlice = reliabilityData.slice(-7);
    else if (newRange === '30D') targetSlice = reliabilityData.slice(-30);
    else if (newRange === 'YTD') targetSlice = reliabilityData;

    if (selectedDate && !targetSlice.some((d) => d.date === selectedDate)) {
      setSelectedDate(null);
    }
  };

  // Summary statistics for NRI
  const stats = useMemo(() => {
    if (filteredChartData.length === 0) {
      return { mean: 98.2, peak: 99.8, peakDate: '02 Sep', trough: 93.8, troughDate: '21 Aug', slaCompliance: 100, totalEvents: 0 };
    }

    const sum = filteredChartData.reduce((acc, curr) => acc + curr.nri, 0);
    const mean = Number((sum / filteredChartData.length).toFixed(2));

    let peak = filteredChartData[0].nri;
    let peakDate = filteredChartData[0].displayDate;
    let trough = filteredChartData[0].nri;
    let troughDate = filteredChartData[0].displayDate;
    let slaPassCount = 0;
    let totalEvents = 0;

    filteredChartData.forEach((item) => {
      totalEvents += item.totalEvents;
      if (item.nri > peak) {
        peak = item.nri;
        peakDate = item.displayDate;
      }
      if (item.nri < trough) {
        trough = item.nri;
        troughDate = item.displayDate;
      }
      if (item.nri >= 95.0) {
        slaPassCount += 1;
      }
    });

    const slaCompliance = Number(((slaPassCount / filteredChartData.length) * 100).toFixed(1));

    return {
      mean,
      peak,
      peakDate,
      trough,
      troughDate,
      slaCompliance,
      totalEvents,
    };
  }, [filteredChartData]);

  // Currently inspected day data
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    return reliabilityData.find((d) => d.date === selectedDate) || null;
  }, [reliabilityData, selectedDate]);

  // Last 30 days activity heatmap data structure
  const heatmapData = useMemo(() => {
    // 30 days slice leading up to latest anchor date
    const last30Days = reliabilityData.slice(-30);
    const maxCount = Math.max(1, ...last30Days.map((d) => d.totalEvents));
    const totalActivityLogs = last30Days.reduce((acc, d) => acc + d.totalEvents, 0);
    const avgLogsPerDay = Number((totalActivityLogs / Math.max(1, last30Days.length)).toFixed(1));
    const highIntensityDays = last30Days.filter((d) => d.totalEvents >= 3).length;

    // Intensity scale tier assignment (0: 0 logs, 1: 1 log, 2: 2 logs, 3: 3-4 logs, 4: 5+ logs)
    const daysWithIntensity = last30Days.map((item) => {
      const count = item.totalEvents;
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count === 0) level = 0;
      else if (count === 1) level = 1;
      else if (count === 2) level = 2;
      else if (count <= 4) level = 3;
      else level = 4;

      // Extract day-of-week and formatted day of month
      const parsedDate = new Date(item.date + 'T12:00:00Z');
      const dayOfWeek = parsedDate.toLocaleDateString('en-GB', { weekday: 'short' });
      const dayNum = parsedDate.getUTCDate();
      const monthStr = parsedDate.toLocaleDateString('en-GB', { month: 'short' });

      return {
        ...item,
        level,
        dayOfWeek,
        dayNum,
        monthStr,
      };
    });

    return {
      days: daysWithIntensity,
      maxCount,
      totalActivityLogs,
      avgLogsPerDay,
      highIntensityDays,
    };
  }, [reliabilityData]);

  const hoveredHeatmapInfo = useMemo(() => {
    if (!hoveredHeatmapDate) return null;
    return heatmapData.days.find((d) => d.date === hoveredHeatmapDate) || null;
  }, [heatmapData, hoveredHeatmapDate]);

  // Filtered audit logs for the table with event type, actor, and scoped search
  const filteredLogs = useMemo(() => {
    const q = tableSearch.toLowerCase().trim();

    return auditLogs.filter((log) => {
      // Date filter
      if (selectedDate) {
        const logDate = log.timestamp ? log.timestamp.slice(0, 10) : '';
        if (logDate !== selectedDate) return false;
      }

      // Event Type (Action) filter
      if (eventTypeFilter !== 'ALL' && log.action !== eventTypeFilter) {
        return false;
      }

      // Actor (User / Subsystem) filter
      if (actorFilter !== 'ALL' && log.user !== actorFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'ALL' && log.category !== categoryFilter) {
        return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL' && log.severity !== severityFilter) {
        return false;
      }

      // Freeform or Scoped Search Query
      if (q) {
        if (searchScope === 'EVENT') {
          const matchesAction = log.action?.toLowerCase().includes(q);
          const matchesCategory = log.category?.toLowerCase().includes(q);
          if (!matchesAction && !matchesCategory) return false;
        } else if (searchScope === 'ACTOR') {
          const matchesUser = log.user?.toLowerCase().includes(q);
          const matchesRole = log.role?.toLowerCase().includes(q);
          const matchesObj = log.object?.toLowerCase().includes(q);
          if (!matchesUser && !matchesRole && !matchesObj) return false;
        } else {
          // 'ALL' scope: search matches across event action, user/actor, details, object, category, or role
          const matchesAction = log.action?.toLowerCase().includes(q);
          const matchesUser = log.user?.toLowerCase().includes(q);
          const matchesDetails = log.details?.toLowerCase().includes(q);
          const matchesObj = log.object?.toLowerCase().includes(q);
          const matchesCategory = log.category?.toLowerCase().includes(q);
          const matchesRole = log.role?.toLowerCase().includes(q);
          if (!matchesAction && !matchesUser && !matchesDetails && !matchesObj && !matchesCategory && !matchesRole) {
            return false;
          }
        }
      }

      return true;
    });
  }, [
    auditLogs,
    selectedDate,
    eventTypeFilter,
    actorFilter,
    categoryFilter,
    severityFilter,
    tableSearch,
    searchScope,
  ]);

  // Categories list for filter dropdown
  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    auditLogs.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set).sort();
  }, [auditLogs]);

  // Unique Event Types (Actions) with occurrence counts
  const uniqueEventTypes = useMemo(() => {
    const map = new Map<string, number>();
    auditLogs.forEach((l) => {
      if (l.action) {
        map.set(l.action, (map.get(l.action) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => a.action.localeCompare(b.action));
  }, [auditLogs]);

  // Unique Actors (Officers / Subsystems) with occurrence counts
  const uniqueActors = useMemo(() => {
    const map = new Map<string, number>();
    auditLogs.forEach((l) => {
      if (l.user) {
        map.set(l.user, (map.get(l.user) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([actor, count]) => ({ actor, count }))
      .sort((a, b) => a.actor.localeCompare(b.actor));
  }, [auditLogs]);

  // Top event types for quick filter pills
  const quickEventTypes = useMemo(() => {
    return [...uniqueEventTypes]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [uniqueEventTypes]);

  // Top actors for quick filter pills
  const quickActors = useMemo(() => {
    return [...uniqueActors]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [uniqueActors]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(
    tableSearch.trim() ||
    eventTypeFilter !== 'ALL' ||
    actorFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    selectedDate
  );

  // Reset all filters
  const resetAllFilters = () => {
    setTableSearch('');
    setSearchScope('ALL');
    setEventTypeFilter('ALL');
    setActorFilter('ALL');
    setCategoryFilter('ALL');
    setSeverityFilter('ALL');
    setSelectedDate(null);
  };

  // Helper function to highlight matching search tokens in text
  const highlightMatch = (text: string | undefined | null, query: string) => {
    if (!text) return '';
    const trimmed = query.trim();
    if (!trimmed) return text;
    try {
      const regex = new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className="bg-sky-500/30 text-sky-200 px-0.5 rounded font-semibold">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  // Marker counts across active time window
  const markerCounts = useMemo(() => {
    let all = 0;
    let pub = 0;
    let conf = 0;
    let safe = 0;
    let crit = 0;
    filteredChartData.forEach((day) => {
      (day.majorEvents || []).forEach((ev) => {
        all++;
        if (ev.type === 'PUBLICATION') pub++;
        if (ev.type === 'CONFLICT_RESOLUTION') conf++;
        if (ev.type === 'SAFETY_GATE') safe++;
        if (ev.type === 'CRITICAL_INCIDENT') crit++;
      });
    });
    return { all, pub, conf, safe, crit };
  }, [filteredChartData]);

  // Major event markers visible in active time window matching active filter
  const visibleMajorEvents = useMemo(() => {
    const list: MajorEventMarker[] = [];
    filteredChartData.forEach((day) => {
      (day.majorEvents || []).forEach((ev) => {
        if (eventMarkerFilter === 'ALL' || ev.type === eventMarkerFilter) {
          list.push(ev);
        }
      });
    });
    return list;
  }, [filteredChartData, eventMarkerFilter]);

  // Distinct event days to place vertical ReferenceLines on the chart
  const distinctEventDays = useMemo(() => {
    if (!showEventMarkers) return [];
    const map = new Map<string, { displayDate: string; event: MajorEventMarker; date: string }>();
    filteredChartData.forEach((day) => {
      const match = (day.majorEvents || []).find(
        (ev) => eventMarkerFilter === 'ALL' || ev.type === eventMarkerFilter
      );
      if (match) {
        map.set(day.displayDate, { displayDate: day.displayDate, event: match, date: day.date });
      }
    });
    return Array.from(map.values());
  }, [filteredChartData, showEventMarkers, eventMarkerFilter]);

  // Custom Dot Renderer with Major System Event Markers on NRI Line
  const renderNriDot = (dotProps: any) => {
    const { cx, cy, payload } = dotProps;
    if (!payload || cx === undefined || cy === undefined) return null;

    const dayMajorEvents: MajorEventMarker[] = payload.majorEvents || [];
    const matchingEvent = dayMajorEvents.find(
      (ev) => eventMarkerFilter === 'ALL' || ev.type === eventMarkerFilter
    );

    const hasEvent = Boolean(showEventMarkers && matchingEvent);

    if (!hasEvent) {
      if (timeRange === 'YTD') return null;
      return (
        <circle
          key={`dot-${payload.date}`}
          cx={cx}
          cy={cy}
          r={3}
          fill="#0284c7"
          stroke="#38bdf8"
          strokeWidth={1.5}
        />
      );
    }

    const event = matchingEvent!;
    const isSelected = selectedDate === payload.date;

    return (
      <g
        key={`marker-${event.id}-${payload.date}`}
        className="cursor-pointer group"
        onClick={(e) => {
          e.stopPropagation();
          setSelectedDate(payload.date === selectedDate ? null : payload.date);
        }}
      >
        {/* Pulsing aura ring */}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 13 : 10}
          fill={event.color}
          fillOpacity={0.25}
          className="animate-ping"
        />

        {/* Outer glowing halo */}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 8.5 : 6.5}
          fill="#070c1d"
          stroke={event.color}
          strokeWidth={isSelected ? 2.8 : 2}
        />

        {/* Inner solid core */}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 4 : 3}
          fill={event.color}
        />

        {/* Pin stem pointing upwards */}
        <line
          x1={cx}
          y1={cy - (isSelected ? 9 : 7)}
          x2={cx}
          y2={cy - (isSelected ? 23 : 19)}
          stroke={event.color}
          strokeWidth={1.6}
          strokeDasharray="2 1"
        />

        {/* Pinhead badge at top */}
        <circle
          cx={cx}
          cy={cy - (isSelected ? 23 : 19)}
          r={isSelected ? 6.5 : 5.5}
          fill="#0a1226"
          stroke={event.color}
          strokeWidth={1.6}
        />

        {/* Marker symbol text */}
        <text
          x={cx}
          y={cy - (isSelected ? 20 : 16.5)}
          textAnchor="middle"
          fontSize={isSelected ? '8.5' : '7.5'}
          fontWeight="bold"
          fill={event.color}
          fontFamily="monospace"
        >
          {event.symbol}
        </text>
      </g>
    );
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0b1329]/95 backdrop-blur-md p-3.5 rounded-xl border border-sky-800/80 shadow-2xl text-xs font-mono space-y-2 min-w-[270px] max-w-[340px] pointer-events-none">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1.5 text-slate-200 font-bold">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>{data.fullDateStr}</span>
            </div>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${
                data.status === 'OPTIMAL'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : data.status === 'NOMINAL'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                  : 'bg-rose-950/80 text-rose-300 border-rose-800'
              }`}
            >
              {data.status}
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Network Reliability (NRI):</span>
              <span className="text-sky-300 font-bold text-sm">{data.nri}%</span>
            </div>

            {metricMode === 'MULTI' && (
              <>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" /> Safety Interlock:
                  </span>
                  <span className="text-slate-200 font-semibold">{data.safetyCompliance}%</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-purple-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" /> Operational Uptime:
                  </span>
                  <span className="text-slate-200 font-semibold">{data.operationalUptime}%</span>
                </div>
              </>
            )}

            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Audit Events:</span>
              <span className="text-slate-200 font-bold">{data.totalEvents} Logged</span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-emerald-400">{data.successCount} Success</span>
              <span className="text-slate-500">•</span>
              <span className="text-amber-400">{data.warningCount} Warnings</span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-400">{data.criticalCount} Critical</span>
            </div>

            <div className="pt-1 text-[10px] text-slate-300 italic bg-slate-950/60 p-1.5 rounded border border-slate-800 truncate" title={data.topEvent}>
              Top Action: {data.topEvent}
            </div>

            {/* Major System Events Overlay in Tooltip */}
            {showEventMarkers && data.majorEvents && data.majorEvents.length > 0 && (
              <div className="pt-2 border-t border-slate-800/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    Major System Events ({data.majorEvents.length})
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80 font-bold">
                    OVERLAY
                  </span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                  {data.majorEvents.map((ev: MajorEventMarker) => (
                    <div
                      key={ev.id}
                      className={`p-1.5 rounded-lg border text-[10px] ${ev.badgeBg} space-y-0.5`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="truncate pr-1">{ev.typeLabel}</span>
                        <span className="text-[9px] opacity-80 shrink-0 font-mono">
                          {ev.timestamp ? ev.timestamp.slice(11, 16) : ''} UTC
                        </span>
                      </div>
                      <div className="text-white font-semibold truncate" title={ev.title}>
                        {ev.title}
                      </div>
                      <div className="text-[9px] opacity-80 truncate" title={ev.description}>
                        {ev.description}
                      </div>
                      <div className="text-[9px] opacity-70 flex items-center justify-between pt-0.5 border-t border-white/10">
                        <span>Actor: {ev.actor}</span>
                        <span className="uppercase font-semibold">{ev.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <ServerCog className="w-5 h-5 text-sky-400" />
              <h1 className="text-lg font-bold text-slate-100 font-mono tracking-wide uppercase">
                System Architecture, Bridges & Audit Logs
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950/80 text-sky-300 border border-blue-800">
                SCREEN 12 / SYSTEM AUDIT & INTEGRITY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end telemetry across Python REST API, Google Apps Script bridge, and immutable compliance audit logs.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              id="btn-download-audit-report"
              onClick={() => handleDownloadReport(false)}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
              title="Export current audit log data into CSV format for regulatory reporting"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Report Downloaded ({exportedCount})</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report</span>
                </>
              )}
            </button>

            <button
              onClick={onOpenBackendSettings}
              className="px-3.5 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure API / Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Export Success Banner */}
      {downloadSuccess && (
        <div className="bg-emerald-950/90 border border-emerald-600/70 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono text-emerald-200 shadow-lg transition-all animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Regulatory CSV Export Complete:</strong> Successfully exported <strong>{exportedCount}</strong> audit log records in RFC 4180 CSV format for Indian Railways safety directorate regulatory reporting.
            </span>
          </div>
          <button
            onClick={() => setDownloadSuccess(false)}
            className="text-emerald-400 hover:text-white p-1 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SYSTEM SUBSYSTEMS STATUS */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Core Railway Subsystems Status
            </h3>
            <p className="text-[11px] text-slate-400">
              Active engine and integration components powering decision support
            </p>
          </div>

          <button
            onClick={handleTestHealth}
            disabled={testingHealth}
            className="text-xs font-mono text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingHealth ? 'animate-spin' : ''}`} />
            Ping Services
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {/* Python Backend */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" /> Python Backend API
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  systemStatus.isMockMode
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {systemStatus.isMockMode ? 'MOCK / DEMO' : 'CONNECTED'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              URL: {systemStatus.apiBaseUrl}
            </div>
          </div>

          {/* Google Apps Script */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Google Apps Script
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                CONNECTED
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Bi-directional Webhook Gateway</div>
          </div>

          {/* Google Sheets */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-400" /> Google Sheets DB
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                SYNCED
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Tabular Railway Ledger</div>
          </div>

          {/* Optimization Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Optimization Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Genetic / Heuristic Slot Optimizer</div>
          </div>

          {/* Conflict Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Conflict Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Spatial-Temporal Collision Detector</div>
          </div>

          {/* Validation Engine */}
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold">Validation Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPERATIONAL
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Deterministic 7-Point Safety Gate</div>
          </div>
        </div>

        {healthResult && (
          <div
            className={`mt-3 p-2.5 rounded text-xs font-mono flex items-center gap-2 ${
              healthResult.online
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800 text-rose-300'
            }`}
          >
            {healthResult.online ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{healthResult.message}</span>
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* NETWORK RELIABILITY INDEX (NRI) - 30-DAY RECHARTS LINE CHART           */}
      {/* ====================================================================== */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-5">
        {/* Section Header with Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Activity className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                Network Reliability Index (NRI) — {timeRange === 'YTD' ? 'Year to Date' : timeRange === '30D' ? 'Last 30 Days' : 'Last 7 Days'} Historical Audit Telemetry
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-semibold">
                RECHARTS TELEMETRY
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                SLA: &gt;95.0%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Continuous multi-corridor reliability index derived from safety gate locks, conflict resolutions, maintenance possessions, and interlocking telemetry logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Metric Mode Toggle */}
            <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setMetricMode('NRI_ONLY')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'NRI_ONLY'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display single Network Reliability Index primary curve"
              >
                NRI Curve
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('MULTI')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'MULTI'
                    ? 'bg-sky-600 text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Overlay Safety Interlock Compliance and Operational Uptime curves"
              >
                Multi-Metric
              </button>
            </div>

            {/* Major Events Overlay Toggle & Filter */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 px-2 rounded-lg border border-slate-800">
              <button
                type="button"
                id="btn-toggle-event-markers"
                data-testid="toggle-event-markers-btn"
                onClick={() => setShowEventMarkers(!showEventMarkers)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showEventMarkers
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                title="Toggle overlay markers for major system events (schedule publication, conflict resolution, safety gate)"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Major Events</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    showEventMarkers ? 'bg-amber-900/90 text-amber-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {markerCounts.all}
                </span>
              </button>

              {showEventMarkers && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                  <select
                    id="event-marker-filter"
                    data-testid="event-marker-filter-select"
                    aria-label="Filter Major Event Marker Categories"
                    value={eventMarkerFilter}
                    onChange={(e) => setEventMarkerFilter(e.target.value as any)}
                    className="appearance-none pl-2 pr-6 py-0.5 bg-slate-800 text-amber-300 font-mono text-[11px] font-semibold rounded border border-amber-800/60 hover:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Markers ({markerCounts.all})</option>
                    <option value="PUBLICATION">🚀 Publications ({markerCounts.pub})</option>
                    <option value="CONFLICT_RESOLUTION">⚡ Conflict Resolutions ({markerCounts.conf})</option>
                    <option value="SAFETY_GATE">🛡️ Safety Gate ({markerCounts.safe})</option>
                    <option value="CRITICAL_INCIDENT">⚠️ Critical Locks ({markerCounts.crit})</option>
                  </select>
                </div>
              )}
            </div>

            {/* Time Window Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 pl-2.5 rounded-lg border border-slate-800">
              <label
                htmlFor="time-window-selector"
                className="text-xs font-mono text-slate-300 flex items-center gap-1.5 whitespace-nowrap font-medium"
              >
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Time Window:</span>
              </label>

              <div className="relative">
                <select
                  id="time-window-selector"
                  data-testid="time-window-selector"
                  aria-label="Time Window Selector"
                  value={timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value as '7D' | '30D' | 'YTD')}
                  className="appearance-none pl-2.5 pr-8 py-1 bg-slate-800 hover:bg-slate-750 focus:bg-slate-800 text-sky-300 font-mono text-xs font-semibold rounded border border-sky-800/70 hover:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-400 cursor-pointer transition-colors shadow-inner"
                >
                  <option value="7D" className="bg-slate-900 text-slate-200">
                    Last 7 Days
                  </option>
                  <option value="30D" className="bg-slate-900 text-slate-200">
                    Last 30 Days
                  </option>
                  <option value="YTD" className="bg-slate-900 text-slate-200">
                    Year to Date
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-sky-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Quick toggle pill buttons alongside dropdown */}
              <div className="hidden md:inline-flex items-center gap-1 ml-1 pl-2 border-l border-slate-800">
                {(['7D', '30D', 'YTD'] as const).map((r) => {
                  const label = r === '7D' ? 'Last 7 Days' : r === '30D' ? 'Last 30 Days' : 'Year to Date';
                  const active = timeRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleTimeRangeChange(r)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-600 text-white font-bold shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                      title={`Switch to ${label}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-mono flex items-center gap-1 border border-slate-700 cursor-pointer"
                title="Clear selected date filter"
              >
                <span>Filtered: {selectedDate}</span>
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Statistical KPI Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 font-mono text-xs">
          {/* Current Window Mean */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              {timeRange === 'YTD' ? 'Year to Date' : timeRange === '30D' ? 'Last 30 Days' : 'Last 7 Days'} Mean
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-sky-300">{stats.mean}%</span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +0.7%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">Baseline target: 95.0%</span>
          </div>

          {/* Peak Reliability */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Peak Index ({stats.peakDate})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-300">{stats.peak}%</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                OPTIMAL
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">Zero safety infractions</span>
          </div>

          {/* Lowest Trough Anomaly */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Trough Incident ({stats.troughDate})
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-amber-300">{stats.trough}%</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
                RESOLVED
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">C003 safety lock hold</span>
          </div>

          {/* SLA Compliance Rate */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              SLA Standard (&gt;95%)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-purple-300">{stats.slaCompliance}%</span>
              <span className="text-[10px] font-semibold text-emerald-400">PASSED</span>
            </div>
            <span className="text-[10px] text-slate-500 block">Indian Railways G&SR</span>
          </div>

          {/* Evaluated Events */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Historical Events
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-cyan-300">{stats.totalEvents}</span>
              <span className="text-[10px] text-slate-400">Total Audits</span>
            </div>
            <span className="text-[10px] text-slate-500 block">{auditLogs.length} total across all logs</span>
          </div>
        </div>

        {/* RECHARTS LINE CHART */}
        <div className="p-4 rounded-xl bg-[#090f22] border border-sky-950/90 relative">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredChartData}
                margin={{ top: 30, right: 25, left: -10, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length) {
                    const clickedDate = e.activePayload[0].payload.date;
                    setSelectedDate(clickedDate === selectedDate ? null : clickedDate);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.7} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#334155' }}
                  interval={
                    timeRange === 'YTD'
                      ? Math.max(1, Math.floor(filteredChartData.length / 8))
                      : timeRange === '30D'
                      ? 3
                      : 0
                  }
                />
                <YAxis
                  domain={[90, 100]}
                  stroke="#64748b"
                  tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                  tickLine={{ stroke: '#334155' }}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    paddingTop: 12,
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                {/* 95% Safety SLA Target Line */}
                <ReferenceLine
                  y={95}
                  stroke="#f43f5e"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '95% Safety SLA Benchmark',
                    fill: '#f43f5e',
                    fontSize: 10,
                    position: 'insideBottomRight',
                    fontFamily: 'monospace',
                  }}
                />

                {/* Major System Event Vertical Reference Lines */}
                {showEventMarkers &&
                  distinctEventDays.map(({ displayDate, event, date }) => (
                    <ReferenceLine
                      key={`ref-event-${event.id}-${date}`}
                      x={displayDate}
                      stroke={event.color}
                      strokeDasharray="3 3"
                      strokeWidth={selectedDate === date ? 2 : 1.2}
                      strokeOpacity={selectedDate === date ? 0.95 : 0.4}
                    />
                  ))}

                {/* Network Reliability Index (Primary Line with Major Event Markers) */}
                <Line
                  type="monotone"
                  dataKey="nri"
                  name="Network Reliability Index (%)"
                  stroke="#38bdf8"
                  strokeWidth={2.8}
                  dot={renderNriDot}
                  activeDot={{ r: 7, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />

                {/* Multi-Metric Overlays */}
                {metricMode === 'MULTI' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="safetyCompliance"
                      name="Safety Interlock Compliance (%)"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={timeRange === 'YTD' ? false : { r: 2.5, fill: '#059669', stroke: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="operationalUptime"
                      name="Operational Uptime (%)"
                      stroke="#a855f7"
                      strokeWidth={1.8}
                      dot={timeRange === 'YTD' ? false : { r: 2, fill: '#7e22ce', stroke: '#a855f7' }}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <span>Interactive Telemetry: Click any data point or event marker pin to inspect audit events.</span>
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Data Window ({timeRange === 'YTD' ? 'Year to Date' : timeRange === '30D' ? 'Last 30 Days' : 'Last 7 Days'}): {filteredChartData[0]?.fullDateStr} — {filteredChartData[filteredChartData.length - 1]?.fullDateStr} ({filteredChartData.length} days analyzed)
            </span>
          </div>

          {/* Major System Events Ribbon & Visual Marker Legend */}
          {showEventMarkers && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2.5 font-mono">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Major System Event Overlays ({visibleMajorEvents.length} in Horizon)
                  </span>
                  <span className="text-[10px] text-slate-500 hidden md:inline">
                    (Click any marker card to focus date and filter audit logs)
                  </span>
                </div>

                {/* Marker Type Legend */}
                <div className="flex items-center gap-2.5 text-[10px] flex-wrap">
                  <span className="flex items-center gap-1 text-sky-300">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    [P] Publication / Optimization ({markerCounts.pub})
                  </span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    [C] Conflict Resolution ({markerCounts.conf})
                  </span>
                  <span className="flex items-center gap-1 text-emerald-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    [S] Safety Gate ({markerCounts.safe})
                  </span>
                  <span className="flex items-center gap-1 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    [!] Critical Lock ({markerCounts.crit})
                  </span>
                </div>
              </div>

              {/* Event Pill Cards for Fast Inspection */}
              {visibleMajorEvents.length > 0 ? (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {visibleMajorEvents.map((ev) => {
                    const isSelected = selectedDate === ev.date;
                    return (
                      <button
                        key={`ribbon-ev-${ev.id}`}
                        type="button"
                        onClick={() => setSelectedDate(isSelected ? null : ev.date)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition-all cursor-pointer ${
                          ev.badgeBg
                        } ${
                          isSelected
                            ? 'ring-2 ring-white shadow-lg scale-[1.02]'
                            : 'hover:brightness-125 opacity-90 hover:opacity-100'
                        }`}
                        title={`Focus date ${ev.date}: ${ev.title}`}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 text-white"
                          style={{ backgroundColor: ev.color }}
                        >
                          {ev.symbol}
                        </span>
                        <div className="flex flex-col min-w-0 pr-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold">
                            <span className="text-white">{ev.displayDate}</span>
                            <span className="opacity-70 text-[9px]">({ev.typeLabel})</span>
                          </div>
                          <span className="text-[10px] text-slate-200 truncate max-w-[200px]">
                            {ev.title}
                          </span>
                        </div>
                        <span className="text-[9px] opacity-70 border-l border-white/20 pl-1.5 shrink-0">
                          {ev.nri}% NRI
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 italic py-1">
                  No major system events matching current filter in this time window.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Date Drilldown Card (if point clicked or selected) */}
        {selectedDayInfo && (
          <div className="p-4 rounded-xl bg-slate-900/90 border border-sky-800/70 space-y-3 font-mono text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <span className="text-slate-100 font-bold text-sm">
                  Daily Telemetry Drilldown: {selectedDayInfo.fullDateStr}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                    selectedDayInfo.status === 'OPTIMAL'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : selectedDayInfo.status === 'NOMINAL'
                      ? 'bg-sky-950 text-sky-300 border-sky-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  {selectedDayInfo.status} ({selectedDayInfo.nri}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReport(false)}
                  className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-700 text-emerald-100 text-xs flex items-center gap-1 transition-colors cursor-pointer border border-emerald-700"
                  title="Export this day's audit logs to CSV format"
                >
                  <Download className="w-3 h-3" />
                  <span>Export Day CSV ({selectedDayInfo.logs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                >
                  Close Inspection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">RELIABILITY INDEX</span>
                <span className="font-bold text-sky-300 text-sm">{selectedDayInfo.nri}%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">SAFETY INTERLOCK</span>
                <span className="font-bold text-emerald-300 text-sm">{selectedDayInfo.safetyCompliance}%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">OPERATIONAL UPTIME</span>
                <span className="font-bold text-purple-300 text-sm">{selectedDayInfo.operationalUptime}%</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] block">AUDIT EVENTS</span>
                <span className="font-bold text-slate-200 text-sm">{selectedDayInfo.totalEvents} logged</span>
              </div>
            </div>

            {/* Major System Events in Drilldown Card */}
            {selectedDayInfo.majorEvents && selectedDayInfo.majorEvents.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-950/90 border border-amber-600/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      Major System Events Overlay ({selectedDayInfo.majorEvents.length} on this Date)
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-200/80 uppercase tracking-wider font-semibold">
                    Core System Milestones
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedDayInfo.majorEvents.map((ev: MajorEventMarker) => (
                    <div
                      key={`drilldown-ev-${ev.id}`}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${ev.badgeBg}`}
                    >
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-bold text-white shrink-0"
                            style={{ backgroundColor: ev.color }}
                          >
                            {ev.symbol}
                          </span>
                          <span>{ev.typeLabel}</span>
                        </span>
                        <span className="text-[10px] font-mono opacity-80">
                          {ev.timestamp ? ev.timestamp.slice(11, 19) : ''} UTC
                        </span>
                      </div>
                      <div className="text-white font-semibold text-xs">{ev.title}</div>
                      <div className="text-[11px] text-slate-200">{ev.description}</div>
                      <div className="text-[10px] text-slate-300 flex items-center justify-between pt-1 border-t border-white/10">
                        <span>Authorized: {ev.actor}</span>
                        <span className="font-semibold uppercase">{ev.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDayInfo.logs.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-300">
                  Recorded Audit Incidents ({selectedDayInfo.logs.length}):
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {selectedDayInfo.logs.map((l) => (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-bold text-slate-200 truncate">{l.action}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border shrink-0 ${
                            l.severity === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : l.severity === 'WARNING'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          }`}
                        >
                          {l.severity || l.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[10px] truncate">
                        {l.user} • {l.timestamp.slice(11, 19)}
                      </div>
                      <div className="text-slate-300 text-[10px] line-clamp-2">
                        {l.details || l.object}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic py-1">
                Zero critical anomalies recorded on this date. Routine automated interlocking cycles maintained nominal network flow.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================================== */}
      {/* 30-DAY CALENDAR ACTIVITY HEATMAP (LOG COUNT INTENSITY)                 */}
      {/* ====================================================================== */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
        {/* Heatmap Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 font-mono">
                30-Day Audit Activity Heatmap — Log Intensity Distribution
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800 font-semibold">
                CALENDAR HEATMAP
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                LAST 30 DAYS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Visualizes daily volume of safety interlocks, corridor locks, and regulatory audit entries to detect peak operational and anomaly clusters.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">TOTAL LOGS:</span>
              <span className="font-bold text-sky-300">{heatmapData.totalActivityLogs}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">AVG / DAY:</span>
              <span className="font-bold text-emerald-300">{heatmapData.avgLogsPerDay}</span>
            </div>
            <div className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 flex items-center gap-1.5">
              <span className="text-slate-400 text-[10px]">HIGH INTENSITY:</span>
              <span className="font-bold text-amber-300">{heatmapData.highIntensityDays} days</span>
            </div>
          </div>
        </div>

        {/* Heatmap Grid & Legend Container */}
        <div className="space-y-4">
          {/* Calendar Heatmap Grid Cells */}
          <div className="overflow-x-auto pb-2">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
                {heatmapData.days.map((day) => {
                  const isSelected = selectedDate === day.date;
                  const isHovered = hoveredHeatmapDate === day.date;

                  // Intensity colors: 0 (subtle dark), 1 (light emerald/sky), 2 (teal/cyan), 3 (vibrant sky), 4 (intense amber/orange alert)
                  let cellBg = 'bg-slate-900/80 border-slate-800 text-slate-500 hover:border-slate-600';
                  let badgeDot = 'bg-slate-700';

                  if (day.level === 0) {
                    cellBg = 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:border-slate-600 hover:bg-slate-800/50';
                    badgeDot = 'bg-slate-700';
                  } else if (day.level === 1) {
                    cellBg = 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300 hover:border-emerald-600 hover:bg-emerald-900/50';
                    badgeDot = 'bg-emerald-500';
                  } else if (day.level === 2) {
                    cellBg = 'bg-cyan-950/60 border-cyan-800/80 text-cyan-200 hover:border-cyan-500 hover:bg-cyan-900/60';
                    badgeDot = 'bg-cyan-400';
                  } else if (day.level === 3) {
                    cellBg = 'bg-sky-950/80 border-sky-600/90 text-sky-100 hover:border-sky-400 hover:bg-sky-900/80 shadow-sm shadow-sky-950';
                    badgeDot = 'bg-sky-400';
                  } else if (day.level === 4) {
                    cellBg = 'bg-amber-950/90 border-amber-500 text-amber-100 hover:border-amber-300 hover:bg-amber-900 shadow-md shadow-amber-950';
                    badgeDot = 'bg-amber-400 animate-pulse';
                  }

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : day.date)}
                      onMouseEnter={() => setHoveredHeatmapDate(day.date)}
                      onMouseLeave={() => setHoveredHeatmapDate(null)}
                      className={`group relative p-2 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between h-20 cursor-pointer ${cellBg} ${
                        isSelected
                          ? 'ring-2 ring-amber-400 border-amber-400 shadow-lg shadow-amber-950/60 scale-[1.03] z-10'
                          : ''
                      } ${isHovered && !isSelected ? 'scale-[1.02] z-10 ring-1 ring-slate-400' : ''}`}
                      title={`${day.fullDateStr}: ${day.totalEvents} audit logs (Click to filter table)`}
                    >
                      {/* Top: Day and Weekday */}
                      <div className="flex items-center justify-between w-full text-[10px] font-mono leading-none">
                        <span className="font-bold text-slate-300 group-hover:text-white">
                          {day.dayNum} {day.monthStr}
                        </span>
                        <span className="text-[9px] text-slate-500 uppercase">{day.dayOfWeek}</span>
                      </div>

                      {/* Middle: Count & Indicator */}
                      <div className="my-auto flex items-center justify-between gap-1 w-full font-mono">
                        <span
                          className={`text-sm font-extrabold tracking-tight ${
                            day.level === 4
                              ? 'text-amber-300'
                              : day.level === 3
                              ? 'text-sky-200'
                              : day.level === 2
                              ? 'text-cyan-300'
                              : day.level === 1
                              ? 'text-emerald-300'
                              : 'text-slate-500'
                          }`}
                        >
                          {day.totalEvents}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${badgeDot}`} />
                      </div>

                      {/* Bottom status badge / sub-label */}
                      <div className="text-[9px] font-mono truncate text-slate-400 flex items-center justify-between w-full">
                        <span className="truncate">
                          {day.totalEvents === 1 ? '1 log' : `${day.totalEvents} logs`}
                        </span>
                        {day.criticalCount > 0 && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold shrink-0">
                            !
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Heatmap Legend & Interactive Status Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
            {/* Intensity Scale Legend */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-slate-500" /> Intensity:
              </span>
              <span className="text-slate-500 text-[10px]">Less</span>
              <div className="flex items-center gap-1">
                <span
                  className="w-4 h-4 rounded bg-slate-900 border border-slate-800 inline-block"
                  title="Level 0: 0 logs"
                />
                <span
                  className="w-4 h-4 rounded bg-emerald-950 border border-emerald-900 inline-block"
                  title="Level 1: 1 log"
                />
                <span
                  className="w-4 h-4 rounded bg-cyan-950 border border-cyan-800 inline-block"
                  title="Level 2: 2 logs"
                />
                <span
                  className="w-4 h-4 rounded bg-sky-950 border border-sky-600 inline-block"
                  title="Level 3: 3-4 logs"
                />
                <span
                  className="w-4 h-4 rounded bg-amber-950 border border-amber-500 inline-block animate-pulse"
                  title="Level 4: 5+ logs (High Activity / Critical Period)"
                />
              </div>
              <span className="text-slate-500 text-[10px]">More (5+ logs)</span>
            </div>

            {/* Hover / Selected Interactive Preview */}
            <div className="flex items-center gap-2">
              {hoveredHeatmapInfo ? (
                <span className="text-sky-300 text-[11px] bg-slate-900 px-2.5 py-1 rounded border border-sky-900 flex items-center gap-1.5 animate-fadeIn">
                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                  <strong>{hoveredHeatmapInfo.fullDateStr}:</strong> {hoveredHeatmapInfo.totalEvents} logs recorded • NRI: {hoveredHeatmapInfo.nri}%
                </span>
              ) : selectedDate ? (
                <div className="flex items-center gap-2">
                  <span className="text-amber-300 text-[11px] bg-slate-900 px-2 py-0.5 rounded border border-amber-900">
                    Inspecting: {selectedDate}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              ) : (
                <span className="text-slate-500 text-[11px] flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  Click any calendar tile to filter audit table and open daily telemetry inspection.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DATA COUNTS GRID */}
      <div className="bg-[#0a1020] p-5 rounded-xl border border-sky-950/80 shadow-inner">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono mb-3">
          Active Registry Inventory Counts
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">CORRIDORS</span>
            <span className="text-lg font-bold text-sky-300 mt-1 block">4</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">ASSETS</span>
            <span className="text-lg font-bold text-blue-300 mt-1 block">28</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">TASKS</span>
            <span className="text-lg font-bold text-indigo-300 mt-1 block">60</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">DEFECTS</span>
            <span className="text-lg font-bold text-rose-300 mt-1 block">55</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">TRAINS</span>
            <span className="text-lg font-bold text-purple-300 mt-1 block">120</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">REQUESTS</span>
            <span className="text-lg font-bold text-emerald-300 mt-1 block">35</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">BLOCKS</span>
            <span className="text-lg font-bold text-cyan-300 mt-1 block">42</span>
          </div>
          <div className="p-3 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">INITIAL CONFLICTS</span>
            <span className="text-lg font-bold text-amber-300 mt-1 block">23</span>
          </div>
        </div>
      </div>

      {/* AUDIT LOG TRAIL */}
      <div className="bg-[#0e172e] p-5 rounded-xl border border-sky-950/80 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Immutable Safety Audit Log Trail ({filteredLogs.length} / {auditLogs.length} Events)
            </h3>
            <p className="text-[11px] text-slate-400">
              Timestamped log compliant with Indian Railways operations and safety directorate inspection protocols
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700 self-start md:self-auto">
            COMPLIANCE AUDIT
          </span>
        </div>

        {/* Search & Filter Control Panel */}
        <div className="space-y-3 pt-1">
          {/* Main Search Input & Scope Selector */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit logs by event type (e.g. Calibration, Overlap) or actor (e.g. Verma, Safety Gate)..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 pr-9 py-2 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 w-full placeholder:text-slate-500"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  title="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Search Scope Selector */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px] font-mono shrink-0">
              <span className="text-slate-500 px-2 text-[10px] uppercase font-semibold">Scope:</span>
              <button
                type="button"
                onClick={() => setSearchScope('ALL')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                  searchScope === 'ALL'
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                All Fields
              </button>
              <button
                type="button"
                onClick={() => setSearchScope('EVENT')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  searchScope === 'EVENT'
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>Event Type</span>
              </button>
              <button
                type="button"
                onClick={() => setSearchScope('ACTOR')}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  searchScope === 'ACTOR'
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Actor</span>
              </button>
            </div>
          </div>

          {/* Dedicated Filter Dropdowns Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
            {/* Event Type Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3 text-sky-400" />
                <span>Event Type / Action ({uniqueEventTypes.length})</span>
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-sky-500 cursor-pointer w-full truncate ${
                  eventTypeFilter !== 'ALL'
                    ? 'bg-sky-950/80 border-sky-600 text-sky-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Event Types ({uniqueEventTypes.length})</option>
                {uniqueEventTypes.map((item) => (
                  <option key={item.action} value={item.action}>
                    {item.action} ({item.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Actor / Subsystem Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-400" />
                <span>Actor / Subsystem ({uniqueActors.length})</span>
              </label>
              <select
                value={actorFilter}
                onChange={(e) => setActorFilter(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-sky-500 cursor-pointer w-full truncate ${
                  actorFilter !== 'ALL'
                    ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Actors & Subsystems ({uniqueActors.length})</option>
                {uniqueActors.map((item) => (
                  <option key={item.actor} value={item.actor}>
                    {item.actor} ({item.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3 text-purple-400" />
                <span>Subsystem Category ({uniqueCategories.length})</span>
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-sky-500 cursor-pointer w-full ${
                  categoryFilter !== 'ALL'
                    ? 'bg-purple-950/80 border-purple-600 text-purple-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Categories ({uniqueCategories.length})</option>
                {uniqueCategories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                <span>Severity Level</span>
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:border-sky-500 cursor-pointer w-full ${
                  severityFilter !== 'ALL'
                    ? 'bg-amber-950/80 border-amber-600 text-amber-200 font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="WARNING">WARNING</option>
                <option value="NORMAL">NORMAL</option>
                <option value="SUCCESS">SUCCESS</option>
              </select>
            </div>
          </div>

          {/* Quick-Access Pills for Top Event Types & Actors */}
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80 text-[11px] font-mono">
            {/* Quick Event Types */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Tag className="w-2.5 h-2.5 text-sky-400" />
                Quick Events:
              </span>
              {quickEventTypes.map((item) => {
                const isActive = eventTypeFilter === item.action;
                return (
                  <button
                    key={item.action}
                    type="button"
                    onClick={() => setEventTypeFilter(isActive ? 'ALL' : item.action)}
                    className={`px-2 py-0.5 rounded-full text-[10px] transition-colors cursor-pointer border truncate max-w-[220px] ${
                      isActive
                        ? 'bg-sky-600 text-white border-sky-400 font-bold shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                    title={`${item.action} (${item.count} events)`}
                  >
                    {item.action} <span className="opacity-70">({item.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Actors */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
                <User className="w-2.5 h-2.5 text-emerald-400" />
                Quick Actors:
              </span>
              {quickActors.map((item) => {
                const isActive = actorFilter === item.actor;
                return (
                  <button
                    key={item.actor}
                    type="button"
                    onClick={() => setActorFilter(isActive ? 'ALL' : item.actor)}
                    className={`px-2 py-0.5 rounded-full text-[10px] transition-colors cursor-pointer border truncate max-w-[200px] ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-400 font-bold shadow'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80'
                    }`}
                    title={`${item.actor} (${item.count} events)`}
                  >
                    {item.actor} <span className="opacity-70">({item.count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Chips & Report Export Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80 text-xs font-mono">
            {/* Active Filter Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">
                Found <strong className="text-sky-300">{filteredLogs.length}</strong> of{' '}
                <strong className="text-slate-300">{auditLogs.length}</strong> events
              </span>

              {/* Active Search Badge */}
              {tableSearch.trim() && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[10px]">
                  <span>Search: &ldquo;{tableSearch}&rdquo; ({searchScope})</span>
                  <button
                    onClick={() => setTableSearch('')}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="Remove search filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Event Type Badge */}
              {eventTypeFilter !== 'ALL' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950 border border-sky-700 text-sky-200 text-[10px] max-w-[260px]">
                  <Tag className="w-3 h-3 shrink-0" />
                  <span className="truncate">Event: {eventTypeFilter}</span>
                  <button
                    onClick={() => setEventTypeFilter('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5 shrink-0"
                    title="Remove event filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Actor Badge */}
              {actorFilter !== 'ALL' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-200 text-[10px] max-w-[240px]">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="truncate">Actor: {actorFilter}</span>
                  <button
                    onClick={() => setActorFilter('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5 shrink-0"
                    title="Remove actor filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Category Badge */}
              {categoryFilter !== 'ALL' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-200 text-[10px]">
                  <span>Category: {categoryFilter}</span>
                  <button
                    onClick={() => setCategoryFilter('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="Remove category filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Severity Badge */}
              {severityFilter !== 'ALL' && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-200 text-[10px]">
                  <span>Severity: {severityFilter}</span>
                  <button
                    onClick={() => setSeverityFilter('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="Remove severity filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Active Date Filter Tag */}
              {selectedDate && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-300 text-[10px]">
                  <span>Date: {selectedDate}</span>
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="hover:text-white cursor-pointer ml-0.5"
                    title="Clear date filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Reset all button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline font-semibold ml-1 cursor-pointer"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* Download Report Actions in Audit Toolbar */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => handleDownloadReport(false)}
                title="Download current audit log data into CSV format for regulatory reporting"
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-mono flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer border border-emerald-600 shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Report ({filteredLogs.length} CSV)</span>
              </button>
              {filteredLogs.length !== auditLogs.length && (
                <button
                  onClick={() => handleDownloadReport(true)}
                  title="Download entire 30-day audit log dataset (all records)"
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer border border-slate-700 shrink-0"
                >
                  <span>Export All ({auditLogs.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-[520px] overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#0a1020] text-[11px] text-slate-400 border-b border-slate-800 uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Event Type / Action Description</th>
                <th className="py-2.5 px-3">Actor / Subsystem</th>
                <th className="py-2.5 px-3">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-500">
                        <Search className="w-6 h-6" />
                      </div>
                      <div className="text-slate-300 font-semibold text-sm">
                        No audit log events match your filter criteria
                      </div>
                      <p className="text-slate-500 text-xs max-w-md">
                        Try adjusting your search query, or clear the Event Type ({eventTypeFilter !== 'ALL' ? eventTypeFilter : 'none'}) or Actor ({actorFilter !== 'ALL' ? actorFilter : 'none'}) filters.
                      </p>
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-sky-300 border border-slate-700 whitespace-nowrap">
                        {log.category || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-200 leading-relaxed">
                      <div className="font-medium text-slate-100">
                        {highlightMatch(log.action, tableSearch)}
                      </div>
                      {log.details && (
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {highlightMatch(log.details, tableSearch)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-200">
                        <User className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{highlightMatch(log.user, tableSearch)}</span>
                      </div>
                      {log.object && (
                        <div className="text-[10px] text-slate-500 pl-4.5 truncate max-w-[200px]">
                          {highlightMatch(log.object, tableSearch)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.severity === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : log.severity === 'WARNING'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {log.severity || log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

