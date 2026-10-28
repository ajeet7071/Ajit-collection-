/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaymentRecord, Agency, Invoice } from '../types';

export type BluetoothPrintMode =
  | 'ascii_escpos'     // Direct 7-Bit ASCII Code + ESC/POS Control Codes (ESC @, ESC a, ESC E, GS !, LF)
  | 'auto_smart'       // Tries connected Web Bluetooth first; if not connected on Android, uses RawBT ESC/POS Base64 or prompts Web Bluetooth
  | 'web_bluetooth'    // Direct Web Bluetooth GATT (ESC/POS ASCII / Raster commands)
  | 'rawbt_escpos'     // RawBT instant ESC/POS base64 command (rawbt:base64,...)
  | 'bt_print_scheme'  // Mate Bluetooth Print app (my.bluetoothprint.scheme://)
  | 'custom_scheme';   // Custom URL / Intent scheme template from user's app link

export type PaperWidthMm = 58 | 80;

export interface BluetoothPrinterConfig {
  mode: BluetoothPrintMode;
  paperWidth: PaperWidthMm;
  useAsciiCode: boolean;      // Sends pure 7-bit ASCII character codes + ESC/POS control codes (Print ASCII Code mode)
  useRasterForHindi: boolean; // Converts Hindi receipt to crisp 1-bit monochrome ESC/POS raster bitmap (GS v 0)
  autoPrintOnPayment: boolean; // Automatically trigger Bluetooth print as soon as payment is saved
  autoCutPaper: boolean;
  feedLinesAfterPrint: number;
  lastConnectedDeviceName?: string;
  lastConnectedDeviceId?: string;
  customSchemeTemplate?: string; // e.g. "rawbt:base64,{base64}" or "my.bluetoothprint.scheme://{json}" or custom app link
}

const STORAGE_KEY_BT_CONFIG = 'ajeet_bt_printer_config_v1';

const DEFAULT_BT_CONFIG: BluetoothPrinterConfig = {
  mode: 'ascii_escpos',
  paperWidth: 58,
  useAsciiCode: true,
  useRasterForHindi: false,
  autoPrintOnPayment: true,
  autoCutPaper: true,
  feedLinesAfterPrint: 3,
  lastConnectedDeviceName: '',
  lastConnectedDeviceId: '',
  customSchemeTemplate: 'rawbt:base64,{base64}',
};

// Standard BLE & Dual-Mode POS Thermal Printer Service UUIDs
const KNOWN_PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard BLE POS Printer
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Goojprt / MTP-II / MTP-3 / ISSC BLE Printer
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip / HM-10 / ISSC Transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Common Chinese POS Thermal Printer
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / JDY Serial BLE
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / JieLi BLE Printer
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
  '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
];

class BluetoothPrinterManager {
  private activeDevice: any = null;
  private writeCharacteristic: any = null;
  private isConnecting = false;
  private listeners: Array<() => void> = [];

  public getConfig(): BluetoothPrinterConfig {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BT_CONFIG);
      if (!raw) return { ...DEFAULT_BT_CONFIG };
      return { ...DEFAULT_BT_CONFIG, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_BT_CONFIG };
    }
  }

  public saveConfig(partial: Partial<BluetoothPrinterConfig>): BluetoothPrinterConfig {
    const updated = { ...this.getConfig(), ...partial };
    try {
      localStorage.setItem(STORAGE_KEY_BT_CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save BT printer config:', e);
    }
    this.notifyListeners();
    return updated;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // ignore listener errors
      }
    });
  }

  public isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public isConnected(): boolean {
    return Boolean(
      this.activeDevice &&
      this.activeDevice.gatt &&
      this.activeDevice.gatt.connected &&
      this.writeCharacteristic
    );
  }

  public getConnectedDeviceName(): string {
    if (this.isConnected() && this.activeDevice?.name) {
      return this.activeDevice.name;
    }
    return this.getConfig().lastConnectedDeviceName || '';
  }

  /**
   * Attempts silent auto-reconnect to a previously permitted Web Bluetooth printer
   * using navigator.bluetooth.getDevices() if supported by the browser.
   */
  public async trySilentReconnect(): Promise<boolean> {
    if (this.isConnected()) return true;
    if (!this.isWebBluetoothSupported()) return false;

    const bt = (navigator as any).bluetooth;
    if (typeof bt.getDevices !== 'function') return false;

    try {
      const devices: any[] = await bt.getDevices();
      if (!devices || devices.length === 0) return false;

      const cfg = this.getConfig();
      const preferred =
        devices.find((d) => cfg.lastConnectedDeviceId && d.id === cfg.lastConnectedDeviceId) ||
        devices.find((d) => cfg.lastConnectedDeviceName && d.name === cfg.lastConnectedDeviceName) ||
        devices[0];

      if (!preferred) return false;
      return await this.connectToDeviceObject(preferred);
    } catch {
      return false;
    }
  }

  /**
   * Opens Web Bluetooth pairing chooser and connects to the thermal printer's GATT write characteristic.
   */
  public async requestAndConnectPrinter(): Promise<{
    success: boolean;
    deviceName?: string;
    error?: string;
  }> {
    if (!this.isWebBluetoothSupported()) {
      return {
        success: false,
        error:
          'इस ब्राउज़र में डायरेक्ट Web Bluetooth उपलब्ध नहीं है। कृपया Chrome (Android) का उपयोग करें या नीचे "RawBT Direct ESC/POS" मोड चुनें।',
      };
    }

    if (this.isConnecting) {
      return { success: false, error: 'प्रिंटर से कनेक्ट किया जा रहा है, कृपया प्रतीक्षा करें...' };
    }

    this.isConnecting = true;
    this.notifyListeners();

    try {
      const bt = (navigator as any).bluetooth;
      const device = await bt.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_PRINTER_SERVICE_UUIDS,
      });

      const ok = await this.connectToDeviceObject(device);
      if (!ok) {
        return {
          success: false,
          error:
            'प्रिंटर मिला लेकिन प्रिंटिंग चैनल (GATT Write Characteristic) नहीं खुला। कृपया प्रिंटर को ऑन रखें या RawBT Direct मोड चुनें।',
        };
      }

      const name = device.name || 'Bluetooth POS Printer';
      this.saveConfig({
        lastConnectedDeviceName: name,
        lastConnectedDeviceId: device.id || '',
      });

      return { success: true, deviceName: name };
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('User cancelled') || err?.name === 'NotFoundError') {
        return { success: false, error: 'ब्लूटूथ प्रिंटर चयन रद्द कर दिया गया।' };
      }
      return {
        success: false,
        error: `ब्लूटूथ कनेक्शन त्रुटि: ${msg || 'प्रिंटर कनेक्ट नहीं हो सका'}`,
      };
    } finally {
      this.isConnecting = false;
      this.notifyListeners();
    }
  }

  private async connectToDeviceObject(device: any): Promise<boolean> {
    try {
      if (!device.gatt) return false;

      device.addEventListener('gattserverdisconnected', () => {
        this.writeCharacteristic = null;
        this.notifyListeners();
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();

      let foundChar: any = null;

      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties?.writeWithoutResponse || char.properties?.write) {
              foundChar = char;
              if (char.properties?.writeWithoutResponse) break;
            }
          }
          if (foundChar) break;
        } catch {
          // continue checking next service
        }
      }

      if (!foundChar) return false;

      this.activeDevice = device;
      this.writeCharacteristic = foundChar;
      this.notifyListeners();
      return true;
    } catch (e) {
      console.warn('connectToDeviceObject failed:', e);
      return false;
    }
  }

  public disconnectPrinter(): void {
    try {
      if (this.activeDevice?.gatt?.connected) {
        this.activeDevice.gatt.disconnect();
      }
    } catch {
      // ignore
    }
    this.activeDevice = null;
    this.writeCharacteristic = null;
    this.notifyListeners();
  }

  /**
   * Sends raw ESC/POS bytes to the connected Web Bluetooth printer in safe MTU chunks.
   */
  public async sendRawBytesToConnectedPrinter(bytes: Uint8Array): Promise<boolean> {
    if (!this.isConnected()) {
      const reconnected = await this.trySilentReconnect();
      if (!reconnected) return false;
    }

    const char = this.writeCharacteristic;
    if (!char) return false;

    // 128-byte chunk size is universally safe for BLE thermal printers without buffer overflow
    const CHUNK_SIZE = 128;
    const canWriteNoResp = Boolean(char.properties?.writeWithoutResponse);

    try {
      for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
        const slice = bytes.slice(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
        if (canWriteNoResp && typeof char.writeValueWithoutResponse === 'function') {
          await char.writeValueWithoutResponse(slice);
        } else if (typeof char.writeValue === 'function') {
          await char.writeValue(slice);
        } else {
          await char.writeValueWithResponse(slice);
        }
        // Small 12ms delay between chunks prevents thermal printer buffer overrun during raster graphics
        await new Promise((r) => setTimeout(r, 12));
      }
      return true;
    } catch (err) {
      console.error('Error writing ESC/POS bytes to Bluetooth printer:', err);
      return false;
    }
  }
}

export const btPrinterManager = new BluetoothPrinterManager();

/**
 * Converts a Uint8Array of ESC/POS bytes into a Base64 string for RawBT / Intent URLs
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Renders structured lines onto an offscreen high-contrast monochrome canvas
 * and encodes it as an ESC/POS Raster Bit Image command (`GS v 0` -> `1D 76 30 00`).
 * This allows 100% accurate Hindi (Devanagari) & ₹ symbol printing on ANY Bluetooth POS printer!
 */
export function buildEscPosRasterFromLines(
  lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    box?: boolean;
    divider?: 'dashed' | 'solid' | 'double';
  }>,
  config: BluetoothPrinterConfig
): Uint8Array {
  const widthDots = config.paperWidth === 80 ? 576 : 384; // 58mm = 384 dots (48 bytes/row), 80mm = 576 dots (72 bytes/row)
  const paddingX = 10;

  // Measure height first
  const lineHeights: number[] = [];
  for (const item of lines) {
    if (item.divider) {
      lineHeights.push(14);
      continue;
    }
    const fontSize =
      item.size === 'xl' ? 30 : item.size === 'lg' ? 24 : item.size === 'sm' ? 17 : 20;
    lineHeights.push(item.box ? fontSize + 20 : fontSize + 9);
  }

  const totalHeight = Math.max(80, lineHeights.reduce((a, b) => a + b, 24));

  const canvas = document.createElement('canvas');
  canvas.width = widthDots;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return buildEscPosTextBytes(lines.map((l) => l.text).join('\n'), config);
  }

  // Crisp white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, widthDots, totalHeight);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  let y = 10;
  for (let i = 0; i < lines.length; i++) {
    const item = lines[i];
    const rowH = lineHeights[i];

    if (item.divider === 'solid' || item.divider === 'double') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(paddingX, y + 5, widthDots - paddingX * 2, item.divider === 'double' ? 3 : 2);
      y += rowH;
      continue;
    }

    if (item.divider === 'dashed') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingX, y + 6);
      ctx.lineTo(widthDots - paddingX, y + 6);
      ctx.stroke();
      ctx.setLineDash([]);
      y += rowH;
      continue;
    }

    const fontSize =
      item.size === 'xl' ? 30 : item.size === 'lg' ? 24 : item.size === 'sm' ? 17 : 20;
    const weight = item.bold ? '800' : '600';
    ctx.font = `${weight} ${fontSize}px "Noto Sans Devanagari", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;

    if (item.box) {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(paddingX, y + 2, widthDots - paddingX * 2, rowH - 4);
    }

    ctx.fillStyle = '#000000';
    const textY = item.box ? y + 9 : y + 2;

    if (item.align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(item.text, widthDots / 2, textY, widthDots - paddingX * 2 - 8);
    } else if (item.align === 'right') {
      ctx.textAlign = 'right';
      ctx.fillText(item.text, widthDots - paddingX - 4, textY, widthDots - paddingX * 2 - 8);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(item.text, paddingX + 4, textY, widthDots - paddingX * 2 - 8);
    }

    y += rowH;
  }

  // Convert Canvas RGBA pixels into 1-bit monochrome ESC/POS GS v 0 raster command
  const imgData = ctx.getImageData(0, 0, widthDots, totalHeight).data;
  const bytesPerRow = widthDots / 8;
  const rasterData = new Uint8Array(bytesPerRow * totalHeight);

  for (let row = 0; row < totalHeight; row++) {
    for (let colByte = 0; colByte < bytesPerRow; colByte++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = colByte * 8 + bit;
        const idx = (row * widthDots + x) * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < 165) {
          byteVal |= 1 << (7 - bit);
        }
      }
      rasterData[row * bytesPerRow + colByte] = byteVal;
    }
  }

  // Build ESC/POS packet:
  // ESC @ (1B 40) = Initialize printer
  // GS v 0 0 xL xH yL yH [d1...dk]
  // ESC d n (1B 64 n) = Feed n lines
  // GS V 66 0 (1D 56 42 00) = Partial cut (if enabled)
  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = totalHeight & 0xff;
  const yH = (totalHeight >> 8) & 0xff;

  const header = [0x1b, 0x40, 0x1b, 0x61, 0x01, 0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
  const footer: number[] = [0x1b, 0x64, Math.max(1, config.feedLinesAfterPrint || 3)];
  if (config.autoCutPaper) {
    footer.push(0x1d, 0x56, 0x42, 0x00);
  }

  const output = new Uint8Array(header.length + rasterData.length + footer.length);
  output.set(header, 0);
  output.set(rasterData, header.length);
  output.set(footer, header.length + rasterData.length);
  return output;
}

export interface AsciiPrintLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleHeight?: boolean;
  doubleWidth?: boolean;
}

const HINDI_PHRASE_MAP: Array<[RegExp, string]> = [
  [/₹/g, 'Rs.'],
  [/अजीत न्यूजपेपर एजेंसी/g, 'Ajeet Newspaper Agency'],
  [/अजीत न्यूज एजेंसी/g, 'Ajeet News Agency'],
  [/अजीत कलेक्शन/g, 'Ajit Collection'],
  [/भुगतान रसीद/g, 'PAYMENT RECEIPT'],
  [/मासिक बिल/g, 'MONTHLY BILL'],
  [/दैनिक भास्कर/g, 'Dainik Bhaskar'],
  [/राजस्थान पत्रिका/g, 'Rajasthan Patrika'],
  [/नवभारत टाइम्स/g, 'Navbharat Times'],
  [/हिन्दुस्तान टाइम्स/g, 'Hindustan Times'],
  [/हिन्दुस्तान/g, 'Hindustan'],
  [/अमर उजाला/g, 'Amar Ujala'],
  [/दैनिक जागरण/g, 'Dainik Jagran'],
  [/पंजाब केसरी/g, 'Punjab Kesari'],
  [/इकनॉमिक टाइम्स/g, 'Economic Times'],
  [/टाइम्स ऑफ इंडिया/g, 'Times of India'],
  [/नकद/g, 'CASH'],
  [/डिजिटल/g, 'ONLINE'],
  [/बैंक ट्रांसफर/g, 'BANK TRANSFER'],
  [/प्राप्त राशि/g, 'Received Amt'],
  [/कुल देय राशि/g, 'Total Payable'],
  [/कुल देय/g, 'Total Due'],
  [/चालू माह बिल/g, 'Current Bill'],
  [/पिछला बकाया/g, 'Prev Balance'],
  [/शेष बकाया/g, 'Balance Due'],
  [/जमा राशि/g, 'Amount Paid'],
  [/छूट\/समायोजन/g, 'Discount/Adj'],
  [/वसूलीकर्ता/g, 'Collector'],
  [/ग्राहक/g, 'Customer'],
  [/मोबाइल/g, 'Mobile'],
  [/दिनांक/g, 'Date'],
  [/रसीद सं\./g, 'Receipt No'],
  [/बिल सं\./g, 'Bill No'],
  [/हस्ताक्षर/g, 'Signature'],
  [/धन्यवाद! आपका दिन शुभ हो!/g, 'Thank You! Have a nice day!'],
  [/धन्यवाद/g, 'Thank You'],
  [/टेस्ट ग्राहक/g, 'Test Customer'],
  [/स्थानीय/g, 'Local'],
];

const DEVANAGARI_CHAR_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n',
  'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
  'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
  'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh',
  'ष': 'sh', 'स': 's', 'ह': 'h', 'क्ष': 'ksh', 'त्र': 'tr', 'ज्ञ': 'gya',
  'ड़': 'd', 'ढ़': 'rh', 'फ़': 'f', 'ज़': 'z', 'क़': 'q',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
  'ं': 'n', 'ँ': 'n', 'ः': 'h', '्': '', '़': '', 'ऽ': '',
  '।': '.', '॥': '.',
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

/**
 * Converts any Unicode / Hindi (Devanagari) string into pure 7-bit printable ASCII (0x20 - 0x7E)
 * so that standard ASCII ESC/POS Bluetooth thermal printers print 100% clean text without '?' or garbled bytes.
 */
export function toAsciiPrintable(input: string): string {
  if (!input) return '';
  let str = String(input);

  for (const [pattern, replacement] of HINDI_PHRASE_MAP) {
    str = str.replace(pattern, replacement);
  }

  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = ch.charCodeAt(0);

    if (ch === '\n' || ch === '\r') {
      out += ch;
      continue;
    }

    if (code >= 0x20 && code <= 0x7e) {
      out += ch;
      continue;
    }

    if (DEVANAGARI_CHAR_MAP[ch] !== undefined) {
      const mapped = DEVANAGARI_CHAR_MAP[ch];
      const nextCh = str[i + 1] || '';
      const isConsonant = code >= 0x0915 && code <= 0x0939;
      const nextIsMatraOrVirama =
        (nextCh.charCodeAt(0) >= 0x093e && nextCh.charCodeAt(0) <= 0x094d) ||
        nextCh === '़';
      const nextIsSpaceOrEnd = !nextCh || nextCh === ' ' || nextCh === '\n' || nextCh === ')' || nextCh === ',';

      if (isConsonant && !nextIsMatraOrVirama && !nextIsSpaceOrEnd) {
        out += mapped + 'a';
      } else {
        out += mapped;
      }
      continue;
    }

    // Replace fancy punctuation with ASCII equivalents
    if (ch === '–' || ch === '—' || ch === '•' || ch === '·') {
      out += '-';
    }
  }

  return out.replace(/\s+/g, (m) => (m.includes('\n') ? '\n' : ' '));
}

/**
 * Formats a two-column left/right ASCII row padded to exact column width (32 cols for 58mm, 48 cols for 80mm)
 */
export function formatAsciiRow(left: string, right: string, totalCols = 32): string {
  const cleanLeft = toAsciiPrintable(left).trim();
  const cleanRight = toAsciiPrintable(right).trim();
  const maxLeft = Math.max(4, totalCols - cleanRight.length - 1);
  const clippedLeft = cleanLeft.length > maxLeft ? cleanLeft.slice(0, maxLeft) : cleanLeft;
  const spaces = Math.max(1, totalCols - clippedLeft.length - cleanRight.length);
  return `${clippedLeft}${' '.repeat(spaces)}${cleanRight}`;
}

/**
 * Encodes structured ASCII lines with authentic ESC/POS ASCII Control Codes:
 * - ESC @ (0x1B 0x40)      : Initialize printer
 * - ESC t 0 (0x1B 0x74 0x00): Select PC437 USA Standard ASCII character code table
 * - ESC a n (0x1B 0x61 n)  : Alignment (0 = Left, 1 = Center, 2 = Right)
 * - ESC E n (0x1B 0x45 n)  : Bold ON (1) / OFF (0)
 * - GS ! n  (0x1D 0x21 n)  : Character size (0x00 = Normal, 0x01 = Double Height, 0x11 = Double Width & Height)
 * - LF      (0x0A)         : Line feed
 * - ESC d n (0x1B 0x64 n)  : Feed n lines
 * - GS V    (0x1D 0x56 42 00): Paper cut
 */
export function buildEscPosAsciiCodeBytes(
  lines: AsciiPrintLine[],
  config: BluetoothPrinterConfig
): Uint8Array {
  const bytes: number[] = [
    0x1b, 0x40,       // ESC @ : Initialize printer
    0x1b, 0x74, 0x00, // ESC t 0 : Standard ASCII code table (PC437)
  ];

  for (const line of lines) {
    // Alignment: ESC a n
    const alignCode = line.align === 'center' ? 0x01 : line.align === 'right' ? 0x02 : 0x00;
    bytes.push(0x1b, 0x61, alignCode);

    // Bold: ESC E n
    bytes.push(0x1b, 0x45, line.bold ? 0x01 : 0x00);

    // Font Size: GS ! n
    let sizeCode = 0x00;
    if (line.doubleHeight && line.doubleWidth) {
      sizeCode = 0x11;
    } else if (line.doubleHeight) {
      sizeCode = 0x01;
    } else if (line.doubleWidth) {
      sizeCode = 0x10;
    }
    bytes.push(0x1d, 0x21, sizeCode);

    // Pure 7-bit ASCII character codes (0x20..0x7E)
    const asciiText = toAsciiPrintable(line.text);
    for (let i = 0; i < asciiText.length; i++) {
      const code = asciiText.charCodeAt(i);
      if (code === 0x0a || code === 0x0d) {
        bytes.push(code);
      } else if (code >= 0x20 && code <= 0x7e) {
        bytes.push(code);
      } else {
        bytes.push(0x20);
      }
    }

    // Reset size & bold at end of line and emit LF (0x0A)
    if (sizeCode !== 0x00) {
      bytes.push(0x1d, 0x21, 0x00);
    }
    if (line.bold) {
      bytes.push(0x1b, 0x45, 0x00);
    }
    bytes.push(0x0a); // LF
  }

  // Reset alignment to left
  bytes.push(0x1b, 0x61, 0x00);

  // Feed n lines: ESC d n
  bytes.push(0x1b, 0x64, Math.max(2, config.feedLinesAfterPrint || 3));

  // Auto Cut Paper: GS V 66 0
  if (config.autoCutPaper) {
    bytes.push(0x1d, 0x56, 0x42, 0x00);
  }

  return new Uint8Array(bytes);
}

/**
 * Encodes plain text as strict 7-bit ASCII with standard ESC/POS initialization, feed, and cut commands.
 */
export function buildEscPosTextBytes(plainText: string, config: BluetoothPrinterConfig): Uint8Array {
  const asciiText = toAsciiPrintable(plainText);
  const textBytes: number[] = [];
  for (let i = 0; i < asciiText.length; i++) {
    const code = asciiText.charCodeAt(i);
    if (code === 0x0a || code === 0x0d || (code >= 0x20 && code <= 0x7e)) {
      textBytes.push(code);
    }
  }
  textBytes.push(0x0a);

  const header = [0x1b, 0x40, 0x1b, 0x74, 0x00]; // ESC @ initialize + ESC t 0 ASCII table
  const footer: number[] = [0x1b, 0x64, Math.max(2, config.feedLinesAfterPrint || 3)];
  if (config.autoCutPaper) {
    footer.push(0x1d, 0x56, 0x42, 0x00);
  }

  const out = new Uint8Array(header.length + textBytes.length + footer.length);
  out.set(header, 0);
  out.set(textBytes, header.length);
  out.set(footer, header.length + textBytes.length);
  return out;
}

/**
 * Builds structured 7-bit ASCII lines for a Payment Receipt with ESC/POS ASCII formatting
 */
export function buildPaymentReceiptAsciiLines(
  payment: PaymentRecord,
  agency: Agency,
  config?: BluetoothPrinterConfig
): AsciiPrintLine[] {
  const cols = (config?.paperWidth || 58) === 80 ? 48 : 32;
  const eqLine = '='.repeat(cols);
  const dashLine = '-'.repeat(cols);

  const agencyTitle = toAsciiPrintable(agency.name || agency.nameHi || 'AJIT COLLECTION').toUpperCase();
  const addressLine = toAsciiPrintable(
    [agency.address, agency.city, agency.pincode].filter(Boolean).join(', ')
  );
  const methodLabel =
    payment.paymentMethod === 'cash'
      ? 'CASH'
      : payment.paymentMethod === 'upi'
      ? 'UPI ONLINE'
      : 'BANK/ONLINE';

  const lines: AsciiPrintLine[] = [
    { text: agencyTitle, align: 'center', bold: true, doubleHeight: true },
    { text: addressLine || 'Main Market Road', align: 'center' },
    { text: `Mob: +91 ${toAsciiPrintable(agency.mobile)}`, align: 'center', bold: true },
    { text: eqLine, align: 'center', bold: true },
    { text: 'PAYMENT RECEIPT (ASCII)', align: 'center', bold: true },
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Receipt No:', payment.receiptNumber, cols), align: 'left', bold: true },
    { text: formatAsciiRow('Date:', payment.paymentDate, cols), align: 'left' },
  ];

  if (payment.transactionRef) {
    lines.push({
      text: formatAsciiRow('Ref/UTR:', payment.transactionRef, cols),
      align: 'left',
    });
  }

  lines.push(
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Customer:', toAsciiPrintable(payment.customerName), cols), align: 'left', bold: true },
    { text: formatAsciiRow('Mobile:', `+91 ${payment.customerMobile}`, cols), align: 'left' },
    { text: eqLine, align: 'center' },
    { text: 'AMOUNT RECEIVED', align: 'center', bold: true },
    { text: `Rs. ${payment.amount}.00`, align: 'center', bold: true, doubleHeight: true, doubleWidth: true },
    { text: `Mode: ${methodLabel}`, align: 'center', bold: true },
    { text: eqLine, align: 'center' }
  );

  if (payment.notes) {
    lines.push({
      text: `Note: ${toAsciiPrintable(payment.notes).slice(0, cols - 6)}`,
      align: 'left',
    });
  }

  lines.push(
    { text: formatAsciiRow('Collector:', toAsciiPrintable(payment.collectedByAgentName), cols), align: 'left' },
    { text: formatAsciiRow('Sign:', '..............', cols), align: 'left' },
    { text: dashLine, align: 'center' },
    { text: 'Thank You! Have a nice day!', align: 'center', bold: true },
    { text: 'Ajit Collection Digital Receipt', align: 'center' },
    { text: eqLine, align: 'center', bold: true }
  );

  return lines;
}

/**
 * Builds structured 7-bit ASCII lines for a Customer Monthly Bill with ESC/POS ASCII formatting
 */
export function buildCustomerBillAsciiLines(
  invoice: Invoice,
  agency: Agency,
  config?: BluetoothPrinterConfig
): AsciiPrintLine[] {
  const cols = (config?.paperWidth || 58) === 80 ? 48 : 32;
  const eqLine = '='.repeat(cols);
  const dashLine = '-'.repeat(cols);

  const upiPayable = Math.max(
    0,
    invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable
  );
  const upiId = toAsciiPrintable(agency.upiId || 'ajeet9660527071@upi');
  const agencyTitle = toAsciiPrintable(agency.name || agency.nameHi || 'AJIT COLLECTION').toUpperCase();
  const addressLine = toAsciiPrintable(
    [agency.address, agency.city].filter(Boolean).join(', ')
  );

  const lines: AsciiPrintLine[] = [
    { text: agencyTitle, align: 'center', bold: true, doubleHeight: true },
    { text: addressLine || 'Main Market Road', align: 'center' },
    { text: `Mob: +91 ${toAsciiPrintable(agency.mobile)}`, align: 'center', bold: true },
    { text: eqLine, align: 'center', bold: true },
    { text: 'MONTHLY NEWSPAPER BILL', align: 'center', bold: true },
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Bill No:', invoice.invoiceNumber, cols), align: 'left', bold: true },
    { text: formatAsciiRow('Bill Month:', invoice.billingMonth, cols), align: 'left' },
    { text: formatAsciiRow('Due Date:', invoice.dueDate, cols), align: 'left', bold: true },
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Customer:', toAsciiPrintable(invoice.customerName), cols), align: 'left', bold: true },
    { text: formatAsciiRow('Mobile:', `+91 ${invoice.customerMobile}`, cols), align: 'left' },
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Newspaper (Days)', 'Amount', cols), align: 'left', bold: true },
    { text: dashLine, align: 'center' },
  ];

  for (const item of invoice.items) {
    const paperName = toAsciiPrintable(item.newspaperName);
    lines.push({
      text: formatAsciiRow(
        `${paperName} (${item.daysBilled}d x ${item.ratePerDay})`,
        `Rs.${item.amount}`,
        cols
      ),
      align: 'left',
    });
  }

  lines.push(
    { text: dashLine, align: 'center' },
    { text: formatAsciiRow('Current Bill:', `Rs.${invoice.subtotal}.00`, cols), align: 'left' },
    { text: formatAsciiRow('Prev Balance:', `Rs.${invoice.previousBalance}.00`, cols), align: 'left' }
  );

  if (invoice.adjustments !== 0) {
    lines.push({
      text: formatAsciiRow('Discount/Adj:', `-Rs.${Math.abs(invoice.adjustments)}.00`, cols),
      align: 'left',
    });
  }

  lines.push(
    { text: eqLine, align: 'center' },
    { text: 'TOTAL PAYABLE', align: 'center', bold: true },
    { text: `Rs. ${upiPayable}.00`, align: 'center', bold: true, doubleHeight: true, doubleWidth: true },
    { text: `UPI ID: ${upiId}`, align: 'center', bold: true },
    { text: eqLine, align: 'center' },
    { text: 'Thank You! Ajit Collection', align: 'center', bold: true }
  );

  return lines;
}

/**
 * Formats AsciiPrintLine[] into a clean 32/48-column plain ASCII string (and optional ESC/POS control tag view)
 */
export function formatAsciiLinesToPlainText(
  lines: AsciiPrintLine[],
  config?: BluetoothPrinterConfig,
  includeEscPosTags = false
): string {
  const cols = (config?.paperWidth || 58) === 80 ? 48 : 32;
  const out: string[] = [];

  if (includeEscPosTags) {
    out.push('<ESC @ [0x1B 0x40] INIT><ESC t 0 [0x1B 0x74 0x00] ASCII_PC437>');
  }

  for (const l of lines) {
    const txt = toAsciiPrintable(l.text);
    let formatted = txt;
    if (l.align === 'center' && txt.length < cols) {
      const pad = Math.floor((cols - txt.length) / 2);
      formatted = ' '.repeat(Math.max(0, pad)) + txt;
    } else if (l.align === 'right' && txt.length < cols) {
      const pad = cols - txt.length;
      formatted = ' '.repeat(Math.max(0, pad)) + txt;
    }

    if (includeEscPosTags) {
      const tags: string[] = [];
      if (l.align === 'center') tags.push('<ESC a 1>');
      if (l.bold) tags.push('<ESC E 1>');
      if (l.doubleHeight && l.doubleWidth) tags.push('<GS ! 0x11>');
      else if (l.doubleHeight) tags.push('<GS ! 0x01>');
      out.push(`${tags.join('')}${formatted}<LF>`);
    } else {
      out.push(formatted);
    }
  }

  if (includeEscPosTags) {
    out.push(`<ESC d ${config?.feedLinesAfterPrint || 3}><GS V 66 0 [CUT]>`);
  }

  return out.join('\n');
}

/**
 * Builds structured receipt lines for ESC/POS Raster Hindi printing
 */
export function buildPaymentReceiptStructuredLines(payment: PaymentRecord, agency: Agency) {
  const methodLabel =
    payment.paymentMethod === 'cash'
      ? 'नकद (CASH)'
      : payment.paymentMethod === 'upi'
      ? 'UPI डिजिटल (ONLINE)'
      : 'बैंक / ऑनलाइन';

  const lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    box?: boolean;
    divider?: 'dashed' | 'solid' | 'double';
  }> = [
    { text: agency.nameHi || 'अजीत कलेक्शन', align: 'center', bold: true, size: 'lg' },
    { text: agency.name || 'Ajit collection', align: 'center', bold: true, size: 'sm' },
    {
      text: `${agency.address || ''}${agency.city ? `, ${agency.city}` : ''}`,
      align: 'center',
      size: 'sm',
    },
    { text: `Ph: +91 ${agency.mobile}`, align: 'center', bold: true, size: 'sm' },
    { text: '', divider: 'double' },
    { text: 'भुगतान रसीद (PAYMENT RECEIPT)', align: 'center', bold: true, size: 'md' },
    { text: '', divider: 'dashed' },
    { text: `रसीद सं.: ${payment.receiptNumber}`, align: 'left', bold: true, size: 'md' },
    { text: `दिनांक  : ${payment.paymentDate}`, align: 'left', size: 'sm' },
  ];

  if (payment.transactionRef) {
    lines.push({ text: `Ref/UTR : ${payment.transactionRef}`, align: 'left', size: 'sm' });
  }

  lines.push(
    { text: '', divider: 'dashed' },
    { text: `ग्राहक : ${payment.customerName}`, align: 'left', bold: true, size: 'md' },
    { text: `मोबाइल : +91 ${payment.customerMobile}`, align: 'left', size: 'sm' },
    { text: '', divider: 'dashed' },
    {
      text: `प्राप्त राशि: ₹${payment.amount}.00`,
      align: 'center',
      bold: true,
      size: 'xl',
      box: true,
    },
    { text: `माध्यम: ${methodLabel}`, align: 'center', bold: true, size: 'sm' }
  );

  if (payment.notes) {
    lines.push({ text: `विवरण: ${payment.notes}`, align: 'left', size: 'sm' });
  }

  lines.push(
    { text: '', divider: 'dashed' },
    { text: `वसूलीकर्ता: ${payment.collectedByAgentName}`, align: 'left', bold: true, size: 'sm' },
    { text: 'हस्ताक्षर: ........................', align: 'right', size: 'sm' },
    { text: '', divider: 'dashed' },
    { text: 'धन्यवाद! आपका दिन शुभ हो!', align: 'center', bold: true, size: 'sm' },
    { text: 'Ajit Collection App Digital Receipt', align: 'center', size: 'sm' },
    { text: '', divider: 'double' }
  );

  return lines;
}

/**
 * Builds structured customer monthly bill lines for ESC/POS Raster Hindi printing
 */
export function buildCustomerBillStructuredLines(invoice: Invoice, agency: Agency) {
  const upiPayable = Math.max(
    0,
    invoice.remainingBalance > 0 ? invoice.remainingBalance : invoice.totalPayable
  );
  const upiId = agency.upiId || 'ajeet9660527071@upi';

  const lines: Array<{
    text: string;
    align?: 'left' | 'center' | 'right';
    bold?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    box?: boolean;
    divider?: 'dashed' | 'solid' | 'double';
  }> = [
    { text: agency.nameHi || 'अजीत कलेक्शन', align: 'center', bold: true, size: 'lg' },
    { text: agency.name || 'Ajit collection', align: 'center', bold: true, size: 'sm' },
    { text: `Ph: +91 ${agency.mobile}`, align: 'center', bold: true, size: 'sm' },
    { text: '', divider: 'double' },
    { text: 'मासिक बिल (MONTHLY BILL)', align: 'center', bold: true, size: 'md' },
    { text: '', divider: 'dashed' },
    { text: `बिल सं.: ${invoice.invoiceNumber}`, align: 'left', bold: true, size: 'sm' },
    { text: `बिल माह: ${invoice.billingMonth} | देय: ${invoice.dueDate}`, align: 'left', size: 'sm' },
    { text: '', divider: 'dashed' },
    { text: `ग्राहक : ${invoice.customerName}`, align: 'left', bold: true, size: 'md' },
    { text: `मोबाइल : +91 ${invoice.customerMobile}`, align: 'left', size: 'sm' },
    { text: '', divider: 'dashed' },
  ];

  for (const item of invoice.items) {
    lines.push({
      text: `${item.newspaperName} (${item.daysBilled}d x ₹${item.ratePerDay}) = ₹${item.amount}`,
      align: 'left',
      bold: true,
      size: 'sm',
    });
  }

  lines.push(
    { text: '', divider: 'dashed' },
    { text: `चालू माह बिल : ₹${invoice.subtotal}.00`, align: 'left', size: 'sm' },
    { text: `पिछला बकाया  : ₹${invoice.previousBalance}.00`, align: 'left', size: 'sm' }
  );

  if (invoice.adjustments !== 0) {
    lines.push({
      text: `छूट/समायोजन : -₹${Math.abs(invoice.adjustments)}.00`,
      align: 'left',
      size: 'sm',
    });
  }

  lines.push({
    text: `कुल देय: ₹${upiPayable}.00`,
    align: 'center',
    bold: true,
    size: 'xl',
    box: true,
  });

  lines.push(
    { text: `UPI ID: ${upiId}`, align: 'center', bold: true, size: 'sm' },
    { text: '', divider: 'dashed' },
    { text: 'धन्यवाद! अजीत कलेक्शन', align: 'center', bold: true, size: 'sm' },
    { text: '', divider: 'double' }
  );

  return lines;
}

/**
 * Dispatches instant print command via external Android Bluetooth Printer companion apps
 * (RawBT Base64 ESC/POS, Mate Bluetooth Print scheme, or user's custom scheme).
 */
export function dispatchCompanionAppBluetoothPrint(
  escPosBytes: Uint8Array,
  plainText: string,
  config: BluetoothPrinterConfig
): boolean {
  try {
    const base64Data = uint8ArrayToBase64(escPosBytes);

    if (config.mode === 'bt_print_scheme') {
      // Mate Bluetooth Print app JSON array format: my.bluetoothprint.scheme://
      const lines = plainText.split('\n').map((line) => ({
        type: 0,
        content: line,
        bold: line.includes('===') || line.includes('प्राप्त राशि') || line.includes('कुल देय') ? 1 : 0,
        align: line.startsWith('  ') ? 1 : 0,
        format: 0,
      }));
      const jsonStr = encodeURIComponent(JSON.stringify(lines));
      window.location.href = `my.bluetoothprint.scheme://data=${jsonStr}`;
      return true;
    }

    if (config.mode === 'custom_scheme' && config.customSchemeTemplate) {
      const url = config.customSchemeTemplate
        .replace('{base64}', encodeURIComponent(base64Data))
        .replace('{text}', encodeURIComponent(plainText));
      window.location.href = url;
      return true;
    }

    // Default companion mode: RawBT Direct ESC/POS Base64 command
    // Sending rawbt:base64,<escpos> triggers immediate automatic printing on the connected Bluetooth printer
    window.location.href = `rawbt:base64,${base64Data}`;
    return true;
  } catch (e) {
    console.warn('Companion Bluetooth dispatch error:', e);
    return false;
  }
}
