import React, { useState } from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { InvoiceDocumentPaper } from './InvoiceDocumentPaper.tsx';
import {
  Printer,
  ArrowLeft,
  Eye,
  EyeOff,
  Maximize2,
  X,
  FileCheck,
  SlidersHorizontal,
  Type,
  Info
} from 'lucide-react';

interface Props {
  invoice: InvoiceDocument;
  settings: CompanySettings;
  onBack: () => void;
  onEdit?: () => void;
}

export const InvoicePrintView: React.FC<Props> = ({ invoice, settings, onBack, onEdit }) => {
  const [docType, setDocType] = useState<'original' | 'copy'>('original');
  const [showStamp, setShowStamp] = useState(true);
  const [showSignature, setShowSignature] = useState(true);
  
  // Non-VAT Registered Customer Toggle
  const [isNonVatCustomer, setIsNonVatCustomer] = useState(false);

  // Dynamic Font Size Delta for readability testing on the fly
  const [fontScaleDelta, setFontScaleDelta] = useState<number>(0);
  const [activeFontFamily, setActiveFontFamily] = useState<any>(settings.fontFamilyChoice || 'baijamjuree');

  // Print Preview Modal States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showMargins, setShowMargins] = useState(true);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100' | '85'>('fit');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      {/* Action Toolbar (Hidden during print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white p-4 rounded-xl shadow-md border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            กลับหน้ารายการ
          </button>
          <div className="h-5 w-px bg-slate-300 hidden sm:block" />
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setDocType('original')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                docType === 'original' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ต้นฉบับ (Original)
            </button>
            <button
              onClick={() => setDocType('copy')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                docType === 'copy' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สำเนา (Copy)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Quick Font Family Selector */}
          <select
            value={activeFontFamily}
            onChange={e => setActiveFontFamily(e.target.value as any)}
            className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-xs"
            title="เปลี่ยนฟอนต์ของเอกสาร (Font Family)"
          >
            <option value="baijamjuree">Bai Jamjuree (ใบจามจุรี - แนะนำ)</option>
            <option value="sarabun">Sarabun (สารบัญ)</option>
            <option value="prompt">Prompt (พร้อมท์)</option>
            <option value="kanit">Kanit (คณิต)</option>
            <option value="browallia">Browallia New (ดั้งเดิม)</option>
            <option value="system">ระบบดั้งเดิม (System)</option>
          </select>

          {/* Quick Font Size Adjuster for Readability */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5" title="ปรับขนาดฟอนต์ให้อ่านสบายตา">
            <span className="px-2 text-[11px] font-semibold text-slate-600 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-blue-600" />
              ขนาด:
            </span>
            <button
              type="button"
              onClick={() => setFontScaleDelta(prev => Math.max(-2, prev - 1))}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded font-bold cursor-pointer"
              title="ลดขนาดตัวอักษร"
            >
              A-
            </button>
            <span className="px-1.5 py-0.5 bg-white rounded font-mono text-[11px] text-blue-800 min-w-9 text-center shadow-xs">
              {fontScaleDelta === 0 ? 'ปกติ' : fontScaleDelta > 0 ? `+${fontScaleDelta}pt` : `${fontScaleDelta}pt`}
            </span>
            <button
              type="button"
              onClick={() => setFontScaleDelta(prev => Math.min(4, prev + 1))}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded font-bold cursor-pointer"
              title="เพิ่มขนาดตัวอักษรให้อ่านง่ายสบายตา"
            >
              A+
            </button>
          </div>

          {/* Non-VAT Customer Toggle */}
          <button
            onClick={() => setIsNonVatCustomer(!isNonVatCustomer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg border transition-all cursor-pointer ${
              isNonVatCustomer
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
            title="สลับโหมดลูกค้าที่ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม (ซ่อนรายละเอียด VAT)"
          >
            <span className={`w-2 h-2 rounded-full ${isNonVatCustomer ? 'bg-amber-500' : 'bg-slate-400'}`} />
            {isNonVatCustomer ? 'ลูกค้าไม่จด VAT (ซ่อนภาษี)' : 'ลูกค้าจดทะเบียน VAT'}
          </button>

          <button
            onClick={() => setShowStamp(!showStamp)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 font-medium rounded-lg border cursor-pointer ${
              showStamp ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-500'
            }`}
            title="เปิด/ปิดตราประทับ"
          >
            {showStamp ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            ตราประทับ
          </button>

          <button
            onClick={() => setShowSignature(!showSignature)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 font-medium rounded-lg border cursor-pointer ${
              showSignature ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-300 text-slate-500'
            }`}
            title="เปิด/ปิดลายเซ็นต์"
          >
            {showSignature ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            ลายเซ็นต์
          </button>

          {/* Print Preview Button */}
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            ตัวอย่างก่อนพิมพ์ A4
          </button>

          {onEdit && (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              แก้ไข
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </div>

      {/* Main Standard Document View (Centered Full Paper) */}
      <InvoiceDocumentPaper
        invoice={invoice}
        settings={{ ...settings, fontFamilyChoice: activeFontFamily }}
        docType={docType}
        isNonVatCustomer={isNonVatCustomer}
        showStamp={showStamp}
        showSignature={showSignature}
        inModal={false}
        fontScaleDelta={fontScaleDelta}
      />

      {/* ========================================================= */}
      {/* Dedicated A4 Print Preview Modal with Explicit Margins     */}
      {/* ========================================================= */}
      {showPreviewModal && (
        <div className="no-print fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in">
          {/* Modal Header Toolbar */}
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/30 border border-blue-500/40 rounded-lg text-blue-400">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  ตัวอย่างการพิมพ์ขนาด A4 (A4 Print Preview)
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    210 x 297 mm
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-semibold">
                    ✓ จัดขนาด 1 หน้า A4 พอดี
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  แสดงขอบกระดาษจริง ระยะกั้นหน้า (Margins) และการจัดวางก่อนสั่งพิมพ์ให้อยู่ในหน้าเดียวพอดี
                </p>
              </div>
            </div>

            {/* Preview Controls */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {/* Margin Guide Toggle */}
              <button
                onClick={() => setShowMargins(!showMargins)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-semibold transition-all ${
                  showMargins
                    ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showMargins ? 'ซ่อนเส้นระยะกั้นหน้า (10/12mm)' : 'แสดงเส้นระยะกั้นหน้า'}
              </button>

              {/* Non-VAT Customer Toggle */}
              <button
                onClick={() => setIsNonVatCustomer(!isNonVatCustomer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer font-semibold transition-all ${
                  isNonVatCustomer
                    ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isNonVatCustomer ? 'bg-amber-200' : 'bg-slate-400'}`} />
                {isNonVatCustomer ? 'ซ่อน VAT (ลูกค้าไม่จดทะเบียน)' : 'คิด VAT ปกติ (7%)'}
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5">
                <button
                  onClick={() => setPreviewZoom('fit')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    previewZoom === 'fit' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  พอดีจอ
                </button>
                <button
                  onClick={() => setPreviewZoom('85')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    previewZoom === '85' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  85%
                </button>
                <button
                  onClick={() => setPreviewZoom('100')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    previewZoom === '100' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  100% (จริง)
                </button>
              </div>

              {/* Print Direct Button */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-md shadow-blue-900/50 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                สั่งพิมพ์
              </button>

              {/* Close Button */}
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                title="ปิดหน้าต่างตัวอย่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Paper View Container */}
          <div className="flex-1 overflow-auto p-6 sm:p-10 flex items-start justify-center bg-slate-900/60">
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

          {/* Modal Footer Info */}
          <div className="bg-slate-900 text-slate-400 text-xs px-6 py-2.5 border-t border-slate-800 flex justify-between items-center shrink-0">
            <span className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-blue-400" />
              การพิมพ์จริงจะไม่มีการแสดงเส้นประขอบระยะกั้นหน้า และจะถูกปรับขนาดให้พอดีกับกระดาษ A4 มาตรฐาน
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              สถานะ: {isNonVatCustomer ? 'ใบเสร็จรับเงิน (Non-VAT)' : 'ใบเสร็จรับเงิน / ใบกำกับภาษี (VAT 7%)'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
