export type ExpeditionId =
  | 'jnt'
  | 'spx'
  | 'sicepat'
  | 'jne'
  | 'anteraja'
  | 'ninja'
  | 'idexpress'
  | 'lion'
  | 'wahana'
  | 'pos'
  | 'lainnya';

export interface ExpeditionInfo {
  id: ExpeditionId;
  name: string;
  shortName: string;
  code: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  prefixes: string[];
  sampleResi: string;
}

export type PackageCondition =
  | 'baik'
  | 'kemasan_rusak'
  | 'basah_bocor'
  | 'label_pudar'
  | 'segel_terbuka'
  | 'indikasi_tertukar';

export interface ReturnItem {
  id: string;
  trackingNumber: string; // No Resi
  scannedAt: string; // ISO string
  expedition: ExpeditionId;
  detectedExpedition: ExpeditionId;
  condition: PackageCondition;
  note?: string;
  isMismatch?: boolean; // scanned resi belongs to a different courier than the locked session
  barcodeType?: '1d' | '2d_kotak';
}

export interface HandoverSession {
  id: string;
  bastNumber: string; // BAST-RET/YYYYMMDD/XXXX
  expedition: ExpeditionId | 'all'; // locked expedition or mixed/all
  courierName: string;
  courierPhone?: string;
  vehiclePlate?: string; // Plat No Kendaraan
  warehouseStaff: string; // Petugas Penerima
  warehouseLocation?: string; // Nama Gudang/Hub
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed';
  notes?: string;
  items: ReturnItem[];
}

export interface ScanFeedback {
  type: 'success' | 'duplicate' | 'mismatch' | 'error';
  message: string;
  trackingNumber: string;
  timestamp: number;
}
