import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  Zap,
  AlertCircle,
  QrCode,
  AlignJustify,
  Scan,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FastForward,
} from 'lucide-react';
import { PackageCondition } from '../types';
import { CONDITION_LABELS, extractTrackingNumberFromBarcodeKotak } from '../utils/expeditions';
import { playReadyChime } from '../utils/audio';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (
    trackingNumber: string,
    condition: PackageCondition
  ) => 'added' | 'duplicate' | 'mismatch' | void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<PackageCondition>('baik');
  const [scanShape, setScanShape] = useState<'kotak' | 'garis' | 'auto'>('auto');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ resi: string; isKotak: boolean } | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<'added' | 'duplicate' | 'mismatch' | null>(null);

  // 3-Second Loading Cooldown State
  const [isLoadingCooldown, setIsLoadingCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(3.0);
  const isCooldownRef = useRef(false);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-camera-barcode-scanner';

  const handleSkipCooldown = () => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    isCooldownRef.current = false;
    setIsLoadingCooldown(false);
    setCooldownRemaining(0);
    playReadyChime();
  };

  useEffect(() => {
    if (!isOpen) {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      isCooldownRef.current = false;
      setIsLoadingCooldown(false);

      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
        setIsScanning(false);
      }
      return;
    }

    let isMounted = true;
    setErrorMessage(null);

    const startScanner = async () => {
      try {
        // Stop any previous instance before restarting with new shape
        if (scannerRef.current) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch {}
          scannerRef.current = null;
        }

        const formatsToSupport = [
          // 2D Square Barcodes (Barcode Kotak)
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.MAXICODE,
          // 1D Linear Barcodes (Barcode Garis)
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
        ];

        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        // Determine viewfinder box dimensions based on scanShape
        let qrboxConfig: { width: number; height: number };
        if (scanShape === 'kotak') {
          // Square for Barcode Kotak / QR Code
          qrboxConfig = { width: 250, height: 250 };
        } else if (scanShape === 'garis') {
          // Wide horizontal rectangle for 1D Barcode
          qrboxConfig = { width: 300, height: 140 };
        } else {
          // Auto / universal square-ish
          qrboxConfig = { width: 260, height: 220 };
        }

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: qrboxConfig,
            aspectRatio: 1.333333,
          },
          (decodedText) => {
            if (!isMounted) return;

            // Block multiple reads during the 3-second loading cooldown
            if (isCooldownRef.current) {
              return;
            }

            // Parse barcode kotak payload or 1D string
            const extracted = extractTrackingNumberFromBarcodeKotak(decodedText);
            const finalResi = extracted.trackingNumber || decodedText.trim().toUpperCase();

            if (!finalResi) return;

            setLastScanned({
              resi: finalResi,
              isKotak: extracted.isFrom2D,
            });

            // Trigger result
            const resultStatus = onScanResult(finalResi, selectedCondition) || 'added';
            setLastScanStatus(resultStatus as 'added' | 'duplicate' | 'mismatch');

            // START 3-SECOND LOADING COOLDOWN
            isCooldownRef.current = true;
            setIsLoadingCooldown(true);
            setCooldownRemaining(3.0);

            const DURATION = 3000;
            const startTime = Date.now();

            if (cooldownIntervalRef.current) {
              clearInterval(cooldownIntervalRef.current);
            }

            cooldownIntervalRef.current = setInterval(() => {
              if (!isMounted) {
                if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
                return;
              }
              const elapsed = Date.now() - startTime;
              const remaining = Math.max(0, (DURATION - elapsed) / 1000);
              setCooldownRemaining(remaining);

              if (remaining <= 0) {
                if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
                cooldownIntervalRef.current = null;
                isCooldownRef.current = false;
                setIsLoadingCooldown(false);
                playReadyChime();
              }
            }, 50);
          },
          () => {
            // frame search, ignore
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: unknown) {
        console.error('Camera barcode scanner error', err);
        if (isMounted) {
          setErrorMessage(
            'Gagal mengakses kamera. Pastikan izin kamera telah diberikan di browser atau gunakan scanner barcode fisik / ketik manual.'
          );
        }
      }
    };

    const timer = setTimeout(() => {
      startScanner();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      isCooldownRef.current = false;
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScanResult, selectedCondition, scanShape]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-1.5">
                  Scan Barcode Garis & Kotak (2D/QR)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Jeda 3 Detik Aktif
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Loading 3 detik setelah tembak untuk jeda aman & cegah double-scan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Mode Switcher */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Bentuk Target:</span>
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setScanShape('auto')}
              className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 cursor-pointer ${
                scanShape === 'auto' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Otomatis</span>
            </button>
            <button
              type="button"
              onClick={() => setScanShape('kotak')}
              className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 cursor-pointer ${
                scanShape === 'kotak' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Kotak (2D/QR)</span>
            </button>
            <button
              type="button"
              onClick={() => setScanShape('garis')}
              className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1 cursor-pointer ${
                scanShape === 'garis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span>Garis (1D)</span>
            </button>
          </div>
        </div>

        {/* Camera Viewport Area */}
        <div className="p-4 bg-black relative flex flex-col items-center justify-center min-h-[320px]">
          <div id={containerId} className="w-full max-w-sm rounded-xl overflow-hidden shadow-inner"></div>

          {/* 3-SECOND LOADING COOLDOWN OVERLAY */}
          {isLoadingCooldown && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 z-20 text-center animate-in fade-in duration-150">
              {/* Circular Countdown with SVG Ring */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-3">
                <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800 stroke-current"
                    strokeWidth="3.2"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-amber-400 stroke-current transition-all duration-75 ease-linear"
                    strokeWidth="3.2"
                    strokeDasharray="100, 100"
                    strokeDashoffset={((3.0 - cooldownRemaining) / 3.0) * 100}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black font-mono text-amber-300">
                    {Math.ceil(cooldownRemaining)}s
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cooldownRemaining.toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Status Header Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 mb-2.5">
                <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Loading 3 Detik Setelah Scan Resi</span>
              </div>

              {/* Scanned Tracking Number Info */}
              {lastScanned && (
                <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 mb-2 max-w-xs w-full shadow-lg">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-0.5">
                    {lastScanStatus === 'duplicate' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    ) : lastScanStatus === 'mismatch' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>
                      {lastScanStatus === 'duplicate'
                        ? 'Resi Duplikat Terdeteksi'
                        : lastScanStatus === 'mismatch'
                        ? 'Resi Beda Ekspedisi'
                        : 'Resi Berhasil Ditembak'}
                    </span>
                  </div>
                  <p className="font-mono font-bold text-white text-sm sm:text-base tracking-wider truncate">
                    {lastScanned.resi}
                  </p>
                </div>
              )}

              {/* Progress Line */}
              <div className="w-48 bg-slate-800 rounded-full h-1.5 mb-3 overflow-hidden">
                <div
                  className="bg-amber-400 h-full transition-all duration-75 ease-linear"
                  style={{ width: `${((3.0 - cooldownRemaining) / 3.0) * 100}%` }}
                ></div>
              </div>

              <p className="text-xs text-slate-400 max-w-xs mb-3">
                Kamera sedang loading jeda 3 detik untuk mencegah scan ganda sebelum paket berikutnya.
              </p>

              {/* Skip button if operator is ready early */}
              <button
                type="button"
                onClick={handleSkipCooldown}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <FastForward className="w-3.5 h-3.5 text-amber-400" />
                <span>Lewati Jeda & Scan Sekarang</span>
              </button>
            </div>
          )}

          {errorMessage ? (
            <div className="p-4 text-center text-rose-400 text-xs flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8" />
              <p>{errorMessage}</p>
            </div>
          ) : !isScanning ? (
            <div className="text-slate-400 text-xs flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Menyiapkan kamera & sensor barcode kotak...</span>
            </div>
          ) : (
            <div className="mt-3 text-center space-y-1.5">
              <p className="text-xs text-slate-300 flex items-center justify-center gap-1.5 font-mono">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Arahkan kamera tepat ke barcode kotak (QR Code/DataMatrix) atau garis resi
              </p>
              {lastScanned && !isLoadingCooldown && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs border border-emerald-500/40">
                  {lastScanned.isKotak && (
                    <span className="bg-indigo-500/30 text-indigo-300 text-[10px] px-1.5 py-0.2 rounded font-bold uppercase">
                      Barcode Kotak 2D
                    </span>
                  )}
                  <span>Terakhir discan: {lastScanned.resi}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Condition Selector in Camera Mode */}
        <div className="p-4 bg-slate-800/80 border-t border-slate-800">
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Pilih Kondisi Paket untuk Scan Kamera Berikutnya:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                'baik',
                'kemasan_rusak',
                'segel_terbuka',
                'basah_bocor',
                'label_pudar',
                'indikasi_tertukar',
              ] as PackageCondition[]
            ).map((cond) => {
              const isSelected = selectedCondition === cond;
              return (
                <button
                  key={cond}
                  type="button"
                  onClick={() => setSelectedCondition(cond)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {CONDITION_LABELS[cond].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            QR Code • DataMatrix • Code 128 • Code 39
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Tutup Kamera
          </button>
        </div>
      </div>
    </div>
  );
};
