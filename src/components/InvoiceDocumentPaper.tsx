import React from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { formatCurrency, numberToThaiBaht } from '../utils/bahtText.ts';

export interface InvoiceDocumentPaperProps {
  invoice: InvoiceDocument;
  settings: CompanySettings;
  docType?: 'original' | 'copy';
  isNonVatCustomer?: boolean;
  showStamp?: boolean;
  showSignature?: boolean;
  showMargins?: boolean;
  inModal?: boolean;
  previewZoom?: 'fit' | '100' | '85';
  fontScaleDelta?: number; // Dynamic pt adjustment (-2, -1, 0, +1, +2, +3)
}

export const getThaiFontFamily = (choice?: string): string => {
  switch (choice) {
    case 'baijamjuree':
      return "'Bai Jamjuree', 'Prompt', 'Sarabun', sans-serif";
    case 'sarabun':
      return "'Sarabun', 'TH Sarabun New', 'Bai Jamjuree', sans-serif";
    case 'prompt':
      return "'Prompt', 'Bai Jamjuree', sans-serif";
    case 'kanit':
      return "'Kanit', 'Prompt', sans-serif";
    case 'browallia':
      return "'Browallia New', 'BrowalliaUPC', 'Bai Jamjuree', sans-serif";
    case 'system':
      return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    default:
      return "'Bai Jamjuree', 'Prompt', 'Sarabun', 'Browallia New', sans-serif";
  }
};

export const InvoiceDocumentPaper: React.FC<InvoiceDocumentPaperProps> = ({
  invoice,
  settings,
  docType = 'original',
  isNonVatCustomer = false,
  showStamp = true,
  showSignature = true,
  showMargins = false,
  inModal = false,
  previewZoom = 'fit',
  fontScaleDelta = 0
}) => {
  const currentFontFamily = getThaiFontFamily(settings.fontFamilyChoice);

  // Determine base font sizes based on preset and custom settings
  const preset = settings.fontScalePreset || 'comfortable';
  
  let basePt = settings.documentBaseFontSize || (preset === 'large' ? 16 : preset === 'comfortable' ? 14.5 : 13.5);
  // Apply dynamic delta from interactive toolbar (A- / A+)
  basePt = Math.max(12, Math.min(20, basePt + fontScaleDelta));

  // Company Name Header Font Size
  const companyNamePt = (settings.companyHeaderFontSize || 18) + (fontScaleDelta > 0 ? 1 : fontScaleDelta < 0 ? -1 : 0);
  const docTitlePt = Math.max(17, companyNamePt);
  const labelPt = basePt;
  const valuePt = basePt;
  const tableHeaderPt = basePt + 0.5;
  const grandTotalPt = basePt + 2.5;
  const subTextPt = Math.max(10.5, basePt - 2.5);

  // Calculate empty rows dynamically to guarantee the document strictly fits within 1 A4 page
  // Keeps the table balanced without pushing signatures or totals to a 2nd page
  const maxTableRows = invoice.items.length <= 2 ? 4 : invoice.items.length <= 4 ? 5 : invoice.items.length;
  const emptyRowsCount = Math.max(0, maxTableRows - invoice.items.length);

  // Calculations adjusted for Non-VAT customers
  const calculatedGrandTotal = isNonVatCustomer
    ? Math.round((invoice.subtotal - invoice.withholdingTaxAmount) * 100) / 100
    : invoice.grandTotal;
  const calculatedThaiText = isNonVatCustomer
    ? numberToThaiBaht(calculatedGrandTotal)
    : invoice.totalThaiText;

  return (
    <div
      className={`invoice-paper font-document bg-white text-slate-900 leading-snug relative selection:bg-blue-100 ${
        inModal
          ? 'w-[210mm] max-w-[210mm] min-h-[297mm] print:min-h-0 print:w-full p-[8mm_10mm_6mm_10mm] print:p-0 shadow-2xl mx-auto border border-slate-300 relative transition-transform'
          : 'max-w-4xl mx-auto p-6 sm:p-8 print:p-0 shadow-xl border border-slate-300'
      }`}
      style={{
        fontFamily: currentFontFamily,
        fontSize: `${basePt}pt`,
        lineHeight: 1.25,
        ...(inModal && previewZoom !== 'fit'
          ? { transform: `scale(${previewZoom === '100' ? 1 : 0.85})`, transformOrigin: 'top center' }
          : {})
      }}
    >
      {/* Visual A4 Margin Guide Overlay (Only in Modal Preview when enabled) */}
      {inModal && showMargins && (
        <div className="absolute inset-0 pointer-events-none border border-dashed border-blue-400/60 m-[8mm_10mm_6mm_10mm] z-30 print:hidden">
          <span className="absolute -top-2.5 left-4 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
            Margin Top 8mm
          </span>
          <span className="absolute -left-2.5 top-1/2 -rotate-90 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
            Margin Left 10mm
          </span>
          <span className="absolute -right-2.5 top-1/2 rotate-90 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
            Margin Right 10mm
          </span>
          <span className="absolute -bottom-2.5 right-4 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
            Margin Bottom 6mm
          </span>
        </div>
      )}

      {/* Top Header with Official Logo & Company Info */}
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2 mb-2.5 print:pb-1.5 print:mb-1.5">
        <div className="flex items-start gap-3 sm:gap-4 flex-1 pr-4">
          {/* Header Logo */}
          {settings.showLogoOnPrint !== false && (settings.logoUrl || settings.stampUrl) && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center p-1 bg-white rounded border border-slate-200">
              <img
                src={settings.logoUrl || settings.stampUrl}
                alt="A.S. Power Network Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
          )}
          <div className="flex-1">
            <h1
              className="font-bold tracking-normal text-slate-900"
              style={{
                fontFamily: currentFontFamily,
                fontSize: `${companyNamePt}pt`,
                lineHeight: 1.25
              }}
            >
              {settings.name}{' '}
              <span
                className="font-normal text-slate-700 inline-block"
                style={{ fontSize: `${Math.max(14, companyNamePt - 3)}pt` }}
              >
                ({settings.branch})
              </span>
            </h1>
            <p className="mt-0.5 text-slate-700 leading-snug" style={{ fontSize: `${labelPt}pt` }}>
              <span className="font-semibold">ที่อยู่:</span> {settings.address}
            </p>
            <div
              className="flex flex-wrap gap-x-6 gap-y-0.5 mt-0.5 text-slate-800"
              style={{ fontSize: `${labelPt}pt` }}
            >
              <p>
                <span className="font-semibold">เลขประจำตัวผู้เสียภาษีอากร:</span>{' '}
                <span className="font-mono tracking-wider font-bold">{settings.taxId}</span>
                {settings.branchCode && (
                  <span className="ml-2 text-slate-600">/ สาขาที่ {settings.branchCode}</span>
                )}
              </p>
              {settings.phone && (
                <p>
                  <span className="font-semibold">โทร:</span> {settings.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0">
          <div
            className="inline-block px-3 py-1 border-2 border-slate-800 font-bold uppercase tracking-wider mb-1"
            style={{ fontSize: `${basePt - 1.5}pt` }}
          >
            {docType === 'original' ? 'ต้นฉบับ / ORIGINAL' : 'สำเนา / COPY'}
          </div>
          <div className="text-slate-500 font-mono" style={{ fontSize: `${subTextPt}pt` }}>
            {isNonVatCustomer ? '(เอกสารสำหรับลูกค้าไม่จด VAT)' : '(เอกสารออกเป็นชุด)'}
          </div>
        </div>
      </div>

      {/* Document Title Heading (Adaptive for VAT / Non-VAT) */}
      <div className="text-center my-1.5 print:my-0.5">
        <h2
          className="font-bold tracking-wide text-slate-900 leading-snug"
          style={{
            fontFamily: "'Browallia New', 'BrowalliaUPC', 'Bai Jamjuree', 'Sarabun', sans-serif",
            fontSize: `${docTitlePt}pt`
          }}
        >
          {isNonVatCustomer ? 'ใบเสร็จรับเงิน' : 'ใบเสร็จรับเงิน / ใบกำกับภาษี'}
        </h2>
        <p
          className="font-semibold tracking-widest text-slate-600 uppercase"
          style={{ fontSize: `${subTextPt}pt` }}
        >
          {isNonVatCustomer ? 'RECEIPT' : 'RECEIPT / TAX INVOICE'}
        </p>
        {isNonVatCustomer && (
          <span
            className="inline-block mt-0.5 px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300"
            style={{ fontSize: `${subTextPt}pt` }}
          >
            * ออกให้ลูกค้าที่ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม (Non-VAT Registered Customer)
          </span>
        )}
      </div>

      {/* Document Metadata Grid */}
      <div
        className="grid grid-cols-12 gap-2 my-2 print:my-1.5 p-2 sm:p-2.5 print:p-1.5 bg-slate-50/70 border border-slate-300 rounded-sm"
        style={{ fontSize: `${valuePt}pt` }}
      >
        {/* Left Column: Customer details */}
        <div className="col-span-12 md:col-span-7 space-y-0.5">
          <div className="flex">
            <span className="w-28 shrink-0 font-semibold text-slate-700">รหัสลูกค้า:</span>
            <span className="font-bold text-slate-900 font-mono">{invoice.customerCode || '-'}</span>
          </div>
          <div className="flex items-start">
            <span className="w-28 shrink-0 font-semibold text-slate-700">ชื่อลูกค้า:</span>
            <span className="font-bold text-slate-900">{invoice.customerName}</span>
          </div>
          <div className="flex">
            <span className="w-28 shrink-0 font-semibold text-slate-700">เลขประจำตัวผู้เสียภาษี:</span>
            <span className="font-mono font-bold tracking-wide text-slate-900">
              {isNonVatCustomer
                ? invoice.customerTaxId || 'ไม่อยู่ในระบบภาษีมูลค่าเพิ่ม'
                : invoice.customerTaxId || '-'}
            </span>
            <span className="ml-2 text-slate-600">({invoice.customerBranch || 'สำนักงานใหญ่'})</span>
          </div>
          <div className="flex items-start">
            <span className="w-28 shrink-0 font-semibold text-slate-700">ที่อยู่:</span>
            <span className="text-slate-800 leading-snug">{invoice.customerAddress || '-'}</span>
          </div>
          {invoice.customerPhone && (
            <div className="flex">
              <span className="w-28 shrink-0 font-semibold text-slate-700">โทรศัพท์:</span>
              <span className="text-slate-800">{invoice.customerPhone}</span>
            </div>
          )}
        </div>

        {/* Right Column: Invoice Reference details */}
        <div className="col-span-12 md:col-span-5 space-y-0.5 border-t md:border-t-0 md:border-l border-slate-300 pt-1.5 md:pt-0 md:pl-3">
          <div className="flex justify-between items-center bg-blue-50/60 p-1 border border-blue-200">
            <span className="font-bold text-blue-900">เลขที่เอกสาร:</span>
            <span
              className="font-mono font-black text-blue-900 tracking-wider"
              style={{ fontSize: `${basePt + 1.5}pt` }}
            >
              {invoice.documentNo}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">วันที่:</span>
            <span className="font-medium text-slate-900">{invoice.documentDateThai}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">เลขที่ใบกำกับ:</span>
            <span className="font-medium text-slate-800">
              {isNonVatCustomer ? '-' : invoice.referenceNo || '………………………………………………'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">พนักงานขาย:</span>
            <span className="font-medium text-slate-800">{invoice.salesman || 'นายอภิวัฒน์ ส.'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-700">วันครบกำหนดชำระ:</span>
            <span className="font-medium text-slate-800">
              {invoice.paymentDueDate ? invoice.paymentDueDate : '………………………………………………'}
            </span>
          </div>
        </div>
      </div>

      {/* Invoice Items Table */}
      <div className="border border-slate-800 my-2 print:my-1.5">
        <table className="w-full text-left border-collapse" style={{ fontSize: `${valuePt}pt` }}>
          <thead>
            <tr
              className="bg-slate-200/90 text-slate-900 font-bold border-b border-slate-800 text-center"
              style={{ fontSize: `${tableHeaderPt}pt` }}
            >
              <th className="py-1 px-2 border-r border-slate-400 w-12">ลำดับ</th>
              <th className="py-1 px-3 border-r border-slate-400 text-left">รายการ (Description)</th>
              <th className="py-1 px-2 border-r border-slate-400 w-16">หน่วย</th>
              <th className="py-1 px-2 border-r border-slate-400 w-16">จำนวน</th>
              <th className="py-1 px-2 border-r border-slate-400 w-24 text-right">ราคา/หน่วย</th>
              <th className="py-1 px-2 w-28 text-right">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => (
              <tr key={item.id || idx} className="border-b border-slate-200/80 hover:bg-slate-50/50">
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300 font-mono">{idx + 1}</td>
                <td className="py-1.5 px-3 print:py-1 border-r border-slate-300 font-medium text-slate-900">
                  {item.description}
                </td>
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300">{item.unit || '-'}</td>
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300 font-mono">{item.quantity}</td>
                <td className="py-1.5 px-2 print:py-1 text-right border-r border-slate-300 font-mono">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-1.5 px-2 print:py-1 text-right font-mono font-semibold text-slate-900">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}

            {/* Blank filler rows for authentic accounting paper styling */}
            {Array.from({ length: emptyRowsCount }).map((_, i) => (
              <tr key={`empty-${i}`} className="border-b border-slate-100 h-6 print:h-5">
                <td className="border-r border-slate-300">&nbsp;</td>
                <td className="border-r border-slate-300">&nbsp;</td>
                <td className="border-r border-slate-300">&nbsp;</td>
                <td className="border-r border-slate-300">&nbsp;</td>
                <td className="border-r border-slate-300">&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Calculation & Thai Baht Text Block */}
      <div className="grid grid-cols-12 border border-slate-800 mt-1.5 print:mt-1" style={{ fontSize: `${valuePt}pt` }}>
        {/* Left: Thai Baht Text & Payment method */}
        <div className="col-span-12 sm:col-span-7 p-2 sm:p-2.5 print:p-1.5 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <span
              className="font-semibold text-slate-600 block mb-0.5"
              style={{ fontSize: `${Math.max(11, basePt - 1.5)}pt` }}
            >
              จำนวนเงินตัวอักษร:
            </span>
            <div
              className="p-1.5 sm:p-2 bg-slate-100 border border-slate-300 rounded font-bold text-blue-900 leading-snug"
              style={{ fontSize: `${basePt + 0.5}pt` }}
            >
              ({calculatedThaiText})
            </div>
          </div>

          {/* Payment Mode options */}
          <div
            className="mt-2.5 print:mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5"
            style={{ fontSize: `${basePt - 0.5}pt` }}
          >
            <span className="font-bold text-slate-800">การชำระเงิน (Payment By):</span>
            <div className="flex flex-wrap items-center gap-3 text-slate-800 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  readOnly
                  checked={invoice.paymentMethod === 'cash'}
                  className="rounded border-slate-400"
                />
                <span>เงินสด (Cash)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  readOnly
                  checked={invoice.paymentMethod === 'cheque'}
                  className="rounded border-slate-400"
                />
                <span>เช็ค (Cheque)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  readOnly
                  checked={invoice.paymentMethod === 'transfer'}
                  className="rounded border-slate-400"
                />
                <span>โอนเงิน (Transfer)</span>
              </label>
            </div>

            {invoice.paymentMethod === 'cheque' && (
              <div
                className="text-slate-600 mt-0.5 pl-2 border-l-2 border-blue-400"
                style={{ fontSize: `${subTextPt}pt` }}
              >
                ธนาคาร: {invoice.chequeBank || '………………'} เช็คเลขที่: {invoice.chequeNo || '………………'} วันที่: {invoice.chequeDate || '………………'}
              </div>
            )}

            {invoice.paymentMethod === 'transfer' && (
              <div
                className="text-slate-600 mt-0.5 pl-2 border-l-2 border-green-500"
                style={{ fontSize: `${subTextPt}pt` }}
              >
                เข้าบัญชี: {settings.bankName} เลขที่บัญชี: {settings.bankAccountNo}
              </div>
            )}
          </div>
        </div>

        {/* Right: Numbers breakdown */}
        <div className="col-span-12 sm:col-span-5" style={{ fontSize: `${valuePt}pt` }}>
          <div className="flex justify-between py-1 px-2.5 print:py-0.5 border-b border-slate-300">
            <span className="font-semibold text-slate-700">รวมราคาสินค้า / บริการ:</span>
            <span className="font-mono font-medium">{formatCurrency(invoice.subtotal)}</span>
          </div>

          {/* Toggleable VAT Line based on Customer VAT registration status */}
          {!isNonVatCustomer ? (
            <div className="flex justify-between py-1 px-2.5 print:py-0.5 border-b border-slate-300">
              <span className="font-semibold text-slate-700">บวก ภาษีมูลค่าเพิ่ม {invoice.vatRate}%:</span>
              <span className="font-mono font-medium">{formatCurrency(invoice.vatAmount)}</span>
            </div>
          ) : (
            <div
              className="flex justify-between py-1 px-2.5 print:py-0.5 border-b border-slate-200 bg-amber-50/60 text-amber-900"
              style={{ fontSize: `${subTextPt}pt` }}
            >
              <span className="font-medium italic">ภาษีมูลค่าเพิ่ม (Non-VAT Customer):</span>
              <span className="font-mono font-semibold">ไม่คิดภาษี 0.00</span>
            </div>
          )}

          <div className="flex justify-between py-1 px-2.5 print:py-0.5 border-b border-slate-300 text-slate-600">
            <span>หัก ภาษีหัก ณ ที่จ่าย {invoice.withholdingTaxRate ? `${invoice.withholdingTaxRate}%` : '-'}:</span>
            <span className="font-mono">
              {invoice.withholdingTaxAmount > 0 ? `-${formatCurrency(invoice.withholdingTaxAmount)}` : '-'}
            </span>
          </div>

          <div className="flex justify-between py-1.5 px-2.5 print:py-1 bg-slate-200/90 font-bold text-slate-900 border-t border-slate-800">
            <span>ยอดรวมสุทธิ (Grand Total):</span>
            <span
              className="font-mono text-blue-900"
              style={{ fontSize: `${grandTotalPt}pt` }}
            >
              {formatCurrency(calculatedGrandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Signatures & Stamp Section */}
      <div className="mt-3.5 sm:mt-5 print:mt-2 pt-2 print:pt-1 border-t border-dashed border-slate-300 grid grid-cols-4 gap-2 text-center">
        {/* 1. Receiver */}
        <div className="flex flex-col justify-end items-center">
          <div className="w-full h-10 print:h-8 flex items-center justify-center mb-1">
            <div className="w-24 sm:w-28 border-b border-dotted border-slate-600 h-8 print:h-6"></div>
          </div>
          <div className="w-full border-t border-slate-400 pt-0.5">
            <p className="font-bold text-slate-800 leading-tight" style={{ fontSize: `${Math.max(11, basePt - 1)}pt` }}>
              ผู้รับสินค้า / บริการ
            </p>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              วันที่ ………/………/………
            </p>
          </div>
        </div>

        {/* 2. Sender / Delivery */}
        <div className="flex flex-col justify-end items-center">
          <div className="w-full h-10 print:h-8 flex items-center justify-center mb-1">
            {settings.showSenderSignature && settings.senderSignatureUrl ? (
              <img src={settings.senderSignatureUrl} alt="Sender Signature" className="max-h-8 max-w-full object-contain" />
            ) : (
              <div className="w-24 sm:w-28 border-b border-dotted border-slate-600 h-8 print:h-6"></div>
            )}
          </div>
          <div className="w-full border-t border-slate-400 pt-0.5">
            <p className="font-bold text-slate-800 leading-tight" style={{ fontSize: `${Math.max(11, basePt - 1)}pt` }}>
              {settings.senderName ? `( ${settings.senderName} )` : '( ………………………………… )'}
            </p>
            <p className="text-slate-600 font-medium leading-tight mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              ผู้ส่งสินค้า / ส่งมอบ
            </p>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              วันที่ ………/………/………
            </p>
          </div>
        </div>

        {/* 3. Collector / Cashier */}
        <div className="flex flex-col justify-end items-center">
          <div className="w-full h-10 print:h-8 flex items-center justify-center mb-1">
            {settings.showCollectorSignature && settings.collectorSignatureUrl ? (
              <img src={settings.collectorSignatureUrl} alt="Collector Signature" className="max-h-8 max-w-full object-contain" />
            ) : (
              <div className="w-24 sm:w-28 border-b border-dotted border-slate-600 h-8 print:h-6"></div>
            )}
          </div>
          <div className="w-full border-t border-slate-400 pt-0.5">
            <p className="font-bold text-slate-800 leading-tight" style={{ fontSize: `${Math.max(11, basePt - 1)}pt` }}>
              {settings.collectorName ? `( ${settings.collectorName} )` : '( ………………………………… )'}
            </p>
            <p className="text-slate-600 font-medium leading-tight mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              {settings.collectorTitle || 'ผู้รับเงิน / การเงิน'}
            </p>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              วันที่ ………/………/………
            </p>
          </div>
        </div>

        {/* 4. Authorized Signatory & Official Stamp (Separated so text & image never overlap) */}
        <div className="relative flex flex-col items-center justify-end">
          {/* Signature Zone with Dedicated Clear Height */}
          <div className="relative w-full h-10 print:h-8 flex items-center justify-center mb-1">
            {/* Authentic Company Stamp Overlay: contained in signature area, not overlapping text */}
            {showStamp && settings.showStampOnPrint && settings.stampUrl && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10"
                title="ตราประทับ ห้างหุ้นส่วนจำกัด เอ.เอ.เพาเวอร์ เน็ทเวิร์ค"
              >
                <img
                  src={settings.stampUrl}
                  alt="Company Stamp"
                  className="w-18 h-18 sm:w-20 sm:h-20 print:w-16 print:h-16 object-contain opacity-80 mix-blend-multiply filter drop-shadow-xs"
                />
              </div>
            )}

            {/* Authentic Signature Overlay or Dotted Line */}
            {showSignature && settings.showAuthorizedSignature && settings.signatureUrl ? (
              <div 
                className="h-10 print:h-8 flex items-center justify-center relative z-20 pointer-events-none select-none"
                title="ลายเซ็นต์ผู้มีอำนาจลงนาม"
              >
                <img
                  src={settings.signatureUrl}
                  alt="Authorized Signature"
                  className="max-h-9 print:max-h-7 max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-24 sm:w-28 border-b border-dotted border-slate-600 h-8 print:h-6 relative z-10"></div>
            )}
          </div>

          {/* Signer Information (หุ้นส่วนผู้จัดการ) - Clearly separated below line, no overlap */}
          <div className="w-full border-t border-slate-400 pt-0.5 relative z-20">
            <p className="font-bold text-slate-900 leading-tight" style={{ fontSize: `${Math.max(11, basePt - 1)}pt` }}>
              {settings.authorizedSignerName ? `( ${settings.authorizedSignerName} )` : '( ………………………………… )'}
            </p>
            <p className="text-slate-800 font-semibold leading-tight mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              {settings.authorizedSignerTitle || 'หุ้นส่วนผู้จัดการ'}
            </p>
            <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
              วันที่: {invoice.signDate ? invoice.documentDateThai : '………/………/………'}
            </p>
          </div>
        </div>
      </div>

      {/* Standard Terms & Notes */}
      <div
        className="mt-2.5 print:mt-1 pt-1.5 print:pt-0.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-slate-600 gap-1.5"
        style={{ fontSize: `${subTextPt}pt` }}
      >
        <p className="text-left flex-1">
          <strong>หมายเหตุ:</strong> {invoice.notes || settings.defaultNotes || 'ได้รับสินค้าและบริการถูกต้องเรียบร้อยแล้ว ในกรณีชำระด้วยเช็คจะสมบูรณ์เมื่อธนาคารเรียกเก็บเงินเรียบร้อยแล้ว'}
        </p>
        {settings.website && (
          <p className="font-mono text-slate-500 shrink-0">
            Web: {settings.website} {settings.lineId ? `| LINE: ${settings.lineId}` : ''}
          </p>
        )}
      </div>
    </div>
  );
};
