import { describe, it, expect } from 'vitest';
import { humanizeSymbols, humanizeSymbolsForPdf } from '../lib/symbolHumanizer';

describe('symbolHumanizer', () => {
  it('humanizes the user multi-step architecture flow', () => {
    const input = [
      'Web/Mobile Client $\\rightarrow$ API Gateway (HTTPS Request)',
      'API Gateway $\\rightarrow$ Payment Service (API Route & Validation)',
      'Payment Service $\\rightarrow$ Payment Processor (Authorize Charge / Bank Network)',
      'Payment Service $\\rightarrow$ Database & Ledger (Record Transaction)',
    ].join('\n');

    const expected = [
      'Web/Mobile Client → API Gateway (HTTPS Request)',
      'API Gateway → Payment Service (API Route & Validation)',
      'Payment Service → Payment Processor (Authorize Charge / Bank Network)',
      'Payment Service → Database & Ledger (Record Transaction)',
    ].join('\n');

    expect(humanizeSymbols(input)).toBe(expected);
  });

  it('humanizes various arrow commands with and without dollar delimiters', () => {
    expect(humanizeSymbols('A $\\rightarrow$ B')).toBe('A → B');
    expect(humanizeSymbols('A \\rightarrow B')).toBe('A → B');
    expect(humanizeSymbols('A $\\to$ B')).toBe('A → B');
    expect(humanizeSymbols('A $\\leftarrow$ B')).toBe('A ← B');
    expect(humanizeSymbols('A $\\Rightarrow$ B')).toBe('A ⇒ B');
    expect(humanizeSymbols('A $\\Leftarrow$ B')).toBe('A ⇐ B');
    expect(humanizeSymbols('A $\\leftrightarrow$ B')).toBe('A ↔ B');
    expect(humanizeSymbols('A $\\uparrow$ B $\\downarrow$ C')).toBe('A ↑ B ↓ C');
  });

  it('humanizes comparison, relational, and arithmetic symbols', () => {
    expect(humanizeSymbols('$x \\leq 10$')).toBe('x ≤ 10');
    expect(humanizeSymbols('$y \\geq 20$')).toBe('y ≥ 20');
    expect(humanizeSymbols('$a \\neq b$')).toBe('a ≠ b');
    expect(humanizeSymbols('$c \\approx 3.14$')).toBe('c ≈ 3.14');
    expect(humanizeSymbols('$10 \\times 5$')).toBe('10 × 5');
    expect(humanizeSymbols('$\\pm 5$')).toBe('± 5');
    expect(humanizeSymbols('$x \\in S$')).toBe('x ∈ S');
    expect(humanizeSymbols('$\\infty$')).toBe('∞');
  });

  it('humanizes Greek characters', () => {
    expect(humanizeSymbols('$\\alpha + \\beta = \\gamma$')).toBe('α + β = γ');
    expect(humanizeSymbols('$\\pi r^2$')).toBe('π r^2');
  });

  it('strictly preserves currency figures', () => {
    expect(humanizeSymbols('Cost is $100 and revenue is $50M')).toBe('Cost is $100 and revenue is $50M');
    expect(humanizeSymbols('Price: $12.50 to $25.00')).toBe('Price: $12.50 to $25.00');
    expect(humanizeSymbols('$1,000 threshold')).toBe('$1,000 threshold');
  });

  it('converts symbols into safe ASCII for PDF Latin-1 export', () => {
    const input = 'Client $\\rightarrow$ Gateway $\\Rightarrow$ DB ($x \\leq 5$, $a \\neq b$, $\\pm 2$)';
    const pdfOutput = humanizeSymbolsForPdf(input);

    expect(pdfOutput).toBe('Client -> Gateway => DB (x <= 5, a != b, +/- 2)');
    expect(pdfOutput).not.toContain('→');
    expect(pdfOutput).not.toContain('⇒');
    expect(pdfOutput).not.toContain('≤');
    expect(pdfOutput).not.toContain('≠');
  });

  it('humanizes scientific symbols and converts them to safe PDF ASCII', () => {
    expect(humanizeSymbols('$\\sqrt{x}$ and $30\\degree$')).toBe('√{x} and 30°');
    expect(humanizeSymbols('\\hbar and \\sum and \\int')).toBe('ℏ and ∑ and ∫');

    const pdfOutput = humanizeSymbolsForPdf('Formula: $\\sqrt{x}$ and $30\\degree$ with $\\Delta$ and $\\Omega$ ($2² + 3³$)');
    expect(pdfOutput).toContain('sqrt');
    expect(pdfOutput).toContain('deg');
    expect(pdfOutput).toContain('Delta');
    expect(pdfOutput).toContain('Omega');
    expect(pdfOutput).toContain('^2');
    expect(pdfOutput).toContain('^3');
    expect(pdfOutput).not.toContain('√');
    expect(pdfOutput).not.toContain('°');
    expect(pdfOutput).not.toContain('²');
    expect(pdfOutput).not.toContain('³');
    expect(pdfOutput).not.toContain('Δ');
    expect(pdfOutput).not.toContain('Ω');
  });
});
