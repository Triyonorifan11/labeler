<script setup lang="ts">
import { useLabelStore } from '@/stores/labelStore';
import type { FontSizeOption, AlignmentOption, PrinterConnectionType } from '@/types/label';
import {
  Settings,
  Bluetooth,
  Sliders,
  Smartphone,
  Printer,
  FileCode,
  CheckCircle,
  HelpCircle,
  Info,
} from 'lucide-vue-next';

const store = useLabelStore();

const fontSizes: { value: FontSizeOption; label: string }[] = [
  { value: 'small', label: 'Kecil' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Besar' },
  { value: 'xlarge', label: 'Extra Large' },
];

const alignments: { value: AlignmentOption; label: string }[] = [
  { value: 'left', label: 'Left (Kiri)' },
  { value: 'center', label: 'Center (Tengah)' },
  { value: 'right', label: 'Right (Kanan)' },
];

const paperWidthOptions = [
  { value: 57, label: '57 mm (Standard Handheld)' },
  { value: 58, label: '58 mm (Standard POS Thermal)' },
  { value: 80, label: '80 mm (Large Receipt Printer)' },
];
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-6">
    <!-- Header -->
    <div class="border-b border-slate-200 pb-3">
      <h2 class="text-base font-semibold text-slate-800 flex items-center gap-2">
        <Settings class="w-5 h-5 text-slate-600" />
        <span>Pengaturan Printer & Hardware Thermal</span>
      </h2>
      <p class="text-xs text-slate-500">
        Konfigurasi metode koneksi, kerapatan cetak, kecepatan, dan preferensi default label
      </p>
    </div>

    <!-- 1. Metode Koneksi Printer -->
    <div class="space-y-3">
      <label class="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Metode Koneksi Hardware</label>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Web Bluetooth -->
        <div
          @click="store.printerSettings.connectionType = 'web_bluetooth'"
          :class="[
            'p-4 rounded-md border cursor-pointer transition flex flex-col justify-between space-y-2',
            store.printerSettings.connectionType === 'web_bluetooth'
              ? 'bg-slate-50 border-slate-700 ring-1 ring-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300',
          ]"
        >
          <div class="flex items-center justify-between">
            <Bluetooth class="w-5 h-5 text-slate-700" />
            <span
              v-if="store.printerSettings.connectionType === 'web_bluetooth'"
              class="w-2 h-2 rounded-full bg-slate-700"
            ></span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-800">Web Bluetooth BLE GATT</h4>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Koneksi langsung dari browser ke printer Bluetooth yang mendukung GATT service.
            </p>
          </div>
        </div>

        <!-- Android SPP Bridge -->
        <div
          @click="store.printerSettings.connectionType = 'bluetooth_spp_bridge'"
          :class="[
            'p-4 rounded-md border cursor-pointer transition flex flex-col justify-between space-y-2',
            store.printerSettings.connectionType === 'bluetooth_spp_bridge'
              ? 'bg-slate-50 border-slate-700 ring-1 ring-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300',
          ]"
        >
          <div class="flex items-center justify-between">
            <Smartphone class="w-5 h-5 text-slate-700" />
            <span
              v-if="store.printerSettings.connectionType === 'bluetooth_spp_bridge'"
              class="w-2 h-2 rounded-full bg-slate-700"
            ></span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-800">Bluetooth Classic SPP Bridge</h4>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Gunakan aplikasi pendamping Android (misal RawBT / Bluetooth Print) via Intent scheme.
            </p>
          </div>
        </div>

        <!-- Raw Binary ESC/POS file -->
        <div
          @click="store.printerSettings.connectionType = 'raw_escpos_file'"
          :class="[
            'p-4 rounded-md border cursor-pointer transition flex flex-col justify-between space-y-2',
            store.printerSettings.connectionType === 'raw_escpos_file'
              ? 'bg-slate-50 border-slate-700 ring-1 ring-slate-700'
              : 'bg-white border-slate-200 hover:border-slate-300',
          ]"
        >
          <div class="flex items-center justify-between">
            <FileCode class="w-5 h-5 text-slate-700" />
            <span
              v-if="store.printerSettings.connectionType === 'raw_escpos_file'"
              class="w-2 h-2 rounded-full bg-slate-700"
            ></span>
          </div>
          <div>
            <h4 class="text-xs font-bold text-slate-800">Unduh Binary ESC/POS (.bin)</h4>
            <p class="text-[11px] text-slate-500 mt-0.5">
              Hasilkan file binary raster ESC/POS mentah untuk dikirim manual via PC/Serial.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Paper Width & Density -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-md">
      <!-- Paper Width Default -->
      <div>
        <label class="text-xs font-semibold text-slate-700 block mb-1">Ukuran Kertas Thermal Default</label>
        <select
          :value="store.printerSettings.paperWidthMm"
          @change="(e: any) => {
            const val = Number(e.target.value);
            store.printerSettings.paperWidthMm = val;
            store.updatePaperWidth(val);
          }"
          class="w-full p-2 text-xs bg-white border border-slate-300 rounded font-semibold"
        >
          <option v-for="p in paperWidthOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>

      <!-- Kerapatan Cetak (Print Density) -->
      <div>
        <div class="flex justify-between items-center text-xs mb-1">
          <label class="font-semibold text-slate-700">Kerapatan Cetak (Print Density / Heat)</label>
          <span class="font-mono text-slate-600 font-bold">Level {{ store.printerSettings.printDensity }}</span>
        </div>
        <input
          v-model.number="store.printerSettings.printDensity"
          type="range"
          min="1"
          max="5"
          class="w-full accent-slate-700 mt-1"
        />
        <div class="flex justify-between text-[10px] text-slate-400 font-mono mt-0.5">
          <span>Soft (Tipis)</span>
          <span>Normal</span>
          <span>Dark (Tebal Pekat)</span>
        </div>
      </div>

      <!-- Kecepatan Cetak (Print Speed) -->
      <div>
        <div class="flex justify-between items-center text-xs mb-1">
          <label class="font-semibold text-slate-700">Kecepatan Cetak (Print Speed)</label>
          <span class="font-mono text-slate-600 font-bold">Level {{ store.printerSettings.printSpeed }}</span>
        </div>
        <input
          v-model.number="store.printerSettings.printSpeed"
          type="range"
          min="1"
          max="5"
          class="w-full accent-slate-700 mt-1"
        />
      </div>

      <!-- Auto Feed & Cut -->
      <div class="flex flex-col justify-center space-y-2">
        <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            v-model="store.printerSettings.autoFeedAfterPrint"
            type="checkbox"
            class="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
          />
          <span>Auto-Feed Kertas setelah cetak Selesai</span>
        </label>

        <label class="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            v-model="store.printerSettings.cutPaper"
            type="checkbox"
            class="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
          />
          <span>Perintah Potong Kertas Auto-Cut (GS V)</span>
        </label>
      </div>
    </div>

    <!-- 3. Preferensi Text Editor Default -->
    <div class="space-y-3">
      <label class="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Default Text Editor</label>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-slate-600 font-medium block mb-1">Default Ukuran Teks</label>
          <select
            v-model="store.printerSettings.defaultFontSize"
            class="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded"
          >
            <option v-for="fs in fontSizes" :key="fs.value" :value="fs.value">{{ fs.label }}</option>
          </select>
        </div>

        <div>
          <label class="text-xs text-slate-600 font-medium block mb-1">Default Alignment</label>
          <select
            v-model="store.printerSettings.defaultAlignment"
            class="w-full p-2 text-xs bg-slate-50 border border-slate-300 rounded"
          >
            <option v-for="al in alignments" :key="al.value" :value="al.value">{{ al.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 4. Bluetooth Classic SPP Bridge Guide -->
    <div class="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2">
      <h4 class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
        <Info class="w-4 h-4 text-slate-600" />
        <span>Panduan Printer Bluetooth Classic SPP & Android</span>
      </h4>
      <p class="text-xs text-slate-600 leading-relaxed">
        Banyak printer thermal murah (seperti GOOJPRT, POS-5802, PT-210, Zjiang) menggunakan protokol <strong>Bluetooth Classic SPP</strong> (bukan BLE GATT). Jika printer Anda tidak muncul saat menekan tombol Connect:
      </p>

      <ol class="list-decimal list-inside text-xs text-slate-600 space-y-1 pl-1">
        <li>Install aplikasi bridge gratis seperti <strong>RawBT</strong> atau <strong>Bluetooth Print</strong> di Android.</li>
        <li>Pairing printer di Pengaturan Bluetooth HP Android Anda.</li>
        <li>Pilih metode koneksi <strong>"Bluetooth Classic SPP Bridge"</strong> di atas.</li>
        <li>Saat Anda menekan Cetak Label, web akan otomatis mengirimkan payload binary ESC/POS langsung ke printer Anda melalui aplikasi bridge.</li>
      </ol>
    </div>

    <!-- Test Print Action -->
    <div class="pt-2 flex justify-end">
      <button
        @click="store.testPrint()"
        :disabled="store.isPrinting"
        class="py-2.5 px-5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-md transition shadow flex items-center gap-2"
      >
        <Printer class="w-4 h-4" />
        <span>Jalankan Halaman Test Print</span>
      </button>
    </div>
  </div>
</template>
