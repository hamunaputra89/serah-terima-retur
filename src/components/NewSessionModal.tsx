import React, { useState } from 'react';
import { X, Plus, Truck, User, Building, FileText, CheckCircle } from 'lucide-react';
import { ExpeditionId, HandoverSession } from '../types';
import { EXPEDITIONS, getExpedition } from '../utils/expeditions';
import { generateBastNumber } from '../utils/storage';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (session: HandoverSession) => void;
  defaultStaffName: string;
  defaultWarehouse: string;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({
  isOpen,
  onClose,
  onCreateSession,
  defaultStaffName,
  defaultWarehouse,
}) => {
  const [selectedExpedition, setSelectedExpedition] = useState<ExpeditionId | 'all'>('spx');
  const [courierName, setCourierName] = useState('');
  const [courierPhone, setCourierPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [warehouseStaff, setWarehouseStaff] = useState(defaultStaffName || 'Budi (Admin Retur)');
  const [warehouseLocation, setWarehouseLocation] = useState(defaultWarehouse || 'Gudang Cakung');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newBast = generateBastNumber(selectedExpedition);
    const newSession: HandoverSession = {
      id: `sess-${Date.now()}`,
      bastNumber: newBast,
      expedition: selectedExpedition,
      courierName: courierName.trim() || 'Kurir Ekspedisi',
      courierPhone: courierPhone.trim() || undefined,
      vehiclePlate: vehiclePlate.trim().toUpperCase() || undefined,
      warehouseStaff: warehouseStaff.trim() || 'Petugas Gudang',
      warehouseLocation: warehouseLocation.trim() || 'Gudang Pusat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active',
      notes: notes.trim() || undefined,
      items: [],
    };

    onCreateSession(newSession);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Buat Sesi Serah Terima Retur Baru</h3>
              <p className="text-xs text-slate-400">Pilih ekspedisi dan isi identitas kurir yang menyerahkan paket</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Expedition Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Ekspedisi yang Menyerahkan Retur:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedExpedition('all')}
                className={`p-2 rounded-xl text-left border text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                  selectedExpedition === 'all'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <span>Campuran (Semua Ekspedisi)</span>
                {selectedExpedition === 'all' && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              {EXPEDITIONS.map((exp) => {
                const isSelected = selectedExpedition === exp.id;
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setSelectedExpedition(exp.id)}
                    className={`p-2 rounded-xl text-left border text-xs font-semibold transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'ring-2 ring-amber-500/40 border-amber-400 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: `${exp.color}25`, borderColor: exp.color, color: '#ffffff' }
                        : {}
                    }
                  >
                    <span className="truncate">{exp.shortName}</span>
                    {isSelected && <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Courier Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Nama Driver / Kurir:
              </label>
              <input
                type="text"
                required
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="Cth: Joko Supriyanto"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">No. Handphone Kurir (Opsional):</label>
              <input
                type="text"
                value={courierPhone}
                onChange={(e) => setCourierPhone(e.target.value)}
                placeholder="Cth: 081234567890"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Plat Nomor Kendaraan (Opsional):
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="Cth: B 1234 ABC"
                className="w-full px-3 py-2 text-xs uppercase font-mono bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                Lokasi Gudang / Hub:
              </label>
              <input
                type="text"
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                placeholder="Cth: Hub Cakung / Gudang Jakarta"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Petugas Penerima (Gudang):</label>
              <input
                type="text"
                value={warehouseStaff}
                onChange={(e) => setWarehouseStaff(e.target.value)}
                placeholder="Nama Anda / Checker"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Catatan Tambahan (Opsional):</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cth: Retur karung ke-2, COD gagal antar"
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Mulai Sesi Scan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
