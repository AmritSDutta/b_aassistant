import React from 'react';
import { humanizeSymbols } from '../lib/symbolHumanizer';

export interface HumanizedMessageProps {
  content: string;
}

export function parseInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return [];

  const humanized = humanizeSymbols(text);
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  const parts = humanized.split(tokenRegex);

  return parts.filter(Boolean).map((part, index) => {
    // 1. Link: [label](url)
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-600 dark:text-sky-400 underline underline-offset-2 hover:text-sky-500"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // 2. Bold: **text** or __text__
    if (
      (part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
      (part.startsWith('__') && part.endsWith('__') && part.length >= 4)
    ) {
      return (
        <strong key={index} className="font-semibold text-slate-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // 3. Inline Code: `code`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-mono text-[14px] text-sky-700 dark:text-sky-300 border border-slate-300/50 dark:border-slate-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // 4. Italic: *text* or _text_
    if (
      (part.startsWith('*') && part.endsWith('*') && part.length >= 2) ||
      (part.startsWith('_') && part.endsWith('_') && part.length >= 2)
    ) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    // 5. Normal text segment
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export type MessageBlock =
  | { type: 'code'; lang?: string; code: string }
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'numbered_list'; items: { num: string; text: string }[] }
  | { type: 'quote'; lines: string[] }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

export function parseMessageBlocks(content: string): MessageBlock[] {
  const lines = content.split('\n');
  const blocks: MessageBlock[] = [];
  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Fenced Code Block delimiter
    if (trimmed.startsWith('```')) {
      if (inCode) {
        blocks.push({ type: 'code', lang: codeLang, code: codeLines.join('\n') });
        inCode = false;
        codeLang = '';
        codeLines = [];
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // 2. Horizontal Divider
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push({ type: 'divider' });
      continue;
    }

    // 3. Headings (H1 to H6)
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      if (level === 1) blocks.push({ type: 'h1', text });
      else if (level === 2) blocks.push({ type: 'h2', text });
      else if (level === 3) blocks.push({ type: 'h3', text });
      else blocks.push({ type: 'h4', text });
      continue;
    }

    // 4. Blockquotes
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s?/, '');
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'quote') {
        last.lines.push(quoteText);
      } else {
        blocks.push({ type: 'quote', lines: [quoteText] });
      }
      continue;
    }

    // 5. Bullet List items
    const bulletMatch = /^(\s*)[*+-]\s+(.*)$/.exec(line);
    if (bulletMatch) {
      const itemText = bulletMatch[2];
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'bullet_list') {
        last.items.push(itemText);
      } else {
        blocks.push({ type: 'bullet_list', items: [itemText] });
      }
      continue;
    }

    // 6. Numbered List items
    const numMatch = /^(\s*)(\d+\.)\s+(.*)$/.exec(line);
    if (numMatch) {
      const num = numMatch[2];
      const itemText = numMatch[3];
      const last = blocks[blocks.length - 1];
      if (last && last.type === 'numbered_list') {
        last.items.push({ num, text: itemText });
      } else {
        blocks.push({ type: 'numbered_list', items: [{ num, text: itemText }] });
      }
      continue;
    }

    // 7. Empty line
    if (!trimmed) {
      continue;
    }

    // 8. Paragraph text
    const last = blocks[blocks.length - 1];
    if (last && last.type === 'paragraph') {
      last.text += '\n' + line;
    } else {
      blocks.push({ type: 'paragraph', text: line });
    }
  }

  // Push unclosed code block if file ends inside code block
  if (inCode) {
    blocks.push({ type: 'code', lang: codeLang, code: codeLines.join('\n') });
  }

  return blocks;
}

export const HumanizedMessage: React.FC<HumanizedMessageProps> = ({ content }) => {
  if (!content) return null;

  const blocks = parseMessageBlocks(content);

  return (
    <div className="space-y-1">
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case 'code':
            return (
              <div
                key={bIdx}
                className="my-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-[13px] overflow-hidden shadow-xs"
              >
                {block.lang && (
                  <div className="px-3 py-1 bg-slate-800/80 text-[11px] font-sans font-medium text-slate-400 border-b border-slate-700/60 uppercase tracking-wider">
                    {block.lang}
                  </div>
                )}
                <pre className="p-3 overflow-x-auto leading-relaxed">
                  <code>{block.code}</code>
                </pre>
              </div>
            );

          case 'h1':
            return (
              <h3
                key={bIdx}
                className="font-sans font-bold text-lg text-slate-900 dark:text-slate-100 mt-3 mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800"
              >
                {parseInlineMarkdown(block.text)}
              </h3>
            );

          case 'h2':
            return (
              <h4
                key={bIdx}
                className="font-sans font-semibold text-base text-slate-800 dark:text-slate-200 mt-2.5 mb-1"
              >
                {parseInlineMarkdown(block.text)}
              </h4>
            );

          case 'h3':
            return (
              <h5
                key={bIdx}
                className="font-sans font-medium text-sm text-slate-700 dark:text-slate-300 mt-2 mb-1"
              >
                {parseInlineMarkdown(block.text)}
              </h5>
            );

          case 'h4':
            return (
              <h6
                key={bIdx}
                className="font-sans font-semibold text-[13px] text-slate-700 dark:text-slate-300 mt-2 mb-0.5"
              >
                {parseInlineMarkdown(block.text)}
              </h6>
            );


          case 'bullet_list':
            return (
              <ul key={bIdx} className="my-2 space-y-1 pl-1">
                {block.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-sky-500 font-bold select-none leading-relaxed">•</span>
                    <span className="flex-1 leading-relaxed">{parseInlineMarkdown(item)}</span>
                  </li>
                ))}
              </ul>
            );

          case 'numbered_list':
            return (
              <ol key={bIdx} className="my-2 space-y-1 pl-1">
                {block.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono text-xs pt-1 select-none w-5 shrink-0 text-right">
                      {item.num}
                    </span>
                    <span className="flex-1 leading-relaxed">{parseInlineMarkdown(item.text)}</span>
                  </li>
                ))}
              </ol>
            );

          case 'quote':
            return (
              <blockquote
                key={bIdx}
                className="border-l-3 border-sky-400 dark:border-sky-600 bg-sky-50/30 dark:bg-sky-950/20 pl-3 py-1 my-2 italic text-slate-700 dark:text-slate-300 rounded-r"
              >
                {block.lines.map((line, idx) => (
                  <div key={idx}>{parseInlineMarkdown(line)}</div>
                ))}
              </blockquote>
            );

          case 'divider':
            return <hr key={bIdx} className="my-3 border-t border-slate-200 dark:border-slate-800" />;

          case 'paragraph':
            return (
              <p key={bIdx} className="my-1.5 leading-[1.75] whitespace-pre-line">
                {parseInlineMarkdown(block.text)}
              </p>
            );
        }
      })}
    </div>
  );
};
