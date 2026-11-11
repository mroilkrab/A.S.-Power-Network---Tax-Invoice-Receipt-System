# A.S. Power Network - Tax Invoice & Receipt System
### ระบบออกใบเสร็จรับเงิน/ใบกำกับภาษี ห้างหุ้นส่วนจำกัด เอ. เอส. เพาเวอร์ เน็ทเวิร์ค

ระบบบริหารจัดการและออกใบเสร็จรับเงิน/ใบกำกับภาษีขนาด A4 หน้าเดียว พร้อมระบบสแกนเอกสารนำเข้าด้วย AI (Gemini 3.8 Flash), สำรองข้อมูลขึ้น Google Drive แบบแยกโฟลเดอร์ตามเลขที่บิล, รายงานสรุปยอดขาย-ภาษี 12 เดือน และส่งออก CSV

---

## 🚀 คู่มือการเชื่อมต่อ GitHub และติดตั้งบน Vercel (Step-by-Step Guide)

### ส่วนที่ 1: การนำโค้ดขึ้น GitHub

1. **สร้าง Repository ใหม่บน GitHub**:
   - เข้าเว็บไซต์ [github.com/new](https://github.com/new)
   - ตั้งชื่อคลังโค้ด เช่น `aspower-tax-invoice`
   - เลือกเป็น **Private** (หรือ Public ตามความต้องการ)
   - ไม่ต้องติ๊กเลือก Add README (เพราะเรามีไฟล์ในระบบแล้ว)
   - กดปุ่ม **Create repository**

2. **เชื่อมต่อและส่งโค้ด (Push) ขึ้น GitHub**:
   เปิด Terminal ในโฟลเดอร์โปรเจกต์นี้ แล้วรันคำสั่ง:

   ```bash
   # 1. เริ่มต้น git (หากยังไม่เริ่ม)
   git init

   # 2. เพิ่มไฟล์ทั้งหมด
   git add .

   # 3. บันทึก Commit แรก
   git commit -m "feat: A.S. Power Network Tax Invoice & Receipt System"

   # 4. ตั้งชื่อ branch หลักเป็น main
   git branch -M main

   # 5. เชื่อมต่อกับคลังบน GitHub (เปลี่ยน YOUR_USERNAME และ REPO_NAME)
   git remote add origin https://github.com/YOUR_USERNAME/aspower-tax-invoice.git

   # 6. ส่งโค้ดขึ้น GitHub
   git push -u origin main
   ```

---

### ส่วนที่ 2: การติดตั้งและเปิดใช้งานบน Vercel (Deploy to Vercel)

โปรเจกต์นี้ได้รับการตั้งค่าไฟล์ `vercel.json` และ Serverless API (`/api/ai-analyze-document` และ `/api/health`) สำหรับ Vercel เรียบร้อยแล้ว

1. **เชื่อมต่อ Vercel กับ GitHub**:
   - เข้าเว็บไซต์ [vercel.com](https://vercel.com) และล็อกอินด้วยบัญชี GitHub
   - กดปุ่ม **Add New...** > **Project** (หรือไปที่ [vercel.com/new](https://vercel.com/new))
   - เลือก Repository ที่เพิ่ง Push ขึ้นไป เช่น `aspower-tax-invoice` แล้วกด **Import**

2. **ตั้งค่า Build Settings**:
   - **Framework Preset**: `Vite` (ระบบจะเลือกให้อัตโนมัติจาก `vercel.json`)
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **เพิ่ม Environment Variables (ค่าตัวแปรระบบ)**:
   ในหน้าตั้งค่าก่อนกด Deploy ให้เปิดหัวข้อ **Environment Variables** แล้วเพิ่ม:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: นำ API Key จาก [Google AI Studio](https://aistudio.google.com/apikey) มาใส่

4. **กดปุ่ม Deploy**:
   - Vercel จะทำการ Build และ Deploy ภายในเวลาไม่ถึง 1 นาที
   - เมื่อสำเร็จ คุณจะได้รับลิงก์ใช้งาน เช่น `https://aspower-tax-invoice.vercel.app`

---

### ส่วนที่ 3: การตั้งค่า Google Drive OAuth ให้ใช้งานบนโดเมน Vercel

เพื่อให้ระบบสำรองข้อมูลและเชื่อมต่อ Google Drive ทำงานได้อย่างสมบูรณ์บนโดเมน Vercel ของคุณ:

1. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือกโปรเจกต์: **aspower-receipt** (Project ID: `aspower-receipt`)
3. ไปที่เมนู **APIs & Services** > **Credentials**
4. คลิกแก้ไขที่ **OAuth 2.0 Client IDs** (Web client)
5. ในช่อง **Authorized JavaScript origins** ให้กด **+ ADD URI** แล้วเพิ่ม URL ของ Vercel:
   ```
   https://aspower-tax-invoice.vercel.app
   ```
6. ในช่อง **Authorized redirect URIs** ให้เพิ่ม URL เดียวกัน:
   ```
   https://aspower-tax-invoice.vercel.app
   ```
7. กด **Save** รอประมาณ 1-2 นาที คุณจะสามารถล็อกอิน Google Drive และสำรองไฟล์จากบน Vercel ได้ทันที!

---

## 🛠 เทคโนโลยีในระบบ (Tech Stack)
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend / Serverless**: Express & Vite Middleware (Local/Cloud Run) และ Vercel Serverless Functions (`/api/*`)
- **AI Core**: Gemini 3.8 Flash (`@google/genai`) สำหรับสกัดข้อมูลเอกสาร
- **Cloud Backup**: Google Drive REST API v3 (แยกโฟลเดอร์ตามเลขที่บิล) & Local IndexedDB/LocalStorage
- **Document Rendering**: Single-page A4 print stylesheet, Tabular Numbers, Thai Typographic line-break rules
