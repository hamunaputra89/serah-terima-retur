import React, { useState } from 'react';
import {
  Truck,
  Printer,
  CheckCircle,
  Clock,
  User,
  Building,
  Copy,
  Check,
  Trash2,
  Edit2,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Plus,
  Search,
  Layers,
  QrCode,
} from 'lucide-react';
import { HandoverSession, ReturnItem, PackageCondition, ExpeditionId } from '../types';
import { getExpedition, detectExpedition, CONDITION_LABELS } from '../utils/expeditions';
import { ScannerInput } from './ScannerInput';
import { SessionSummaryCards } from './SessionSummaryCards';
import confetti from 'canvas-confetti';

interface ActiveSessionViewProps {
  session: HandoverSession;
  onUpdateSession: (updated: HandoverSession) => void;
  onCompleteSession: (sessionId: string) => void;
  onOpenNewSessionModal: () => void;
  onOpenBulkModal: () => void;
  onOpenCameraModal: () => void;
  onOpenPrintModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  session,
  onUpdateSession,
  onCompleteSession,
  onOpenNewSessionModal,
  onOpenBulkModal,
  onOpenCameraModal,
  onOpenPrintModal,
  soundEnabled,
  onToggleSound,
  voiceEnabled,
  onToggleVoice,
}) => {
  const [filterCondition, setFilterCondition] = useState<PackageCondition | 'all' | 'mismatch'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState('');

  const expeditionInfo = session.expedition !== 'all' ? getExpedition(session.expedition) : null;

  // Handle barcode scanned from ScannerInput
  const handleScanItem = (
    trackingNumber: string,
    condition: PackageCondition,
    note?: string,
    barcodeType?: '1d' | '2d_kotak'
  ): 'added' | 'duplicate' | 'mismatch' => {
    // Check if tracking number is already in this session
    const isDuplicate = session.items.some(
      (item) => item.trackingNumber.toUpperCase() === trackingNumber.toUpperCase()
    );

    if (isDuplicate) {
      return 'duplicate';
    }

    const cleanResi = trackingNumber.trim().toUpperCase();
    const detectedId: ExpeditionId = detectExpedition(cleanResi);
    let isMismatch = false;

    if (session.expedition !== 'all' && detectedId !== session.expedition) {
      isMismatch = true;
    }

    const newItem: ReturnItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackingNumber: cleanResi,
      scannedAt: new Date().toISOString(),
      expedition: session.expedition === 'all' ? detectedId : session.expedition,
      detectedExpedition: detectedId,
      condition,
      note,
      isMismatch,
      barcodeType,
    };

    const updatedSession: HandoverSession = {
      ...session,
      updatedAt: new Date().toISOString(),
      items: [newItem, ...session.items], // put newest scanned item at the top!
    };

    onUpdateSession(updatedSession);

    return isMismatch ? 'mismatch' : 'added';
  };

  const handleCopyResi = (resi: string, id: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDeleteItem = (itemId: string) => {
    const updatedItems = session.items.filter((item) => item.id !== itemId);
    onUpdateSession({
      ...session,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    });
  };

  const handleUpdateCondition = (itemId: string, newCondition: PackageCondition) => {
    const updatedItems = session.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, condition: newCondition };
      }
      return item;
    });
    onUpdateSession({
      ...session,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    });
  };

  const handleSaveNote = (itemId: string) => {
    const updatedItems = session.items.map((item) => {
      if (item.id === itemId) {
        return { ...item, note: editingNote.trim() || undefined };
      }
      return item;
    });
    onUpdateSession({
      ...session,
      updatedAt: new Date().toISOString(),
      items: updatedItems,
    });
    setEditingItemId(null);
    setEditingNote('');
  };

  const handleFinishSession = () => {
    if (session.items.length === 0) {
      alert('Sesi belum memiliki paket retur. Silakan tembak resi terlebih dahulu.');
      return;
    }
    const confirm = window.confirm(
      `Selesaikan sesi serah terima untuk ${session.items.length} paket retur?\nStatus akan ditandai selesai dan siap dicetak Berita Acara (BAST).`
    );
    if (confirm) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
      onCompleteSession(session.id);
    }
  };

  // Filtered items
  const filteredItems = session.items.filter((item) => {
    // Condition filter
    if (filterCondition === 'mismatch') {
      if (!item.isMismatch) return false;
    } else if (filterCondition !== 'all') {
      if (item.condition !== filterCondition) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchResi = item.trackingNumber.toLowerCase().includes(q);
      const matchNote = item.note?.toLowerCase().includes(q);
      if (!matchResi && !matchNote) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Session Banner */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10 pointer-events-none blur-2xl"
          style={{ backgroundColor: expeditionInfo ? expeditionInfo.color : '#f59e0b' }}
        />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Left: Expedition and Driver Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border shadow-sm"
                style={{
                  backgroundColor: expeditionInfo ? `${expeditionInfo.color}20` : '#f59e0b20',
                  color: expeditionInfo ? expeditionInfo.color : '#fbbf24',
                  borderColor: expeditionInfo ? `${expeditionInfo.color}40` : '#f59e0b40',
                }}
              >
                {expeditionInfo ? expeditionInfo.name : 'Semua Ekspedisi (Campuran)'}
              </span>

              <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                {session.bastNumber}
              </span>

              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  session.status === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                {session.status === 'completed' ? 'Selesai / Terverifikasi' : 'Sedang Berjalan (Active)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Kurir: <strong className="text-white">{session.courierName}</strong>
                {session.courierPhone && <span className="text-slate-400">({session.courierPhone})</span>}
              </span>

              {session.vehiclePlate && (
                <span className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  Plat: <span className="font-mono font-semibold text-amber-400">{session.vehiclePlate}</span>
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Checker: <strong className="text-white">{session.warehouseStaff}</strong>
                {session.warehouseLocation && (
                  <span className="text-slate-400">• {session.warehouseLocation}</span>
                )}
              </span>

              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                {new Date(session.createdAt).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                WIB
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={onOpenPrintModal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Cetak BAST & Struk</span>
            </button>

            {session.status === 'active' && (
              <button
                type="button"
                onClick={handleFinishSession}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Selesaikan Sesi</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNewSessionModal}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Sesi Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <ScannerInput
        sessionExpedition={session.expedition}
        onScanSuccess={handleScanItem}
        onOpenBulkModal={onOpenBulkModal}
        onOpenCameraModal={onOpenCameraModal}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        voiceEnabled={voiceEnabled}
        onToggleVoice={onToggleVoice}
        items={session.items}
      />

      {/* Live Stat Counters & Filter Controls */}
      <SessionSummaryCards
        items={session.items}
        filterCondition={filterCondition}
        onSelectFilter={setFilterCondition}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Table of Scanned Packages */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Daftar Paket Retur Masuk ({filteredItems.length} dari {session.items.length})
            </h3>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-amber-400 hover:underline"
            >
              Reset Pencarian
            </button>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <Truck className="w-12 h-12 mx-auto text-slate-600 opacity-60" />
            <div>
              <p className="text-base font-semibold text-slate-300">Belum ada resi yang sesuai</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Arahkan scanner barcode fisik Anda ke paket retur kurir, atau gunakan tombol Scan Kamera di atas.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4 w-12 text-center">No</th>
                  <th className="py-3 px-4">Nomor Resi</th>
                  <th className="py-3 px-4">Ekspedisi</th>
                  <th className="py-3 px-4">Kondisi Kemasan</th>
                  <th className="py-3 px-4">Waktu Scan</th>
                  <th className="py-3 px-4">Catatan</th>
                  <th className="py-3 px-4 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item, index) => {
                  const detectedInfo = getExpedition(item.detectedExpedition);
                  const conditionInfo = CONDITION_LABELS[item.condition];
                  const isBeingEdited = editingItemId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        item.isMismatch ? 'bg-rose-950/15' : index === 0 ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* No */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {session.items.length - session.items.indexOf(item)}
                      </td>

                      {/* No Resi */}
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm">
                        <div className="flex items-center gap-2">
                          <span>{item.trackingNumber}</span>
                          {item.barcodeType === '2d_kotak' && (
                            <span
                              title="Tembak Barcode Kotak (QR Code / DataMatrix)"
                              className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold inline-flex items-center gap-0.5"
                            >
                              <QrCode className="w-2.5 h-2.5" />
                              2D
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopyResi(item.trackingNumber, item.id)}
                            title="Salin Nomor Resi"
                            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-800 transition"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Ekspedisi */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold border"
                            style={{
                              backgroundColor: `${detectedInfo.color}15`,
                              color: detectedInfo.color,
                              borderColor: `${detectedInfo.color}40`,
                            }}
                          >
                            {detectedInfo.shortName}
                          </span>
                          {item.isMismatch && (
                            <span
                              title="Ekspedisi paket ini berbeda dengan sesi kurir saat ini!"
                              className="p-0.5 rounded text-rose-400"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Kondisi Kemasan (Quick Edit) */}
                      <td className="py-3 px-4">
                        <select
                          value={item.condition}
                          onChange={(e) =>
                            handleUpdateCondition(item.id, e.target.value as PackageCondition)
                          }
                          className={`text-xs rounded-lg px-2 py-1 font-medium border focus:outline-none focus:ring-1 focus:ring-amber-400 ${
                            item.condition === 'baik'
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {(Object.keys(CONDITION_LABELS) as PackageCondition[]).map((cKey) => (
                            <option key={cKey} value={cKey} className="bg-slate-900 text-slate-200">
                              {CONDITION_LABELS[cKey].label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Waktu Scan */}
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(item.scannedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      {/* Catatan */}
                      <td className="py-3 px-4">
                        {isBeingEdited ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingNote}
                              onChange={(e) => setEditingNote(e.target.value)}
                              placeholder="Ketik catatan..."
                              autoFocus
                              className="px-2 py-1 text-xs bg-slate-950 border border-amber-400 rounded text-white focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveNote(item.id);
                                if (e.key === 'Escape') setEditingItemId(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveNote(item.id)}
                              className="px-2 py-1 bg-amber-500 text-slate-950 font-bold rounded text-xs"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingNote(item.note || '');
                            }}
                            className="cursor-pointer group flex items-center gap-1 text-slate-400 hover:text-slate-200"
                          >
                            <span className="truncate max-w-[150px]">{item.note || '-'}</span>
                            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-400" />
                          </div>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Hapus resi ${item.trackingNumber} dari sesi ini?`)) {
                              handleDeleteItem(item.id);
                            }
                          }}
                          title="Hapus resi ini jika salah scan"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
