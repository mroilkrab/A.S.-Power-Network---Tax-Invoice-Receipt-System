import mammoth from 'mammoth';
import { InvoiceItem } from '../types/index.ts';

export interface ExtractedInvoiceData {
  customerName?: string;
  customerTaxId?: string;
  customerBranch?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerCode?: string;
  documentDate?: string;
  referenceNo?: string;
  salesman?: string;
  paymentDueDate?: string;
  paymentMethod?: 'transfer' | 'cash' | 'cheque';
  notes?: string;
  items?: {
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount?: number;
    category?: string;
  }[];
}

export class AiDocumentService {
  /**
   * Analyze an uploaded file (Image, PDF, Word docx, Text) using Gemini AI
   */
  static async analyzeDocument(file: File): Promise<ExtractedInvoiceData> {
    const filename = file.name.toLowerCase();

    // 1. If it's a Word document (.docx)
    if (filename.endsWith('.docx')) {
      return this.analyzeWordDocument(file);
    }

    // 2. If it's an Image (PNG, JPG, WebP)
    if (file.type.startsWith('image/')) {
      return this.analyzeImageDocument(file);
    }

    // 3. If it's a Text file (.txt, .csv, .json)
    if (file.type.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.csv')) {
      const text = await file.text();
      return this.analyzeRawText(text, file.name);
    }

    // 4. Fallback: Try reading as Base64 (e.g. PDF or other document)
    return this.analyzeFileAsBase64(file);
  }

  /**
   * Analyze Word (.docx) file by extracting text and sending to Gemini
   */
  private static async analyzeWordDocument(file: File): Promise<ExtractedInvoiceData> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extractedText = result.value || '';

      if (extractedText.trim().length > 0) {
        return await this.analyzeRawText(extractedText, file.name);
      }
    } catch (e) {
      console.warn('Mammoth extraction failed, falling back to base64 analysis:', e);
    }

    return this.analyzeFileAsBase64(file);
  }

  /**
   * Analyze Image document
   */
  private static async analyzeImageDocument(file: File): Promise<ExtractedInvoiceData> {
    const base64 = await this.fileToBase64(file);
    return this.callServerAiApi({
      imageBase64: base64,
      mimeType: file.type || 'image/jpeg',
      filename: file.name
    });
  }

  /**
   * Analyze arbitrary file as Base64 (e.g. PDF)
   */
  private static async analyzeFileAsBase64(file: File): Promise<ExtractedInvoiceData> {
    const base64 = await this.fileToBase64(file);
    return this.callServerAiApi({
      imageBase64: base64,
      mimeType: file.type || 'application/pdf',
      filename: file.name
    });
  }

  /**
   * Analyze raw text or pasted content
   */
  static async analyzeRawText(text: string, filename?: string): Promise<ExtractedInvoiceData> {
    return this.callServerAiApi({
      textContent: text,
      filename: filename || 'ข้อมูลข้อความที่คัดลอกมา'
    });
  }

  /**
   * Calls the server endpoint /api/ai-analyze-document
   */
  private static async callServerAiApi(payload: {
    textContent?: string;
    imageBase64?: string;
    mimeType?: string;
    filename?: string;
  }): Promise<ExtractedInvoiceData> {
    try {
      const response = await fetch('/api/ai-analyze-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: เซิร์ฟเวอร์ไม่สามารถวิเคราะห์เอกสารได้`);
      }

      const resJson = await response.json();
      if (!resJson.success || !resJson.data) {
        throw new Error('ไม่พบข้อมูลจากการวิเคราะห์ของ AI');
      }

      return resJson.data as ExtractedInvoiceData;
    } catch (err: any) {
      console.warn('Server AI API error, running local intelligent fallback parser:', err);
      // Fallback: If text content is available, run local regex parsing so the user still gets extracted data
      if (payload.textContent) {
        return this.localFallbackTextParse(payload.textContent);
      }
      throw err;
    }
  }

  /**
   * Local regex fallback parser for text when server AI is unavailable
   */
  private static localFallbackTextParse(text: string): ExtractedInvoiceData {
    const data: ExtractedInvoiceData = {
      items: []
    };

    // Customer Name
    const nameMatch = text.match(/(?:ชื่อลูกค้า|บริษัท|หจก\.|ผู้ซื้อ|นามผู้รับ|เรียน|ลูกค้า)\s*[:\s]\s*([^\n\r]+)/i);
    if (nameMatch) {
      data.customerName = nameMatch[1].trim();
    } else {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) data.customerName = lines[0];
    }

    // Tax ID (13 digits)
    const taxMatch = text.match(/(?:เลขประจำตัวผู้เสียภาษี|Tax\s*ID|เลขผู้เสียภาษี|Tax\s*No\.?)\s*[:\s]*(\d{13})/i)
      || text.match(/\b\d{13}\b/);
    if (taxMatch) {
      data.customerTaxId = taxMatch[1] || taxMatch[0];
    }

    // Branch
    const branchMatch = text.match(/(?:สาขา|สาขาที่)\s*[:\s]*([^\n\r,]+)/i);
    if (branchMatch) {
      data.customerBranch = branchMatch[1].trim();
    } else if (text.includes('สำนักงานใหญ่')) {
      data.customerBranch = 'สำนักงานใหญ่';
    }

    // Address
    const addrMatch = text.match(/(?:ที่อยู่|Address)\s*[:\s]\s*([^\n\r]+(?:\n[^\n\r]+)?)/i);
    if (addrMatch) {
      data.customerAddress = addrMatch[1].replace(/\n/g, ' ').trim();
    }

    // Phone
    const phoneMatch = text.match(/(?:โทร|โทรศัพท์|Tel|Phone)\s*[:\s]*([0-9\-\,\s]{9,20})/i);
    if (phoneMatch) {
      data.customerPhone = phoneMatch[1].trim();
    }

    // Items line detection
    const lines = text.split('\n');
    for (const line of lines) {
      const numMatch = line.match(/(.+?)\s+(\d+(?:\.\d+)?)\s+(เดือน|เครื่อง|ชุด|งาน|ชิ้น|รายการ|กล่อง|วัน)?\s*([\d,]+(?:\.\d{2})?)\s+([\d,]+(?:\.\d{2})?)/);
      if (numMatch) {
        const desc = numMatch[1].trim();
        const qty = parseFloat(numMatch[2]);
        const unit = numMatch[3] || 'รายการ';
        const price = parseFloat(numMatch[4].replace(/,/g, ''));
        const amt = parseFloat(numMatch[5].replace(/,/g, ''));
        if (desc && !isNaN(qty) && !isNaN(price)) {
          data.items?.push({
            description: desc,
            quantity: qty,
            unit,
            unitPrice: price,
            amount: amt || qty * price,
            category: 'บริการทั่วไป'
          });
        }
      }
    }

    return data;
  }

  /**
   * Helper: Convert File to base64 string
   */
  private static fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read file as base64 string'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
