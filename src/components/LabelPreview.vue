<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { useLabelStore } from '@/stores/labelStore';
import { escposService, type ProcessedImageData } from '@/services/escposService';
import { printerService } from '@/services/printerService';
import { Printer, RefreshCw, ZoomIn, Download, Eye } from 'lucide-vue-next';

const store = useLabelStore();
const previewCanvas = ref<HTMLCanvasElement | null>(null);
const processedImageData = ref<ProcessedImageData | null>(null);
const isProcessing = ref(false);

const paperWidthMm = computed(() => store.labelConfig.paperWidthMm);
const targetDots = computed(() => store.labelConfig.paperDotsWidth);

// Calculate container width in pixels for live preview
const zoomLevel = ref(1);

// Thermal font mapping
const fontClass = computed(() => {
  switch (store.labelConfig.fontSize) {
    case 'small':
      return 'text-xs leading-tight';
    case 'normal':
      return 'text-sm leading-normal';
    case 'large':
      return 'text-lg leading-relaxed font-semibold';
    case 'xlarge':
      return 'text-2xl leading-loose font-bold';
    default:
      return 'text-sm';
  }
});

const alignClass = computed(() => {
  switch (store.labelConfig.alignment) {
    case 'center':
      return 'text-center items-center justify-center';
    case 'right':
      return 'text-right items-end justify-end';
    case 'left':
    default:
      return 'text-left items-start justify-start';
  }
});

const weightClass = computed(() => {
  return store.labelConfig.fontWeight === 'bold' ? 'font-bold' : 'font-normal';
});

// Process uploaded image to 1-bit dithered raster for preview canvas
async function renderCanvas() {
  if (!previewCanvas.value) return;

  const canvas = previewCanvas.value;
  const ctx = canvas.getContext('2d')!;

  const widthDots = targetDots.value;
  const margins = store.labelConfig.margins;
  const topPx = Math.round(margins.top * 8);
  const bottomPx = Math.round(margins.bottom * 8);
  const leftPx = Math.round(margins.left * 8);
  const rightPx = Math.round(margins.right * 8);

  // Process image if available
  let imgObj: HTMLImageElement | null = null;
  let imgHeightDots = 0;
  if (store.labelConfig.image?.dataUrl) {
    isProcessing.value = true;
    try {
      imgObj = new Image();
      imgObj.src = store.labelConfig.image.dataUrl;
      await new Promise((resolve) => {
        if (imgObj) imgObj.onload = resolve;
      });

      const imgWidthDots = Math.max(32, Math.min(widthDots - leftPx - rightPx, Math.round((store.labelConfig.image.customWidthMm || 30) * 8)));
      processedImageData.value = await escposService.processImage(
        imgObj,
        imgWidthDots,
        store.labelConfig.image.threshold,
        store.labelConfig.image.dithering,
        store.labelConfig.image.invert
      );
      imgHeightDots = processedImageData.value.heightDots;
    } catch (e) {
      console.error('Image processing error:', e);
    } finally {
      isProcessing.value = false;
    }
  } else {
    processedImageData.value = null;
  }

  // Calculate canvas height
  let contentHeightDots = 60; // Minimum default
  if (processedImageData.value) {
    contentHeightDots += imgHeightDots + Math.round((store.labelConfig.image?.gapMm || 2) * 8);
  }

  // Calculate text height
  const textLayout = escposService.layoutText(store.labelConfig);
  const textHeightDots = textLayout.lines.length * textLayout.lineH;
  contentHeightDots += textHeightDots;

  const totalHeightDots = store.labelConfig.heightMode === 'fixed'
    ? Math.max(80, Math.round(store.labelConfig.fixedHeightMm * 8))
    : topPx + contentHeightDots + bottomPx;

  canvas.width = widthDots;
  canvas.height = totalHeightDots;

  // Background white thermal paper
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthDots, totalHeightDots);

  // Print area guide outline (dotted line)
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(leftPx, topPx, widthDots - leftPx - rightPx, totalHeightDots - topPx - bottomPx);
  ctx.setLineDash([]);

  let currentY = topPx + 10;

  // Render Image on canvas if layout is 'above' or 'image_only'
  const layout = store.labelConfig.image?.layout || 'text_only';
  const renderImageFn = () => {
    if (processedImageData.value && processedImageData.value.monochromeDataUrl) {
      const monoImg = new Image();
      monoImg.src = processedImageData.value.monochromeDataUrl;
      const imgX = store.labelConfig.image?.position === 'center'
        ? (widthDots - processedImageData.value.widthDots) / 2
        : store.labelConfig.image?.position === 'right'
        ? widthDots - rightPx - processedImageData.value.widthDots
        : leftPx;
      ctx.drawImage(monoImg, imgX, currentY);
      currentY += processedImageData.value.heightDots + Math.round((store.labelConfig.image?.gapMm || 2) * 8);
    }
  };

  const renderTextFn = () => {
    const text = store.labelConfig.text;
    if (!text && store.labelConfig.labelType === 'text_only') return;

    // Emulate the printer's fixed character grid (same wrapping as the ESC/POS output)
    const { lines, cellW, cellH, lineH, leftDots, printableDots } = escposService.layoutText(store.labelConfig);
    ctx.fillStyle = '#000000';
    const fontStyle = store.labelConfig.fontWeight === 'bold' ? 'bold' : 'normal';
    // Courier glyph advance is 0.6em, so this makes each glyph fit one printer cell
    ctx.font = `${fontStyle} ${Math.round(cellW / 0.6)}px Courier New, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    for (const line of lines) {
      const lineWidth = line.length * cellW;
      let textX = leftDots;
      if (store.labelConfig.alignment === 'center') {
        textX = leftDots + (printableDots - lineWidth) / 2;
      } else if (store.labelConfig.alignment === 'right') {
        textX = leftDots + printableDots - lineWidth;
      }
      const baseline = currentY + Math.round(cellH * 0.8);
      for (let i = 0; i < line.length; i++) {
        ctx.fillText(line[i], textX + i * cellW + cellW / 2, baseline);
      }
      currentY += lineH;
    }
    ctx.textAlign = 'start';
  };

  if (layout === 'image_only') {
    renderImageFn();
  } else if (layout === 'below') {
    renderTextFn();
    renderImageFn();
  } else {
    // default above or text_only
    if (processedImageData.value && layout !== 'text_only') {
      renderImageFn();
    }
    renderTextFn();
  }
}

watch(
  () => [store.labelConfig],
  () => {
    renderCanvas();
  },
  { deep: true }
);

onMounted(() => {
  renderCanvas();
});

const calculatedHeightMm = computed(() => {
  if (!previewCanvas.value) return 25;
  return Math.round((previewCanvas.value.height / 8) * 10) / 10;
});

function triggerPrint() {
  store.printCurrentLabel(processedImageData.value);
}

function browserPrint() {
  if (previewCanvas.value) {
    printerService.printViaBrowser(previewCanvas.value);
  }
}
</script>

<template>
  <div class="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Eye class="w-4 h-4 text-slate-600" />
        <h2 class="text-sm font-semibold text-slate-800">Live Thermal Preview</h2>
        <span class="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-medium">
          {{ paperWidthMm }} mm ({{ targetDots }} dots)
        </span>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          @click="renderCanvas"
          title="Refresh Preview"
          class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
        >
          <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': isProcessing }" />
        </button>
        <button
          @click="zoomLevel = zoomLevel === 1 ? 1.25 : zoomLevel === 1.25 ? 0.8 : 1"
          title="Toggle Zoom"
          class="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
        >
          <ZoomIn class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- Live Paper Roll Area -->
    <div class="flex-1 bg-[#E2E8F0] p-6 overflow-auto flex flex-col items-center justify-center min-h-[360px] relative">
      <!-- Simulated Thermal Paper Card -->
      <div
        class="transition-all duration-200 shadow-lg relative bg-white border-x border-slate-300"
        :style="{
          width: `${paperWidthMm * 4.5 * zoomLevel}px`,
          maxWidth: '100%',
        }"
      >
        <!-- Jagged Paper Top Tear Effect -->
        <div
          class="h-2 w-full bg-[#E2E8F0] -mt-2"
          style="clip-path: polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%);"
        ></div>

        <!-- Paper Body Content -->
        <div class="p-4 flex flex-col items-center justify-center bg-white relative">
          <!-- Canvas Renderer -->
          <canvas
            ref="previewCanvas"
            class="max-w-full h-auto border border-dashed border-slate-200 bg-white shadow-inner"
          ></canvas>

          <!-- Low paper thermal side stripe indicator (Simulated) -->
          <div class="absolute left-1 top-2 bottom-2 w-1 border-r border-red-300 opacity-30 pointer-events-none"></div>
        </div>

        <!-- Jagged Paper Bottom Tear Effect -->
        <div
          class="h-2 w-full bg-[#E2E8F0] -mb-2"
          style="clip-path: polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%);"
        ></div>
      </div>

      <!-- Dimension Badge -->
      <div class="mt-4 flex items-center gap-2 text-xs text-slate-600 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-300 font-mono shadow-sm">
        <span>Lebar: <strong>{{ paperWidthMm }} mm</strong></span>
        <span>•</span>
        <span>Tinggi Estimasi: <strong>{{ calculatedHeightMm }} mm</strong></span>
      </div>
    </div>

    <!-- Quick Action Footer -->
    <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
      <button
        @click="browserPrint"
        class="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition flex items-center justify-center gap-1.5"
      >
        <Download class="w-4 h-4 text-slate-500" />
        <span>Print via Browser</span>
      </button>

      <button
        @click="triggerPrint"
        :disabled="store.isPrinting"
        class="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 rounded-md transition shadow flex items-center justify-center gap-2"
      >
        <Printer class="w-4 h-4" />
        <span>{{ store.isPrinting ? 'Mencetak...' : 'Cetak Label (ESC/POS)' }}</span>
      </button>
    </div>
  </div>
</template>
