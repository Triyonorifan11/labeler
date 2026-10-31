<script setup lang="ts">
import { ref, computed } from 'vue';
import { useLabelStore } from '@/stores/labelStore';
import type { HistoryItem } from '@/types/label';
import {
  History,
  Search,
  Trash2,
  Printer,
  Edit3,
  Star,
  Calendar,
  Bookmark,
  Layers,
  Sparkles,
} from 'lucide-vue-next';

const store = useLabelStore();
const searchQuery = ref('');
const sortOrder = ref<'newest' | 'oldest'>('newest');
const activeSubTab = ref<'history' | 'templates'>('history');

const filteredHistory = computed(() => {
  let list = [...store.historyList];
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.config.text.toLowerCase().includes(q)
    );
  }
  if (sortOrder.value === 'newest') {
    list.sort((a, b) => b.timestamp - a.timestamp);
  } else {
    list.sort((a, b) => a.timestamp - b.timestamp);
  }
  return list;
});

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function handleRePrint(item: HistoryItem) {
  store.labelConfig = JSON.parse(JSON.stringify(item.config));
  store.printCurrentLabel();
}
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-6">
    <!-- Header & Subtab -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <div>
        <h2 class="text-base font-semibold text-slate-800 flex items-center gap-2">
          <History class="w-5 h-5 text-slate-600" />
          <span>Riwayat & Template Tersimpan</span>
        </h2>
        <p class="text-xs text-slate-500">
          Riwayat label yang pernah dibuat tersimpan aman di browser Anda (IndexedDB)
        </p>
      </div>

      <!-- Toggle History vs Templates -->
      <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 self-start">
        <button
          @click="activeSubTab = 'history'"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5',
            activeSubTab === 'history'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800',
          ]"
        >
          <History class="w-3.5 h-3.5" />
          <span>Riwayat ({{ store.historyList.length }})</span>
        </button>

        <button
          @click="activeSubTab = 'templates'"
          :class="[
            'px-3 py-1.5 text-xs font-semibold rounded transition flex items-center gap-1.5',
            activeSubTab === 'templates'
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-600 hover:text-slate-800',
          ]"
        >
          <Bookmark class="w-3.5 h-3.5" />
          <span>Template ({{ store.templatesList.length }})</span>
        </button>
      </div>
    </div>

    <!-- 1. History Section -->
    <div v-if="activeSubTab === 'history'" class="space-y-4">
      <!-- Search & Filters -->
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 border border-slate-200 rounded-md">
        <!-- Search bar -->
        <div class="relative flex-1 w-full">
          <Search class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari berdasarkan nama atau isi teks label..."
            class="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div class="flex items-center gap-2 w-full sm:w-auto justify-between">
          <select
            v-model="sortOrder"
            class="py-1.5 px-2.5 text-xs border border-slate-300 rounded bg-white text-slate-700 font-medium"
          >
            <option value="newest">Terbaru ke Terlama</option>
            <option value="oldest">Terlama ke Terbaru</option>
          </select>

          <button
            v-if="store.historyList.length > 0"
            @click="store.clearAllHistory()"
            class="px-2.5 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded transition font-medium flex items-center gap-1"
          >
            <Trash2 class="w-3.5 h-3.5" />
            <span>Hapus Semua</span>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredHistory.length === 0" class="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-md">
        <History class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-600">Belum Ada Riwayat Label</p>
        <p class="text-xs text-slate-400 mt-1">
          Buat dan cetak label di tab Editor untuk melihat riwayat tersimpan di sini.
        </p>
      </div>

      <!-- History List Cards -->
      <div v-else class="grid grid-cols-1 gap-3">
        <div
          v-for="item in filteredHistory"
          :key="item.id"
          class="p-4 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <!-- Details -->
          <div class="space-y-1.5 flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <button
                @click="store.toggleFavoriteHistory(item.id)"
                class="text-slate-300 hover:text-amber-400 transition"
              >
                <Star class="w-4 h-4" :class="{ 'fill-amber-400 text-amber-400': item.isFavorite }" />
              </button>

              <h3 class="text-sm font-bold text-slate-800 truncate">{{ item.name }}</h3>

              <span v-if="item.hasImage" class="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded border border-slate-200">
                + Gambar
              </span>
            </div>

            <p class="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded border border-slate-100 whitespace-pre-wrap max-h-16 overflow-hidden">
              {{ item.config.text }}
            </p>

            <div class="flex items-center gap-3 text-[11px] text-slate-400">
              <span class="flex items-center gap-1">
                <Calendar class="w-3 h-3" />
                {{ formatDate(item.timestamp) }}
              </span>
              <span>•</span>
              <span>Kertas: {{ item.config.paperWidthMm }}mm</span>
              <span>•</span>
              <span class="capitalize">Font: {{ item.config.fontSize }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 self-end sm:self-center">
            <button
              @click="store.applyHistoryToEditor(item)"
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition flex items-center gap-1"
            >
              <Edit3 class="w-3.5 h-3.5 text-slate-600" />
              <span>Gunakan</span>
            </button>

            <button
              @click="handleRePrint(item)"
              class="px-3 py-1.5 text-xs font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded shadow-sm transition flex items-center gap-1"
            >
              <Printer class="w-3.5 h-3.5" />
              <span>Cetak Ulang</span>
            </button>

            <button
              @click="store.deleteHistoryItem(item.id)"
              class="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
              title="Hapus"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Templates Section -->
    <div v-else class="space-y-4">
      <div v-if="store.templatesList.length === 0" class="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-md">
        <Bookmark class="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p class="text-sm font-semibold text-slate-600">Belum Ada Template Tersimpan</p>
        <p class="text-xs text-slate-400 mt-1">
          Klik tombol "+ Template" pada Editor untuk menyimpan format label favorit Anda.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="tpl in store.templatesList"
          :key="tpl.id"
          class="p-4 bg-white border border-slate-200 rounded-md hover:border-slate-300 transition flex items-center justify-between gap-3"
        >
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-slate-800">{{ tpl.title }}</h4>
            <p class="text-xs text-slate-500 font-mono truncate max-w-[200px]">{{ tpl.config.text }}</p>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="store.applyHistoryToEditor({ id: '', name: tpl.title, timestamp: 0, config: tpl.config })"
              class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
            >
              Muat
            </button>
            <button
              @click="store.deleteTemplate(tpl.id)"
              class="p-1.5 text-slate-400 hover:text-red-600"
            >
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
