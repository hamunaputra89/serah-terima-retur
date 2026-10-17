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
  defaultStaffName: '',
  defaultWarehouse: '',
};

export function loadSessions(): HandoverSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // If user had the initial sample session, clean it out to satisfy "buat semua data kosong"
      const filtered = parsed.filter((s) => s.id !== 'sess-sample-01');
      if (filtered.length !== parsed.length) {
        saveSessions(filtered);
      }
      return filtered;
    }
    return [];
  } catch (e) {
    console.warn('Failed to load sessions', e);
    return [];
  }
}

export function saveSessions(sessions: HandoverSession[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
  } catch (e) {
    console.warn('Failed to save sessions', e);
  }
}

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const id = localStorage.getItem(STORAGE_KEY_ACTIVE_ID);
    return id === 'sess-sample-01' ? null : id;
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
    console.warn('Failed to set active session ID', e);
  }
}

export function clearAllStorageData() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY_SESSIONS);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
  } catch (e) {
    console.warn('Failed to clear storage', e);
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
    console.warn('Failed to save settings', e);
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
