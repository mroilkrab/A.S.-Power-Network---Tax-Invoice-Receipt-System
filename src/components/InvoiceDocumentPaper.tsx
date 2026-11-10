import React from 'react';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { formatCurrency, numberToThaiBaht, getInvoiceDisplayDate, formatDateByEra } from '../utils/bahtText.ts';

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
  fontScaleDelta?: number; // Relative pt adjustment (-10 to +10)
  fontSizeOverride?: number; // Direct font size (0 to 100 pt)
}

export const getThaiFontFamily = (choice?: string): string => {
  switch (choice) {
    case 'angsananew':
      return "'Angsana New', 'AngsanaUPC', 'TH Sarabun New', 'Sarabun', 'Bai Jamjuree', sans-serif";
    case 'angsanaupc':
      return "'AngsanaUPC', 'Angsana New', 'TH Sarabun New', 'Sarabun', 'Bai Jamjuree', sans-serif";
    case 'angsana':
      return "'Angsana New', 'AngsanaUPC', 'TH Sarabun New', 'Sarabun', 'Bai Jamjuree', sans-serif";
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
      return "'Angsana New', 'AngsanaUPC', 'Bai Jamjuree', 'Prompt', 'Sarabun', 'Browallia New', sans-serif";
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
  fontScaleDelta = 0,
  fontSizeOverride
}) => {
  const currentFontFamily = getThaiFontFamily(settings.fontFamilyChoice);

  // Check if Angsana font family is active
  const isAngsanaFamily =
    settings.fontFamilyChoice === 'angsananew' ||
    settings.fontFamilyChoice === 'angsanaupc' ||
    settings.fontFamilyChoice === 'angsana';

  // Support font size selection from 0 to 100 pt
  // Default is compact & clean 12.5pt (fits A4 strictly without text overlap)
  let userFontSize = fontSizeOverride !== undefined ? fontSizeOverride : (settings.documentBaseFontSize || 12.5);
  userFontSize = userFontSize + fontScaleDelta;

  // Safe clamp between 4 and 100 pt (handles 0-100 input range gracefully without vanishing or breaking CSS)
  const basePt = Math.max(4, Math.min(100, userFontSize));

  // Proportional scaling for other typography elements based on basePt
  const companyNamePt = (settings.companyHeaderFontSize && fontSizeOverride === undefined)
    ? Math.max(5, Math.min(100, settings.companyHeaderFontSize + fontScaleDelta))
    : Math.min(15.5, Math.max(11, Math.round(basePt * 1.25 * 10) / 10));

  const docTitlePt = Math.round(basePt * 1.35 * 10) / 10;
  const labelPt = basePt;
  const valuePt = basePt;
  const tableHeaderPt = Math.round((basePt + 0.5) * 10) / 10;
  const grandTotalPt = Math.round((basePt + 2) * 10) / 10;
  const subTextPt = Math.max(5, Math.round((basePt - 2.5) * 10) / 10);

  // Date formatting by era (Buddhist Era พ.ศ. vs Christian Era ค.ศ.)
  const era = settings.dateFormatPreference || 'buddhist';
  const displayDocumentDate = getInvoiceDisplayDate(invoice, era);
  const displayDueDate = invoice.paymentDueDate
    ? formatDateByEra(invoice.paymentDueDate, era, 'slash')
    : '………………';
  const displaySignDate = invoice.signDate
    ? getInvoiceDisplayDate({ documentDate: invoice.signDate }, era)
    : displayDocumentDate;

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
          ? 'w-[210mm] max-w-[210mm] min-h-[297mm] print:min-h-0 print:w-full print:max-w-full p-[8mm_10mm_6mm_10mm] print:p-0 shadow-2xl mx-auto border border-slate-300 print:border-none print:shadow-none relative transition-transform overflow-hidden print:overflow-visible'
          : 'w-full max-w-[210mm] min-h-[297mm] print:min-h-0 print:w-full print:max-w-full p-[8mm_10mm_6mm_10mm] print:p-0 shadow-xl border border-slate-300 print:border-none print:shadow-none mx-auto relative rounded-xs transition-transform overflow-hidden print:overflow-visible'
      }`}
      style={{
        fontFamily: currentFontFamily,
        ['--document-font-family' as any]: currentFontFamily,
        fontSize: `${basePt}pt`,
        lineHeight: isAngsanaFamily ? 1.28 : 1.25,
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
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
      <div className="flex justify-between items-start border-b-2 border-slate-800 pb-2 mb-2 print:pb-1.5 print:mb-1 gap-2">
        <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
          {/* Header Logo */}
          {settings.showLogoOnPrint !== false && (settings.logoUrl || settings.stampUrl) && (
            <div
              className={`shrink-0 flex items-center justify-center p-1 print:p-0.5 bg-white rounded border border-slate-200 print:border-slate-300 shadow-xs ${
                settings.headerLogoSize === 'xlarge'
                  ? 'w-24 h-24 print:w-22 print:h-22'
                  : settings.headerLogoSize === 'medium'
                  ? 'w-16 h-16 print:w-16 print:h-16'
                  : 'w-20 h-20 print:w-20 print:h-20'
              }`}
            >
              <img
                src={settings.logoUrl || settings.stampUrl}
                alt="A.S. Power Network Logo"
                className="w-full h-full object-contain filter drop-shadow-xs"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1
              className="font-bold tracking-tight text-slate-900"
              style={{
                fontFamily: currentFontFamily,
                fontSize: `${companyNamePt}pt`,
                lineHeight: 1.25,
                lineBreak: 'strict',
                wordBreak: 'normal'
              }}
            >
              <span className="whitespace-nowrap inline-block">{settings.name}</span>{' '}
              <span
                className="font-normal text-slate-700 whitespace-nowrap inline-block"
                style={{ fontSize: `${Math.max(9, companyNamePt - 3)}pt` }}
              >
                ({settings.branch})
              </span>
            </h1>
            <div className="mt-1 space-y-0.5 text-slate-800" style={{ fontSize: `${labelPt}pt` }}>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold whitespace-nowrap shrink-0">ที่อยู่:</span>
                <span className="leading-snug break-words" style={{ lineBreak: 'strict', wordBreak: 'normal' }}>
                  {settings.address}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 pt-0.5">
                <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="font-semibold">เลขประจำตัวผู้เสียภาษีอากร:</span>{' '}
                  <span className="tabular-nums font-bold tracking-wide">{settings.taxId}</span>
                  {settings.branchCode && (
                    <span className="text-slate-600">/ สาขาที่ {settings.branchCode}</span>
                  )}
                </p>
                {settings.businessRegistrationNo && settings.businessRegistrationNo !== settings.taxId && (
                  <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-semibold">เลขทะเบียนนิติบุคคล:</span>{' '}
                    <span className="tabular-nums font-bold">{settings.businessRegistrationNo}</span>
                  </p>
                )}
                {settings.phone && (
                  <p className="flex items-baseline gap-1.5 whitespace-nowrap">
                    <span className="font-semibold">โทร:</span> <span>{settings.phone}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0 pl-1">
          <div
            className="inline-block px-2.5 py-0.5 border-2 border-slate-800 font-bold uppercase tracking-wider mb-1 whitespace-nowrap"
            style={{ fontSize: `${Math.max(8, basePt - 1.5)}pt` }}
          >
            {docType === 'original' ? 'ต้นฉบับ / ORIGINAL' : 'สำเนา / COPY'}
          </div>
          <div className="text-slate-500 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
            {isNonVatCustomer ? '(เอกสารสำหรับลูกค้าไม่จด VAT)' : '(เอกสารออกเป็นชุด)'}
          </div>
        </div>
      </div>

      {/* Document Title Heading (Adaptive for VAT / Non-VAT) */}
      <div className="text-center my-1.5 print:my-0.5">
        <h2
          className="font-bold tracking-wide text-slate-900 leading-snug whitespace-nowrap"
          style={{
            fontFamily: currentFontFamily,
            fontSize: `${docTitlePt}pt`
          }}
        >
          {isNonVatCustomer ? 'ใบเสร็จรับเงิน' : 'ใบเสร็จรับเงิน / ใบกำกับภาษี'}
        </h2>
        <p
          className="font-semibold tracking-widest text-slate-600 uppercase whitespace-nowrap"
          style={{ fontSize: `${subTextPt}pt` }}
        >
          {isNonVatCustomer ? 'RECEIPT' : 'RECEIPT / TAX INVOICE'}
        </p>
        {isNonVatCustomer && (
          <span
            className="inline-block mt-0.5 px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap"
            style={{ fontSize: `${subTextPt}pt` }}
          >
            * ออกให้ลูกค้าที่ไม่ได้จดทะเบียนภาษีมูลค่าเพิ่ม (Non-VAT Registered Customer)
          </span>
        )}
      </div>

      {/* Document Metadata Grid (Fixed overlap & clean aligned columns) */}
      <div
        className="grid grid-cols-12 gap-2 my-2 print:my-1.5 p-2 sm:p-2.5 print:p-1.5 bg-slate-50/70 border border-slate-300 rounded-sm"
        style={{ fontSize: `${valuePt}pt` }}
      >
        {/* Left Column: Customer details (Perfect vertical alignment for all rows including Tax ID / Corporate Registration No.) */}
        <div className="col-span-7">
          <div className="grid grid-cols-[115px_1fr] gap-x-2 gap-y-1 items-baseline">
            <span className="font-semibold text-slate-700 whitespace-nowrap">รหัสลูกค้า:</span>
            <span className="font-bold text-slate-900 tabular-nums">{invoice.customerCode || '-'}</span>

            <span className="font-semibold text-slate-700 whitespace-nowrap">ชื่อลูกค้า:</span>
            <span
              className="font-bold text-slate-900 leading-snug break-words"
              style={{ lineBreak: 'strict', wordBreak: 'normal' }}
            >
              {invoice.customerName}
            </span>

            <span className="font-semibold text-slate-700 whitespace-nowrap">เลขประจำตัวผู้เสียภาษี:</span>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="tabular-nums font-bold tracking-wide text-slate-900 whitespace-nowrap">
                {isNonVatCustomer
                  ? invoice.customerTaxId || 'ไม่อยู่ในระบบภาษีมูลค่าเพิ่ม'
                  : invoice.customerTaxId || '-'}
              </span>
              <span className="text-slate-600 whitespace-nowrap">({invoice.customerBranch || 'สำนักงานใหญ่'})</span>
            </div>

            <span className="font-semibold text-slate-700 whitespace-nowrap">ที่อยู่:</span>
            <span
              className="text-slate-800 leading-snug break-words"
              style={{ lineBreak: 'strict', wordBreak: 'normal' }}
            >
              {invoice.customerAddress || '-'}
            </span>

            {invoice.customerPhone && (
              <>
                <span className="font-semibold text-slate-700 whitespace-nowrap">โทรศัพท์:</span>
                <span className="text-slate-800 tabular-nums whitespace-nowrap">{invoice.customerPhone}</span>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Invoice Reference details */}
        <div className="col-span-5 space-y-1 border-l border-slate-300 pl-3">
          <div className="flex justify-between items-center bg-blue-50/60 p-1 border border-blue-200">
            <span className="font-bold text-blue-900 whitespace-nowrap">เลขที่เอกสาร:</span>
            <span
              className="tabular-nums font-black text-blue-900 tracking-wide whitespace-nowrap"
              style={{ fontSize: `${basePt + 1.5}pt` }}
            >
              {invoice.documentNo}
            </span>
          </div>
          <div className="grid grid-cols-[95px_1fr] gap-x-2 gap-y-1 items-baseline pt-0.5">
            <span className="font-semibold text-slate-700 whitespace-nowrap">วันที่:</span>
            <span className="font-medium text-slate-900 whitespace-nowrap text-right">{displayDocumentDate}</span>

            <span className="font-semibold text-slate-700 whitespace-nowrap">เลขที่ใบกำกับ:</span>
            <span className="font-medium text-slate-800 truncate text-right">
              {isNonVatCustomer ? '-' : invoice.referenceNo || '………………'}
            </span>

            <span className="font-semibold text-slate-700 whitespace-nowrap">พนักงานขาย:</span>
            <span className="font-medium text-slate-900 tracking-tight truncate text-right">
              {invoice.salesman && invoice.salesman.trim() !== '' ? invoice.salesman : '-'}
            </span>

            <span className="font-semibold text-slate-700 whitespace-nowrap">วันครบกำหนดชำระ:</span>
            <span className="font-medium text-slate-800 whitespace-nowrap text-right tabular-nums">
              {displayDueDate}
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
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300 tabular-nums whitespace-nowrap">{idx + 1}</td>
                <td
                  className="py-1.5 px-3 print:py-1 border-r border-slate-300 font-medium text-slate-900 leading-snug break-words"
                  style={{ wordBreak: 'keep-all', overflowWrap: 'break-word', textWrap: 'pretty' }}
                >
                  {item.description}
                </td>
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300 whitespace-nowrap">{item.unit || '-'}</td>
                <td className="py-1.5 px-2 print:py-1 text-center border-r border-slate-300 tabular-nums whitespace-nowrap">{item.quantity}</td>
                <td className="py-1.5 px-2 print:py-1 text-right border-r border-slate-300 tabular-nums whitespace-nowrap">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="py-1.5 px-2 print:py-1 text-right tabular-nums font-semibold text-slate-900 whitespace-nowrap">
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
        <div className="col-span-7 p-2 border-r border-slate-800 flex flex-col justify-between">
          <div>
            <span
              className="font-semibold text-slate-600 block mb-0.5 whitespace-nowrap"
              style={{ fontSize: `${Math.max(11, basePt - 1.5)}pt` }}
            >
              จำนวนเงินตัวอักษร:
            </span>
            <div
              className="p-1.5 bg-slate-100 border border-slate-300 rounded font-bold text-blue-900 leading-snug break-words"
              style={{
                fontSize: `${basePt + 0.5}pt`,
                wordBreak: 'keep-all',
                overflowWrap: 'break-word',
                textWrap: 'pretty'
              }}
            >
              ({calculatedThaiText})
            </div>
          </div>

          {/* Payment Mode options */}
          <div
            className="mt-2.5 print:mt-1.5 pt-1.5 border-t border-slate-200 space-y-0.5"
            style={{ fontSize: `${basePt - 0.5}pt` }}
          >
            <span className="font-bold text-slate-800 whitespace-nowrap">การชำระเงิน (Payment By):</span>
            <div className="flex flex-wrap items-center gap-3 text-slate-800 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  readOnly
                  checked={invoice.paymentMethod === 'cash'}
                  className="rounded border-slate-400"
                />
                <span>เงินสด (Cash)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  readOnly
                  checked={invoice.paymentMethod === 'cheque'}
                  className="rounded border-slate-400"
                />
                <span>เช็ค (Cheque)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
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
                style={{ fontSize: `${subTextPt}pt`, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
              >
                ธนาคาร: {invoice.chequeBank || '………………'} เช็คเลขที่: {invoice.chequeNo || '………………'} วันที่: {invoice.chequeDate || '………………'}
              </div>
            )}

            {invoice.paymentMethod === 'transfer' && (
              <div
                className="text-slate-600 mt-0.5 pl-2 border-l-2 border-green-500"
                style={{ fontSize: `${subTextPt}pt`, wordBreak: 'keep-all', overflowWrap: 'break-word' }}
              >
                เข้าบัญชี: {settings.bankName} เลขที่บัญชี: {settings.bankAccountNo}
              </div>
            )}
          </div>
        </div>

        {/* Right: Numbers breakdown using accounting table with dedicated columns to prevent collision */}
        <div className="col-span-5" style={{ fontSize: `${valuePt}pt` }}>
          <table className="w-full h-full border-collapse" style={{ fontSize: `${valuePt}pt` }}>
            <tbody>
              <tr className="border-b border-slate-300">
                <td className="py-1 px-2.5 print:py-0.5 text-left font-semibold text-slate-700 whitespace-nowrap">
                  รวมราคาสินค้า / บริการ:
                </td>
                <td className="py-1 px-2.5 print:py-0.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(invoice.subtotal)}
                </td>
              </tr>

              {/* Toggleable VAT Line based on Customer VAT registration status */}
              {!isNonVatCustomer ? (
                <tr className="border-b border-slate-300">
                  <td className="py-1 px-2.5 print:py-0.5 text-left font-semibold text-slate-700 whitespace-nowrap">
                    บวก ภาษีมูลค่าเพิ่ม {invoice.vatRate}%:
                  </td>
                  <td className="py-1 px-2.5 print:py-0.5 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                    {formatCurrency(invoice.vatAmount)}
                  </td>
                </tr>
              ) : (
                <tr
                  className="border-b border-slate-200 bg-amber-50/60 text-amber-900"
                  style={{ fontSize: `${subTextPt}pt` }}
                >
                  <td className="py-1 px-2.5 print:py-0.5 text-left font-medium italic whitespace-nowrap">
                    ภาษีมูลค่าเพิ่ม (Non-VAT Customer):
                  </td>
                  <td className="py-1 px-2.5 print:py-0.5 text-right font-semibold tabular-nums whitespace-nowrap">
                    ไม่คิดภาษี 0.00
                  </td>
                </tr>
              )}

              <tr className="border-b border-slate-300 text-slate-600">
                <td className="py-1 px-2.5 print:py-0.5 text-left whitespace-nowrap">
                  หัก ภาษีหัก ณ ที่จ่าย {invoice.withholdingTaxRate ? `${invoice.withholdingTaxRate}%` : '-'}:
                </td>
                <td className="py-1 px-2.5 print:py-0.5 text-right tabular-nums whitespace-nowrap">
                  {invoice.withholdingTaxAmount > 0 ? `-${formatCurrency(invoice.withholdingTaxAmount)}` : '-'}
                </td>
              </tr>

              <tr className="bg-slate-200/90 font-bold text-slate-900 border-t-2 border-slate-800">
                <td className="py-1.5 px-2.5 print:py-1 text-left whitespace-nowrap font-black">
                  ยอดรวมสุทธิ (Grand Total):
                </td>
                <td
                  className="py-1.5 px-2.5 print:py-1 text-right text-blue-900 font-black tabular-nums whitespace-nowrap"
                  style={{ fontSize: `${grandTotalPt}pt` }}
                >
                  {formatCurrency(calculatedGrandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Signatures & Stamp Section (Adaptive: 3 spacious columns by default, or 4 distinct cards) */}
      {settings.signatureBoxCount === '4boxes' ? (
        /* 4-Box Distinct Bordered Cards Layout (with strictly contained stamps and break-words) */
        <div className="mt-3 print:mt-1.5 pt-2 print:pt-1 border-t border-dashed border-slate-300 grid grid-cols-4 gap-2 text-center">
          {/* 1. Receiver */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/40 flex flex-col justify-between">
            <div className="w-full h-11 print:h-9 flex items-center justify-center">
              <div className="w-24 border-b border-dotted border-slate-500 h-6"></div>
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="font-bold text-slate-800 leading-tight" style={{ fontSize: `${Math.max(8.5, basePt - 2.5)}pt` }}>
                ผู้รับสินค้า / บริการ
              </p>
              <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่ ………/………/………
              </p>
            </div>
          </div>

          {/* 2. Sender / Delivery */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/40 flex flex-col justify-between">
            <div className="w-full h-11 print:h-9 flex items-center justify-center">
              {settings.showSenderSignature && settings.senderSignatureUrl ? (
                <img src={settings.senderSignatureUrl} alt="Sender Signature" className="max-h-8 max-w-full object-contain" />
              ) : (
                <div className="w-24 border-b border-dotted border-slate-500 h-6"></div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="font-bold text-slate-800 leading-tight break-words" style={{ fontSize: `${Math.max(8.5, basePt - 2.5)}pt` }}>
                {settings.senderName ? `( ${settings.senderName} )` : '( ……………………… )'}
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
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/40 flex flex-col justify-between">
            <div className="w-full h-11 print:h-9 flex items-center justify-center">
              {settings.showCollectorSignature && settings.collectorSignatureUrl ? (
                <img src={settings.collectorSignatureUrl} alt="Collector Signature" className="max-h-8 max-w-full object-contain" />
              ) : (
                <div className="w-24 border-b border-dotted border-slate-500 h-6"></div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1">
              <p className="font-bold text-slate-800 leading-tight break-words" style={{ fontSize: `${Math.max(8.5, basePt - 2.5)}pt` }}>
                {settings.collectorName ? `( ${settings.collectorName} )` : '( ……………………… )'}
              </p>
              <p className="text-slate-600 font-medium leading-tight mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
                {settings.collectorTitle || 'ผู้รับเงิน / การเงิน'}
              </p>
              <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่ ………/………/………
              </p>
            </div>
          </div>

          {/* 4. Authorized Signatory & Official Stamp */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/40 relative flex flex-col justify-between">
            <div className="relative w-full h-11 print:h-9 flex items-center justify-center">
              {showStamp && settings.showStampOnPrint && settings.stampUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                  <img
                    src={settings.stampUrl}
                    alt="Company Stamp"
                    className="w-11 h-11 print:w-9 print:h-9 object-contain opacity-80 mix-blend-multiply filter drop-shadow-xs"
                  />
                </div>
              )}
              {showSignature && settings.showAuthorizedSignature && settings.signatureUrl ? (
                <div className="h-9 print:h-8 flex items-center justify-center relative z-20 pointer-events-none select-none">
                  <img
                    src={settings.signatureUrl}
                    alt="Authorized Signature"
                    className="max-h-8 print:max-h-7 max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-24 border-b border-dotted border-slate-500 h-6 relative z-10"></div>
              )}
            </div>
            <div className="w-full border-t border-slate-300 pt-1 relative z-20">
              <p className="font-bold text-slate-900 leading-tight break-words" style={{ fontSize: `${Math.max(8.5, basePt - 2.5)}pt` }}>
                {settings.authorizedSignerName ? `( ${settings.authorizedSignerName} )` : '( ……………………… )'}
              </p>
              <p className="text-slate-800 font-semibold leading-tight mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
                {settings.authorizedSignerTitle || 'หุ้นส่วนผู้จัดการ'}
              </p>
              <p className="text-slate-500 mt-0.5" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่: {invoice.signDate ? displaySignDate : '………/………/………'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Standard 3-Column Accounting Layout (Generous 60mm column width, zero collision guaranteed) */
        <div className="mt-3.5 sm:mt-5 print:mt-2 pt-2 print:pt-1.5 border-t border-dashed border-slate-300 grid grid-cols-3 gap-6 text-center">
          {/* Column 1: ผู้รับสินค้า / บริการ (Customer / Receiver) */}
          <div className="flex flex-col justify-end items-center px-2">
            <div className="w-full h-12 print:h-10 flex items-center justify-center mb-1">
              <div className="w-36 sm:w-40 border-b border-dotted border-slate-600 h-8 print:h-6"></div>
            </div>
            <div className="w-full border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800 leading-tight whitespace-nowrap" style={{ fontSize: `${Math.max(10, basePt - 1)}pt` }}>
                ( ……………………………………………………… )
              </p>
              <p className="font-bold text-slate-800 leading-tight mt-1 whitespace-nowrap" style={{ fontSize: `${Math.max(10, basePt - 1)}pt` }}>
                ผู้รับสินค้า / บริการ
              </p>
              <p className="text-slate-500 mt-0.5 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่ ………/………/………
              </p>
            </div>
          </div>

          {/* Column 2: ผู้รับเงิน / ผู้ส่งมอบงาน (Collector / Cashier / Delivery) */}
          <div className="flex flex-col justify-end items-center px-2">
            <div className="w-full h-12 print:h-10 flex items-center justify-center mb-1">
              {settings.showCollectorSignature && settings.collectorSignatureUrl ? (
                <img src={settings.collectorSignatureUrl} alt="Collector Signature" className="max-h-10 print:max-h-8 max-w-full object-contain" />
              ) : settings.showSenderSignature && settings.senderSignatureUrl ? (
                <img src={settings.senderSignatureUrl} alt="Sender Signature" className="max-h-10 print:max-h-8 max-w-full object-contain" />
              ) : (
                <div className="w-36 sm:w-40 border-b border-dotted border-slate-600 h-8 print:h-6"></div>
              )}
            </div>
            <div className="w-full border-t border-slate-400 pt-1">
              <p className="font-bold text-slate-800 leading-tight whitespace-nowrap" style={{ fontSize: `${Math.max(10, basePt - 1)}pt` }}>
                {settings.collectorName
                  ? `( ${settings.collectorName} )`
                  : settings.senderName
                  ? `( ${settings.senderName} )`
                  : '( ……………………………………………………… )'}
              </p>
              <p className="text-slate-700 font-semibold leading-tight mt-1 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
                {settings.collectorTitle || 'ผู้รับเงิน / การเงิน'}
              </p>
              <p className="text-slate-500 mt-0.5 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่ ………/………/………
              </p>
            </div>
          </div>

          {/* Column 3: ในนาม ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค (Authorized Signatory + Official Stamp) */}
          <div className="relative flex flex-col items-center justify-end px-2">
            <div className="w-full text-center pb-0.5 text-slate-700 font-bold whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
              ในนาม {settings.name}
            </div>
            <div className="relative w-full h-12 print:h-10 flex items-center justify-center mb-1">
              {/* Authentic Company Stamp Overlay: neatly sized and centered */}
              {showStamp && settings.showStampOnPrint && settings.stampUrl && (
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10"
                  title="ตราประทับ ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค"
                >
                  <img
                    src={settings.stampUrl}
                    alt="Company Stamp"
                    className="w-14 h-14 print:w-12 print:h-12 object-contain opacity-80 mix-blend-multiply filter drop-shadow-xs"
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
                <div className="w-36 sm:w-40 border-b border-dotted border-slate-600 h-8 print:h-6 relative z-10"></div>
              )}
            </div>

            {/* Signer Information (หุ้นส่วนผู้จัดการ) - Clearly separated below line */}
            <div className="w-full border-t border-slate-400 pt-1 relative z-20">
              <p className="font-bold text-slate-900 leading-tight whitespace-nowrap" style={{ fontSize: `${Math.max(10, basePt - 1)}pt` }}>
                {settings.authorizedSignerName ? `( ${settings.authorizedSignerName} )` : '( ……………………………………………………… )'}
              </p>
              <p className="text-slate-800 font-semibold leading-tight mt-1 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
                {settings.authorizedSignerTitle || 'หุ้นส่วนผู้จัดการ'}
              </p>
              <p className="text-slate-500 mt-0.5 whitespace-nowrap" style={{ fontSize: `${subTextPt}pt` }}>
                วันที่: {invoice.signDate ? displaySignDate : '………/………/………'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Standard Terms & Notes */}
      <div
        className="mt-2.5 print:mt-1 pt-1.5 print:pt-0.5 border-t border-slate-200 flex justify-between items-center text-slate-600 gap-1.5"
        style={{ fontSize: `${subTextPt}pt` }}
      >
        <p className="text-left flex-1">
          <strong>หมายเหตุ:</strong> {invoice.notes || settings.defaultNotes || 'ได้รับสินค้าและบริการถูกต้องเรียบร้อยแล้ว ในกรณีชำระด้วยเช็คจะสมบูรณ์เมื่อธนาคารเรียกเก็บเงินเรียบร้อยแล้ว'}
        </p>
        {settings.website && (
          <p className="tabular-nums text-slate-500 shrink-0">
            Web: {settings.website} {settings.lineId ? `| LINE: ${settings.lineId}` : ''}
          </p>
        )}
      </div>
    </div>
  );
};
