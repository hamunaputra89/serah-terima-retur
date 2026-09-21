import { ExpeditionId, ExpeditionInfo, PackageCondition } from '../types';

export const EXPEDITIONS: ExpeditionInfo[] = [
  {
    id: 'spx',
    name: 'Shopee Xpress (SPX)',
    shortName: 'SPX Express',
    code: 'SPX',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    prefixes: ['SPXID', 'SPX'],
    sampleResi: 'SPXID04829103984',
  },
  {
    id: 'jnt',
    name: 'J&T Express',
    shortName: 'J&T',
    code: 'J&T',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    borderColor: 'border-red-500/30',
    prefixes: ['JP', 'JX', 'JT', '888', '555', 'JD0'],
    sampleResi: 'JP8273918237',
  },
  {
    id: 'sicepat',
    name: 'SiCepat Ekspres',
    shortName: 'SiCepat',
    code: 'SICEPAT',
    color: '#e11d48',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    prefixes: ['00', 'TKP', '001', '002', '000', '999'],
    sampleResi: '003928174628',
  },
  {
    id: 'jne',
    name: 'JNE Express',
    shortName: 'JNE',
    code: 'JNE',
    color: '#0284c7',
    bgColor: 'bg-sky-500/10',
    textColor: 'text-sky-400',
    borderColor: 'border-sky-500/30',
    prefixes: ['TLJR', 'JNE', 'CGK', '01', 'SOC', 'SUB', 'BDO', 'SRG'],
    sampleResi: 'TLJR0192847192',
  },
  {
    id: 'anteraja',
    name: 'Anteraja',
    shortName: 'Anteraja',
    code: 'ANTERAJA',
    color: '#ec4899',
    bgColor: 'bg-pink-500/10',
    textColor: 'text-pink-400',
    borderColor: 'border-pink-500/30',
    prefixes: ['1000', '1001', '1002', '1003', '100'],
    sampleResi: '1000492817263',
  },
  {
    id: 'ninja',
    name: 'Ninja Xpress',
    shortName: 'Ninja Xpress',
    code: 'NINJA',
    color: '#dc2626',
    bgColor: 'bg-red-600/10',
    textColor: 'text-red-500',
    borderColor: 'border-red-600/30',
    prefixes: ['NLID', 'SHP', 'NINJA'],
    sampleResi: 'NLIDAP01928374',
  },
  {
    id: 'idexpress',
    name: 'ID Express',
    shortName: 'ID Express',
    code: 'IDX',
    color: '#8b5cf6',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-400',
    borderColor: 'border-violet-500/30',
    prefixes: ['IDE', 'IDS'],
    sampleResi: 'IDS00918237461',
  },
  {
    id: 'lion',
    name: 'Lion Parcel',
    shortName: 'Lion Parcel',
    code: 'LION',
    color: '#ea580c',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    prefixes: ['LP', '99'],
    sampleResi: 'LP918273645',
  },
  {
    id: 'wahana',
    name: 'Wahana Express',
    shortName: 'Wahana',
    code: 'WAHANA',
    color: '#10b981',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    prefixes: ['WHA', 'WHN'],
    sampleResi: 'WHN82910293',
  },
  {
    id: 'pos',
    name: 'POS Indonesia',
    shortName: 'POS Indo',
    code: 'POS',
    color: '#f59e0b',
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/30',
    prefixes: ['POS', 'P1', 'P2', 'P3'],
    sampleResi: 'POS9283719283',
  },
  {
    id: 'lainnya',
    name: 'Ekspedisi Lain / Kargo',
    shortName: 'Lainnya',
    code: 'LAIN',
    color: '#64748b',
    bgColor: 'bg-slate-500/10',
    textColor: 'text-slate-400',
    borderColor: 'border-slate-500/30',
    prefixes: [],
    sampleResi: 'RESI987654321',
  },
];

export const CONDITION_LABELS: Record<PackageCondition, { label: string; badgeClass: string; desc: string }> = {
  baik: {
    label: 'Baik / Utuh',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    desc: 'Paket dalam kondisi segel dan kemasan rapi',
  },
  kemasan_rusak: {
    label: 'Kemasan Sobek / Penyot',
    badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    desc: 'Kardus atau bubble wrap penyot/robek sebagian',
  },
  basah_bocor: {
    label: 'Basah / Bocor',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    desc: 'Terkena air hujan atau cairan produk bocor',
  },
  label_pudar: {
    label: 'Barcode / Label Rusak',
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
    desc: 'Barcode buram atau label pengiriman robek',
  },
  segel_terbuka: {
    label: 'Segel / Lakban Terbuka',
    badgeClass: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    desc: 'Lakban dibuka atau bekas dibongkar',
  },
  indikasi_tertukar: {
    label: 'Indikasi Kosong / Tertukar',
    badgeClass: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    desc: 'Paket terasa sangat ringan atau tidak wajar',
  },
};

export function getExpedition(id: ExpeditionId): ExpeditionInfo {
  const found = EXPEDITIONS.find((exp) => exp.id === id);
  return (
    found || {
      id: 'lainnya',
      name: 'Ekspedisi Lain',
      shortName: 'Lainnya',
      code: 'LAIN',
      color: '#64748b',
      bgColor: 'bg-slate-500/10',
      textColor: 'text-slate-400',
      borderColor: 'border-slate-500/30',
      prefixes: [],
      sampleResi: 'RESI987654321',
    }
  );
}

/**
 * Intelligent Indonesian Expedition detector based on prefix patterns and length.
 */
export function detectExpedition(rawResi: string): ExpeditionId {
  const clean = rawResi.trim().toUpperCase();

  if (clean.startsWith('SPXID') || clean.startsWith('SPX')) {
    return 'spx';
  }
  if (
    clean.startsWith('JP') ||
    clean.startsWith('JX') ||
    clean.startsWith('JT') ||
    clean.startsWith('888') ||
    clean.startsWith('555') ||
    clean.startsWith('JD0')
  ) {
    return 'jnt';
  }
  if (
    clean.startsWith('TKP') ||
    clean.startsWith('00') ||
    clean.startsWith('001') ||
    clean.startsWith('002') ||
    clean.startsWith('000') ||
    clean.startsWith('999')
  ) {
    return 'sicepat';
  }
  if (
    clean.startsWith('TLJR') ||
    clean.startsWith('JNE') ||
    clean.startsWith('CGK') ||
    clean.startsWith('01') ||
    clean.startsWith('SOC') ||
    clean.startsWith('SUB') ||
    clean.startsWith('BDO')
  ) {
    return 'jne';
  }
  if (clean.startsWith('1000') || clean.startsWith('1001') || clean.startsWith('1002') || clean.startsWith('1003')) {
    return 'anteraja';
  }
  if (clean.startsWith('NLID') || clean.startsWith('SHP') || clean.startsWith('NINJA')) {
    return 'ninja';
  }
  if (clean.startsWith('IDE') || clean.startsWith('IDS')) {
    return 'idexpress';
  }
  if (clean.startsWith('LP') || clean.startsWith('99')) {
    return 'lion';
  }
  if (clean.startsWith('WHA') || clean.startsWith('WHN')) {
    return 'wahana';
  }
  if (clean.startsWith('POS') || clean.startsWith('P1') || clean.startsWith('P2')) {
    return 'pos';
  }

  // Fallback by digits pattern
  if (/^\d{12}$/.test(clean)) {
    return 'sicepat'; // SiCepat standard is 12 digits
  }
  if (/^\d{13,14}$/.test(clean)) {
    return 'anteraja'; // Anteraja standard is 13-14 digits
  }
  if (/^\d{15,16}$/.test(clean)) {
    return 'jne'; // JNE standard numeric resi is 15-16 digits
  }

  return 'lainnya';
}

export function cleanTrackingNumber(input: string): string {
  // Remove whitespace and invisible control characters commonly added by barcode guns
  return input.replace(/[\r\n\t\s]+/g, '').trim().toUpperCase();
}

/**
 * Intelligent parser for Barcode Kotak (QR Code & Data Matrix 2D) as well as 1D Barcode.
 * Many 2D barcodes contain URLs, JSON payloads, or pipe-delimited data.
 * This extracts the clean tracking number regardless of format.
 */
export function extractTrackingNumberFromBarcodeKotak(rawInput: string): {
  trackingNumber: string;
  isFrom2D: boolean;
  rawPayload?: string;
} {
  if (!rawInput) return { trackingNumber: '', isFrom2D: false };

  const trimmed = rawInput.trim();
  let candidate = trimmed;
  let isFrom2D = false;

  // 1. Check if it's a URL
  if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.includes('://')) {
    isFrom2D = true;
    try {
      const url = new URL(candidate);
      // Check standard query parameters used by couriers
      const params = ['tracking_number', 'awb', 'bill', 'bills', 'billCode', 'waybill', 'resi', 'code', 'no', 'c'];
      for (const p of params) {
        const val = url.searchParams.get(p);
        if (val && val.length >= 5) {
          candidate = val;
          break;
        }
      }
      // If not in query param, check last pathname segment (e.g. /track/SPXID04829103984)
      if (candidate === trimmed) {
        const segments = url.pathname.split('/').filter(Boolean);
        if (segments.length > 0) {
          const last = segments[segments.length - 1];
          if (last.length >= 6) {
            candidate = last;
          }
        }
      }
    } catch {
      // url parse error, fallback to regex search below
    }
  }

  // 2. Check if it's a JSON string (e.g. {"billCode":"JP8273918237"})
  if (candidate.startsWith('{') && candidate.endsWith('}')) {
    isFrom2D = true;
    try {
      const obj = JSON.parse(candidate);
      const possibleKeys = ['billCode', 'waybillNo', 'trackingNumber', 'tracking_number', 'awb', 'resi', 'code'];
      for (const k of possibleKeys) {
        if (obj[k] && typeof obj[k] === 'string') {
          candidate = obj[k];
          break;
        }
      }
    } catch {
      // not valid JSON
    }
  }

  // 3. Check if it's delimited by pipe (|), semicolon (;), comma (,), or colon (:)
  if (candidate.includes('|') || candidate.includes(';') || candidate.includes(':')) {
    isFrom2D = true;
    // Strip common labels like "AWB:", "RESI:", "NO:"
    candidate = candidate.replace(/^(AWB|RESI|NO|TRACK|CODE|BILL):\s*/i, '');

    // Split by delimiters
    const parts = candidate.split(/[|;,:]+/).map((p) => p.trim());
    // Find part that matches an Indonesian expedition prefix
    const matchedPart = parts.find((p) => {
      const upper = p.toUpperCase();
      return (
        upper.startsWith('SPXID') ||
        upper.startsWith('SPX') ||
        upper.startsWith('JP') ||
        upper.startsWith('JX') ||
        upper.startsWith('JT') ||
        upper.startsWith('888') ||
        upper.startsWith('00') ||
        upper.startsWith('TKP') ||
        upper.startsWith('TLJR') ||
        upper.startsWith('JNE') ||
        upper.startsWith('1000') ||
        upper.startsWith('NLID') ||
        upper.startsWith('IDE') ||
        upper.startsWith('IDS') ||
        upper.startsWith('LP') ||
        upper.startsWith('POS') ||
        /^\d{12,16}$/.test(upper)
      );
    });

    if (matchedPart) {
      candidate = matchedPart;
    } else if (parts.length > 0) {
      // Pick longest alphanumeric part
      candidate = parts.reduce((a, b) => (b.length > a.length ? b : a), parts[0]);
    }
  }

  // 4. Regex extraction for known Indonesian expedition tracking patterns anywhere inside the text
  const patterns = [
    /\b(SPXID[A-Z0-9]+)\b/i,
    /\b(SPX[A-Z0-9]+)\b/i,
    /\b(JP\d{8,14})\b/i,
    /\b(JX\d{8,14})\b/i,
    /\b(JT\d{8,14})\b/i,
    /\b(888\d{7,12})\b/i,
    /\b(555\d{7,12})\b/i,
    /\b(00\d{10})\b/i,
    /\b(TKP\d{7,12})\b/i,
    /\b(TLJR\d{8,12})\b/i,
    /\b(JNE\d{8,14})\b/i,
    /\b(1000\d{9,11})\b/i,
    /\b(NLID[A-Z0-9]+)\b/i,
    /\b(IDE\d{8,14})\b/i,
    /\b(IDS\d{8,14})\b/i,
    /\b(LP\d{8,12})\b/i,
    /\b(POS\d{8,12})\b/i,
  ];

  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match && match[1]) {
      candidate = match[1];
      if (candidate !== trimmed) {
        isFrom2D = true;
      }
      break;
    }
  }

  const finalClean = cleanTrackingNumber(candidate);
  return {
    trackingNumber: finalClean,
    isFrom2D: isFrom2D || trimmed !== finalClean,
    rawPayload: isFrom2D ? trimmed : undefined,
  };
}

