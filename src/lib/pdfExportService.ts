import { jsPDF } from 'jspdf';
import { ChatMessage } from '../components/ChatArea';
import { BASSISTANT_LIGHT_BASE64 } from './logoBase64';
import { SessionTurnRecord } from './idbStorage';

const PNG_IHDR_MIN_BYTES = 24;
const PNG_WIDTH_BYTE_OFFSET = 16;
const PNG_HEIGHT_BYTE_OFFSET = 20;

export interface ExportPdfResult {
  success: boolean;
  error?: string;
}

export interface ExportSessionPdfOptions {
  sessionId?: string;
  turns?: SessionTurnRecord[];
  canvasDataUrl?: string | null;
  messages?: ChatMessage[];
  docName?: string;
  hasCanvasContent?: boolean;
}

export function containsIndicScript(text: string): boolean {
  // \u0900-\u097F: Devanagari (Hindi, Marathi, Sanskrit)
  // \u0980-\u09FF: Bengali / Bangla, Assamese
  return /[\u0900-\u09FF]/.test(text);
}

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

export function stripInlineMarkdown(text: string): string {
  if (!text) return '';
  return text
    // Replace markdown images: ![alt](url) -> [Image: alt]
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, (_m, alt) => (alt ? `[Image: ${alt}]` : '[Image]'))
    // Replace markdown links: [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Replace inline code: `code` -> 'code'
    .replace(/`([^`]+)`/g, "'$1'")
    // Strip bold & italic markers
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    // Replace HTML tags
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    // Replace common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Remove markdown backslash escapes
    .replace(/\\([*_#`~[\]>+-])/g, '$1');
}

export function wrapIndicText(
  text: string,
  fontSizePt: number,
  maxWidthMm: number,
  isBold: boolean = false
): string[] {
  if (typeof document === 'undefined') return [text];
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [text];

    const scale = 3;
    const fontStyle = isBold ? 'bold ' : '';
    ctx.font = `${fontStyle}${fontSizePt * scale}px "Noto Sans Bengali", "Noto Sans Devanagari", "Nirmala UI", "Vrinda", "Mangal", sans-serif`;

    const maxWidthPx = (maxWidthMm / 0.352778) * scale;
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (ctx.measureText(candidate).width <= maxWidthPx) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
    return lines;
  } catch {
    return [text];
  }
}

export function renderIndicTextStrip(
  text: string,
  fontSizePt: number,
  textColorHex: string,
  isBold: boolean = false
): { dataUrl: string; widthMm: number; heightMm: number } | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

  const scale = 3;
  const fontStyle = isBold ? 'bold ' : '';
  const fontStack = `${fontStyle}${fontSizePt * scale}px "Noto Sans Bengali", "Noto Sans Devanagari", "Nirmala UI", "Vrinda", "Mangal", sans-serif`;

  ctx.font = fontStack;
  const metrics = ctx.measureText(text);
  const widthPx = Math.ceil(metrics.width + 8 * scale);
  const heightPx = Math.ceil(fontSizePt * 1.5 * scale);

  canvas.width = widthPx;
  canvas.height = heightPx;

  ctx.font = fontStack;
  ctx.fillStyle = textColorHex;
  ctx.textBaseline = 'top';
  ctx.fillText(text, 2 * scale, 2 * scale);

  const widthMm = (canvas.width / scale) * 0.352778;
  const heightMm = (canvas.height / scale) * 0.352778;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    widthMm,
    heightMm,
  };
  } catch {
    return null;
  }
}

export function drawLineText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  fontSizePt: number,
  textColorHex: string,
  isBold: boolean = false
): number {
  if (containsIndicScript(text)) {
    const strip = renderIndicTextStrip(text, fontSizePt, textColorHex, isBold);
    if (strip) {
      try {
        doc.addImage(strip.dataUrl, 'PNG', x, y - 3.2, strip.widthMm, strip.heightMm);
        return strip.heightMm;
      } catch (e) {
        console.warn('Could not add Indic image strip to PDF:', e);
      }
    }
  }
  doc.text(text, x, y);
  return fontSizePt * 0.45;
}

export interface PdfCursor {
  y: number;
}

export function renderHumanizedMarkdown(
  doc: jsPDF,
  markdownText: string,
  margin: number,
  contentWidth: number,
  startYOrCursor: number | PdfCursor,
  ensureSpace: (needed: number) => void
): number {
  const cursor: PdfCursor =
    typeof startYOrCursor === 'number' ? { y: startYOrCursor } : startYOrCursor;
  const lines = markdownText.split('\n');
  let inCodeBlock = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // 1. Fenced Code Block delimiter
    if (trimmed.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      cursor.y += inCodeBlock ? 1 : 2;
      continue;
    }

    // Inside Fenced Code Block
    if (inCodeBlock) {
      ensureSpace(4.5);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin + 2, cursor.y - 3.2, contentWidth - 4, 4.2, 'F');

      doc.setFont('courier', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // slate-700
      doc.text(rawLine.slice(0, 85), margin + 4, cursor.y);
      cursor.y += 4.2;
      continue;
    }

    // 2. Horizontal Divider
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      ensureSpace(5);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.line(margin + 2, cursor.y, margin + contentWidth - 2, cursor.y);
      cursor.y += 4.5;
      continue;
    }

    // 3. Headings
    if (trimmed.startsWith('# ')) {
      ensureSpace(8);
      const text = stripInlineMarkdown(trimmed.slice(2));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(15, 23, 42); // slate-900
      drawLineText(doc, text, margin + 2, cursor.y, 12.5, '#0f172a', true);
      cursor.y += 6;
      continue;
    }

    if (trimmed.startsWith('## ')) {
      ensureSpace(7);
      const text = stripInlineMarkdown(trimmed.slice(3));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59); // slate-800
      drawLineText(doc, text, margin + 2, cursor.y, 11, '#1e293b', true);
      cursor.y += 5.2;
      continue;
    }

    if (trimmed.startsWith('### ')) {
      ensureSpace(6);
      const text = stripInlineMarkdown(trimmed.slice(4));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85); // slate-700
      drawLineText(doc, text, margin + 2, cursor.y, 10, '#334155', true);
      cursor.y += 4.8;
      continue;
    }

    // 4. Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteText = stripInlineMarkdown(trimmed.slice(2));
      const quoteLines = containsIndicScript(quoteText)
        ? wrapIndicText(quoteText, 9.5, contentWidth - 12, false)
        : doc.splitTextToSize(quoteText, contentWidth - 12);

      for (const qLine of quoteLines) {
        ensureSpace(4.5);
        doc.setDrawColor(203, 213, 225); // slate-300
        doc.setLineWidth(0.8);
        doc.line(margin + 3, cursor.y - 3, margin + 3, cursor.y + 1.2);

        doc.setFont('times', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105); // slate-600
        drawLineText(doc, qLine, margin + 6, cursor.y, 9.5, '#475569', false);
        cursor.y += 4.5;
      }
      continue;
    }

    // 5. Bullet List items (- , * , + )
    const bulletMatch = /^(\s*)[*+-]\s+(.*)$/.exec(rawLine);
    if (bulletMatch) {
      const indent = bulletMatch[1].length > 0 ? 8 : 4;
      const itemText = stripInlineMarkdown(bulletMatch[2]);
      const itemLines = containsIndicScript(itemText)
        ? wrapIndicText(itemText, 10, contentWidth - indent - 4, false)
        : doc.splitTextToSize(itemText, contentWidth - indent - 4);

      ensureSpace(4.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text('\u2022', margin + indent - 1.5, cursor.y);

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      for (let i = 0; i < itemLines.length; i++) {
        if (i > 0) ensureSpace(4.5);
        drawLineText(doc, itemLines[i], margin + indent + 2.5, cursor.y, 10, '#1e293b', false);
        cursor.y += 4.5;
      }
      continue;
    }

    // 6. Numbered List items (1. , 2. )
    const numberedMatch = /^(\s*)(\d+\.)\s+(.*)$/.exec(rawLine);
    if (numberedMatch) {
      const numBadge = numberedMatch[2];
      const itemText = stripInlineMarkdown(numberedMatch[3]);
      const itemLines = containsIndicScript(itemText)
        ? wrapIndicText(itemText, 10, contentWidth - 12, false)
        : doc.splitTextToSize(itemText, contentWidth - 12);

      ensureSpace(4.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(numBadge, margin + 3, cursor.y);

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      for (let i = 0; i < itemLines.length; i++) {
        if (i > 0) ensureSpace(4.5);
        drawLineText(doc, itemLines[i], margin + 9.5, cursor.y, 10, '#1e293b', false);
        cursor.y += 4.5;
      }
      continue;
    }

    // 7. Standard Paragraph Text
    const cleanParagraph = stripInlineMarkdown(rawLine);
    if (!cleanParagraph.trim()) {
      cursor.y += 2;
      continue;
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);

    const paraLines = containsIndicScript(cleanParagraph)
      ? wrapIndicText(cleanParagraph, 10, contentWidth - 4, false)
      : doc.splitTextToSize(cleanParagraph, contentWidth - 4);

    for (const pLine of paraLines) {
      ensureSpace(4.5);
      drawLineText(doc, pLine, margin + 2, cursor.y, 10, '#1e293b', false);
      cursor.y += 4.5;
    }
  }

  return cursor.y;
}

export function exportSessionPdf(
  arg1?: ExportSessionPdfOptions | string | null,
  arg2?: ChatMessage[],
  arg3?: string,
  arg4?: boolean,
  arg5?: SessionTurnRecord[],
  arg6?: string
): ExportPdfResult {
  let sessionId: string | undefined;
  let turns: SessionTurnRecord[] | undefined;
  let canvasDataUrl: string | null = null;
  let messages: ChatMessage[] = [];
  let docName: string | undefined;
  let hasCanvasContent = false;

  if (
    arg1 &&
    typeof arg1 === 'object' &&
    !Array.isArray(arg1) &&
    ('turns' in arg1 || 'sessionId' in arg1 || 'messages' in arg1 || 'canvasDataUrl' in arg1)
  ) {
    const opts = arg1 as ExportSessionPdfOptions;
    sessionId = opts.sessionId;
    turns = opts.turns;
    canvasDataUrl = opts.canvasDataUrl ?? null;
    messages = opts.messages ?? [];
    docName = opts.docName;
    hasCanvasContent = opts.hasCanvasContent ?? Boolean(canvasDataUrl);
  } else {
    canvasDataUrl = (arg1 as string | null) ?? null;
    messages = arg2 ?? [];
    docName = arg3;
    hasCanvasContent = arg4 ?? Boolean(canvasDataUrl);
    turns = arg5;
    sessionId = arg6;
  }

  const hasSequentialTurns =
    Array.isArray(turns) &&
    turns.length > 0 &&
    turns.some(
      (t) =>
        (t.userPrompt && t.userPrompt.trim().length > 0) ||
        (t.agentMessage && t.agentMessage.trim().length > 0) ||
        Boolean(t.canvasSnapshot)
    );
  const hasDialogue = Array.isArray(messages) && messages.some((m) => m.text && m.text.trim().length > 0);

  // Validate blank content: if no sequential turns, no canvas, and no dialogue, reject export
  if (!hasSequentialTurns && !hasCanvasContent && !hasDialogue) {
    return {
      success: false,
      error: 'Cannot export an empty session without canvas diagrams or chat messages.',
    };
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const cursor: PdfCursor = { y: margin };
  const bottomLimit = pageHeight - margin - 10; // 10mm reserved for footer

  const ensureSpace = (needed: number) => {
    if (cursor.y + needed > bottomLimit) {
      doc.addPage();
      cursor.y = margin;
    }
  };

  // Header with Top-Left Branding Logo
  const logoSize = 10; // 10mm x 10mm
  try {
    doc.addImage(BASSISTANT_LIGHT_BASE64, 'JPEG', margin, cursor.y - 1, logoSize, logoSize);
  } catch (e) {
    console.warn('Could not add header logo image to PDF:', e);
  }

  const textX = margin + logoSize + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('bAssistant Deliberation Session', textX, cursor.y + 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  const dateStr = new Date().toLocaleString();
  let subTitle = docName ? `Document: ${docName} | Generated: ${dateStr}` : `Generated: ${dateStr}`;
  if (sessionId) {
    subTitle = `Session: ${sessionId} | ${subTitle}`;
  }
  doc.text(subTitle, textX, cursor.y + 8);
  cursor.y += Math.max(logoSize + 4, 12);

  if (hasSequentialTurns && turns) {
    // Sequential Turn-by-Turn Deliberation Rendering
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const turnNum = turn.turnNumber || i + 1;
      const timeStr = turn.timestamp
        ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

      // Turn Section Header Badge
      ensureSpace(12);
      doc.setFillColor(241, 245, 249); // slate-100
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.roundedRect(margin, cursor.y, contentWidth, 7, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const turnLabel = timeStr ? `TURN ${turnNum} [${timeStr}]` : `TURN ${turnNum}`;
      doc.text(turnLabel, margin + 3, cursor.y + 4.8);
      cursor.y += 10;

      // 1. User Prompt (if present)
      if (turn.userPrompt && turn.userPrompt.trim()) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(2, 132, 199); // sky-600
        doc.text('USER INQUIRY', margin + 2, cursor.y);
        cursor.y += 4.5;

        renderHumanizedMarkdown(doc, turn.userPrompt, margin + 2, contentWidth - 4, cursor, ensureSpace);
        cursor.y += 3;
      }

      // 2. Canvas Snapshot (if present for this turn)
      if (turn.canvasSnapshot && turn.canvasSnapshot.startsWith('data:image')) {
        try {
          const dims = readPngDimensions(turn.canvasSnapshot) || { width: 1200, height: 600 };
          const fitted = fitContain(dims.width, dims.height, contentWidth - 4, 80);

          ensureSpace(fitted.height + 6);
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(248, 250, 252);
          doc.roundedRect(margin, cursor.y, contentWidth, fitted.height + 4, 2, 2, 'FD');

          doc.addImage(
            turn.canvasSnapshot,
            'PNG',
            margin + (contentWidth - fitted.width) / 2,
            cursor.y + 2,
            fitted.width,
            fitted.height
          );
          cursor.y += fitted.height + 8;
        } catch (e) {
          console.warn('Could not render turn image to PDF:', e);
        }
      }

      // 3. AI Deliberation / Response (if present)
      if (turn.agentMessage && turn.agentMessage.trim()) {
        ensureSpace(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text('AI DELIBERATION', margin + 2, cursor.y);
        cursor.y += 4.5;

        renderHumanizedMarkdown(doc, turn.agentMessage, margin + 2, contentWidth - 4, cursor, ensureSpace);
        cursor.y += 5;
      }
    }
  } else {
    // Section 1: HTML Canvas Snapshot (if available and not empty)
    if (canvasDataUrl && hasCanvasContent) {
      const dims = readPngDimensions(canvasDataUrl) || { width: 1200, height: 600 };
      const fitted = fitContain(dims.width, dims.height, contentWidth, 85);

      ensureSpace(fitted.height + 4);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(margin, cursor.y, contentWidth, fitted.height + 4, 3, 3, 'FD');

      try {
        doc.addImage(
          canvasDataUrl,
          'PNG',
          margin + (contentWidth - fitted.width) / 2,
          cursor.y + 2,
          fitted.width,
          fitted.height
        );
      } catch (e) {
        console.warn('Could not render image to PDF:', e);
      }

      cursor.y += fitted.height + 12;
    }

    // Section 2: Dialogue Stream
    ensureSpace(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Dialogue Transcript', margin, cursor.y);
    cursor.y += 6;

    if (!hasDialogue) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text('No dialogue messages recorded for this session.', margin, cursor.y);
      cursor.y += 10;
    } else {
      for (const msg of messages) {
        if (!msg.text || !msg.text.trim()) continue;

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
        doc.text(senderBadge, margin, cursor.y);
        cursor.y += 4.5;

        // Humanize LLM generated markdown with Indic script support into publication-quality structured PDF blocks
        renderHumanizedMarkdown(doc, msg.text, margin, contentWidth, cursor, ensureSpace);
        cursor.y += 3.5;
      }
    }
  }

  // Stamp disclaimer footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'AI generated analysis, verify before applying.',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Trigger browser download
  const filename = sessionId ? `bAssistant-Session-${sessionId}.pdf` : `bAssistant-Session-${Date.now()}.pdf`;
  doc.save(filename);

  return { success: true };
}
