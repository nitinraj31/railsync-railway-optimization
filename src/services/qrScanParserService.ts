import { mockStore } from './api';
import { Defect, OptimizedBlock, Train, Asset, BlockRequest, Conflict, Corridor } from '../types';

export type QrTargetType =
  | 'DEFECT'
  | 'BLOCK'
  | 'TRAIN'
  | 'ASSET'
  | 'REQUEST'
  | 'CONFLICT'
  | 'CORRIDOR'
  | 'VALIDATION'
  | 'GENERAL_SEARCH';

export interface ParsedQrResult {
  rawValue: string;
  targetType: QrTargetType;
  targetId: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: 'rose' | 'amber' | 'emerald' | 'sky' | 'indigo' | 'purple' | 'slate';
  targetScreen: string;
  details?: Record<string, string | number | boolean>;
  matchedItem?: Defect | OptimizedBlock | Train | Asset | BlockRequest | Conflict | Corridor | any;
  directNavigateParams: {
    screen: string;
    itemData?: any;
  };
}

/**
 * Intelligent parser for scanned QR code payloads across Indian Railways RailSync system.
 * Handles deep links, JSON descriptors, raw identifiers (BLK-*, DEF-*, TR*, AST-*), and general text.
 */
export function parseScannedQrData(rawValue: string): ParsedQrResult {
  const trimmed = rawValue.trim();

  // 1. Try URL parsing (Deep links)
  let extractedId: string | null = null;
  let urlScreen: string | null = null;

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);

      // Check query params
      const qDefect = url.searchParams.get('defectId');
      const qBlock = url.searchParams.get('blockId');
      const qTrain = url.searchParams.get('trainNumber');
      const qAsset = url.searchParams.get('assetId');
      const qScreen = url.searchParams.get('screen');
      const qReport = url.searchParams.get('reportId');
      const qRef = url.searchParams.get('ref');

      // Check URL hash (#defect=... or #block=...)
      const hashDefect = url.hash.match(/defect=([^&]+)/);
      const hashBlock = url.hash.match(/block=([^&]+)/);

      if (qDefect || hashDefect) {
        extractedId = qDefect || (hashDefect ? decodeURIComponent(hashDefect[1]) : null);
        return buildDefectResult(trimmed, extractedId!);
      }

      if (qBlock || hashBlock) {
        extractedId = qBlock || (hashBlock ? decodeURIComponent(hashBlock[1]) : null);
        return buildBlockResult(trimmed, extractedId!);
      }

      if (qReport || (qScreen && qScreen.toUpperCase() === 'VALIDATION')) {
        return {
          rawValue: trimmed,
          targetType: 'VALIDATION',
          targetId: qReport || qRef || 'VALIDATION-REPORT',
          title: `Validation Safety Report ${qReport ? `[${qReport}]` : ''}`,
          subtitle: `Verified Gazette Reference: ${qRef || 'Sanctioned Timetable'}`,
          badge: 'SAFETY GATE',
          badgeColor: 'emerald',
          targetScreen: 'validation',
          details: {
            reportId: qReport || 'Live Validation',
            reference: qRef || 'NR-DELHI',
            verified: true,
          },
          directNavigateParams: {
            screen: 'validation',
          },
        };
      }

      if (qTrain) {
        return buildTrainResult(trimmed, qTrain);
      }

      if (qAsset) {
        return buildAssetResult(trimmed, qAsset);
      }
    }
  } catch (e) {
    // Not a valid URL, continue to JSON/raw parsing
  }

  // 2. Try JSON parsing
  try {
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);

      if (parsed.defectId) {
        return buildDefectResult(trimmed, String(parsed.defectId), parsed);
      }
      if (parsed.blockId) {
        return buildBlockResult(trimmed, String(parsed.blockId), parsed);
      }
      if (parsed.schId || parsed.reportId || parsed.system?.includes('SAFETY')) {
        return {
          rawValue: trimmed,
          targetType: 'VALIDATION',
          targetId: parsed.schId || parsed.reportId || 'SAFETY-REPORT',
          title: `Safety Validation: ${parsed.schId || parsed.reportId}`,
          subtitle: `Verdict: ${parsed.verdict || parsed.status || 'VERIFIED'}`,
          badge: 'GATE COMPLIANT',
          badgeColor: 'emerald',
          targetScreen: 'validation',
          details: parsed,
          directNavigateParams: {
            screen: 'validation',
          },
        };
      }
      if (parsed.trainNumber) {
        return buildTrainResult(trimmed, String(parsed.trainNumber), parsed);
      }
      if (parsed.assetId) {
        return buildAssetResult(trimmed, String(parsed.assetId), parsed);
      }
    }
  } catch (e) {
    // Not JSON, continue to raw token matching
  }

  // 3. Raw Token / Identifier pattern matching
  const upper = trimmed.toUpperCase();

  // Defect pattern: DEF-* or DEFECT-*
  if (upper.startsWith('DEF-') || upper.startsWith('DEFECT-')) {
    return buildDefectResult(trimmed, upper);
  }

  // Block pattern: BLK-* or BLOCK-*
  if (upper.startsWith('BLK-') || upper.startsWith('BLOCK-')) {
    return buildBlockResult(trimmed, upper);
  }

  // Train pattern: TR*, 12***, 22***
  if (upper.startsWith('TR') || /^\d{5}$/.test(upper)) {
    const trainResult = buildTrainResult(trimmed, upper);
    if (trainResult.matchedItem) return trainResult;
  }

  // Asset pattern: AST-*, A0*, TRK-*, OHE-*, SIG-*
  if (
    upper.startsWith('AST-') ||
    /^A0\d+/.test(upper) ||
    upper.startsWith('TRK-') ||
    upper.startsWith('OHE-') ||
    upper.startsWith('SIG-')
  ) {
    return buildAssetResult(trimmed, upper);
  }

  // Request pattern: REQ-*
  if (upper.startsWith('REQ-')) {
    const reqs = mockStore.getBlockRequests();
    const match = reqs.find((r) => r.requestId.toUpperCase() === upper);
    return {
      rawValue: trimmed,
      targetType: 'REQUEST',
      targetId: upper,
      title: match ? `${match.requestId} — ${match.taskType}` : `Block Request: ${upper}`,
      subtitle: match ? `Corridor: ${match.corridorId} | Requester: ${match.requester}` : `Submitted Request`,
      badge: match?.status || 'REQUEST',
      badgeColor: 'sky',
      targetScreen: 'requests',
      matchedItem: match,
      directNavigateParams: {
        screen: 'requests',
        itemData: match,
      },
    };
  }

  // Conflict pattern: CONF-* or CNF-*
  if (upper.startsWith('CONF-') || upper.startsWith('CNF-')) {
    const conflicts = mockStore.getConflicts();
    const match = conflicts.find((c) => c.conflictId.toUpperCase() === upper);
    return {
      rawValue: trimmed,
      targetType: 'CONFLICT',
      targetId: upper,
      title: match ? `Conflict: ${match.blockId} ↔ ${match.trainNumber}` : `Conflict ${upper}`,
      subtitle: match?.description || 'Active railway conflict',
      badge: match?.status || 'OPEN',
      badgeColor: 'rose',
      targetScreen: 'conflicts',
      matchedItem: match,
      directNavigateParams: {
        screen: 'conflicts',
        itemData: match ? { blockId: match.blockId } : undefined,
      },
    };
  }

  // Check if token matches any existing defect in store
  const existingDefect = mockStore.getDefects().find(
    (d) => d.defectId.toUpperCase() === upper || d.assetId.toUpperCase() === upper
  );
  if (existingDefect) {
    return buildDefectResult(trimmed, existingDefect.defectId, existingDefect);
  }

  // Check if token matches any existing block in store
  const existingBlock = mockStore.getOptimizedBlocks().find(
    (b) => b.blockId.toUpperCase() === upper || b.taskId.toUpperCase() === upper
  );
  if (existingBlock) {
    return buildBlockResult(trimmed, existingBlock.blockId, existingBlock);
  }

  // Check if token matches any corridor
  const existingCorridor = mockStore.getCorridors().find(
    (c) => c.id.toUpperCase() === upper || c.code.toUpperCase() === upper
  );
  if (existingCorridor) {
    return {
      rawValue: trimmed,
      targetType: 'CORRIDOR',
      targetId: existingCorridor.id,
      title: `Corridor ${existingCorridor.code}: ${existingCorridor.name}`,
      subtitle: `Length: ${existingCorridor.lengthKm} km | Max Slots: ${existingCorridor.availableSlots}`,
      badge: 'CORRIDOR',
      badgeColor: 'emerald',
      targetScreen: 'corridors',
      matchedItem: existingCorridor,
      directNavigateParams: {
        screen: 'corridors',
        itemData: existingCorridor,
      },
    };
  }

  // Default: General Search query fallback
  return {
    rawValue: trimmed,
    targetType: 'GENERAL_SEARCH',
    targetId: trimmed,
    title: `Search Query: "${trimmed}"`,
    subtitle: 'Scan matched custom text payload. Open in Global Search for all entities.',
    badge: 'GENERAL SEARCH',
    badgeColor: 'slate',
    targetScreen: 'command_center',
    directNavigateParams: {
      screen: 'command_center',
      itemData: { searchQuery: trimmed },
    },
  };
}

/**
 * Builds standard Defect result payload with matched entity details
 */
function buildDefectResult(rawValue: string, defectId: string, extraData?: any): ParsedQrResult {
  const normId = defectId.trim().toUpperCase();
  const defects = mockStore.getDefects();
  const matched = defects.find((d) => d.defectId.toUpperCase() === normId);

  const severity = matched?.severity || extraData?.severity || 'CRITICAL';
  const severityColor: 'rose' | 'amber' | 'emerald' | 'sky' =
    severity === 'CRITICAL' ? 'rose' : severity === 'HIGH' ? 'amber' : 'sky';

  const title = matched
    ? `${matched.defectId} — ${matched.defectType}`
    : `Defect Record: ${normId}`;

  const subtitle = matched
    ? `Asset: ${matched.assetId} on Corridor ${matched.corridorId} | Speed Order: ${matched.speedRestrictionKmph || 'None'} km/h`
    : `Track-side defect identification placard (${normId})`;

  return {
    rawValue,
    targetType: 'DEFECT',
    targetId: normId,
    title,
    subtitle,
    badge: `DEFECT: ${severity}`,
    badgeColor: severityColor,
    targetScreen: 'defects',
    details: {
      defectId: normId,
      department: matched?.department || extraData?.department || 'ENGINEERING',
      severity,
      speedRestriction: matched?.speedRestrictionKmph ? `${matched.speedRestrictionKmph} km/h` : 'None',
      status: matched?.status || 'OPEN',
      assetId: matched?.assetId || 'Unknown',
    },
    matchedItem: matched,
    directNavigateParams: {
      screen: 'defects',
      itemData: { defectId: normId },
    },
  };
}

/**
 * Builds standard Block result payload with matched entity details
 */
function buildBlockResult(rawValue: string, blockId: string, extraData?: any): ParsedQrResult {
  const normId = blockId.trim().toUpperCase();
  const blocks = mockStore.getOptimizedBlocks();
  const matched = blocks.find((b) => b.blockId.toUpperCase() === normId);
  const conflicts = mockStore.getConflicts();
  const hasConflict = matched?.hasConflict || conflicts.some((c) => c.blockId.toUpperCase() === normId && c.status === 'OPEN');

  const title = matched
    ? `${matched.blockId} — ${matched.department} (${matched.assetId})`
    : `Maintenance Block: ${normId}`;

  const subtitle = matched
    ? `Window: ${matched.startTime}–${matched.endTime} (${matched.durationMinutes}m) on ${matched.corridorId} | Status: ${matched.status}`
    : `Authorized railway maintenance slot (${normId})`;

  const badgeText = hasConflict ? 'BLOCK: CONFLICT' : 'BLOCK: CLEARED';
  const badgeColor: 'rose' | 'emerald' = hasConflict ? 'rose' : 'emerald';

  // If the block is in conflict, direct navigate to conflicts screen so controller can resolve it!
  const targetScreen = hasConflict ? 'conflicts' : 'timeline';

  return {
    rawValue,
    targetType: 'BLOCK',
    targetId: normId,
    title,
    subtitle,
    badge: badgeText,
    badgeColor,
    targetScreen,
    details: {
      blockId: normId,
      corridorId: matched?.corridorId || extraData?.corridorId || 'C001',
      timeSlot: matched ? `${matched.startTime}–${matched.endTime}` : 'Scheduled',
      department: matched?.department || extraData?.department || 'ENGINEERING',
      hasConflict,
      status: matched?.status || 'SCHEDULED',
    },
    matchedItem: matched,
    directNavigateParams: {
      screen: targetScreen,
      itemData: { blockId: normId },
    },
  };
}

/**
 * Builds standard Train result payload
 */
function buildTrainResult(rawValue: string, trainNumber: string, extraData?: any): ParsedQrResult {
  const normTrain = trainNumber.trim().toUpperCase();
  const trains = mockStore.getTrains();
  const matched = trains.find(
    (t) => t.trainNumber.toUpperCase() === normTrain || t.trainName.toUpperCase().includes(normTrain)
  );

  return {
    rawValue,
    targetType: 'TRAIN',
    targetId: matched?.trainNumber || normTrain,
    title: matched ? `${matched.trainNumber} - ${matched.trainName}` : `Train ${normTrain}`,
    subtitle: matched
      ? `Category: ${matched.category} | Corridor: ${matched.corridorId} | ${matched.arrivalTime} → ${matched.departureTime}`
      : 'Indian Railways Timetabled Train Rake',
    badge: matched?.conflictWithBlockId ? 'TRAIN CLASH' : 'PASSENGER / FREIGHT',
    badgeColor: matched?.conflictWithBlockId ? 'rose' : 'sky',
    targetScreen: 'trains',
    details: {
      trainNumber: matched?.trainNumber || normTrain,
      category: matched?.category || 'EXPRESS',
      status: matched?.status || 'ON_TIME',
    },
    matchedItem: matched,
    directNavigateParams: {
      screen: 'trains',
      itemData: matched,
    },
  };
}

/**
 * Builds standard Asset result payload
 */
function buildAssetResult(rawValue: string, assetId: string, extraData?: any): ParsedQrResult {
  const normAsset = assetId.trim().toUpperCase();
  const assets = mockStore.getAssets();
  const matched = assets.find((a) => a.id.toUpperCase() === normAsset);

  return {
    rawValue,
    targetType: 'ASSET',
    targetId: matched?.id || normAsset,
    title: matched ? `${matched.id} — ${matched.name}` : `Railway Asset: ${normAsset}`,
    subtitle: matched
      ? `${matched.department} | Corridor: ${matched.corridorId} | Health: ${matched.condition}`
      : 'Permanent Way / Traction / S&T Asset',
    badge: matched?.priority || 'ASSET',
    badgeColor: matched?.condition === 'CRITICAL' ? 'rose' : 'emerald',
    targetScreen: 'maintenance_assets',
    details: {
      assetId: matched?.id || normAsset,
      type: matched?.type || 'TRACK_SECTION',
      department: matched?.department || 'ENGINEERING',
      condition: matched?.condition || 'GOOD',
    },
    matchedItem: matched,
    directNavigateParams: {
      screen: 'maintenance_assets',
      itemData: matched,
    },
  };
}
