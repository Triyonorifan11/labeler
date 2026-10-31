import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type {
  LabelConfig,
  HistoryItem,
  TemplateItem,
  PrintQueueItem,
  PrinterDevice,
  PrinterSettingsConfig,
} from '@/types/label';
import { historyService } from '@/services/historyService';
import { escposService } from '@/services/escposService';
import { printerService } from '@/services/printerService';

export const useLabelStore = defineStore('label', () => {
  // --- Active Tab ---
  const activeTab = ref<'editor' | 'history' | 'queue' | 'settings'>('editor');

  // --- Default Label Configuration ---
  const labelConfig = ref<LabelConfig>({
    text: 'Ahmad Subardjo\nDept. Logistik & Gudang',
    labelType: 'text_only',
    customNumberPrefix: 'NO.',
    customNumberStart: 101,
    customNumberCurrent: 101,
    fontSize: 'normal',
    alignment: 'center',
    fontWeight: 'bold',
    copies: 1,
    margins: {
      top: 3,
      bottom: 3,
      left: 2,
      right: 2,
    },
    paperWidthMm: 58,
    paperDotsWidth: 384, // 58mm default -> 384 dots
    heightMode: 'auto',
    fixedHeightMm: 30,
    image: undefined,
  });

  // --- Printer Device State ---
  const printerDevice = ref<PrinterDevice | null>(null);
  const isConnecting = ref(false);
  const connectionError = ref<string | null>(null);

  // --- Global Printer Settings ---
  const printerSettings = ref<PrinterSettingsConfig>({
    connectionType: 'web_bluetooth',
    paperWidthMm: 58,
    printDensity: 3,
    printSpeed: 3,
    defaultFontSize: 'normal',
    defaultAlignment: 'center',
    autoFeedAfterPrint: true,
    feedLines: 3,
    cutPaper: false,
    sppBridgeUrl: 'rawbt:',
  });

  // --- Persist settings across refresh (localStorage) ---
  const SETTINGS_KEY = 'thermal-labeler:printer-settings';
  const LABEL_CONFIG_KEY = 'thermal-labeler:label-config';

  function loadSaved<T extends object>(key: string, target: T) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) Object.assign(target, JSON.parse(raw));
    } catch (e) {
      console.warn('Gagal memuat pengaturan tersimpan:', key, e);
    }
  }

  loadSaved(SETTINGS_KEY, printerSettings.value);
  loadSaved(LABEL_CONFIG_KEY, labelConfig.value);

  watch(
    printerSettings,
    (val) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(val)),
    { deep: true }
  );
  watch(
    labelConfig,
    (val) => {
      // Image data URLs can be large; keep them out of localStorage
      const { image: _image, ...rest } = val;
      try {
        localStorage.setItem(LABEL_CONFIG_KEY, JSON.stringify(rest));
      } catch (e) {
        console.warn('Gagal menyimpan konfigurasi label:', e);
      }
    },
    { deep: true }
  );

  // --- History & Templates ---
  const historyList = ref<HistoryItem[]>([]);
  const templatesList = ref<TemplateItem[]>([]);

  // --- Print Queue (Quick Input Mode) ---
  const printQueue = ref<PrintQueueItem[]>([]);

  // --- Printing Status ---
  const isPrinting = ref(false);
  const printMessage = ref<string | null>(null);
  const notification = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // --- Computed ---
  const isPrinterConnected = computed(() => !!printerDevice.value && printerDevice.value.connected);

  const pendingQueueCount = computed(() => printQueue.value.filter((i: PrintQueueItem) => i.status === 'pending').length);

  // --- Actions ---

  function setNotification(text: string, type: 'success' | 'error' | 'info' = 'info') {
    notification.value = { type, text };
    setTimeout(() => {
      if (notification.value?.text === text) {
        notification.value = null;
      }
    }, 4000);
  }

  function updatePaperWidth(mm: number) {
    labelConfig.value.paperWidthMm = mm;
    // Calculate dots: 8 dots/mm standard thermal printhead
    labelConfig.value.paperDotsWidth = mm === 80 ? 576 : mm === 58 ? 384 : mm === 57 ? 384 : Math.round(mm * 8);
  }

  async function loadInitialData() {
    try {
      historyList.value = await historyService.getHistory();
      templatesList.value = await historyService.getTemplates();
      printQueue.value = await historyService.getQueue();
    } catch (e) {
      console.error('Error loading initial history/templates:', e);
    }
  }

  async function addToHistory(customName?: string) {
    const nameText = customName || labelConfig.value.text.trim() || 'Label Tanpa Nama';
    const newItem: HistoryItem = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: nameText,
      timestamp: Date.now(),
      config: JSON.parse(JSON.stringify(labelConfig.value)),
      hasImage: !!labelConfig.value.image?.dataUrl,
    };

    await historyService.saveHistory(newItem);
    historyList.value = await historyService.getHistory();
    setNotification('Label berhasil ditambahkan ke Riwayat!', 'success');
  }

  async function deleteHistoryItem(id: string) {
    await historyService.deleteHistory(id);
    historyList.value = await historyService.getHistory();
    setNotification('Riwayat dihapus', 'info');
  }

  async function clearAllHistory() {
    await historyService.clearHistory();
    historyList.value = [];
    setNotification('Semua riwayat telah dibersihkan', 'info');
  }

  async function toggleFavoriteHistory(id: string) {
    await historyService.toggleFavorite(id);
    historyList.value = await historyService.getHistory();
  }

  async function applyHistoryToEditor(item: HistoryItem) {
    labelConfig.value = JSON.parse(JSON.stringify(item.config));
    activeTab.value = 'editor';
    setNotification(`Pengaturan label "${item.name}" dimuat ke Editor`, 'info');
  }

  // --- Templates ---
  async function saveCurrentAsTemplate(title: string) {
    const newTemplate: TemplateItem = {
      id: 'tpl_' + Date.now(),
      title: title || 'Template ' + (templatesList.value.length + 1),
      config: JSON.parse(JSON.stringify(labelConfig.value)),
      createdAt: Date.now(),
    };
    await historyService.saveTemplate(newTemplate);
    templatesList.value = await historyService.getTemplates();
    setNotification('Template berhasil disimpan!', 'success');
  }

  async function deleteTemplate(id: string) {
    await historyService.deleteTemplate(id);
    templatesList.value = await historyService.getTemplates();
  }

  // --- Queue ---
  async function addToQueue(text: string) {
    if (!text.trim()) return;
    const itemConfig = JSON.parse(JSON.stringify(labelConfig.value));
    itemConfig.text = text.trim();

    if (itemConfig.labelType === 'name_number') {
      itemConfig.customNumberCurrent = labelConfig.value.customNumberStart;
      labelConfig.value.customNumberStart += 1;
    }

    const newItem: PrintQueueItem = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name: text.trim(),
      config: itemConfig,
      status: 'pending',
    };

    printQueue.value.push(newItem);
    await historyService.saveQueue(printQueue.value);
  }

  async function removeFromQueue(id: string) {
    printQueue.value = printQueue.value.filter((i: PrintQueueItem) => i.id !== id);
    await historyService.saveQueue(printQueue.value);
  }

  async function clearQueue() {
    printQueue.value = [];
    await historyService.saveQueue([]);
    setNotification('Antrean cetak dibersihkan', 'info');
  }

  // --- Printer Connection ---
  async function connectPrinter() {
    isConnecting.value = true;
    connectionError.value = null;
    try {
      const dev = await printerService.connectWebBluetooth();
      printerDevice.value = dev;
      setNotification(`Terhubung ke printer "${dev.name}"`, 'success');
    } catch (err: any) {
      connectionError.value = err.message || 'Gagal terhubung ke printer Bluetooth.';
      setNotification(connectionError.value || 'Gagal koneksi', 'error');
    } finally {
      isConnecting.value = false;
    }
  }

  async function autoReconnectPrinter() {
    isConnecting.value = true;
    try {
      const dev = await printerService.autoReconnect();
      if (dev) {
        printerDevice.value = dev;
        setNotification(`Otomatis terhubung ke printer "${dev.name}"`, 'success');
      }
    } finally {
      isConnecting.value = false;
    }
  }

  async function disconnectPrinter() {
    if (printerDevice.value) {
      await printerService.disconnect(printerDevice.value);
      printerService.forgetLastPrinter();
      printerDevice.value = null;
      setNotification('Printer terputus', 'info');
    }
  }

  // --- Print Actions ---
  async function printCurrentLabel(processedImg?: any) {
    if (!labelConfig.value.text.trim() && !labelConfig.value.image?.dataUrl) {
      setNotification('Teks atau Gambar label tidak boleh kosong!', 'error');
      return;
    }

    isPrinting.value = true;
    printMessage.value = 'Mempersiapkan data cetak ESC/POS...';

    try {
      const copies = Math.max(1, labelConfig.value.copies || 1);
      const escposData = await escposService.buildLabelEscpos(labelConfig.value, processedImg, printerSettings.value);

      if (printerDevice.value && printerDevice.value.connected) {
        printMessage.value = `Mengirim ke printer (${copies} copy)...`;
        for (let c = 1; c <= copies; c++) {
          printMessage.value = `Mencetak copy ${c} dari ${copies}...`;
          await printerService.sendData(printerDevice.value, escposData);
        }
        setNotification(`Berhasil mencetak ${copies} copy label!`, 'success');
      } else {
        // Fallback options
        if (printerSettings.value.connectionType === 'bluetooth_spp_bridge') {
          printMessage.value = 'Membuka Android RawBT Bridge...';
          printerService.sendToAndroidRawBTBridge(escposData);
          setNotification('Data cetak dikirim ke aplikasi Android Bridge!', 'info');
        } else {
          // Offer bin file export / notice
          setNotification('Printer Bluetooth belum terhubung. Mengunduh berkas ESC/POS...', 'info');
          printerService.downloadEscposFile(escposData, `label_${Date.now()}.bin`);
        }
      }

      // Automatically add printed label to history
      await addToHistory();
    } catch (e: any) {
      console.error('Print error:', e);
      setNotification(e.message || 'Gagal mencetak label', 'error');
    } finally {
      isPrinting.value = false;
      printMessage.value = null;
    }
  }

  async function printQueueItem(item: PrintQueueItem, processedImg?: any) {
    item.status = 'printing';
    try {
      const escposData = await escposService.buildLabelEscpos(item.config, processedImg, printerSettings.value);
      if (printerDevice.value && printerDevice.value.connected) {
        await printerService.sendData(printerDevice.value, escposData);
      } else {
        printerService.sendToAndroidRawBTBridge(escposData);
      }
      item.status = 'done';
    } catch (e: any) {
      item.status = 'failed';
      item.error = e.message;
      throw e;
    }
  }

  async function printAllQueue() {
    const pending = printQueue.value.filter((i: PrintQueueItem) => i.status === 'pending');
    if (pending.length === 0) {
      setNotification('Tidak ada antrean cetak yang tertunda.', 'info');
      return;
    }

    isPrinting.value = true;
    let countSuccess = 0;

    for (const item of pending) {
      printMessage.value = `Mencetak antrean: ${item.name}...`;
      try {
        await printQueueItem(item);
        countSuccess++;
      } catch (e) {
        console.error('Failed queue item print:', e);
      }
    }

    await historyService.saveQueue(printQueue.value);
    isPrinting.value = false;
    printMessage.value = null;
    setNotification(`Selesai mencetak ${countSuccess} dari ${pending.length} antrean!`, 'success');
  }

  async function testPrint() {
    isPrinting.value = true;
    printMessage.value = 'Mencetak halaman uji printer...';
    try {
      const testData = await escposService.buildTestPrintEscpos(labelConfig.value.paperWidthMm);
      if (printerDevice.value && printerDevice.value.connected) {
        await printerService.sendData(printerDevice.value, testData);
        setNotification('Uji cetak berhasil dikirim ke printer!', 'success');
      } else {
        printerService.downloadEscposFile(testData, 'test_print.bin');
        setNotification('Printer belum terhubung. Berkas uji cetak test_print.bin diunduh.', 'info');
      }
    } catch (e: any) {
      setNotification(e.message || 'Gagal uji cetak', 'error');
    } finally {
      isPrinting.value = false;
      printMessage.value = null;
    }
  }

  return {
    activeTab,
    labelConfig,
    printerDevice,
    isConnecting,
    connectionError,
    printerSettings,
    historyList,
    templatesList,
    printQueue,
    isPrinting,
    printMessage,
    notification,
    isPrinterConnected,
    pendingQueueCount,
    setNotification,
    updatePaperWidth,
    loadInitialData,
    addToHistory,
    deleteHistoryItem,
    clearAllHistory,
    toggleFavoriteHistory,
    applyHistoryToEditor,
    saveCurrentAsTemplate,
    deleteTemplate,
    addToQueue,
    removeFromQueue,
    clearQueue,
    connectPrinter,
    autoReconnectPrinter,
    disconnectPrinter,
    printCurrentLabel,
    printQueueItem,
    printAllQueue,
    testPrint,
  };
});
