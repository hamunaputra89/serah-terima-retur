import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { PackageCondition } from '../types';
import { cleanTrackingNumber, detectExpedition, getExpedition, extractTrackingNumberFromBarcodeKotak } from '../utils/expeditions';

interface BulkPasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportList: (items: Array<{ trackingNumber: string; condition: PackageCondition; note?: string }>) => {
    addedCount: number;
    duplicateCount: number;
  };
}

export const BulkPasteModal: React.FC<BulkPasteModalProps> = ({
  isOpen,
  onClose,
  onImportList,
}) => {
  const [textInput, setTextInput] = useState('');
  const [defaultCondition, setDefaultCondition] = useState<PackageCondition>('baik');
  const [importResult, setImportResult] = useState<{ added: number; dupes: number } | null>(null);

  if (!isOpen) return null;

  const handleParse = () => {
    // Split by newlines, commas, or spaces and extract clean tracking numbers
    const lines = textInput
      .split(/[\r\n]+/)
      .map((line) => extractTrackingNumberFromBarcodeKotak(line).trackingNumber)
      .filter((resi) => resi.length >= 4);

    if (lines.length === 0) return;

    // Deduplicate within the pasted text
    const uniqueResi = Array.from(new Set(lines));

    const payload = uniqueResi.map((resi) => ({
      trackingNumber: resi,
      condition: defaultCondition,
      note: 'Input bulk / daftar',
    }));

    const result = onImportList(payload);
    setImportResult({ added: result.addedCount, dupes: result.duplicateCount });
  };

  const lineCount = textInput
    .split(/[\r\n,;]+/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm sm:text-base">Input / Tempel Banyak Resi Sekaligus</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-xs text-slate-400">
            Salin daftar nomor resi dari Excel, pesan WhatsApp, atau sistem marketplace, lalu tempel di bawah ini (1 resi per baris).
          </p>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Daftar Resi Retur:</span>
              <span className="font-mono text-amber-400">{lineCount} resi terdeteksi</span>
            </div>
            <textarea
              rows={8}
              value={textInput}
              onChange={(e) => {
                setTextInput(e.target.value);
                setImportResult(null);
              }}
              placeholder={`Contoh:\nSPXID04829103984\nSPXID04829103985\nJP8273918237\n003928174628\nTLJR0192847192`}
              className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-300 shrink-0">Set Kondisi Awal:</label>
            <select
              value={defaultCondition}
              onChange={(e) => setDefaultCondition(e.target.value as PackageCondition)}
              className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 px-3 py-1.5 focus:outline-none focus:border-amber-400"
            >
              <option value="baik">Kondisi Baik / Utuh</option>
              <option value="kemasan_rusak">Kemasan Rusak / Penyot</option>
              <option value="basah_bocor">Basah / Bocor</option>
              <option value="label_pudar">Label / Barcode Pudar</option>
              <option value="segel_terbuka">Segel Terbuka</option>
            </select>
          </div>

          {importResult && (
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>
                  <strong>{importResult.added}</strong> resi baru berhasil ditambahkan!
                </span>
              </div>
              {importResult.dupes > 0 && (
                <div className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{importResult.dupes} duplikat diabaikan</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setTextInput('');
              setImportResult(null);
            }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Bersihkan Teks
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleParse}
              disabled={lineCount === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Masukkan ke Sesi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
