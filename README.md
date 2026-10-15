# Plant-vs-insert
Garden Guardians — Panduan Build APK Android
Game ini adalah PWA (Progressive Web App) penuh + proyek Capacitor yang siap dibungkus menjadi APK Android asli. Semua aset, kode, karakter, dan audio 100% original.

Opsi 1 — Pasang sebagai Aplikasi Langsung dari Browser (tanpa build)
Game sudah memenuhi syarat instalasi PWA:

Host folder dist/ di server HTTPS apa pun (Netlify, Vercel, GitHub Pages, dsb).
Buka di Chrome Android.
Ketuk tombol "PASANG APLIKASI" di menu utama (atau menu Chrome → Tambahkan ke layar utama).
Game terpasang dengan ikon sendiri, berjalan layar penuh, landscape, tanpa browser UI, dan dapat dimainkan offline (Service Worker aktif).
Fitur aplikasi yang sudah aktif:

manifest.webmanifest — nama, ikon, orientasi landscape, display fullscreen.
sw.js — cache offline (network-first, cache-fallback).
Ikon aplikasi dirender prosedural oleh game sendiri saat startup (PNG data-URL).
Auto-fullscreen + kunci orientasi landscape saat masuk level (perangkat sentuh).
Safe-area untuk notch & gesture bar (env(safe-area-inset-*)).
Opsi 2 — Build APK Android Asli dengan Capacitor
Kapacitor sudah terpasang di proyek ini (@capacitor/core, @capacitor/cli, @capacitor/android) dan capacitor.config.ts sudah dikonfigurasi (id.gardenguardians.game).

Prasyarat
Node.js 18+
JDK 17
Android Studio (atau Android SDK command-line tools, platform 34+, build-tools)
Langkah
# 1. Install dependensi & build web
npm install
npm run build            # menghasilkan folder dist/

# 2. Tambahkan platform Android (hanya pertama kali)
npx cap add android

# 3. Sinkronkan hasil build web ke proyek Android
npx cap sync android

# 4a. Buka Android Studio untuk build/run ke perangkat:
npx cap open android
#    lalu: Build > Build Bundle(s)/APK(s) > Build APK(s)

# 4b. Atau build APK langsung dari terminal:
cd android
./gradlew assembleDebug
APK hasil build berada di:

android/app/build/outputs/apk/debug/app-debug.apk
Untuk APK release (siap Play Store / sideload):

cd android
./gradlew assembleRelease
# uji coba game
game bisa di coba melalui
https://drive.google.com/file/d/1BVYfeXEsyHGyOxdgmfLrxG658pVqchcE/view?usp=drivesdk


KAMI KELAS 11 RPL 1 KELOMPOK 7 MENGUCAPKAN TERIMAKASIH KARENA SUDAH DI BERIKAN ILMU DAN KEPERCAYAAN UNTUK MEMBUAT GAME INI SAMPAI BENAR BENAR MENJADI APK
KELOMPOK 7
REVA DWI PRASETIA 
DANIS PUTRA LAKSMANA
RAKA WIDODO 
FATUR RACHMAN NUR ADITYA 
