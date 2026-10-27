import React, { useState, useMemo } from 'react';
import { InvoiceDocument, CategoryType, CompanySettings } from '../types/index.ts';
import { formatCurrency, THAI_MONTHS_SHORT } from '../utils/bahtText.ts';
import { PREVIOUS_YEAR_TOTALS } from '../utils/defaultData.ts';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  CheckCircle,
  Clock,
  CloudUpload,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  RefreshCw,
  BellRing
} from 'lucide-react';

interface Props {
  invoices: InvoiceDocument[];
  settings?: CompanySettings;
  onSelectInvoice: (invoice: InvoiceDocument) => void;
  onCreateNew: () => void;
  onBackupNow: () => void;
  lastBackupDate: string | null;
  dailyBackupNotification: boolean;
}

export const Dashboard: React.FC<Props> = ({
  invoices,
  settings,
  onSelectInvoice,
  onCreateNew,
  onBackupNow,
  lastBackupDate,
  dailyBackupNotification
}) => {
  const [selectedYearThai, setSelectedYearThai] = useState<number>(2569);
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual' | 'categories'>('monthly');
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  // Filter invoices for selected year (Buddhist year 2569 = CE 2026)
  const targetYearCe = selectedYearThai - 543;
  const yearInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = new Date(inv.documentDate);
      return d.getFullYear() === targetYearCe;
    });
  }, [invoices, targetYearCe]);

  // Overall KPIs for current selected year
  const totalSales = useMemo(() => yearInvoices.reduce((sum, inv) => sum + inv.subtotal, 0), [yearInvoices]);
  const totalVat = useMemo(() => yearInvoices.reduce((sum, inv) => sum + inv.vatAmount, 0), [yearInvoices]);
  const grandTotal = useMemo(() => yearInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0), [yearInvoices]);
  const paidCount = useMemo(() => yearInvoices.filter(i => i.status === 'paid').length, [yearInvoices]);
  const pendingCount = useMemo(() => yearInvoices.filter(i => i.status === 'pending').length, [yearInvoices]);

  // 12-Month Sales & VAT Calculation (Jan - Dec completely filled)
  const monthlyData = useMemo(() => {
    // Array of 12 months with 0-indexed month 0 (Jan) to 11 (Dec)
    const months = Array.from({ length: 12 }, (_, index) => {
      return {
        monthIndex: index,
        name: THAI_MONTHS_SHORT[index],
        fullName: [
          'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
          'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
          'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ][index],
        sales: 0,
        vat: 0,
        grandTotal: 0,
        count: 0
      };
    });

    yearInvoices.forEach(inv => {
      const d = new Date(inv.documentDate);
      const m = d.getMonth();
      if (m >= 0 && m < 12) {
        months[m].sales += inv.subtotal;
        months[m].vat += inv.vatAmount;
        months[m].grandTotal += inv.grandTotal;
        months[m].count += 1;
      }
    });

    return months;
  }, [yearInvoices]);

  // Max value for scaling monthly chart
  const maxMonthValue = useMemo(() => {
    const maxVal = Math.max(...monthlyData.map(m => m.sales), 10000);
    return Math.ceil(maxVal / 10000) * 10000;
  }, [monthlyData]);

  // Sales by Category for Current Year
  const categoriesList: CategoryType[] = [
    'ค่าคอมมิชชั่นและการตลาด',
    'งานบริการระบบเครือข่ายและไอที',
    'ค่าบริการบำรุงรักษา',
    'จำหน่ายอุปกรณ์และฮาร์ดแวร์',
    'ค่าที่ปรึกษาและพัฒนาระบบ'
  ];

  const currentYearCategorySales = useMemo(() => {
    const map: Record<CategoryType, number> = {
      'ค่าคอมมิชชั่นและการตลาด': 0,
      'งานบริการระบบเครือข่ายและไอที': 0,
      'ค่าบริการบำรุงรักษา': 0,
      'จำหน่ายอุปกรณ์และฮาร์ดแวร์': 0,
      'ค่าที่ปรึกษาและพัฒนาระบบ': 0
    };

    yearInvoices.forEach(inv => {
      inv.items.forEach(item => {
        if (map[item.category] !== undefined) {
          map[item.category] += item.amount;
        } else {
          map[inv.categoryPrimary] += item.amount;
        }
      });
    });

    return map;
  }, [yearInvoices]);

  // Annual YoY comparison stats
  const yoyGrowthRate = useMemo(() => {
    if (PREVIOUS_YEAR_TOTALS.totalSales === 0) return 0;
    return ((totalSales - PREVIOUS_YEAR_TOTALS.totalSales) / PREVIOUS_YEAR_TOTALS.totalSales) * 100;
  }, [totalSales]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Daily Cloud Backup Status */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {(settings?.logoUrl || settings?.stampUrl) && (
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl p-1.5 shadow-lg shadow-black/20 shrink-0 flex items-center justify-center border border-white/20">
                <img
                  src={settings?.logoUrl || settings?.stampUrl}
                  alt="A.S. Power Network Logo"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/30 rounded-full text-xs font-semibold">
                  Live Tax Invoice Dashboard
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full text-xs font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  ระบบพร้อมใช้งาน (ออฟไลน์ & ไฮบริด)
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
                {settings?.name || 'ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
                รายงานยอดขาย ภาษีมูลค่าเพิ่ม (VAT 7%) ครบ 12 เดือน และสรุปยอดขายแยกตามประเภทรายปี
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 text-xs flex items-center gap-3">
              <div className="p-2 bg-blue-600/50 rounded-lg text-white">
                <CloudUpload className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-300 font-medium">การสำรองข้อมูลคลาวด์</p>
                <p className="text-white font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  {lastBackupDate ? `สำรองล่าสุด ${new Date(lastBackupDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.` : 'ยังไม่ได้สำรอง'}
                </p>
              </div>
            </div>

            <button
              onClick={onBackupNow}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              สำรองข้อมูลคลาวด์ทันที
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดขายก่อน VAT (ปี พ.ศ. {selectedYearThai})
            </p>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              ฿{formatCurrency(totalSales)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              {yoyGrowthRate >= 0 ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <ArrowUpRight className="w-4 h-4" /> +{yoyGrowthRate.toFixed(1)}%
                </span>
              ) : (
                <span className="text-rose-600 font-semibold flex items-center">
                  <ArrowDownRight className="w-4 h-4" /> {yoyGrowthRate.toFixed(1)}%
                </span>
              )}
              <span className="text-slate-500">เทียบกับปีก่อน (พ.ศ. 2568)</span>
            </div>
          </div>
        </div>

        {/* VAT 7% Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ภาษีขายสะสม (VAT 7%)
            </p>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-indigo-700 font-mono">
              ฿{formatCurrency(totalVat)}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              นำส่งแบบ ภ.พ.30 ประจำปี พ.ศ. {selectedYearThai}
            </p>
          </div>
        </div>

        {/* Grand Total Net */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดรวมสุทธิ (Grand Total)
            </p>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 font-mono">
              ฿{formatCurrency(grandTotal)}
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              รับชำระแล้ว: <span className="font-semibold text-slate-700">{paidCount}</span> | รอชำระ: <span className="font-semibold text-amber-600">{pendingCount}</span>
            </p>
          </div>
        </div>

        {/* Total Documents */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              เอกสารออกทั้งหมด
            </p>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">
              {yearInvoices.length} <span className="text-sm font-normal text-slate-500">ฉบับ</span>
            </h3>
            <button
              onClick={onCreateNew}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              + ออกใบกำกับ
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            เฉลี่ย ฿{yearInvoices.length > 0 ? formatCurrency(totalSales / yearInvoices.length) : '0.00'} / ฉบับ
          </p>
        </div>
      </div>

      {/* Main Graph & Analysis Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs for Views */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('monthly')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'monthly' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              กราฟยอดขาย & VAT (ครบ 12 เดือน)
            </button>
            <button
              onClick={() => setActiveTab('annual')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'annual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              เปรียบเทียบมุมมองรายปี
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              แยกตามประเภทบริการ
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">ปีภาษี:</span>
            <select
              value={selectedYearThai}
              onChange={e => setSelectedYearThai(Number(e.target.value))}
              className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value={2569}>พ.ศ. 2569 (ปีปัจจุบัน)</option>
              <option value={2568}>พ.ศ. 2568 (ปีก่อนหน้า)</option>
            </select>
          </div>
        </div>

        {/* Tab 1: Full 12-Month Sales & VAT Chart */}
        {activeTab === 'monthly' && (
          <div className="p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  กราฟแสดงยอดขายและภาษีมูลค่าเพิ่ม (ครบ 12 เดือน ม.ค. - ธ.ค. พ.ศ. {selectedYearThai})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  แท่งสีน้ำเงิน: ยอดขายก่อนภาษี (Sales) • แท่งสีม่วง: ภาษีมูลค่าเพิ่ม 7% (Output VAT)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block" />
                  <span className="text-slate-700">ยอดขายก่อน VAT</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-indigo-500 inline-block" />
                  <span className="text-slate-700">ภาษีมูลค่าเพิ่ม (7%)</span>
                </div>
              </div>
            </div>

            {/* Interactive 12-Month Bar Chart */}
            <div className="h-72 w-full pt-6 flex items-end justify-between gap-1 sm:gap-2 px-2 border-b border-slate-200">
              {monthlyData.map((item, idx) => {
                const salesHeight = maxMonthValue > 0 ? (item.sales / maxMonthValue) * 100 : 0;
                const vatHeight = maxMonthValue > 0 ? (item.vat / maxMonthValue) * 100 : 0;
                const isHovered = hoveredMonth === idx;

                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute -top-20 z-30 bg-slate-900 text-white text-xs rounded-xl p-2.5 shadow-xl whitespace-nowrap pointer-events-none border border-slate-700 min-w-40 text-center animate-in fade-in">
                        <p className="font-bold text-blue-300 border-b border-slate-700 pb-1 mb-1">
                          {item.fullName} พ.ศ. {selectedYearThai}
                        </p>
                        <p className="flex justify-between gap-3 text-slate-300">
                          <span>ยอดขาย:</span>
                          <span className="font-mono font-bold text-white">฿{formatCurrency(item.sales)}</span>
                        </p>
                        <p className="flex justify-between gap-3 text-slate-300">
                          <span>VAT 7%:</span>
                          <span className="font-mono font-bold text-indigo-300">฿{formatCurrency(item.vat)}</span>
                        </p>
                        <p className="flex justify-between gap-3 text-slate-400 text-[10px] pt-1 border-t border-slate-800 mt-1">
                          <span>จำนวนเอกสาร:</span>
                          <span className="font-bold">{item.count} ฉบับ</span>
                        </p>
                      </div>
                    )}

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 h-56">
                      {/* Sales Bar */}
                      <div
                        style={{ height: `${Math.max(salesHeight, 3)}%` }}
                        className={`w-3 sm:w-5 rounded-t transition-all duration-300 ${
                          item.sales > 0
                            ? isHovered
                              ? 'bg-blue-700 shadow-md scale-y-105'
                              : 'bg-blue-600'
                            : 'bg-slate-100'
                        }`}
                      />
                      {/* VAT Bar */}
                      <div
                        style={{ height: `${Math.max(vatHeight, item.vat > 0 ? 3 : 1)}%` }}
                        className={`w-2 sm:w-3.5 rounded-t transition-all duration-300 ${
                          item.vat > 0
                            ? isHovered
                              ? 'bg-indigo-600 shadow-md scale-y-105'
                              : 'bg-indigo-400'
                            : 'bg-slate-100'
                        }`}
                      />
                    </div>

                    {/* Month Label */}
                    <span className={`text-[11px] sm:text-xs font-semibold mt-2 ${isHovered ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 12-Month Data Breakdown Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                    <th className="py-2.5 px-3">เดือน</th>
                    <th className="py-2.5 px-3 text-right">ยอดขายก่อน VAT</th>
                    <th className="py-2.5 px-3 text-right">ภาษีมูลค่าเพิ่ม 7%</th>
                    <th className="py-2.5 px-3 text-right">ยอดรวมสุทธิ</th>
                    <th className="py-2.5 px-3 text-center">จำนวนบิล</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyData.map(m => (
                    <tr key={m.fullName} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-900">{m.fullName}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                        ฿{formatCurrency(m.sales)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-700">
                        ฿{formatCurrency(m.vat)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                        ฿{formatCurrency(m.grandTotal)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        {m.count}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {m.count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            บันทึกแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                            ไม่มีรายการ
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td className="py-3 px-3 text-slate-900">รวมตลอดทั้งปี (12 เดือน)</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-900">฿{formatCurrency(totalSales)}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-900">฿{formatCurrency(totalVat)}</td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-900">฿{formatCurrency(grandTotal)}</td>
                    <td className="py-3 px-3 text-center font-mono">{yearInvoices.length}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Annual Comparison View (เปรียบเทียบในมุมมองรายปี) */}
        {activeTab === 'annual' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                เปรียบเทียบผลประกอบการรายปี: พ.ศ. 2568 vs พ.ศ. 2569
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                วิเคราะห์การเติบโตของยอดขาย ภาษีมูลค่าเพิ่ม และการเปลี่ยนแปลงตามหมวดหมู่รายปี
              </p>
            </div>

            {/* YoY Cards Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block mb-1">ยอดขายก่อนภาษี (YoY)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-600">พ.ศ. 2568:</span>
                  <span className="font-mono font-medium text-slate-700">฿{formatCurrency(PREVIOUS_YEAR_TOTALS.totalSales)}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-blue-900">พ.ศ. 2569:</span>
                  <span className="font-mono font-bold text-blue-900 text-base">฿{formatCurrency(totalSales)}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">อัตราการเติบโต:</span>
                  <span className="font-bold text-emerald-600 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +{yoyGrowthRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block mb-1">ภาษีขาย VAT 7% (YoY)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-600">พ.ศ. 2568:</span>
                  <span className="font-mono font-medium text-slate-700">฿{formatCurrency(PREVIOUS_YEAR_TOTALS.totalVat)}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-indigo-900">พ.ศ. 2569:</span>
                  <span className="font-mono font-bold text-indigo-900 text-base">฿{formatCurrency(totalVat)}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">ส่วนต่างภาษี:</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    +฿{formatCurrency(totalVat - PREVIOUS_YEAR_TOTALS.totalVat)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-xs font-semibold text-slate-500 block mb-1">ยอดรวมสุทธิ (Grand Total YoY)</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-600">พ.ศ. 2568:</span>
                  <span className="font-mono font-medium text-slate-700">฿{formatCurrency(PREVIOUS_YEAR_TOTALS.grandTotal)}</span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-sm font-bold text-emerald-900">พ.ศ. 2569:</span>
                  <span className="font-mono font-bold text-emerald-900 text-base">฿{formatCurrency(grandTotal)}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">สถานะ:</span>
                  <span className="font-bold text-emerald-600">ขยายตัวต่อเนื่อง</span>
                </div>
              </div>
            </div>

            {/* Annual Category Breakdown Comparison */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100 p-3 font-bold text-xs text-slate-800 uppercase tracking-wider">
                เปรียบเทียบยอดขายแยกตามประเภทรายปี (พ.ศ. 2568 vs พ.ศ. 2569)
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-2.5 px-3">หมวดหมู่บริการ / สินค้า</th>
                    <th className="py-2.5 px-3 text-right">พ.ศ. 2568</th>
                    <th className="py-2.5 px-3 text-right">พ.ศ. 2569</th>
                    <th className="py-2.5 px-3 text-right">การเติบโต</th>
                    <th className="py-2.5 px-3 text-right">สัดส่วนปีปัจจุบัน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categoriesList.map(cat => {
                    const prevAmount = PREVIOUS_YEAR_TOTALS.categories[cat] || 0;
                    const currAmount = currentYearCategorySales[cat] || 0;
                    const diff = currAmount - prevAmount;
                    const growth = prevAmount > 0 ? (diff / prevAmount) * 100 : 100;
                    const share = totalSales > 0 ? (currAmount / totalSales) * 100 : 0;

                    return (
                      <tr key={cat} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-semibold text-slate-900">{cat}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">฿{formatCurrency(prevAmount)}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-900">฿{formatCurrency(currAmount)}</td>
                        <td className="py-3 px-3 text-right font-semibold">
                          {growth >= 0 ? (
                            <span className="text-emerald-600">+{growth.toFixed(1)}%</span>
                          ) : (
                            <span className="text-rose-600">{growth.toFixed(1)}%</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-slate-700">{share.toFixed(1)}%</span>
                            <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${share}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Sales by Category Detail */}
        {activeTab === 'categories' && (
          <div className="p-4 sm:p-6 space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                สรุปยอดขายแยกตามประเภทอย่างชัดเจน (พ.ศ. {selectedYearThai})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                การกระจายตัวของรายได้จากบริการเครือข่าย คอมมิชชั่น งานบำรุงรักษา และการพัฒนาระบบ
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category Progress Bars */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">
                  สัดส่วนรายได้แยกตามประเภท
                </h4>
                {categoriesList.map((cat, idx) => {
                  const amount = currentYearCategorySales[cat] || 0;
                  const pct = totalSales > 0 ? (amount / totalSales) * 100 : 0;
                  const colors = [
                    'bg-blue-600',
                    'bg-indigo-600',
                    'bg-emerald-600',
                    'bg-amber-500',
                    'bg-purple-600'
                  ];

                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800">{cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">฿{formatCurrency(amount)}</span>
                          <span className="text-slate-500 text-[11px]">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-2.5 rounded-full ${colors[idx % colors.length]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Highlights */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-5 rounded-xl border border-blue-200 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm text-blue-900 mb-2">บทวิเคราะห์โครงสร้างรายได้</h4>
                  <ul className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                      <span>
                        <strong>ค่าคอมมิชชั่นและการตลาด:</strong> เป็นแหล่งรายได้หลัก สัดส่วนกว่า{' '}
                        {totalSales > 0 ? ((currentYearCategorySales['ค่าคอมมิชชั่นและการตลาด'] / totalSales) * 100).toFixed(0) : 0}% 
                        โดยมีลูกค้ารายใหญ่ เช่น บริษัท อาร์เอส คอนเน็ค จำกัด
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                      <span>
                        <strong>งานบริการระบบเครือข่ายและบำรุงรักษา:</strong> มีรายได้สม่ำเสมอในทุกไตรมาส ช่วยสร้างเสถียรภาพกระแสเงินสด
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                      <span>
                        <strong>ภาษีมูลค่าเพิ่ม (VAT 7%):</strong> มีการคำนวณและบันทึกอัตโนมัติ พร้อมสำหรับการยื่นแบบ ภ.พ.30 ทุกสิ้นเดือน
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-blue-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-900">ระบบบันทึกภาษี:</span>
                  <span className="px-2.5 py-1 bg-white text-blue-800 rounded-md border border-blue-300 font-mono font-medium">
                    VAT Rate 7.00%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Invoices Quick Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">เอกสารใบเสร็จ/ใบกำกับภาษีล่าสุด</h3>
            <p className="text-xs text-slate-500">คลิกที่รายการเพื่อดูตัวอย่าง พิมพ์ หรือดาวน์โหลดเป็น PDF</p>
          </div>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 self-start cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            + ออกใบเสร็จ/ใบกำกับใหม่
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                <th className="py-2.5 px-3">เลขที่เอกสาร</th>
                <th className="py-2.5 px-3">วันที่</th>
                <th className="py-2.5 px-3">ชื่อลูกค้า</th>
                <th className="py-2.5 px-3 text-right">มูลค่ารวม</th>
                <th className="py-2.5 px-3 text-center">การชำระเงิน</th>
                <th className="py-2.5 px-3 text-center">คลาวด์</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.slice(0, 6).map(inv => (
                <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-blue-700">
                    {inv.documentNo}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{inv.documentDateThai}</td>
                  <td className="py-3 px-3 font-medium text-slate-900 max-w-xs truncate">
                    {inv.customerName}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ฿{formatCurrency(inv.grandTotal)}
                  </td>
                  <td className="py-3 px-3 text-center">
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
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex items-center text-emerald-600" title="สำรองข้อมูลบนคลาวด์แล้ว">
                      <CheckCircle className="w-4 h-4" />
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => onSelectInvoice(inv)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-white hover:bg-blue-600 border border-blue-200 rounded-md transition-all cursor-pointer"
                    >
                      ดูเอกสาร / พิมพ์
                    </button>
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
