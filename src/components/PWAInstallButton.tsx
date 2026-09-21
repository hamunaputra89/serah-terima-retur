import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installing, setInstalling] = useState(false);

  // If already running in standalone/installed mode, don't show install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      try {
        const installed = await install();
        if (!installed && (isAndroid || isIOS)) {
          setShowGuideModal(true);
        }
      } finally {
        setInstalling(false);
      }
    } else {
      // If beforeinstallprompt hasn't fired or is restricted by iframe/browser policy, open visual guide
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        id="btn-install-pwa-android"
        onClick={handleInstallClick}
        disabled={installing}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-950/40 border border-emerald-400/30 transition-all transform active:scale-95 cursor-pointer"
        title="Install Aplikasi di Android / Smartphone"
      >
        <Smartphone className="w-4 h-4 text-emerald-100" />
        <span className="hidden sm:inline">Install di Android</span>
        <span className="sm:hidden">Install App</span>
        <span className="bg-emerald-950/60 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
          APK/PWA
        </span>
      </button>

      {/* Android & Mobile Installation Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 sm:p-6 shadow-2xl text-slate-100 relative">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg text-slate-100">
                  Pasang Aplikasi di Android
                </h3>
                <p className="text-xs text-slate-400">
                  Aplikasi BAST Retur Ekspedisi
                </p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-4 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="font-semibold text-slate-200">
                    Buka di Browser Google Chrome Android
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Pastikan Anda membuka tautan aplikasi ini langsung melalui Google Chrome di HP Anda.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="font-semibold text-slate-200">
                    Klik Titik Tiga (⋮) di Kanan Atas Chrome
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Menu opsi browser Chrome akan terbuka.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">
                    Pilih "Install Aplikasi" atau "Tambahkan ke Layar Utama"
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Tekan <strong>Install</strong>. Ikon aplikasi akan langsung terpasang di layar utama HP Anda dengan mode layar penuh tanpa navigasi web!
                  </p>
                </div>
              </div>
            </div>

            {isInstallable && (
              <button
                onClick={async () => {
                  await install();
                  setShowGuideModal(false);
                }}
                className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-950/50"
              >
                <Download className="w-4 h-4" />
                Langsung Pasang Sekarang
              </button>
            )}

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ringan & Siap Offline
              </span>
              <button
                onClick={() => setShowGuideModal(false)}
                className="text-slate-400 hover:text-slate-200 underline"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
