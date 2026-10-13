export function calculateMath(expression: string): number {
  if (!expression || typeof expression !== 'string') {
    throw new Error('Expression must be a non-empty string');
  }

  // Sanitize expression allowing digits, decimals, basic operators, parens, and whitespace
  const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d\s+\-*/().%^]+$/.test(sanitized)) {
    throw new Error('Invalid mathematical expression: unsupported characters');
  }

  // Parse exponentiation
  const exprWithPow = sanitized.replace(/(\d+(\.\d+)?)\s*\^\s*(\d+(\.\d+)?)/g, 'Math.pow($1, $3)');

  // Safely evaluate using controlled Function
  try {
    const fn = new Function(`"use strict"; return (${exprWithPow});`);
    const val = fn();

    if (typeof val !== 'number' || !isFinite(val)) {
      throw new Error('Expression evaluated to a non-finite number');
    }

    // Round precision to eliminate typical floating-point quirks (e.g. 0.1 + 0.2 = 0.30000000000000004)
    return Number(Math.round(Number(val + 'e+10')) + 'e-10');
  } catch (err: any) {
    throw new Error(`Math evaluation error: ${err?.message || 'Invalid syntax'}`);
  }
}
