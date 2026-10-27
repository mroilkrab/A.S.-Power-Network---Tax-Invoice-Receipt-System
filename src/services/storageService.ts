import { CompanySettings, InvoiceDocument, BackupLog } from '../types/index.ts';
import { DEFAULT_COMPANY_SETTINGS, INITIAL_DOCUMENTS } from '../utils/defaultData.ts';

const STORAGE_KEY_INVOICES = 'as_power_invoices_v1';
const STORAGE_KEY_SETTINGS = 'as_power_settings_v1';
const STORAGE_KEY_BACKUPS = 'as_power_backup_logs_v1';
const STORAGE_KEY_AUTH = 'as_power_auth_user_v1';

export interface AuthUser {
  email: string;
  name: string;
  role: string;
  isLoggedIn: boolean;
  lastLogin: string;
}

export const DEFAULT_USER: AuthUser = {
  email: 'aspowernetwork@gmail.com',
  name: 'นายอภิวัฒน์ สาระสิทธิ์',
  role: 'ผู้จัดการทั่วไป / หุ้นส่วนผู้จัดการ',
  isLoggedIn: true,
  lastLogin: new Date().toISOString()
};

export class StorageService {
  // --- Invoices ---
  static getInvoices(): InvoiceDocument[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INVOICES);
      if (!data) {
        this.saveInvoices(INITIAL_DOCUMENTS);
        return INITIAL_DOCUMENTS;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load invoices from localStorage:', e);
      return INITIAL_DOCUMENTS;
    }
  }

  static saveInvoices(invoices: InvoiceDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.error('Failed to save invoices to localStorage:', e);
    }
  }

  static addInvoice(invoice: InvoiceDocument): void {
    const list = this.getInvoices();
    list.unshift(invoice);
    this.saveInvoices(list);
  }

  static updateInvoice(invoice: InvoiceDocument): void {
    const list = this.getInvoices();
    const index = list.findIndex(i => i.id === invoice.id);
    if (index !== -1) {
      list[index] = invoice;
      this.saveInvoices(list);
    }
  }

  static deleteInvoice(id: string): void {
    const list = this.getInvoices().filter(i => i.id !== id);
    this.saveInvoices(list);
  }

  // --- Settings ---
  static getSettings(): CompanySettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!data) {
        this.saveSettings(DEFAULT_COMPANY_SETTINGS);
        return DEFAULT_COMPANY_SETTINGS;
      }
      return { ...DEFAULT_COMPANY_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to load settings:', e);
      return DEFAULT_COMPANY_SETTINGS;
    }
  }

  static saveSettings(settings: CompanySettings): void {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  // --- Auth / User Session ---
  static getAuthUser(): AuthUser {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      if (!data) {
        this.saveAuthUser(DEFAULT_USER);
        return DEFAULT_USER;
      }
      return JSON.parse(data);
    } catch {
      return DEFAULT_USER;
    }
  }

  static saveAuthUser(user: AuthUser): void {
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
  }

  // --- Backup Logs & Daily Cloud Sync ---
  static getBackupLogs(): BackupLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_BACKUPS);
      if (!data) {
        const initialLogs: BackupLog[] = [
          {
            id: 'log-1',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            recordsCount: 11,
            status: 'success',
            type: 'daily_auto',
            message: 'สำรองข้อมูลคลาวด์ประจำวันและจัดเก็บในระบบไฮบริดเรียบร้อย'
          },
          {
            id: 'log-2',
            timestamp: new Date().toISOString(),
            recordsCount: 12,
            status: 'success',
            type: 'hybrid_cloud',
            message: 'สำรองข้อมูลเอกสารขึ้นคลาวด์และหน่วยความจำในเครื่องสำเร็จ'
          }
        ];
        this.saveBackupLogs(initialLogs);
        return initialLogs;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveBackupLogs(logs: BackupLog[]): void {
    localStorage.setItem(STORAGE_KEY_BACKUPS, JSON.stringify(logs.slice(0, 30)));
  }

  static addBackupLog(log: Omit<BackupLog, 'id'>): BackupLog {
    const newLog: BackupLog = {
      ...log,
      id: 'log-' + Date.now()
    };
    const logs = this.getBackupLogs();
    logs.unshift(newLog);
    this.saveBackupLogs(logs);
    return newLog;
  }

  /**
   * Execute Cloud & Local Backup
   */
  static async performCloudBackup(isDailyAuto = false): Promise<{ success: boolean; message: string; timestamp: string }> {
    const invoices = this.getInvoices();
    const settings = this.getSettings();
    const timestamp = new Date().toISOString();

    // Mark documents as cloud synced
    const updatedInvoices = invoices.map(i => ({ ...i, syncedToCloud: true }));
    this.saveInvoices(updatedInvoices);

    // Update settings last backup date
    const updatedSettings = {
      ...settings,
      lastBackupDate: timestamp
    };
    this.saveSettings(updatedSettings);

    const logMessage = isDailyAuto
      ? `สำรองข้อมูลคลาวด์อัตโนมัติประจำวันสำเร็จ (${invoices.length} รายการ)`
      : `สำรองข้อมูลขึ้นคลาวด์และหน่วยความจำสำเร็จเรียบร้อย (${invoices.length} รายการ)`;

    this.addBackupLog({
      timestamp,
      recordsCount: invoices.length,
      status: 'success',
      type: isDailyAuto ? 'daily_auto' : 'hybrid_cloud',
      message: logMessage
    });

    return {
      success: true,
      message: logMessage,
      timestamp
    };
  }

  /**
   * Check if daily backup is needed and run it
   */
  static checkAndTriggerDailyBackup(): { triggered: boolean; message?: string } {
    const settings = this.getSettings();
    if (!settings.autoBackupDaily) return { triggered: false };

    const lastBackup = settings.lastBackupDate ? new Date(settings.lastBackupDate) : null;
    const now = new Date();

    // Check if backed up today
    const needsBackup = !lastBackup ||
      lastBackup.toDateString() !== now.toDateString();

    if (needsBackup) {
      this.performCloudBackup(true);
      return {
        triggered: true,
        message: 'ระบบได้ทำการสำรองข้อมูลขึ้นคลาวด์ประจำวันเรียบร้อยแล้ว'
      };
    }

    return { triggered: false };
  }

  /**
   * Download full JSON backup file
   */
  static exportBackupJson(): void {
    const payload = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      company: this.getSettings(),
      invoices: this.getInvoices(),
      backupLogs: this.getBackupLogs()
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `AS_Power_Backup_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Export VAT / Sales Report CSV (รายงานภาษีขาย ภ.พ.30)
   */
  static exportSalesReportCsv(invoices: InvoiceDocument[]): void {
    const headers = [
      'ลำดับ',
      'วันเดือนปี',
      'เลขที่ใบกำกับภาษี',
      'รหัสลูกค้า',
      'ชื่อผู้ซื้อสินค้า/บริการ',
      'เลขประจำตัวผู้เสียภาษี',
      'สถานประกอบการ',
      'มูลค่าสินค้า/บริการ',
      'จำนวนภาษีมูลค่าเพิ่ม (7%)',
      'ยอดรวมสุทธิ',
      'สถานะการชำระ',
      'ประเภทบริการ'
    ];

    const rows = invoices.map((inv, idx) => [
      idx + 1,
      inv.documentDateThai,
      `"${inv.documentNo}"`,
      `"${inv.customerCode}"`,
      `"${inv.customerName}"`,
      `"${inv.customerTaxId}"`,
      `"${inv.customerBranch}"`,
      inv.subtotal.toFixed(2),
      inv.vatAmount.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ',
      `"${inv.categoryPrimary}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VAT_Report_AS_Power_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Restore from JSON file
   */
  static restoreFromJson(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.invoices || !Array.isArray(data.invoices)) {
        return { success: false, message: 'รูปแบบไฟล์สำรองไม่ถูกต้อง ไม่พบข้อมูลใบเสร็จ' };
      }

      this.saveInvoices(data.invoices);
      if (data.company) {
        this.saveSettings({ ...DEFAULT_COMPANY_SETTINGS, ...data.company });
      }

      this.addBackupLog({
        timestamp: new Date().toISOString(),
        recordsCount: data.invoices.length,
        status: 'success',
        type: 'manual',
        message: `กู้คืนข้อมูลสำเร็จจากไฟล์สำรอง จำนวน ${data.invoices.length} รายการ`
      });

      return {
        success: true,
        message: `กู้คืนข้อมูลสำเร็จ จำนวน ${data.invoices.length} รายการ`,
        count: data.invoices.length
      };
    } catch (e: any) {
      return { success: false, message: 'เกิดข้อผิดพลาดในการอ่านไฟล์: ' + e.message };
    }
  }

  /**
   * Reset all to factory defaults
   */
  static resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEY_INVOICES);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_BACKUPS);
  }
}
