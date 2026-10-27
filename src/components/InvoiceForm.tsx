import React, { useState, useEffect } from 'react';
import { InvoiceDocument, InvoiceItem, CategoryType, PaymentMethod, CompanySettings, InvoiceStatus } from '../types/index.ts';
import { numberToThaiBaht, toThaiDateString, formatCurrency } from '../utils/bahtText.ts';
import { Plus, Trash2, ArrowLeft, Save, Sparkles, Building, User, Calendar, Calculator } from 'lucide-react';

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
    initialData?.documentDateThai || toThaiDateString(todayIso)
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

  const [salesman, setSalesman] = useState(initialData?.salesman || 'นายอภิวัฒน์ ส.');
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

  // Update Thai date when ISO date changes
  useEffect(() => {
    setDocumentDateThai(toThaiDateString(documentDate));
  }, [documentDate]);

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

        <div className="flex items-center gap-2">
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              พนักงานขาย / ผู้ประสานงาน
            </label>
            <input
              type="text"
              value={salesman}
              onChange={e => setSalesman(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
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
    </form>
  );
};
