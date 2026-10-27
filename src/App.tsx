import React, { useState, useEffect, useMemo } from 'react';
import { InvoiceDocument, CompanySettings, BackupLog } from './types/index.ts';
import { StorageService, DEFAULT_USER, AuthUser } from './services/storageService.ts';
import { Dashboard } from './components/Dashboard.tsx';
import { InvoiceList } from './components/InvoiceList.tsx';
import { InvoiceForm } from './components/InvoiceForm.tsx';
import { InvoicePrintView } from './components/InvoicePrintView.tsx';
import { getThaiFontFamily } from './components/InvoiceDocumentPaper.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import {
  BarChart3,
  Receipt,
  PlusCircle,
  Settings,
  CloudCheck,
  Cloud,
  Wifi,
  WifiOff,
  Bell,
  X,
  User,
  ShieldCheck,
  FileCheck2,
  Printer
} from 'lucide-react';

export default function App() {
  const [invoices, setInvoices] = useState<InvoiceDocument[]>([]);
  const [settings, setSettings] = useState<CompanySettings>(StorageService.getSettings());
  const [backupLogs, setBackupLogs] = useState<BackupLog[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser>(DEFAULT_USER);
  
  // Navigation states: 'dashboard' | 'invoices' | 'create' | 'edit' | 'print' | 'settings'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'invoices' | 'create' | 'edit' | 'print' | 'settings'>('dashboard');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDocument | null>(null);

  // Online / Offline Status
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Daily backup alert banner
  const [dailyNotification, setDailyNotification] = useState<{ show: boolean; message: string }>({
    show: false,
    message: ''
  });

  // Success toast for actions
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initialize data on mount
  useEffect(() => {
    const loadedInvoices = StorageService.getInvoices();
    const loadedSettings = StorageService.getSettings();
    const loadedLogs = StorageService.getBackupLogs();
    const loadedUser = StorageService.getAuthUser();

    setInvoices(loadedInvoices);
    setSettings(loadedSettings);
    setBackupLogs(loadedLogs);
    setCurrentUser(loadedUser);

    // Online/Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Daily auto-backup check
    const check = StorageService.checkAndTriggerDailyBackup();
    if (check.triggered && loadedSettings.dailyBackupNotification) {
      setDailyNotification({
        show: true,
        message: 'ระบบได้ทำการสำรองข้อมูลขึ้นคลาวด์ประจำวันเรียบร้อยแล้ว ทุกเอกสารได้รับการจัดเก็บปลอดภัย'
      });
      setBackupLogs(StorageService.getBackupLogs());
    } else if (loadedSettings.dailyBackupNotification) {
      // Show confirmation of daily backup state
      setDailyNotification({
        show: true,
        message: 'ระบบสำรองข้อมูลไฮบริดประจำวันทำงานปกติ (จัดเก็บบนเครื่องและคลาวด์เรียบร้อย)'
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save new invoice
  const handleSaveInvoice = (invoice: InvoiceDocument) => {
    if (selectedInvoice && currentTab === 'edit') {
      StorageService.updateInvoice(invoice);
      setInvoices(StorageService.getInvoices());
      setSelectedInvoice(invoice);
      showToast(`อัปเดตใบกำกับภาษีเลขที่ ${invoice.documentNo} เรียบร้อยแล้ว`);
      setCurrentTab('print');
    } else {
      StorageService.addInvoice(invoice);
      // Increment next number
      const updatedSettings = {
        ...settings,
        nextNumber: (settings.nextNumber || 690010) + 1
      };
      StorageService.saveSettings(updatedSettings);
      setSettings(updatedSettings);

      setInvoices(StorageService.getInvoices());
      setSelectedInvoice(invoice);
      showToast(`ออกใบกำกับภาษีเลขที่ ${invoice.documentNo} สำเร็จ`);
      setCurrentTab('print');
    }
  };

  // Delete invoice
  const handleDeleteInvoice = (id: string) => {
    StorageService.deleteInvoice(id);
    setInvoices(StorageService.getInvoices());
    showToast('ลบรายการเอกสารเรียบร้อย');
  };

  // Duplicate invoice
  const handleDuplicateInvoice = (invoice: InvoiceDocument) => {
    const nextNo = `${settings.invoicePrefix || '69'}${String(settings.nextNumber).padStart(4, '0')}`;
    const duplicate: InvoiceDocument = {
      ...invoice,
      id: 'inv-' + Date.now(),
      documentNo: nextNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      syncedToCloud: true
    };
    setSelectedInvoice(duplicate);
    setCurrentTab('edit');
    showToast(`คัดลอกข้อมูลเอกสารเรียบร้อย กรุณาตรวจสอบแล้วบันทึก`);
  };

  // Trigger manual cloud backup
  const handlePerformBackup = async () => {
    const res = await StorageService.performCloudBackup(false);
    setBackupLogs(StorageService.getBackupLogs());
    setSettings(StorageService.getSettings());
    setInvoices(StorageService.getInvoices());
    showToast(res.message);
  };

  // Existing customer list for auto-fill in invoice form
  const existingCustomers = useMemo(() => {
    const map = new Map<string, any>();
    invoices.forEach(inv => {
      if (inv.customerName && !map.has(inv.customerName)) {
        map.set(inv.customerName, {
          code: inv.customerCode,
          name: inv.customerName,
          taxId: inv.customerTaxId,
          address: inv.customerAddress,
          phone: inv.customerPhone,
          branch: inv.customerBranch
        });
      }
    });
    return Array.from(map.values());
  }, [invoices]);

  const appFontFamily = useMemo(() => {
    return getThaiFontFamily(settings.systemFontFamilyChoice || settings.fontFamilyChoice);
  }, [settings.systemFontFamilyChoice, settings.fontFamilyChoice]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col" style={{ fontFamily: appFontFamily }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="no-print fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-top">
          <FileCheck2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main App Navigation Header (Hidden in Print) */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo & Company Name */}
          <div
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs group-hover:scale-105 group-hover:border-blue-400 transition-all overflow-hidden p-1">
              {(settings.logoUrl || settings.stampUrl) ? (
                <img src={settings.logoUrl || settings.stampUrl} alt="A.S. Power Network Logo" className="w-full h-full object-contain filter drop-shadow-xs" />
              ) : (
                <Receipt className="w-6 h-6 text-blue-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-bold text-slate-900 tracking-tight"
                  style={{
                    fontFamily: appFontFamily,
                    fontSize: '18px',
                    lineHeight: 1.2
                  }}
                >
                  {settings.name || 'เอ.เอส. เพาเวอร์ เน็ทเวิร์ค'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  Tax Invoice & Receipt
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                TAX ID: {settings.taxId} ({settings.branch})
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              แดชบอร์ด
            </button>
            <button
              onClick={() => setCurrentTab('invoices')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'invoices'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              รายการใบกำกับภาษี ({invoices.length})
            </button>
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setCurrentTab('create');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'create'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-blue-600" />
              ออกเอกสารใหม่
            </button>
            <button
              onClick={() => setCurrentTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'settings'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-4 h-4" />
              ตั้งค่าระบบ
            </button>
          </nav>

          {/* Right Status Badges & Profile */}
          <div className="flex items-center gap-2.5">
            {/* Online / Offline Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isOnline ? 'เชื่อมต่อออนไลน์ปกติ' : 'ทำงานในโหมดออฟไลน์ (Local Storage บันทึกอัตโนมัติ)'}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-amber-600" />}
              <span className="hidden sm:inline">{isOnline ? 'ออนไลน์' : 'ออฟไลน์'}</span>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setCurrentTab('create');
              }}
              className="md:hidden flex items-center justify-center p-2 bg-blue-600 text-white rounded-lg shadow-sm"
            >
              <PlusCircle className="w-5 h-5" />
            </button>

            {/* User Profile */}
            <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs">
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800 leading-tight truncate max-w-[120px]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500">{currentUser.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-200 bg-white py-2 px-1 text-[11px] font-semibold">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentTab === 'dashboard' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            แดชบอร์ด
          </button>
          <button
            onClick={() => setCurrentTab('invoices')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentTab === 'invoices' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <Receipt className="w-4 h-4" />
            เอกสาร
          </button>
          <button
            onClick={() => {
              setSelectedInvoice(null);
              setCurrentTab('create');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentTab === 'create' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            สร้างบิล
          </button>
          <button
            onClick={() => setCurrentTab('settings')}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg ${
              currentTab === 'settings' ? 'text-blue-600' : 'text-slate-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            ตั้งค่า
          </button>
        </div>
      </header>

      {/* Daily Backup Notification Alert Banner (Requested: แจ้งเตือนเมื่อระบบสำรองข้อมูลสำเร็จในทุกๆ วัน) */}
      {dailyNotification.show && (
        <div className="no-print bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-4 py-2.5 text-xs border-b border-indigo-700 flex items-center justify-between shadow-xs">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3 px-2 sm:px-4">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-emerald-500/20 text-emerald-300 rounded-full">
                <Bell className="w-3.5 h-3.5" />
              </span>
              <span className="font-semibold text-emerald-300">แจ้งเตือนระบบสำรองข้อมูล:</span>
              <span className="text-slate-200">{dailyNotification.message}</span>
            </div>
            <button
              onClick={() => setDailyNotification(prev => ({ ...prev, show: false }))}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentTab === 'dashboard' && (
          <Dashboard
            invoices={invoices}
            settings={settings}
            onSelectInvoice={inv => {
              setSelectedInvoice(inv);
              setCurrentTab('print');
            }}
            onCreateNew={() => {
              setSelectedInvoice(null);
              setCurrentTab('create');
            }}
            onBackupNow={handlePerformBackup}
            lastBackupDate={settings.lastBackupDate}
            dailyBackupNotification={settings.dailyBackupNotification}
          />
        )}

        {currentTab === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            settings={settings}
            onSelectInvoice={inv => {
              setSelectedInvoice(inv);
              setCurrentTab('print');
            }}
            onEditInvoice={inv => {
              setSelectedInvoice(inv);
              setCurrentTab('edit');
            }}
            onCreateNew={() => {
              setSelectedInvoice(null);
              setCurrentTab('create');
            }}
            onDeleteInvoice={handleDeleteInvoice}
            onDuplicateInvoice={handleDuplicateInvoice}
          />
        )}

        {currentTab === 'create' && (
          <InvoiceForm
            initialData={null}
            settings={settings}
            onSave={handleSaveInvoice}
            onCancel={() => setCurrentTab('invoices')}
            existingCustomers={existingCustomers}
          />
        )}

        {currentTab === 'edit' && selectedInvoice && (
          <InvoiceForm
            initialData={selectedInvoice}
            settings={settings}
            onSave={handleSaveInvoice}
            onCancel={() => setCurrentTab('print')}
            existingCustomers={existingCustomers}
          />
        )}

        {currentTab === 'print' && selectedInvoice && (
          <InvoicePrintView
            invoice={selectedInvoice}
            settings={settings}
            onBack={() => setCurrentTab('invoices')}
            onEdit={() => setCurrentTab('edit')}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={newSettings => {
              setSettings(newSettings);
              showToast('อัปเดตการตั้งค่าระบบเรียบร้อย');
            }}
            backupLogs={backupLogs}
            onTriggerBackup={handlePerformBackup}
            onRestoreSuccess={() => {
              setInvoices(StorageService.getInvoices());
              setSettings(StorageService.getSettings());
              setBackupLogs(StorageService.getBackupLogs());
              showToast('กู้คืนข้อมูลสำเร็จเรียบร้อย');
              setCurrentTab('invoices');
            }}
          />
        )}
      </main>

      {/* Footer (Hidden in print) */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2569 {settings.name} (สำนักงานใหญ่) • ระบบออกใบกำกับภาษีและใบเสร็จรับเงินมาตรฐาน</p>
          <p className="flex items-center gap-2 text-slate-400">
            <span>สถานะระบบ: ไฮบริดพร้อมใช้งาน</span>
            <span>•</span>
            <span>Local Storage & Cloud Hybrid</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
