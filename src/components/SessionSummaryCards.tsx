import React from 'react';
import { Package, CheckCircle2, AlertTriangle, AlertOctagon, Filter } from 'lucide-react';
import { ReturnItem, PackageCondition } from '../types';

interface SessionSummaryCardsProps {
  items: ReturnItem[];
  filterCondition: PackageCondition | 'all' | 'mismatch';
  onSelectFilter: (filter: PackageCondition | 'all' | 'mismatch') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const SessionSummaryCards: React.FC<SessionSummaryCardsProps> = ({
  items,
  filterCondition,
  onSelectFilter,
  searchQuery,
  onSearchChange,
}) => {
  const total = items.length;
  const goodCount = items.filter((i) => i.condition === 'baik').length;
  const damagedCount = items.filter((i) => i.condition !== 'baik').length;
  const mismatchCount = items.filter((i) => i.isMismatch).length;

  return (
    <div className="space-y-3">
      {/* 4 Quick Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Scanned */}
        <button
          type="button"
          onClick={() => onSelectFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterCondition === 'all'
              ? 'bg-slate-800 border-amber-500/80 ring-2 ring-amber-500/20'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Paket Masuk</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-white">{total}</span>
            <span className="text-xs text-slate-400">paket</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Klik untuk lihat semua</span>
        </button>

        {/* Kondisi Baik */}
        <button
          type="button"
          onClick={() => onSelectFilter('baik')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterCondition === 'baik'
              ? 'bg-emerald-950/30 border-emerald-500/80 ring-2 ring-emerald-500/20'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Kondisi Utuh / Baik</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-emerald-400">{goodCount}</span>
            <span className="text-xs text-slate-400">
              {total > 0 ? `${Math.round((goodCount / total) * 100)}%` : '0%'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Siap restock / proses</span>
        </button>

        {/* Rusak / Bermasalah */}
        <button
          type="button"
          onClick={() => onSelectFilter('kemasan_rusak')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterCondition === 'kemasan_rusak'
              ? 'bg-amber-950/30 border-amber-500/80 ring-2 ring-amber-500/20'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Rusak / Bermasalah</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">{damagedCount}</span>
            <span className="text-xs text-slate-400">
              {total > 0 ? `${Math.round((damagedCount / total) * 100)}%` : '0%'}
            </span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Perlu dokumentasi komplain</span>
        </button>

        {/* Mismatch Ekspedisi (Paket Nyasar) */}
        <button
          type="button"
          onClick={() => onSelectFilter('mismatch')}
          className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
            filterCondition === 'mismatch'
              ? 'bg-rose-950/30 border-rose-500/80 ring-2 ring-rose-500/20'
              : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Paket Nyasar / Beda</span>
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-extrabold text-rose-400">{mismatchCount}</span>
            <span className="text-xs text-slate-400">paket</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Beda kurir dari karung</span>
        </button>
      </div>

      {/* Filter bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0 font-medium">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          <button
            type="button"
            onClick={() => onSelectFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
              filterCondition === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Semua ({total})
          </button>
          <button
            type="button"
            onClick={() => onSelectFilter('baik')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
              filterCondition === 'baik'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Utuh / Baik ({goodCount})
          </button>
          <button
            type="button"
            onClick={() => onSelectFilter('kemasan_rusak')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
              filterCondition === 'kemasan_rusak'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Bermasalah ({damagedCount})
          </button>
          {mismatchCount > 0 && (
            <button
              type="button"
              onClick={() => onSelectFilter('mismatch')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                filterCondition === 'mismatch'
                  ? 'bg-rose-500 text-white font-bold'
                  : 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
              }`}
            >
              Nyasar ({mismatchCount})
            </button>
          )}
        </div>

        {/* Search by tracking number */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari no. resi di sesi ini..."
            className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>
    </div>
  );
};
