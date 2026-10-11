import { Router, Request, Response } from 'express';
import { backendStore } from '../services/backendStore';
import { generateScheduleOffsets, generateDrmIncidentBrief } from '../services/geminiBackendService';
import { approvalRateHistoryService } from '../../src/services/approvalRateHistoryService';
import { MOCK_USERS } from '../../src/data/mockData';

export const apiRouter = Router();

// =========================================================================
// HEALTH & SYSTEM STATUS
// =========================================================================
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    service: 'RAILSYNC Railway Block Planning Backend',
    version: '2.0.0-PROD',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    geminiAiReady: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    environment: process.env.NODE_ENV || 'development',
  });
});

apiRouter.get('/system/status', (_req: Request, res: Response) => {
  res.json({
    pythonBackend: true,
    backendOnline: true,
    googleAppsScript: true,
    googleSheets: true,
    optimizationEngine: true,
    conflictEngine: true,
    validationEngine: true,
    geminiAiEngine: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    isMockMode: false,
    apiBaseUrl: '',
    lastSyncTime: new Date().toLocaleTimeString(),
  });
});

// =========================================================================
// AUTHENTICATION
// =========================================================================
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email } = req.body || {};
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === (email || '').toLowerCase()) || MOCK_USERS[0];
  res.json({
    user,
    token: `railsync_jwt_${Date.now()}`,
  });
});

apiRouter.post('/auth/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

apiRouter.get('/auth/current-user', (_req: Request, res: Response) => {
  res.json(MOCK_USERS[0]);
});

apiRouter.get('/users', (_req: Request, res: Response) => {
  res.json(MOCK_USERS);
});

// =========================================================================
// DASHBOARD & OVERVIEW
// =========================================================================
apiRouter.get('/dashboard', (_req: Request, res: Response) => {
  const kpis = backendStore.getDashboardKpis();
  const validation = backendStore.getValidationResult();
  res.json({ kpis, validation });
});

// =========================================================================
// CORRIDORS & RESOURCE METRICS
// =========================================================================
apiRouter.get('/corridors', (_req: Request, res: Response) => {
  res.json(backendStore.getCorridors());
});

apiRouter.get('/corridors/metrics', (_req: Request, res: Response) => {
  res.json(backendStore.getCorridorResourceMetrics());
});

apiRouter.get('/corridors/:id', (req: Request, res: Response) => {
  const corridor = backendStore.getCorridorById(req.params.id);
  if (!corridor) {
    return res.status(404).json({ error: `Corridor ${req.params.id} not found` });
  }
  res.json(corridor);
});

apiRouter.post('/corridors/:id/auto-balance', (req: Request, res: Response) => {
  try {
    const result = backendStore.autoBalanceCorridor(req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// =========================================================================
// ASSETS
// =========================================================================
apiRouter.get('/assets', (_req: Request, res: Response) => {
  res.json(backendStore.getAssets());
});

apiRouter.get('/assets/:id', (req: Request, res: Response) => {
  const asset = backendStore.getAssetById(req.params.id);
  if (!asset) {
    return res.status(404).json({ error: `Asset ${req.params.id} not found` });
  }
  res.json(asset);
});

// =========================================================================
// TRAINS
// =========================================================================
apiRouter.get('/trains', (_req: Request, res: Response) => {
  res.json(backendStore.getTrains());
});

apiRouter.get('/trains/:number', (req: Request, res: Response) => {
  const train = backendStore.getTrainByNumber(req.params.number);
  if (!train) {
    return res.status(404).json({ error: `Train ${req.params.number} not found` });
  }
  res.json(train);
});

// =========================================================================
// BLOCK REQUESTS
// =========================================================================
apiRouter.get('/block-requests', (_req: Request, res: Response) => {
  res.json(backendStore.getBlockRequests());
});

apiRouter.post('/block-requests', (req: Request, res: Response) => {
  const created = backendStore.addBlockRequest(req.body);
  res.status(201).json(created);
});

// =========================================================================
// DEFECTS
// =========================================================================
apiRouter.get('/defects', (_req: Request, res: Response) => {
  res.json(backendStore.getDefects());
});

apiRouter.post('/defects', (req: Request, res: Response) => {
  const created = backendStore.addDefect(req.body);
  res.status(201).json(created);
});

// =========================================================================
// PLANNING & OPTIMIZATION
// =========================================================================
apiRouter.post('/planning/generate', (req: Request, res: Response) => {
  const result = backendStore.triggerAiPlanning(req.body);
  res.json(result);
});

apiRouter.get('/planning/optimized-blocks', (_req: Request, res: Response) => {
  res.json(backendStore.getOptimizedBlocks());
});

// =========================================================================
// CONFLICT MANAGEMENT
// =========================================================================
apiRouter.get('/conflicts', (_req: Request, res: Response) => {
  res.json(backendStore.getConflicts());
});

apiRouter.get('/conflicts/:id/alternative-slots', (req: Request, res: Response) => {
  const candidates = backendStore.getAlternativeSlots(req.params.id);
  res.json(candidates);
});

apiRouter.post('/conflicts/resolve', (req: Request, res: Response) => {
  const { conflictId, slot } = req.body || {};
  try {
    const result = backendStore.resolveConflictWithSlot(conflictId, slot);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/conflicts/resolve-all', (_req: Request, res: Response) => {
  const result = backendStore.resolveAllCriticalConflicts();
  res.json(result);
});

apiRouter.post('/conflicts/close', (req: Request, res: Response) => {
  const { conflictId } = req.body || {};
  res.json({ success: true, conflictId, status: 'CLOSED' });
});

apiRouter.post('/conflicts/reopen', (req: Request, res: Response) => {
  const { conflictId } = req.body || {};
  res.json({ success: true, conflictId, status: 'DETECTED' });
});

// =========================================================================
// TASKS, VALIDATION, PUBLICATION & AUDIT LOGS
// =========================================================================
apiRouter.get('/tasks', (_req: Request, res: Response) => {
  res.json(backendStore.getMaintenanceTasks());
});

apiRouter.get('/validation', (_req: Request, res: Response) => {
  res.json(backendStore.getValidationResult());
});

apiRouter.get('/publication/state', (_req: Request, res: Response) => {
  res.json(backendStore.getPublicationInfo());
});

apiRouter.post('/publish', (req: Request, res: Response) => {
  const { officerName, role, autoResolveIfBlocked } = req.body || {};
  const result = backendStore.publishSchedule(officerName, role, autoResolveIfBlocked);
  res.json(result);
});

apiRouter.post('/publish/revoke', (req: Request, res: Response) => {
  const { officerName, reason } = req.body || {};
  const result = backendStore.revokePublication(officerName, reason);
  res.json(result);
});

apiRouter.get('/audit-logs', (_req: Request, res: Response) => {
  res.json(backendStore.getAuditLogs());
});

// =========================================================================
// 30-DAY HISTORICAL APPROVAL RATES
// =========================================================================
apiRouter.get('/approval-rates/history', (req: Request, res: Response) => {
  const days = Number(req.query.days) === 7 ? 7 : Number(req.query.days) === 14 ? 14 : 30;
  res.json(approvalRateHistoryService.getHistory(days));
});

apiRouter.get('/approval-rates/summary', (req: Request, res: Response) => {
  const days = Number(req.query.days) === 7 ? 7 : Number(req.query.days) === 14 ? 14 : 30;
  res.json(approvalRateHistoryService.getSummary(days));
});

apiRouter.get('/approval-rates/export', (req: Request, res: Response) => {
  const days = Number(req.query.days) === 7 ? 7 : Number(req.query.days) === 14 ? 14 : 30;
  const csv = approvalRateHistoryService.generateCsv(days);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=approval_rates_last_${days}_days.csv`);
  res.send(csv);
});

// =========================================================================
// GEMINI AI INTEGRATION ROUTES
// =========================================================================
apiRouter.post('/ai/propose-schedule-offsets', async (req: Request, res: Response) => {
  try {
    const { conflicts, corridorAvailability, selectedConflictId } = req.body || {};
    const inputConflicts = conflicts || backendStore.getConflicts();
    const result = await generateScheduleOffsets(inputConflicts, corridorAvailability, selectedConflictId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'AI proposal failed' });
  }
});

apiRouter.post('/ai/drm-brief', async (req: Request, res: Response) => {
  try {
    const incidentData = req.body;
    const brief = await generateDrmIncidentBrief(incidentData);
    res.json({ brief, generatedAt: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Brief generation failed' });
  }
});
