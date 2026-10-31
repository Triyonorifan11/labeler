import type { PrinterDevice, PrinterConnectionType } from '@/types/label';

// Common Bluetooth Thermal Printer GATT Service UUIDs
const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard Printer Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent TX/RX
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // POS Printer Service
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
  '0000af00-0000-1000-8000-00805f9b34fb',
];

const LAST_PRINTER_KEY = 'thermal-labeler:last-printer-id';

export interface PrinterServiceState {
  device: PrinterDevice | null;
  isConnecting: boolean;
  error: string | null;
  supported: boolean;
}

export const printerService = {
  /**
   * Check if Web Bluetooth API is supported by the current browser
   */
  isWebBluetoothSupported(): boolean {
    return typeof window !== 'undefined' && 'bluetooth' in navigator;
  },

  /**
   * Scan and connect to a Web Bluetooth GATT thermal printer
   */
  async connectWebBluetooth(): Promise<PrinterDevice> {
    if (!this.isWebBluetoothSupported()) {
      throw new Error(
        'Web Bluetooth API tidak didukung di browser ini. Harap gunakan Google Chrome, Microsoft Edge, atau Webview Android yang mendukung Web Bluetooth.'
      );
    }

    try {
      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: PRINTER_SERVICES,
      });

      if (!device) {
        throw new Error('Tidak ada perangkat printer yang dipilih.');
      }

      console.log('Perangkat dipilih:', device.name || device.id);
      return await this.connectToDevice(device);
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        throw new Error('Pencarian printer dibatalkan oleh pengguna.');
      }
      throw new Error(err.message || 'Gagal menghubungkan ke printer Bluetooth.');
    }
  },

  /**
   * Reconnect to a printer the user already granted permission to (no device picker).
   * Returns null if there is no remembered printer or it is not reachable.
   */
  async autoReconnect(): Promise<PrinterDevice | null> {
    if (!this.isWebBluetoothSupported()) return null;
    const bluetooth = (navigator as any).bluetooth;
    if (typeof bluetooth.getDevices !== 'function') {
      console.info('[auto-reconnect] navigator.bluetooth.getDevices() tidak tersedia di browser ini');
      return null;
    }

    const lastId = localStorage.getItem(LAST_PRINTER_KEY);
    if (!lastId) {
      console.info('[auto-reconnect] belum ada printer tersimpan');
      return null;
    }

    try {
      const devices: any[] = await bluetooth.getDevices();
      console.info('[auto-reconnect] perangkat yang sudah diizinkan:', devices.map((d) => d.name || d.id));
      const device = devices.find((d) => d.id === lastId);
      if (!device) {
        console.info('[auto-reconnect] browser tidak menyimpan izin printer (perlu pilih manual)');
        return null;
      }
      await this.waitForAdvertisement(device);
      return await this.connectToDevice(device);
    } catch (err) {
      console.warn('Auto-reconnect gagal:', err);
      return null;
    }
  },

  /**
   * Devices from getDevices() are "out of range" until the browser sees an advertisement
   * from them. Wait for one (up to timeoutMs) before attempting GATT connect.
   */
  async waitForAdvertisement(device: any, timeoutMs: number = 10000): Promise<void> {
    if (typeof device.watchAdvertisements !== 'function') return;

    const abort = new AbortController();
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        device.removeEventListener('advertisementreceived', onAdv);
        abort.abort();
        reject(new Error('Printer tidak terdeteksi (pastikan printer menyala dan dekat).'));
      }, timeoutMs);

      const onAdv = () => {
        clearTimeout(timer);
        device.removeEventListener('advertisementreceived', onAdv);
        abort.abort();
        resolve();
      };

      device.addEventListener('advertisementreceived', onAdv);
      device.watchAdvertisements({ signal: abort.signal }).catch((e: any) => {
        if (e?.name === 'AbortError') return;
        clearTimeout(timer);
        device.removeEventListener('advertisementreceived', onAdv);
        reject(e);
      });
    });
  },

  /**
   * Forget the remembered printer so the next connect shows the picker
   */
  forgetLastPrinter(): void {
    localStorage.removeItem(LAST_PRINTER_KEY);
  },

  /**
   * Open GATT connection on a Bluetooth device and locate its write characteristic
   */
  async connectToDevice(device: any): Promise<PrinterDevice> {
    // Listen for disconnection
    {
      device.addEventListener('gattserverdisconnected', () => {
        console.warn('Printer terputus');
      });

      const server = await device.gatt.connect();
      console.log('GATT Server connected:', server);

      // Search for write characteristic
      let writeCharacteristic: any = null;
      const services = await server.getPrimaryServices();

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeCharacteristic = char;
              break;
            }
          }
        } catch (e) {
          console.warn('Failed reading service characteristics:', e);
        }
        if (writeCharacteristic) break;
      }

      if (!writeCharacteristic) {
        throw new Error(
          `GATT Service ditemukan pada "${device.name || 'Printer'}", tetapi tidak ada karakterik Penulisan Data (Write Characteristic). Printer ini kemungkinan menggunakan Bluetooth Classic SPP.`
        );
      }

      const printerDev: PrinterDevice = {
        id: device.id,
        name: device.name || 'Thermal Printer BLE',
        type: 'web_bluetooth',
        connected: true,
        device,
        server,
        characteristic: writeCharacteristic,
      };

      localStorage.setItem(LAST_PRINTER_KEY, device.id);
      return printerDev;
    }
  },

  /**
   * Disconnect printer
   */
  async disconnect(printer: PrinterDevice | null): Promise<void> {
    if (!printer) return;
    try {
      if (printer.server && printer.server.connected) {
        printer.server.disconnect();
      }
    } catch (e) {
      console.error('Disconnect error:', e);
    }
  },

  /**
   * Send ESC/POS data buffer to printer in MTU-safe chunks
   */
  async sendData(printer: PrinterDevice | null, data: Uint8Array): Promise<void> {
    if (!printer || !printer.connected) {
      throw new Error('Printer belum terhubung. Hubungkan printer terlebih dahulu.');
    }

    if (printer.type === 'web_bluetooth') {
      if (!printer.characteristic) {
        throw new Error('Karakteristik Bluetooth printer tidak tersedia.');
      }

      const chunkSize = 100; // Safe chunk size for BLE MTU
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        if (printer.characteristic.properties.writeWithoutResponse) {
          await printer.characteristic.writeValueWithoutResponse(chunk);
        } else {
          await printer.characteristic.writeValue(chunk);
        }
        // Small delay between BLE packets
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    } else if (printer.type === 'bluetooth_spp_bridge') {
      // Send data to SPP bridge endpoint (RawBT / local bridge server)
      throw new Error(
        'Untuk Bluetooth Classic SPP, gunakan tombol "Kirim via Android Bridge" atau "Unduh Binary ESC/POS".'
      );
    } else {
      throw new Error('Tipe printer tidak dikenal.');
    }
  },

  /**
   * Send to RawBT Android Bridge App via URL scheme intent
   */
  sendToAndroidRawBTBridge(data: Uint8Array): void {
    // Convert Uint8Array to base64
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Intent URL scheme for RawBT / Bluetooth Print App
    const intentUrl = `rawbt:data:application/octet-stream;base64,${base64}`;
    window.location.href = intentUrl;
  },

  /**
   * Export raw ESC/POS binary file for manual printing
   */
  downloadEscposFile(data: Uint8Array, filename: string = 'label_print.bin'): void {
    const blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Browser Print Fallback using standard window.print()
   */
  printViaBrowser(canvasElement: HTMLCanvasElement): void {
    const win = window.open('', '_blank');
    if (!win) return;
    const dataUrl = canvasElement.toDataURL('image/png');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cetak Label Thermal</title>
          <style>
            @page { margin: 0; }
            body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
            img { max-width: 100%; height: auto; display: block; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <img src="${dataUrl}" />
        </body>
      </html>
    `);
    win.document.close();
  }
};
