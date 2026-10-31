<script setup lang="ts">
import { ref } from 'vue';
import { useLabelStore } from '@/stores/labelStore';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  CornerDownLeft,
} from 'lucide-vue-next';

const store = useLabelStore();
const inputName = ref('');

function handleAddQueue() {
  if (inputName.value.trim()) {
    store.addToQueue(inputName.value.trim());
    inputName.value = '';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'done':
      return { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
    case 'printing':
      return { label: 'Mencetak...', color: 'bg-amber-100 text-amber-800 border-amber-200 animate-pulse', icon: Clock };
    case 'failed':
      return { label: 'Gagal', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle };
    case 'pending':
    default:
      return { label: 'Menunggu', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock };
  }
}
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <div>
        <h2 class="text-base font-semibold text-slate-800 flex items-center gap-2">
          <Zap class="w-5 h-5 text-amber-500 fill-amber-400" />
          <span>Quick Input Mode & Antrean Cetak Batch</span>
        </h2>
        <p class="text-xs text-slate-500">
          Ketik nama lalu tekan <strong>ENTER</strong> untuk memasukkan label ke antrean masal.
        </p>
      </div>

      <!-- Quick Summary Badges -->
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 rounded">
          Tertunda: {{ store.pendingQueueCount }}
        </span>
        <span class="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
          Total: {{ store.printQueue.length }}
        </span>
      </div>
    </div>

    <!-- Fast Text Input Box -->
    <div class="bg-slate-50 p-4 border border-slate-200 rounded-md space-y-3">
      <label class="text-xs font-semibold text-slate-700 block">Input Nama Cepat</label>

      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            v-model="inputName"
            @keyup.enter="handleAddQueue"
            type="text"
            placeholder="Ketik nama label... lalu tekan Enter"
            class="w-full py-2.5 px-3 pr-10 text-sm border border-slate-300 rounded-md bg-white font-medium focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          <div class="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
            <span>ENTER</span>
            <CornerDownLeft class="w-3 h-3" />
          </div>
        </div>

        <button
          @click="handleAddQueue"
          class="py-2.5 px-4 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 rounded-md transition flex items-center gap-1.5 shadow-sm"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>
    </div>

    <!-- Batch Controls -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <button
          @click="store.printAllQueue()"
          :disabled="store.pendingQueueCount === 0 || store.isPrinting"
          class="py-2 px-4 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 rounded transition flex items-center gap-1.5 shadow-sm"
        >
          <Play class="w-3.5 h-3.5 fill-white" />
          <span>Cetak Semua Antrean ({{ store.pendingQueueCount }})</span>
        </button>
      </div>

      <button
        v-if="store.printQueue.length > 0"
        @click="store.clearQueue()"
        class="py-1.5 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded transition font-medium flex items-center gap-1"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>Bersihkan Antrean</span>
      </button>
    </div>

    <!-- Queue Table -->
    <div v-if="store.printQueue.length === 0" class="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-md">
      <Zap class="w-10 h-10 text-slate-300 mx-auto mb-2" />
      <p class="text-sm font-semibold text-slate-600">Antrean Cetak Kosong</p>
      <p class="text-xs text-slate-400 mt-1">
        Ketik nama di kotak di atas dan tekan Enter untuk menambahkan antrean.
      </p>
    </div>

    <div v-else class="border border-slate-200 rounded-md overflow-hidden">
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200">
          <tr>
            <th class="py-2.5 px-3 w-12">#</th>
            <th class="py-2.5 px-3">Nama Label</th>
            <th class="py-2.5 px-3 w-28">Status</th>
            <th class="py-2.5 px-3 w-28 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-200">
          <tr v-for="(item, idx) in store.printQueue" :key="item.id" class="hover:bg-slate-50">
            <td class="py-2.5 px-3 font-mono font-medium text-slate-500">{{ idx + 1 }}</td>
            <td class="py-2.5 px-3 font-semibold text-slate-800">{{ item.name }}</td>
            <td class="py-2.5 px-3">
              <span
                :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border',
                  getStatusBadge(item.status).color,
                ]"
              >
                <component :is="getStatusBadge(item.status).icon" class="w-3 h-3" />
                <span>{{ getStatusBadge(item.status).label }}</span>
              </span>
            </td>
            <td class="py-2.5 px-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button
                  @click="store.printQueueItem(item)"
                  :disabled="store.isPrinting"
                  class="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded"
                  title="Cetak item ini"
                >
                  <Play class="w-3.5 h-3.5" />
                </button>

                <button
                  @click="store.removeFromQueue(item.id)"
                  class="p-1 text-slate-400 hover:text-red-600 rounded"
                  title="Hapus dari antrean"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
