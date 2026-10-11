import { Corridor, OptimizedBlock, Conflict, Train, CorridorResourceMetrics } from '../types';
import { downloadFile } from './exportBulletinService';

export interface CorridorReportExportOptions {
  corridor: Corridor;
  blocks: OptimizedBlock[];
  conflicts: Conflict[];
  trains?: Train[];
  resourceMetrics?: CorridorResourceMetrics | null;
  shift?: 'DAY_SHIFT' | 'AFTERNOON_SHIFT' | 'NIGHT_MEGA_BLOCK';
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates a comprehensive, structured CSV log of all maintenance blocks,
 * active conflicts, and resource utilization metrics for the selected corridor.
 */
export function generateCorridorOperationsCsv(options: CorridorReportExportOptions): string {
  const { corridor, blocks, conflicts, trains = [], resourceMetrics, shift = 'DAY_SHIFT' } = options;

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const nowDisplay = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  const lines: string[] = [];

  // UTF-8 BOM for Microsoft Excel compatibility
  const BOM = '\uFEFF';

  // ==========================================================================
  // HEADER BANNER
  // ==========================================================================
  lines.push('================================================================================');
  lines.push('MINISTRY OF RAILWAYS - GOVERNMENT OF INDIA | NORTHERN RAILWAY');
  lines.push('RAILSYNC: INTEGRATED CORRIDOR OPERATIONS & INFRASTRUCTURE REPORT');
  lines.push('================================================================================');
  lines.push(`Generated At,${escapeCsv(nowDisplay)}`);
  lines.push(`Corridor ID,${escapeCsv(corridor.id)}`);
  lines.push(`Corridor Name,${escapeCsv(corridor.name)}`);
  lines.push(`Route Span,${escapeCsv(`${corridor.fromStation || corridor.stationFrom || 'Station A'} to ${corridor.toStation || corridor.stationTo || 'Station B'}`)}`);
  lines.push(`Total Route Length,${escapeCsv(`${corridor.lengthKm} KM`)}`);
  lines.push(`Track Configuration,${escapeCsv(`${corridor.tracksCount || 2} Tracks (${corridor.trackType || 'Double Track Electrified 25kV AC'})`)}`);
  lines.push(`Max Permissible Speed,${escapeCsv(`${corridor.maxSpeedKmph || 130} km/h`)}`);
  lines.push(`Active Shift Context,${escapeCsv(shift)}`);
  lines.push('');

  // ==========================================================================
  // SECTION 1: RESOURCE UTILIZATION METRICS
  // ==========================================================================
  lines.push('--------------------------------------------------------------------------------');
  lines.push('SECTION 1: RESOURCE UTILIZATION & CAPACITY METRICS');
  lines.push('--------------------------------------------------------------------------------');
  lines.push([
    'Metric Category',
    'Resource Name / Sub-discipline',
    'Allocated Count',
    'Capacity / Quota',
    'Utilization Rate (%)',
    'Operational Status',
    'Deployment Details / Supervisor',
  ].join(','));

  const utilPct = resourceMetrics?.utilizationPct ?? corridor.utilization ?? 75;
  const loadStatus = resourceMetrics?.loadStatus ?? (utilPct > 90 ? 'OVER_CAPACITY' : utilPct > 80 ? 'NEAR_CAPACITY' : 'BALANCED');
  const supervisor = resourceMetrics?.supervisorInCharge ?? 'Shri Rajesh Sharma (Sr. DEN / Co-ord)';

  lines.push([
    escapeCsv('Corridor Capacity'),
    escapeCsv('Daily Route Path Utilization'),
    escapeCsv(`${corridor.utilization}%`),
    escapeCsv('100%'),
    corridor.utilization,
    escapeCsv(corridor.status || 'OPERATIONAL'),
    escapeCsv(`${corridor.availableSlots || 12} Total Slots Available`),
  ].join(','));

  lines.push([
    escapeCsv('Fleet & Manpower Status'),
    escapeCsv('Overall Resource Utilization'),
    escapeCsv(`${utilPct}%`),
    escapeCsv('100%'),
    utilPct,
    escapeCsv(loadStatus),
    escapeCsv(`Lead Supervisor: ${supervisor}`),
  ].join(','));

  const totalManpower = resourceMetrics?.totalManpowerAllocated ?? 54;
  const manpowerCap = resourceMetrics?.manpowerCapacity ?? 64;
  const manpowerUtil = Math.round((totalManpower / (manpowerCap || 1)) * 100);

  lines.push([
    escapeCsv('Manpower (Total)'),
    escapeCsv('Total Field Maintenance Headcount'),
    totalManpower,
    manpowerCap,
    manpowerUtil,
    escapeCsv(totalManpower > manpowerCap ? 'DEFICIT_WARNING' : 'NORMAL'),
    escapeCsv('Permanent Way, S&T, and TRD combined rosters'),
  ].join(','));

  lines.push([
    escapeCsv('Manpower Breakdown'),
    escapeCsv('Track Gangs (P-Way Gangmen & Mates)'),
    resourceMetrics?.trackGangsHeadcount ?? 24,
    30,
    Math.round(((resourceMetrics?.trackGangsHeadcount ?? 24) / 30) * 100),
    escapeCsv('ACTIVE'),
    escapeCsv('Track surfacing, rail welding, and sleeper packing'),
  ].join(','));

  lines.push([
    escapeCsv('Manpower Breakdown'),
    escapeCsv('S&T Technicians (Signaling & Telecom)'),
    resourceMetrics?.signalTechsHeadcount ?? 12,
    14,
    Math.round(((resourceMetrics?.signalTechsHeadcount ?? 12) / 14) * 100),
    escapeCsv('ACTIVE'),
    escapeCsv('Kavach cab equipment, point machines, and track circuits'),
  ].join(','));

  lines.push([
    escapeCsv('Manpower Breakdown'),
    escapeCsv('OHE Linesmen (Traction TRD)'),
    resourceMetrics?.oheLinesmenHeadcount ?? 10,
    12,
    Math.round(((resourceMetrics?.oheLinesmenHeadcount ?? 10) / 12) * 100),
    escapeCsv('ACTIVE'),
    escapeCsv('25kV AC contact wire tensioning, droppers, and isolators'),
  ].join(','));

  lines.push([
    escapeCsv('Manpower Breakdown'),
    escapeCsv('Safety Lookouts & Protection Staff'),
    resourceMetrics?.safetyLookoutsHeadcount ?? 8,
    8,
    100,
    escapeCsv('ACTIVE'),
    escapeCsv('Banners, detonators, and Kavach portable worksite transponders'),
  ].join(','));

  const totalMachinery = resourceMetrics?.totalMachineryAllocated ?? 4;
  const machineryCap = resourceMetrics?.machineryCapacity ?? 6;
  const machineryUtil = Math.round((totalMachinery / (machineryCap || 1)) * 100);

  lines.push([
    escapeCsv('Machinery (Total)'),
    escapeCsv('Heavy Track Machines Fleet'),
    totalMachinery,
    machineryCap,
    machineryUtil,
    escapeCsv(totalMachinery > machineryCap ? 'DEFICIT_WARNING' : 'NORMAL'),
    escapeCsv('High-output mechanised track maintenance fleet'),
  ].join(','));

  lines.push([
    escapeCsv('Machinery Fleet'),
    escapeCsv('CSM / 08-32 Tamping Machines'),
    resourceMetrics?.tampingMachines ?? 2,
    2,
    100,
    escapeCsv('DEPLOYED'),
    escapeCsv('Continuous action tamper on mainline plain track'),
  ].join(','));

  lines.push([
    escapeCsv('Machinery Fleet'),
    escapeCsv('Ballast Regulators (BRM)'),
    resourceMetrics?.ballastRegulators ?? 1,
    1,
    100,
    escapeCsv('DEPLOYED'),
    escapeCsv('Ballast profiling, shoulder dressing, and broom operations'),
  ].join(','));

  lines.push([
    escapeCsv('Machinery Fleet'),
    escapeCsv('Tower Wagons (OHE Inspection)'),
    resourceMetrics?.towerWagons ?? 1,
    2,
    50,
    escapeCsv('STANDBY'),
    escapeCsv('Traction distribution catenary maintenance wagon'),
  ].join(','));

  lines.push([
    escapeCsv('Machinery Fleet'),
    escapeCsv('Rail Grinders (RG / 72-Stone)'),
    resourceMetrics?.railGrinders ?? 0,
    1,
    0,
    escapeCsv('DIVISION_POOL'),
    escapeCsv('Stationed at Central Machine Depot (available on request)'),
  ].join(','));

  lines.push([
    escapeCsv('Machinery Fleet'),
    escapeCsv('Dynamic Track Stabilizers (DTS)'),
    resourceMetrics?.trackStabilizers ?? 1,
    1,
    100,
    escapeCsv('DEPLOYED'),
    escapeCsv('Post-tamping consolidation ensuring immediate 80+ km/h clearance'),
  ].join(','));

  if (resourceMetrics?.bottleneckWarnings && resourceMetrics.bottleneckWarnings.length > 0) {
    resourceMetrics.bottleneckWarnings.forEach((warning, idx) => {
      lines.push([
        escapeCsv('Bottleneck Warning'),
        escapeCsv(`Warning #${idx + 1}`),
        escapeCsv('CRITICAL'),
        escapeCsv('-'),
        escapeCsv('-'),
        escapeCsv('ACTION_REQUIRED'),
        escapeCsv(warning),
      ].join(','));
    });
  }

  lines.push('');

  // ==========================================================================
  // SECTION 2: CURRENT SCHEDULED MAINTENANCE BLOCKS
  // ==========================================================================
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`SECTION 2: CURRENT SCHEDULED MAINTENANCE BLOCKS (COUNT: ${blocks.length})`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push([
    'Block ID',
    'Asset ID',
    'Department',
    'Section / Location',
    'Start Time',
    'End Time',
    'Duration (Min)',
    'Priority',
    'Validation Status',
    'Conflict Flag',
    'Power Block (25kV)',
    'Traffic Block',
    'Work Type / Description',
  ].join(','));

  if (blocks.length === 0) {
    lines.push([
      escapeCsv('NONE'),
      escapeCsv('N/A'),
      escapeCsv('N/A'),
      escapeCsv('No maintenance blocks currently scheduled for this corridor'),
      escapeCsv('-'),
      escapeCsv('-'),
      0,
      escapeCsv('-'),
      escapeCsv('-'),
      escapeCsv('NO'),
      escapeCsv('NO'),
      escapeCsv('NO'),
      escapeCsv('-'),
    ].join(','));
  } else {
    blocks.forEach((b) => {
      const isPowerBlock = b.department === 'TRACTION' ? 'YES (25kV OHE)' : 'NO';
      const isTrafficBlock = b.durationMinutes >= 60 ? 'YES' : 'CONDITIONAL';
      const workDesc = b.explainability?.selectionRationale || `Task ${b.taskId} - ${b.department} Maintenance`;

      lines.push([
        escapeCsv(b.blockId),
        escapeCsv(b.assetId || 'N/A'),
        escapeCsv(b.department),
        escapeCsv(b.section || `${corridor.id} Mainline`),
        escapeCsv(b.startTime),
        escapeCsv(b.endTime),
        b.durationMinutes || 0,
        escapeCsv(b.priority),
        escapeCsv(b.validationStatus || 'APPROVED'),
        escapeCsv(b.hasConflict ? 'YES (OVERLAP)' : 'NO'),
        escapeCsv(isPowerBlock),
        escapeCsv(isTrafficBlock),
        escapeCsv(workDesc),
      ].join(','));
    });
  }

  lines.push('');

  // ==========================================================================
  // SECTION 3: ACTIVE & OPEN CONFLICTS LOG
  // ==========================================================================
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`SECTION 3: ACTIVE CONFLICTS ON CORRIDOR (COUNT: ${conflicts.length})`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push([
    'Conflict ID',
    'Block ID',
    'Conflicting Train #',
    'Conflicting Train Name',
    'Conflict Type',
    'Severity',
    'Maintenance Interval',
    'Train Interval',
    'Status',
    'Projected Delay (Min)',
    'Hazard Summary / Description',
    'AI Recommended Resolution',
  ].join(','));

  if (conflicts.length === 0) {
    lines.push([
      escapeCsv('NONE'),
      escapeCsv('N/A'),
      escapeCsv('N/A'),
      escapeCsv('No active operational conflicts on this corridor'),
      escapeCsv('CLEAR'),
      escapeCsv('NONE'),
      escapeCsv('-'),
      escapeCsv('-'),
      escapeCsv('RESOLVED'),
      0,
      escapeCsv('All maintenance slots cleared of train path contentions'),
      escapeCsv('Schedule validated for gazetted operations'),
    ].join(','));
  } else {
    conflicts.forEach((c) => {
      const estimatedDelay =
        (c as any).trainDelayMinutes ??
        (c.severity === 'CRITICAL' ? 35 : c.severity === 'HIGH' ? 20 : 10);
      const recommendation =
        c.resolutionNotes ||
        c.alternativeAppliedSlot ||
        (c as any).resolutionRecommendation ||
        'Shift maintenance block to adjacent shadow slot or regulate freight rake';

      lines.push([
        escapeCsv(c.conflictId),
        escapeCsv(c.blockId),
        escapeCsv(c.trainNumber),
        escapeCsv(c.trainName || 'Unknown Train'),
        escapeCsv(c.conflictType),
        escapeCsv(c.severity),
        escapeCsv(c.maintenanceInterval),
        escapeCsv(c.trainInterval || 'N/A'),
        escapeCsv(c.status),
        estimatedDelay,
        escapeCsv(c.description || 'Spatial-temporal path contention'),
        escapeCsv(recommendation),
      ].join(','));
    });
  }

  lines.push('');

  // ==========================================================================
  // SECTION 4: SCHEDULED TRAINS CROSSING CORRIDOR
  // ==========================================================================
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`SECTION 4: TIMETABLED TRAIN MOVEMENTS (COUNT: ${trains.length})`);
  lines.push('--------------------------------------------------------------------------------');
  lines.push([
    'Train Number',
    'Train Name',
    'Category',
    'Arrival Time',
    'Departure Time',
    'Direction',
    'Operational Status',
    'Conflicting Block ID',
  ].join(','));

  if (trains.length === 0) {
    lines.push([
      escapeCsv('NONE'),
      escapeCsv('No trains timetabled'),
      escapeCsv('-'),
      escapeCsv('-'),
      escapeCsv('-'),
      escapeCsv('-'),
      escapeCsv('N/A'),
      escapeCsv('NONE'),
    ].join(','));
  } else {
    trains.forEach((t) => {
      lines.push([
        escapeCsv(t.trainNumber),
        escapeCsv(t.trainName),
        escapeCsv(t.category),
        escapeCsv(t.arrivalTime),
        escapeCsv(t.departureTime),
        escapeCsv(t.direction || 'UP'),
        escapeCsv(t.status),
        escapeCsv(t.conflictWithBlockId || 'NONE'),
      ].join(','));
    });
  }

  lines.push('');
  lines.push('================================================================================');
  lines.push('END OF REPORT - RAILSYNC INDIAN RAILWAYS DIVISI0NAL OPERATING HUB');
  lines.push('================================================================================');

  return BOM + lines.join('\r\n');
}

/**
 * Triggers browser download of the structured corridor CSV log
 */
export function exportCorridorCsvReport(options: CorridorReportExportOptions): {
  success: boolean;
  filename: string;
  byteCount: number;
} {
  const csvContent = generateCorridorOperationsCsv(options);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `RailSync_Corridor_${options.corridor.id}_Operations_Report_${dateStr}.csv`;

  downloadFile(csvContent, filename, 'text/csv;charset=utf-8');

  return {
    success: true,
    filename,
    byteCount: csvContent.length,
  };
}
