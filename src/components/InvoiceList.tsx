import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { formatCurrency, getInvoiceDisplayDate, formatYearDisplay } from '../utils/bahtText.ts';
import {
  Search,
  Filter,
  Download,
  Plus,
  Printer,
  Trash2,
  Copy,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  Calendar,
  CalendarRange,
  Eye,
  X,
  Maximize2,
  Upload,
  Database,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { StorageService } from '../services/storageService.ts';
import { InvoiceQuickPreviewModal } from './InvoiceQuickPreviewModal.tsx';
import { InvoiceImportModal } from './InvoiceImportModal.tsx';

interface Props {
  invoices: InvoiceDocument[];
  settings?: CompanySettings;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
  onEditInvoice?: (invoice: InvoiceDocument) => void;
  onCreateNew: () => void;
  onDeleteInvoice: (id: string) => void;
  onDuplicateInvoice: (invoice: InvoiceDocument) => void;
  onRefreshInvoices?: () => void;
}

export const InvoiceList: React.FC<Props> = ({
  invoices,
  settings,
  onSelectInvoice,
  onEditInvoice,
  onCreateNew,
  onDeleteInvoice,
  onDuplicateInvoice,
  onRefreshInvoices
}) => {
  const era = settings?.dateFormatPreference || 'buddhist';
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Date Range Filter State
  const [dateRangePreset, setDateRangePreset] = useState<'all' | 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Quick Preview Modal state
  const [quickPreviewInvoice, setQuickPreviewInvoice] = useState<InvoiceDocument | null>(null);

  // Import Modal state & feedback
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const effectiveSettings = settings || StorageService.getSettings();

  // Date preset selector handler
  const handleSelectDatePreset = (preset: 'all' | 'today' | '7days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom') => {
    setDateRangePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 86400000);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m + 1, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'lastMonth') {
      const y = now.getFullYear();
      const m = now.getMonth();
      const firstDay = new Date(y, m - 1, 1).toISOString().split('T')[0];
      const lastDay = new Date(y, m, 0).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'thisYear') {
      const y = now.getFullYear();
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setDateRangePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Keyboard shortcut: Press '/' or 'Ctrl+K' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        (e.key === 'k' && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        const input = document.getElementById('invoice-search-input');
        if (input) {
          input.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter logic: Customer name, Document number, Amount, or Date Range
  const filteredInvoices = useMemo(() => {
    const cleanTerm = searchTerm.toLowerCase().trim();
    const cleanNumTerm = cleanTerm.replace(/[\s,]/g, '');

    return invoices.filter(inv => {
      // 1. Document number
      const docNoLower = inv.documentNo.toLowerCase();

      // 2. Customer name & code & tax ID
      const custNameLower = inv.customerName.toLowerCase();
      const custCodeLower = inv.customerCode.toLowerCase();
      const custTaxLower = (inv.customerTaxId || '').toLowerCase().replace(/[\s-]/g, '');

      // 3. Amount search (grand total, subtotal, formatted with or without commas)
      const grandTotalStr = inv.grandTotal.toString();
      const subtotalStr = inv.subtotal.toString();
      const grandTotalFormatted = formatCurrency(inv.grandTotal).toLowerCase().replace(/,/g, '');
      const grandTotalWithComma = formatCurrency(inv.grandTotal).toLowerCase();
      const subtotalFormatted = formatCurrency(inv.subtotal).toLowerCase().replace(/,/g, '');
      const subtotalWithComma = formatCurrency(inv.subtotal).toLowerCase();

      const matchAmount =
        Boolean(cleanNumTerm) &&
        (grandTotalStr.includes(cleanNumTerm) ||
          subtotalStr.includes(cleanNumTerm) ||
          grandTotalFormatted.includes(cleanNumTerm) ||
          subtotalFormatted.includes(cleanNumTerm) ||
          grandTotalWithComma.includes(cleanTerm) ||
          subtotalWithComma.includes(cleanTerm));

      const matchSearch =
        !cleanTerm ||
        docNoLower.includes(cleanTerm) ||
        custNameLower.includes(cleanTerm) ||
        custCodeLower.includes(cleanTerm) ||
        custTaxLower.includes(cleanNumTerm) ||
        (inv.customerTaxId && inv.customerTaxId.toLowerCase().includes(cleanTerm)) ||
        matchAmount;

      // Status
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;

      // Year & Month
      const date = new Date(inv.documentDate);
      const yearMatches = selectedYear === 'all' || (date.getFullYear() + 543).toString() === selectedYear;
      const monthMatches = selectedMonth === 'all' || (date.getMonth() + 1).toString() === selectedMonth;

      // Date Range Filter (startDate & endDate)
      let matchDateRange = true;
      if (startDate) {
        matchDateRange = matchDateRange && inv.documentDate >= startDate;
      }
      if (endDate) {
        matchDateRange = matchDateRange && inv.documentDate <= endDate;
      }

      return matchSearch && matchStatus && yearMatches && monthMatches && matchDateRange;
    });
  }, [invoices, searchTerm, statusFilter, selectedYear, selectedMonth, startDate, endDate]);

  const handleExportCsv = () => {
    StorageService.exportSalesReportCsv(filteredInvoices);
  };

  return (
    <div className="space-y-6">
      {/* Import Notification Banner */}
      {importNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importNotification}</span>
          </div>
          <button
            onClick={() => setImportNotification(null)}
            className="text-emerald-600 hover:text-emerald-900 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            รายการใบเสร็จรับเงิน / ใบกำกับภาษีทั้งหมด
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ค้นหา ตรวจสอบ พิมพ์สำเนา นำเข้าไฟล์ Word หรือดาวน์โหลดรายงานภาษีขาย (ภ.พ.30)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Upload / Import MS Word & Historical Documents */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="นำเข้าไฟล์ Microsoft Word (.docx) หรือประวัติเอกสารเดิม พร้อมจัดเก็บเข้า Cloudflare D1"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            <span>นำเข้าไฟล์ Word / เอกสารเดิม</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="ดาวน์โหลดรายงานภาษีขาย ภ.พ.30 เป็นไฟล์ Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            รายงานภาษีขาย (CSV)
          </button>

          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            ออกเอกสารใหม่
          </button>
        </div>
      </div>

      {/* Enhanced Search & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
        {/* Main Search Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-600" />
            <input
              id="invoice-search-input"
              type="text"
              placeholder="ค้นหาตามชื่อลูกค้า, เลขที่เอกสาร (เช่น 690010), หรือจำนวนเงิน (เช่น 1,500)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 cursor-pointer transition-colors"
                title="ล้างข้อความค้นหา"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">สถานะทั้งหมด</option>
              <option value="paid">ชำระแล้ว (Paid)</option>
              <option value="pending">รอชำระ (Pending)</option>
            </select>
          </div>

          {/* Year Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">ทุกปีภาษี</option>
              <option value="2569">{formatYearDisplay(2026, era)}</option>
              <option value="2568">{formatYearDisplay(2025, era)}</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">ทุกเดือน</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={(i + 1).toString()}>
                  {['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][i]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Filter Section (ค้นหาตามช่วงวันที่) */}
        <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
              ช่วงวันที่:
            </span>
            <button
              onClick={() => handleSelectDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === 'all' && !startDate && !endDate
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ทั้งหมด
            </button>
            <button
              onClick={() => handleSelectDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === 'today'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => handleSelectDatePreset('7days')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === '7days'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => handleSelectDatePreset('thisMonth')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === 'thisMonth'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              เดือนนี้
            </button>
            <button
              onClick={() => handleSelectDatePreset('lastMonth')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === 'lastMonth'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              เดือนที่แล้ว
            </button>
            <button
              onClick={() => handleSelectDatePreset('thisYear')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                dateRangePreset === 'thisYear'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ปีนี้ ({era === 'christian' ? '2026' : '2569'})
            </button>
          </div>

          {/* Custom Date Pickers (From - To) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-medium text-slate-500">ตั้งแต่:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                title="วันที่เริ่มต้น"
              />
            </div>
            <span className="text-slate-400 font-bold">-</span>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1">
              <span className="text-[11px] font-medium text-slate-500">ถึง:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setDateRangePreset('custom');
                }}
                className="bg-transparent text-xs text-slate-800 font-medium focus:outline-none cursor-pointer"
                title="วันที่สิ้นสุด"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setDateRangePreset('all');
                }}
                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                title="ล้างช่วงวันที่"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Search Chips & Search Feedback */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-600" />
              ค้นหาด่วน:
            </span>
            <button
              onClick={() => setSearchTerm('690010')}
              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-mono text-[11px] transition-colors cursor-pointer"
            >
              #690010
            </button>
            <button
              onClick={() => setSearchTerm('อาร์เอส คอนเน็ค')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] transition-colors cursor-pointer"
            >
              บจก. อาร์เอส คอนเน็ค
            </button>
            <button
              onClick={() => setSearchTerm('0105544021316')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[11px] transition-colors cursor-pointer"
            >
              Tax ID 0105544021316
            </button>
            <button
              onClick={() => setSearchTerm('UNI - 001')}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[11px] transition-colors cursor-pointer"
            >
              UNI - 001
            </button>
          </div>

          <div className="flex items-center gap-3">
            {(searchTerm || statusFilter !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all' || startDate || endDate) && (
              <button
                onClick={handleResetFilters}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                ล้างตัวกรองทั้งหมด
              </button>
            )}
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium text-[11px]">
              พบ <strong className="text-blue-700">{filteredInvoices.length}</strong> จาก {invoices.length} รายการ
            </span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-3 px-4">เลขที่เอกสาร</th>
                <th className="py-3 px-4">วันที่ออกเอกสาร</th>
                <th className="py-3 px-4">ลูกค้า / ผู้ซื้อ</th>
                <th className="py-3 px-4">หมวดหมู่</th>
                <th className="py-3 px-4 text-right">ยอดก่อน VAT</th>
                <th className="py-3 px-4 text-right">VAT 7%</th>
                <th className="py-3 px-4 text-right">ยอดสุทธิ</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-center">คลาวด์</th>
                <th className="py-3 px-4 text-center">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold">ไม่พบข้อมูลใบเสร็จรับเงิน/ใบกำกับภาษี</p>
                    <p className="text-xs mt-1">ลองเปลี่ยนเงื่อนไขการค้นหา หรือคลิก "ออกเอกสารใหม่"</p>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-blue-50/50 transition-colors group">
                    <td className="py-3 px-4 font-mono font-bold text-blue-800">
                      <button
                        type="button"
                        onClick={() => setQuickPreviewInvoice(inv)}
                        className="hover:underline flex items-center gap-1.5 text-blue-700 hover:text-blue-900 cursor-pointer font-bold"
                        title="คลิกเพื่อดูตัวอย่างด่วน A4 (Quick Preview)"
                      >
                        {inv.documentNo}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {getInvoiceDisplayDate(inv, era)}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        className="font-semibold text-slate-900 hover:text-blue-700 cursor-pointer transition-colors"
                        onClick={() => setQuickPreviewInvoice(inv)}
                        title="คลิกเพื่อดูตัวอย่างด่วน"
                      >
                        {inv.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        เลขผู้เสียภาษี: {inv.customerTaxId || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {inv.categoryPrimary}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ฿{formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-700">
                      ฿{formatCurrency(inv.vatAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ฿{formatCurrency(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-emerald-600 inline-block" title="ซิงค์บนระบบคลาวด์แล้ว">
                          <CheckCircle className="w-4 h-4" />
                        </span>
                        {inv.googleDriveFolderUrl && (
                          <a
                            href={inv.googleDriveFolderUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 bg-blue-50 p-1 rounded hover:bg-blue-100"
                            title={`เปิดโฟลเดอร์สำรอง Google Drive (${inv.documentNo})`}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setQuickPreviewInvoice(inv)}
                          className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                          title="ดูตัวอย่างด่วน A4 (Quick Preview)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="ไปหน้าพิมพ์เอกสารเต็มรูปแบบ"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDuplicateInvoice(inv)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="คัดลอกเป็นใบใหม่"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`ยืนยันการลบใบกำกับภาษีเลขที่ ${inv.documentNo}?`)) {
                              onDeleteInvoice(inv.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="ลบเอกสาร"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer summary bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-600 gap-2">
          <span>แสดง {filteredInvoices.length} จากทั้งหมด {invoices.length} รายการ</span>
          <div className="flex items-center gap-4 font-semibold">
            <span>
              ยอดรวมก่อนภาษี: <span className="font-mono text-slate-900">฿{formatCurrency(filteredInvoices.reduce((s, i) => s + i.subtotal, 0))}</span>
            </span>
            <span>
              VAT 7%: <span className="font-mono text-indigo-700">฿{formatCurrency(filteredInvoices.reduce((s, i) => s + i.vatAmount, 0))}</span>
            </span>
            <span>
              รวมสุทธิ: <span className="font-mono text-emerald-700">฿{formatCurrency(filteredInvoices.reduce((s, i) => s + i.grandTotal, 0))}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Full-Page Rendered Quick Preview Modal without leaving list view */}
      {quickPreviewInvoice && (
        <InvoiceQuickPreviewModal
          invoice={quickPreviewInvoice}
          settings={effectiveSettings}
          invoicesList={filteredInvoices}
          onClose={() => setQuickPreviewInvoice(null)}
          onSelectInvoice={inv => setQuickPreviewInvoice(inv)}
          onEdit={inv => {
            setQuickPreviewInvoice(null);
            if (onEditInvoice) {
              onEditInvoice(inv);
            } else {
              onSelectInvoice(inv);
            }
          }}
        />
      )}

      {/* Invoice Import Modal (Word .docx & Historical Backups with Cloudflare D1) */}
      <InvoiceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingInvoicesCount={invoices.length}
        onImportSuccess={(count, message) => {
          setImportNotification(message);
          if (onRefreshInvoices) {
            onRefreshInvoices();
          }
        }}
      />
    </div>
  );
};
