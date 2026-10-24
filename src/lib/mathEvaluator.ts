const SAFE_MATH_NAMES = new Set([
  'sqrt',
  'cbrt',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'log',
  'log10',
  'log2',
  'exp',
  'abs',
  'round',
  'floor',
  'ceil',
  'min',
  'max',
  'PI',
  'E',
]);

export function calculateMath(expression: string): number {
  if (!expression || typeof expression !== 'string' || expression.trim() === '') {
    throw new Error('Expression must be a non-empty string');
  }

  // Normalize Unicode symbols and common notation
  let sanitized = expression
    .replace(/[×·⋅]/g, '*')
    .replace(/[÷∕⁄]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/√\s*(\d+(\.\d+)?)/g, 'sqrt($1)')
    .replace(/√\s*\(/g, 'sqrt(')
    .replace(/√/g, 'sqrt')
    .replace(/∛\s*(\d+(\.\d+)?)/g, 'cbrt($1)')
    .replace(/∛\s*\(/g, 'cbrt(')
    .replace(/∛/g, 'cbrt')
    .replace(/²/g, '**2')
    .replace(/³/g, '**3')
    .replace(/\^/g, '**')
    .replace(/(\d)\s*[xX]\s*(\d)/g, '$1 * $2')
    .replace(/\bpi\b/gi, 'PI')
    .replace(/π/g, 'PI')
    .replace(/\be\b/g, 'E')
    .replace(/\bln\s*\(/g, 'log(');

  // Validate & prefix whitelisted Math functions: e.g. sqrt(...) -> Math.sqrt(...)
  sanitized = sanitized.replace(/\b([a-zA-Z]\w*)\b/g, (match, _p1, offset) => {
    if (match === 'Math') return match;
    const isPrecededByMath = offset >= 5 && sanitized.slice(offset - 5, offset) === 'Math.';
    if (isPrecededByMath) {
      if (SAFE_MATH_NAMES.has(match)) return match;
      throw new Error(`Invalid mathematical expression: unsupported identifier "${match}"`);
    }
    if (SAFE_MATH_NAMES.has(match)) return `Math.${match}`;
    // Preserve 'e' or 'E' as exponent in scientific notation (e.g. 1.5e-3)
    if ((match === 'e' || match === 'E') && offset > 0 && /[\d.]/.test(sanitized[offset - 1])) {
      return match;
    }
    throw new Error(`Invalid mathematical expression: unsupported identifier "${match}"`);
  });

  // Verify that sanitized expression contains ONLY safe characters
  if (/[^0-9\s+\-*/(),.%a-zA-Z.]/.test(sanitized)) {
    throw new Error('Invalid mathematical expression: unsupported characters');
  }

  // Safely evaluate using controlled Function
  try {
    const fn = new Function(`"use strict"; return (${sanitized});`);
    const val = fn();

    if (typeof val !== 'number' || !isFinite(val)) {
      throw new Error('Expression evaluated to a non-finite number');
    }

    // Round precision to eliminate typical floating-point quirks (e.g. 0.1 + 0.2 = 0.3)
    return Number(Math.round(Number(val + 'e+10')) + 'e-10');
  } catch (err: any) {
    throw new Error(`Math evaluation error: ${err?.message || 'Invalid syntax'}`);
  }
}
