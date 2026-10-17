import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Cloud, CloudCheck, RefreshCw, LogOut, ExternalLink, CheckCircle2 } from 'lucide-react';
import { auth, googleSignIn, logout, initAuth } from '../utils/firebase';

interface GoogleDriveSyncButtonProps {
  onAuthChange?: (user: User | null) => void;
  compact?: boolean;
}

export const GoogleDriveSyncButton: React.FC<GoogleDriveSyncButtonProps> = ({
  onAuthChange,
  compact = false,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser) => {
        setUser(currentUser);
        onAuthChange?.(currentUser);
      },
      () => {
        setUser(null);
        onAuthChange?.(null);
      }
    );
    return () => unsubscribe();
  }, [onAuthChange]);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUser(res.user);
        onAuthChange?.(res.user);
      }
    } catch (err: any) {
      console.warn('Google Drive auth error:', err);
      // If popup closed by user or cancelled, no big deal
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setDropdownOpen(false);
    onAuthChange?.(null);
  };

  if (user) {
    return (
      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 transition cursor-pointer shadow-sm"
          title={`Google Drive aktif: ${user.email} (PDF BAST tersinkron otomatis)`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline font-medium text-slate-300">Drive Terhubung</span>
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Google User'}
              className="w-4 h-4 rounded-full border border-slate-600 ml-0.5"
            />
          ) : null}
        </button>

        {dropdownOpen && (
          <div
            className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-2 z-50 text-xs text-slate-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2 border-b border-slate-800">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-white text-[13px]">Google Drive Aktif</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
              <p className="text-[10px] text-emerald-400 mt-1">
                ✓ PDF BAST otomatis tersimpan ke folder "BAST Retur Logistik"
              </p>
            </div>

            <div className="p-1">
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition"
              >
                <span>Buka Google Drive</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              </a>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-red-500/10 text-rose-400 hover:text-rose-300 transition text-left cursor-pointer"
              >
                <span>Putuskan Sambungan</span>
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Official Google Sign-In style button
  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={loading}
      className={`group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-300 shadow transition cursor-pointer disabled:opacity-50 ${
        compact ? 'text-[11px] py-1 px-2.5' : ''
      }`}
      title="Hubungkan Google Drive untuk sinkronisasi otomatis file PDF BAST"
    >
      {loading ? (
        <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
      ) : (
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          className="w-4 h-4 shrink-0"
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          ></path>
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          ></path>
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          ></path>
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          ></path>
          <path fill="none" d="M0 0h48v48H0z"></path>
        </svg>
      )}
      <span className="truncate">
        {loading ? 'Menghubungkan...' : compact ? 'Google Drive' : 'Sinkron Google Drive'}
      </span>
    </button>
  );
};
