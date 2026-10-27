export type CategoryType = 
  | 'ค่าคอมมิชชั่นและการตลาด'
  | 'งานบริการระบบเครือข่ายและไอที'
  | 'ค่าบริการบำรุงรักษา'
  | 'จำหน่ายอุปกรณ์และฮาร์ดแวร์'
  | 'ค่าที่ปรึกษาและพัฒนาระบบ';

export interface InvoiceItem {
  id: string;
  itemNo: number;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  category: CategoryType;
}

export type PaymentMethod = 'cash' | 'cheque' | 'transfer';
export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';

export interface InvoiceDocument {
  id: string;
  documentNo: string;
  referenceNo?: string;
  documentDate: string; // YYYY-MM-DD
  documentDateThai: string;
  customerCode: string;
  customerName: string;
  customerTaxId: string;
  customerBranch: string;
  customerAddress: string;
  customerPhone: string;
  salesman: string;
  paymentDueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number; // e.g. 7
  vatAmount: number;
  withholdingTaxRate: number; // e.g. 0 or 3
  withholdingTaxAmount: number;
  grandTotal: number;
  totalThaiText: string;
  paymentMethod: PaymentMethod;
  chequeBank?: string;
  chequeNo?: string;
  chequeDate?: string;
  transferBank?: string;
  transferDate?: string;
  receiverName?: string;
  senderName?: string;
  authorizedSignerName?: string;
  signDate?: string;
  status: InvoiceStatus;
  notes?: string;
  categoryPrimary: CategoryType;
  createdAt: string;
  updatedAt: string;
  syncedToCloud: boolean;
}

export interface CompanySettings {
  name: string;
  branch: string;
  branchCode: string;
  address: string;
  taxId: string;
  businessRegistrationNo: string;
  phone: string;
  email: string;
  website: string;
  lineId: string;

  // Logo, Signatures & Stamp
  logoUrl: string; // Header logo
  showLogoOnPrint: boolean;
  stampUrl: string; // Official seal/stamp
  signatureUrl: string; // Authorized signatory
  authorizedSignerName: string;
  authorizedSignerTitle: string;
  collectorSignatureUrl?: string; // Cashier / Collector
  collectorName?: string;
  collectorTitle?: string;
  senderSignatureUrl?: string; // Delivery / Sender
  senderName?: string;

  showStampOnPrint: boolean;
  showAuthorizedSignature: boolean;
  showCollectorSignature: boolean;
  showSenderSignature: boolean;
  showPromptPayQr: boolean;

  // Banking & Terms
  bankName: string;
  bankAccountNo: string;
  bankAccountName: string;
  promptPayId: string;
  defaultNotes: string;
  defaultPaymentTerms: string;
  defaultVatRate: number;
  defaultWithholdingTaxRate: number;

  // Numbering & Backups
  invoicePrefix: string;
  nextNumber: number;
  autoBackupDaily: boolean;
  lastBackupDate: string | null;
  dailyBackupNotification: boolean;

  // Font & Readability Settings
  fontFamilyChoice?: 'baijamjuree' | 'sarabun' | 'prompt' | 'browallia' | 'kanit' | 'system';
  systemFontFamilyChoice?: 'baijamjuree' | 'sarabun' | 'prompt' | 'browallia' | 'kanit' | 'system';
  fontScalePreset?: 'standard' | 'comfortable' | 'large';
  companyHeaderFontSize?: number; // e.g. 18, 20, 22
  documentBaseFontSize?: number; // e.g. 13.5, 14.5, 16

  // Stamp & Signature Alignment
  stampPosition?: 'center' | 'left' | 'right' | 'watermark';
  stampOpacity?: number;
}

export interface BackupLog {
  id: string;
  timestamp: string;
  recordsCount: number;
  status: 'success' | 'failed';
  type: 'manual' | 'daily_auto' | 'hybrid_cloud';
  message: string;
}
