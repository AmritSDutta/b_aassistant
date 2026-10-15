import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  HumanizedMessage,
  parseInlineMarkdown,
  parseMessageBlocks,
} from '../components/HumanizedMessage';

describe('HumanizedMessage & Markdown Parser', () => {
  describe('Inline Markdown Parser', () => {
    it('parses bold text into strong elements without asterisks', () => {
      const nodes = parseInlineMarkdown('This is **bold text** here.');
      const { container } = render(<div>{nodes}</div>);

      const strong = container.querySelector('strong');
      expect(strong).not.toBeNull();
      expect(strong?.textContent).toBe('bold text');
      expect(container.textContent).not.toContain('**');
    });

    it('parses italic text into em elements without asterisks', () => {
      const nodes = parseInlineMarkdown('This is *italic text* here.');
      const { container } = render(<div>{nodes}</div>);

      const em = container.querySelector('em');
      expect(em).not.toBeNull();
      expect(em?.textContent).toBe('italic text');
      expect(container.textContent).not.toContain('*');
    });

    it('parses inline code into code elements without backticks', () => {
      const nodes = parseInlineMarkdown('Run `npm run build` now.');
      const { container } = render(<div>{nodes}</div>);

      const code = container.querySelector('code');
      expect(code).not.toBeNull();
      expect(code?.textContent).toBe('npm run build');
      expect(container.textContent).not.toContain('`');
    });

    it('parses markdown links into anchor elements with target _blank', () => {
      const nodes = parseInlineMarkdown('Visit [Google](https://google.com) today.');
      const { container } = render(<div>{nodes}</div>);

      const link = container.querySelector('a');
      expect(link).not.toBeNull();
      expect(link?.textContent).toBe('Google');
      expect(link?.getAttribute('href')).toBe('https://google.com');
      expect(link?.getAttribute('target')).toBe('_blank');
      expect(container.textContent).not.toContain('[');
      expect(container.textContent).not.toContain('(');
    });
  });

  describe('Block Level Parser', () => {
    it('groups lines into structured code, heading, list, and quote blocks', () => {
      const markdown = `
# System Architecture
Here is the overview:
- Client (React)
- Server (Edge)
1. Step One
2. Step Two
> Key insight here
---
\`\`\`typescript
const x = 10;
\`\`\`
`.trim();

      const blocks = parseMessageBlocks(markdown);
      const types = blocks.map((b) => b.type);

      expect(types).toContain('h1');
      expect(types).toContain('paragraph');
      expect(types).toContain('bullet_list');
      expect(types).toContain('numbered_list');
      expect(types).toContain('quote');
      expect(types).toContain('divider');
      expect(types).toContain('code');

      const codeBlock = blocks.find((b) => b.type === 'code') as any;
      expect(codeBlock.lang).toBe('typescript');
      expect(codeBlock.code).toContain('const x = 10;');
    });
  });

  describe('Component Rendering', () => {
    it('renders humanized text without raw markdown tokens', () => {
      const markdown = `
# Executive Summary
The **bAssistant** provides \`zero-backend\` research.
- Feature 1
- Feature 2
1. First
2. Second
> Quote message
\`\`\`bash
npm test
\`\`\`
`.trim();

      const { container } = render(<HumanizedMessage content={markdown} />);

      // Verify headings render as h3
      const heading = container.querySelector('h3');
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe('Executive Summary');

      // Verify bullet list renders as ul > li
      const listItems = container.querySelectorAll('ul li');
      expect(listItems.length).toBe(2);

      // Verify numbered list renders as ol > li
      const numberedItems = container.querySelectorAll('ol li');
      expect(numberedItems.length).toBe(2);

      // Verify code block renders
      const pre = container.querySelector('pre');
      expect(pre).not.toBeNull();
      expect(pre?.textContent).toContain('npm test');

      // Verify blockquote renders
      const quote = container.querySelector('blockquote');
      expect(quote).not.toBeNull();
      expect(quote?.textContent).toContain('Quote message');

      // Verify raw syntax is not rendered as text
      expect(heading?.textContent).not.toContain('#');
      expect(container.textContent).not.toContain('```');
      expect(container.querySelector('strong')?.textContent).toBe('bAssistant');
    });

    it('returns null when content is empty', () => {
      const { container } = render(<HumanizedMessage content="" />);
      expect(container.firstChild).toBeNull();
    });

    it('humanizes math arrows in messages and preserves line breaks', () => {
      const flow = [
        'Web/Mobile Client $\\rightarrow$ API Gateway (HTTPS Request)',
        'API Gateway $\\rightarrow$ Payment Service (API Route & Validation)',
        'Payment Service $\\rightarrow$ Payment Processor (Authorize Charge / Bank Network)',
        'Payment Service $\\rightarrow$ Database & Ledger (Record Transaction)',
      ].join('\n');

      const { container } = render(<HumanizedMessage content={flow} />);
      const p = container.querySelector('p');
      expect(p).not.toBeNull();
      expect(p?.className).toContain('whitespace-pre-line');
      expect(p?.textContent).toContain('Web/Mobile Client → API Gateway (HTTPS Request)');
      expect(p?.textContent).toContain('API Gateway → Payment Service (API Route & Validation)');
      expect(p?.textContent).not.toContain('$\\rightarrow$');
    });

    it('transforms ####, #####, and ###### headings into clean h6 elements without raw hash tokens', () => {
      const text = [
        '#### Fourth Level Section',
        '##### Fifth Level Section',
        '###### Sixth Level Section',
      ].join('\n');

      const blocks = parseMessageBlocks(text);
      expect(blocks.length).toBe(3);
      expect(blocks[0].type).toBe('h4');
      expect(blocks[1].type).toBe('h4');
      expect(blocks[2].type).toBe('h4');

      const { container } = render(<HumanizedMessage content={text} />);
      const h6Elements = container.querySelectorAll('h6');
      expect(h6Elements.length).toBe(3);
      expect(h6Elements[0].textContent).toBe('Fourth Level Section');
      expect(h6Elements[1].textContent).toBe('Fifth Level Section');
      expect(h6Elements[2].textContent).toBe('Sixth Level Section');
      expect(container.textContent).not.toContain('####');
      expect(container.textContent).not.toContain('#####');
      expect(container.textContent).not.toContain('######');
    });
  });
});
