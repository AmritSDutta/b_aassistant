/**
 * Utility functions for transforming LaTeX and mathematical notations
 * emitted by AI models into human-readable Unicode and ASCII strings.
 */

// Map of LaTeX command names (without backslash) to Unicode characters
const LATEX_TO_UNICODE: Record<string, string> = {
  // Arrows
  rightarrow: '→',
  longrightarrow: '→',
  to: '→',
  leftarrow: '←',
  longleftarrow: '←',
  gets: '←',
  leftrightarrow: '↔',
  longleftrightarrow: '↔',
  Rightarrow: '⇒',
  Longrightarrow: '⇒',
  Leftarrow: '⇐',
  Longleftarrow: '⇐',
  Leftrightarrow: '⇔',
  Longleftrightarrow: '⇔',
  uparrow: '↑',
  downarrow: '↓',
  updownarrow: '↕',
  mapsto: '↦',
  longmapsto: '↦',

  // Comparisons & Relations
  leq: '≤',
  le: '≤',
  geq: '≥',
  ge: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  equiv: '≡',
  sim: '∼',
  simeq: '≃',
  ll: '≪',
  gg: '≫',

  // Arithmetic & Operations
  pm: '±',
  mp: '∓',
  times: '×',
  div: '÷',
  cdot: '·',
  bullet: '•',
  dots: '…',
  ldots: '…',
  cdots: '…',
  circ: '∘',
  ast: '∗',
  star: '★',

  // Set theory & logic
  in: '∈',
  notin: '∉',
  subset: '⊂',
  subseteq: '⊆',
  supset: '⊃',
  supseteq: '⊇',
  cap: '∩',
  cup: '∪',
  forall: '∀',
  exists: '∃',
  neg: '¬',
  land: '∧',
  lor: '∨',
  infty: '∞',
  partial: '∂',
  nabla: '∇',

  // Greek letters
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  Gamma: 'Γ',
  delta: 'δ',
  Delta: 'Δ',
  epsilon: 'ε',
  theta: 'θ',
  lambda: 'λ',
  Lambda: 'Λ',
  mu: 'μ',
  pi: 'π',
  sigma: 'σ',
  Sigma: 'Σ',
  tau: 'τ',
  phi: 'φ',
  Phi: 'Φ',
  omega: 'ω',
  Omega: 'Ω',
};

// Map of Unicode or LaTeX symbols to clean printable ASCII for jsPDF (WinAnsi Latin-1)
const UNICODE_TO_PDF_ASCII: Record<string, string> = {
  '→': '->',
  '←': '<-',
  '↔': '<->',
  '⇒': '=>',
  '⇐': '<=',
  '⇔': '<=>',
  '↑': '^',
  '↓': 'v',
  '↕': '^v',
  '↦': '|->',
  '≤': '<=',
  '≥': '>=',
  '≠': '!=',
  '≈': '~=',
  '≡': '==',
  '∼': '~',
  '≃': '~=',
  '≪': '<<',
  '≫': '>>',
  '±': '+/-',
  '∓': '-/+',
  '×': 'x',
  '÷': '/',
  '·': '*',
  '•': '*',
  '…': '...',
  '∘': 'o',
  '∈': 'in',
  '∉': 'not in',
  '⊂': 'subset',
  '⊆': 'subset_eq',
  '∩': 'intersect',
  '∪': 'union',
  '∀': 'forall',
  '∃': 'exists',
  '¬': 'not',
  '∧': 'AND',
  '∨': 'OR',
  '∞': 'inf',
  '∂': 'd',
  'α': 'alpha',
  'β': 'beta',
  'γ': 'gamma',
  'δ': 'delta',
  'λ': 'lambda',
  'μ': 'mu',
  'π': 'pi',
  'σ': 'sigma',
  'ω': 'omega',
};

const MATH_OPERATOR_REGEX = /[→←↔⇒⇐⇔↑↓↕↦=<>≤≥≠≈≡∼≃≪≫±∓×÷·•…∘∈∉⊂⊆∩∪∀∃¬∧∨∞∂\+\-\*\/\^α-ωΑ-Ω]/;

/**
 * Normalizes LaTeX math symbols, arrows, and expressions into clean Unicode for UI display.
 * Protects currency amounts ($100, $50M, $12.50) from being stripped.
 */
export function humanizeSymbols(text: string): string {
  if (!text) return '';

  let result = text;

  // 1. Unwrap \text{...}, \mathrm{...}, \mathbf{...}, \mathit{...}
  result = result.replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, '$1');

  // 2. Replace known LaTeX commands with Unicode symbols
  result = result.replace(
    /\\([a-zA-Z]+)/g,
    (match: string, cmd: string): string => {
      return LATEX_TO_UNICODE[cmd] ?? match;
    }
  );

  // 3. Remove enclosing dollar math delimiters ($expr$), strictly protecting currency amounts
  result = result.replace(
    /\$([^$\n]+?)\$/g,
    (match: string, inner: string): string => {
      // If inner contains math operators, relations, arrows, Greek letters, or is a single variable, strip $
      if (MATH_OPERATOR_REGEX.test(inner) || /^\s*[a-zA-Z]\s*$/.test(inner)) {
        return inner;
      }
      return match;
    }
  );

  // 4. Strip any dangling/unclosed dollar signs adjacent to a math or arrow symbol (e.g. $\pm or →$)
  result = result.replace(
    /\$\s*([→←↔⇒⇐⇔↑↓↕↦≤≥≠≈≡∼≃≪≫±∓×÷·•…∘∈∉⊂⊆∩∪∀∃¬∧∨∞∂α-ωΑ-Ω])/g,
    '$1'
  );
  result = result.replace(
    /([→←↔⇒⇐⇔↑↓↕↦≤≥≠≈≡∼≃≪≫±∓×÷·•…∘∈∉⊂⊆∩∪∀∃¬∧∨∞∂α-ωΑ-Ω])\s*\$/g,
    '$1'
  );

  return result;
}

/**
 * Normalizes symbols into safe standard ASCII strings for jsPDF Latin-1 export.
 */
export function humanizeSymbolsForPdf(text: string): string {
  if (!text) return '';

  // First convert LaTeX notation to Unicode symbols
  let result = humanizeSymbols(text);

  // Replace each Unicode character with its ASCII equivalent
  for (const [unicodeChar, asciiEquiv] of Object.entries(UNICODE_TO_PDF_ASCII)) {
    if (result.includes(unicodeChar)) {
      result = result.split(unicodeChar).join(asciiEquiv);
    }
  }

  return result;
}
