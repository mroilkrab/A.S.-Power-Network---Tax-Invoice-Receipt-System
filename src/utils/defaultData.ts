import { CompanySettings, InvoiceDocument } from '../types/index.ts';
import { numberToThaiBaht } from './bahtText.ts';

// Stamp SVG data URI matching the uploaded "stamp a.s.power network.jpg"
export const DEFAULT_STAMP_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <filter id="stamp-texture">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <g filter="url(%23stamp-texture)" fill="#2563eb" stroke="#2563eb" opacity="0.92">
    <!-- Top Text Arc/Lines -->
    <text x="160" y="45" font-family="Arial, sans-serif" font-weight="900" font-size="12" text-anchor="middle" letter-spacing="1">A.S. POWER NETWORK LIMITED PARTNERSHIP</text>
    <text x="160" y="65" font-family="'Sarabun', Arial, sans-serif" font-weight="bold" font-size="14.5" text-anchor="middle" letter-spacing="0.5">ห้างหุ้นส่วนจำกัด เอ.เอส.เพาเวอร์ เน็ทเวิร์ค</text>
    
    <!-- Central Shield U Shape -->
    <path d="M 60 90 L 98 90 L 98 185 C 98 225 125 250 160 250 C 195 250 222 225 222 185 L 222 90 L 260 90 L 260 190 C 260 255 210 290 160 290 C 110 290 60 255 60 190 Z" fill="#2563eb" />
    
    <!-- Central Globe Circle -->
    <circle cx="160" cy="175" r="58" fill="#1d4ed8" stroke="#ffffff" stroke-width="3" />
    <!-- Globe lines -->
    <ellipse cx="160" cy="175" rx="32" ry="58" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.75" />
    <line x1="102" y1="175" x2="218" y2="175" stroke="#ffffff" stroke-width="2" opacity="0.75" />
    <line x1="108" y1="145" x2="212" y2="145" stroke="#ffffff" stroke-width="1.8" opacity="0.75" />
    <line x1="108" y1="205" x2="212" y2="205" stroke="#ffffff" stroke-width="1.8" opacity="0.75" />
    <!-- Continents silhouette outline -->
    <path d="M 135 140 Q 155 135 170 148 Q 165 170 150 185 Q 130 180 135 140 Z" fill="#ffffff" opacity="0.65" />
    <path d="M 160 185 Q 180 180 185 200 Q 170 220 155 210 Z" fill="#ffffff" opacity="0.65" />

    <!-- Letter A on Left Inside Shield -->
    <text x="79" y="165" font-family="Arial, serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">A</text>
    <!-- Letter S on Right Inside Shield -->
    <text x="241" y="165" font-family="Arial, serif" font-weight="900" font-size="44" fill="#ffffff" text-anchor="middle">S</text>
  </g>
</svg>`;

// Signature SVG matching the uploaded "signature aphiwatch.png"
export const DEFAULT_SIGNATURE_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 180" width="450" height="180">
  <g fill="none" stroke="#0035a0" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round">
    <!-- First curve: 'a' and wave 'm' -->
    <path d="M 45 135 C 35 100 65 60 85 90 C 95 105 75 145 60 140 C 45 135 50 100 80 85 C 95 78 105 135 110 115 C 115 100 125 125 135 105 C 145 85 155 130 165 115 C 175 100 185 135 190 120" />
    <!-- Capital 'S' sweeping curve -->
    <path d="M 270 30 C 295 20 340 45 315 85 C 295 115 255 125 250 145 C 245 165 295 175 345 145" />
    <!-- Diagonal stroke / -->
    <path d="M 380 75 L 420 40" stroke-width="6.5" />
  </g>
</svg>`;

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  name: 'ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค',
  branch: 'สำนักงานใหญ่',
  branchCode: '00000',
  address: 'เลขที่ 116/509 หมู่ที่ 5 ถ.พหลโยธิน 54 แขวงคลองถนน เขตสายไหม กรุงเทพมหานคร 10220',
  taxId: '0103545037206',
  businessRegistrationNo: '0103545037206',
  phone: '02-994-1188, 081-823-4567',
  email: 'aspowernetwork@gmail.com',
  website: 'www.aspowernetwork.com',
  lineId: '@aspowernetwork',

  // Logo, Signatures & Stamp
  logoUrl: DEFAULT_STAMP_SVG,
  showLogoOnPrint: true,
  stampUrl: DEFAULT_STAMP_SVG,
  signatureUrl: DEFAULT_SIGNATURE_SVG,
  authorizedSignerName: 'นายอภิวัฒน์ สาระสิทธิ์',
  authorizedSignerTitle: 'หุ้นส่วนผู้จัดการ',
  collectorSignatureUrl: '',
  collectorName: 'น.ส. ศิริพร พัฒนศิลป์',
  collectorTitle: 'ผู้รับเงิน / การเงิน',
  senderSignatureUrl: '',
  senderName: 'นายอภิวัฒน์ ส.',

  showStampOnPrint: true,
  showAuthorizedSignature: true,
  showCollectorSignature: true,
  showSenderSignature: true,
  showPromptPayQr: true,

  // Banking & Terms
  bankName: 'ธนาคารกสิกรไทย สาขาพหลโยธิน 54/1',
  bankAccountNo: '042-2-89412-3',
  bankAccountName: 'หจก. เอ.เอส. เพาเวอร์ เน็ทเวิร์ค',
  promptPayId: '0103545037206',
  defaultNotes: 'ได้รับสินค้าและบริการตามรายการข้างต้นถูกต้องเรียบร้อยแล้ว ในกรณีชำระด้วยเช็คจะสมบูรณ์เมื่อธนาคารได้เรียกเก็บเงินตามเช็คเรียบร้อยแล้ว',
  defaultPaymentTerms: 'กำหนดชำระเงินภายใน 30 วัน',
  defaultVatRate: 7,
  defaultWithholdingTaxRate: 0,

  invoicePrefix: '69',
  nextNumber: 690011,
  autoBackupDaily: true,
  lastBackupDate: new Date().toISOString(),
  dailyBackupNotification: true,

  // Font & Readability Settings Defaults (Comfortable & Clear)
  fontFamilyChoice: 'baijamjuree',
  systemFontFamilyChoice: 'baijamjuree',
  fontScalePreset: 'comfortable',
  companyHeaderFontSize: 18,
  documentBaseFontSize: 14.5,
  stampPosition: 'center',
  stampOpacity: 0.82
};

// Initial Seed Documents including the exact sample 690010 and full 12-month distribution
export const INITIAL_DOCUMENTS: InvoiceDocument[] = [
  // 1. The exact template document from prompt: 690010
  {
    id: 'inv-690010',
    documentNo: '690010',
    referenceNo: '',
    documentDate: '2026-10-15',
    documentDateThai: '15 ตุลาคม พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-10-31',
    items: [
      {
        id: 'item-1',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน กันยายน พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 11070.00,
        amount: 11070.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 11070.00,
    vatRate: 7,
    vatAmount: 774.90,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 11844.90,
    totalThaiText: 'หนึ่งหมื่นหนึ่งพันแปดร้อยสี่สิบสี่บาทเก้าสิบสตางค์',
    paymentMethod: 'transfer',
    transferBank: 'ธนาคารกสิกรไทย',
    transferDate: '2026-10-15',
    receiverName: 'ห้างหุ้นส่วนจำกัด เอ.เอส. เพาเวอร์ เน็ทเวิร์ค',
    senderName: 'นายอภิวัฒน์ ส.',
    authorizedSignerName: 'นายอภิวัฒน์ ส.',
    signDate: '2026-10-15',
    status: 'paid',
    notes: 'ชำระเงินเรียบร้อยผ่านบัญชีกสิกรไทย',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-10-15T09:30:00.000Z',
    updatedAt: '2026-10-15T09:30:00.000Z',
    syncedToCloud: true
  },
  // Additional historical documents covering Jan - Dec to ensure graphs display all 12 months completely
  {
    id: 'inv-690001',
    documentNo: '690001',
    referenceNo: 'QT-2601-01',
    documentDate: '2026-01-18',
    documentDateThai: '18 มกราคม พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-01-31',
    items: [
      {
        id: 'item-2',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน ธันวาคม พ.ศ. 2568',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 15400.00,
        amount: 15400.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 15400.00,
    vatRate: 7,
    vatAmount: 1078.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 16478.00,
    totalThaiText: numberToThaiBaht(16478.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-01-18T10:00:00.000Z',
    updatedAt: '2026-01-18T10:00:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690002',
    documentNo: '690002',
    referenceNo: '',
    documentDate: '2026-02-20',
    documentDateThai: '20 กุมภาพันธ์ พ.ศ. 2569',
    customerCode: 'CUST - 002',
    customerName: 'บริษัท สยาม ซิสเต็ม โซลูชั่นส์ จำกัด',
    customerTaxId: '0105553049182',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '88/12 ถนนรัชดาภิเษก แขวงจันทร์เกษม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-513-9000',
    salesman: 'นายสมชาย วิศวกรรม',
    paymentDueDate: '2026-02-28',
    items: [
      {
        id: 'item-3',
        itemNo: 1,
        description: 'งานบริการติดตั้งระบบเครือข่ายความเร็วสูง Fiber Optic',
        unit: 'จุด/งาน',
        quantity: 1,
        unitPrice: 28500.00,
        amount: 28500.00,
        category: 'งานบริการระบบเครือข่ายและไอที'
      }
    ],
    subtotal: 28500.00,
    vatRate: 7,
    vatAmount: 1995.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 30495.00,
    totalThaiText: numberToThaiBaht(30495.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'งานบริการระบบเครือข่ายและไอที',
    createdAt: '2026-02-20T11:00:00.000Z',
    updatedAt: '2026-02-20T11:00:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690003',
    documentNo: '690003',
    referenceNo: '',
    documentDate: '2026-03-25',
    documentDateThai: '25 มีนาคม พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-03-31',
    items: [
      {
        id: 'item-4',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน กุมภาพันธ์ พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 18200.00,
        amount: 18200.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 18200.00,
    vatRate: 7,
    vatAmount: 1274.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 19474.00,
    totalThaiText: numberToThaiBaht(19474.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-03-25T14:00:00.000Z',
    updatedAt: '2026-03-25T14:00:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690004',
    documentNo: '690004',
    referenceNo: '',
    documentDate: '2026-04-18',
    documentDateThai: '18 เมษายน พ.ศ. 2569',
    customerCode: 'CUST - 003',
    customerName: 'บริษัท บางกอก เน็ตเวิร์ค เซ็นเตอร์ จำกัด',
    customerTaxId: '0105556012891',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '45/8 อาคารสินสาธร ถนนกรุงธนบุรี แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
    customerPhone: '02-862-2345',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-04-30',
    items: [
      {
        id: 'item-5',
        itemNo: 1,
        description: 'อุปกรณ์ Cisco Gigabit Switch & Access Point PoE',
        unit: 'ชุด',
        quantity: 2,
        unitPrice: 16500.00,
        amount: 33000.00,
        category: 'จำหน่ายอุปกรณ์และฮาร์ดแวร์'
      }
    ],
    subtotal: 33000.00,
    vatRate: 7,
    vatAmount: 2310.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 35310.00,
    totalThaiText: numberToThaiBaht(35310.00),
    paymentMethod: 'cheque',
    chequeBank: 'กสิกรไทย',
    chequeNo: '7729104',
    status: 'paid',
    categoryPrimary: 'จำหน่ายอุปกรณ์และฮาร์ดแวร์',
    createdAt: '2026-04-18T10:15:00.000Z',
    updatedAt: '2026-04-18T10:15:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690005',
    documentNo: '690005',
    referenceNo: '',
    documentDate: '2026-05-22',
    documentDateThai: '22 พฤษภาคม พ.ศ. 2569',
    customerCode: 'CUST - 004',
    customerName: 'ห้างหุ้นส่วนจำกัด ไทยเทค เอ็นจิเนียริ่ง',
    customerTaxId: '0103551029841',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '99/50 หมู่ 2 ถนนรามอินทรา แขวงอนุสาวรีย์ เขตบางเขน กรุงเทพฯ',
    customerPhone: '02-970-5544',
    salesman: 'นายสมชาย วิศวกรรม',
    paymentDueDate: '2026-05-31',
    items: [
      {
        id: 'item-6',
        itemNo: 1,
        description: 'ค่าบริการบำรุงรักษาระบบเครือข่ายและ Server ประจำไตรมาส 2',
        unit: 'ไตรมาส',
        quantity: 1,
        unitPrice: 22000.00,
        amount: 22000.00,
        category: 'ค่าบริการบำรุงรักษา'
      }
    ],
    subtotal: 22000.00,
    vatRate: 7,
    vatAmount: 1540.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 23540.00,
    totalThaiText: numberToThaiBaht(23540.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าบริการบำรุงรักษา',
    createdAt: '2026-05-22T13:20:00.000Z',
    updatedAt: '2026-05-22T13:20:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690006',
    documentNo: '690006',
    referenceNo: '',
    documentDate: '2026-06-15',
    documentDateThai: '15 มิถุนายน พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-06-30',
    items: [
      {
        id: 'item-7',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน พฤษภาคม พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 19800.00,
        amount: 19800.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 19800.00,
    vatRate: 7,
    vatAmount: 1386.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 21186.00,
    totalThaiText: numberToThaiBaht(21186.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-06-15T15:10:00.000Z',
    updatedAt: '2026-06-15T15:10:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690007',
    documentNo: '690007',
    referenceNo: '',
    documentDate: '2026-07-20',
    documentDateThai: '20 กรกฎาคม พ.ศ. 2569',
    customerCode: 'CUST - 005',
    customerName: 'บริษัท ดิจิทัล อินฟราสตรัคเจอร์ จำกัด',
    customerTaxId: '0105558091234',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '123 อาคารซันทาวเวอร์ส บี ถนนวิภาวดีรังสิต แขวงจอมพล เขตจตุจักร กรุงเทพฯ',
    customerPhone: '02-617-8000',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-07-31',
    items: [
      {
        id: 'item-8',
        itemNo: 1,
        description: 'ค่าบริการให้คำปรึกษาและออกแบบระบบความปลอดภัยไอที (Network Security)',
        unit: 'โครงการ',
        quantity: 1,
        unitPrice: 45000.00,
        amount: 45000.00,
        category: 'ค่าที่ปรึกษาและพัฒนาระบบ'
      }
    ],
    subtotal: 45000.00,
    vatRate: 7,
    vatAmount: 3150.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 48150.00,
    totalThaiText: numberToThaiBaht(48150.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าที่ปรึกษาและพัฒนาระบบ',
    createdAt: '2026-07-20T09:40:00.000Z',
    updatedAt: '2026-07-20T09:40:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690008',
    documentNo: '690008',
    referenceNo: '',
    documentDate: '2026-08-16',
    documentDateThai: '16 สิงหาคม พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-08-31',
    items: [
      {
        id: 'item-9',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน กรกฎาคม พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 14500.00,
        amount: 14500.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 14500.00,
    vatRate: 7,
    vatAmount: 1015.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 15515.00,
    totalThaiText: numberToThaiBaht(15515.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-08-16T11:25:00.000Z',
    updatedAt: '2026-08-16T11:25:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690009',
    documentNo: '690009',
    referenceNo: '',
    documentDate: '2026-09-18',
    documentDateThai: '18 กันยายน พ.ศ. 2569',
    customerCode: 'CUST - 002',
    customerName: 'บริษัท สยาม ซิสเต็ม โซลูชั่นส์ จำกัด',
    customerTaxId: '0105553049182',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '88/12 ถนนรัชดาภิเษก แขวงจันทร์เกษม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-513-9000',
    salesman: 'นายสมชาย วิศวกรรม',
    paymentDueDate: '2026-09-30',
    items: [
      {
        id: 'item-10',
        itemNo: 1,
        description: 'งานเดินสาย LAN Cat6 และจัดระเบียบตู้ Rack Network Server',
        unit: 'จุด/งาน',
        quantity: 1,
        unitPrice: 24000.00,
        amount: 24000.00,
        category: 'งานบริการระบบเครือข่ายและไอที'
      }
    ],
    subtotal: 24000.00,
    vatRate: 7,
    vatAmount: 1680.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 25680.00,
    totalThaiText: numberToThaiBaht(25680.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'งานบริการระบบเครือข่ายและไอที',
    createdAt: '2026-09-18T10:45:00.000Z',
    updatedAt: '2026-09-18T10:45:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690011',
    documentNo: '690011',
    referenceNo: '',
    documentDate: '2026-11-12',
    documentDateThai: '12 พฤศจิกายน พ.ศ. 2569',
    customerCode: 'CUST - 003',
    customerName: 'บริษัท บางกอก เน็ตเวิร์ค เซ็นเตอร์ จำกัด',
    customerTaxId: '0105556012891',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: '45/8 อาคารสินสาธร ถนนกรุงธนบุรี แขวงคลองต้นไทร เขตคลองสาน กรุงเทพฯ',
    customerPhone: '02-862-2345',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-11-30',
    items: [
      {
        id: 'item-11',
        itemNo: 1,
        description: 'ค่าบริการตรวจเช็คและบำรุงรักษาระบบ Firewall ป้องกันภัยคุกคาม',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 17500.00,
        amount: 17500.00,
        category: 'ค่าบริการบำรุงรักษา'
      }
    ],
    subtotal: 17500.00,
    vatRate: 7,
    vatAmount: 1225.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 18725.00,
    totalThaiText: numberToThaiBaht(18725.00),
    paymentMethod: 'transfer',
    status: 'pending',
    categoryPrimary: 'ค่าบริการบำรุงรักษา',
    createdAt: '2026-11-12T09:15:00.000Z',
    updatedAt: '2026-11-12T09:15:00.000Z',
    syncedToCloud: true
  },
  {
    id: 'inv-690012',
    documentNo: '690012',
    referenceNo: '',
    documentDate: '2026-12-20',
    documentDateThai: '20 ธันวาคม พ.ศ. 2569',
    customerCode: 'UNI - 001',
    customerName: 'บริษัท อาร์เอส คอนเน็ค จำกัด (สำนักงานใหญ่)',
    customerTaxId: '0105544021316',
    customerBranch: 'สำนักงานใหญ่',
    customerAddress: 'เลขที่ 27 อาคาร เชษฐโชติ ทาวเวอร์ เอ ชั้นที่ 3 ถนนประเสริฐมนูกิจ แขวงเสนานิคม เขตจตุจักร กรุงเทพฯ 10900',
    customerPhone: '02-02-002-8888',
    salesman: 'นายอภิวัฒน์ ส.',
    paymentDueDate: '2026-12-31',
    items: [
      {
        id: 'item-12',
        itemNo: 1,
        description: 'ค่าคอมมิชชั่น เดือน พฤศจิกายน พ.ศ. 2569',
        unit: 'เดือน',
        quantity: 1,
        unitPrice: 21500.00,
        amount: 21500.00,
        category: 'ค่าคอมมิชชั่นและการตลาด'
      }
    ],
    subtotal: 21500.00,
    vatRate: 7,
    vatAmount: 1505.00,
    withholdingTaxRate: 0,
    withholdingTaxAmount: 0,
    grandTotal: 23005.00,
    totalThaiText: numberToThaiBaht(23005.00),
    paymentMethod: 'transfer',
    status: 'paid',
    categoryPrimary: 'ค่าคอมมิชชั่นและการตลาด',
    createdAt: '2026-12-20T16:00:00.000Z',
    updatedAt: '2026-12-20T16:00:00.000Z',
    syncedToCloud: true
  }
];

// Historical baseline for year comparison (2568 / 2025)
export const PREVIOUS_YEAR_TOTALS = {
  yearThai: 2568,
  yearCe: 2025,
  totalSales: 228400,
  totalVat: 15988,
  grandTotal: 244388,
  categories: {
    'ค่าคอมมิชชั่นและการตลาด': 118000,
    'งานบริการระบบเครือข่ายและไอที': 48500,
    'ค่าบริการบำรุงรักษา': 32400,
    'จำหน่ายอุปกรณ์และฮาร์ดแวร์': 19500,
    'ค่าที่ปรึกษาและพัฒนาระบบ': 10000
  }
};
