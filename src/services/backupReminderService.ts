import { storageService } from './storage';

const BACKUP_REMINDER_STORAGE_KEY = 'ajeet_offline_backup_reminder_settings';

export interface BackupReminderSettings {
  enabled: boolean;
  intervalDays: number; // Default: 30 days
  scheduleStartedAt: string;
  lastBackupAt: string | null;
  lastNotifiedAt: string | null;
  snoozedUntil: string | null;
}

export interface BackupReminderStatus {
  settings: BackupReminderSettings;
  isDue: boolean;
  daysSinceLastBackup: number | null;
  daysUntilNextReminder: number;
  nextReminderDateFormatted: string;
  lastBackupDateFormatted: string | null;
  notificationPermission: NotificationPermission | 'unsupported';
}

export const backupReminderService = {
  getSettings(): BackupReminderSettings {
    const defaultStart = new Date().toISOString();
    const defaults: BackupReminderSettings = {
      enabled: true,
      intervalDays: 30,
      scheduleStartedAt: defaultStart,
      lastBackupAt: null,
      lastNotifiedAt: null,
      snoozedUntil: null,
    };

    try {
      const raw = localStorage.getItem(BACKUP_REMINDER_STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, JSON.stringify(defaults));
        return defaults;
      }
      const parsed = JSON.parse(raw);
      return {
        ...defaults,
        ...parsed,
        intervalDays: Number(parsed.intervalDays) || 30,
        scheduleStartedAt: parsed.scheduleStartedAt || defaultStart,
      };
    } catch {
      return defaults;
    }
  },

  saveSettings(settings: Partial<BackupReminderSettings>): BackupReminderSettings {
    const current = this.getSettings();
    const updated: BackupReminderSettings = {
      ...current,
      ...settings,
    };
    localStorage.setItem(BACKUP_REMINDER_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return Notification.permission;
    }
  },

  getStatus(): BackupReminderStatus {
    const settings = this.getSettings();
    const now = Date.now();
    const msPerDay = 1000 * 60 * 60 * 24;

    const anchorIso = settings.lastBackupAt || settings.scheduleStartedAt;
    const anchorTime = new Date(anchorIso).getTime() || now;
    const diffMs = Math.max(0, now - anchorTime);

    const daysSinceLastBackup = settings.lastBackupAt
      ? Math.floor(diffMs / msPerDay)
      : null;

    const nextReminderTime = anchorTime + settings.intervalDays * msPerDay;
    const remainingMs = nextReminderTime - now;
    const daysUntilNextReminder = Math.max(0, Math.ceil(remainingMs / msPerDay));

    let isDue = settings.enabled && diffMs >= settings.intervalDays * msPerDay;

    if (isDue && settings.snoozedUntil) {
      const snoozeTime = new Date(settings.snoozedUntil).getTime();
      if (!isNaN(snoozeTime) && now < snoozeTime) {
        isDue = false;
      }
    }

    const nextDate = new Date(nextReminderTime);
    const nextReminderDateFormatted = nextDate.toLocaleDateString('hi-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const lastBackupDateFormatted = settings.lastBackupAt
      ? new Date(settings.lastBackupAt).toLocaleString('hi-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    return {
      settings,
      isDue,
      daysSinceLastBackup,
      daysUntilNextReminder,
      nextReminderDateFormatted,
      lastBackupDateFormatted,
      notificationPermission: this.getNotificationPermission(),
    };
  },

  /**
   * Fires a native Browser/OS Local Notification AND dispatches an in-app reminder event
   */
  async fireLocalBrowserNotification(title?: string, body?: string): Promise<boolean> {
    const notifTitle =
      title || '🔒 Ajit collection - 30-दिवसीय सुरक्षा डेटा बैकअप रिमाइंडर';
    const notifBody =
      body ||
      'आपके ऐप डेटा की सुरक्षा के लिए 30 दिन पूरे हो गए हैं। कृपया अभी अपनी ऑफ़लाइन JSON बैकअप फ़ाइल डाउनलोड करें।';

    this.saveSettings({ lastNotifiedAt: new Date().toISOString() });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ajeet:backup-reminder-triggered'));
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'default') {
      await this.requestNotificationPermission();
    }

    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg && 'showNotification' in reg) {
            await reg.showNotification(notifTitle, {
              body: notifBody,
              icon: '/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png',
              badge: '/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png',
              tag: 'ajeet-30day-offline-backup',
            });
            return true;
          }
        }
        new Notification(notifTitle, {
          body: notifBody,
          icon: '/assets/aistudio/file_0000000043f482118d45f9a7391eadfe_4733c263.png',
          tag: 'ajeet-30day-offline-backup',
        });
        return true;
      } catch (err) {
        console.warn('Browser notification notice:', err);
      }
    }
    return false;
  },

  /**
   * Snoozes the in-app prompt for a specified number of days (default 1 day)
   */
  snoozeReminder(days = 1): BackupReminderSettings {
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    return this.saveSettings({ snoozedUntil });
  },

  /**
   * Generates and downloads a complete offline JSON backup of all current application data
   * and resets the 30-day scheduled reminder timer.
   */
  downloadOfflineJsonBackup(): { filename: string; timestamp: string; recordCount: number } {
    const nowIso = new Date().toISOString();
    const datePart = nowIso.slice(0, 10);

    const agency = storageService.getAgency();
    const customers = storageService.getCustomers();
    const newspapers = storageService.getNewspapers();
    const routes = storageService.getRoutes();
    const deliveries = storageService.getDeliveries();
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();
    const ledger = storageService.getLedger();
    const expenses = storageService.getExpenses();
    const handovers = storageService.getHandovers();

    const backupBundle = {
      app: 'Ajit collection',
      version: '2.4.0',
      exportedAt: nowIso,
      scheduleIntervalDays: this.getSettings().intervalDays,
      summary: {
        customersCount: customers.length,
        invoicesCount: invoices.length,
        paymentsCount: payments.length,
        ledgerEntriesCount: ledger.length,
      },
      data: {
        agency,
        customers,
        newspapers,
        routes,
        deliveries,
        invoices,
        payments,
        ledger,
        expenses,
        handovers,
      },
    };

    const jsonString = JSON.stringify(backupBundle, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const filename = `Ajit_Collection_Backup_${datePart}.json`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    // Update lastBackupAt and clear any snooze so next reminder is scheduled 30 days from now
    this.saveSettings({
      lastBackupAt: nowIso,
      scheduleStartedAt: nowIso,
      snoozedUntil: null,
    });

    const recordCount =
      customers.length + invoices.length + payments.length + ledger.length + expenses.length;

    return {
      filename,
      timestamp: nowIso,
      recordCount,
    };
  },
};
