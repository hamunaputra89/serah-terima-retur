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
  ListOrdered,
  Copy,
  Check,
  Package,
} from 'lucide-react';
import { PackageCondition, ReturnItem } from '../types';
import {
  CONDITION_LABELS,
  extractTrackingNumberFromBarcodeKotak,
  getExpedition,
  detectExpedition,
} from '../utils/expeditions';
import { playReadyChime } from '../utils/audio';

interface CameraScanLog {
  id: string;
  trackingNumber: string;
  condition: PackageCondition;
  isKotak: boolean;
  status: 'added' | 'duplicate' | 'mismatch';
  timestamp: string;
}

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (
    trackingNumber: string,
    condition: PackageCondition
  ) => 'added' | 'duplicate' | 'mismatch' | void;
  sessionItems?: ReturnItem[];
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanResult,
  sessionItems = [],
}) => {
  const [selectedCondition, setSelectedCondition] = useState<PackageCondition>('baik');
  const [scanShape, setScanShape] = useState<'kotak' | 'garis' | 'auto'>('auto');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ resi: string; isKotak: boolean } | null>(null);
  const [lastScanStatus, setLastScanStatus] = useState<'added' | 'duplicate' | 'mismatch' | null>(null);
  const [copiedResi, setCopiedResi] = useState<string | null>(null);

  // Local log of scans performed in this camera session
  const [cameraScanLogs, setCameraScanLogs] = useState<CameraScanLog[]>([]);

  // 1-Second Loading Cooldown State
  const [isLoadingCooldown, setIsLoadingCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(1.0);
  const isCooldownRef = useRef(false);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'interactive-camera-barcode-scanner';

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(resi);
    setTimeout(() => setCopiedResi(null), 1500);
  };

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

        let qrboxConfig: { width: number; height: number };
        if (scanShape === 'kotak') {
          qrboxConfig = { width: 240, height: 240 };
        } else if (scanShape === 'garis') {
          qrboxConfig = { width: 280, height: 130 };
        } else {
          qrboxConfig = { width: 250, height: 210 };
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

            // Block multiple reads during the 1-second loading cooldown
            if (isCooldownRef.current) {
              return;
            }

            const extracted = extractTrackingNumberFromBarcodeKotak(decodedText);
            const finalResi = extracted.trackingNumber || decodedText.trim().toUpperCase();

            if (!finalResi) return;

            setLastScanned({
              resi: finalResi,
              isKotak: extracted.isFrom2D,
            });

            const resultStatus = (onScanResult(finalResi, selectedCondition) || 'added') as
              | 'added'
              | 'duplicate'
              | 'mismatch';
            setLastScanStatus(resultStatus);

            // Record to local session scan log
            setCameraScanLogs((prev) => [
              {
                id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
                trackingNumber: finalResi,
                condition: selectedCondition,
                isKotak: extracted.isFrom2D,
                status: resultStatus,
                timestamp: new Date().toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                }),
              },
              ...prev,
            ]);

            // START 1-SECOND LOADING COOLDOWN
            isCooldownRef.current = true;
            setIsLoadingCooldown(true);
            setCooldownRemaining(1.0);

            const DURATION = 1000; // 1 second
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
            }, 40);
          },
          () => {}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
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
                  Jeda 1 Detik
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Loading 1 detik setelah tembak untuk jeda aman & anti double-scan
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
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
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

        {/* Main Scrollable Content Area */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
          {/* Camera Viewport Area */}
          <div className="p-3 bg-black relative flex flex-col items-center justify-center min-h-[260px] sm:min-h-[290px]">
            <div id={containerId} className="w-full max-w-sm rounded-xl overflow-hidden shadow-inner"></div>

            {/* 1-SECOND LOADING COOLDOWN OVERLAY */}
            {isLoadingCooldown && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-20 text-center animate-in fade-in duration-100">
                {/* Circular Countdown with SVG Ring for 1 Second */}
                <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                  <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 36 36">
                    <path
                      className="text-slate-800 stroke-current"
                      strokeWidth="3.5"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-amber-400 stroke-current transition-all duration-40 ease-linear"
                      strokeWidth="3.5"
                      strokeDasharray="100, 100"
                      strokeDashoffset={((1.0 - cooldownRemaining) / 1.0) * 100}
                      strokeLinecap="round"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black font-mono text-amber-300">
                      {cooldownRemaining.toFixed(1)}s
                    </span>
                  </div>
                </div>

                {/* Status Header Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 mb-2">
                  <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span>Loading 1 Detik...</span>
                </div>

                {/* Scanned Tracking Number Info */}
                {lastScanned && (
                  <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-1.5 mb-2 max-w-xs w-full shadow-lg">
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
                <div className="w-40 bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className="bg-amber-400 h-full transition-all duration-40 ease-linear"
                    style={{ width: `${((1.0 - cooldownRemaining) / 1.0) * 100}%` }}
                  ></div>
                </div>

                {/* Quick Skip button */}
                <button
                  type="button"
                  onClick={handleSkipCooldown}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FastForward className="w-3 h-3 text-amber-400" />
                  <span>Lewati Jeda</span>
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
              <div className="mt-2 text-center space-y-1">
                <p className="text-xs text-slate-300 flex items-center justify-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Arahkan kamera ke barcode kotak (QR) atau garis resi
                </p>
              </div>
            )}
          </div>

          {/* Condition Selector in Camera Mode */}
          <div className="p-3 bg-slate-900/90">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Kondisi Paket untuk Scan Berikutnya:
              </label>
              <span className="text-[11px] text-amber-400 font-medium">
                {CONDITION_LABELS[selectedCondition].label}
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
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
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer truncate ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm font-bold'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {CONDITION_LABELS[cond].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* LIST HASIL SCAN RESI (LIVE REAL-TIME RESULTS) */}
          <div className="p-4 bg-slate-950">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                  <span>List Hasil Scan Resi</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {sessionItems.length > 0 ? sessionItems.length : cameraScanLogs.length} Resi
                  </span>
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">Terbaru di atas</span>
            </div>

            {/* List Table / Cards */}
            {sessionItems.length === 0 && cameraScanLogs.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-xl bg-slate-900/60 border border-dashed border-slate-800 text-slate-400">
                <Package className="w-7 h-7 mx-auto text-slate-600 mb-1.5" />
                <p className="text-xs font-medium text-slate-300">Belum ada resi yang discan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Arahkan kamera ke barcode resi kurir. Hasil scan akan langsung muncul di list ini.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {/* Prefer session items if available, or fallback to cameraScanLogs */}
                {sessionItems.length > 0
                  ? sessionItems.slice(0, 15).map((item, index) => {
                      const detected = detectExpedition(item.trackingNumber);
                      const expInfo = getExpedition(detected);
                      const isFirst = index === 0;

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                            isFirst
                              ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                              #{sessionItems.length - index}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm">
                                  {item.trackingNumber}
                                </span>
                                {item.barcodeType === '2d_kotak' && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Kotak 2D
                                  </span>
                                )}
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                                  style={{
                                    backgroundColor: `${expInfo.color}15`,
                                    color: expInfo.color,
                                    borderColor: `${expInfo.color}40`,
                                  }}
                                >
                                  {expInfo.shortName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="text-slate-300">
                                  {CONDITION_LABELS[item.condition]?.label || 'Baik'}
                                </span>
                                <span>•</span>
                                <span>
                                  {new Date(item.scannedAt).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isFirst && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Baru
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleCopyResi(item.trackingNumber)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                              title="Salin nomor resi"
                            >
                              {copiedResi === item.trackingNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  : cameraScanLogs.map((log, index) => {
                      const detected = detectExpedition(log.trackingNumber);
                      const expInfo = getExpedition(detected);
                      const isFirst = index === 0;

                      return (
                        <div
                          key={log.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition ${
                            isFirst
                              ? 'bg-slate-800/90 border-emerald-500/50 shadow-sm ring-1 ring-emerald-500/30'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                              #{cameraScanLogs.length - index}
                            </span>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm">
                                  {log.trackingNumber}
                                </span>
                                {log.isKotak && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Kotak 2D
                                  </span>
                                )}
                                <span
                                  className="px-1.5 py-0.2 rounded text-[9px] font-bold border"
                                  style={{
                                    backgroundColor: `${expInfo.color}15`,
                                    color: expInfo.color,
                                    borderColor: `${expInfo.color}40`,
                                  }}
                                >
                                  {expInfo.shortName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{CONDITION_LABELS[log.condition]?.label || 'Baik'}</span>
                                <span>•</span>
                                <span>{log.timestamp}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                log.status === 'duplicate'
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  : log.status === 'mismatch'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                            >
                              {log.status === 'duplicate'
                                ? 'Duplikat'
                                : log.status === 'mismatch'
                                ? 'Beda Ekspedisi'
                                : 'Sukses'}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyResi(log.trackingNumber)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
                              title="Salin nomor resi"
                            >
                              {copiedResi === log.trackingNumber ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Scan Kotak (2D/QR) & Garis (1D) Aktif
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
