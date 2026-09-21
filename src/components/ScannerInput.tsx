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
  X,
} from 'lucide-react';
import { ExpeditionId, PackageCondition, ScanFeedback, ReturnItem } from '../types';
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
  items?: ReturnItem[];
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

  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep input focused so barcode scanner gun works uninterrupted without delays
  useEffect(() => {
    if (autoFocusEnabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocusEnabled]);

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
      if (autoFocusEnabled && inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [autoFocusEnabled]);

  const handleProcessScan = (rawResi: string) => {
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
      if (voiceEnabled) speakText('Resi duplikat!');
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setFeedback({
        type: 'duplicate',
        message: `Resi ${cleaned} sudah pernah di-scan pada sesi ini!`,
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
        message: `Resi ${cleaned} terdeteksi ${detectedInfo.name} (Beda dari ekspedisi sesi)!`,
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
          ? `[Barcode Kotak 2D] Resi ${cleaned} berhasil dicatat.`
          : `Resi ${cleaned} berhasil dicatat.`,
        trackingNumber: cleaned,
        timestamp: Date.now(),
        isKotak: extracted.isFrom2D,
      });
    }

    // Instantly reset input and notes, and reset condition back to 'baik'
    setInputValue('');
    setCustomNote('');
    setSelectedCondition('baik');

    // Immediate focus for the next scan without any delay
    inputRef.current?.focus();

    // Auto-dismiss feedback message after 3.5 seconds
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3500);
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
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm">
      {/* Header bar: Simple & focused */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
            <Barcode className="w-5 h-5" />
            <QrCode className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>Tembak Barcode Resi</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-3 h-3 mr-1" />
                Instan (Tanpa Jeda)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Mendukung barcode garis (1D) dan barcode kotak (2D/QR Code)
            </p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onOpenCameraModal}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan Kamera</span>
          </button>

          <button
            type="button"
            onClick={onOpenBulkModal}
            className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-600 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tempel Banyak</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara Beep' : 'Aktifkan Suara Beep'}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-700/60 text-slate-200 border-slate-600 hover:bg-slate-700'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Matikan Suara Bicara' : 'Aktifkan Suara Bicara (TTS)'}
            className={`p-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
              voiceEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Barcode Gun Input */}
      <div className="relative">
        <div
          className={`relative rounded-xl border-2 transition-all shadow-inner overflow-hidden ${
            feedback?.type === 'duplicate'
              ? 'border-red-500 bg-red-950/20 shadow-red-900/30'
              : feedback?.type === 'mismatch'
              ? 'border-amber-500 bg-amber-950/20 shadow-amber-900/30'
              : feedback?.type === 'success'
              ? 'border-emerald-500 bg-emerald-950/20 shadow-emerald-900/30'
              : 'border-amber-500/50 bg-slate-900 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-500/20'
          }`}
        >
          <div className="flex items-center">
            <div className="pl-3.5 pr-2 text-slate-400 flex items-center gap-1">
              <Barcode className="w-6 h-6 text-amber-400" />
            </div>

            <input
              ref={inputRef}
              type="text"
              id="barcode-input-field"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tembak barcode scanner atau ketik resi..."
              autoComplete="off"
              autoFocus
              className="w-full py-3.5 pr-24 bg-transparent text-lg sm:text-xl font-mono font-bold tracking-wider text-white placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal focus:outline-none"
            />

            {/* Clear or Enter Button */}
            <div className="absolute right-2 flex items-center gap-1">
              {inputValue && (
                <button
                  type="button"
                  onClick={() => setInputValue('')}
                  className="p-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                  title="Hapus"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleProcessScan(inputValue)}
                disabled={!inputValue.trim()}
                className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-30 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs sm:text-sm transition cursor-pointer shadow"
              >
                Enter
              </button>
            </div>
          </div>
        </div>

        {/* Live Detected Info Pill */}
        {detectedInfo && parsedCandidate && (
          <div className="mt-2 flex items-center justify-between text-xs px-1 flex-wrap gap-2 animate-in fade-in duration-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-400">Resi:</span>
              <span className="font-mono font-bold text-white bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {parsedCandidate.trackingNumber}
              </span>
              {parsedCandidate.isFrom2D && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Kotak 2D
                </span>
              )}
              <span
                className="px-2 py-0.5 rounded font-bold border text-[11px]"
                style={{
                  backgroundColor: `${detectedInfo.color}15`,
                  color: detectedInfo.color,
                  borderColor: `${detectedInfo.color}40`,
                }}
              >
                {detectedInfo.name} ({detectedInfo.code})
              </span>
              {expectedExpeditionInfo && expectedExpeditionInfo.id !== detectedInfo.id && (
                <span className="text-amber-400 font-semibold flex items-center gap-1 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Beda ekspedisi dari sesi ({expectedExpeditionInfo.shortName})!
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instant Scan Feedback Banner */}
      {feedback && (
        <div
          className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm animate-in fade-in slide-in-from-top-1 duration-150 ${
            feedback.type === 'duplicate'
              ? 'bg-rose-500/15 border-rose-500/50 text-rose-300'
              : feedback.type === 'mismatch'
              ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
              : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedback.type === 'duplicate' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : feedback.type === 'mismatch' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <div className="truncate">
              <span className="font-semibold font-mono text-white mr-2">{feedback.trackingNumber}</span>
              <span>{feedback.message}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline shrink-0 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Package Condition Selection (Simple and compact) */}
      <div className="mt-3 pt-3 border-t border-slate-700/60">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-xs font-medium text-slate-300">
            Kondisi Paket Retur:
          </span>
          {selectedCondition !== 'baik' && (
            <button
              type="button"
              onClick={() => setSelectedCondition('baik')}
              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
            >
              Kembali ke Baik (Normal)
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {(Object.keys(CONDITION_LABELS) as PackageCondition[]).map((condKey) => {
            const info = CONDITION_LABELS[condKey];
            const isSelected = selectedCondition === condKey;
            return (
              <button
                key={condKey}
                type="button"
                onClick={() => {
                  setSelectedCondition(condKey);
                  inputRef.current?.focus();
                }}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition cursor-pointer truncate ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 text-white font-bold ring-1 ring-amber-500/30'
                    : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                {info.label}
              </button>
            );
          })}
        </div>

        {selectedCondition !== 'baik' && (
          <div className="mt-2">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Catatan kondisi paket (cth: kardus basah, bocor di pojok)..."
              className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-amber-500/40 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* Footer helper */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Fokus otomatis aktif — siap menerima tembakan scanner terus-menerus
        </span>
        <button
          type="button"
          onClick={() => {
            setAutoFocusEnabled(!autoFocusEnabled);
            if (!autoFocusEnabled) inputRef.current?.focus();
          }}
          className="hover:text-slate-200 underline cursor-pointer"
        >
          {autoFocusEnabled ? 'Auto-Fokus Nyala' : 'Auto-Fokus Mati'}
        </button>
      </div>
    </div>
  );
};
