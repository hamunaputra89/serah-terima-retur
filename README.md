# Scan Serah Terima Retur Ekspedisi (BAST Retur)

Aplikasi web Progressive Web App (PWA) modern untuk pemindaian barcode / QR code serah terima paket retur ekspedisi secara cepat, akurat, dan terorganisir dengan pembuatan Berita Acara Serah Terima (BAST) otomatis, audio beeper feedback, cetak manifest thermal/A4, serta sinkronisasi cloud Google Drive / Firebase.

## ✨ Fitur Utama

- **⚡ Instant Continuous Scanner**: Mode tembak barcode scanner fisik USB/Bluetooth maupun kamera HP dengan deteksi cerdas ekspedisi otomatis (J&T, SPX Shopee Xpress, SiCepat, JNE, Ninja Van, Anteraja, ID Express, Wahana, Lion Parcel, POS Indonesia).
- **📋 Berita Acara Serah Terima (BAST)**: Penomoran BAST otomatis, pencatatan kurir penyerah, admin penerima, total koli, dan status kondisi paket (Bagus, Rusak, Sobek, Basah, Tertukar).
- **🖨️ Cetak & Export Manifest Lengkap**:
  - Format Struk Thermal 80mm
  - Format Dokumen A4 Pas 1 Lembar
  - Format Dokumen A4 Rinci Lengkap
  - Export PDF resmi & CSV Spreadsheet
  - Salin daftar resi satu-klik
- **📱 PWA Offline Ready**: Dapat di-install langsung di layar utama Android / iOS / Desktop, bekerja secara offline melalui service worker.
- **☁️ Sinkronisasi Data**: Opsi sinkronisasi ke Google Drive atau Firebase Cloud Firestore.
- **🚀 Siap Deploy GitHub Pages**: Dilengkapi workflow GitHub Actions otomatis (`.github/workflows/deploy.yml`).

## 🛠️ Persyaratan Sistem

- Node.js versi 20 atau 22+
- npm versi 9+

## 🚀 Menjalankan Secara Lokal

1. **Clone repository**:
   ```bash
   git clone https://github.com/<username>/<nama-repo>.git
   cd <nama-repo>
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan dev server**:
   ```bash
   npm run dev
   ```
   Aplikasi akan berjalan di `http://localhost:3000`.

4. **Build untuk produksi**:
   ```bash
   npm run build
   ```
   Hasil build akan berada di direktori `dist/`.

## 🌐 Deploy Otomatis ke GitHub Pages

Repository ini sudah dikonfigurasi dengan GitHub Actions di `.github/workflows/deploy.yml`.

### Cara Mengaktifkan:

1. Push repository ke GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit - Scan Serah Terima Retur Ekspedisi"
   git branch -M main
   git remote add origin https://github.com/<username>/<nama-repo>.git
   git push -u origin main
   ```

2. Buka repository di GitHub:
   - Masuk ke tab **Settings** > **Pages**.
   - Di bagian **Source**, pilih **GitHub Actions**.

3. Setiap kali Anda push ke branch `main`, GitHub Actions akan otomatis membangun dan merilis versi terbaru ke URL:
   `https://<username>.github.io/<nama-repo>/`

## 📄 Lisensi

MIT License
