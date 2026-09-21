import { HandoverSession, ReturnItem, ExpeditionId } from '../types';

const STORAGE_KEY_SESSIONS = 'retur_handover_sessions_v2';
const STORAGE_KEY_ACTIVE_ID = 'retur_handover_active_id_v2';
const STORAGE_KEY_SETTINGS = 'retur_handover_settings_v2';

export interface AppSettings {
  soundEnabled: boolean;
  voiceEnabled: boolean;
  autoFocus: boolean;
  vibrateEnabled: boolean;
  allowMismatch: boolean; // if false, block/warn different courier resi
  defaultStaffName: string;
  defaultWarehouse: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  voiceEnabled: false,
  autoFocus: true,
  vibrateEnabled: true,
  allowMismatch: true,
  defaultStaffName: 'Budi (Admin Retur)',
  defaultWarehouse: 'Gudang Pusat Jakarta',
};

// Initial realistic sample data
const INITIAL_SAMPLE_SESSION: HandoverSession = {
  id: 'sess-sample-01',
  bastNumber: `BAST-RET/${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}/001`,
  expedition: 'spx',
  courierName: 'Rian Pratama',
  courierPhone: '081298765432',
  vehiclePlate: 'B 3829 KJL',
  warehouseStaff: 'Budi (Admin Retur)',
  warehouseLocation: 'Hub Logistik Cakung',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
  updatedAt: new Date(Date.now() - 1200000).toISOString(),
  status: 'active',
  notes: 'Retur gagal kirim COD & pembeli pindah alamat',
  items: [
    {
      id: 'item-1',
      trackingNumber: 'SPXID04829103984',
      scannedAt: new Date(Date.now() - 3500000).toISOString(),
      expedition: 'spx',
      detectedExpedition: 'spx',
      condition: 'baik',
      note: 'Paket segel utuh',
    },
    {
      id: 'item-2',
      trackingNumber: 'SPXID04829103985',
      scannedAt: new Date(Date.now() - 3200000).toISOString(),
      expedition: 'spx',
      detectedExpedition: 'spx',
      condition: 'kemasan_rusak',
      note: 'Kardus penyot sudut kiri',
    },
    {
      id: 'item-3',
      trackingNumber: 'SPXID04829103986',
      scannedAt: new Date(Date.now() - 2800000).toISOString(),
      expedition: 'spx',
      detectedExpedition: 'spx',
      condition: 'baik',
    },
    {
      id: 'item-4',
      trackingNumber: 'SPXID04829103990',
      scannedAt: new Date(Date.now() - 2500000).toISOString(),
      expedition: 'spx',
      detectedExpedition: 'spx',
      condition: 'segel_terbuka',
      note: 'Lakban samping terpotong',
    },
    {
      id: 'item-5',
      trackingNumber: 'SPXID04829103991',
      scannedAt: new Date(Date.now() - 2100000).toISOString(),
      expedition: 'spx',
      detectedExpedition: 'spx',
      condition: 'baik',
    },
  ],
};

export function loadSessions(): HandoverSession[] {
  if (typeof window === 'undefined') return [INITIAL_SAMPLE_SESSION];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) {
      saveSessions([INITIAL_SAMPLE_SESSION]);
      return [INITIAL_SAMPLE_SESSION];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [INITIAL_SAMPLE_SESSION];
  } catch (e) {
    console.error('Failed to load sessions', e);
    return [INITIAL_SAMPLE_SESSION];
  }
}

export function saveSessions(sessions: HandoverSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to save sessions', e);
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || 'sess-sample-01';
  } catch {
    return null;
  }
}

export function setActiveSessionId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }
  } catch (e) {
    console.error('Failed to set active session ID', e);
  }
}

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

export function generateBastNumber(expedition: ExpeditionId | 'all'): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  const expCode = expedition === 'all' ? 'MIX' : expedition.toUpperCase();
  return `BAST-${expCode}/${yyyy}${mm}${dd}/${rand}`;
}
