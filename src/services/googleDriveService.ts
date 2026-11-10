import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { InvoiceDocument, CompanySettings } from '../types/index.ts';
import { StorageService } from './storageService.ts';
import { formatCurrency, getInvoiceDisplayDate, numberToThaiBaht } from '../utils/bahtText.ts';

// 1. Initialize Firebase App and Auth
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่สามารถดึง Access Token จาก Google Auth ได้');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// 2. Google Drive Folder & File Management Utilities
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Find or create the root backup folder on Google Drive
 */
async function getOrCreateRootFolder(accessToken: string): Promise<string> {
  const query = encodeURIComponent("name='AS_Power_Invoice_Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const searchRes = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`ค้นหาโฟลเดอร์หลักบน Google Drive ไม่สำเร็จ: ${errText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create root folder
  const createRes = await fetch(DRIVE_FILES_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'AS_Power_Invoice_Backups',
      mimeType: 'application/vnd.google-apps.folder',
      description: 'โฟลเดอร์สำรองข้อมูลใบกำกับภาษี หจก. เอ. เอส. เพาเวอร์ เน็ทเวิร์ค'
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`ไม่สามารถสร้างโฟลเดอร์หลัก AS_Power_Invoice_Backups บน Drive ได้: ${errText}`);
  }

  const createdData = await createRes.json();
  return createdData.id;
}

/**
 * Find or create a subfolder for a specific document number (e.g. "690011")
 */
async function getOrCreateDocumentFolder(
  accessToken: string,
  parentFolderId: string,
  documentNo: string
): Promise<{ folderId: string; folderUrl: string }> {
  const safeDocNo = documentNo.replace(/'/g, "\\'");
  const query = encodeURIComponent(`name='${safeDocNo}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return {
        folderId: data.files[0].id,
        folderUrl: data.files[0].webViewLink || `https://drive.google.com/drive/folders/${data.files[0].id}`
      };
    }
  }

  // Create new folder for this document
  const createRes = await fetch(`${DRIVE_FILES_ENDPOINT}?fields=id,name,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: documentNo,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
      description: `โฟลเดอร์จัดเก็บสำรองเอกสารเลขที่ ${documentNo}`
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`สร้างโฟลเดอร์สำหรับเอกสาร ${documentNo} ไม่สำเร็จ: ${err}`);
  }

  const created = await createRes.json();
  return {
    folderId: created.id,
    folderUrl: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`
  };
}

/**
 * Upload or update a text/HTML/JSON file into the target Google Drive folder
 */
async function uploadOrUpdateFile(
  accessToken: string,
  parentFolderId: string,
  fileName: string,
  content: string,
  mimeType: string
): Promise<{ id: string; webViewLink?: string }> {
  // Check if file already exists in folder
  const safeFileName = fileName.replace(/'/g, "\\'");
  const query = encodeURIComponent(`name='${safeFileName}' and '${parentFolderId}' in parents and trashed=false`);
  const searchRes = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name,webViewLink)`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  let existingFileId: string | null = null;
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      existingFileId = data.files[0].id;
    }
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = existingFileId
    ? { mimeType }
    : {
        name: fileName,
        mimeType,
        parents: [parentFolderId]
      };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
    content +
    closeDelimiter;

  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink`
    : `${DRIVE_UPLOAD_ENDPOINT}&fields=id,name,webViewLink`;

  const method = existingFileId ? 'PATCH' : 'POST';

  const uploadRes = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`อัปโหลดไฟล์ ${fileName} ไม่สำเร็จ: ${err}`);
  }

  return uploadRes.json();
}

/**
 * Generate a pristine, self-contained HTML document for the invoice matching the exact A4 layout and styling
 */
export function generateStandaloneA4Html(invoice: InvoiceDocument, settings: CompanySettings): string {
  const era = settings.dateFormatPreference || 'buddhist';
  const displayDate = getInvoiceDisplayDate(invoice, era);
  const signDateStr = invoice.signDate ? getInvoiceDisplayDate({ documentDate: invoice.signDate }, era) : displayDate;
  const isNonVatCustomer = invoice.customerTaxId && (invoice.customerTaxId.length === 10 || invoice.customerTaxId.length === 11);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบเสร็จรับเงิน/ใบกำกับภาษี เลขที่ ${invoice.documentNo} - ${settings.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700;800&family=Bai+Jamjuree:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    @font-face {
      font-family: 'Angsana New';
      src: local('Angsana New'), local('AngsanaNew'), local('AngsanaUPC'), local('Angsana UPC');
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Angsana New', 'AngsanaUPC', 'Sarabun', -apple-system, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      line-height: 1.25;
      padding: 20px;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 12mm 15mm;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      position: relative;
    }
    @media print {
      body { background: transparent; padding: 0; }
      .sheet { box-shadow: none; padding: 10mm 12mm; width: 100%; min-height: 100%; page-break-after: avoid; }
      @page { size: A4 portrait; margin: 0; }
    }
    .grid { display: grid; }
    .header-grid { grid-template-columns: 140px 1fr auto; gap: 15px; align-items: start; }
    .cust-grid { grid-template-columns: 7fr 5fr; gap: 12px; margin-top: 10px; border: 1px solid #1e293b; padding: 8px 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #1e293b; padding: 5px 8px; font-size: 13.5pt; }
    th { background-color: #f1f5f9; font-weight: 700; text-align: center; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-bold { font-weight: 700; }
    .tabular { font-variant-numeric: tabular-nums; }
    .totals-grid { grid-template-columns: 7fr 5fr; gap: 12px; margin-top: 8px; border: 1px solid #1e293b; padding: 8px 12px; }
    .signatures-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
    .sig-box { border: 1px solid #1e293b; padding: 8px; text-align: center; font-size: 11pt; min-height: 110px; display: flex; flex-direction: column; justify-content: space-between; position: relative; }
  </style>
</head>
<body>
  <div class="sheet">
    <!-- Header -->
    <div class="grid header-grid">
      <div>
        <img src="${settings.logoUrl || settings.stampUrl}" alt="Logo" style="max-height: 85px; max-width: 130px; object-fit: contain;">
      </div>
      <div>
        <h2 style="font-size: 18pt; font-weight: 800; color: #0f172a;">${settings.name}</h2>
        <div style="font-size: 13pt; font-weight: 600; color: #334155;">(${settings.branch})</div>
        <div style="font-size: 12pt; color: #334155; margin-top: 2px;">ที่อยู่: ${settings.address}</div>
        <div style="font-size: 12pt; font-weight: 600; color: #0f172a; margin-top: 2px;">
          เลขประจำตัวผู้เสียภาษีอากร: <span class="tabular">${settings.taxId}</span> / สาขาที่ <span class="tabular">${settings.branchCode || '00000'}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="display: inline-block; border: 1.5px solid #0f172a; padding: 2px 8px; font-weight: 800; font-size: 12pt;">
          ต้นฉบับ / ORIGINAL
        </div>
        <div style="font-size: 10pt; color: #64748b; margin-top: 2px;">(เอกสารออกเป็นชุด)</div>
      </div>
    </div>

    <!-- Title -->
    <div style="text-align: center; margin: 10px 0 6px 0;">
      <h1 style="font-size: 20pt; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">ใบเสร็จรับเงิน / ใบกำกับภาษี</h1>
      <div style="font-size: 11pt; font-weight: 700; color: #475569; letter-spacing: 2px;">RECEIPT / TAX INVOICE</div>
    </div>

    <!-- Customer & Reference Grid -->
    <div class="grid cust-grid" style="font-size: 12.5pt;">
      <div>
        <div><strong style="display: inline-block; width: 110px;">รหัสลูกค้า:</strong> <span class="tabular">${invoice.customerCode || '-'}</span></div>
        <div style="margin-top: 2px;"><strong style="display: inline-block; width: 110px;">ชื่อลูกค้า:</strong> <strong>${invoice.customerName}</strong></div>
        <div style="margin-top: 2px;"><strong style="display: inline-block; width: 110px;">เลขผู้เสียภาษี:</strong> <span class="tabular">${invoice.customerTaxId || '-'}</span> (${invoice.customerBranch || 'สำนักงานใหญ่'})</div>
        <div style="margin-top: 2px;"><strong style="display: inline-block; width: 110px; vertical-align: top;">ที่อยู่:</strong> <span style="display: inline-block; width: calc(100% - 115px);">${invoice.customerAddress || '-'}</span></div>
        <div style="margin-top: 2px;"><strong style="display: inline-block; width: 110px;">โทรศัพท์:</strong> <span class="tabular">${invoice.customerPhone || '-'}</span></div>
      </div>
      <div style="border-left: 1px solid #cbd5e1; padding-left: 10px;">
        <div style="background: #eff6ff; padding: 2px 6px; border: 1px solid #bfdbfe; display: flex; justify-content: space-between;">
          <strong style="color: #1e3a8a;">เลขที่เอกสาร:</strong>
          <strong class="tabular" style="color: #1e3a8a; font-size: 14pt;">${invoice.documentNo}</strong>
        </div>
        <div style="margin-top: 4px; display: flex; justify-content: space-between;">
          <span>วันที่:</span>
          <strong>${displayDate}</strong>
        </div>
        <div style="margin-top: 2px; display: flex; justify-content: space-between;">
          <span>เลขที่ใบกำกับ:</span>
          <span>${isNonVatCustomer ? '-' : invoice.referenceNo || '………………'}</span>
        </div>
        <div style="margin-top: 2px; display: flex; justify-content: space-between;">
          <span>พนักงานขาย:</span>
          <span>${invoice.salesman || '-'}</span>
        </div>
        <div style="margin-top: 2px; display: flex; justify-content: space-between;">
          <span>วันครบกำหนด:</span>
          <span class="tabular">${invoice.paymentDueDate || '………………'}</span>
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 45px;">ลำดับ</th>
          <th>รายการ (Description)</th>
          <th style="width: 70px;">หน่วย</th>
          <th style="width: 65px;">จำนวน</th>
          <th style="width: 100px;">ราคา/หน่วย</th>
          <th style="width: 120px;">จำนวนเงิน (บาท)</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.items.map((it, idx) => `
          <tr>
            <td class="text-center tabular">${idx + 1}</td>
            <td>${it.description}</td>
            <td class="text-center">${it.unit}</td>
            <td class="text-center tabular">${it.quantity}</td>
            <td class="text-right tabular">${formatCurrency(it.unitPrice)}</td>
            <td class="text-right tabular text-bold">${formatCurrency(it.amount)}</td>
          </tr>
        `).join('')}
        ${Array.from({ length: Math.max(0, 4 - invoice.items.length) }).map(() => `
          <tr style="height: 28px;">
            <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals Grid -->
    <div class="grid totals-grid" style="font-size: 12pt;">
      <div>
        <div><strong>จำนวนเงินตัวอักษร:</strong> <span style="font-weight: 700; color: #1e3a8a;">(${invoice.totalThaiText || numberToThaiBaht(invoice.grandTotal)})</span></div>
        <div style="margin-top: 6px; font-size: 11pt; color: #475569;">
          <strong>หมายเหตุ:</strong> ${invoice.notes || settings.defaultNotes}
        </div>
      </div>
      <div style="border-left: 1px solid #cbd5e1; padding-left: 10px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>รวมเงิน / Subtotal:</span>
          <span class="tabular text-bold">${formatCurrency(invoice.subtotal)} บาท</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>ภาษีมูลค่าเพิ่ม VAT 7%:</span>
          <span class="tabular text-bold">${formatCurrency(invoice.vatAmount)} บาท</span>
        </div>
        ${invoice.withholdingTaxAmount > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px; color: #be123c;">
            <span>หัก ณ ที่จ่าย ${invoice.withholdingTaxRate}%:</span>
            <span class="tabular text-bold">-${formatCurrency(invoice.withholdingTaxAmount)} บาท</span>
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-top: 4px; padding-top: 4px; border-top: 1.5px solid #0f172a; font-size: 13.5pt;">
          <strong style="color: #1e3a8a;">จำนวนเงินรวมทั้งสิ้น:</strong>
          <strong class="tabular" style="color: #1e3a8a;">${formatCurrency(invoice.grandTotal)} บาท</strong>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="grid signatures-grid">
      <div class="sig-box">
        <div><strong>ผู้รับของ / ผู้ตรวจสอบ</strong></div>
        <div style="min-height: 40px; margin: 4px 0;">
          ${settings.collectorSignatureUrl ? `<img src="${settings.collectorSignatureUrl}" style="max-height: 40px; max-width: 140px; object-fit: contain;">` : ''}
        </div>
        <div>
          <div>(....................................................)</div>
          <div style="margin-top: 2px;">วันที่: ${signDateStr}</div>
        </div>
      </div>
      <div class="sig-box">
        <div><strong>ผู้ส่งของ / ผู้วางบิล</strong></div>
        <div style="min-height: 40px; margin: 4px 0;">
          ${settings.senderSignatureUrl ? `<img src="${settings.senderSignatureUrl}" style="max-height: 40px; max-width: 140px; object-fit: contain;">` : ''}
        </div>
        <div>
          <div>( ${settings.senderName || 'นายอภิวัฒน์ ส.'} )</div>
          <div style="margin-top: 2px;">วันที่: ${signDateStr}</div>
        </div>
      </div>
      <div class="sig-box" style="position: relative;">
        ${settings.stampUrl ? `
          <img src="${settings.stampUrl}" style="position: absolute; width: 85px; height: 85px; top: 10px; right: 8px; opacity: 0.85; pointer-events: none;">
        ` : ''}
        <div><strong>ในนาม ${settings.name}</strong></div>
        <div style="min-height: 40px; margin: 4px 0;">
          ${settings.signatureUrl ? `<img src="${settings.signatureUrl}" style="max-height: 45px; max-width: 140px; object-fit: contain;">` : ''}
        </div>
        <div>
          <div>( ${settings.authorizedSignerName} )</div>
          <div style="font-size: 10pt; color: #475569;">${settings.authorizedSignerTitle || 'หุ้นส่วนผู้จัดการ'}</div>
          <div style="margin-top: 2px;">ผู้มีอำนาจลงนาม</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Backup a single invoice document to Google Drive into a folder named after its documentNo (e.g. "690011")
 */
export async function backupInvoiceToGoogleDrive(
  invoice: InvoiceDocument,
  settings: CompanySettings
): Promise<{
  success: boolean;
  folderId?: string;
  folderUrl?: string;
  message: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google Drive ด้วยปุ่ม Sign in with Google ก่อนเริ่มการสำรองข้อมูล');
  }

  try {
    // 1. Get or create root folder
    const rootFolderId = await getOrCreateRootFolder(token);

    // 2. Get or create folder for this document number (e.g. "690011")
    const { folderId, folderUrl } = await getOrCreateDocumentFolder(token, rootFolderId, invoice.documentNo);

    // 3. Prepare JSON backup
    const backupJsonPayload = JSON.stringify(
      {
        backupSystem: 'AS_Power_Network_Cloud_Backup',
        exportedAt: new Date().toISOString(),
        documentNo: invoice.documentNo,
        invoiceData: invoice,
        companyInfo: {
          name: settings.name,
          taxId: settings.taxId,
          branch: settings.branch,
          phone: settings.phone,
          address: settings.address
        }
      },
      null,
      2
    );

    // Upload JSON file
    await uploadOrUpdateFile(
      token,
      folderId,
      `${invoice.documentNo}_ข้อมูลเอกสาร.json`,
      backupJsonPayload,
      'application/json'
    );

    // 4. Prepare Printable HTML snapshot
    const standaloneHtml = generateStandaloneA4Html(invoice, settings);
    await uploadOrUpdateFile(
      token,
      folderId,
      `${invoice.documentNo}_ใบกำกับภาษี_A4.html`,
      standaloneHtml,
      'text/html'
    );

    // 5. Update invoice with Google Drive metadata
    const updatedInvoice: InvoiceDocument = {
      ...invoice,
      googleDriveFolderId: folderId,
      googleDriveFolderUrl: folderUrl,
      googleDriveBackupAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    StorageService.updateInvoice(updatedInvoice);

    // Add audit log
    StorageService.addBackupLog({
      timestamp: new Date().toISOString(),
      recordsCount: 1,
      status: 'success',
      type: 'google_drive',
      message: `สำรองเอกสารเลขที่ ${invoice.documentNo} ลงโฟลเดอร์ Google Drive เรียบร้อย (${invoice.documentNo}/)`
    });

    return {
      success: true,
      folderId,
      folderUrl,
      message: `จัดเก็บและสำรองไฟล์เอกสาร ${invoice.documentNo} เข้า Google Drive เรียบร้อยแล้ว`
    };
  } catch (err: any) {
    console.error('Google Drive Backup Error:', err);
    StorageService.addBackupLog({
      timestamp: new Date().toISOString(),
      recordsCount: 1,
      status: 'failed',
      type: 'google_drive',
      message: `ล้มเหลวในการสำรองเอกสาร ${invoice.documentNo} ลง Drive: ${err.message}`
    });
    throw err;
  }
}

/**
 * Backup all invoices to Google Drive
 */
export async function backupAllInvoicesToGoogleDrive(
  invoices: InvoiceDocument[],
  settings: CompanySettings,
  onProgress?: (current: number, total: number, docNo: string) => void
): Promise<{
  success: boolean;
  backedUpCount: number;
  message: string;
}> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google Drive ด้วยปุ่ม Sign in with Google ก่อนเริ่มการสำรองข้อมูล');
  }

  let count = 0;
  for (let i = 0; i < invoices.length; i++) {
    const inv = invoices[i];
    if (onProgress) {
      onProgress(i + 1, invoices.length, inv.documentNo);
    }
    await backupInvoiceToGoogleDrive(inv, settings);
    count++;
  }

  // Update company settings with last Google Drive backup date
  const updatedSettings: CompanySettings = {
    ...settings,
    lastGoogleDriveBackupDate: new Date().toISOString()
  };
  StorageService.saveSettings(updatedSettings);

  return {
    success: true,
    backedUpCount: count,
    message: `สำรองเอกสารทั้งหมด ${count} ฉบับลงใน Google Drive แยกโฟลเดอร์ตามเลขที่เอกสารสำเร็จครบถ้วน`
  };
}
