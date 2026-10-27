import { SyncQueueItem } from '../types';
import { storageService } from './storage';

export const syncEngine = {
  getPendingCount(): number {
    const queue = storageService.getSyncQueue();
    return queue.filter((item) => item.status === 'pending').length;
  },

  enqueue(entityType: SyncQueueItem['entityType'], action: SyncQueueItem['action'], payload: any): SyncQueueItem {
    const queue = storageService.getSyncQueue();
    const idempotencyKey = `${entityType}_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    const newItem: SyncQueueItem = {
      id: `sync_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      idempotencyKey,
      entityType,
      action,
      payload,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    queue.push(newItem);
    storageService.saveSyncQueue(queue);
    return newItem;
  },

  async runSync(): Promise<{ success: boolean; syncedCount: number; errors: string[] }> {
    const queue = storageService.getSyncQueue();
    const pendingItems = queue.filter((item) => item.status === 'pending');
    const errors: string[] = [];
    let syncedCount = 0;

    for (const item of pendingItems) {
      try {
        // Simulate network API call to server
        await new Promise((resolve) => setTimeout(resolve, 150));
        item.status = 'synced';
        syncedCount++;
      } catch (err: any) {
        item.status = 'failed';
        item.error = err.message || 'Sync failed';
        errors.push(`Failed to sync ${item.entityType}: ${item.error}`);
      }
    }

    storageService.saveSyncQueue(queue);
    return {
      success: errors.length === 0,
      syncedCount,
      errors,
    };
  },

  clearSynced() {
    const queue = storageService.getSyncQueue();
    const filtered = queue.filter((item) => item.status !== 'synced');
    storageService.saveSyncQueue(filtered);
  },
};
