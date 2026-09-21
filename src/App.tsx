import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Truck,
  FileText,
  Plus,
  HelpCircle,
  Volume2,
  VolumeX,
  Sparkles,
  Layers,
  History,
  CheckCircle2,
  Heart,
} from 'lucide-react';
import { HandoverSession, PackageCondition } from './types';
import { detectExpedition, extractTrackingNumberFromBarcodeKotak } from './utils/expeditions';
import {
  loadSessions,
  saveSessions,
  getActiveSessionId,
  setActiveSessionId,
  loadSettings,
  saveSettings,
  AppSettings,
} from './utils/storage';
import { ActiveSessionView } from './components/ActiveSessionView';
import { HistoryView } from './components/HistoryView';
import { NewSessionModal } from './components/NewSessionModal';
import { BulkPasteModal } from './components/BulkPasteModal';
import { CameraScannerModal } from './components/CameraScannerModal';
import { PrintManifestModal } from './components/PrintManifestModal';
import { GuideModal } from './components/GuideModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { playClickBeep } from './utils/audio';

export default function App() {
  const [sessions, setSessions] = useState<HandoverSession[]>(() => loadSessions());
  const [activeSessionId, setActiveId] = useState<string | null>(() => getActiveSessionId());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentTab, setCurrentTab] = useState<'scan' | 'history'>('scan');

  // Modals
  const [isNewSessionOpen, setIsNewSessionOpen] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [isCameraScanOpen, setIsCameraScanOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [printSession, setPrintSession] = useState<HandoverSession | null>(null);

  // Sync to local storage
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    setActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Global keyboard shortcuts for warehouse speed
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        setIsNewSessionOpen(true);
      }
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsBulkPasteOpen(true);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        setIsCameraScanOpen(true);
      }
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setIsGuideOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Determine active session object
  const activeSession =
    sessions.find((s) => s.id === activeSessionId) ||
    (sessions.length > 0 ? sessions[0] : null);

  const handleCreateSession = (newSession: HandoverSession) => {
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveId(newSession.id);
    setCurrentTab('scan');
  };

  const handleUpdateSession = (updatedSession: HandoverSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  const handleCompleteSession = (sessionId: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'completed' } : s))
    );
  };

  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const handleBulkImport = (
    items: Array<{ trackingNumber: string; condition: PackageCondition; note?: string }>
  ) => {
    if (!activeSession) return { addedCount: 0, duplicateCount: 0 };

    let addedCount = 0;
    let duplicateCount = 0;

    const existingResiSet = new Set(
      activeSession.items.map((i) => i.trackingNumber.toUpperCase())
    );

    const newReturnItems: typeof activeSession.items = [];

    items.forEach((item) => {
      const clean = item.trackingNumber.trim().toUpperCase();
      if (existingResiSet.has(clean)) {
        duplicateCount++;
      } else {
        existingResiSet.add(clean);
        const detected = detectExpedition(clean);
        const isMismatch =
          activeSession.expedition !== 'all' && detected !== activeSession.expedition;

        newReturnItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          trackingNumber: clean,
          scannedAt: new Date().toISOString(),
          expedition:
            activeSession.expedition === 'all' ? detected : activeSession.expedition,
          detectedExpedition: detected,
          condition: item.condition,
          note: item.note,
          isMismatch,
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      handleUpdateSession({
        ...activeSession,
        updatedAt: new Date().toISOString(),
        items: [...newReturnItems, ...activeSession.items],
      });
    }

    return { addedCount, duplicateCount };
  };

  const handleCameraScanResult = (
    trackingNumber: string,
    condition: PackageCondition
  ): 'added' | 'duplicate' | 'mismatch' | void => {
    if (!activeSession) return;

    const extracted = extractTrackingNumberFromBarcodeKotak(trackingNumber);
    const cleanResi = extracted.trackingNumber;
    if (!cleanResi) return;

    // Check if duplicate
    const existing = activeSession.items.find(
      (i) => i.trackingNumber.toUpperCase() === cleanResi.toUpperCase()
    );
    if (existing) {
      if (settings.soundEnabled) {
        import('./utils/audio').then((m) => m.playDuplicateWarning());
      }
      return 'duplicate';
    }

    const detectedId = detectExpedition(cleanResi);
    const isMismatch =
      activeSession.expedition !== 'all' && detectedId !== activeSession.expedition;

    if (settings.soundEnabled) {
      import('./utils/audio').then((m) =>
        isMismatch ? m.playMismatchWarning() : m.playSuccessBeep()
      );
    }

    const newItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      trackingNumber: cleanResi,
      scannedAt: new Date().toISOString(),
      expedition:
        activeSession.expedition === 'all' ? detectedId : activeSession.expedition,
      detectedExpedition: detectedId,
      condition,
      isMismatch,
      barcodeType: (extracted.isFrom2D ? '2d_kotak' : '1d') as '1d' | '2d_kotak',
    };

    handleUpdateSession({
      ...activeSession,
      updatedAt: new Date().toISOString(),
      items: [newItem, ...activeSession.items],
    });

    return isMismatch ? 'mismatch' : 'added';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans print:bg-white print:text-black print:min-h-0 print:p-0 print:m-0">
      {/* Top Navigation Bar */}
      <header className="print:hidden border-b border-slate-800 bg-slate-900/95 sticky top-0 z-40 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/20 font-black">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  Scan Retur Ekspedisi
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Tembak Resi & BAST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Serah Terima Retur Gudang • SPX, J&T, SiCepat, JNE, Anteraja, Ninja, dll.
              </p>
            </div>
          </div>

          {/* Center Tabs: Scan vs Riwayat */}
          <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                playClickBeep();
                setCurrentTab('scan');
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer ${
                currentTab === 'scan'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Barcode className="w-4 h-4" />
              <span>Sesi Scan</span>
              {activeSession && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    currentTab === 'scan'
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {activeSession.items.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playClickBeep();
                setCurrentTab('history');
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-lg font-bold flex items-center gap-2 transition cursor-pointer ${
                currentTab === 'history'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Riwayat BAST</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  currentTab === 'history'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {sessions.length}
              </span>
            </button>
          </div>

          {/* Right quick buttons */}
          <div className="flex items-center gap-2">
            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition"
              title="Panduan Cara Scan & Tembak Resi (Alt+H)"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setIsNewSessionOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Sesi Baru</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="print:hidden flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'scan' ? (
          activeSession ? (
            <ActiveSessionView
              session={activeSession}
              onUpdateSession={handleUpdateSession}
              onCompleteSession={handleCompleteSession}
              onOpenNewSessionModal={() => setIsNewSessionOpen(true)}
              onOpenBulkModal={() => setIsBulkPasteOpen(true)}
              onOpenCameraModal={() => setIsCameraScanOpen(true)}
              onOpenPrintModal={() => setPrintSession(activeSession)}
              soundEnabled={settings.soundEnabled}
              onToggleSound={() =>
                setSettings({ ...settings, soundEnabled: !settings.soundEnabled })
              }
              voiceEnabled={settings.voiceEnabled}
              onToggleVoice={() =>
                setSettings({ ...settings, voiceEnabled: !settings.voiceEnabled })
              }
            />
          ) : (
            <div className="p-16 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-4 max-w-lg mx-auto my-12">
              <Truck className="w-16 h-16 mx-auto text-amber-400/80" />
              <h2 className="text-xl font-bold text-white">Belum Ada Sesi Serah Terima</h2>
              <p className="text-xs text-slate-400">
                Buat sesi serah terima retur baru untuk kurir ekspedisi yang datang ke gudang.
              </p>
              <button
                type="button"
                onClick={() => setIsNewSessionOpen(true)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl inline-flex items-center gap-2 shadow-lg transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Sesi Serah Terima Baru</span>
              </button>
            </div>
          )
        ) : (
          <HistoryView
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={(id) => {
              setActiveId(id);
              setCurrentTab('scan');
            }}
            onOpenPrintForSession={(s) => setPrintSession(s)}
            onDeleteSession={handleDeleteSession}
            onOpenNewSessionModal={() => setIsNewSessionOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-800/80 py-5 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>Sistem Serah Terima Retur Logistik • Standar BAST Ekspedisi Indonesia</span>
        </div>

        {/* Handcrafted signature by Hery */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-400 shadow-sm">
          <span>Handcraft with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span>by <strong className="text-slate-200 font-semibold tracking-wide">Hery</strong></span>
        </div>

        <div className="flex items-center gap-3 text-slate-500">
          <span>Shortcut: Alt+N • Alt+B • Alt+C</span>
        </div>
      </footer>

      {/* Modals */}
      <NewSessionModal
        isOpen={isNewSessionOpen}
        onClose={() => setIsNewSessionOpen(false)}
        onCreateSession={handleCreateSession}
        defaultStaffName={settings.defaultStaffName}
        defaultWarehouse={settings.defaultWarehouse}
      />

      <BulkPasteModal
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        onImportList={handleBulkImport}
      />

      <CameraScannerModal
        isOpen={isCameraScanOpen}
        onClose={() => setIsCameraScanOpen(false)}
        onScanResult={handleCameraScanResult}
        sessionItems={activeSession?.items || []}
      />

      {printSession && (
        <PrintManifestModal
          isOpen={Boolean(printSession)}
          onClose={() => setPrintSession(null)}
          session={printSession}
        />
      )}

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <OfflineIndicator />
    </div>
  );
}
