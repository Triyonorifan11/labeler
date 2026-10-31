export type PaperWidthOption = 57 | 58 | 80 | 'custom';
export type FontSizeOption = 'small' | 'normal' | 'large' | 'xlarge';
export type AlignmentOption = 'left' | 'center' | 'right';
export type FontWeightOption = 'normal' | 'bold';
export type LabelTypeOption = 'text_only' | 'name_number' | 'custom';
export type HeightModeOption = 'auto' | 'fixed' | 'auto_fit';
export type ImageLayoutOption = 'text_only' | 'image_only' | 'above' | 'below' | 'left_text' | 'right_text' | 'custom';
export type ImageSizeOption = 'small' | 'medium' | 'large' | 'custom';
export type PrinterConnectionType = 'web_bluetooth' | 'bluetooth_spp_bridge' | 'raw_escpos_file' | 'browser_print';

export interface LabelMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface LabelImageConfig {
  dataUrl: string;
  monochromeDataUrl?: string;
  position: AlignmentOption;
  layout: ImageLayoutOption;
  size: ImageSizeOption;
  customWidthMm: number;
  threshold: number; // 0 - 255
  dithering: boolean;
  invert: boolean;
  gapMm: number;
  widthDots?: number;
  heightDots?: number;
}

export interface LabelConfig {
  text: string;
  labelType: LabelTypeOption;
  customNumberPrefix: string;
  customNumberStart: number;
  customNumberCurrent: number;
  fontSize: FontSizeOption;
  alignment: AlignmentOption;
  fontWeight: FontWeightOption;
  copies: number;
  margins: LabelMargins;
  paperWidthMm: number;
  paperDotsWidth: number;
  heightMode: HeightModeOption;
  fixedHeightMm: number;
  image?: LabelImageConfig;
}

export interface HistoryItem {
  id: string;
  name: string;
  timestamp: number;
  config: LabelConfig;
  isFavorite?: boolean;
  hasImage?: boolean;
}

export interface TemplateItem {
  id: string;
  title: string;
  config: LabelConfig;
  createdAt: number;
}

export interface PrintQueueItem {
  id: string;
  name: string;
  number?: number;
  config: LabelConfig;
  status: 'pending' | 'printing' | 'done' | 'failed';
  error?: string;
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: PrinterConnectionType;
  connected: boolean;
  device?: any; // Web Bluetooth BluetoothDevice
  server?: any; // Web Bluetooth BluetoothRemoteGATTServer
  characteristic?: any; // Web Bluetooth BluetoothRemoteGATTCharacteristic
}

export interface PrinterSettingsConfig {
  connectionType: PrinterConnectionType;
  paperWidthMm: number;
  printDensity: number; // 1 to 5
  printSpeed: number; // 1 to 5
  defaultFontSize: FontSizeOption;
  defaultAlignment: AlignmentOption;
  autoFeedAfterPrint: boolean;
  feedLines: number;
  cutPaper: boolean;
  sppBridgeUrl: string; // Default: ws://localhost:9100 or http://localhost:8080/print
}
