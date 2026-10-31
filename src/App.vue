<script setup lang="ts">
import { onMounted } from 'vue';
import { useLabelStore } from '@/stores/labelStore';
import PrinterConnection from '@/components/PrinterConnection.vue';
import LabelEditor from '@/components/LabelEditor.vue';
import LabelPreview from '@/components/LabelPreview.vue';
import HistoryList from '@/components/HistoryList.vue';
import PrintQueue from '@/components/PrintQueue.vue';
import PrinterSettings from '@/components/PrinterSettings.vue';
import {
  Edit3,
  History,
  Zap,
  Settings,
  Printer,
  CheckCircle2,
  XCircle,
  Info,
  ChevronUp,
} from 'lucide-vue-next';

const store = useLabelStore();

onMounted(() => {
  store.loadInitialData();
  store.autoReconnectPrinter();
});
</script>

<template>
  <div class="min-h-screen bg-[#F5F6F7] text-[#1F2937] flex flex-col font-sans">
    <!-- Navbar Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <!-- Logo & Title -->
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold shadow-sm">
            <Printer class="w-5 h-5 text-slate-100" />
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight text-slate-800 flex items-center gap-2">
              <span>THERMAL LABELER</span>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                Web App
              </span>
            </h1>
            <p class="text-xs text-slate-500">Cetak Label Nama & Gambar Thermal Bluetooth ESC/POS</p>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <nav class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            @click="store.activeTab = 'editor'"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5',
              store.activeTab === 'editor'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-800',
            ]"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>Label Editor</span>
          </button>

          <button
            @click="store.activeTab = 'history'"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5',
              store.activeTab === 'history'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-800',
            ]"
          >
            <History class="w-3.5 h-3.5" />
            <span>Riwayat</span>
            <span
              v-if="store.historyList.length > 0"
              class="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700 font-mono"
            >
              {{ store.historyList.length }}
            </span>
          </button>

          <button
            @click="store.activeTab = 'queue'"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5',
              store.activeTab === 'queue'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-800',
            ]"
          >
            <Zap class="w-3.5 h-3.5 text-amber-500" />
            <span>Quick Input</span>
            <span
              v-if="store.pendingQueueCount > 0"
              class="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white font-mono animate-pulse"
            >
              {{ store.pendingQueueCount }}
            </span>
          </button>

          <button
            @click="store.activeTab = 'settings'"
            :class="[
              'px-3.5 py-1.5 text-xs font-semibold rounded-md transition flex items-center gap-1.5',
              store.activeTab === 'settings'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-800',
            ]"
          >
            <Settings class="w-3.5 h-3.5" />
            <span>Printer Settings</span>
          </button>
        </nav>
      </div>
    </header>

    <!-- Global Notification Banner -->
    <transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div
        v-if="store.notification"
        class="fixed top-16 right-4 z-50 max-w-md"
      >
        <div
          :class="[
            'p-3.5 rounded-lg border shadow-lg flex items-start gap-3 text-xs font-medium',
            store.notification.type === 'success'
              ? 'bg-emerald-800 text-white border-emerald-900'
              : store.notification.type === 'error'
              ? 'bg-red-800 text-white border-red-900'
              : 'bg-slate-800 text-white border-slate-900',
          ]"
        >
          <CheckCircle2 v-if="store.notification.type === 'success'" class="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
          <XCircle v-else-if="store.notification.type === 'error'" class="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
          <Info v-else class="w-4 h-4 shrink-0 mt-0.5 text-slate-300" />
          <span>{{ store.notification.text }}</span>
        </div>
      </div>
    </transition>

    <!-- Main Container -->
    <main class="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
      <!-- Top Bluetooth Quick Bar -->
      <PrinterConnection />

      <!-- Desktop 2-Column Layout / Mobile 1-Column -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <!-- Left Panel: Active Tab Navigation Content (7 cols) -->
        <div class="lg:col-span-7 space-y-6">
          <LabelEditor v-if="store.activeTab === 'editor'" />
          <HistoryList v-else-if="store.activeTab === 'history'" />
          <PrintQueue v-else-if="store.activeTab === 'queue'" />
          <PrinterSettings v-else-if="store.activeTab === 'settings'" />
        </div>

        <!-- Right Panel: Live Thermal Preview (5 cols) -->
        <div class="lg:col-span-5 lg:sticky lg:top-20">
          <LabelPreview />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p>Thermal Labeler &copy; 2026 • Web Bluetooth & ESC/POS Printing Engine</p>
        <p class="font-mono text-[11px] text-slate-400">Supported: 57mm, 58mm, 80mm • Dithered Monochrome Raster</p>
      </div>
    </footer>
  </div>
</template>
