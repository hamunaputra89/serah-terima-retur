import React, { useState } from 'react';
import {
  X,
  Printer,
  FileSpreadsheet,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Info,
} from 'lucide-react';
import { HandoverSession, ReturnItem } from '../types';
import { getExpedition, CONDITION_LABELS } from '../utils/expeditions';
import { executeSmartPrint, openPrintInNewTab } from '../utils/printer';

interface PrintManifestModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: HandoverSession;
}

export const PrintManifestModal: React.FC<PrintManifestModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  // Default to 1-page A4 format
  const [printLayout, setPrintLayout] = useState<'a4_1page' | 'a4_full' | 'thermal'>('a4_1page');
  const [density, setDensity] = useState<'normal' | 'compact' | 'ultra'>('compact');
  const [columnCount, setColumnCount] = useState<'auto' | '1' | '2' | '3'>('auto');
  const [copied, setCopied] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printNotice, setPrintNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const expeditionInfo = session.expedition !== 'all' ? getExpedition(session.expedition) : null;

  const totalItems = session.items.length;
  const goodItems = session.items.filter((i) => i.condition === 'baik').length;
  const damagedItems = session.items.filter((i) => i.condition !== 'baik').length;

  // Decide effective column count for 1-page mode
  const effectiveColumns =
    columnCount === 'auto'
      ? totalItems > 35
        ? 3
        : totalItems > 12
        ? 2
        : 1
      : parseInt(columnCount, 10);

  // Split items into chunks for multi-column layout
  const getChunkedItems = (columns: number) => {
    if (columns <= 1) return [session.items];
    const itemsPerCol = Math.ceil(session.items.length / columns);
    const chunks: ReturnItem[][] = [];
    for (let i = 0; i < columns; i++) {
      chunks.push(session.items.slice(i * itemsPerCol, (i + 1) * itemsPerCol));
    }
    return chunks;
  };

  const getPrintTargetId = () => {
    return printLayout === 'thermal' ? 'printable-bast-thermal' : 'printable-bast-a4';
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintNotice('Mempersiapkan dialog cetak...');

    try {
      const targetId = getPrintTargetId();
      const result = await executeSmartPrint({
        elementId: targetId,
        title: `BAST Retur - ${session.bastNumber}`,
        layout: printLayout,
      });

      if (result === 'new_tab') {
        setPrintNotice('Halaman cetak dibuka di tab baru untuk menghindari batasan browser');
      } else if (result === 'failed') {
        setPrintNotice('Gunakan tombol "Buka Tab Cetak" jika dialog cetak terhalang');
      } else {
        setPrintNotice(null);
      }
    } catch (e) {
      console.warn('Smart print notice:', e);
      handleOpenNewTab();
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintNotice(null), 4000);
    }
  };

  const handleOpenNewTab = () => {
    const targetId = getPrintTargetId();
    openPrintInNewTab({
      elementId: targetId,
      title: `BAST Retur - ${session.bastNumber}`,
      layout: printLayout,
    });
  };

  const handleCopyResiList = () => {
    const text = session.items.map((i) => i.trackingNumber).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExportCSV = () => {
    const headers = ['No', 'No Resi', 'Ekspedisi', 'Waktu Scan', 'Kondisi Paket', 'Catatan'];
    const rows = session.items.map((item, index) => {
      const exp = getExpedition(item.detectedExpedition);
      const cond = CONDITION_LABELS[item.condition].label;
      const dateStr = new Date(item.scannedAt).toLocaleString('id-ID');
      const note = item.note || '-';
      return [index + 1, `"${item.trackingNumber}"`, `"${exp.name}"`, `"${dateStr}"`, `"${cond}"`, `"${note}"`];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BAST_RETUR_${session.bastNumber.replace(/[\/\\:]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columnChunks = getChunkedItems(effectiveColumns);

  // Density styles for font and padding
  const densityStyles = {
    normal: {
      tableText: 'text-[11px]',
      rowPadding: 'py-1 px-1.5',
      metaText: 'text-xs',
      signGap: 'h-10',
    },
    compact: {
      tableText: 'text-[10px]',
      rowPadding: 'py-0.5 px-1',
      metaText: 'text-[11px]',
      signGap: 'h-8',
    },
    ultra: {
      tableText: 'text-[9px]',
      rowPadding: 'py-0.5 px-0.5',
      metaText: 'text-[10px]',
      signGap: 'h-6',
    },
  }[density];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150 print-modal-wrapper print:static print:bg-white print:p-0 print:m-0 print:overflow-visible print:block print:w-full print:h-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden print-modal-container print:w-full print:max-w-none print:max-h-none print:bg-white print:border-none print:shadow-none print:rounded-none print:overflow-visible print:block print:p-0 print:m-0">
        {/* Modal Header & Controls (Hidden in Print) */}
        <div className="print:hidden p-3.5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
              <Printer className="w-5 h-5 text-amber-400" />
              Cetak Berita Acara Serah Terima (BAST) Retur
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Dokumen: <strong className="text-slate-200">{session.bastNumber}</strong> • {totalItems} Resi Tercatat
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Format Layout Selector */}
            <div className="flex rounded-lg border border-slate-700 bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPrintLayout('a4_1page')}
                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  printLayout === 'a4_1page'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>A4 Pas 1 Lembar</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('a4_full')}
                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer ${
                  printLayout === 'a4_full'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>A4 Rinci Lengkap</span>
              </button>
              <button
                type="button"
                onClick={() => setPrintLayout('thermal')}
                className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer ${
                  printLayout === 'thermal'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Struk Thermal 80mm
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyResiList}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Salin semua nomor resi ke clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Tersalin!' : 'Copy Resi'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Unduh file Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV</span>
            </button>

            {/* Buka Tab Cetak (Bebas Hambatan Sandboxing) */}
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              title="Buka tampilan cetak bersih di tab baru (bebas batasan iframe)"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
              <span>Buka Tab Cetak</span>
            </button>

            {/* Tombol Cetak Utama */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              {isPrinting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              <span>{isPrinting ? 'Mencetak...' : 'Cetak Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Subbar: Density and Columns options when in 1-Page mode */}
        {printLayout === 'a4_1page' && (
          <div className="print:hidden px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Format Pas 1 Halaman A4
              </span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Density control */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">Kerapatan:</span>
                <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                  {(['normal', 'compact', 'ultra'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDensity(mode)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize transition cursor-pointer ${
                        density === mode ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {mode === 'normal' ? 'Normal' : mode === 'compact' ? 'Padat' : 'Super Padat'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column count */}
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-[11px]">Kolom Resi:</span>
                <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700">
                  {(['auto', '1', '2', '3'] as const).map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setColumnCount(col)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                        columnCount === col ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {col === 'auto' ? 'Otomatis' : `${col} Kolom`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Notice Banner */}
        {printNotice && (
          <div className="print:hidden px-4 py-2 bg-indigo-950/80 border-b border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{printNotice}</span>
            </div>
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
            >
              <span>Buka di Tab Baru</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Printable Sheet Viewport */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-950 flex justify-center print-modal-scroll print:bg-white print:p-0 print:m-0 print:overflow-visible print:block print:w-full print:h-auto">
          {printLayout === 'a4_1page' ? (
            /* ============================================================ */
            /* A4 PAS 1 LEMBAR (EXACT FIT 1 PAGE GUARANTEED)                 */
            /* ============================================================ */
            <div
              id="printable-bast-a4"
              className="w-full max-w-3xl bg-white text-slate-900 p-6 sm:p-7 rounded-lg shadow-xl border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:min-h-0 print:max-h-none print:h-auto flex flex-col justify-between"
            >
              <div>
                {/* 1. Header Letterhead (Sangat Ringkas & Rapi) */}
                <div className="border-b-2 border-slate-900 pb-2 mb-2.5 flex justify-between items-end">
                  <div>
                    <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase leading-none">
                      BERITA ACARA SERAH TERIMA RETUR PAKET
                    </h1>
                    <p className="text-[10px] font-semibold text-slate-600 mt-1 uppercase tracking-wider">
                      SURAT JALAN &amp; REKONSILIASI PENERIMAAN RETUR EKSPEDISI
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 bg-slate-900 text-white font-mono font-bold text-xs rounded print:bg-white print:text-black print:border print:border-black">
                      {session.bastNumber}
                    </span>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString('id-ID', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* 2. Meta Dua Pihak (Grid Kompak) */}
                <div
                  className={`grid grid-cols-2 gap-2 p-2 rounded bg-slate-50 border border-slate-300 print:bg-white print:border-slate-400 ${densityStyles.metaText} mb-2`}
                >
                  <div className="border-r border-slate-200 pr-2 space-y-0.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      PIHAK 1 : EKSPEDISI PENGANTAR
                    </div>
                    <p className="truncate">
                      <strong>Ekspedisi:</strong>{' '}
                      <span className="font-bold text-slate-900">
                        {expeditionInfo ? expeditionInfo.name : 'Campuran (Semua Ekspedisi)'}
                      </span>
                    </p>
                    <p className="truncate">
                      <strong>Driver / Kurir:</strong> {session.courierName || '-'}
                      {session.courierPhone ? ` (${session.courierPhone})` : ''}
                    </p>
                    <p className="truncate">
                      <strong>Plat Kendaraan:</strong> {session.vehiclePlate || '-'}
                    </p>
                  </div>

                  <div className="pl-1 space-y-0.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      PIHAK 2 : GUDANG PENERIMA
                    </div>
                    <p className="truncate">
                      <strong>Gudang / Hub:</strong> {session.warehouseLocation || 'Gudang Logistik'}
                    </p>
                    <p className="truncate">
                      <strong>Petugas Checker:</strong> {session.warehouseStaff || '-'}
                    </p>
                    <p className="truncate">
                      <strong>Waktu Serah Terima:</strong>{' '}
                      {new Date(session.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </p>
                  </div>
                </div>

                {/* 3. Ringkasan Total Paket (Pill Box Kompak) */}
                <div className="grid grid-cols-3 gap-2 text-center mb-2.5">
                  <div className="py-1 px-2 rounded border border-slate-400 bg-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Total Retur</span>
                    <span className="text-sm font-black text-slate-900">{totalItems} Paket</span>
                  </div>
                  <div className="py-1 px-2 rounded border border-emerald-400 bg-emerald-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Kondisi Baik</span>
                    <span className="text-sm font-black text-emerald-700">{goodItems} Paket</span>
                  </div>
                  <div className="py-1 px-2 rounded border border-amber-400 bg-amber-50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Rusak/Bocor</span>
                    <span className="text-sm font-black text-amber-700">{damagedItems} Paket</span>
                  </div>
                </div>

                {/* 4. Daftar Rincian Nomor Resi (Multi-Kolom agar Pas 1 Lembar) */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Rincian Paket Retur Masuk ({session.items.length} Resi)
                    </span>
                    {effectiveColumns > 1 && (
                      <span className="text-[9px] text-slate-500 font-mono">
                        ({effectiveColumns} kolom vertikal)
                      </span>
                    )}
                  </div>

                  {session.items.length === 0 ? (
                    <div className="border border-slate-300 p-4 text-center text-slate-400 italic text-xs">
                      Belum ada paket yang di-scan pada sesi ini.
                    </div>
                  ) : (
                    <div
                      className={`grid gap-2 ${
                        effectiveColumns === 3
                          ? 'grid-cols-3'
                          : effectiveColumns === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-1'
                      }`}
                    >
                      {columnChunks.map((chunk, colIdx) => {
                        const itemsBefore = columnChunks
                          .slice(0, colIdx)
                          .reduce((acc, c) => acc + c.length, 0);

                        return (
                          <div key={colIdx} className="overflow-hidden border border-slate-400 rounded">
                            <table className={`w-full border-collapse ${densityStyles.tableText}`}>
                              <thead>
                                <tr className="bg-slate-800 text-white font-bold print:bg-slate-100 print:text-black">
                                  <th className="py-0.5 px-1 text-center w-6 border-r border-slate-700 print:border-slate-400 print:text-black">No</th>
                                  <th className="py-0.5 px-1 text-left border-r border-slate-700 print:border-slate-400 print:text-black">Nomor Resi</th>
                                  <th className="py-0.5 px-1 text-left w-14 border-r border-slate-700 print:border-slate-400 print:text-black">Ekspedisi</th>
                                  <th className="py-0.5 px-1 text-center w-14 print:text-black">Kondisi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-300">
                                {chunk.map((item, rowIdx) => {
                                  const globalIdx = itemsBefore + rowIdx + 1;
                                  const exp = getExpedition(item.detectedExpedition);
                                  const isDamaged = item.condition !== 'baik';

                                  return (
                                    <tr
                                      key={item.id}
                                      className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                                    >
                                      <td className={`text-center font-mono border-r border-slate-300 ${densityStyles.rowPadding}`}>
                                        {globalIdx}
                                      </td>
                                      <td className={`font-mono font-bold text-slate-900 border-r border-slate-300 ${densityStyles.rowPadding} truncate max-w-[120px]`}>
                                        {item.trackingNumber}
                                      </td>
                                      <td className={`font-semibold border-r border-slate-300 ${densityStyles.rowPadding} truncate`}>
                                        {exp.shortName}
                                      </td>
                                      <td className={`text-center ${densityStyles.rowPadding}`}>
                                        <span
                                          className={`inline-block px-1 rounded text-[8px] font-bold ${
                                            isDamaged
                                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                              : 'text-slate-700'
                                          }`}
                                        >
                                          {isDamaged ? 'RUSAK' : 'BAIK'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Bagian Bawah: Pernyataan & Tanda Tangan Dua Belah Pihak */}
              <div className="pt-2 border-t border-slate-300 mt-2">
                {/* Pernyataan Sah Ringkas */}
                <div className="text-[9px] text-slate-600 mb-2 p-1.5 rounded bg-slate-100 border border-slate-200 leading-tight">
                  <p>
                    <strong>Pernyataan:</strong> Kedua belah pihak telah memeriksa fisik jumlah dan kondisi kemasan retur paket. Penyerahan sah dan mengikat sebagai bukti resmi serah terima / rekonsiliasi.
                  </p>
                  {session.notes && (
                    <p className="mt-0.5 font-semibold text-slate-800">Catatan: {session.notes}</p>
                  )}
                </div>

                {/* Kolom Tanda Tangan Pihak 1 & Pihak 2 */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">
                      Pihak 1 (Driver / Kurir Pengantar):
                    </p>
                    <div className={densityStyles.signGap}></div>
                    <div className="border-t border-slate-600 pt-0.5 w-40 mx-auto">
                      <p className="font-bold text-[11px] text-slate-900">
                        {session.courierName || '............................'}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {expeditionInfo ? expeditionInfo.shortName : 'Kurir Ekspedisi'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold text-slate-700">
                      Pihak 2 (Petugas / Checker Gudang):
                    </p>
                    <div className={densityStyles.signGap}></div>
                    <div className="border-t border-slate-600 pt-0.5 w-40 mx-auto">
                      <p className="font-bold text-[11px] text-slate-900">
                        {session.warehouseStaff || '............................'}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {session.warehouseLocation || 'Gudang Logistik'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Watermark Footer Dokumen */}
                <div className="mt-2 pt-1 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                  <span>Dokumen sah digital dicetak melalui Sistem BAST Retur Logistik</span>
                  <span>Handcraft by Hery</span>
                </div>
              </div>
            </div>
          ) : printLayout === 'a4_full' ? (
            /* ============================================================ */
            /* A4 FORMAL FULL DETAIL (TABEL RINCI LEBAR)                    */
            /* ============================================================ */
            <div
              id="printable-bast-a4"
              className="w-full max-w-3xl bg-white text-slate-900 p-8 rounded-lg shadow-lg border border-slate-200 font-sans print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white"
            >
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    BERITA ACARA SERAH TERIMA RETUR PAKET
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 tracking-wide">
                    EXPEDITION RETURN HANDOVER MANIFEST DOKUMEN (RINCIAN LENGKAP)
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-2.5 py-1 bg-slate-900 text-white font-mono font-bold text-xs rounded print:bg-white print:text-black print:border print:border-black">
                    {session.bastNumber}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {new Date(session.createdAt).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Meta information grid */}
              <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs mb-4">
                <div>
                  <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    PIHAK 1 : EKSPEDISI PENGANTAR
                  </div>
                  <div className="space-y-0.5">
                    <p>
                      <strong>Ekspedisi:</strong>{' '}
                      <span className="font-bold text-slate-900">
                        {expeditionInfo ? expeditionInfo.name : 'Semua Ekspedisi (Mixed)'}
                      </span>
                    </p>
                    <p>
                      <strong>Nama Driver / Kurir:</strong> {session.courierName || '-'}
                    </p>
                    <p>
                      <strong>No. Handphone:</strong> {session.courierPhone || '-'}
                    </p>
                    <p>
                      <strong>Plat Kendaraan:</strong> {session.vehiclePlate || '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 font-semibold mb-1 uppercase tracking-wider text-[10px]">
                    PIHAK 2 : PENERIMA GUDANG
                  </div>
                  <div className="space-y-0.5">
                    <p>
                      <strong>Gudang / Hub:</strong> {session.warehouseLocation || 'Gudang Logistik'}
                    </p>
                    <p>
                      <strong>Petugas Penerima:</strong> {session.warehouseStaff || '-'}
                    </p>
                    <p>
                      <strong>Waktu Serah Terima:</strong>{' '}
                      {new Date(session.createdAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3 text-center mb-4 text-xs">
                <div className="p-2 rounded border border-slate-300 bg-slate-100">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Total Paket Retur</div>
                  <div className="text-lg font-extrabold text-slate-900">{totalItems} Paket</div>
                </div>
                <div className="p-2 rounded border border-emerald-300 bg-emerald-50">
                  <div className="text-[10px] uppercase font-bold text-emerald-800">Kondisi Baik/Utuh</div>
                  <div className="text-lg font-extrabold text-emerald-700">{goodItems} Paket</div>
                </div>
                <div className="p-2 rounded border border-amber-300 bg-amber-50">
                  <div className="text-[10px] uppercase font-bold text-amber-800">Kondisi Rusak/Bocor</div>
                  <div className="text-lg font-extrabold text-amber-700">{damagedItems} Paket</div>
                </div>
              </div>

              {/* Full Detailed Table */}
              <div className="mb-6">
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="border border-slate-300 p-2 text-center w-10">No</th>
                      <th className="border border-slate-300 p-2 text-left">Nomor Resi / AWB</th>
                      <th className="border border-slate-300 p-2 text-left w-24">Ekspedisi</th>
                      <th className="border border-slate-300 p-2 text-left w-32">Waktu Scan</th>
                      <th className="border border-slate-300 p-2 text-center w-28">Kondisi</th>
                      <th className="border border-slate-300 p-2 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.items.map((item, idx) => {
                      const exp = getExpedition(item.detectedExpedition);
                      const cond = CONDITION_LABELS[item.condition];
                      return (
                        <tr
                          key={item.id}
                          className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}
                        >
                          <td className="border border-slate-300 p-1.5 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-mono font-bold text-slate-900 tracking-wider">
                            {item.trackingNumber}
                          </td>
                          <td className="border border-slate-300 p-1.5 font-medium">{exp.shortName}</td>
                          <td className="border border-slate-300 p-1.5 text-slate-600 text-[11px]">
                            {new Date(item.scannedAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="border border-slate-300 p-1.5 text-center">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                item.condition === 'baik'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800 font-bold'
                              }`}
                            >
                              {cond.label}
                            </span>
                          </td>
                          <td className="border border-slate-300 p-1.5 text-slate-600 text-[11px]">
                            {item.note || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dual Signature Section */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-300">
                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-600 mb-14">
                    Diserahkan oleh (Driver / Kurir Ekspedisi):
                  </p>
                  <div className="border-t border-slate-400 pt-1 w-48 mx-auto">
                    <p className="font-bold text-xs text-slate-900">{session.courierName || '............................'}</p>
                    <p className="text-[10px] text-slate-500">
                      {expeditionInfo ? expeditionInfo.shortName : 'Kurir Ekspedisi'}
                    </p>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs font-semibold text-slate-600 mb-14">
                    Diterima oleh (Petugas / Admin Gudang):
                  </p>
                  <div className="border-t border-slate-400 pt-1 w-48 mx-auto">
                    <p className="font-bold text-xs text-slate-900">{session.warehouseStaff || '............................'}</p>
                    <p className="text-[10px] text-slate-500">{session.warehouseLocation || 'Gudang Logistik'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-1 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                <span>Dokumen sah digital dicetak melalui Sistem BAST Retur Logistik</span>
                <span>Handcraft by Hery</span>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* THERMAL 80mm RECEIPT SLIP                                   */
            /* ============================================================ */
            <div
              id="printable-bast-thermal"
              className="w-full max-w-[320px] bg-white text-slate-900 p-4 rounded-lg shadow-lg border border-slate-200 font-mono text-[11px] leading-tight print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none print:bg-white"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <h2 className="font-bold text-sm">BUKTI RETUR EKSPEDISI</h2>
                <p className="text-[10px]">{session.warehouseLocation || 'Gudang Logistik'}</p>
                <p className="text-[10px] mt-1 font-bold">{session.bastNumber}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(session.createdAt).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 space-y-0.5">
                <p>Ekspedisi: {expeditionInfo ? expeditionInfo.name : 'Campuran'}</p>
                <p>Driver   : {session.courierName || '-'}</p>
                <p>Plat No  : {session.vehiclePlate || '-'}</p>
                <p>Checker  : {session.warehouseStaff || '-'}</p>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 font-bold flex justify-between">
                <span>TOTAL RETUR:</span>
                <span>{totalItems} PAKET</span>
              </div>

              <div className="py-1 text-[10px] text-slate-600 flex justify-between">
                <span>- Kondisi Baik : {goodItems}</span>
                <span>- Rusak/Bocor  : {damagedItems}</span>
              </div>

              {/* List of tracking numbers */}
              <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
                <p className="font-bold text-[10px]">DAFTAR RESI:</p>
                {session.items.map((item, idx) => (
                  <div key={item.id} className="flex justify-between text-[10px]">
                    <span>
                      {idx + 1}. {item.trackingNumber}
                    </span>
                    <span className={item.condition !== 'baik' ? 'font-bold text-red-600' : ''}>
                      {item.condition === 'baik' ? 'OK' : 'RUSAK'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 grid grid-cols-2 text-center text-[10px] gap-2">
                <div>
                  <p>Kurir,</p>
                  <div className="h-10"></div>
                  <p className="border-t border-slate-300 pt-1">({session.courierName || 'Kurir'})</p>
                </div>
                <div>
                  <p>Penerima,</p>
                  <div className="h-10"></div>
                  <p className="border-t border-slate-300 pt-1">({session.warehouseStaff || 'Checker'})</p>
                </div>
              </div>

              <div className="mt-3 pt-1 border-t border-slate-200 text-center text-[8px] text-slate-400">
                Handcraft by Hery
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
