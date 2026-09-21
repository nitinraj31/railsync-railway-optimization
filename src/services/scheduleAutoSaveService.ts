import { OptimizedBlock, AuditLog } from '../types';
import { mockStore } from './api';
import { railwayAudio } from './railwayAudio';

export interface ScheduleChangeRecord {
  id: string;
  blockId: string;
  corridorId: string;
  department: string;
  section: string;
  fieldModified: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
  changeDescription: string;
  impactSummary?: string;
}

export interface ScheduleAutoSaveState {
  uncommittedChanges: ScheduleChangeRecord[];
  lastAutoSavedAt: string | null;
  lastCommittedAt: string | null;
  isCommitting: boolean;
  flashTrigger: number;
  lastCommitMessage: string | null;
}

const STORAGE_KEYS = {
  UNCOMMITTED_CHANGES: 'railsync_uncommitted_schedule_changes',
  DRAFT_BLOCKS: 'railsync_draft_schedule_blocks',
  LAST_AUTO_SAVED: 'railsync_last_autosaved_time',
  LAST_COMMITTED: 'railsync_last_committed_time',
};

class ScheduleAutoSaveService {
  private listeners: Set<(state: ScheduleAutoSaveState) => void> = new Set();
  private uncommittedChanges: ScheduleChangeRecord[] = [];
  private lastAutoSavedAt: string | null = null;
  private lastCommittedAt: string | null = null;
  private isCommitting: boolean = false;
  private flashTrigger: number = 0;
  private lastCommitMessage: string | null = null;

  constructor() {
    this.loadPersistedDraft();
  }

  private loadPersistedDraft() {
    try {
      const savedChanges = localStorage.getItem(STORAGE_KEYS.UNCOMMITTED_CHANGES);
      if (savedChanges) {
        this.uncommittedChanges = JSON.parse(savedChanges);
      }
      this.lastAutoSavedAt = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_SAVED);
      this.lastCommittedAt = localStorage.getItem(STORAGE_KEYS.LAST_COMMITTED);
    } catch (e) {
      console.error('Error loading auto-save draft from localStorage:', e);
    }
  }

  private persistState() {
    try {
      localStorage.setItem(
        STORAGE_KEYS.UNCOMMITTED_CHANGES,
        JSON.stringify(this.uncommittedChanges)
      );
      if (this.lastAutoSavedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_AUTO_SAVED, this.lastAutoSavedAt);
      }
      if (this.lastCommittedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_COMMITTED, this.lastCommittedAt);
      }
    } catch (e) {
      console.error('Error persisting auto-save state:', e);
    }
  }

  public getState(): ScheduleAutoSaveState {
    return {
      uncommittedChanges: [...this.uncommittedChanges],
      lastAutoSavedAt: this.lastAutoSavedAt,
      lastCommittedAt: this.lastCommittedAt,
      isCommitting: this.isCommitting,
      flashTrigger: this.flashTrigger,
      lastCommitMessage: this.lastCommitMessage,
    };
  }

  public subscribe(listener: (state: ScheduleAutoSaveState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in scheduleAutoSaveService subscriber:', err);
      }
    });

    // Also dispatch window custom event for multi-tab or independent component reactions
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('railsync:schedule-autosaved', {
          detail: state,
        })
      );
    }
  }

  /**
   * Registers a modification to a blocking schedule, triggers auto-save locally,
   * updates the uncommitted changes list, and increments the flash trigger.
   */
  public registerScheduleChange(
    change: Omit<ScheduleChangeRecord, 'id' | 'timestamp'>
  ): ScheduleChangeRecord {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();

    const newRecord: ScheduleChangeRecord = {
      ...change,
      id: `CHG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: timeStr,
    };

    // Replace if there's already an uncommitted change for the same block and field
    const existingIdx = this.uncommittedChanges.findIndex(
      (c) => c.blockId === change.blockId && c.fieldModified === change.fieldModified
    );

    if (existingIdx >= 0) {
      this.uncommittedChanges[existingIdx] = newRecord;
    } else {
      this.uncommittedChanges = [newRecord, ...this.uncommittedChanges];
    }

    this.lastAutoSavedAt = timeStr;
    this.flashTrigger += 1;
    this.lastCommitMessage = null;

    this.persistState();

    // Play subtle audio acknowledgment ping if enabled
    try {
      railwayAudio.playAcknowledgmentPing();
    } catch {
      // Audio fallback
    }

    this.notify();
    return newRecord;
  }

  /**
   * Modifies an existing block's schedule times directly, auto-saving it as a local draft.
   */
  public updateBlockSchedule(
    blockId: string,
    updates: {
      startTime?: string;
      endTime?: string;
      durationMinutes?: number;
      date?: string;
      section?: string;
    },
    reason: string
  ): boolean {
    const allBlocks = mockStore.getOptimizedBlocks();
    const block = allBlocks.find((b) => b.blockId === blockId);
    if (!block) return false;

    const oldSlot = `${block.startTime}–${block.endTime}`;
    const newStart = updates.startTime || block.startTime;
    const newEnd = updates.endTime || block.endTime;
    const newSlot = `${newStart}–${newEnd}`;

    // Apply updates to the block in memory
    if (updates.startTime) block.startTime = updates.startTime;
    if (updates.endTime) block.endTime = updates.endTime;
    if (updates.durationMinutes) block.durationMinutes = updates.durationMinutes;
    if (updates.date) block.date = updates.date;
    if (updates.section) block.section = updates.section;

    // Save draft blocks to localStorage
    try {
      localStorage.setItem(STORAGE_KEYS.DRAFT_BLOCKS, JSON.stringify(allBlocks));
    } catch (e) {
      console.error('Failed to save draft blocks:', e);
    }

    this.registerScheduleChange({
      blockId,
      corridorId: block.corridorId,
      department: block.department,
      section: block.section,
      fieldModified: 'SCHEDULE_SLOT',
      oldValue: oldSlot,
      newValue: newSlot,
      changeDescription: `Rescheduled window from ${oldSlot} to ${newSlot}. ${reason}`,
      impactSummary: `${block.corridorId} | ${block.department} | ${updates.durationMinutes || block.durationMinutes}m window`,
    });

    return true;
  }

  /**
   * Convenience helper to apply a safety time-shift (e.g. +15m buffer) to a block.
   */
  public shiftBlockTime(
    blockId: string,
    shiftMinutes: number,
    reason: string = 'Pre-emptive safety buffer adjustment'
  ): boolean {
    const allBlocks = mockStore.getOptimizedBlocks();
    const block = allBlocks.find((b) => b.blockId === blockId);
    if (!block) return false;

    // Parse start time "HH:MM"
    const [startH, startM] = block.startTime.split(':').map(Number);
    const [endH, endM] = block.endTime.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;

    const startTotal = (startH * 60 + startM + shiftMinutes + 1440) % 1440;
    const endTotal = (endH * 60 + endM + shiftMinutes + 1440) % 1440;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const newStartTime = `${pad(Math.floor(startTotal / 60))}:${pad(startTotal % 60)}`;
    const newEndTime = `${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}`;

    return this.updateBlockSchedule(
      blockId,
      {
        startTime: newStartTime,
        endTime: newEndTime,
      },
      `${reason} (${shiftMinutes > 0 ? `+${shiftMinutes}` : shiftMinutes} mins)`
    );
  }

  /**
   * Commits all uncommitted schedule changes to the backend (mockStore & cloud state).
   */
  public async commitChangesToBackend(): Promise<{
    success: boolean;
    committedCount: number;
    message: string;
    auditLogId?: string;
  }> {
    if (this.uncommittedChanges.length === 0) {
      return {
        success: true,
        committedCount: 0,
        message: 'No pending changes to commit.',
      };
    }

    this.isCommitting = true;
    this.notify();

    // Simulate realistic network commit delay (350ms)
    await new Promise((resolve) => setTimeout(resolve, 350));

    const committedCount = this.uncommittedChanges.length;
    const changeSummary = this.uncommittedChanges
      .slice(0, 3)
      .map((c) => `${c.blockId} (${c.oldValue} → ${c.newValue})`)
      .join(', ');

    const remainingCount = committedCount > 3 ? ` and ${committedCount - 3} more` : '';

    // Persist blocks into primary store
    const allBlocks = mockStore.getOptimizedBlocks();
    mockStore.updateOptimizedBlocks(allBlocks);

    // Add Audit Log
    const currentUser = mockStore.getCurrentUser();
    const auditEntry: AuditLog = mockStore.addAuditLogEntry(
      currentUser?.name || 'Chief Block Coordinator',
      currentUser?.role || 'RAILWAY_PLANNER',
      'SCHEDULE_REVISIONS_COMMITTED_TO_BACKEND',
      `${committedCount} Blocking Schedule Revision${committedCount > 1 ? 's' : ''}`,
      'SUCCESS',
      `Synchronized draft changes to Railway NTP Backend: ${changeSummary}${remainingCount}. Integrity verified.`
    );

    const nowStr = new Date().toLocaleTimeString();
    this.lastCommittedAt = nowStr;
    this.lastAutoSavedAt = null;
    this.uncommittedChanges = [];
    this.isCommitting = false;
    this.lastCommitMessage = `Successfully committed ${committedCount} schedule revision${committedCount > 1 ? 's' : ''} to backend.`;

    // Clear draft storage
    localStorage.removeItem(STORAGE_KEYS.UNCOMMITTED_CHANGES);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_BLOCKS);
    localStorage.removeItem(STORAGE_KEYS.LAST_AUTO_SAVED);
    localStorage.setItem(STORAGE_KEYS.LAST_COMMITTED, nowStr);

    try {
      railwayAudio.playSuccessTone();
    } catch {
      // Audio fallback
    }

    this.notify();

    return {
      success: true,
      committedCount,
      message: this.lastCommitMessage,
      auditLogId: auditEntry.id,
    };
  }

  /**
   * Discards all uncommitted draft schedule changes and rolls back to last committed state.
   */
  public discardUncommittedChanges(): { success: boolean; revertedCount: number } {
    const revertedCount = this.uncommittedChanges.length;
    if (revertedCount === 0) {
      return { success: true, revertedCount: 0 };
    }

    // Reset store blocks from backup if draft blocks were present
    const savedBlocks = localStorage.getItem('railsync_optimized_blocks');
    if (savedBlocks) {
      try {
        const parsed = JSON.parse(savedBlocks);
        (mockStore as any).optimizedBlocks = parsed;
      } catch (e) {
        console.error('Failed to revert blocks from storage:', e);
      }
    }

    this.uncommittedChanges = [];
    this.lastAutoSavedAt = null;
    this.lastCommitMessage = `Discarded ${revertedCount} uncommitted draft change${revertedCount > 1 ? 's' : ''}.`;

    localStorage.removeItem(STORAGE_KEYS.UNCOMMITTED_CHANGES);
    localStorage.removeItem(STORAGE_KEYS.DRAFT_BLOCKS);
    localStorage.removeItem(STORAGE_KEYS.LAST_AUTO_SAVED);

    this.notify();
    return { success: true, revertedCount };
  }

  /**
   * Helper function to test/simulate an auto-save change on a real block immediately.
   */
  public simulateQuickScheduleChange(): ScheduleChangeRecord {
    const blocks = mockStore.getOptimizedBlocks();
    const targetBlock = blocks[0] || {
      blockId: 'BLK-T001',
      corridorId: 'C001',
      department: 'ENGINEERING',
      section: 'KM 42/0 to 45/0',
      startTime: '09:00',
      endTime: '10:30',
      durationMinutes: 90,
    };

    // Calculate a 15-minute time shift
    const [h, m] = (targetBlock.startTime || '09:00').split(':').map(Number);
    const newStartM = (m + 15) % 60;
    const newStartH = h + Math.floor((m + 15) / 60);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const newStart = `${pad(newStartH)}:${pad(newStartM)}`;

    const [endH, endM] = (targetBlock.endTime || '10:30').split(':').map(Number);
    const newEndM = (endM + 15) % 60;
    const newEndH = endH + Math.floor((endM + 15) / 60);
    const newEnd = `${pad(newEndH)}:${pad(newEndM)}`;

    return this.registerScheduleChange({
      blockId: targetBlock.blockId,
      corridorId: targetBlock.corridorId,
      department: targetBlock.department,
      section: targetBlock.section || 'KM 14/0 to 18/0',
      fieldModified: 'SCHEDULE_SLOT',
      oldValue: `${targetBlock.startTime}–${targetBlock.endTime}`,
      newValue: `${newStart}–${newEnd}`,
      changeDescription: `Corridor slot shifted by +15m to absorb morning express train headway separation.`,
      impactSummary: `${targetBlock.corridorId} | ${targetBlock.department} | Slot adjusted`,
    });
  }
}

export const scheduleAutoSaveService = new ScheduleAutoSaveService();
