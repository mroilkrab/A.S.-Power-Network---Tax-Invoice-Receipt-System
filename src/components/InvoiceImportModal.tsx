import React, { useState, useRef } from 'react';
import { InvoiceDocument, InvoiceItem, CategoryType } from '../types/index.ts';
import { WordParserService, ExtractedInvoiceDraft } from '../services/wordParserService.ts';
import { StorageService } from '../services/storageService.ts';
import { CloudflareD1Service } from '../services/cloudflareD1Service.ts';
import { formatCurrency, formatThaiDateWithTime, numberToBahtText } from '../utils/bahtText.ts';
import {
  FileText,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  FileCode,
  Database,
  Cloud,
  Layers,
  ArrowRight,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Building,
  RefreshCw,
  Sparkles,
  Download
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number, message: string) => void;
  existingInvoicesCount: number;
}

export const InvoiceImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingInvoicesCount
}) => {
  const [activeTab, setActiveTab] = useState<'word' | 'backup'>('word');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State for single/batch extracted Word draft
  const [extractedDraft, setExtractedDraft] = useState<ExtractedInvoiceDraft | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  
  // Cloudflare D1 sync state
  const [syncToD1, setSyncToD1] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle MS Word file upload
  const handleWordFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setUploadedFileName(file.name);
      const draft = await WordParserService.parseDocxFile(file);
      setExtractedDraft(draft);
    } catch (err: any) {
      console.error('Word file parse error:', err);
      setErrorMessage(
        'ไม่สามารถอ่านไฟล์ MS Word ได้: โปรดแน่ใจว่าเป็นไฟล์ .docx ที่สมบูรณ์ หรือลองแปลงไฟล์เป็น .docx มาตรฐาน'
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Recalculate draft totals when items change
  const updateDraftItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!extractedDraft) return;

    const newItems = [...extractedDraft.items];
    const item = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : item.quantity;
      const p = field === 'unitPrice' ? Number(value) : item.unitPrice;
      item.amount = q * p;
    }

    newItems[index] = item;
    const subtotal = newItems.reduce((sum, it) => sum + it.amount, 0);
    const vatAmount = Math.round(subtotal * (extractedDraft.vatRate / 100) * 100) / 100;
    const grandTotal = subtotal + vatAmount - (extractedDraft.withholdingTaxAmount || 0);

    setExtractedDraft({
      ...extractedDraft,
      items: newItems,
      subtotal,
      vatAmount,
      grandTotal,
      totalThaiText: numberToBahtText(grandTotal)
    });
  };

  const addItemToDraft = () => {
    if (!extractedDraft) return;
    const newItem: InvoiceItem = {
      id: 'item-' + (extractedDraft.items.length + 1),
      itemNo: extractedDraft.items.length + 1,
      description: 'รายการบริการเพิ่มเติม',
      quantity: 1,
      unit: 'งาน',
      unitPrice: 1000,
      amount: 1000,
      category: extractedDraft.categoryPrimary
    };

    const newItems = [...extractedDraft.items, newItem];
    const subtotal = newItems.reduce((sum, it) => sum + it.amount, 0);
    const vatAmount = Math.round(subtotal * (extractedDraft.vatRate / 100) * 100) / 100;
    const grandTotal = subtotal + vatAmount - (extractedDraft.withholdingTaxAmount || 0);

    setExtractedDraft({
      ...extractedDraft,
      items: newItems,
      subtotal,
      vatAmount,
      grandTotal,
      totalThaiText: numberToBahtText(grandTotal)
    });
  };

  const removeItemFromDraft = (index: number) => {
    if (!extractedDraft || extractedDraft.items.length <= 1) return;
    const newItems = extractedDraft.items.filter((_, i) => i !== index);
    const subtotal = newItems.reduce((sum, it) => sum + it.amount, 0);
    const vatAmount = Math.round(subtotal * (extractedDraft.vatRate / 100) * 100) / 100;
    const grandTotal = subtotal + vatAmount - (extractedDraft.withholdingTaxAmount || 0);

    setExtractedDraft({
      ...extractedDraft,
      items: newItems,
      subtotal,
      vatAmount,
      grandTotal,
      totalThaiText: numberToBahtText(grandTotal)
    });
  };

  // Confirm and Save Imported Invoice
  const handleConfirmImport = async () => {
    if (!extractedDraft) return;

    setIsProcessing(true);
    try {
      const invoiceDoc = WordParserService.draftToInvoiceDocument(extractedDraft);
      const res = await StorageService.importDocumentsWithCloudflareD1Sync(
        [invoiceDoc],
        `MS Word (${uploadedFileName})`
      );

      if (res.success) {
        onImportSuccess(1, `นำเข้าเอกสารเลขที่ ${invoiceDoc.documentNo} จากไฟล์ Word สำเร็จ และจัดเก็บเข้า Cloudflare D1 เรียบร้อย`);
        onClose();
      } else {
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage('เกิดข้อผิดพลาดในการบันทึกเอกสาร: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle JSON Backup / Previously issued files upload
  const handleBackupFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const text = await file.text();
      // Try JSON first
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (parsed.invoices && Array.isArray(parsed.invoices)) {
          const res = await StorageService.importDocumentsWithCloudflareD1Sync(
            parsed.invoices,
            `ไฟล์สำรอง (${file.name})`
          );
          onImportSuccess(
            parsed.invoices.length,
            `นำเข้าเอกสารที่เคยออกไว้ ${parsed.invoices.length} ฉบับ และซิงค์ Cloudflare D1 สำเร็จ`
          );
          onClose();
          return;
        }
      }
      setErrorMessage('ไฟล์ไม่ตรงกับโครงสร้างข้อมูลเอกสารที่ถูกต้อง');
    } catch (err: any) {
      setErrorMessage('ไม่สามารถอ่านไฟล์ได้: ' + err.message);
    } finally {
      setIsProcessing(false);
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  // Download Cloudflare D1 SQL Schema & Data
  const handleExportD1Sql = () => {
    const invoices = StorageService.getInvoices();
    const settings = StorageService.getSettings();
    CloudflareD1Service.downloadD1SqlFile(invoices, settings);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/40 border border-blue-400/40 rounded-xl text-blue-300">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold">
                  นำเข้าเอกสารใบเสร็จ / แปลงไฟล์ Word & เก็บเข้า Cloudflare D1
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Cloudflare D1 Ready
                </span>
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                รองรับไฟล์ Microsoft Word (.docx), ไฟล์สำรองเอกสารเดิม และแปลงเข้าสู่ระบบอัตโนมัติ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setActiveTab('word'); setErrorMessage(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'word'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-blue-600" />
              แปลงไฟล์ Microsoft Word (.docx)
            </button>
            <button
              onClick={() => { setActiveTab('backup'); setErrorMessage(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'backup'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-600" />
              นำเข้าประวัติเอกสารเดิม / ไฟล์สำรอง
            </button>
          </div>

          <button
            onClick={handleExportD1Sql}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            title="ดาวน์โหลดสคริปต์ SQL สำหรับนำไปรันบน Cloudflare D1 Console หรือ Wrangler CLI"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            ดาวน์โหลด Cloudflare D1 SQL (.sql)
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'word' && (
            <>
              {!extractedDraft ? (
                /* Upload Dropzone */
                <div className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 rounded-2xl p-8 text-center transition-all">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">
                    เลือกไฟล์เอกสาร Microsoft Word (.docx)
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
                    ระบบจะอ่านข้อความและตารางในไฟล์ Word อัตโนมัติ สกัดเลขที่เอกสาร, ชื่อลูกค้า, วันที่, รายการบริการ, ภาษี 7% และแปลงให้เข้ากับแบบฟอร์มของระบบ A.S. Power Network พร้อมจัดเก็บลง Cloudflare D1 ทันที
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".docx,.doc"
                    onChange={handleWordFileUpload}
                    className="hidden"
                    id="word-file-input"
                  />

                  <div className="flex items-center justify-center gap-3">
                    <label
                      htmlFor="word-file-input"
                      className={`inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer transition-all ${
                        isProcessing ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          กำลังอ่านและแปลงโครงสร้างข้อมูล...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          เลือกไฟล์ .docx จากคอมพิวเตอร์
                        </>
                      )}
                    </label>
                  </div>

                  {/* Cloudflare D1 feature hint */}
                  <div className="mt-6 pt-5 border-t border-blue-200/60 max-w-lg mx-auto flex items-center justify-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" /> ซิงค์ Cloudflare D1 อัตโนมัติ
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                      <Sparkles className="w-3.5 h-3.5" /> รองรับตารางใน Word
                    </span>
                    <span>•</span>
                    <span>คำนวณภาษี 7% อัตโนมัติ</span>
                  </div>
                </div>
              ) : (
                /* Extracted Review and Edit Form */
                <div className="space-y-5 animate-in fade-in">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="font-bold">
                          อ่านไฟล์ Word "{uploadedFileName}" สำเร็จ!
                        </p>
                        <p className="text-emerald-700 text-[11px]">
                          โปรดตรวจสอบความถูกต้องของข้อมูลที่สกัดได้ด้านล่าง ก่อนบันทึกเข้าสู่ระบบและ Cloudflare D1
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExtractedDraft(null)}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100 rounded-lg font-semibold shrink-0 cursor-pointer text-[11px]"
                    >
                      เลือกไฟล์ใหม่
                    </button>
                  </div>

                  {/* Document Meta Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        เลขที่เอกสาร
                      </label>
                      <input
                        type="text"
                        value={extractedDraft.documentNo}
                        onChange={e => setExtractedDraft({ ...extractedDraft, documentNo: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        วันที่เอกสาร (พ.ศ.)
                      </label>
                      <input
                        type="text"
                        value={extractedDraft.documentDateThai}
                        onChange={e => setExtractedDraft({ ...extractedDraft, documentDateThai: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        หมวดหมู่งาน
                      </label>
                      <select
                        value={extractedDraft.categoryPrimary}
                        onChange={e => setExtractedDraft({ ...extractedDraft, categoryPrimary: e.target.value as CategoryType })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="งานบริการระบบเครือข่ายและไอที">งานบริการระบบเครือข่ายและไอที</option>
                        <option value="ค่าคอมมิชชั่นและการตลาด">ค่าคอมมิชชั่นและการตลาด</option>
                        <option value="ค่าบริการบำรุงรักษา">ค่าบริการบำรุงรักษา</option>
                        <option value="จำหน่ายอุปกรณ์และฮาร์ดแวร์">จำหน่ายอุปกรณ์และฮาร์ดแวร์</option>
                        <option value="ค่าที่ปรึกษาและพัฒนาระบบ">ค่าที่ปรึกษาและพัฒนาระบบ</option>
                      </select>
                    </div>
                  </div>

                  {/* Customer Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Building className="w-4 h-4 text-blue-600" />
                      ข้อมูลลูกค้าที่สกัดได้
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">ชื่อผู้ซื้อ / ลูกค้า</label>
                        <input
                          type="text"
                          value={extractedDraft.customerName}
                          onChange={e => setExtractedDraft({ ...extractedDraft, customerName: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
                        <input
                          type="text"
                          value={extractedDraft.customerTaxId}
                          onChange={e => setExtractedDraft({ ...extractedDraft, customerTaxId: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-500 font-medium mb-1">สาขา</label>
                        <input
                          type="text"
                          value={extractedDraft.customerBranch}
                          onChange={e => setExtractedDraft({ ...extractedDraft, customerBranch: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-500 font-medium mb-1">ที่อยู่</label>
                        <input
                          type="text"
                          value={extractedDraft.customerAddress}
                          onChange={e => setExtractedDraft({ ...extractedDraft, customerAddress: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2.5 flex items-center justify-between border-b border-slate-200">
                      <span className="font-bold text-xs text-slate-800">
                        รายการสินค้า / บริการที่สกัดจาก Word ({extractedDraft.items.length} รายการ)
                      </span>
                      <button
                        type="button"
                        onClick={addItemToDraft}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        เพิ่มแถว
                      </button>
                    </div>

                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        <tr>
                          <th className="py-2 px-3 text-left w-10">ลำดับ</th>
                          <th className="py-2 px-3 text-left">รายการบริการ</th>
                          <th className="py-2 px-3 text-center w-20">จำนวน</th>
                          <th className="py-2 px-3 text-right w-28">ราคาต่อหน่วย</th>
                          <th className="py-2 px-3 text-right w-28">จำนวนเงิน</th>
                          <th className="py-2 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {extractedDraft.items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3 font-mono text-center text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={item.description}
                                onChange={e => updateDraftItem(idx, 'description', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={e => updateDraftItem(idx, 'quantity', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                step="any"
                                value={item.unitPrice}
                                onChange={e => updateDraftItem(idx, 'unitPrice', e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-right font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                              />
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                              ฿{formatCurrency(item.amount)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              {extractedDraft.items.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeItemFromDraft(idx)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Totals */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div className="flex-1">
                      <p className="text-slate-500">จำนวนเงินตัวอักษร:</p>
                      <p className="font-bold text-blue-900 mt-0.5">
                        ({extractedDraft.totalThaiText})
                      </p>
                    </div>

                    <div className="w-full sm:w-72 space-y-1.5 border-t sm:border-t-0 sm:border-l sm:border-slate-300 pt-2 sm:pt-0 sm:pl-4 font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>รวมราคาก่อน VAT:</span>
                        <span className="font-bold">฿{formatCurrency(extractedDraft.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-indigo-700">
                        <span>ภาษีมูลค่าเพิ่ม {extractedDraft.vatRate}%:</span>
                        <span className="font-bold">฿{formatCurrency(extractedDraft.vatAmount)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold text-sm pt-1 border-t border-slate-300">
                        <span>ยอดรวมสุทธิ:</span>
                        <span>฿{formatCurrency(extractedDraft.grandTotal)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cloudflare D1 Sync Option */}
                  <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-slate-800">
                        จัดเก็บบันทึกข้อมูลลงฐานข้อมูล Cloudflare D1 อัตโนมัติ
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToD1}
                        onChange={e => setSyncToD1(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 rounded-2xl p-8 text-center transition-all">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Database className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  อัปโหลดประวัติเอกสารเดิมที่เคยออกไว้
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 mb-5 leading-relaxed">
                  เลือกไฟล์สำรองข้อมูล JSON (เช่น AS_Power_Backup_*.json) เพื่อนำเข้าประวัติใบเสร็จรับเงิน/ใบกำกับภาษีที่เคยออกไว้ทั้งหมดเข้าสู่ระบบ และจัดเก็บเข้าฐานข้อมูล Cloudflare D1
                </p>

                <input
                  type="file"
                  ref={backupInputRef}
                  accept=".json,.csv"
                  onChange={handleBackupFileUpload}
                  className="hidden"
                  id="backup-file-input"
                />

                <label
                  htmlFor="backup-file-input"
                  className={`inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer transition-all ${
                    isProcessing ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      กำลังนำเข้าข้อมูล...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      เลือกไฟล์ประวัติเอกสารเดิม (.json)
                    </>
                  )}
                </label>
              </div>

              {/* Cloudflare D1 Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  สถาปัตยกรรมจัดเก็บข้อมูล Cloudflare D1
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Cloudflare D1 เป็นฐานข้อมูล Serverless SQL ความเร็วสูงระดับโลก ข้อมูลทุกใบเสร็จที่นำเข้าจะถูกสร้างเป็น D1 SQL Record ที่พร้อม Query หรือสั่งรันผ่าน Cloudflare Wrangler CLI ได้ทันที
                </p>
                <div className="pt-2 flex items-center justify-between border-t border-slate-200">
                  <span className="text-slate-500 font-mono text-[11px]">
                    เอกสารในระบบปัจจุบัน: {existingInvoicesCount} ฉบับ
                  </span>
                  <button
                    onClick={handleExportD1Sql}
                    className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    ดาวน์โหลด Cloudflare D1 SQL Schema
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            ยกเลิก
          </button>

          {activeTab === 'word' && extractedDraft && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer transition-all ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              ยืนยันนำเข้าสู่ระบบ & ซิงค์เข้า Cloudflare D1
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
