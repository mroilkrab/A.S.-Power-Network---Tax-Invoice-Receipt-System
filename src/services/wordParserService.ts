/**
 * Word Parser Service
 * Parses Microsoft Word (.docx) invoices and maps them to InvoiceDocument
 */
import mammoth from 'mammoth';
import { InvoiceDocument, InvoiceItem, CategoryType } from '../types/index.ts';
import { formatThaiDateWithTime, numberToBahtText } from '../utils/bahtText.ts';

export interface ExtractedInvoiceDraft {
  documentNo: string;
  documentDate: string;
  documentDateThai: string;
  customerCode: string;
  customerName: string;
  customerTaxId: string;
  customerBranch: string;
  customerAddress: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  withholdingTaxRate: number;
  withholdingTaxAmount: number;
  grandTotal: number;
  totalThaiText: string;
  paymentMethod: 'cash' | 'transfer' | 'cheque';
  categoryPrimary: CategoryType;
  notes: string;
  rawText: string;
  fileName: string;
}

export class WordParserService {
  /**
   * Parse a .docx file and convert into ExtractedInvoiceDraft
   */
  static async parseDocxFile(file: File): Promise<ExtractedInvoiceDraft> {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Extract HTML to easily parse tables
    const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
    const rawTextResult = await mammoth.extractRawText({ arrayBuffer });

    const html = htmlResult.value || '';
    const text = rawTextResult.value || '';

    return this.extractFromTextAndHtml(text, html, file.name);
  }

  /**
   * Parse extracted text and HTML tables to detect invoice fields
   */
  static extractFromTextAndHtml(text: string, html: string, fileName: string): ExtractedInvoiceDraft {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Detect Document Number (e.g., 690001, 69-001, INV-2026-001, เลขที่...)
    let docNo = '';
    const docNoMatch = text.match(/(?:เลขที่|เลขที่เอกสาร|Invoice\s*No\.?|Doc\s*No\.?)[:\s]*([A-Za-z0-9\-_/]+)/i);
    if (docNoMatch) {
      docNo = docNoMatch[1].trim();
    } else {
      // Look for 6-digit number starting with 69 or file name numbers
      const numMatch = text.match(/\b(69\d{4})\b/) || fileName.match(/(?:69\d{4}|INV[0-9\-]+)/i);
      docNo = numMatch ? numMatch[1] : `69${String(Math.floor(1000 + Math.random() * 9000))}`;
    }

    // 2. Detect Document Date
    let docDate = new Date().toISOString().split('T')[0];
    let docDateThai = '';

    // Patterns for Thai date like 15 มกราคม 2569 or 15/01/2569 or 2026-01-15
    const thaiDateMatch = text.match(/(\d{1,2})\s*(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{4}|25\d{2})/i);
    
    const slashDateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);

    const monthMap: Record<string, number> = {
      'มกราคม': 1, 'ม.ค.': 1,
      'กุมภาพันธ์': 2, 'ก.พ.': 2,
      'มีนาคม': 3, 'มี.ค.': 3,
      'เมษายน': 4, 'เม.ย.': 4,
      'พฤษภาคม': 5, 'พ.ค.': 5,
      'มิถุนายน': 6, 'มิ.ย.': 6,
      'กรกฎาคม': 7, 'ก.ค.': 7,
      'สิงหาคม': 8, 'ส.ค.': 8,
      'กันยายน': 9, 'ก.ย.': 9,
      'ตุลาคม': 10, 'ต.ค.': 10,
      'พฤศจิกายน': 11, 'พ.ย.': 11,
      'ธันวาคม': 12, 'ธ.ค.': 12
    };

    if (thaiDateMatch) {
      const day = parseInt(thaiDateMatch[1], 10);
      const mStr = thaiDateMatch[2];
      const month = monthMap[mStr] || 1;
      let yr = parseInt(thaiDateMatch[3], 10);
      const yrCe = yr > 2500 ? yr - 543 : yr;
      docDate = `${yrCe}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      docDateThai = `${day} ${mStr} ${yr > 2500 ? yr : yr + 543}`;
    } else if (slashDateMatch) {
      const day = parseInt(slashDateMatch[1], 10);
      const month = parseInt(slashDateMatch[2], 10);
      let yr = parseInt(slashDateMatch[3], 10);
      const yrCe = yr > 2500 ? yr - 543 : yr;
      docDate = `${yrCe}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (!docDateThai) {
      const d = new Date(docDate);
      const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      docDateThai = `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
    }

    // 3. Customer Info Extraction
    let customerName = '';
    let customerCode = '';
    let customerTaxId = '';
    let customerBranch = 'สำนักงานใหญ่';
    let customerAddress = '';
    let customerPhone = '';

    // Customer Name pattern
    const custNameMatch = text.match(/(?:ชื่อลูกค้า|นามผู้ซื้อ|ลูกค้า|ชื่อผู้ซื้อ|Customer\s*Name)[:\s]*([^\n\r]+)/i);
    if (custNameMatch) {
      customerName = custNameMatch[1].replace(/เลขประจำตัว.*$/, '').trim();
    } else {
      // Look for company keywords in lines
      const compLine = lines.find(l => 
        (l.includes('บริษัท') || l.includes('หจก.') || l.includes('ห้างหุ้นส่วน') || l.includes('จำกัด')) &&
        !l.includes('เอ. เอส. เพาเวอร์') && !l.includes('AS POWER')
      );
      if (compLine) customerName = compLine.trim();
    }

    // Tax ID pattern (13 digits)
    const taxMatch = text.match(/(?:เลขประจำตัวผู้เสียภาษี|Tax\s*ID|Tax\s*No\.?)[:\s]*([0-9\s\-]{13,17})/i) ||
                     text.match(/\b\d{1}\s*\d{4}\s*\d{5}\s*\d{2}\s*\d{1}\b/) ||
                     text.match(/\b\d{13}\b/);
    if (taxMatch) {
      customerTaxId = (taxMatch[1] || taxMatch[0]).replace(/[\s\-]/g, '');
    }

    // Customer Code (e.g., CUST-001, ASP-xxx, ลูกค้าเลขที่...)
    const codeMatch = text.match(/(?:รหัสลูกค้า|Customer\s*Code)[:\s]*([A-Za-z0-9\-_]+)/i);
    if (codeMatch) {
      customerCode = codeMatch[1].trim();
    } else if (customerName) {
      customerCode = 'CUST-' + Math.floor(100 + Math.random() * 900);
    }

    // Branch
    const branchMatch = text.match(/(?:สาขาที่|สาขา|Branch)[:\s]*([^\n\r,]+)/i);
    if (branchMatch) {
      customerBranch = branchMatch[1].trim();
    }

    // Phone
    const phoneMatch = text.match(/(?:โทร|โทรศัพท์|Tel|Phone)[:\s]*([0-9\s\-\(\)]{9,15})/i);
    if (phoneMatch) {
      customerPhone = phoneMatch[1].trim();
    }

    // Address
    const addrMatch = text.match(/(?:ที่อยู่|ที่ตั้ง|Address)[:\s]*([^\n\r]+(?:\n[^\n\r]+)?)/i);
    if (addrMatch) {
      customerAddress = addrMatch[1].replace(/(?:เลขประจำตัว|โทร|สาขา).*$/, '').trim();
    }

    // 4. Extract Items from HTML Tables or Text
    const items: InvoiceItem[] = [];
    if (html.includes('<table')) {
      // Parse HTML table rows using standard DOMParser in browser
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rows = Array.from(doc.querySelectorAll('tr'));

        rows.forEach((row, rowIndex) => {
          const cells = Array.from(row.querySelectorAll('td, th')).map(c => c.textContent?.trim() || '');
          if (cells.length >= 3) {
            // Check if this looks like a data row (contains number amount)
            const textContent = cells.join(' ');
            if (
              !textContent.includes('ลำดับ') &&
              !textContent.includes('รายการ') &&
              !textContent.includes('รวมเงิน') &&
              !textContent.includes('ภาษี') &&
              !textContent.includes('ยอดรวม')
            ) {
              // Try to find description and amount
              let desc = '';
              let qty = 1;
              let unit = 'งาน';
              let unitPrice = 0;
              let amount = 0;

              // Check each cell for numbers
              const numCells = cells.map(c => {
                const cleaned = c.replace(/[,฿\s]/g, '');
                const num = parseFloat(cleaned);
                return isNaN(num) ? null : num;
              });

              // Description usually longest text or 2nd column
              const textCells = cells.filter(c => isNaN(parseFloat(c.replace(/[,฿\s]/g, ''))));
              if (textCells.length > 0) {
                desc = textCells.reduce((a, b) => (a.length > b.length ? a : b), '');
              }

              // Filter valid positive numbers
              const validNums = numCells.filter((n): n is number => n !== null && n > 0);
              if (validNums.length >= 2) {
                if (validNums.length >= 3) {
                  qty = validNums[0];
                  unitPrice = validNums[1];
                  amount = validNums[2];
                } else {
                  unitPrice = validNums[0];
                  amount = validNums[1];
                  qty = 1;
                }
              } else if (validNums.length === 1 && validNums[0] > 50) {
                amount = validNums[0];
                unitPrice = validNums[0];
                qty = 1;
              }

              if (desc && (amount > 0 || unitPrice > 0)) {
                items.push({
                  id: 'item-' + (items.length + 1),
                  itemNo: items.length + 1,
                  description: desc,
                  quantity: qty || 1,
                  unit: unit,
                  unitPrice: unitPrice || amount,
                  amount: amount || unitPrice * qty,
                  category: 'งานบริการระบบเครือข่ายและไอที'
                });
              }
            }
          }
        });
      } catch (err) {
        console.warn('DOMParser failed on HTML table:', err);
      }
    }

    // Fallback: If no items found in HTML table, create from lines
    if (items.length === 0) {
      // Look for lines containing price patterns
      lines.forEach(line => {
        const moneyMatch = line.match(/(?:฿|\b)([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\b/g);
        if (moneyMatch && moneyMatch.length > 0 && !line.includes('รวม') && !line.includes('ภาษี') && !line.includes('VAT')) {
          const rawAmount = moneyMatch[moneyMatch.length - 1].replace(/,/g, '');
          const parsedAmount = parseFloat(rawAmount);
          if (parsedAmount > 100) {
            const desc = line.replace(/(?:฿|\b)([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\b/g, '').trim();
            if (desc.length > 3) {
              items.push({
                id: 'item-' + (items.length + 1),
                itemNo: items.length + 1,
                description: desc,
                quantity: 1,
                unit: 'งาน',
                unitPrice: parsedAmount,
                amount: parsedAmount,
                category: 'งานบริการระบบเครือข่ายและไอที'
              });
            }
          }
        }
      });
    }

    // Default item if still none found
    if (items.length === 0) {
      items.push({
        id: 'item-1',
        itemNo: 1,
        description: 'ค่าบริการตามเอกสารใบเสร็จ/ใบกำกับภาษีที่นำเข้า',
        quantity: 1,
        unit: 'รายการ',
        unitPrice: 10000,
        amount: 10000,
        category: 'งานบริการระบบเครือข่ายและไอที'
      });
    }

    // 5. Calculate Subtotal, VAT, Grand Total
    let subtotal = items.reduce((s, it) => s + it.amount, 0);

    // Try finding explicit subtotal in text
    const subtotalMatch = text.match(/(?:รวมเงิน|ราคาสินค้า|Subtotal)[:\s]*([0-9,]+\.?[0-9]*)/i);
    if (subtotalMatch) {
      const parsed = parseFloat(subtotalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) subtotal = parsed;
    }

    const vatRate = 7;
    let vatAmount = Math.round((subtotal * 0.07) * 100) / 100;
    const vatMatch = text.match(/(?:ภาษีมูลค่าเพิ่ม|VAT\s*7%)[:\s]*([0-9,]+\.?[0-9]*)/i);
    if (vatMatch) {
      const parsed = parseFloat(vatMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) vatAmount = parsed;
    }

    let withholdingTaxRate = 0;
    let withholdingTaxAmount = 0;
    const whtMatch = text.match(/(?:หัก\s*ณ\s*ที่จ่าย|WHT)[:\s]*([0-9,]+\.?[0-9]*)/i);
    if (whtMatch) {
      const parsed = parseFloat(whtMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        withholdingTaxAmount = parsed;
        withholdingTaxRate = 3;
      }
    }

    let grandTotal = subtotal + vatAmount - withholdingTaxAmount;
    const grandMatch = text.match(/(?:ยอดรวมสุทธิ|จำนวนเงินทั้งสิ้น|Grand\s*Total|Total)[:\s]*([0-9,]+\.?[0-9]*)/i);
    if (grandMatch) {
      const parsed = parseFloat(grandMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) grandTotal = parsed;
    }

    // Payment method detection
    let paymentMethod: 'cash' | 'transfer' | 'cheque' = 'transfer';
    if (text.includes('เงินสด')) paymentMethod = 'cash';
    else if (text.includes('เช็ค') || text.includes('Cheque')) paymentMethod = 'cheque';

    // Primary category detection
    let categoryPrimary: CategoryType = 'งานบริการระบบเครือข่ายและไอที';
    if (text.includes('คอมมิชชั่น') || text.includes('การตลาด')) categoryPrimary = 'ค่าคอมมิชชั่นและการตลาด';
    else if (text.includes('บำรุงรักษา') || text.includes('MA')) categoryPrimary = 'ค่าบริการบำรุงรักษา';
    else if (text.includes('อุปกรณ์') || text.includes('ฮาร์ดแวร์')) categoryPrimary = 'จำหน่ายอุปกรณ์และฮาร์ดแวร์';
    else if (text.includes('ที่ปรึกษา') || text.includes('พัฒนา')) categoryPrimary = 'ค่าที่ปรึกษาและพัฒนาระบบ';

    const totalThaiText = numberToBahtText(grandTotal);

    return {
      documentNo: docNo || `69${String(Math.floor(1000 + Math.random() * 9000))}`,
      documentDate: docDate,
      documentDateThai: docDateThai,
      customerCode: customerCode || 'CUST-001',
      customerName: customerName || 'บริษัทผู้ว่าจ้าง (นำเข้าจากไฟล์ Word)',
      customerTaxId: customerTaxId || '0105558000000',
      customerBranch: customerBranch || 'สำนักงานใหญ่',
      customerAddress: customerAddress || '-',
      customerPhone: customerPhone || '-',
      items,
      subtotal,
      vatRate,
      vatAmount,
      withholdingTaxRate,
      withholdingTaxAmount,
      grandTotal,
      totalThaiText,
      paymentMethod,
      categoryPrimary,
      notes: 'เอกสารนำเข้าจากไฟล์ Microsoft Word (' + fileName + ')',
      rawText: text,
      fileName
    };
  }

  /**
   * Convert draft to complete InvoiceDocument
   */
  static draftToInvoiceDocument(draft: ExtractedInvoiceDraft): InvoiceDocument {
    const now = new Date().toISOString();
    return {
      id: 'inv-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      documentNo: draft.documentNo,
      documentDate: draft.documentDate,
      documentDateThai: draft.documentDateThai,
      customerCode: draft.customerCode,
      customerName: draft.customerName,
      customerTaxId: draft.customerTaxId,
      customerBranch: draft.customerBranch,
      customerAddress: draft.customerAddress,
      customerPhone: draft.customerPhone,
      salesman: 'นายอภิวัฒน์ สาระสิทธิ์',
      paymentDueDate: draft.documentDate,
      items: draft.items,
      subtotal: draft.subtotal,
      vatRate: draft.vatRate,
      vatAmount: draft.vatAmount,
      withholdingTaxRate: draft.withholdingTaxRate,
      withholdingTaxAmount: draft.withholdingTaxAmount,
      grandTotal: draft.grandTotal,
      totalThaiText: draft.totalThaiText || numberToBahtText(draft.grandTotal),
      paymentMethod: draft.paymentMethod,
      status: 'paid',
      notes: draft.notes,
      categoryPrimary: draft.categoryPrimary,
      createdAt: now,
      updatedAt: now,
      syncedToCloud: true
    };
  }
}
