import React, { useState, useEffect } from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { InvoiceDocumentPaper } from './InvoiceDocumentPaper.tsx';
import {
  X,
  Printer,
  Edit3,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Type,
  Eye,
  EyeOff,
  CheckCircle2,
  Info
} from 'lucide-react';

interface Props {
  invoice: InvoiceDocument;
  settings: CompanySettings;
  invoicesList: InvoiceDocument[];
  onClose: () => void;
  onEdit: (invoice: InvoiceDocument) => void;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
}

export const InvoiceQuickPreviewModal: React.FC<Props> = ({
  invoice,
  settings,
  invoicesList,
  onClose,
  onEdit,
  onSelectInvoice
}) => {
  const [docType, setDocType] = useState<'original' | 'copy'>('original');
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  const [showMargins, setShowMargins] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100' | '85'>('fit');
  const [isNonVatCustomer, setIsNonVatCustomer] = useState(false);

  // Dynamic font scale adjustment (+/- pt) for immediate comfort testing
  const [fontScaleDelta, setFontScaleDelta] = useState<number>(0);
  const [activeFontFamily, setActiveFontFamily] = useState<any>(settings.fontFamilyChoice || 'baijamjuree');

  // Keyboard navigation: Escape to close, ArrowLeft for Prev, ArrowRight for Next
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, invoicesList]);

  // Current index in filtered list
  const currentIndex = invoicesList.findIndex(i => i.id === invoice.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < invoicesList.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onSelectInvoice(invoicesList[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectInvoice(invoicesList[currentIndex + 1]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in print:bg-white print:fixed print:inset-0 print:overflow-visible print:z-auto print:block">
      {/* Top Header & Quick Actions Bar */}
      <header className="no-print bg-slate-900 text-white px-4 sm:px-6 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
        {/* Left: Document info & Navigation controls */}
        <div className="flex items-center gap-3">
          {/* Quick Prev / Next Document */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={handlePrev}
              disabled={!hasPrev}
              className={`p-1.5 rounded transition-colors ${
                hasPrev
                  ? 'text-white hover:bg-slate-700 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="เอกสารก่อนหน้า (แป้นลูกศรซ้าย)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono px-2 text-slate-400 select-none">
              {currentIndex !== -1 ? `${currentIndex + 1}/${invoicesList.length}` : '-'}
            </span>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className={`p-1.5 rounded transition-colors ${
                hasNext
                  ? 'text-white hover:bg-slate-700 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="เอกสารถัดไป (แป้นลูกศรขวา)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm sm:text-base text-blue-400">
                เลขที่: {invoice.documentNo}
              </span>
              <span className="text-xs text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                ({invoice.customerName})
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              ตัวอย่างด่วนแบบเต็มหน้า A4 (Quick Preview) • {invoice.documentDateThai}
            </p>
          </div>
        </div>

        {/* Center/Right: Interactive Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          {/* Quick Font Family Selector */}
          <select
            value={activeFontFamily}
            onChange={e => setActiveFontFamily(e.target.value as any)}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            title="เปลี่ยนฟอนต์ของเอกสาร (Font Family)"
          >
            <option value="baijamjuree">Bai Jamjuree (ใบจามจุรี - แนะนำ)</option>
            <option value="sarabun">Sarabun (สารบัญ)</option>
            <option value="prompt">Prompt (พร้อมท์)</option>
            <option value="kanit">Kanit (คณิต)</option>
            <option value="browallia">Browallia New (ดั้งเดิม)</option>
            <option value="system">ระบบดั้งเดิม (System)</option>
          </select>

          {/* Font Size Adjuster (A- / A+) for Readability */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5" title="ปรับขนาดฟอนต์ให้อ่านสบายตา">
            <span className="px-2 text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-blue-400" />
              ขนาด:
            </span>
            <button
              type="button"
              onClick={() => setFontScaleDelta(prev => Math.max(-2, prev - 1))}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-bold cursor-pointer"
              title="ลดขนาดตัวอักษร"
            >
              A-
            </button>
            <span className="px-1.5 py-0.5 bg-slate-900 rounded font-mono text-[11px] text-blue-300 min-w-10 text-center">
              {fontScaleDelta === 0 ? 'ปกติ' : fontScaleDelta > 0 ? `+${fontScaleDelta}pt` : `${fontScaleDelta}pt`}
            </span>
            <button
              type="button"
              onClick={() => setFontScaleDelta(prev => Math.min(4, prev + 1))}
              className="px-2 py-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded text-xs font-bold cursor-pointer"
              title="เพิ่มขนาดตัวอักษรให้อ่านง่ายสบายตา"
            >
              A+
            </button>
          </div>

          {/* Original vs Copy */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setDocType('original')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                docType === 'original' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              ต้นฉบับ
            </button>
            <button
              onClick={() => setDocType('copy')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                docType === 'copy' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              สำเนา
            </button>
          </div>

          {/* Non-VAT Customer Toggle */}
          <button
            onClick={() => setIsNonVatCustomer(!isNonVatCustomer)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer font-semibold transition-all ${
              isNonVatCustomer
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="สลับโหมดลูกค้าที่ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม"
          >
            <span className={`w-2 h-2 rounded-full ${isNonVatCustomer ? 'bg-amber-200' : 'bg-slate-400'}`} />
            {isNonVatCustomer ? 'ซ่อน VAT (ไม่จด)' : 'คิด VAT 7%'}
          </button>

          {/* Margin Guide Toggle */}
          <button
            onClick={() => setShowMargins(!showMargins)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer font-semibold transition-all ${
              showMargins
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="เปิด/ปิดเส้นประแสดงระยะกั้นหน้ากระดาษ A4 (10/12mm)"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showMargins ? 'ซ่อนระยะกั้นหน้า' : 'แสดงระยะกั้นหน้า'}
          </button>

          {/* Stamp Toggle */}
          <button
            onClick={() => setShowStamp(!showStamp)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              showStamp ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={showStamp ? 'ซ่อนตราประทับ' : 'แสดงตราประทับ'}
          >
            {showStamp ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setPreviewZoom('fit')}
              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                previewZoom === 'fit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              พอดีจอ
            </button>
            <button
              onClick={() => setPreviewZoom('85')}
              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                previewZoom === '85' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              85%
            </button>
            <button
              onClick={() => setPreviewZoom('100')}
              className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                previewZoom === '100' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              100%
            </button>
          </div>

          {/* Edit Invoice Button */}
          <button
            onClick={() => onEdit(invoice)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
            เปิดแก้ไข
          </button>

          {/* Print Direct */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-900/40 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            พิมพ์ / PDF
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title="ปิดหน้าต่างตัวอย่าง (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Full-Page A4 Render Container */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center bg-slate-900/60 print:bg-white print:p-0 print:overflow-visible print:block">
        <InvoiceDocumentPaper
          invoice={invoice}
          settings={{ ...settings, fontFamilyChoice: activeFontFamily }}
          docType={docType}
          isNonVatCustomer={isNonVatCustomer}
          showStamp={showStamp}
          showSignature={showSignature}
          showMargins={showMargins}
          inModal={true}
          previewZoom={previewZoom}
          fontScaleDelta={fontScaleDelta}
        />
      </div>

      {/* Modal Footer status bar */}
      <footer className="no-print bg-slate-900 text-slate-400 text-xs px-6 py-2 border-t border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>
            แสดงแบบฟอร์มขนาด A4 มาตรฐาน (210 x 297 mm) • ฟอนต์ Browallia New • 
          </span>
          <span className="text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 text-[11px]">
            ✓ กำหนดสัดส่วนพอดี 1 หน้ากระดาษ A4 เสมอ (Single-Page Guaranteed)
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
          <span>กดลูกศร [◀] [▶] เพื่อเปลี่ยนเอกสาร</span>
          <span>•</span>
          <span>กด [Esc] เพื่อปิด</span>
        </div>
      </footer>
    </div>
  );
};
