# Thermal Labeler

Aplikasi web untuk membuat dan mencetak **label nama** (teks dan/atau gambar) menggunakan **printer thermal Bluetooth** berbasis ESC/POS. Cocok untuk label nama tamu/peserta, nama barang, nomor antrian, dan sejenisnya.

## Fitur

- **Editor label**: teks, ukuran font (kecil – sangat besar), perataan (kiri/tengah/kanan), dan huruf tebal.
- **Tipe label**: teks saja, nama + nomor otomatis (dengan prefix), atau kustom.
- **Gambar/logo**: unggah gambar, otomatis diubah menjadi 1-bit monokrom (threshold, dithering Floyd–Steinberg, invert), dengan pilihan tata letak (atas, bawah, kiri, kanan, gambar saja).
- **Pratinjau langsung** sesuai lebar kertas.
- **Lebar kertas**: 57 mm, 58 mm, 80 mm, atau kustom; margin dan tinggi (auto / tetap / auto-fit) dapat diatur.
- **Jumlah salinan** dan **antrean cetak** (print queue).
- **Riwayat** label (disimpan lokal di browser lewat IndexedDB) dan template.
- **Pengaturan printer**: densitas, kecepatan, feed baris, potong kertas.
- **Test print** untuk memeriksa koneksi printer.

## Metode Pencetakan

| Metode | Keterangan |
| --- | --- |
| Web Bluetooth (BLE) | Hubungkan langsung dari browser ke printer BLE. Data dikirim dalam potongan kecil agar aman untuk MTU BLE. |
| Android Bridge (RawBT) | Untuk printer Bluetooth Classic (SPP) lewat aplikasi RawBT di Android. |
| Unduh file ESC/POS | Simpan perintah mentah (`.bin`) untuk dicetak manual. |
| Cetak via browser | Cadangan memakai `window.print()`. |

> Web Bluetooth hanya tersedia di Google Chrome / Microsoft Edge (desktop & Android) dan membutuhkan **HTTPS** atau `localhost`. Safari dan Firefox tidak didukung.

## Teknologi

- [Vue 3](https://vuejs.org/) + [Pinia](https://pinia.vuejs.org/)
- [Vite](https://vite.dev/) + [Tailwind CSS](https://tailwindcss.com/)
- TypeScript
- [idb](https://github.com/jakearchibald/idb) (IndexedDB)
- Perintah ESC/POS dibuat langsung di browser (`src/services/escposService.ts`)

## Menjalankan Secara Lokal

**Prasyarat:** [Node.js](https://nodejs.org/) (atau [Bun](https://bun.sh/)).

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan server pengembangan (http://localhost:3000)
npm run dev
```

Skrip lain:

```bash
npm run build     # build produksi ke folder dist/
npm run preview   # pratinjau hasil build
npm run lint      # pengecekan tipe TypeScript
```

## Cara Pakai

1. Buka aplikasi di Chrome/Edge, lalu nyalakan printer thermal dan Bluetooth.
2. Buka bagian **Printer**, klik hubungkan, dan pilih printer Anda.
3. Atur lebar kertas sesuai printer (umumnya 58 mm).
4. Di **Editor**, ketik nama/teks label, atur gaya, dan tambahkan gambar bila perlu.
5. Periksa **Pratinjau**, tentukan jumlah salinan, lalu klik **Cetak**.

## Struktur Proyek

```
src/
├── components/   # LabelEditor, LabelPreview, PrinterConnection, PrinterSettings, PrintQueue, HistoryList
├── services/     # escposService (perintah ESC/POS), printerService (koneksi & kirim data), historyService
├── stores/       # labelStore (state Pinia)
└── types/        # definisi tipe label & printer
```

## Catatan

- Printer yang hanya mendukung Bluetooth Classic (SPP) tidak bisa dihubungkan lewat Web Bluetooth; gunakan RawBT atau unduh file ESC/POS.
- Jika karakter khusus tidak tercetak benar, periksa code page yang didukung printer Anda.
