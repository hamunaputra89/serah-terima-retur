import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Volume2,
  VolumeX,
  Zap,
  Sparkles,
  QrCode,
  ScanLine,
  Clock,
  FastForward,
} from 'lucide-react';
import { ExpeditionId, PackageCondition, ScanFeedback } from '../types';
import {
  detectExpedition,
  getExpedition,
  CONDITION_LABELS,
  extractTrackingNumberFromBarcodeKotak,
} from '../utils/expeditions';
import {
  playSuccessBeep,
  playDuplicateWarning,
  playMismatchWarning,
  playReadyChime,
  speakText,
} from '../utils/audio';

interface ScannerInputProps {
  sessionExpedition: ExpeditionId | 'all';
  onScanSuccess: (
    trackingNumber: string,
    condition: PackageCondition,
    note?: string,
    barcodeType?: '1d' | '2d_kotak'
  ) => 'added' | 'duplicate' | 'mismatch';
  onOpenBulkModal: () => void;
  onOpenCameraModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

export const ScannerInput: React.FC<ScannerInputProps> = ({
  sessionExpedition,
  onScanSuccess,
  onOpenBulkModal,
  onOpenCameraModal,
  soundEnabled,
  onToggleSound,
  voiceEnabled,
  onToggleVoice,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedCondition, setSelectedCondition] = useState<PackageCondition>('baik');
  const [customNote, setCustomNote] = useState('');
  const [feedback, setFeedback] = useState<(ScanFeedback & { isKotak?: boolean }) | null>(null);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);

  // 3-Second Loading Cooldown State
  const [isLoadingCooldown, setIsLoadingCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(3.0);
  const [cooldownTrackingNumber, setCooldownTrackingNumber] = useState<string>('');
  const isCooldownRef = useRef(false);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep input focused so barcode scanner gun works uninterrupted
  useEffect(() => {
    if (autoFocusEnabled && inputRef.current && !isLoadingCooldown) {
      inputRef.current.focus();
    }
  }, [autoFocusEnabled, isLoadingCooldown]);

  // Click outside to re-focus helper
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.closest('button') ||
          target.closest('[role="dialog"]'))
      ) {
        return;
      }
      if (autoFocusEnabled && inputRef.current && !isCooldownRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [autoFocusEnabled]);

  // Cleanup cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
    };
  }, []);

  const handleSkipCooldown = () => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    isCooldownRef.current = false;
    setIsLoadingCooldown(false);
    setCooldownRemaining(0);
    playReadyChime();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
  };

  const handleProcessScan = (rawResi: string) => {
    // If currently loading cooldown, ignore rapid subsequent triggers from scanner
    if (isCooldownRef.current) {
      return;
    }

    // Intelligently parse raw input, whether it is pure tracking number, URL, JSON, or delimited QR/DataMatrix
    const extracted = extractTrackingNumberFromBarcodeKotak(rawResi);
    const cleaned = extracted.trackingNumber;

    if (!cleaned || cleaned.length < 4) {
      return;
    }

    const detected = detectExpedition(cleaned);
    const barcodeType: '1d' | '2d_kotak' = extracted.isFrom2D ? '2d_kotak' : '1d';
    const result = onScanSuccess(
      cleaned,
      selectedCondition,
      customNote.trim() || undefined,
      barcodeType
    );

    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }

    if (result === 'duplicate') {
      if (soundEnabled) playDuplicateWarning();
      if (voiceEnabled) speakText('Resi sudah ada, duplikat!');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setFeedback({
        type: 'duplicate',
        message: `PERINGATAN: Resi ${cleaned} sudah pernah di-scan pada sesi ini!`,
        trackingNumber: cleaned,
        timestamp: Date.now(),
        isKotak: extracted.isFrom2D,
      });
    } else if (result === 'mismatch') {
      if (soundEnabled) playMismatchWarning();
      const detectedInfo = getExpedition(detected);
      if (voiceEnabled) speakText(`Peringatan, resi ${detectedInfo.shortName}`);
      setFeedback({
        type: 'mismatch',
        message: `PERHATIAN: Resi ${cleaned} terdeteksi ${detectedInfo.name} (Beda dari ekspedisi sesi ini)!`,
        trackingNumber: cleaned,
        timestamp: Date.now(),
        isKotak: extracted.isFrom2D,
      });
    } else {
      if (soundEnabled) playSuccessBeep();
      if (voiceEnabled) speakText('Masuk');
      setFeedback({
        type: 'success',
        message: extracted.isFrom2D
          ? `Sukses [Barcode Kotak 2D]: Resi ${cleaned} berhasil diekstrak dan dicatat.`
          : `Sukses: Resi ${cleaned} berhasil dicatat.`,
        trackingNumber: cleaned,
        timestamp: Date.now(),
        isKotak: extracted.isFrom2D,
      });
    }

    // Reset temporary note and clear input
    setInputValue('');
    setCustomNote('');
    // Reset condition back to 'baik' after scan if was set to special condition
    setSelectedCondition('baik');

    // START 3-SECOND LOADING COOLDOWN FOR BARCODE READER
    isCooldownRef.current = true;
    setIsLoadingCooldown(true);
    setCooldownRemaining(3.0);
    setCooldownTrackingNumber(cleaned);

    const startTime = Date.now();
    const DURATION = 3000;

    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
    }

    cooldownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (DURATION - elapsed) / 1000);
      setCooldownRemaining(remaining);

      if (remaining <= 0) {
        if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
        isCooldownRef.current = false;
        setIsLoadingCooldown(false);
        playReadyChime();
        setTimeout(() => {
          inputRef.current?.focus();
        }, 20);
      }
    }, 50);

    // Clear feedback after 4.5 seconds
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleProcessScan(inputValue);
    }
  };

  const expectedExpeditionInfo = sessionExpedition !== 'all' ? getExpedition(sessionExpedition) : null;
  const parsedCandidate = inputValue.length >= 4 ? extractTrackingNumberFromBarcodeKotak(inputValue) : null;
  const detectedWhileTyping = parsedCandidate?.trackingNumber ? detectExpedition(parsedCandidate.trackingNumber) : null;
  const detectedInfo = detectedWhileTyping ? getExpedition(detectedWhileTyping) : null;

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Barcode className="w-5 h-5" />
            <QrCode className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Tembak Resi (Garis 1D & Kotak 2D)
              {isLoadingCooldown ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                  Loading {Math.ceil(cooldownRemaining)}s ({cooldownRemaining.toFixed(1)}s)
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  Siap Tembak
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Mendukung tembak <strong className="text-slate-200">Barcode Kotak (QR Code / DataMatrix)</strong> maupun{' '}
              <strong className="text-slate-200">Barcode Garis 1D</strong> dengan jeda loading 3 detik setelah scan.
            </p>
          </div>
        </div>

        {/* Action toggles: Sound, Voice, Camera, Bulk */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-700/60 text-slate-200 border-slate-600 hover:bg-slate-700'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Beep Aktif' : 'Beep Mute'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Matikan Notifikasi Suara' : 'Aktifkan Suara Bicara (TTS)'}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              voiceEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Voice TTS</span>
          </button>

          <button
            type="button"
            onClick={onOpenCameraModal}
            className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Kamera (Jeda 3s)</span>
          </button>

          <button
            type="button"
            onClick={onOpenBulkModal}
            className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-600 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Tempel Banyak</span>
          </button>
        </div>
      </div>

      {/* 3-Second Loading Banner Notice */}
      {isLoadingCooldown && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Pembaca barcode loading 3 detik:</span>{' '}
              <span>
                Resi <strong className="font-mono text-amber-200">{cooldownTrackingNumber}</strong> berhasil ditembak.
                Jeda aman untuk memindahkan paket & cegah scan dobel ({cooldownRemaining.toFixed(1)}s tersisa).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkipCooldown}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition cursor-pointer shrink-0 shadow-sm"
          >
            <FastForward className="w-3 h-3" />
            <span>Lewati Jeda</span>
          </button>
        </div>
      )}

      {/* Main Input Box */}
      <div className="relative">
        <div
          className={`relative rounded-xl border-2 transition-all shadow-inner overflow-hidden ${
            isLoadingCooldown
              ? 'border-amber-500/80 bg-slate-900/90 ring-2 ring-amber-500/20'
              : feedback?.type === 'duplicate'
              ? 'border-red-500 bg-red-950/20 shadow-red-900/30'
              : feedback?.type === 'mismatch'
              ? 'border-amber-500 bg-amber-950/20 shadow-amber-900/30'
              : feedback?.type === 'success'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/30'
              : 'border-amber-500/50 bg-slate-900 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-500/20'
          }`}
        >
          {/* Animated 3-Second Cooldown Progress Bar */}
          {isLoadingCooldown && (
            <div className="h-1.5 w-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-75 ease-linear"
                style={{ width: `${((3.0 - cooldownRemaining) / 3.0) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center">
            <div className="pl-4 pr-2 text-slate-400 flex items-center gap-1">
              <Barcode className="w-6 h-6 text-amber-400" />
              <QrCode className="w-4 h-4 text-indigo-400" />
            </div>

            <input
              ref={inputRef}
              type="text"
              id="barcode-input-field"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoadingCooldown}
              placeholder={
                isLoadingCooldown
                  ? `⏳ Loading 3 detik... Menyiapkan scanner (${cooldownRemaining.toFixed(1)}s)`
                  : 'Tembak barcode kotak (QR)/garis atau ketik resi...'
              }
              autoComplete="off"
              autoFocus
              className="w-full py-4 pr-32 bg-transparent text-lg sm:text-2xl font-mono font-bold tracking-wider text-white placeholder:text-slate-500 placeholder:text-sm sm:placeholder:text-base placeholder:font-normal focus:outline-none disabled:opacity-60"
            />

            {/* Quick Submit or Cooldown Button */}
            <div className="absolute right-2 flex items-center gap-1.5">
              {isLoadingCooldown ? (
                <div className="flex items-center gap-1.5">
                  <div className="px-3 py-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>{cooldownRemaining.toFixed(1)}s</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipCooldown}
                    className="px-2 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 rounded border border-slate-700 cursor-pointer"
                    title="Lewati jeda loading 3 detik"
                  >
                    Skip
                  </button>
                </div>
              ) : (
                <>
                  {inputValue && (
                    <button
                      type="button"
                      onClick={() => setInputValue('')}
                      className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded border border-slate-700 cursor-pointer"
                    >
                      Batal
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleProcessScan(inputValue)}
                    disabled={!inputValue.trim()}
                    className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-sm flex items-center gap-1 shadow-md transition cursor-pointer"
                  >
                    <span>Enter</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Real-time prefix & 2D parser detection badge while typing */}
        {detectedInfo && parsedCandidate && !isLoadingCooldown && (
          <div className="mt-2 flex items-center justify-between text-xs px-2 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Resi Bersih:</span>
              <span className="font-mono font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {parsedCandidate.trackingNumber}
              </span>
              {parsedCandidate.isFrom2D && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  QR/DataMatrix 2D
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded font-bold border"
                style={{
                  backgroundColor: `${detectedInfo.color}15`,
                  color: detectedInfo.color,
                  borderColor: `${detectedInfo.color}40`,
                }}
              >
                {detectedInfo.name} ({detectedInfo.code})
              </span>
              {expectedExpeditionInfo && expectedExpeditionInfo.id !== detectedInfo.id && (
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Beda ekspedisi dari sesi ({expectedExpeditionInfo.shortName})!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Test / Simulator for Barcode Kotak & Garis */}
      <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-slate-400">
        <span className="shrink-0 flex items-center gap-1 text-slate-500">
          <ScanLine className="w-3 h-3 text-indigo-400" />
          Tes Tembak Barcode:
        </span>
        <button
          type="button"
          onClick={() => handleProcessScan('SPXID04829103984|JAKARTA|COD')}
          disabled={isLoadingCooldown}
          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 font-mono shrink-0 transition cursor-pointer"
          title="Simulasi scan QR Code SPX dengan payload pipe delimiter"
        >
          [QR] SPXID04829103984|COD
        </button>
        <button
          type="button"
          onClick={() =>
            handleProcessScan('https://spx.co.id/m/tracking?tracking_number=SPXID04829103995')
          }
          disabled={isLoadingCooldown}
          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 font-mono shrink-0 transition cursor-pointer"
          title="Simulasi scan QR Code SPX yang berupa Link URL Tracking"
        >
          [QR URL] spx.co.id/tracking
        </button>
        <button
          type="button"
          onClick={() => handleProcessScan('JP8273918237')}
          disabled={isLoadingCooldown}
          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 font-mono shrink-0 transition cursor-pointer"
          title="Simulasi scan Barcode J&T"
        >
          [J&T] JP8273918237
        </button>
        <button
          type="button"
          onClick={() => handleProcessScan('AWB:003928174628')}
          disabled={isLoadingCooldown}
          className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-700 disabled:opacity-40 text-slate-300 border border-slate-700 font-mono shrink-0 transition cursor-pointer"
          title="Simulasi scan QR Code SiCepat"
        >
          [SiCepat QR] AWB:003928174628
        </button>
      </div>

      {/* Instant Feedback Alert */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 duration-200 ${
            feedback.type === 'duplicate'
              ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
              : feedback.type === 'mismatch'
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'duplicate' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : feedback.type === 'mismatch' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold font-mono text-white">{feedback.trackingNumber}</span>
                {feedback.isKotak && (
                  <span className="bg-indigo-500/30 text-indigo-300 text-[10px] font-bold px-1.5 py-0.2 rounded">
                    Barcode Kotak 2D
                  </span>
                )}
              </div>
              <span className="text-xs">{feedback.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-75 hover:opacity-100 underline shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Package Condition Tagging Pre-Selector */}
      <div className="mt-4 pt-4 border-t border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span>Kondisi Paket Retur Saat Ini:</span>
            <span className="text-slate-500 text-[11px] font-normal">
              (Pilih kondisi sebelum/saat tembak resi jika paket rusak)
            </span>
          </label>
          <button
            type="button"
            onClick={() => setSelectedCondition('baik')}
            className={`text-[11px] px-2 py-0.5 rounded transition ${
              selectedCondition === 'baik' ? 'text-slate-400' : 'text-amber-400 hover:underline cursor-pointer'
            }`}
          >
            Reset ke Normal
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.keys(CONDITION_LABELS) as PackageCondition[]).map((condKey) => {
            const info = CONDITION_LABELS[condKey];
            const isSelected = selectedCondition === condKey;
            return (
              <button
                key={condKey}
                type="button"
                onClick={() => {
                  setSelectedCondition(condKey);
                  if (!isLoadingCooldown) inputRef.current?.focus();
                }}
                className={`px-2.5 py-2 rounded-xl text-left border text-xs transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white font-semibold ring-2 ring-amber-500/30'
                    : 'bg-slate-900/50 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <span className="truncate">{info.label}</span>
                {isSelected && <span className="text-[10px] text-amber-400 font-normal">Aktif untuk scan</span>}
              </button>
            );
          })}
        </div>

        {/* Optional note field if non-baik condition selected */}
        {selectedCondition !== 'baik' && (
          <div className="mt-2.5">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Tambahkan catatan khusus paket ini (cth: kardus basah terkena hujan, bocor di pojok)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* Auto-focus helper footer */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 flex-wrap gap-2">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          Input otomatis fokus — jeda 3 detik mencegah double-scan saat memindahkan paket
        </span>
        <button
          type="button"
          onClick={() => {
            setAutoFocusEnabled(!autoFocusEnabled);
            if (!autoFocusEnabled && !isLoadingCooldown) inputRef.current?.focus();
          }}
          className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
        >
          {autoFocusEnabled ? 'Fokus Otomatis Aktif' : 'Fokus Otomatis Mati'}
        </button>
      </div>
    </div>
  );
};
