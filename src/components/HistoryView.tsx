import React, { useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Truck,
  Printer,
  FileSpreadsheet,
  Trash2,
  CheckCircle,
  ExternalLink,
  Plus,
  Package,
} from 'lucide-react';
import { HandoverSession, ExpeditionId } from '../types';
import { EXPEDITIONS, getExpedition } from '../utils/expeditions';

interface HistoryViewProps {
  sessions: HandoverSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onOpenPrintForSession: (session: HandoverSession) => void;
  onDeleteSession: (id: string) => void;
  onOpenNewSessionModal: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onOpenPrintForSession,
  onDeleteSession,
  onOpenNewSessionModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterExpedition, setFilterExpedition] = useState<ExpeditionId | 'all'>('all');

  const totalPackagesAllTime = sessions.reduce((acc, s) => acc + s.items.length, 0);

  const filteredSessions = sessions.filter((session) => {
    if (filterExpedition !== 'all' && session.expedition !== filterExpedition) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchBast = session.bastNumber.toLowerCase().includes(q);
      const matchCourier = session.courierName.toLowerCase().includes(q);
      const matchPlate = session.vehiclePlate?.toLowerCase().includes(q);
      const matchResi = session.items.some((i) => i.trackingNumber.toLowerCase().includes(q));
      if (!matchBast && !matchCourier && !matchPlate && !matchResi) return false;
    }
    return true;
  });

  const handleExportAll = () => {
    const headers = [
      'No BAST',
      'Ekspedisi Sesi',
      'Nama Kurir',
      'Plat No',
      'Petugas Gudang',
      'No Resi',
      'Ekspedisi Resi',
      'Kondisi',
      'Waktu Scan',
    ];

    const rows: Array<string[]> = [];
    sessions.forEach((s) => {
      s.items.forEach((item) => {
        const exp = getExpedition(item.detectedExpedition);
        rows.push([
          `"${s.bastNumber}"`,
          `"${s.expedition.toUpperCase()}"`,
          `"${s.courierName}"`,
          `"${s.vehiclePlate || '-'}"`,
          `"${s.warehouseStaff}"`,
          `"${item.trackingNumber}"`,
          `"${exp.shortName}"`,
          `"${item.condition}"`,
          `"${new Date(item.scannedAt).toLocaleString('id-ID')}"`,
        ]);
      });
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `REKAP_SEMUA_RETUR_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Stats */}
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Riwayat Berita Acara Serah Terima Retur
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar seluruh dokumen BAST dan rekap paket retur yang telah di-scan oleh tim gudang
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700 px-3.5 py-2 rounded-xl text-center">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Total BAST</span>
            <span className="text-xl font-extrabold font-mono text-white">{sessions.length}</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 px-3.5 py-2 rounded-xl text-center">
            <span className="block text-[10px] uppercase font-bold text-slate-400">Total Retur</span>
            <span className="text-xl font-extrabold font-mono text-emerald-400">{totalPackagesAllTime}</span>
          </div>

          <button
            type="button"
            onClick={handleExportAll}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Export Semua CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewSessionModal}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Sesi Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Expedition Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterExpedition('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
              filterExpedition === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua Ekspedisi
          </button>
          {EXPEDITIONS.slice(0, 6).map((exp) => (
            <button
              key={exp.id}
              type="button"
              onClick={() => setFilterExpedition(exp.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                filterExpedition === exp.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {exp.shortName}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari BAST, Kurir, Plat, atau Resi..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Sessions Grid */}
      {filteredSessions.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800">
          <FileText className="w-12 h-12 mx-auto text-slate-600 opacity-50 mb-2" />
          <p className="text-sm font-semibold text-slate-300">Tidak ada sesi serah terima yang cocok</p>
          <p className="text-xs text-slate-500 mt-1">Gunakan kata kunci lain atau buat sesi scan baru</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((sess) => {
            const exp = sess.expedition !== 'all' ? getExpedition(sess.expedition) : null;
            const isActive = sess.id === activeSessionId;
            const goodCount = sess.items.filter((i) => i.condition === 'baik').length;
            const damagedCount = sess.items.filter((i) => i.condition !== 'baik').length;

            return (
              <div
                key={sess.id}
                className={`bg-slate-900 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all ${
                  isActive
                    ? 'border-amber-500/80 ring-2 ring-amber-500/20 shadow-lg'
                    : 'border-slate-800 hover:border-slate-700 shadow-md'
                }`}
              >
                <div>
                  {/* Top Badge Row */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2.5 py-0.5 rounded text-[11px] font-bold border"
                        style={{
                          backgroundColor: exp ? `${exp.color}15` : '#f59e0b15',
                          color: exp ? exp.color : '#fbbf24',
                          borderColor: exp ? `${exp.color}40` : '#f59e0b40',
                        }}
                      >
                        {exp ? exp.shortName : 'Campuran'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-300">{sess.bastNumber}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        sess.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {sess.status === 'completed' ? 'Selesai' : 'Aktif'}
                    </span>
                  </div>

                  {/* Courier & Checker Details */}
                  <div className="space-y-1 text-xs text-slate-300 mb-4">
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Kurir / Driver:</span>
                      <span className="font-semibold text-white">
                        {sess.courierName} {sess.vehiclePlate ? `(${sess.vehiclePlate})` : ''}
                      </span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Checker Gudang:</span>
                      <span>{sess.warehouseStaff}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span className="text-slate-400">Tanggal:</span>
                      <span className="font-mono text-[11px] text-slate-400">
                        {new Date(sess.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}{' '}
                        {new Date(sess.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </p>
                  </div>

                  {/* Stats Pill Box */}
                  <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs mb-4">
                    <div>
                      <span className="block text-[10px] text-slate-500 font-medium">TOTAL</span>
                      <span className="font-mono font-bold text-white text-base">{sess.items.length}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-emerald-500 font-medium">BAIK</span>
                      <span className="font-mono font-bold text-emerald-400 text-base">{goodCount}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-amber-500 font-medium">RUSAK</span>
                      <span className="font-mono font-bold text-amber-400 text-base">{damagedCount}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenPrintForSession(sess)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition"
                      title="Cetak Berita Acara Serah Terima"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cetak BAST</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Hapus sesi ${sess.bastNumber} beserta seluruh ${sess.items.length} data resi di dalamnya?`
                          )
                        ) {
                          onDeleteSession(sess.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectSession(sess.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    }`}
                  >
                    <span>{isActive ? 'Sedang Dibuka' : 'Buka & Scan'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
