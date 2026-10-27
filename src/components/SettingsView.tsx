import React, { useState, useRef } from 'react';
import { CompanySettings, BackupLog } from '../types/index.ts';
import { StorageService } from '../services/storageService.ts';
import { DEFAULT_STAMP_SVG, DEFAULT_SIGNATURE_SVG } from '../utils/defaultData.ts';
import { getThaiFontFamily } from './InvoiceDocumentPaper.tsx';
import {
  Building2,
  Stamp,
  PenTool,
  CloudUpload,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  Bell,
  RotateCcw,
  Save,
  Eraser,
  QrCode,
  FileText,
  UserCheck,
  Globe,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  Type
} from 'lucide-react';

interface Props {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  backupLogs: BackupLog[];
  onTriggerBackup: () => void;
  onRestoreSuccess: () => void;
}

type SignatureRole = 'authorized' | 'collector' | 'sender';

export const SettingsView: React.FC<Props> = ({
  settings,
  onUpdateSettings,
  backupLogs,
  onTriggerBackup,
  onRestoreSuccess
}) => {
  const [formData, setFormData] = useState<CompanySettings>({ ...settings });
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [activeSignatureRole, setActiveSignatureRole] = useState<SignatureRole>('authorized');
  const [inkColor, setInkColor] = useState<string>('#0035a0');
  const [penSize, setPenSize] = useState<number>(3);

  const [testResult, setTestResult] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: ''
  });

  // Canvas for signature drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // File input refs
  const fileInputLogoRef = useRef<HTMLInputElement | null>(null);
  const fileInputStampRef = useRef<HTMLInputElement | null>(null);
  const fileInputSignatureRef = useRef<HTMLInputElement | null>(null);
  const fileInputRestoreRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (field: keyof CompanySettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    StorageService.saveSettings(formData);
    onUpdateSettings(formData);
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 3000);
  };

  // Upload company header logo
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleInputChange('logoUrl', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload stamp
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleInputChange('stampUrl', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload signature for active role
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          if (activeSignatureRole === 'authorized') {
            handleInputChange('signatureUrl', reader.result);
          } else if (activeSignatureRole === 'collector') {
            handleInputChange('collectorSignatureUrl', reader.result);
          } else {
            handleInputChange('senderSignatureUrl', reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas Drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      if (activeSignatureRole === 'authorized') {
        handleInputChange('signatureUrl', dataUrl);
      } else if (activeSignatureRole === 'collector') {
        handleInputChange('collectorSignatureUrl', dataUrl);
      } else {
        handleInputChange('senderSignatureUrl', dataUrl);
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  // Restore file handler
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const res = StorageService.restoreFromJson(reader.result);
          if (res.success) {
            alert(res.message);
            onRestoreSuccess();
          } else {
            alert('ล้มเหลว: ' + res.message);
          }
        }
      };
      reader.readAsText(file);
    }
  };

  // Test Cloud Login & Backup
  const handleTestCloudLoginAndBackup = async () => {
    setTestResult({ status: 'testing', message: 'กำลังทดสอบเข้าสู่ระบบและสำรองข้อมูลขึ้นคลาวด์...' });
    setTimeout(async () => {
      try {
        const res = await StorageService.performCloudBackup(false);
        setTestResult({
          status: 'success',
          message: `ทดสอบสำเร็จ: เข้าสู่ระบบ ${formData.email} และสำรองข้อมูลขึ้นคลาวด์เรียบร้อย (${new Date().toLocaleTimeString('th-TH')} น.)`
        });
        onTriggerBackup();
      } catch (err: any) {
        setTestResult({
          status: 'error',
          message: 'พบปัญหาในการสำรองข้อมูล: ' + err.message
        });
      }
    }, 700);
  };

  // Current active signature data
  const currentSignatureUrl =
    activeSignatureRole === 'authorized'
      ? formData.signatureUrl
      : activeSignatureRole === 'collector'
      ? formData.collectorSignatureUrl
      : formData.senderSignatureUrl;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Alert */}
      {isSavedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom text-sm font-semibold">
          <CheckCircle className="w-5 h-5" />
          บันทึกการตั้งค่าระบบเรียบร้อยแล้ว
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            การตั้งค่าระบบ & เพิ่มเติมลายเซ็นต์
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ปรับแต่งข้อมูลองค์กร เลขผู้เสียภาษี ลายเซ็นต์หลายตำแหน่ง ตราประทับ และระบบสำรองข้อมูลไฮบริด
          </p>
        </div>

        <button
          onClick={() => handleSave()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          บันทึกการตั้งค่า
        </button>
      </div>

      {/* Section 1: ระบบเพิ่มเติมลายเซ็นต์ (Enhanced Multi-Role Signature System) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <PenTool className="w-5 h-5 text-blue-600" />
              ระบบเพิ่มเติมและจัดการลายเซ็นต์ (Signature Management System)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              สามารถกำหนดลายเซ็นต์ได้ 3 ตำแหน่ง: ผู้มีอำนาจลงนาม, ผู้รับเงิน/การเงิน, และผู้ส่งสินค้า
            </p>
          </div>

          {/* Toggle Role Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveSignatureRole('authorized')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSignatureRole === 'authorized' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ผู้มีอำนาจลงนาม
            </button>
            <button
              type="button"
              onClick={() => setActiveSignatureRole('collector')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSignatureRole === 'collector' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ผู้รับเงิน / การเงิน
            </button>
            <button
              type="button"
              onClick={() => setActiveSignatureRole('sender')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeSignatureRole === 'sender' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ผู้ส่งสินค้า
            </button>
          </div>
        </div>

        {/* Role Information Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ชื่อ-นามสกุล ของตำแหน่งที่เลือก
            </label>
            <input
              type="text"
              value={
                activeSignatureRole === 'authorized'
                  ? formData.authorizedSignerName
                  : activeSignatureRole === 'collector'
                  ? formData.collectorName || ''
                  : formData.senderName || ''
              }
              onChange={e => {
                if (activeSignatureRole === 'authorized') handleInputChange('authorizedSignerName', e.target.value);
                else if (activeSignatureRole === 'collector') handleInputChange('collectorName', e.target.value);
                else handleInputChange('senderName', e.target.value);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ตำแหน่ง / คำกำกับ
            </label>
            <input
              type="text"
              value={
                activeSignatureRole === 'authorized'
                  ? formData.authorizedSignerTitle || 'หุ้นส่วนผู้จัดการ'
                  : activeSignatureRole === 'collector'
                  ? formData.collectorTitle || 'ผู้รับเงิน / เจ้าหน้าที่การเงิน'
                  : 'ผู้ส่งสินค้า / ผู้ส่งมอบงาน'
              }
              onChange={e => {
                if (activeSignatureRole === 'authorized') handleInputChange('authorizedSignerTitle', e.target.value);
                else if (activeSignatureRole === 'collector') handleInputChange('collectorTitle', e.target.value);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Signature Interactive Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Current Signature Preview */}
          <div className="md:col-span-5 space-y-3">
            <span className="text-xs font-bold text-slate-700 block">
              ตัวอย่างลายเซ็นต์ปัจจุบัน ({activeSignatureRole === 'authorized' ? 'ผู้มีอำนาจลงนาม' : activeSignatureRole === 'collector' ? 'ผู้รับเงิน' : 'ผู้ส่งสินค้า'}):
            </span>
            <div className="h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center p-3 relative overflow-hidden">
              {currentSignatureUrl ? (
                <img
                  src={currentSignatureUrl}
                  alt="Signature"
                  className="max-h-24 max-w-full object-contain filter drop-shadow-xs"
                />
              ) : (
                <span className="text-xs text-slate-400">ยังไม่มีลายเซ็นต์ในตำแหน่งนี้</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputSignatureRef.current?.click()}
                className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                อัปโหลดไฟล์ลายเซ็นต์ (PNG/JPG)
              </button>
              <input
                type="file"
                ref={fileInputSignatureRef}
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
              />

              {activeSignatureRole === 'authorized' && (
                <button
                  type="button"
                  onClick={() => handleInputChange('signatureUrl', DEFAULT_SIGNATURE_SVG)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  title="คืนค่าลายเซ็นต์ตัวอย่างเริ่มต้น"
                >
                  คืนค่าเริ่มต้น
                </button>
              )}
            </div>
          </div>

          {/* Right: Interactive Drawing Pad */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">
                หรือเซ็นต์สดบนกระดาน (Digital Drawing Pad):
              </span>
              
              {/* Tool Controls */}
              <div className="flex items-center gap-3">
                {/* Ink Color Picker */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500">หมึก:</span>
                  {[
                    { color: '#0035a0', label: 'น้ำเงินทางการ' },
                    { color: '#1e3a8a', label: 'น้ำเงินเข้ม' },
                    { color: '#0f172a', label: 'ดำ' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setInkColor(c.color)}
                      style={{ backgroundColor: c.color }}
                      className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                        inkColor === c.color ? 'ring-2 ring-offset-1 ring-blue-500 scale-110' : 'opacity-70'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Stroke Size */}
                <select
                  value={penSize}
                  onChange={e => setPenSize(Number(e.target.value))}
                  className="text-[10px] bg-slate-100 border border-slate-300 rounded px-1.5 py-0.5 text-slate-700 cursor-pointer"
                >
                  <option value={2}>เส้นบาง (2px)</option>
                  <option value={3.5}>ปานกลาง (3.5px)</option>
                  <option value={5}>เส้นหนา (5px)</option>
                </select>

                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                >
                  <Eraser className="w-3 h-3" /> ล้างกระดาน
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={500}
              height={120}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-32 border-2 border-slate-300 rounded-xl bg-white cursor-crosshair touch-none shadow-inner"
            />
            <p className="text-[11px] text-slate-500">
              * ใช้เมาส์หรือนิ้ว/ปากกาสไตลัสเขียนลายเซ็นต์ ระบบจะแปลงเป็นลายเซ็นต์ดิจิทัลและนำไปใช้งานในเอกสารทันที
            </p>
          </div>
        </div>

        {/* Display Toggles on Document */}
        <div className="pt-3 border-t border-slate-200">
          <span className="text-xs font-bold text-slate-700 block mb-2">
            การแสดงผลลายเซ็นต์และตราประทับในใบเสร็จ/ใบกำกับภาษี (Print Controls):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showAuthorizedSignature}
                onChange={e => handleInputChange('showAuthorizedSignature', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium text-slate-800">แสดงลายเซ็นต์ผู้มีอำนาจ</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showCollectorSignature}
                onChange={e => handleInputChange('showCollectorSignature', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium text-slate-800">แสดงลายเซ็นต์ผู้รับเงิน</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showSenderSignature}
                onChange={e => handleInputChange('showSenderSignature', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium text-slate-800">แสดงลายเซ็นต์ผู้ส่งสินค้า</span>
            </label>

            <label className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showStampOnPrint}
                onChange={e => handleInputChange('showStampOnPrint', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium text-slate-800">แสดงตราประทับบริษัท</span>
            </label>
          </div>
        </div>
      </div>

      {/* Section 2: ข้อมูลองค์กร นิติบุคคล และข้อมูลเพิ่มเติม (Additional Business Information) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          ข้อมูลนิติบุคคล สาขา และช่องทางการติดต่อ (Business Information)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
          <div className="sm:col-span-8">
            <label className="block font-semibold text-slate-700 mb-1">
              ชื่อสถานประกอบการ / บริษัท / ห้างหุ้นส่วน
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">สาขา</label>
            <input
              type="text"
              value={formData.branch}
              onChange={e => handleInputChange('branch', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">
              รหัสสาขา 5 หลัก (มาตรฐานสรรพากร)
            </label>
            <input
              type="text"
              maxLength={5}
              placeholder="00000"
              value={formData.branchCode || '00000'}
              onChange={e => handleInputChange('branchCode', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">
              เลขประจำตัวผู้เสียภาษีอากร 13 หลัก
            </label>
            <input
              type="text"
              maxLength={13}
              value={formData.taxId}
              onChange={e => handleInputChange('taxId', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">
              เลขทะเบียนนิติบุคคล (DBD Reg.)
            </label>
            <input
              type="text"
              value={formData.businessRegistrationNo || formData.taxId}
              onChange={e => handleInputChange('businessRegistrationNo', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-12">
            <label className="block font-semibold text-slate-700 mb-1">ที่อยู่จดทะเบียนตาม ภ.พ.20</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={e => handleInputChange('address', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
            <input
              type="text"
              value={formData.phone}
              onChange={e => handleInputChange('phone', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">อีเมลทางการ</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">เว็บไซต์ (Website)</label>
            <input
              type="text"
              value={formData.website || ''}
              onChange={e => handleInputChange('website', e.target.value)}
              placeholder="www.aspowernetwork.com"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">LINE Official Account ID</label>
            <input
              type="text"
              value={formData.lineId || ''}
              onChange={e => handleInputChange('lineId', e.target.value)}
              placeholder="@aspowernetwork"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">คำนำหน้าเลขที่บิล (Prefix)</label>
            <input
              type="text"
              value={formData.invoicePrefix}
              onChange={e => handleInputChange('invoicePrefix', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block font-semibold text-slate-700 mb-1">เลขที่บิลถัดไป (Next No.)</label>
            <input
              type="number"
              value={formData.nextNumber}
              onChange={e => handleInputChange('nextNumber', Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Section 3: โลโก้หัวกระดาษและตราประทับบริษัท (Company Header Logo & Stamp) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: โลโก้หัวกระดาษ (Company Header Logo) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              โลโก้หัวกระดาษบริษัท (Header Logo)
            </h3>
            <button
              type="button"
              onClick={() => handleInputChange('logoUrl', DEFAULT_STAMP_SVG)}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              คืนค่าโลโก้ตัวอย่าง
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt="Company Logo"
                className="w-32 h-32 object-contain filter drop-shadow-sm"
              />
            ) : (
              <span className="text-xs text-slate-400">ยังไม่มีโลโก้</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputLogoRef.current?.click()}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                อัปโหลดไฟล์โลโก้หัวกระดาษ (PNG/JPG)
              </button>
              <input
                type="file"
                ref={fileInputLogoRef}
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
            
            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formData.showLogoOnPrint !== false}
                onChange={e => handleInputChange('showLogoOnPrint', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium">แสดงโลโก้ที่หัวกระดาษเอกสารและหัวระบบ</span>
            </label>
            <p className="text-[11px] text-slate-500">
              * โลโก้นี้จะแสดงที่มุมบนซ้ายของเอกสารใบเสร็จ/ใบกำกับภาษี และแถบเมนูด้านบนของระบบ
            </p>
          </div>
        </div>

        {/* Card 2: ตราประทับบริษัท (Company Stamp) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Stamp className="w-4 h-4 text-blue-600" />
              ตราประทับบริษัท (Official Seal / Stamp)
            </h3>
            <button
              type="button"
              onClick={() => handleInputChange('stampUrl', DEFAULT_STAMP_SVG)}
              className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
            >
              คืนค่าตราประทับตัวอย่าง
            </button>
          </div>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl">
            {formData.stampUrl ? (
              <img
                src={formData.stampUrl}
                alt="Company Stamp"
                className="w-32 h-32 object-contain filter drop-shadow-sm"
              />
            ) : (
              <span className="text-xs text-slate-400">ยังไม่มีตราประทับ</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => fileInputStampRef.current?.click()}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
              >
                อัปโหลดไฟล์ตราประทับ (PNG/JPG)
              </button>
              <input
                type="file"
                ref={fileInputStampRef}
                accept="image/*"
                onChange={handleStampUpload}
                className="hidden"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={formData.showStampOnPrint !== false}
                onChange={e => handleInputChange('showStampOnPrint', e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-0"
              />
              <span className="font-medium">แสดงตราประทับทับจุดลงนามผู้มีอำนาจ</span>
            </label>
            <p className="text-[11px] text-slate-500">
              * ตราประทับจะแสดงประทับคู่กับลายเซ็นต์ผู้มีอำนาจลงนามทางด้านล่างขวาของเอกสาร
            </p>
          </div>
        </div>
      </div>

      {/* Section: การตั้งค่าฟอนต์ & ความคมชัดของระบบและเอกสาร (Typography & Readability Settings) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Type className="w-5 h-5 text-blue-600" />
              การตั้งค่าฟอนต์ & ความชัดเจนของระบบและเอกสาร (Font & Readability)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกฟอนต์ใหม่ที่อ่านง่ายคมชัด หรือใช้ฟอนต์ดั้งเดิม พร้อมปรับขนาดตัวอักษรให้พอดีคำและจัดสัดส่วน 1 หน้า A4
            </p>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                handleInputChange('fontScalePreset', 'standard');
                handleInputChange('documentBaseFontSize', 13.5);
                handleInputChange('companyHeaderFontSize', 18);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                formData.fontScalePreset === 'standard' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              มาตรฐาน (13.5pt)
            </button>
            <button
              type="button"
              onClick={() => {
                handleInputChange('fontScalePreset', 'comfortable');
                handleInputChange('documentBaseFontSize', 14.5);
                handleInputChange('companyHeaderFontSize', 18);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                formData.fontScalePreset === 'comfortable' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              สบายตา (14.5pt) ★
            </button>
            <button
              type="button"
              onClick={() => {
                handleInputChange('fontScalePreset', 'large');
                handleInputChange('documentBaseFontSize', 16);
                handleInputChange('companyHeaderFontSize', 20);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                formData.fontScalePreset === 'large' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ตัวโตอ่านง่าย (16pt)
            </button>
          </div>
        </div>

        {/* Font Family Selection Grid */}
        <div>
          <label className="block text-xs font-bold text-slate-800 mb-2">
            เลือกรูปแบบฟอนต์ (Font Family Selection):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              {
                id: 'baijamjuree',
                name: 'Bai Jamjuree',
                thaiName: 'ใบจามจุรี',
                badge: 'แนะนำใหม่',
                desc: 'คมชัด อ่านง่าย ทันสมัย'
              },
              {
                id: 'sarabun',
                name: 'Sarabun',
                thaiName: 'สารบัญ',
                badge: 'มาตรฐานราชการ',
                desc: 'สุภาพ ทางการ เรียบร้อย'
              },
              {
                id: 'prompt',
                name: 'Prompt',
                thaiName: 'พร้อมท์',
                badge: 'มินิมอล',
                desc: 'เรขาคณิต โมเดิร์น'
              },
              {
                id: 'kanit',
                name: 'Kanit',
                thaiName: 'คณิต',
                badge: 'ตัวหนาเด่น',
                desc: 'โมเดิร์น โดดเด่น'
              },
              {
                id: 'browallia',
                name: 'Browallia New',
                thaiName: 'บราวเวอร์เลีย',
                badge: 'ดั้งเดิม',
                desc: 'ฟอนต์เอกสารบัญชีดั้งเดิม'
              },
              {
                id: 'system',
                name: 'System Default',
                thaiName: 'ระบบดั้งเดิม',
                badge: 'ค่าเริ่มต้น',
                desc: 'ฟอนต์มาตรฐานของเครื่อง'
              }
            ].map(f => {
              const isSelected = (formData.fontFamilyChoice || 'baijamjuree') === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    handleInputChange('fontFamilyChoice', f.id);
                    handleInputChange('systemFontFamilyChoice', f.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900 truncate">{f.thaiName}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                        isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {f.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">{f.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">{f.desc}</div>
                </button>
              );
            })}
          </div>

          <label className="flex items-center gap-2 mt-3 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.systemFontFamilyChoice === formData.fontFamilyChoice}
              onChange={e => {
                if (e.target.checked) {
                  handleInputChange('systemFontFamilyChoice', formData.fontFamilyChoice || 'baijamjuree');
                } else {
                  handleInputChange('systemFontFamilyChoice', 'system');
                }
              }}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            <span className="font-medium">
              นำฟอนต์ที่เลือกไปใช้กับทั้งระบบโปรแกรม (เมนู, ปุ่ม, ตาราง, และแบบฟอร์ม) ด้วย
            </span>
          </label>
        </div>

        {/* Detailed Controls & Live Preview Card */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2 border-t border-slate-100">
          {/* Left: Size Sliders & Selectors */}
          <div className="md:col-span-6 space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  ขนาดชื่อบริษัท หัวกระดาษ (Company Name Header Size):
                </label>
                <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {formData.companyHeaderFontSize || 18} pt
                </span>
              </div>
              <input
                type="range"
                min="16"
                max="24"
                step="1"
                value={formData.companyHeaderFontSize || 18}
                onChange={e => handleInputChange('companyHeaderFontSize', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>16 pt (กะทัดรัด)</span>
                <span>18 pt (มาตรฐานพอดีคำ)</span>
                <span>24 pt (เด่นชัด)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  ขนาดตัวอักษรเนื้อหาเอกสาร (Base Document Font Size):
                </label>
                <span className="font-mono font-bold text-blue-700 text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {formData.documentBaseFontSize || 14.5} pt
                </span>
              </div>
              <input
                type="range"
                min="12.5"
                max="17.5"
                step="0.5"
                value={formData.documentBaseFontSize || 14.5}
                onChange={e => handleInputChange('documentBaseFontSize', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>12.5 pt</span>
                <span>14.5 pt (สบายตา)</span>
                <span>17.5 pt (ใหญ่พิเศษ)</span>
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-600" />
                คำแนะนำฟอนต์และความคมชัด:
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                ฟอนต์ <strong>Bai Jamjuree</strong> และ <strong>Sarabun</strong> ถูกออกแบบให้มีสัดส่วนวรรณยุกต์ไทยชัดเจนทุกขนาด ช่วยให้อ่านสบายตาบนจอภาพ และพิมพ์ลงกระดาษ A4 หน้าเดียวได้อย่างคมชัดระดับมืออาชีพ
              </p>
            </div>
          </div>

          {/* Right: Live Interactive Font Preview */}
          <div className="md:col-span-6 bg-slate-50 border border-slate-300 rounded-xl p-4 flex flex-col justify-between shadow-inner">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  ตัวอย่างการแสดงผลจริง (Live Preview):
                </span>
                <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                  {formData.fontFamilyChoice || 'baijamjuree'}
                </span>
              </div>

              {/* Sample Document Heading */}
              <div
                className="font-bold text-slate-900 leading-snug"
                style={{
                  fontFamily: getThaiFontFamily(formData.fontFamilyChoice),
                  fontSize: `${formData.companyHeaderFontSize || 18}pt`
                }}
              >
                {formData.name || 'ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค'}{' '}
                <span className="font-normal text-slate-600" style={{ fontSize: `${Math.max(13, (formData.companyHeaderFontSize || 18) - 3)}pt` }}>
                  ({formData.branch || 'สำนักงานใหญ่'})
                </span>
              </div>

              {/* Sample Subtitle */}
              <div
                className="text-slate-700 mt-1"
                style={{
                  fontFamily: getThaiFontFamily(formData.fontFamilyChoice),
                  fontSize: `${formData.documentBaseFontSize || 14.5}pt`
                }}
              >
                <span className="font-semibold">เลขประจำตัวผู้เสียภาษี:</span> {formData.taxId} | <span className="font-semibold">โทร:</span> {formData.phone}
              </div>

              {/* Sample Item Row & Grand Total */}
              <div
                className="mt-3 p-2.5 bg-white border border-slate-200 rounded-lg space-y-1.5"
                style={{
                  fontFamily: getThaiFontFamily(formData.fontFamilyChoice),
                  fontSize: `${formData.documentBaseFontSize || 14.5}pt`
                }}
              >
                <div className="flex justify-between items-center text-slate-800">
                  <span>1. บริการวางระบบโครงข่ายเครือข่ายความเร็วสูง</span>
                  <span className="font-mono font-bold">฿11,070.00</span>
                </div>
                <div className="border-t border-slate-100 pt-1 flex justify-between items-center text-blue-900 font-bold">
                  <span>ยอดรวมสุทธิ (Grand Total):</span>
                  <span className="font-mono text-[16pt]">฿11,844.90</span>
                </div>
                <div className="text-slate-500 text-xs italic">
                  (หนึ่งหมื่นหนึ่งพันแปดร้อยสี่สิบสี่บาทเก้าสิบสตางค์)
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between">
              <span>* ฟอนต์และขนาดจะเปลี่ยนสดทันทีตามที่คุณเลือก</span>
              <button
                type="button"
                onClick={() => {
                  handleInputChange('fontFamilyChoice', 'baijamjuree');
                  handleInputChange('systemFontFamilyChoice', 'baijamjuree');
                  handleInputChange('fontScalePreset', 'comfortable');
                  handleInputChange('documentBaseFontSize', 14.5);
                  handleInputChange('companyHeaderFontSize', 18);
                }}
                className="text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                รีเซ็ตค่ามาตรฐาน (18pt/14.5pt)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: ข้อมูลบัญชีธนาคาร พร้อมเพย์ และข้อความเงื่อนไขท้ายบิล */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base border-b border-slate-200 pb-2 flex items-center gap-2">
          <QrCode className="w-5 h-5 text-blue-600" />
          ข้อมูลการเงิน การรับชำระ และเงื่อนไขมาตรฐาน (Payment & Terms)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 text-xs">
          <div className="sm:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">ชื่อธนาคาร / สาขา</label>
            <input
              type="text"
              value={formData.bankName}
              onChange={e => handleInputChange('bankName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">เลขที่บัญชีธนาคาร</label>
            <input
              type="text"
              value={formData.bankAccountNo}
              onChange={e => handleInputChange('bankAccountNo', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">ชื่อบัญชี</label>
            <input
              type="text"
              value={formData.bankAccountName}
              onChange={e => handleInputChange('bankAccountName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">เลขพร้อมเพย์ (PromptPay ID)</label>
            <input
              type="text"
              value={formData.promptPayId}
              onChange={e => handleInputChange('promptPayId', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
            />
          </div>

          <div className="sm:col-span-12">
            <label className="block font-semibold text-slate-700 mb-1">
              ข้อความเงื่อนไขและหมายเหตุท้ายบิลเริ่มต้น (Default Invoice Notes)
            </label>
            <textarea
              rows={2}
              value={formData.defaultNotes}
              onChange={e => handleInputChange('defaultNotes', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-6">
            <label className="block font-semibold text-slate-700 mb-1">เงื่อนไขการชำระเงินเริ่มต้น (Default Terms)</label>
            <input
              type="text"
              value={formData.defaultPaymentTerms}
              onChange={e => handleInputChange('defaultPaymentTerms', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">อัตราภาษีมูลค่าเพิ่ม (%)</label>
            <input
              type="number"
              value={formData.defaultVatRate || 7}
              onChange={e => handleInputChange('defaultVatRate', Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block font-semibold text-slate-700 mb-1">อัตราหัก ณ ที่จ่ายเริ่มต้น (%)</label>
            <select
              value={formData.defaultWithholdingTaxRate || 0}
              onChange={e => handleInputChange('defaultWithholdingTaxRate', Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono"
            >
              <option value={0}>0% (ไม่หัก)</option>
              <option value={1}>1% (ค่าขนส่ง)</option>
              <option value={3}>3% (ค่าบริการ/คอมมิชชั่น)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 5: สำรองข้อมูลและวินิจฉัยคลาวด์ไฮบริด (Hybrid Storage & Diagnostics) */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl">
              <CloudUpload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg">ระบบจัดเก็บและสำรองข้อมูลไฮบริด (Hybrid Storage)</h3>
              <p className="text-xs text-slate-300">
                รองรับการทำงานออฟไลน์ (Local-first) พร้อมระบบ Cloud Backup และแจ้งเตือนอัตโนมัติทุกวัน
              </p>
            </div>
          </div>

          <button
            onClick={handleTestCloudLoginAndBackup}
            disabled={testResult.status === 'testing'}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-900/50"
          >
            <RefreshCw className={`w-4 h-4 ${testResult.status === 'testing' ? 'animate-spin' : ''}`} />
            ทดสอบเข้าสู่ระบบและสำรองข้อมูลขึ้นคลาวด์
          </button>
        </div>

        {/* Test Result Message */}
        {testResult.status !== 'idle' && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              testResult.status === 'testing'
                ? 'bg-blue-900/50 border-blue-700 text-blue-200'
                : testResult.status === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
            }`}
          >
            {testResult.status === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {testResult.status === 'testing' && <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Backup Settings Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10 text-xs">
          <label className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={formData.autoBackupDaily}
              onChange={e => handleInputChange('autoBackupDaily', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            <div>
              <span className="font-semibold text-white block">สำรองข้อมูลอัตโนมัติประจำวัน (Daily Auto Backup)</span>
              <span className="text-[11px] text-slate-400">ทำการสำรองข้อมูลโดยอัตโนมัติทุกวันเมื่อเปิดใช้งานระบบ</span>
            </div>
          </label>

          <label className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
            <input
              type="checkbox"
              checked={formData.dailyBackupNotification}
              onChange={e => handleInputChange('dailyBackupNotification', e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-0"
            />
            <div>
              <span className="font-semibold text-white block">แจ้งเตือนเมื่อระบบสำรองข้อมูลสำเร็จในทุกๆ วัน</span>
              <span className="text-[11px] text-slate-400">แสดงข้อความแจ้งเตือนสถานะสำเร็จและบันทึกประวัติการสำรอง</span>
            </div>
          </label>
        </div>

        {/* Manual Export & Restore Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => StorageService.exportBackupJson()}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            ดาวน์โหลดไฟล์สำรองข้อมูล (JSON)
          </button>

          <button
            onClick={() => fileInputRestoreRef.current?.click()}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            กู้คืนข้อมูลจากไฟล์สำรอง
          </button>
          <input
            type="file"
            ref={fileInputRestoreRef}
            accept=".json"
            onChange={handleRestoreFile}
            className="hidden"
          />

          <button
            onClick={() => {
              if (window.confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตามแบบตัวอย่างของ หจก. เอ.เอส. เพาเวอร์ เน็ทเวิร์ค ใช่หรือไม่?')) {
                StorageService.resetToDefault();
                window.location.reload();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ตค่าเริ่มต้นตามตัวอย่าง
          </button>
        </div>
      </div>

      {/* Section 6: ประวัติการสำรองข้อมูล (Backup Audit Logs) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" />
          ประวัติการสำรองข้อมูล (Backup Audit Logs)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <th className="py-2.5 px-3">วันเวลา</th>
                <th className="py-2.5 px-3">ประเภท</th>
                <th className="py-2.5 px-3 text-center">จำนวนข้อมูล</th>
                <th className="py-2.5 px-3 text-center">สถานะ</th>
                <th className="py-2.5 px-3">รายละเอียดผลลัพธ์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {backupLogs.slice(0, 5).map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {new Date(log.timestamp).toLocaleString('th-TH')}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium text-[11px]">
                      {log.type === 'daily_auto' ? 'คลาวด์ประจำวัน' : log.type === 'hybrid_cloud' ? 'ไฮบริดคลาวด์' : 'สำรองโดยผู้ใช้'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-semibold">
                    {log.recordsCount} เอกสาร
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">
                      <CheckCircle className="w-3 h-3 text-emerald-600" /> สำเร็จ
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
