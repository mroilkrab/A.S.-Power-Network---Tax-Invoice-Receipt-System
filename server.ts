import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY)
  });
});

// AI Document Analysis Endpoint using Gemini 3.8 Flash
app.post('/api/ai-analyze-document', async (req, res) => {
  try {
    const { textContent, imageBase64, mimeType, filename } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'ไม่พบ GEMINI_API_KEY บนเซิร์ฟเวอร์ กรุณาตรวจสอบการตั้งค่า Secrets'
      });
    }

    const ai = new GoogleGenAI();

    const parts: any[] = [];
    if (imageBase64 && mimeType) {
      // Clean up base64 prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64
        }
      });
    }

    if (textContent && textContent.trim()) {
      parts.push({
        text: `เนื้อหาข้อความจากเอกสาร (${filename || 'เอกสารนำเข้า'}):\n${textContent}`
      });
    }

    parts.push({
      text: `คุณคือ AI ผู้ช่วยอัจฉริยะด้านการออกใบกำกับภาษีและใบเสร็จรับเงินของ "ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค"
กรุณาวิเคราะห์เอกสารที่แนบมานี้ (เช่น ใบเสนอราคา, ใบแจ้งหนี้, ใบเสร็จ, ใบสั่งซื้อ PO, สัญญา, หรือไฟล์สแกน) 
และสกัดข้อมูลลูกค้าพร้อมรายการสินค้า/บริการทั้งหมด เพื่อนำไปกรอกลงในแบบฟอร์มใบเสร็จรับเงิน/ใบกำกับภาษีโดยอัตโนมัติ

คำแนะนำในการสกัดข้อมูล:
1. customerName: ชื่อบริษัท/ชื่อลูกค้า เช่น "บริษัท อาร์เอส คอนเน็ค จำกัด" (ตัดคำว่า สำนักงานใหญ่ ออกเพื่อใส่ใน customerBranch)
2. customerTaxId: เลขประจำตัวผู้เสียภาษี 13 หลักของลูกค้า (เป็นตัวเลขล้วน 13 หลัก ถ้ามี)
3. customerBranch: สาขา เช่น "สำนักงานใหญ่" หรือ "สาขาที่ 00001" (หากไม่มีระบุ ให้ใช้ "สำนักงานใหญ่")
4. customerAddress: ที่อยู่ลูกค้าอย่างครบถ้วน (เลขที่, อาคาร, ชั้น, ซอย, ถนน, แขวง/ตำบล, เขต/อำเภอ, จังหวัด, รหัสไปรษณีย์)
5. customerPhone: เบอร์โทรศัพท์ติดต่อของลูกค้า (ถ้ามี)
6. customerCode: รหัสลูกค้า เช่น "UNI-001" หรือย่อจากชื่อลูกค้า เช่น "RS-001"
7. documentDate: วันที่เอกสารในรูปแบบ YYYY-MM-DD (หากไม่มีให้ใช้วันนี้)
8. referenceNo: เลขที่อ้างอิง เช่น เลขที่ใบสั่งซื้อ PO หรือเลขที่ใบกำกับเดิม
9. salesman: ชื่อพนักงานขาย (ถ้ามีในเอกสาร)
10. paymentDueDate: วันครบกำหนดชำระ YYYY-MM-DD
11. paymentMethod: วิธีชำระเงิน ('transfer', 'cash', หรือ 'cheque')
12. notes: หมายเหตุหรือเงื่อนไขการส่งมอบ/บริการ
13. items: รายการสินค้า/บริการทั้งหมด แต่ละรายการให้ระบุ description, quantity, unit, unitPrice, amount, category

ส่งออกผลลัพธ์เป็น JSON ตาม Schema ที่กำหนด`
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerTaxId: { type: Type.STRING },
            customerBranch: { type: Type.STRING },
            customerAddress: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            customerCode: { type: Type.STRING },
            documentDate: { type: Type.STRING },
            referenceNo: { type: Type.STRING },
            salesman: { type: Type.STRING },
            paymentDueDate: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            notes: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  amount: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ['description', 'quantity', 'unitPrice']
              }
            }
          },
          required: ['customerName']
        }
      }
    });

    const jsonStr = (response.text ?? '{}').trim();
    const parsedData = JSON.parse(jsonStr);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error analyzing document with Gemini:', error);
    return res.status(500).json({
      error: 'เกิดข้อผิดพลาดในการวิเคราะห์เอกสาร: ' + (error.message || String(error))
    });
  }
});

// Vite middleware in development or static in production
const distDir = path.resolve(__dirname, 'dist');
const distIndex = path.resolve(distDir, 'index.html');
const hasBuiltDist = fs.existsSync(distIndex);

if (process.env.NODE_ENV === 'production' && hasBuiltDist) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(distIndex);
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR !== 'true'
    },
    appType: 'spa'
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
