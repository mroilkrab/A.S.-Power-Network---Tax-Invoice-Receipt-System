import React, { useState, useEffect } from 'react';
import { InvoiceDocument, InvoiceItem, CategoryType, PaymentMethod, CompanySettings, InvoiceStatus } from '../types/index.ts';
import { numberToThaiBaht, toThaiDateString, formatCurrency } from '../utils/bahtText.ts';
import {
  Plus,
  Trash2,
  ArrowLeft,
  Save,
  Sparkles,
  Building,
  User,
  Calendar,
  Calculator,
  X,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Check,
  RefreshCw,
  FileCheck
} from 'lucide-react';
import { AiDocumentService, ExtractedInvoiceData } from '../services/aiDocumentService.ts';
import { backupInvoiceToGoogleDrive } from '../services/googleDriveService.ts';

interface Props {
  initialData?: InvoiceDocument | null;
  settings: CompanySettings;
  onSave: (invoice: InvoiceDocument) => void;
  onCancel: () => void;
  existingCustomers: { code: string; name: string; taxId: string; address: string; phone: string; branch: string }[];
}

export const InvoiceForm: React.FC<Props> = ({
  initialData,
  settings,
  onSave,
  onCancel,
  existingCustomers
}) => {
  const isEditing = Boolean(initialData);

  // Today's date ISO
  const todayIso = new Date().toISOString().split('T')[0];

  const [documentNo, setDocumentNo] = useState(
    initialData?.documentNo || `${settings.invoicePrefix || '69'}${settings.nextNumber ? String(settings.nextNumber).padStart(4, '0') : '0013'}`
  );
  const [referenceNo, setReferenceNo] = useState(initialData?.referenceNo || '');
  const [documentDate, setDocumentDate] = useState(initialData?.documentDate || todayIso);
  const [documentDateThai, setDocumentDateThai] = useState(
    initialData?.documentDateThai || toThaiDateString(todayIso, settings.dateFormatPreference || 'buddhist')
  );

  const [customerCode, setCustomerCode] = useState(initialData?.customerCode || 'UNI - 001');
  const [customerName, setCustomerName] = useState(
    initialData?.customerName || 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)'
  );
  const [customerTaxId, setCustomerTaxId] = useState(initialData?.customerTaxId || '0105544021316');
  const [customerBranch, setCustomerBranch] = useState(initialData?.customerBranch || 'สำนักงานใหญ่');
  const [customerAddress, setCustomerAddress] = useState(
    initialData?.customerAddress ||
      'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900'
  );
  const [customerPhone, setCustomerPhone] = useState(initialData?.customerPhone || '02-02-002-8888');

  const [salesman, setSalesman] = useState(
    initialData ? (initialData.salesman ?? '') : (settings.defaultSalesman ?? 'นายอภิวัฒน์ ส.')
  );
  const [paymentDueDate, setPaymentDueDate] = useState(initialData?.paymentDueDate || todayIso);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialData?.paymentMethod || 'transfer');
  const [chequeBank, setChequeBank] = useState(initialData?.chequeBank || '');
  const [chequeNo, setChequeNo] = useState(initialData?.chequeNo || '');
  const [chequeDate, setChequeDate] = useState(initialData?.chequeDate || '');

  const [withholdingTaxRate, setWithholdingTaxRate] = useState<number>(initialData?.withholdingTaxRate || 0);
  const [status, setStatus] = useState<InvoiceStatus>(initialData?.status || 'paid');
  const [notes, setNotes] = useState(initialData?.notes || '');

  // Line items
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData?.items || [
      {
        id: 'item-new-1',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน ตุลาคม พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 11070.00,
        amount: 11070.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ]
  );

  // Update Thai date when ISO date changes according to user's era preference
  useEffect(() => {
    setDocumentDateThai(toThaiDateString(documentDate, settings.dateFormatPreference || 'buddhist'));
  }, [documentDate, settings.dateFormatPreference]);

  // Recalculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const vatRate = 7;
  const vatAmount = Math.round((subtotal * vatRate / 100) * 100) / 100;
  const withholdingTaxAmount = withholdingTaxRate > 0 ? Math.round((subtotal * withholdingTaxRate / 100) * 100) / 100 : 0;
  const grandTotal = Math.round((subtotal + vatAmount - withholdingTaxAmount) * 100) / 100;
  const totalThaiText = numberToThaiBaht(grandTotal);

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
      item.amount = Math.round(q * p * 100) / 100;
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    const nextItemNo = items.length + 1;
    setItems([
      ...items,
      {
        id: 'item-' + Date.now(),
        itemNo: nextItemNo,
        description: '',
        unit: 'รายการ',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        category: 'งานบริการระบบเครือข่ายและไอที'
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    const updated = items.filter((_, i) => i !== index).map((item, idx) => ({ ...item, itemNo: idx + 1 }));
    setItems(updated);
  };

  const handleSelectCustomer = (cust: any) => {
    setCustomerCode(cust.code);
    setCustomerName(cust.name);
    setCustomerTaxId(cust.taxId);
    setCustomerAddress(cust.address);
    setCustomerPhone(cust.phone);
    setCustomerBranch(cust.branch || 'สำนักงานใหญ่');
  };

  // ========================================================
  // AI Document Analysis & Auto-Mapping State
  // ========================================================
  const [showAiModal, setShowAiModal] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<'upload' | 'text'>('upload');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [aiSuccessToast, setAiSuccessToast] = useState<string | null>(null);

  const sampleTemplates = [
    {
      label: 'ตัวอย่างใบสั่งซื้อ (PO) บจก. อาร์เอส คอนเน็ค',
      text: `ใบสั่งซื้อ / PURCHASE ORDER (PO)
เลขที่ใบสั่งซื้อ: PO-2026-1049
วันที่เอกสาร: 2026-11-04
ชื่อลูกค้า: บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)
รหัสลูกค้า: UNI - 001
เลขประจำตัวผู้เสียภาษี: 0105544021316 สาขา: 00000 (สำนักงานใหญ่)
ที่อยู่: เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900
เบอร์โทร: 02-02-002-8888
พนักงานผู้ติดต่อ: นายอภิวัฒน์ สาระสิทธิ์
กำหนดชำระเงิน: 2026-11-30 ชำระโดย: โอนเงินผ่านธนาคาร

รายการสินค้า / บริการ:
1. ค่าบริการดูแลระบบคอมพิวเตอร์และเซิร์ฟเวอร์ ประจำเดือนพฤศจิกายน 2569 จำนวน 1 งาน หน่วยละ 25,000.00 บาท ยอด 25,000.00 บาท
2. อุปกรณ์ Router Wi-Fi 6 Enterprise รองรับ 100+ ผู้ใช้ จำนวน 2 ชุด หน่วยละ 4,500.00 บาท ยอด 9,000.00 บาท
หมายเหตุ: โครงการปรับปรุงระบบเน็ตเวิร์คสำนักงานใหญ่ หักภาษี ณ ที่จ่าย 3%`
    },
    {
      label: 'ตัวอย่างสรุปค่าคอมมิชชั่นและการตลาด',
      text: `ใบสรุปยอดค่าคอมมิชชั่น / การตลาด
เลขที่อ้างอิง: COMM-2026-10
วันที่: 2026-11-01
ลูกค้า: บริษัท อาร์เอส คอนเน็ค จำกัด
เลขประจำตัวผู้เสียภาษี: 0105544021316 สาขา สำนักงานใหญ่
ที่อยู่: 27 อาคารเชษฐโชติ ทาวเวอร์ เอ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ
โทร: 02-02-002-8888
พนักงานขาย: นายอภิวัฒน์ สาระสิทธิ์
ครบกำหนดชำระ: 2026-11-15

รายการ:
1. ค่าคอมมิชชั่น เดือน ตุลาคม พ.ศ. 2569 จำนวน 1 เดือน ราคา 35,562.22 บาท
หมายเหตุ: ชำระโดยโอนเงิน หักภาษี ณ ที่จ่าย 3%`
    }
  ];

  const handleProcessFile = async (file: File) => {
    setIsAnalyzing(true);
    setAiError(null);
    setExtractedData(null);
    setUploadedFileName(file.name);

    try {
      const data = await AiDocumentService.analyzeDocument(file);
      setExtractedData(data);
    } catch (err: any) {
      console.error('Error analyzing document:', err);
      setAiError(err.message || 'ไม่สามารถวิเคราะห์เอกสารได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessPastedText = async () => {
    if (!pastedText.trim()) {
      setAiError('กรุณากรอกหรือวางข้อความเอกสารที่ต้องการวิเคราะห์');
      return;
    }
    setIsAnalyzing(true);
    setAiError(null);
    setExtractedData(null);

    try {
      const data = await AiDocumentService.analyzeRawText(pastedText, 'ข้อความที่วาง');
      setExtractedData(data);
    } catch (err: any) {
      console.error('Error analyzing text:', err);
      setAiError(err.message || 'ไม่สามารถวิเคราะห์ข้อความได้');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAiData = (data: ExtractedInvoiceData) => {
    if (data.customerName) setCustomerName(data.customerName);
    if (data.customerTaxId) setCustomerTaxId(data.customerTaxId);
    if (data.customerBranch) setCustomerBranch(data.customerBranch);
    if (data.customerAddress) setCustomerAddress(data.customerAddress);
    if (data.customerPhone) setCustomerPhone(data.customerPhone);
    if (data.customerCode) setCustomerCode(data.customerCode);
    if (data.documentDate) {
      setDocumentDate(data.documentDate);
      setDocumentDateThai(toThaiDateString(data.documentDate, settings.dateFormatPreference || 'buddhist'));
    }
    if (data.referenceNo) setReferenceNo(data.referenceNo);
    if (data.salesman) setSalesman(data.salesman);
    if (data.paymentDueDate) setPaymentDueDate(data.paymentDueDate);
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
    if (data.notes) setNotes(data.notes);

    if (data.items && data.items.length > 0) {
      setItems(
        data.items.map((it, idx) => ({
          id: 'item-ai-' + Date.now() + '-' + idx,
          itemNo: idx + 1,
          description: it.description || '',
          quantity: it.quantity || 1,
          unit: it.unit || 'รายการ',
          unitPrice: it.unitPrice || 0,
          amount: it.amount || ((it.quantity || 1) * (it.unitPrice || 0)),
          category: (it.category as any) || 'ค่าคอมมิชชั่นและการตลาด'
        }))
      );
    }

    setShowAiModal(false);
    setAiSuccessToast(`จับคู่ข้อมูลเข้าแบบฟอร์มอัตโนมัติเรียบร้อย: ${data.customerName || 'ลูกค้า'}`);
    setTimeout(() => setAiSuccessToast(null), 6000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentNo.trim()) {
      alert('กรุณากรอกเลขที่เอกสาร');
      return;
    }
    if (!customerName.trim()) {
      alert('กรุณากรอกชื่อลูกค้า');
      return;
    }

    const primaryCategory = items[0]?.category || 'ค่าคอมมิชชั่นและการตลาด';

    const invoice: InvoiceDocument = {
      id: initialData?.id || 'inv-' + Date.now(),
      documentNo,
      referenceNo,
      documentDate,
      documentDateThai,
      customerCode,
      customerName,
      customerTaxId,
      customerBranch,
      customerAddress,
      customerPhone,
      salesman,
      paymentDueDate,
      items,
      subtotal,
      vatRate,
      vatAmount,
      withholdingTaxRate,
      withholdingTaxAmount,
      grandTotal,
      totalThaiText,
      paymentMethod,
      chequeBank,
      chequeNo,
      chequeDate,
      status,
      notes,
      categoryPrimary: primaryCategory,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncedToCloud: true
    };

    onSave(invoice);

    // Auto-backup to Google Drive if enabled
    if (settings.autoBackupToGoogleDrive) {
      backupInvoiceToGoogleDrive(invoice, settings).catch(err => {
        console.warn('Auto backup to Google Drive:', err);
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? `แก้ไขเอกสาร ${documentNo}` : 'ออกใบเสร็จรับเงิน / ใบกำกับภาษีใหม่'}
            </h2>
            <p className="text-xs text-slate-500">
              ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค (สำนักงานใหญ่)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setAiError(null);
              setShowAiModal(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-500/20 cursor-pointer transition-all"
            title="นำเข้าไฟล์ Word, PDF, รูปภาพ หรือข้อความเพื่อกรอกข้อมูลลงฟอร์มอัตโนมัติด้วย AI"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI นำเข้าเอกสาร (Auto-Map)</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            บันทึกเอกสาร
          </button>
        </div>
      </div>

      {/* AI Success Notification Toast */}
      {aiSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium animate-in fade-in shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiSuccessToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setAiSuccessToast(null)}
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Customer Presets if available */}
      {existingCustomers.length > 0 && (
        <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-xl text-xs">
          <span className="font-semibold text-blue-900 block mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            เลือกลูกค้าที่เคยออกเอกสารแล้ว (Auto-fill):
          </span>
          <div className="flex flex-wrap gap-2">
            {existingCustomers.map((cust, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectCustomer(cust)}
                className="px-2.5 py-1.5 bg-white hover:bg-blue-100 border border-blue-300 rounded-lg text-slate-800 font-medium transition-colors cursor-pointer"
              >
                {cust.code}: {cust.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Document Meta Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
          ข้อมูลเลขที่และวันที่เอกสาร
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลขที่เอกสาร <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={documentNo}
              onChange={e => setDocumentNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วันที่เอกสาร (ค.ศ.)
            </label>
            <input
              type="date"
              required
              value={documentDate}
              onChange={e => setDocumentDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วันที่แสดงในเอกสาร (พ.ศ.)
            </label>
            <input
              type="text"
              value={documentDateThai}
              onChange={e => setDocumentDateThai(e.target.value)}
              className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลขที่ใบกำกับ (Reference No.)
            </label>
            <input
              type="text"
              placeholder="เช่น QT-69001 หรือเว้นว่าง"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Salesman Field (ลบ แก้ไข อัปเดตข้อมูลได้ และฟอนต์ทางการสวยงาม) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                พนักงานขาย / ผู้ประสานงาน (Salesman)
              </label>
              {salesman && (
                <button
                  type="button"
                  onClick={() => setSalesman('')}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer flex items-center gap-1 transition-colors"
                  title="ลบข้อมูลพนักงานขาย"
                >
                  <X className="w-3 h-3" />
                  <span>ลบข้อมูล</span>
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="ระบุชื่อพนักงานขาย หรือเว้นว่างหากไม่ต้องการระบุ"
                value={salesman}
                onChange={e => setSalesman(e.target.value)}
                className="w-full pl-9 pr-9 py-2 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs transition-all"
              />
              {salesman && (
                <button
                  type="button"
                  onClick={() => setSalesman('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-rose-600 cursor-pointer"
                  title="ล้างข้อความ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick choices / suggestions for Salesman */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
              <span className="text-slate-400">เลือกด่วน:</span>
              <button
                type="button"
                onClick={() => setSalesman('นายอภิวัฒน์ ส.')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded border border-slate-200 transition-colors cursor-pointer"
              >
                นายอภิวัฒน์ ส.
              </button>
              <button
                type="button"
                onClick={() => setSalesman('ฝ่ายขายและการตลาด')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded border border-slate-200 transition-colors cursor-pointer"
              >
                ฝ่ายขายและการตลาด
              </button>
              <button
                type="button"
                onClick={() => setSalesman('เจ้าหน้าที่บริการระบบ')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded border border-slate-200 transition-colors cursor-pointer"
              >
                เจ้าหน้าที่บริการระบบ
              </button>
              <button
                type="button"
                onClick={() => setSalesman('')}
                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 transition-colors cursor-pointer"
              >
                เว้นว่าง (-)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              วันครบกำหนดชำระเงิน
            </label>
            <input
              type="date"
              value={paymentDueDate}
              onChange={e => setPaymentDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
          ข้อมูลลูกค้า / ผู้ซื้อสินค้าหรือบริการ
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">รหัสลูกค้า</label>
            <input
              type="text"
              value={customerCode}
              onChange={e => setCustomerCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อลูกค้า / บริษัท <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เลขประจำตัวผู้เสียภาษีอากร 13 หลัก
            </label>
            <input
              type="text"
              maxLength={13}
              value={customerTaxId}
              onChange={e => setCustomerTaxId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-semibold tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">สาขา</label>
            <input
              type="text"
              value={customerBranch}
              onChange={e => setCustomerBranch(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 mb-1">ที่อยู่</label>
            <textarea
              rows={2}
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
            <input
              type="text"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Invoice Items Table Editor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <h3 className="font-bold text-slate-900 text-sm">
            รายการสินค้าและบริการ (Items)
          </h3>
          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            + เพิ่มแถวรายการ
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
            >
              <div className="sm:col-span-1 text-center font-bold text-slate-500 text-xs">
                #{idx + 1}
              </div>

              <div className="sm:col-span-5">
                <input
                  type="text"
                  required
                  placeholder="รายละเอียดรายการสินค้า/บริการ"
                  value={item.description}
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={item.category}
                  onChange={e => handleItemChange(idx, 'category', e.target.value as CategoryType)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-[11px] font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ค่าคอมมิชชั่นและการตลาด">ค่าคอมมิชชั่น</option>
                  <option value="งานบริการระบบเครือข่ายและไอที">งานระบบไอที/เน็ตเวิร์ค</option>
                  <option value="ค่าบริการบำรุงรักษา">บำรุงรักษา</option>
                  <option value="จำหน่ายอุปกรณ์และฮาร์ดแวร์">อุปกรณ์/ฮาร์ดแวร์</option>
                  <option value="ค่าที่ปรึกษาและพัฒนาระบบ">พัฒนาระบบ/ที่ปรึกษา</option>
                </select>
              </div>

              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="หน่วย"
                  value={item.unit}
                  onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-1">
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="จำนวน"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-1">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="ราคา"
                  value={item.unitPrice}
                  onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-right text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="sm:col-span-1 flex items-center justify-between sm:justify-end gap-2">
                <span className="font-mono font-bold text-xs text-slate-900">
                  ฿{formatCurrency(item.amount)}
                </span>
                <button
                  type="button"
                  disabled={items.length <= 1}
                  onClick={() => handleRemoveItem(idx)}
                  className="text-rose-500 hover:text-rose-700 disabled:opacity-30 p-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculations & Payment terms */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment mode */}
        <div className="lg:col-span-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-200 pb-2">
            วิธีการชำระเงินและสถานะ
          </h3>

          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                />
                <span>โอนเงินผ่านธนาคาร</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cheque"
                  checked={paymentMethod === 'cheque'}
                  onChange={() => setPaymentMethod('cheque')}
                />
                <span>เช็คธนาคาร</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span>เงินสด</span>
              </label>
            </div>

            {paymentMethod === 'cheque' && (
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-500">ธนาคาร</label>
                  <input
                    type="text"
                    value={chequeBank}
                    onChange={e => setChequeBank(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500">เลขที่เช็ค</label>
                  <input
                    type="text"
                    value={chequeNo}
                    onChange={e => setChequeNo(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500">ลงวันที่</label>
                  <input
                    type="date"
                    value={chequeDate}
                    onChange={e => setChequeDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-50 border rounded text-xs"
                  />
                </div>
              </div>
            )}

            <div className="pt-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">สถานะเอกสาร</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
              >
                <option value="paid">ชำระแล้ว (Paid / ได้รับเงินแล้ว)</option>
                <option value="pending">รอชำระ (Pending)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติม</label>
              <textarea
                rows={2}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="ระบุข้อความหรือบันทึกภายในเพิ่มเติม..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Calculation Summary Box */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-slate-400">รวมราคาสินค้า / บริการ:</span>
              <span className="font-mono text-base font-bold">฿{formatCurrency(subtotal)}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <span className="text-slate-400">บวก ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
              <span className="font-mono text-base font-bold text-indigo-300">฿{formatCurrency(vatAmount)}</span>
            </div>

            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">หัก ภาษี ณ ที่จ่าย:</span>
                <select
                  value={withholdingTaxRate}
                  onChange={e => setWithholdingTaxRate(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-600 rounded px-1.5 py-0.5 text-xs text-amber-300"
                >
                  <option value={0}>0% (ไม่หัก)</option>
                  <option value={1}>1% (ค่าขนส่ง)</option>
                  <option value={3}>3% (ค่าบริการ/คอมมิชชั่น)</option>
                  <option value={5}>5% (ค่าเช่า)</option>
                </select>
              </div>
              <span className="font-mono text-base text-amber-300">
                {withholdingTaxAmount > 0 ? `-฿${formatCurrency(withholdingTaxAmount)}` : '฿0.00'}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-base font-bold text-white">ยอดรวมสุทธิ (Grand Total):</span>
              <span className="font-mono text-2xl font-black text-emerald-400">
                ฿{formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 text-xs">
            <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">ตัวอักษรภาษาไทย (Baht Text):</span>
            <p className="font-semibold text-emerald-300">({totalThaiText})</p>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* AI Document Auto-Map Modal                                */}
      {/* ========================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between border-b border-indigo-900/40">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-indigo-600/30 border border-indigo-400/40 rounded-xl text-indigo-300 shrink-0">
                  <Sparkles className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      AI วิเคราะห์และนำเข้าเอกสารอัตโนมัติ (Document Auto-Map)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
                      Gemini 3.8 Flash
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    อัปโหลดไฟล์ Word (.docx), PDF, รูปภาพเอกสาร หรือวางข้อความ AI จะวิเคราะห์และจับคู่ข้อมูลชื่อลูกค้า เลขผู้เสียภาษี ที่อยู่ วันที่ พนักงานขาย และรายการสินค้าลงแบบฟอร์มทันที
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isAnalyzing) setShowAiModal(false);
                }}
                disabled={isAnalyzing}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
              {/* Tabs Switcher */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('upload');
                    setAiError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeAiTab === 'upload'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <UploadCloud className="w-4 h-4" />
                  อัปโหลดไฟล์ (Word / PDF / รูปภาพ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAiTab('text');
                    setAiError(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    activeAiTab === 'text'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  วางข้อความ / รายละเอียดเอกสาร
                </button>
              </div>

              {/* Error Message if any */}
              {aiError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">เกิดข้อผิดพลาดในการวิเคราะห์:</span>
                    <span className="text-rose-700">{aiError}</span>
                  </div>
                </div>
              )}

              {/* Loading State Spinner */}
              {isAnalyzing && (
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-3 bg-indigo-50/60 rounded-2xl border border-indigo-200/60">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      กำลังใช้ AI วิเคราะห์ข้อมูลเอกสารและจับคู่ฟิลด์...
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-1 max-w-md">
                      ระบบกำลังสกัดชื่อลูกค้า, เลขประจำตัวผู้เสียภาษี 13 หลัก, สาขา, ที่อยู่, วันที่, พนักงานขาย และรายการสินค้า
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 1: File Upload */}
              {!isAnalyzing && activeAiTab === 'upload' && !extractedData && (
                <div className="space-y-4">
                  <label className="border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/70 transition-all rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer text-center group">
                    <input
                      type="file"
                      accept=".docx,.pdf,.png,.jpg,.jpeg,.webp,.txt,.csv"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessFile(file);
                      }}
                    />
                    <div className="p-4 bg-indigo-100 group-hover:bg-indigo-200 text-indigo-700 rounded-2xl mb-3 transition-colors shadow-xs">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 mb-1">
                      คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
                    </span>
                    <span className="text-xs text-slate-500 max-w-sm mb-3">
                      รองรับไฟล์เอกสาร Word (.docx), PDF, รูปภาพใบเสร็จ/ใบกำกับภาษี (PNG, JPG, WebP), และไฟล์ข้อความ
                    </span>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10.5px] font-mono text-slate-600 shadow-2xs">
                        MS Word (.docx)
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10.5px] font-mono text-slate-600 shadow-2xs">
                        Adobe PDF (.pdf)
                      </span>
                      <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md text-[10.5px] font-mono text-slate-600 shadow-2xs">
                        ภาพถ่ายเอกสาร (PNG / JPG)
                      </span>
                    </div>
                  </label>

                  {/* Or Quick Try Sample Data */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-700 block mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      หรือทดลองด้วยตัวอย่างข้อมูลจริง (1-Click Test):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {sampleTemplates.map((sample, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setActiveAiTab('text');
                            setPastedText(sample.text);
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-400 rounded-lg text-slate-700 font-medium transition-colors cursor-pointer text-left"
                        >
                          📄 {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Paste Text */}
              {!isAnalyzing && activeAiTab === 'text' && !extractedData && (
                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      วางข้อความจากใบเสนอราคา, ใบสั่งซื้อ (PO), แชท หรืออีเมล:
                    </label>
                    <textarea
                      rows={8}
                      value={pastedText}
                      onChange={e => setPastedText(e.target.value)}
                      placeholder="วางข้อความที่นี่ เช่น:&#10;ลูกค้า: บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)&#10;เลขประจำตัวผู้เสียภาษี: 0105544021316&#10;ที่อยู่: เลขที่ 27 อาคาร เชษฐโชติ...&#10;รายการ: ค่าคอมมิชชั่น เดือน ตุลาคม จำนวน 1 เดือน ราคา 35,562.22 บาท..."
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                  </div>

                  {/* Quick Sample Selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 text-[11px] font-semibold">ใส่ตัวอย่างทดสอบ:</span>
                    {sampleTemplates.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setPastedText(sample.text)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-100 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleProcessPastedText}
                      disabled={!pastedText.trim()}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                        pastedText.trim()
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 active:scale-95'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      วิเคราะห์ข้อความด้วย AI
                    </button>
                  </div>
                </div>
              )}

              {/* EXTRACTED PREVIEW RESULTS (When data extracted successfully) */}
              {!isAnalyzing && extractedData && (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                        <Check className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-emerald-900">
                          วิเคราะห์ข้อมูลเอกสารสำเร็จ! ตรวจสอบผลลัพธ์ก่อนจับคู่ลงแบบฟอร์ม
                        </h4>
                        <p className="text-[11px] text-emerald-700">
                          {uploadedFileName ? `แหล่งข้อมูล: ${uploadedFileName}` : 'แหล่งข้อมูล: ข้อความที่ระบุ'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExtractedData(null);
                        setUploadedFileName(null);
                      }}
                      className="text-xs text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
                    >
                      วิเคราะห์ใหม่
                    </button>
                  </div>

                  {/* Customer Information Preview */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-blue-600" />
                      ข้อมูลลูกค้าที่ตรวจพบ (Customer Fields)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">ชื่อลูกค้า:</span>
                        <span className="font-bold text-slate-900">{extractedData.customerName || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">เลขประจำตัวผู้เสียภาษี:</span>
                        <span className="font-mono font-bold text-blue-900">{extractedData.customerTaxId || '-'}</span>
                        {extractedData.customerBranch && (
                          <span className="text-slate-500 ml-2">({extractedData.customerBranch})</span>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block text-[10.5px]">ที่อยู่ลูกค้า:</span>
                        <span className="text-slate-800">{extractedData.customerAddress || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">เบอร์โทรศัพท์:</span>
                        <span className="font-mono text-slate-800">{extractedData.customerPhone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">รหัสลูกค้า:</span>
                        <span className="font-mono font-semibold text-slate-700">{extractedData.customerCode || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Document Meta Preview */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                    <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      ข้อมูลวันที่และเงื่อนไข (Document Meta)
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">วันที่เอกสาร:</span>
                        <span className="font-medium text-slate-900">{extractedData.documentDate || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">พนักงานขาย / ผู้ประสานงาน:</span>
                        <span className="font-medium text-slate-900">{extractedData.salesman || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10.5px]">กำหนดชำระเงิน:</span>
                        <span className="font-medium text-slate-900">{extractedData.paymentDueDate || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Preview Table */}
                  {extractedData.items && extractedData.items.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
                      <h5 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          รายการสินค้า / บริการที่ตรวจพบ ({extractedData.items.length} รายการ)
                        </span>
                      </h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                              <th className="py-2 px-2.5 font-bold">#</th>
                              <th className="py-2 px-2.5 font-bold">รายการ (Description)</th>
                              <th className="py-2 px-2.5 font-bold text-center">จำนวน</th>
                              <th className="py-2 px-2.5 font-bold text-center">หน่วย</th>
                              <th className="py-2 px-2.5 font-bold text-right">ราคา/หน่วย</th>
                              <th className="py-2 px-2.5 font-bold text-right">จำนวนเงิน</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono">
                            {extractedData.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-2.5 text-slate-400">{idx + 1}</td>
                                <td className="py-2 px-2.5 font-sans font-medium text-slate-900">{it.description}</td>
                                <td className="py-2 px-2.5 text-center text-slate-700">{it.quantity}</td>
                                <td className="py-2 px-2.5 text-center text-slate-600 font-sans">{it.unit || 'รายการ'}</td>
                                <td className="py-2 px-2.5 text-right text-slate-800">฿{formatCurrency(it.unitPrice)}</td>
                                <td className="py-2 px-2.5 text-right font-bold text-blue-900">
                                  ฿{formatCurrency(it.amount ?? (it.quantity * it.unitPrice))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Modal Footer Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExtractedData(null)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAiData(extractedData)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      นำข้อมูลเข้าสู่แบบฟอร์ม (Auto-Map to Form)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
