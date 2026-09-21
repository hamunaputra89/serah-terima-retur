import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  CheckCircle2,
  AlertTriangle,
  ListOrdered,
  Copy,
  Check,
  Package,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Barcode,
  RotateCcw,
  UploadCloud,
  ImageIcon,
} from 'lucide-react';
import { PackageCondition, ReturnItem } from '../types';
import {
  CONDITION_LABELS,
  extractTrackingNumberFromBarcodeKotak,
  getExpedition,
  detectExpedition,
} from '../utils/expeditions';

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
  const [activeTab, setActiveTab] = useState<'live' | 'upload'>('live');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isFileScanning, setIsFileScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const [lastScanned, setLastScanned] = useState<{
    resi: string;
    isKotak: boolean;
    status: 'added' | 'duplicate' | 'mismatch';
  } | null>(null);
  const [copiedResi, setCopiedResi] = useState<string | null>(null);

  // Local log of scans performed in this camera session
  const [cameraScanLogs, setCameraScanLogs] = useState<CameraScanLog[]>([]);

  // Internal debounce guard to prevent duplicate firing on the same barcode held in view (no visual delay)
  const lastScannedRef = useRef<{ resi: string; time: number }>({ resi: '', time: 0 });
  const flashToastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerId = 'interactive-camera-barcode-scanner';

  const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(resi);
    setTimeout(() => setCopiedResi(null), 1500);
  };

  const stopAndClearScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        // Silently handle normal stopping phase
        console.debug('Info stopping scanner:', err);
      }
      try {
        await scannerRef.current.clear();
      } catch (err) {
        console.debug('Info clearing scanner:', err);
      }
      scannerRef.current = null;
    }
  }, []);

  const processDecodedBarcode = useCallback(
    (decodedText: string) => {
      const extracted = extractTrackingNumberFromBarcodeKotak(decodedText);
      const finalResi = extracted.trackingNumber || decodedText.trim().toUpperCase();

      if (!finalResi) return;

      const now = Date.now();
      // Silent debounce: ignore identical barcode within 1.2s to prevent multiple triggers while holding box
      if (finalResi === lastScannedRef.current.resi && now - lastScannedRef.current.time < 1200) {
        return;
      }
      lastScannedRef.current = { resi: finalResi, time: now };

      const resultStatus = (onScanResult(finalResi, selectedCondition) || 'added') as
        | 'added'
        | 'duplicate'
        | 'mismatch';

      setLastScanned({
        resi: finalResi,
        isKotak: extracted.isFrom2D,
        status: resultStatus,
      });

      // Auto-hide the flash status after 2.5 seconds
      if (flashToastTimeoutRef.current) {
        clearTimeout(flashToastTimeoutRef.current);
      }
      flashToastTimeoutRef.current = setTimeout(() => {
        setLastScanned(null);
      }, 2500);

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
    },
    [onScanResult, selectedCondition]
  );

  const startScanner = useCallback(async () => {
    if (!isOpen || activeTab !== 'live') return;

    setErrorMessage(null);
    setIsPermissionDenied(false);
    setIsScanning(false);

    await stopAndClearScanner();

    try {
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

      const scannerConfig = {
        fps: 20,
        qrbox: qrboxConfig,
        aspectRatio: 1.333333,
      };

      // Try start with requested camera, or fallback if facingMode 'environment' not available (e.g. laptop)
      try {
        const cameraTarget = selectedCameraId ? selectedCameraId : { facingMode: 'environment' };
        await html5QrCode.start(cameraTarget, scannerConfig, processDecodedBarcode, () => {});
      } catch (firstErr: unknown) {
        const errObj = firstErr as Record<string, unknown> | null;
        const errMsg = String(errObj?.message || firstErr);
        const isDenied =
          errObj?.name === 'NotAllowedError' ||
          errMsg.includes('NotAllowedError') ||
          errMsg.includes('Permission denied') ||
          errMsg.includes('permission');

        if (isDenied) {
          throw firstErr;
        }

        // Fallback for laptops/desktops without rear/environment camera
        if (!selectedCameraId) {
          try {
            const devices = await Html5Qrcode.getCameras().catch(() => []);
            if (devices && devices.length > 0) {
              await html5QrCode.start(devices[0].id, scannerConfig, processDecodedBarcode, () => {});
            } else {
              await html5QrCode.start({ facingMode: 'user' }, scannerConfig, processDecodedBarcode, () => {});
            }
          } catch (fallbackErr) {
            throw fallbackErr;
          }
        } else {
          throw firstErr;
        }
      }

      setIsScanning(true);
      setIsPermissionDenied(false);
      setErrorMessage(null);

      // Enumerate available cameras if permission is granted
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setAvailableCameras(
              devices.map((d, i) => ({
                id: d.id,
                label: d.label || `Kamera ${i + 1}`,
              }))
            );
          }
        })
        .catch(() => {});
    } catch (err: unknown) {
      // Gracefully handle expected permission denials and device absences without throwing unhandled console.error
      const errObj = err as Record<string, unknown> | null;
      const errMsg = String(errObj?.message || err);
      const isDenied =
        errObj?.name === 'NotAllowedError' ||
        errMsg.includes('NotAllowedError') ||
        errMsg.includes('Permission denied') ||
        errMsg.includes('permission');
      const isNotFound =
        errObj?.name === 'NotFoundError' ||
        errMsg.includes('NotFoundError') ||
        errMsg.includes('DevicesNotFoundError') ||
        errMsg.includes('no camera');

      setIsPermissionDenied(isDenied);
      setIsScanning(false);

      if (isDenied) {
        console.info('Camera permission is required or blocked by browser policy');
        setErrorMessage(
          'Izin kamera belum diberikan atau diblokir oleh browser. Anda dapat mengaktifkannya di setelan browser, atau menggunakan tombol "Ambil Foto Barcode" di bawah.'
        );
      } else if (isNotFound) {
        console.info('No camera device found on this system');
        setErrorMessage(
          'Perangkat kamera tidak terdeteksi. Silakan gunakan fitur Foto Barcode atau Scanner Barcode Gun.'
        );
      } else {
        console.warn('Camera scanner notice:', errMsg);
        setErrorMessage(
          'Kamera tidak dapat dimulai. Pastikan perangkat kamera terpasang dan tidak sedang dibuka oleh aplikasi lain.'
        );
      }
    }
  }, [
    isOpen,
    activeTab,
    processDecodedBarcode,
    scanShape,
    selectedCameraId,
    stopAndClearScanner,
  ]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'live') {
      stopAndClearScanner();
      setIsScanning(false);
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (flashToastTimeoutRef.current) {
        clearTimeout(flashToastTimeoutRef.current);
      }
      stopAndClearScanner();
    };
  }, [isOpen, activeTab, startScanner, stopAndClearScanner]);

  const handleRetryPermission = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setIsPermissionDenied(false);

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (e) {
      console.info('User Media retry note:', e);
    }

    await startScanner();
    setIsRetrying(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setErrorMessage(null);

    try {
      let codeScanner = scannerRef.current;
      if (!codeScanner) {
        codeScanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.AZTEC,
            Html5QrcodeSupportedFormats.MAXICODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
          ],
          verbose: false,
        });
        scannerRef.current = codeScanner;
      }

      if (codeScanner.isScanning) {
        await codeScanner.stop();
        setIsScanning(false);
      }

      const decodedText = await codeScanner.scanFile(file, true);
      processDecodedBarcode(decodedText);
    } catch (err) {
      console.info('File scan notice:', err);
      setErrorMessage('Barcode pada foto tidak terbaca. Pastikan foto barcode tegak lurus, tajam, dan tidak buram/silau.');
    } finally {
      setIsFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col my-auto">
        {/* Hidden file input for direct photo snapshot without browser getUserMedia constraints */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>Scan Kamera / Foto Resi</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Instan
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Arahkan ke barcode garis (1D) atau barcode kotak (2D/QR)
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

        {/* Mode Selector Tab: Kamera Video vs Ambil Foto Barcode */}
        <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Kamera Langsung</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Foto / Unggah Gambar</span>
            </button>
          </div>

          {activeTab === 'live' && !isPermissionDenied && (
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[11px]">Bentuk:</span>
              <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-md border border-slate-700">
                <button
                  type="button"
                  onClick={() => setScanShape('auto')}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    scanShape === 'auto' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Deteksi Otomatis"
                >
                  Auto
                </button>
                <button
                  type="button"
                  onClick={() => setScanShape('kotak')}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    scanShape === 'kotak' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Kotak (2D/QR)"
                >
                  Kotak
                </button>
                <button
                  type="button"
                  onClick={() => setScanShape('garis')}
                  className={`px-2 py-0.5 rounded text-[11px] transition ${
                    scanShape === 'garis' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                  title="Garis (1D)"
                >
                  Garis
                </button>
              </div>
            </div>
          )}

          {/* Camera device picker if multiple cameras exist */}
          {activeTab === 'live' && availableCameras.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Kamera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="">Otomatis</option>
                {availableCameras.map((cam) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-800">
          {/* Camera Viewport Area */}
          <div className="p-3 bg-black relative flex flex-col items-center justify-center min-h-[250px] sm:min-h-[290px]">
            {/* The html5QrCode container must remain in DOM for clean lifecycle */}
            <div
              id={containerId}
              className={`w-full max-w-sm rounded-xl overflow-hidden shadow-inner ${
                isPermissionDenied || activeTab === 'upload' ? 'hidden' : ''
              }`}
            ></div>

            {/* Instant Floating Scan Feedback Banner */}
            {lastScanned && (
              <div
                className={`absolute bottom-3 inset-x-4 max-w-md mx-auto p-2.5 rounded-xl border shadow-xl backdrop-blur-md flex items-center justify-between gap-2 text-xs animate-in slide-in-from-bottom-2 duration-150 z-20 ${
                  lastScanned.status === 'duplicate'
                    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200'
                    : lastScanned.status === 'mismatch'
                    ? 'bg-amber-950/90 border-amber-500/60 text-amber-200'
                    : 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {lastScanned.status === 'duplicate' ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : lastScanned.status === 'mismatch' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                  <div className="truncate">
                    <span className="font-mono font-bold tracking-wider">{lastScanned.resi}</span>
                    <span className="ml-1.5 opacity-80 text-[11px]">
                      {lastScanned.status === 'duplicate'
                        ? '(Resi Duplikat!)'
                        : lastScanned.status === 'mismatch'
                        ? '(Beda Ekspedisi)'
                        : '✓ Berhasil Discan'}
                    </span>
                  </div>
                </div>
                {lastScanned.isKotak && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shrink-0">
                    Kotak 2D
                  </span>
                )}
              </div>
            )}

            {/* Upload Tab Area */}
            {activeTab === 'upload' ? (
              <div className="w-full max-w-md p-5 rounded-2xl bg-slate-900 border border-slate-800 text-center flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Ambil Foto / Unggah Gambar Barcode</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Bekerja langsung di semua browser HP & komputer tanpa memerlukan izin kamera live.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isFileScanning}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow disabled:opacity-50"
                >
                  {isFileScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menganalisis Barcode...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      <span>Pilih Foto atau Jepret Barcode</span>
                    </>
                  )}
                </button>

                {errorMessage && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left w-full flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>
            ) : isPermissionDenied ? (
              /* Comprehensive Permission Denied Guidance Card */
              <div className="w-full max-w-md p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-amber-500/40 text-center flex flex-col items-center gap-3.5 shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="text-base font-bold text-white flex items-center justify-center gap-2">
                    <span>Akses Kamera Belum Diizinkan</span>
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1">
                    Browser Anda memerlukan izin untuk menyalakan video streaming kamera live.
                  </p>
                </div>

                {/* Instant Alternative: Snap / Upload without browser webcam prompt */}
                <div className="w-full p-3 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex flex-col gap-2">
                  <div className="text-xs font-bold text-indigo-200 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Solusi Cepat Tanpa Setel Izin:</span>
                  </div>
                  <p className="text-[11px] text-slate-300 text-left">
                    Gunakan kamera bawaan perangkat atau ambil foto resi secara instan:
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isFileScanning}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Ambil / Unggah Foto Barcode</span>
                  </button>
                </div>

                {/* Step-by-step instructions to unblock live video */}
                <div className="w-full text-left bg-slate-950/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2 text-slate-300">
                  <div className="font-semibold text-slate-200 flex items-center gap-1.5 pb-1 border-b border-slate-800">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cara Mengaktifkan Kamera Live di Browser:</span>
                  </div>

                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] text-amber-400 font-bold shrink-0">
                        1
                      </span>
                      <span>
                        Klik ikon <strong>Gembok (🔒)</strong> atau <strong>Setelan Situs</strong> di sebelah kiri bilah alamat URL (address bar).
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] text-amber-400 font-bold shrink-0">
                        2
                      </span>
                      <span>
                        Pada menu <strong>Kamera (Camera)</strong>, pilih <strong>Izinkan (Allow)</strong>.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 font-mono text-[10px] text-amber-400 font-bold shrink-0">
                        3
                      </span>
                      <span>
                        Klik tombol <strong>"Minta Izin Ulang"</strong> di bawah ini.
                      </span>
                    </div>
                  </div>

                  {isInsideIframe && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-amber-300/90 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">Catatan Pratinjau:</span>
                      <span>
                        Browser membatasi izin live video di dalam iframe. Gunakan <strong>Buka di Tab Baru</strong> agar izin dapat langsung diizinkan.
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRetryPermission}
                    disabled={isRetrying}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    <span>{isRetrying ? 'Memeriksa...' : 'Minta Izin Ulang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenNewTab}
                    className="w-full sm:flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Buka di Tab Baru</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition pt-0.5"
                >
                  <Barcode className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kembali ke Barcode Scanner Gun / Ketik Manual</span>
                </button>
              </div>
            ) : errorMessage ? (
              <div className="p-4 text-center text-rose-400 text-xs flex flex-col items-center gap-2.5 max-w-md">
                <AlertCircle className="w-8 h-8" />
                <p>{errorMessage}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Foto Barcode Saja</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRetryPermission}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              </div>
            ) : !isScanning ? (
              <div className="text-slate-400 text-xs flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Menyiapkan kamera...</span>
              </div>
            ) : (
              <div className="mt-2 text-center">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Kamera aktif — scan langsung otomatis diproses tanpa jeda
                </p>
              </div>
            )}
          </div>

          {/* Compact Condition Selector */}
          <div className="p-3 bg-slate-900/90">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Kondisi Paket Retur:
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

          {/* Simple List of Scanned Resi in this Session */}
          <div className="p-3.5 bg-slate-950">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Hasil Scan Sesi Ini</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {sessionItems.length > 0 ? sessionItems.length : cameraScanLogs.length}
                  </span>
                </h4>
              </div>
              <span className="text-[10px] text-slate-500">Terbaru di atas</span>
            </div>

            {sessionItems.length === 0 && cameraScanLogs.length === 0 ? (
              <div className="py-4 px-3 text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-slate-400">
                <Package className="w-5 h-5 mx-auto text-slate-600 mb-1" />
                <p className="text-xs text-slate-400">Belum ada resi yang discan kamera</p>
              </div>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {(sessionItems.length > 0 ? sessionItems : cameraScanLogs).slice(0, 10).map((item, index) => {
                  const tracking = 'trackingNumber' in item ? item.trackingNumber : '';
                  const detected = detectExpedition(tracking);
                  const expInfo = getExpedition(detected);
                  const isFirst = index === 0;

                  return (
                    <div
                      key={item.id}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 text-xs transition ${
                        isFirst
                          ? 'bg-slate-800 border-emerald-500/40'
                          : 'bg-slate-900/60 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-white tracking-wider text-xs">
                          {tracking}
                        </span>
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

                      <button
                        type="button"
                        onClick={() => handleCopyResi(tracking)}
                        className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
                        title="Salin resi"
                      >
                        {copiedResi === tracking ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isPermissionDenied ? 'bg-amber-400' : isScanning ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            ></span>
            {isPermissionDenied
              ? 'Izin kamera live diblokir (Gunakan Foto Barcode)'
              : isScanning
              ? 'Scan kamera aktif'
              : activeTab === 'upload'
              ? 'Mode Foto Barcode'
              : 'Menyiapkan kamera...'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
