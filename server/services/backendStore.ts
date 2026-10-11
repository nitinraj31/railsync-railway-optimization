import {
  Asset,
  Corridor,
  TrainSchedule,
  BlockRequest,
  Defect,
  OptimizedBlock,
  Conflict,
  AlternativeSlot,
  ValidationResult,
  AuditLog,
  PublicationInfo,
  MachineryResource,
  ManpowerGang,
  CorridorResourceMetrics,
  AiScheduleOffsetProposal,
  CorridorAutoBalanceResult,
  CorridorAutoBalanceShift,
} from '../../src/types';
import {
  INITIAL_ASSETS,
  INITIAL_CORRIDORS,
  INITIAL_CONFLICTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_MACHINERY_RESOURCES,
  INITIAL_MANPOWER_GANGS,
  calculateCorridorResourceMetrics,
  generateInitialOptimizedBlocks,
  generateInitialBlockRequests,
  generateInitialDefects,
  generateInitialTrains,
  generateInitialMaintenanceTasks,
  ALTERNATIVE_SLOTS_DB,
} from '../../src/data/mockData';

export class BackendStore {
  private assets: Asset[];
  private corridors: Corridor[];
  private blockRequests: BlockRequest[];
  private defects: Defect[];
  private optimizedBlocks: OptimizedBlock[];
  private conflicts: Conflict[];
  private trains: TrainSchedule[];
  private maintenanceTasks: any[];
  private auditLogs: AuditLog[];
  private machinery: MachineryResource[];
  private manpowerGangs: ManpowerGang[];
  private autoArchiveResolved: boolean = true;
  private publicationInfo: PublicationInfo = {
    currentState: 'VALIDATION',
    totalBlocksPublished: 0,
    scheduleVersion: 'v2026.09.06-REV1',
  };

  constructor() {
    this.assets = [...INITIAL_ASSETS];
    this.corridors = [...INITIAL_CORRIDORS];
    this.blockRequests = generateInitialBlockRequests();
    this.defects = generateInitialDefects();
    this.optimizedBlocks = generateInitialOptimizedBlocks();
    this.conflicts = [...INITIAL_CONFLICTS];
    this.trains = generateInitialTrains();
    this.maintenanceTasks = generateInitialMaintenanceTasks();
    this.auditLogs = [...INITIAL_AUDIT_LOGS];
    this.machinery = [...INITIAL_MACHINERY_RESOURCES];
    this.manpowerGangs = [...INITIAL_MANPOWER_GANGS];
  }

  // Dashboard & KPIs
  public getDashboardKpis() {
    return {
      assetsCount: this.assets.length,
      maintenanceTasksCount: this.maintenanceTasks.length,
      defectsCount: this.defects.length,
      corridorSlotsCount: 48,
      trainScheduleCount: this.trains.length,
      blockRequestsCount: this.blockRequests.length,
      optimizedBlocksCount: this.optimizedBlocks.length,
      initialConflictsCount: this.conflicts.length,
      activeConflictsCount: this.conflicts.filter((c) => c.status === 'OPEN').length,
      resolvedConflictsCount: this.conflicts.filter((c) => c.status === 'RESOLVED').length,
    };
  }

  // Corridors & Resources
  public getCorridors(): Corridor[] {
    return this.corridors;
  }

  public getCorridorById(id: string): Corridor | undefined {
    return this.corridors.find((c) => c.id.toLowerCase() === id.toLowerCase());
  }

  public getCorridorResourceMetrics(): CorridorResourceMetrics[] {
    return calculateCorridorResourceMetrics(
      this.corridors,
      this.machinery,
      this.manpowerGangs
    );
  }

  public autoBalanceCorridor(corridorId: string): CorridorAutoBalanceResult {
    const corridor = this.getCorridorById(corridorId);
    if (!corridor) {
      throw new Error(`Corridor ${corridorId} not found`);
    }

    const corridorBlocks = this.optimizedBlocks.filter((b) => b.corridorId === corridor.id);
    const shifts: CorridorAutoBalanceShift[] = corridorBlocks.slice(0, 3).map((b, idx) => {
      const origStartH = parseInt(b.startTime.split(':')[0], 10);
      const newStartH = (origStartH + idx + 1) % 24;
      const newStart = `${String(newStartH).padStart(2, '0')}:00`;
      const newEnd = `${String((newStartH + 1) % 24).padStart(2, '0')}:30`;

      return {
        blockId: b.blockId,
        department: b.department,
        assetId: b.assetId || 'AST-TRK-01',
        assetName: b.assetId ? `${b.assetId} Section` : 'Track Section',
        oldTimeWindow: `${b.startTime}–${b.endTime}`,
        newTimeWindow: `${newStart}–${newEnd}`,
        durationMinutes: b.durationMinutes,
        reason: 'Shifted to timetable lull window to optimize resource capacity.',
        varianceRelief: 'Relieves 15% peak corridor density',
      };
    });

    return {
      success: true,
      corridorId: corridor.id,
      corridorCode: corridor.code,
      corridorName: corridor.name,
      preLoadPct: 88,
      postLoadPct: 72,
      loadReliefPct: 16,
      prePeakStrain: 92,
      postPeakStrain: 74,
      strainReliefPts: 18,
      rebalancedBlocksCount: shifts.length,
      incorporatedRequestsCount: 4,
      resolvedConflictsCount: 2,
      shifts,
      hourlyLoadCurve: [],
      aiRationale: 'Heuristic schedule rebalancing relocated 3 maintenance blocks into timetable lull windows, reducing corridor peak strain by 18 points.',
      timestamp: new Date().toISOString(),
    };
  }

  // Assets
  public getAssets(): Asset[] {
    return this.assets;
  }

  public getAssetById(id: string): Asset | undefined {
    return this.assets.find((a) => a.id.toLowerCase() === id.toLowerCase());
  }

  // Trains
  public getTrains(): TrainSchedule[] {
    return this.trains;
  }

  public getTrainByNumber(number: string): TrainSchedule | undefined {
    return this.trains.find((t) => t.trainNumber.toLowerCase() === number.toLowerCase());
  }

  // Block Requests
  public getBlockRequests(): BlockRequest[] {
    return this.blockRequests;
  }

  public addBlockRequest(reqData: Partial<BlockRequest>): BlockRequest {
    const newReq: BlockRequest = {
      requestId: `REQ-${Date.now().toString().slice(-4)}`,
      department: reqData.department || 'ENGINEERING',
      requester: reqData.requester || 'SSE/P.Way New Delhi',
      requesterRole: (reqData.requesterRole as any) || 'ENGINEERING_OFFICER',
      assetId: reqData.assetId || 'AST-TRK-01',
      assetType: reqData.assetType || 'TRACK_SECTION',
      corridorId: reqData.corridorId || 'C001',
      taskType: reqData.taskType || 'Track Maintenance',
      priority: (reqData.priority as any) || 'MEDIUM',
      requestedDate: reqData.requestedDate || new Date().toISOString().slice(0, 10),
      preferredStartTime: reqData.preferredStartTime || '14:00',
      preferredEndTime: reqData.preferredEndTime || '16:00',
      requiredDurationMinutes: reqData.requiredDurationMinutes || 120,
      description: reqData.description || 'Routine maintenance and track inspection',
      operationalConstraints: reqData.operationalConstraints || 'Requires speed restriction 30 km/h',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      syncedToGoogleSheets: false,
      ...reqData,
    };

    this.blockRequests.unshift(newReq);
    this.addAuditLog('BLOCK_REQUEST_SUBMITTED', 'SYSTEM', `New maintenance block request ${newReq.requestId} submitted.`);
    return newReq;
  }

  // Defects
  public getDefects(): Defect[] {
    return this.defects;
  }

  public addDefect(defectData: Partial<Defect>): Defect {
    const newDefect: Defect = {
      defectId: `DEF-${Date.now().toString().slice(-4)}`,
      assetId: defectData.assetId || 'AST-TRK-01',
      department: defectData.department || 'ENGINEERING',
      corridorId: defectData.corridorId || 'C001',
      defectType: defectData.defectType || 'Track Geometry Variance',
      severity: defectData.severity || 'CRITICAL',
      detectedDate: new Date().toISOString().slice(0, 10),
      description: defectData.description || 'Track alignment deviation detected',
      reportedBy: defectData.reportedBy || 'PWI Patrol Gang',
      status: 'PENDING_PRIORITY_ANALYSIS',
      speedRestrictionKmph: defectData.speedRestrictionKmph || 30,
      ...defectData,
    };

    this.defects.unshift(newDefect);
    this.addAuditLog('DEFECT_REPORTED', 'SYSTEM', `Defect ${newDefect.defectId} reported with severity ${newDefect.severity}.`);
    return newDefect;
  }

  // Optimized Blocks
  public getOptimizedBlocks(): OptimizedBlock[] {
    return this.optimizedBlocks;
  }

  public triggerAiPlanning(_inputs?: any): { blocks: OptimizedBlock[]; newBlocksCount: number } {
    this.addAuditLog('PLAN_GENERATED', 'AI_ENGINE', 'Automatic Multi-Corridor Schedule Optimization executed.');
    return {
      blocks: this.optimizedBlocks,
      newBlocksCount: this.optimizedBlocks.length,
    };
  }

  // Conflicts
  public getConflicts(): Conflict[] {
    return this.conflicts;
  }

  public getAlternativeSlots(conflictId: string): AlternativeSlot[] {
    const conflict = this.conflicts.find((c) => c.conflictId === conflictId);
    const blockId = conflict?.blockId || 'BLK-T012';
    const candidates = ALTERNATIVE_SLOTS_DB.candidates[blockId] || [
      {
        slotId: `SLOT-${Date.now().toString().slice(-4)}`,
        startTime: '13:00',
        endTime: '14:30',
        corridorId: conflict?.corridorId || 'C003',
        date: '2026-09-06',
        durationMinutes: 90,
        trainConflictsCount: 0,
        assetConflictsCount: 0,
        constraintStatus: 'SATISFIED',
        optimizationScore: 95.0,
        scoreBreakdown: 'Zero train headway overlaps; daytime maintenance shadow window.',
        recommendationLevel: 'BEST_MATCH',
      },
    ];
    return candidates as AlternativeSlot[];
  }

  public resolveConflictWithSlot(conflictId: string, slot: AlternativeSlot): { success: boolean; conflict: Conflict } {
    const idx = this.conflicts.findIndex((c) => c.conflictId === conflictId);
    if (idx === -1) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const c = this.conflicts[idx];
    const resolvedConflict: Conflict = {
      ...c,
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: `Rescheduled to shadow slot ${slot.slotId} (${slot.startTime}–${slot.endTime}).`,
    };
    this.conflicts[idx] = resolvedConflict;

    // Update corresponding block
    const blockIdx = this.optimizedBlocks.findIndex((b) => b.blockId === c.blockId);
    if (blockIdx !== -1) {
      this.optimizedBlocks[blockIdx] = {
        ...this.optimizedBlocks[blockIdx],
        startTime: slot.startTime,
        endTime: slot.endTime,
        hasConflict: false,
        validationStatus: 'VALID',
      };
    }

    this.addAuditLog('CONFLICT_RESOLVED', 'DISPATCHER', `Conflict ${conflictId} resolved via slot ${slot.slotId}.`);
    return { success: true, conflict: resolvedConflict };
  }

  public resolveAllCriticalConflicts(): { success: boolean; resolvedCount: number } {
    let count = 0;
    this.conflicts = this.conflicts.map((c) => {
      if (c.severity === 'CRITICAL' && c.status === 'OPEN') {
        count++;
        return {
          ...c,
          status: 'RESOLVED',
          resolvedAt: new Date().toISOString(),
          resolutionNotes: 'Bulk resolved with AI Shadow Window assignment.',
        };
      }
      return c;
    });

    this.addAuditLog('CRITICAL_CONFLICTS_BULK_RESOLVED', 'AI_ENGINE', `${count} critical conflicts resolved in batch.`);
    return { success: true, resolvedCount: count };
  }

  public applyAiScheduleOffset(proposal: AiScheduleOffsetProposal): { success: boolean; block: OptimizedBlock | null } {
    const blockIdx = this.optimizedBlocks.findIndex((b) => b.blockId === proposal.blockId);
    let updatedBlock: OptimizedBlock | null = null;

    if (blockIdx !== -1) {
      const [start, end] = proposal.proposedInterval.split('–').map((s) => s.trim());
      this.optimizedBlocks[blockIdx] = {
        ...this.optimizedBlocks[blockIdx],
        startTime: start || this.optimizedBlocks[blockIdx].startTime,
        endTime: end || this.optimizedBlocks[blockIdx].endTime,
        hasConflict: false,
        validationStatus: 'VALID',
      };
      updatedBlock = this.optimizedBlocks[blockIdx];
    }

    const conflictIdx = this.conflicts.findIndex((c) => c.conflictId === proposal.conflictId);
    if (conflictIdx !== -1) {
      this.conflicts[conflictIdx] = {
        ...this.conflicts[conflictIdx],
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString(),
        resolutionNotes: proposal.justification,
      };
    }

    return { success: true, block: updatedBlock };
  }

  public batchApplyAiScheduleOffsets(proposals: AiScheduleOffsetProposal[]): { count: number } {
    let count = 0;
    for (const p of proposals) {
      this.applyAiScheduleOffset(p);
      count++;
    }
    return { count };
  }

  // Publication
  public getPublicationInfo(): PublicationInfo {
    return this.publicationInfo;
  }

  public publishSchedule(officerName: string, role?: string, autoResolveIfBlocked?: boolean): PublicationInfo {
    if (autoResolveIfBlocked) {
      this.resolveAllCriticalConflicts();
    }

    this.publicationInfo = {
      currentState: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      publishedBy: officerName || 'Divisional Railway Manager (Delhi)',
      approvedBy: officerName || 'Divisional Railway Manager',
      scheduleVersion: `v${new Date().toISOString().slice(0, 10)}.REV-${Date.now().toString().slice(-3)}`,
      totalBlocksPublished: this.optimizedBlocks.length,
    };

    this.addAuditLog('SCHEDULE_PUBLISHED', role || 'DRM', `Schedule version ${this.publicationInfo.scheduleVersion} published.`);
    return this.publicationInfo;
  }

  public revokePublication(officerName: string, reason: string): PublicationInfo {
    this.publicationInfo = {
      ...this.publicationInfo,
      currentState: 'DRAFT',
      publishedBy: undefined,
      approvedBy: undefined,
    };

    this.addAuditLog('SCHEDULE_REVOKED', officerName || 'OPERATIONS', `Schedule publication revoked: ${reason}`);
    return this.publicationInfo;
  }

  // Audit Logs
  public getAuditLogs(): AuditLog[] {
    return this.auditLogs;
  }

  public addAuditLog(action: string, performedBy: string, details: string): AuditLog {
    const log: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      action,
      user: performedBy,
      details,
      severity: 'NORMAL',
      status: 'SUCCESS',
    };
    this.auditLogs.unshift(log);
    return log;
  }

  // Validation
  public getValidationResult(): ValidationResult {
    const criticalConflicts = this.conflicts.filter((c) => c.severity === 'CRITICAL' && c.status === 'OPEN');
    const isSafe = criticalConflicts.length === 0;

    return {
      status: isSafe ? 'SAFE_TO_PUBLISH' : 'REQUIRES_REVIEW',
      decisionText: isSafe ? 'SAFE TO PUBLISH' : 'NOT SAFE TO PUBLISH',
      totalBlocks: this.optimizedBlocks.length,
      validBlocks: this.optimizedBlocks.length - criticalConflicts.length,
      invalidBlocks: criticalConflicts.length,
      criticalIssuesCount: criticalConflicts.length,
      checklist: [
        {
          id: 'CHK-01',
          name: 'Sectional Headway Buffer Compliance (>= 30 min)',
          passed: isSafe,
          details: isSafe ? 'All maintenance blocks respect train headways' : `${criticalConflicts.length} train overlap conflicts found`,
        },
        {
          id: 'CHK-02',
          name: '25kV AC OHE Power Isolation Verification',
          passed: true,
          details: 'All traction blocks verified for OHE isolation clearance',
        },
        {
          id: 'CHK-03',
          name: 'Resource Allocation & Gang Availability',
          passed: true,
          details: 'Civil engineering & S&T crews within corridor allocation limits',
        },
      ],
      criticalIssues: criticalConflicts.map((c) => ({
        id: `ISSUE-${c.conflictId}`,
        issueId: `ISSUE-${c.conflictId}`,
        blockId: c.blockId,
        trainNumber: c.trainNumber,
        corridorId: c.corridorId,
        description: `Block ${c.blockId} conflicts with train ${c.trainNumber}`,
        severity: 'CRITICAL',
        conflictId: c.conflictId,
      })),
      lastValidatedAt: new Date().toISOString(),
      validatedBy: 'SYSTEM',
    };
  }

  public getMaintenanceTasks(): any[] {
    return this.maintenanceTasks;
  }
}

export const backendStore = new BackendStore();
