<script setup lang="ts">
import { useLabelStore } from '@/stores/labelStore';
import { printerService } from '@/services/printerService';
import {
  Bluetooth,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Printer,
  Smartphone,
  AlertTriangle,
  FileCode,
} from 'lucide-vue-next';

const store = useLabelStore();
const isWebBtSupported = printerService.isWebBluetoothSupported();
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <!-- Status Badge & Device Info -->
      <div class="flex items-center gap-3">
        <div
          :class="[
            'p-2.5 rounded-full border flex items-center justify-center',
            store.isPrinterConnected
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200',
          ]"
        >
          <Bluetooth class="w-5 h-5" />
        </div>

        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-slate-800">
              {{ store.printerDevice?.name || 'Printer Bluetooth Belum Terhubung' }}
            </h3>

            <span
              :class="[
                'px-2 py-0.5 text-[10px] font-bold uppercase rounded border tracking-wider',
                store.isPrinterConnected
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-200',
              ]"
            >
              {{ store.isPrinterConnected ? 'TERHUBUNG' : 'TERPUTUS' }}
            </span>
          </div>

          <p class="text-xs text-slate-500 mt-0.5">
            <span v-if="store.isPrinterConnected">
              Koneksi Web Bluetooth GATT Aktif • Ready for ESC/POS Printing
            </span>
            <span v-else>
              Scan & hubungkan printer thermal Bluetooth (BLE / SPP bridge)
            </span>
          </p>
        </div>
      </div>

      <!-- Connection Buttons -->
      <div class="flex items-center gap-2">
        <button
          v-if="!store.isPrinterConnected"
          @click="store.connectPrinter()"
          :disabled="store.isConnecting"
          class="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 rounded-md shadow-sm transition flex items-center gap-1.5"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': store.isConnecting }" />
          <span>{{ store.isConnecting ? 'Mencari Device...' : 'Connect Printer' }}</span>
        </button>

        <button
          v-else
          @click="store.disconnectPrinter()"
          class="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition flex items-center gap-1"
        >
          <XCircle class="w-3.5 h-3.5 text-slate-500" />
          <span>Disconnect</span>
        </button>

        <button
          @click="store.testPrint()"
          :disabled="store.isPrinting"
          class="px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition flex items-center gap-1"
        >
          <Printer class="w-3.5 h-3.5 text-slate-600" />
          <span>Test Print</span>
        </button>
      </div>
    </div>

    <!-- Error Notice if Web Bluetooth is unsupported or failed -->
    <div v-if="!isWebBtSupported" class="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2.5 text-xs text-amber-800">
      <AlertTriangle class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <strong class="font-bold block mb-0.5">Web Bluetooth API Tidak Didukung Browser Ini</strong>
        Browser Anda belum mendukung Web Bluetooth secara langsung (misal iOS Safari / Firefox). Anda tetap dapat mencetak menggunakan opsi <strong>Android Bridge (RawBT)</strong> atau <strong>Unduh Berkas Binary ESC/POS</strong>.
      </div>
    </div>

    <div v-if="store.connectionError" class="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2 text-xs text-red-800">
      <XCircle class="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
      <div>
        <strong class="font-bold block mb-0.5">Status Koneksi Bluetooth:</strong>
        {{ store.connectionError }}
      </div>
    </div>
  </div>
</template>
