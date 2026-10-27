import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { formatCurrency } from '../utils/bahtText.ts';
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
  Eye,
  X,
  Maximize2
} from 'lucide-react';
import { StorageService } from '../services/storageService.ts';
import { InvoiceQuickPreviewModal } from './InvoiceQuickPreviewModal.tsx';

interface Props {
  invoices: InvoiceDocument[];
  settings?: CompanySettings;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
  onEditInvoice?: (invoice: InvoiceDocument) => void;
  onCreateNew: () => void;
  onDeleteInvoice: (id: string) => void;
  onDuplicateInvoice: (invoice: InvoiceDocument) => void;
}

export const InvoiceList: React.FC<Props> = ({
  invoices,
  settings,
  onSelectInvoice,
  onEditInvoice,
  onCreateNew,
  onDeleteInvoice,
  onDuplicateInvoice
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // Quick Preview Modal state
  const [quickPreviewInvoice, setQuickPreviewInvoice] = useState<InvoiceDocument | null>(null);

  const effectiveSettings = settings || StorageService.getSettings();

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

  // Filter logic: Customer name, Document number, or Amount (and Tax ID / Code)
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

      return matchSearch && matchStatus && yearMatches && monthMatches;
    });
  }, [invoices, searchTerm, statusFilter, selectedYear, selectedMonth]);

  const handleExportCsv = () => {
    StorageService.exportSalesReportCsv(filteredInvoices);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            รายการใบเสร็จรับเงิน / ใบกำกับภาษีทั้งหมด
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ค้นหา ตรวจสอบ พิมพ์สำเนา หรือดาวน์โหลดรายงานภาษีขาย (ภ.พ.30)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
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
              <option value="2569">พ.ศ. 2569</option>
              <option value="2568">พ.ศ. 2568</option>
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
            {(searchTerm || statusFilter !== 'all' || selectedYear !== 'all' || selectedMonth !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setSelectedYear('all');
                  setSelectedMonth('all');
                }}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold underline cursor-pointer"
              >
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
                      {inv.documentDateThai}
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
                      <span className="text-emerald-600 inline-block" title="ซิงค์บนระบบคลาวด์แล้ว">
                        <CheckCircle className="w-4 h-4 mx-auto" />
                      </span>
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
    </div>
  );
};
