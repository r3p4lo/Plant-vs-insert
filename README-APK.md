# Garden Guardians — Panduan Build APK Android

Game ini adalah **PWA (Progressive Web App)** penuh + proyek **Capacitor** yang siap
dibungkus menjadi **APK Android asli**. Semua aset, kode, karakter, dan audio 100% original.

---

## Opsi 1 — Pasang sebagai Aplikasi Langsung dari Browser (tanpa build)

Game sudah memenuhi syarat instalasi PWA:

1. Host folder `dist/` di server HTTPS apa pun (Netlify, Vercel, GitHub Pages, dsb).
2. Buka di **Chrome Android**.
3. Ketuk tombol **"PASANG APLIKASI"** di menu utama (atau menu Chrome → *Tambahkan ke layar utama*).
4. Game terpasang dengan ikon sendiri, berjalan **layar penuh, landscape, tanpa browser UI**,
   dan dapat dimainkan **offline** (Service Worker aktif).

Fitur aplikasi yang sudah aktif:

- `manifest.webmanifest` — nama, ikon, orientasi landscape, display fullscreen.
- `sw.js` — cache offline (network-first, cache-fallback).
- Ikon aplikasi **dirender prosedural oleh game sendiri** saat startup (PNG data-URL).
- Auto-fullscreen + kunci orientasi landscape saat masuk level (perangkat sentuh).
- Safe-area untuk notch & gesture bar (`env(safe-area-inset-*)`).

---

## Opsi 2 — Build APK Android Asli dengan Capacitor

Kapacitor sudah terpasang di proyek ini (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`)
dan `capacitor.config.ts` sudah dikonfigurasi (`id.gardenguardians.game`).

### Prasyarat

- Node.js 18+
- JDK 17
- Android Studio (atau Android SDK command-line tools, platform 34+, build-tools)

### Langkah

```bash
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
```

APK hasil build berada di:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Untuk **APK release** (siap Play Store / sideload):

```bash
cd android
./gradlew assembleRelease
# tandatangani dengan keystore Anda (konfigurasi signingConfigs di android/app/build.gradle)
```

### Kustomisasi

- Ganti nama aplikasi / package ID: edit `capacitor.config.ts`, lalu `npx cap sync android`.
- Ikon & splash screen Android: pasang `@capacitor/assets` lalu jalankan
  `npx capacitor-assets generate --android` (atau ganti manual di `android/app/src/main/res/`).
- Ikon launcher bawaan dapat memakai gambar apa pun yang original — ikon web game
  dirender prosedural dan dapat diekspor dari browser (canvas 512×512).

---

## Struktur Proyek

```
index.html                 — shell PWA (manifest, meta app, font original)
public/manifest.webmanifest— definisi aplikasi (ikon, orientasi, fullscreen)
public/sw.js               — Service Worker offline
public/icons/icon.svg      — ikon aplikasi vektor original
capacitor.config.ts        — konfigurasi pembungkus APK Android
src/game/data.ts           — 8 unit, 11 monster, 5 boss, generator level tanpa batas
src/game/engine.ts         — mesin canvas: grid, wave, boss, pooling, partikel
src/game/audio.ts          — musik & SFX original disintesis WebAudio
src/game/save.ts           — save otomatis (localStorage; di WebView Android tetap persisten)
src/components/*.tsx       — UI: menu, koleksi/upgrade, pengaturan, HUD sentuh
```

## Catatan Performa Android Kelas Bawah

- Object pooling untuk proyektil, monster, partikel, dan teks melayang.
- Semua grafik digambar vektor di canvas (tanpa tekstur besar, RAM kecil).
- `devicePixelRatio` dibatasi 2×; partikel & monster dibatasi jumlah maksimum.
- Satu canvas, satu loop `requestAnimationFrame`, HUD React diperbarui 8×/detik.
