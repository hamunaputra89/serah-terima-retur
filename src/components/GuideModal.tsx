import React from 'react';
import { X, HelpCircle, Barcode, Volume2, AlertTriangle, Printer, CheckCircle2, Clock } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base">Panduan Tembak Resi & Serah Terima</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-slate-300 max-h-[80vh] overflow-y-auto">
          {/* 1. Cara Kerja Scanner Fisik */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Barcode className="w-4 h-4 text-amber-400" />
              1. Tembak Barcode Garis (1D) & Barcode Kotak (QR Code / 2D)
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Aplikasi ini mendukung tembak <strong className="text-slate-200">Barcode Kotak (QR Code & DataMatrix)</strong> maupun{' '}
              <strong className="text-slate-200">Barcode Garis 1D</strong>. Scanner 2D atau kamera HP akan langsung membaca barcode kotak
              dan secara otomatis mengekstrak nomor resi murni (bahkan bila barcode kotak berupa tautan URL pelacakan atau teks khusus SPX, J&T, SiCepat, dll).
            </p>
          </div>

          {/* Jeda Loading 1 Detik */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
            <h4 className="font-bold text-amber-300 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              Jeda Loading 1 Detik Setelah Menembak Resi
            </h4>
            <p className="text-slate-300 leading-relaxed">
              Setelah sebuah resi berhasil ditembak, pembaca barcode dan kamera akan melakukan <strong>loading jeda cepat selama 1 detik</strong> dengan indikator hitung mundur visual dan list hasil scan yang langsung terbarui. Jeda ini dirancang untuk mencegah tembakan ganda (double-scan) serta memberi waktu bagi operator gudang sebelum menembak resi berikutnya. Lonceng siap akan berbunyi saat scanner siap kembali, atau Anda dapat menekan tombol <em>"Lewati Jeda"</em> jika ingin memindai lebih cepat.
            </p>
          </div>

          {/* 2. Arti Bunyi Beep Audio */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              2. Kode Bunyi & Feedback Suara
            </h4>
            <ul className="space-y-1.5 pl-1">
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1 shrink-0"></span>
                <span>
                  <strong>Beep Melengking Pendek:</strong> Resi berhasil dicatat ke dalam daftar manifest retur.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0"></span>
                <span>
                  <strong>Dua Kali Buzz Rendah:</strong> Resi DUPLIKAT (paket sudah pernah di-scan sebelumnya pada sesi
                  ini). Mencegah penghitungan ganda!
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1 shrink-0"></span>
                <span>
                  <strong>Nada Alarm Turun:</strong> Resi terdeteksi berasal dari ekspedisi yang BERBEDA dari ekspedisi kurir
                  saat ini (mencegah paket nyasar).
                </span>
              </li>
            </ul>
          </div>

          {/* 3. Pencatatan Kondisi Retur */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              3. Penandaan Paket Rusak / Bocor / Terbuka
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Jika paket yang diserahkan kurir dalam keadaan kardus penyot, sobek, basah, atau segel terbuka, klik tombol
              kondisi di bawah kolom scan sebelum menembak resi atau ubah langsung pada tabel. Catatan ini akan tercetak pada
              Berita Acara (BAST) untuk klaim ganti rugi.
            </p>
          </div>

          {/* 4. Berita Acara (BAST) */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <Printer className="w-4 h-4 text-indigo-400" />
              4. Cetak Berita Acara & Tanda Tangan
            </h4>
            <p className="text-slate-400 leading-relaxed">
              Setelah selesai menghitung seluruh paket dari kurir, klik tombol <strong>"Cetak BAST & Struk"</strong>. Dokumen
              resmi format A4 dapat langsung diprint atau disimpan sebagai PDF lengkap dengan kolom tanda tangan kurir dan
              petugas gudang, atau dicetak ke printer thermal struk 80mm.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-800/50 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
};
