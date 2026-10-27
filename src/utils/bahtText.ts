/**
 * Thai Baht Text conversion utility
 * Standard Thai accounting format for converting number to text
 * e.g. 11,844.90 -> "หนึ่งหมื่นหนึ่งพันแปดร้อยสี่สิบสี่บาทเก้าสิบสตางค์"
 */

const THAI_DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const THAI_UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

function convertGroup(numStr: string): string {
  let result = '';
  const len = numStr.length;

  for (let i = 0; i < len; i++) {
    const digit = parseInt(numStr.charAt(i), 10);
    const pos = len - i - 1;

    if (digit !== 0) {
      if (pos === 0 && digit === 1 && len > 1 && numStr.charAt(len - 2) !== '0') {
        result += 'เอ็ด';
      } else if (pos === 1 && digit === 1) {
        result += 'สิบ';
      } else if (pos === 1 && digit === 2) {
        result += 'ยี่สิบ';
      } else {
        result += THAI_DIGITS[digit] + THAI_UNITS[pos];
      }
    }
  }

  return result;
}

export function numberToThaiBaht(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toFixed(2);
  const [bahtStr, satangStr] = formatted.split('.');

  let bahtText = '';

  // Handle numbers over 1 million
  if (bahtStr.length > 6) {
    const millions = bahtStr.slice(0, -6);
    const remainder = bahtStr.slice(-6);
    bahtText = convertGroup(millions) + 'ล้าน' + convertGroup(remainder);
  } else {
    bahtText = convertGroup(bahtStr);
  }

  if (bahtText === '') {
    bahtText = 'ศูนย์';
  }

  bahtText += 'บาท';

  const satangNum = parseInt(satangStr, 10);
  if (satangNum === 0) {
    bahtText += 'ถ้วน';
  } else {
    bahtText += convertGroup(satangStr) + 'สตางค์';
  }

  return isNegative ? 'ลบ' + bahtText : bahtText;
}

const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.',
  'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.',
  'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function toThaiDateString(isoDateStr: string): string {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return isoDateStr;

  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const thaiYear = date.getFullYear() + 543;

  return `${day} ${month} พ.ศ. ${thaiYear}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
}
