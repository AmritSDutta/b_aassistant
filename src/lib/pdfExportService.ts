import { jsPDF } from 'jspdf';
import { ChatMessage } from '../components/ChatArea';

const PNG_IHDR_MIN_BYTES = 24;
const PNG_WIDTH_BYTE_OFFSET = 16;
const PNG_HEIGHT_BYTE_OFFSET = 20;

export function readPngDimensions(dataUrl: string): { width: number; height: number } | null {
  try {
    if (!dataUrl) return null;
    const commaIndex = dataUrl.indexOf(',');
    const base64 = commaIndex >= 0 ? dataUrl.slice(commaIndex + 1) : dataUrl;
    if (!base64) return null;

    const binary = atob(base64.slice(0, 64));
    if (binary.length < PNG_IHDR_MIN_BYTES) return null;

    const bytes = new Uint8Array(PNG_IHDR_MIN_BYTES);
    for (let i = 0; i < PNG_IHDR_MIN_BYTES; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
      return null;
    }

    const view = new DataView(bytes.buffer);
    const isIhdr =
      bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52;
    if (!isIhdr) return null;

    const width = view.getUint32(PNG_WIDTH_BYTE_OFFSET, false);
    const height = view.getUint32(PNG_HEIGHT_BYTE_OFFSET, false);
    if (!width || !height) return null;

    return { width, height };
  } catch {
    return null;
  }
}

export function fitContain(
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  if (!(imgWidth > 0) || !(imgHeight > 0) || !(maxWidth > 0) || !(maxHeight > 0)) {
    return { width: maxWidth, height: (maxWidth * 9) / 16 };
  }
  const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
  return { width: imgWidth * scale, height: imgHeight * scale };
}

export function exportSessionPdf(
  canvasDataUrl: string | null,
  messages: ChatMessage[],
  docName?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let currentY = margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('bAssistant Research & Architecture Session', margin, currentY);
  currentY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const dateStr = new Date().toLocaleString();
  const subTitle = docName ? `Document: ${docName} | Generated: ${dateStr}` : `Generated: ${dateStr}`;
  doc.text(subTitle, margin, currentY);
  currentY += 8;

  // Section 1: HTML Canvas Snapshot
  if (canvasDataUrl) {
    const dims = readPngDimensions(canvasDataUrl) || { width: 1200, height: 600 };
    const fitted = fitContain(dims.width, dims.height, contentWidth, 85);

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, currentY, contentWidth, fitted.height + 4, 3, 3, 'FD');

    try {
      doc.addImage(
        canvasDataUrl,
        'PNG',
        margin + (contentWidth - fitted.width) / 2,
        currentY + 2,
        fitted.width,
        fitted.height
      );
    } catch (e) {
      console.warn('Could not render image to PDF:', e);
    }

    currentY += fitted.height + 12;
  }

  // Section 2: Dialogue Stream
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('Dialogue Transcript', margin, currentY);
  currentY += 6;

  const ensureSpace = (needed: number) => {
    if (currentY + needed > pageHeight - margin) {
      doc.addPage();
      currentY = margin;
    }
  };

  if (messages.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text('No dialogue messages recorded for this session.', margin, currentY);
    currentY += 10;
  } else {
    for (const msg of messages) {
      const isUser = msg.sender === 'user';
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const senderBadge = isUser ? `USER [${timeStr}]` : `ASSISTANT [${timeStr}]`;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      if (isUser) {
        doc.setTextColor(2, 132, 199); // sky-600
      } else {
        doc.setTextColor(5, 150, 105); // emerald-600
      }

      ensureSpace(12);
      doc.text(senderBadge, margin, currentY);
      currentY += 4.5;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59); // slate-800

      const lines = doc.splitTextToSize(msg.text, contentWidth - 4);
      for (const line of lines) {
        ensureSpace(5);
        doc.text(line, margin + 2, currentY);
        currentY += 4.5;
      }
      currentY += 4;
    }
  }

  // Trigger browser download
  const filename = `bAssistant-Session-${Date.now()}.pdf`;
  doc.save(filename);
}
