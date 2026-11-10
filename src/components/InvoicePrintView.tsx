import React, { useState } from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { InvoiceDocumentPaper } from './InvoiceDocumentPaper.tsx';
import {
  backupInvoiceToGoogleDrive,
  googleSignIn,
  getAccessToken
} from '../services/googleDriveService.ts';
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
  Info,
  FolderOpen,
  CloudUpload,
  CheckCircle,
  ExternalLink
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
  const [driveStatus, setDriveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | undefined>(invoice.googleDriveFolderUrl);
  const [driveMsg, setDriveMsg] = useState<string>('');
  
  // Non-VAT Registered Customer Toggle
  const [isNonVatCustomer, setIsNonVatCustomer] = useState(false);

  // Direct Font Size state (0 to 100 pt)
  const [customFontSize, setCustomFontSize] = useState<number>(settings.documentBaseFontSize || 12.5);
  const [activeFontFamily, setActiveFontFamily] = useState<any>(settings.fontFamilyChoice || 'angsananew');

  // Print Preview Modal States
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showMargins, setShowMargins] = useState(true);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100' | '85'>('fit');

  const handlePrint = () => {
    window.print();
  };

  const handleBackupToDrive = async () => {
    setDriveStatus('saving');
    try {
      let token = await getAccessToken();
      if (!token) {
        const signinRes = await googleSignIn();
        if (!signinRes) {
          setDriveStatus('idle');
          return;
        }
      }
      const res = await backupInvoiceToGoogleDrive(invoice, settings);
      setDriveStatus('success');
      setDriveFolderUrl(res.folderUrl);
      setDriveMsg(`สำรองไฟล์เอกสาร ${invoice.documentNo} ลงโฟลเดอร์ Google Drive เรียบร้อย`);
      setTimeout(() => setDriveMsg(''), 4500);
    } catch (err: any) {
      setDriveStatus('error');
      setDriveMsg('สำรองข้อมูลไม่สำเร็จ: ' + err.message);
      setTimeout(() => setDriveMsg(''), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 print:min-h-0 print:bg-white print:p-0 print:m-0">
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
            <option value="angsananew">Angsana New (อังศนา นิว - มาตรฐานเอกสาร)</option>
            <option value="angsanaupc">AngsanaUPC (อังศนา ยูพีซี - คลาสสิก)</option>
            <option value="baijamjuree">Bai Jamjuree (ใบจามจุรี - โมเดิร์น)</option>
            <option value="sarabun">Sarabun (สารบัญ - ราชการ)</option>
            <option value="prompt">Prompt (พร้อมท์)</option>
            <option value="kanit">Kanit (คณิต)</option>
            <option value="browallia">Browallia New (บราวเวอร์เลีย)</option>
            <option value="system">ระบบดั้งเดิม (System)</option>
          </select>

          {/* Quick Font Size Adjuster (0 - 100 pt) */}
          <div className="flex items-center bg-white border border-slate-300 rounded-lg p-1 shadow-xs gap-1.5" title="ปรับขนาดตัวอักษร 0 - 100 pt">
            <span className="px-1.5 text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-blue-600" />
              ขนาด:
            </span>
            <button
              type="button"
              onClick={() => setCustomFontSize(prev => Math.max(0, Math.round((prev - 0.5) * 10) / 10))}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
              title="ลดขนาดตัวอักษร (-0.5)"
            >
              -
            </button>
            <div className="flex items-center">
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={customFontSize}
                onChange={e => {
                  const val = Number(e.target.value);
                  setCustomFontSize(isNaN(val) ? 12.5 : Math.max(0, Math.min(100, val)));
                }}
                className="w-12 text-center text-xs font-bold font-mono text-blue-900 border border-slate-300 rounded py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/50"
              />
              <span className="text-[10px] text-slate-500 font-mono ml-0.5">pt</span>
            </div>
            <button
              type="button"
              onClick={() => setCustomFontSize(prev => Math.min(100, Math.round((prev + 0.5) * 10) / 10))}
              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold cursor-pointer"
              title="เพิ่มขนาดตัวอักษร (+0.5)"
            >
              +
            </button>
            <input
              type="range"
              min={0}
              max={100}
              step={0.5}
              value={customFontSize}
              onChange={e => setCustomFontSize(Number(e.target.value))}
              className="w-18 sm:w-24 accent-blue-600 cursor-pointer hidden sm:block"
              title="สไลเดอร์ปรับขนาด 0-100 pt"
            />
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

          {/* Google Drive Action Buttons */}
          {driveFolderUrl && (
            <a
              href={driveFolderUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer text-xs"
              title="เปิดโฟลเดอร์สำหรับเอกสารนี้ใน Google Drive"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
              โฟลเดอร์ Drive ({invoice.documentNo})
            </a>
          )}

          <button
            onClick={handleBackupToDrive}
            disabled={driveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors cursor-pointer text-xs"
            title="สำรองไฟล์เอกสาร JSON และ HTML A4 ลง Google Drive แยกโฟลเดอร์ตามเลขที่เอกสาร"
          >
            <CloudUpload className={`w-3.5 h-3.5 text-blue-600 ${driveStatus === 'saving' ? 'animate-bounce' : ''}`} />
            {driveStatus === 'saving' ? 'กำลังบันทึกลง Drive...' : driveFolderUrl ? 'อัปเดตไฟล์บน Drive' : 'สำรองเข้า Drive'}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ / บันทึกเป็น PDF
          </button>
        </div>
      </div>

      {/* Floating Drive Toast Notice */}
      {driveMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-bottom border border-slate-700">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{driveMsg}</span>
        </div>
      )}

      {/* Main Standard Document View (Centered Full Paper) */}
      <div className="flex justify-center pb-12 print:p-0 print:m-0 print:block">
        <InvoiceDocumentPaper
          invoice={invoice}
          settings={{ ...settings, fontFamilyChoice: activeFontFamily }}
          docType={docType}
          isNonVatCustomer={isNonVatCustomer}
          showStamp={showStamp}
          showSignature={showSignature}
          inModal={false}
          fontSizeOverride={customFontSize}
        />
      </div>

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
              fontSizeOverride={customFontSize}
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
