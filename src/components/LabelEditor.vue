<script setup lang="ts">
import { ref } from 'vue';
import { useLabelStore } from '@/stores/labelStore';
import type {
  FontSizeOption,
  AlignmentOption,
  FontWeightOption,
  LabelTypeOption,
  ImageLayoutOption,
  ImageSizeOption,
} from '@/types/label';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Image as ImageIcon,
  PlusCircle,
  BookmarkPlus,
  Sliders,
  Scissors,
  Trash2,
  Upload,
  Camera,
} from 'lucide-vue-next';

const store = useLabelStore();
const fileInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);

const fontSizes: { value: FontSizeOption; label: string }[] = [
  { value: 'small', label: 'Kecil' },
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Besar' },
  { value: 'xlarge', label: 'X-Large' },
];

const alignments: { value: AlignmentOption; label: string; icon: any }[] = [
  { value: 'left', label: 'Kiri', icon: AlignLeft },
  { value: 'center', label: 'Tengah', icon: AlignCenter },
  { value: 'right', label: 'Kanan', icon: AlignRight },
];

const paperWidths = [
  { value: 57, label: '57 mm' },
  { value: 58, label: '58 mm' },
  { value: 80, label: '80 mm' },
];

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      store.labelConfig.image = {
        dataUrl,
        position: 'center',
        layout: 'above',
        size: 'medium',
        customWidthMm: Math.min(40, store.labelConfig.paperWidthMm - 8),
        threshold: 128,
        dithering: true,
        invert: false,
        gapMm: 3,
      };
    };
    reader.readAsDataURL(file);
  }
}

function removeImage() {
  store.labelConfig.image = undefined;
  if (fileInput.value) fileInput.value.value = '';
  if (cameraInput.value) cameraInput.value.value = '';
}

function triggerTemplateSave() {
  const name = prompt('Masukkan nama template:', store.labelConfig.text.split('\n')[0] || 'Template Baru');
  if (name) {
    store.saveCurrentAsTemplate(name);
  }
}
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-6">
    <!-- Header Title -->
    <div class="flex items-center justify-between border-b border-slate-200 pb-3">
      <div>
        <h2 class="text-base font-semibold text-slate-800">Editor Label</h2>
        <p class="text-xs text-slate-500">Atur teks, format, dan gambar sebelum dicetak</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="store.addToHistory()"
          class="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center gap-1"
          title="Simpan ke Riwayat"
        >
          <PlusCircle class="w-3.5 h-3.5 text-slate-600" />
          <span>+ Riwayat</span>
        </button>

        <button
          @click="triggerTemplateSave"
          class="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition flex items-center gap-1"
          title="Simpan sebagai Template"
        >
          <BookmarkPlus class="w-3.5 h-3.5 text-slate-600" />
          <span>+ Template</span>
        </button>
      </div>
    </div>

    <!-- 1. Label Content & Type -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <label class="text-xs font-semibold uppercase tracking-wider text-slate-700">Teks / Nama Label</label>
        <div class="flex items-center gap-1 text-xs">
          <label class="text-slate-500 mr-1">Tipe:</label>
          <select
            v-model="store.labelConfig.labelType"
            class="py-1 px-2 text-xs bg-slate-50 border border-slate-300 rounded font-medium focus:ring-1 focus:ring-slate-500"
          >
            <option value="text_only">Hanya Teks</option>
            <option value="name_number">Nama + Nomor Auto</option>
            <option value="custom">Custom Text</option>
          </select>
        </div>
      </div>

      <textarea
        v-model="store.labelConfig.text"
        rows="3"
        placeholder="Ketik nama atau isi teks label di sini... (tekan enter untuk baris baru)"
        class="w-full p-3 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-sans"
      ></textarea>

      <!-- Subfields if Name + Number -->
      <div v-if="store.labelConfig.labelType === 'name_number'" class="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-md">
        <div>
          <label class="text-xs font-medium text-slate-600 block mb-1">Prefix Nomor</label>
          <input
            v-model="store.labelConfig.customNumberPrefix"
            type="text"
            placeholder="mis. NO. / ID-"
            class="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
          />
        </div>
        <div>
          <label class="text-xs font-medium text-slate-600 block mb-1">Nomor Awal</label>
          <input
            v-model.number="store.labelConfig.customNumberStart"
            type="number"
            min="1"
            class="w-full p-1.5 text-xs border border-slate-300 rounded bg-white"
          />
        </div>
      </div>
    </div>

    <!-- 2. Typography Formatting Controls -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-md">
      <!-- Ukuran Teks -->
      <div>
        <label class="text-xs font-semibold text-slate-700 block mb-1.5">Ukuran Teks</label>
        <div class="grid grid-cols-2 gap-1">
          <button
            v-for="sz in fontSizes"
            :key="sz.value"
            @click="store.labelConfig.fontSize = sz.value"
            :class="[
              'py-1.5 px-2 text-xs font-medium rounded border transition',
              store.labelConfig.fontSize === sz.value
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100',
            ]"
          >
            {{ sz.label }}
          </button>
        </div>
      </div>

      <!-- Alignment -->
      <div>
        <label class="text-xs font-semibold text-slate-700 block mb-1.5">Ratain Teks</label>
        <div class="flex items-center gap-1">
          <button
            v-for="al in alignments"
            :key="al.value"
            @click="store.labelConfig.alignment = al.value"
            :class="[
              'flex-1 py-1.5 px-2 text-xs font-medium rounded border transition flex items-center justify-center gap-1',
              store.labelConfig.alignment === al.value
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100',
            ]"
          >
            <component :is="al.icon" class="w-3.5 h-3.5" />
            <span>{{ al.label }}</span>
          </button>
        </div>
      </div>

      <!-- Ketebalan & Copy -->
      <div>
        <label class="text-xs font-semibold text-slate-700 block mb-1.5">Ketebalan & Copy</label>
        <div class="flex items-center gap-2">
          <button
            @click="store.labelConfig.fontWeight = store.labelConfig.fontWeight === 'bold' ? 'normal' : 'bold'"
            :class="[
              'py-1.5 px-3 text-xs font-medium rounded border transition flex items-center gap-1',
              store.labelConfig.fontWeight === 'bold'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100',
            ]"
          >
            <Bold class="w-3.5 h-3.5" />
            <span>Tebal</span>
          </button>

          <div class="flex items-center gap-1 ml-auto">
            <span class="text-xs text-slate-600 font-medium">Copy:</span>
            <input
              v-model.number="store.labelConfig.copies"
              type="number"
              min="1"
              max="50"
              class="w-14 p-1 text-xs text-center border border-slate-300 rounded bg-white font-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Ukuran Kertas Thermal & Margins -->
    <div class="space-y-3">
      <label class="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Kertas & Margin Area Cetak</label>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <!-- Paper Width selector -->
        <div>
          <label class="text-xs text-slate-600 font-medium block mb-1">Lebar Kertas</label>
          <select
            :value="store.labelConfig.paperWidthMm"
            @change="(e: any) => store.updatePaperWidth(Number(e.target.value))"
            class="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded font-semibold"
          >
            <option v-for="pw in paperWidths" :key="pw.value" :value="pw.value">{{ pw.label }}</option>
          </select>
        </div>

        <!-- Mode Tinggi Kertas -->
        <div>
          <label class="text-xs text-slate-600 font-medium block mb-1">Panjang Label</label>
          <select
            v-model="store.labelConfig.heightMode"
            class="w-full p-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          >
            <option value="auto">Auto Panjang</option>
            <option value="fixed">Fixed Height (mm)</option>
          </select>
        </div>

        <!-- Fixed height mm input -->
        <div v-if="store.labelConfig.heightMode === 'fixed'">
          <label class="text-xs text-slate-600 font-medium block mb-1">Tinggi (mm)</label>
          <input
            v-model.number="store.labelConfig.fixedHeightMm"
            type="number"
            min="10"
            max="200"
            class="w-full p-1.5 text-xs border border-slate-300 rounded bg-white font-mono"
          />
        </div>

        <!-- Margins Grid -->
        <div class="col-span-2 md:col-span-1">
          <label class="text-xs text-slate-600 font-medium block mb-1">Margin Atas/Bawah</label>
          <div class="flex items-center gap-1">
            <input
              v-model.number="store.labelConfig.margins.top"
              type="number"
              min="0"
              max="20"
              placeholder="Top"
              title="Margin Atas (mm)"
              class="w-1/2 p-1 text-xs border border-slate-300 rounded bg-white text-center"
            />
            <input
              v-model.number="store.labelConfig.margins.bottom"
              type="number"
              min="0"
              max="20"
              placeholder="Btm"
              title="Margin Bawah (mm)"
              class="w-1/2 p-1 text-xs border border-slate-300 rounded bg-white text-center"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 4. Cetak Gambar (Thermal Image Editor - Feature #13) -->
    <div class="border border-slate-200 rounded-md p-4 bg-slate-50/50 space-y-4">
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <div class="flex items-center gap-2">
          <ImageIcon class="w-4 h-4 text-slate-700" />
          <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-700">Cetak Gambar / Logo Thermal</h3>
        </div>

        <button
          v-if="store.labelConfig.image"
          @click="removeImage"
          class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>Hapus Gambar</span>
        </button>
      </div>

      <!-- Upload Buttons -->
      <div v-if="!store.labelConfig.image" class="flex items-center gap-3">
        <input
          ref="fileInput"
          type="file"
          accept="image/png, image/jpeg, image/jpg, image/webp"
          @change="handleFileUpload"
          class="hidden"
        />
        <input
          ref="cameraInput"
          type="file"
          accept="image/*"
          capture="environment"
          @change="handleFileUpload"
          class="hidden"
        />

        <button
          @click="fileInput?.click()"
          class="flex-1 py-3 px-4 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-md text-xs font-semibold text-slate-700 transition flex items-center justify-center gap-2"
        >
          <Upload class="w-4 h-4 text-slate-500" />
          <span>Upload File Gambar (PNG/JPG/WEBP)</span>
        </button>

        <button
          @click="cameraInput?.click()"
          class="py-3 px-4 bg-white border border-slate-300 hover:bg-slate-100 rounded-md text-xs font-medium text-slate-700 transition flex items-center gap-1.5"
          title="Ambil Foto Kamera"
        >
          <Camera class="w-4 h-4 text-slate-600" />
          <span>Kamera HP</span>
        </button>
      </div>

      <!-- Image Processing & Controls if uploaded -->
      <div v-else class="space-y-4">
        <!-- Thumbnail & Basic info -->
        <div class="flex items-center gap-4 bg-white p-3 border border-slate-200 rounded-md">
          <img
            :src="store.labelConfig.image.dataUrl"
            alt="Uploaded Preview"
            class="w-16 h-16 object-contain border border-slate-300 rounded bg-slate-50"
          />

          <div class="flex-1 text-xs space-y-1">
            <span class="font-semibold text-slate-800 block">Gambar Ter-upload</span>
            <div class="flex items-center gap-2">
              <label class="text-slate-500">Layout:</label>
              <select
                v-model="store.labelConfig.image.layout"
                class="py-0.5 px-2 text-xs bg-slate-50 border border-slate-300 rounded"
              >
                <option value="above">Gambar di Atas Teks</option>
                <option value="below">Gambar di Bawah Teks</option>
                <option value="image_only">Hanya Gambar</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Detail Controls for Thermal Image Processing -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-3 border border-slate-200 rounded-md">
          <!-- Threshold Slider -->
          <div>
            <div class="flex justify-between items-center text-xs mb-1">
              <span class="font-medium text-slate-700">Tingkat Kehitaman (Threshold)</span>
              <span class="font-mono text-slate-600 font-bold">{{ store.labelConfig.image.threshold }}</span>
            </div>
            <input
              v-model.number="store.labelConfig.image.threshold"
              type="range"
              min="1"
              max="254"
              class="w-full accent-slate-700"
            />
          </div>

          <!-- Custom Image Width mm -->
          <div>
            <div class="flex justify-between items-center text-xs mb-1">
              <span class="font-medium text-slate-700">Lebar Gambar (mm)</span>
              <span class="font-mono text-slate-600 font-bold">{{ store.labelConfig.image.customWidthMm }} mm</span>
            </div>
            <input
              v-model.number="store.labelConfig.image.customWidthMm"
              type="range"
              min="10"
              :max="store.labelConfig.paperWidthMm - 4"
              class="w-full accent-slate-700"
            />
          </div>

          <!-- Dithering & Invert Toggles -->
          <div class="flex items-center gap-4 text-xs font-medium">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                v-model="store.labelConfig.image.dithering"
                type="checkbox"
                class="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
              />
              <span>Dithering (Gradasi Halus)</span>
            </label>

            <label class="flex items-center gap-1.5 cursor-pointer">
              <input
                v-model="store.labelConfig.image.invert"
                type="checkbox"
                class="rounded border-slate-300 text-slate-700 focus:ring-slate-500"
              />
              <span>Invert Hitam/Putih</span>
            </label>
          </div>

          <!-- Position Alignment -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-600 font-medium">Posisi:</span>
            <button
              v-for="pos in (['left', 'center', 'right'] as AlignmentOption[])"
              :key="pos"
              @click="store.labelConfig.image!.position = pos"
              :class="[
                'py-1 px-2.5 text-xs rounded border capitalize transition',
                store.labelConfig.image.position === pos
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-white text-slate-700 border-slate-300',
              ]"
            >
              {{ pos }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
