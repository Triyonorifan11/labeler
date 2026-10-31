import type { LabelConfig, LabelImageConfig, AlignmentOption, FontSizeOption, PrinterSettingsConfig } from '@/types/label';

export interface ProcessedImageData {
  monochromeDataUrl: string;
  widthDots: number;
  heightDots: number;
  rasterBytes: Uint8Array;
}

export const escposService = {
  /**
   * Process raw HTMLImageElement into a 1-bit monochrome bitmap for preview & printer raster
   */
  async processImage(
    img: HTMLImageElement,
    targetWidthDots: number,
    threshold: number = 128,
    useDithering: boolean = true,
    invert: boolean = false
  ): Promise<ProcessedImageData> {
    const scale = targetWidthDots / img.width;
    const targetHeightDots = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidthDots;
    canvas.height = targetHeightDots;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidthDots, targetHeightDots);
    ctx.drawImage(img, 0, 0, targetWidthDots, targetHeightDots);

    const imgData = ctx.getImageData(0, 0, targetWidthDots, targetHeightDots);
    const data = imgData.data;

    // Convert to grayscale 2D array for dithering calculation
    const gray: number[][] = [];
    for (let y = 0; y < targetHeightDots; y++) {
      gray[y] = [];
      for (let x = 0; x < targetWidthDots; x++) {
        const idx = (y * targetWidthDots + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // Luminance formula
        gray[y][x] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
    }

    // Apply Floyd-Steinberg dithering or thresholding
    const mono: number[][] = [];
    for (let y = 0; y < targetHeightDots; y++) {
      mono[y] = [];
      for (let x = 0; x < targetWidthDots; x++) {
        const currentVal = gray[y][x];
        let bit = currentVal < threshold ? 0 : 255;
        if (invert) {
          bit = bit === 0 ? 255 : 0;
        }
        mono[y][x] = bit;

        if (useDithering) {
          const err = currentVal - bit;
          if (x + 1 < targetWidthDots) gray[y][x + 1] += Math.round((err * 7) / 16);
          if (y + 1 < targetHeightDots) {
            if (x > 0) gray[y + 1][x - 1] += Math.round((err * 3) / 16);
            gray[y + 1][x] += Math.round((err * 5) / 16);
            if (x + 1 < targetWidthDots) gray[y + 1][x + 1] += Math.round((err * 1) / 16);
          }
        }
      }
    }

    // Write back to canvas ImageData
    for (let y = 0; y < targetHeightDots; y++) {
      for (let x = 0; x < targetWidthDots; x++) {
        const idx = (y * targetWidthDots + x) * 4;
        const val = mono[y][x];
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255; // opaque
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const monochromeDataUrl = canvas.toDataURL('image/png');

    // Build ESC/POS raster byte array (GS v 0 format)
    // Width in bytes must be integer (padded to multiple of 8)
    const widthBytes = Math.ceil(targetWidthDots / 8);
    const rasterBytesList: number[] = [];

    // Header GS v 0 0 xL xH yL yH
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = targetHeightDots & 0xff;
    const yH = (targetHeightDots >> 8) & 0xff;

    rasterBytesList.push(0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH);

    for (let y = 0; y < targetHeightDots; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byteVal = 0;
        for (let bit = 0; bit < 8; bit++) {
          const xPixel = xByte * 8 + bit;
          if (xPixel < targetWidthDots) {
            // In ESC/POS raster, 1 bit = BLACK pixel (thermal element fires)
            const isBlack = mono[y][xPixel] === 0;
            if (isBlack) {
              byteVal |= 0x80 >> bit;
            }
          }
        }
        rasterBytesList.push(byteVal);
      }
    }

    return {
      monochromeDataUrl,
      widthDots: targetWidthDots,
      heightDots: targetHeightDots,
      rasterBytes: new Uint8Array(rasterBytesList),
    };
  },

  /**
   * Helper to map alignment enum to ESC/POS alignment byte
   */
  getAlignmentByte(align: AlignmentOption): number {
    switch (align) {
      case 'center':
        return 1;
      case 'right':
        return 2;
      case 'left':
      default:
        return 0;
    }
  },

  /**
   * Helper to map font size enum to ESC/POS GS ! n command byte
   */
  getFontSizeByte(size: FontSizeOption): number {
    switch (size) {
      case 'small':
        return 0x00; // Font B, 1x1
      case 'normal':
        return 0x00; // Font A, 1x1
      case 'large':
        return 0x11; // Double width & height
      case 'xlarge':
        return 0x22; // Triple width & height
      default:
        return 0x00;
    }
  },

  /**
   * Character cell size in dots for a font size (printer built-in font:
   * Font A = 12x24, Font B = 9x17, scaled by the GS ! multiplier).
   */
  getCellMetrics(size: FontSizeOption): { cellW: number; cellH: number; lineH: number; fontB: boolean } {
    const fontB = size === 'small';
    const mult = size === 'large' ? 2 : size === 'xlarge' ? 3 : 1;
    const cellW = (fontB ? 9 : 12) * mult;
    const cellH = (fontB ? 17 : 24) * mult;
    return { cellW, cellH, lineH: cellH + 6, fontB };
  },

  /**
   * Text exactly as it will be printed (same source for preview and ESC/POS)
   */
  getDisplayText(config: LabelConfig): string {
    if (config.labelType === 'name_number') {
      const prefix = config.customNumberPrefix || '#';
      const num = config.customNumberStart || 1;
      return `${config.text}\n${prefix}${num}`;
    }
    return config.text;
  },

  /**
   * Word-wrap text to the printable width using the printer's real character grid,
   * so the preview and the printed result break lines in the same place.
   */
  layoutText(config: LabelConfig): {
    lines: string[];
    cellW: number;
    cellH: number;
    lineH: number;
    fontB: boolean;
    leftDots: number;
    printableDots: number;
  } {
    const { cellW, cellH, lineH, fontB } = this.getCellMetrics(config.fontSize);
    const leftDots = Math.max(0, Math.round((config.margins.left || 0) * 8));
    const rightDots = Math.max(0, Math.round((config.margins.right || 0) * 8));
    const printableDots = Math.max(cellW, config.paperDotsWidth - leftDots - rightDots);
    const cols = Math.max(1, Math.floor(printableDots / cellW));

    const lines: string[] = [];
    for (const rawLine of this.getDisplayText(config).split('\n')) {
      let current = '';
      for (let word of rawLine.split(' ')) {
        // Hard-split words longer than a full line
        while (word.length > cols) {
          if (current) {
            lines.push(current);
            current = '';
          }
          lines.push(word.slice(0, cols));
          word = word.slice(cols);
        }
        if (!current) {
          current = word;
        } else if (current.length + 1 + word.length <= cols) {
          current += ' ' + word;
        } else {
          lines.push(current);
          current = word;
        }
      }
      lines.push(current);
    }
    return { lines, cellW, cellH, lineH, fontB, leftDots, printableDots };
  },

  /**
   * Build complete ESC/POS Uint8Array for a given label configuration
   */
  async buildLabelEscpos(
    config: LabelConfig,
    processedImg?: ProcessedImageData,
    options: Partial<Pick<PrinterSettingsConfig, 'autoFeedAfterPrint' | 'feedLines' | 'cutPaper'>> = {}
  ): Promise<Uint8Array> {
    const commands: number[] = [];
    const textEncoder = new TextEncoder();

    const append = (bytes: number[]) => {
      commands.push(...bytes);
    };

    const appendString = (str: string) => {
      const encoded = textEncoder.encode(str);
      for (let i = 0; i < encoded.length; i++) {
        commands.push(encoded[i]);
      }
    };

    // 1. Initialize printer (ESC @)
    append([0x1b, 0x40]);

    // 2. Set Code Page to PC850 / Latin-1 for Indonesian & special characters (ESC t 2 or 16)
    append([0x1b, 0x74, 0x02]);

    // Left margin (GS L) and print area width (GS W), in dots
    const leftDots = Math.max(0, Math.round((config.margins.left || 0) * 8));
    const rightDots = Math.max(0, Math.round((config.margins.right || 0) * 8));
    const areaDots = Math.max(8, config.paperDotsWidth - leftDots - rightDots);
    append([0x1d, 0x4c, leftDots & 0xff, (leftDots >> 8) & 0xff]);
    append([0x1d, 0x57, areaDots & 0xff, (areaDots >> 8) & 0xff]);

    // Apply Margins Top
    if (config.margins.top > 0) {
      const feedLines = Math.max(1, Math.round(config.margins.top / 3));
      append([0x1b, 0x64, feedLines]);
    }

    const hasImage = config.image && processedImg && processedImg.rasterBytes;
    const layout = config.image?.layout || 'text_only';

    // Helper to output Image raster
    const outputImage = () => {
      if (!hasImage) return;
      // Set image alignment (ESC a n)
      const imgAlignByte = this.getAlignmentByte(config.image!.position);
      append([0x1b, 0x61, imgAlignByte]);
      // Push raw raster bytes
      for (let i = 0; i < processedImg!.rasterBytes.length; i++) {
        commands.push(processedImg!.rasterBytes[i]);
      }
      // Gap
      if (config.image!.gapMm > 0) {
        const gapLines = Math.max(1, Math.round(config.image!.gapMm / 3));
        append([0x1b, 0x64, gapLines]);
      } else {
        append([0x1b, 0x64, 1]);
      }
    };

    // Helper to output Text
    const outputText = () => {
      if (!this.getDisplayText(config).trim()) return;

      // Set alignment (ESC a n)
      append([0x1b, 0x61, this.getAlignmentByte(config.alignment)]);

      // Set Font Weight / Bold (ESC E n)
      append([0x1b, 0x45, config.fontWeight === 'bold' ? 1 : 0]);

      // Select Font A/B (ESC M n), size (GS ! n) and line spacing (ESC 3 n)
      const layoutInfo = this.layoutText(config);
      append([0x1b, 0x4d, layoutInfo.fontB ? 1 : 0]);
      append([0x1d, 0x21, this.getFontSizeByte(config.fontSize)]);
      append([0x1b, 0x33, Math.min(255, layoutInfo.lineH)]);

      // Print lines (already wrapped to the printable width)
      for (const line of layoutInfo.lines) {
        appendString(line);
        append([0x0a]); // Line feed
      }

      // Reset Bold, Size, Font and line spacing
      append([0x1b, 0x45, 0]);
      append([0x1d, 0x21, 0x00]);
      append([0x1b, 0x4d, 0]);
      append([0x1b, 0x32]);
    };

    // Execute based on layout
    if (layout === 'image_only') {
      outputImage();
    } else if (layout === 'above') {
      outputImage();
      outputText();
    } else if (layout === 'below') {
      outputText();
      outputImage();
    } else {
      // Default / text_only / custom
      if (hasImage && layout !== 'text_only') {
        outputImage();
      }
      outputText();
    }

    // Apply Margins Bottom + extra feed so the content clears the tear bar.
    // Feed is measured in dots (8 dots/mm), ESC J n accepts at most 255 per command.
    const LINE_DOTS = 24;
    let bottomDots = Math.round((config.margins.bottom || 0) * 8);
    if (options.autoFeedAfterPrint ?? true) {
      bottomDots += (options.feedLines ?? 3) * LINE_DOTS;
    }
    bottomDots = Math.max(bottomDots, 2 * LINE_DOTS);
    while (bottomDots > 0) {
      const step = Math.min(bottomDots, 255);
      append([0x1b, 0x4a, step]);
      bottomDots -= step;
    }

    // Paper Cut command (GS V 66 0)
    if (options.cutPaper ?? false) {
      append([0x1d, 0x56, 66, 0]);
    }

    return new Uint8Array(commands);
  },

  /**
   * Generate test print ESC/POS bytes
   */
  async buildTestPrintEscpos(paperWidthMm: number = 58): Promise<Uint8Array> {
    const testConfig: LabelConfig = {
      text: 'TEST PRINT THERMAL LABELER\n----------------------------\nStatus: PRINTER READY\nLebar Kertas: ' + paperWidthMm + ' mm\nFormat: ESC/POS Raster & Text\n----------------------------',
      labelType: 'text_only',
      customNumberPrefix: '#',
      customNumberStart: 1,
      customNumberCurrent: 1,
      fontSize: 'normal',
      alignment: 'center',
      fontWeight: 'bold',
      copies: 1,
      margins: { top: 2, bottom: 4, left: 2, right: 2 },
      paperWidthMm: paperWidthMm,
      paperDotsWidth: paperWidthMm === 80 ? 576 : 384,
      heightMode: 'auto',
      fixedHeightMm: 30,
    };
    return this.buildLabelEscpos(testConfig);
  }
};
