import { Canvas2dShape } from '../../types/canvas2d';

/**
 * Normalizes common LLM JSON syntax issues such as code fences, trailing commas,
 * and unescaped line breaks.
 */
export function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();

  // Strip wrapping markdown code blocks if the entire content or majority is wrapped
  const codeBlockMatch = cleaned.match(/^```(?:json|markdown|md|text)?\s*([\s\S]*?)\s*```$/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Remove trailing commas before closing brackets or braces
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  return cleaned;
}

/**
 * Strips extraneous outer markdown or code fences (e.g. ```markdown ... ```)
 * from textual explanations so they render as formatted typography instead of code blocks.
 * Recursively removes multiple outer layers if inserted by models like Mistral.
 */
export function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  let modified = true;

  while (modified) {
    modified = false;
    // Match starting with ```(markdown|md|text)? on the first line and ending with ``` on the last line
    const multilineMatch = cleaned.match(/^```(?:markdown|md|text)?\s*\r?\n([\s\S]*?)\r?\n```$/i);
    if (multilineMatch) {
      cleaned = multilineMatch[1].trim();
      modified = true;
      continue;
    }

    // Also match single-line or inline wrapped fence: ```markdown ... ``` without inner fences
    const inlineMatch = cleaned.match(/^```(?:markdown|md|text)?\s*([\s\S]*?)\s*```$/i);
    if (inlineMatch && !inlineMatch[1].includes('```')) {
      cleaned = inlineMatch[1].trim();
      modified = true;
    }
  }

  return cleaned;
}

/**
 * Attempts to close unterminated strings, arrays, and objects in truncated JSON.
 */
export function repairTruncatedJson(str: string): string {
  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (isEscaped) {
      isEscaped = false;
      continue;
    }

    if (char === '\\') {
      isEscaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      stack.push('}');
    } else if (char === '[') {
      stack.push(']');
    } else if (char === '}' || char === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === char) {
        stack.pop();
      }
    }
  }

  let repaired = str;
  if (inString) {
    repaired += '"';
  }

  // Strip trailing comma before closing if present
  repaired = repaired.replace(/,\s*$/, '');

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

/**
 * Safely parses JSON with fallback sanitization and truncation repair.
 */
export function repairAndParseJson<T = unknown>(raw: string): T {
  const cleaned = cleanJsonString(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const repaired = repairTruncatedJson(cleaned);
    return JSON.parse(repaired) as T;
  }
}

/**
 * Extracts canvas shapes and technical explanation from structured JSON or fallback text.
 */
export function extractShapesAndExplanationFromJson(text: string): {
  shapes: Canvas2dShape[] | null;
  explanation: string;
} {
  const trimmed = text.trim();

  // 1. First attempt: Direct root JSON parsing (structured outputs from Mistral, Requesty, etc.)
  try {
    const parsed = repairAndParseJson<Record<string, unknown>>(trimmed);
    if (parsed && typeof parsed === 'object') {
      const shapes = Array.isArray(parsed.shapes) ? (parsed.shapes as Canvas2dShape[]) : null;
      const rawExplanation =
        typeof parsed.explanation === 'string' && parsed.explanation.trim()
          ? parsed.explanation.trim()
          : '';
      const explanation = stripMarkdownFences(rawExplanation);

      if (shapes) {
        return { shapes, explanation: explanation || stripMarkdownFences(trimmed) };
      }
    }
  } catch {
    // Continue to fallback parsing strategies
  }

  // 2. Fallback: <toolcall> or <tool_call> tags
  const toolCallRegex =
    /<(?:toolcall|tool_call)>[\s\S]*?<argvalue>([\s\S]*?)<\/argvalue>[\s\S]*?<\/(?:toolcall|tool_call)>/i;
  const toolCallMatch = trimmed.match(toolCallRegex);
  if (toolCallMatch) {
    try {
      const parsed = repairAndParseJson<Record<string, unknown>>(toolCallMatch[1]);
      if (parsed && Array.isArray(parsed.shapes)) {
        return {
          shapes: parsed.shapes as Canvas2dShape[],
          explanation: stripMarkdownFences(trimmed.replace(toolCallMatch[0], '')),
        };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // 3. Fallback: Markdown fenced json code block
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match: RegExpExecArray | null;
  while ((match = jsonBlockRegex.exec(trimmed)) !== null) {
    try {
      const parsed = repairAndParseJson<Record<string, unknown>>(match[1]);
      if (parsed && Array.isArray(parsed.shapes)) {
        const remaining = trimmed.replace(match[0], '').trim();
        const innerExplanation =
          typeof parsed.explanation === 'string' && parsed.explanation.trim()
            ? parsed.explanation.trim()
            : '';
        return {
          shapes: parsed.shapes as Canvas2dShape[],
          explanation: stripMarkdownFences(innerExplanation || remaining || trimmed),
        };
      }
    } catch {
      // Continue searching next code block
    }
  }

  // 4. Fallback: Inline JSON shapes match
  const inlineJsonMatch = trimmed.match(/\{[\s\r\n]*"shapes"[\s\r\n]*:[\s\S]*?\}(?=[\r\n\s]*$|[#\w])/);
  if (inlineJsonMatch) {
    try {
      const parsed = repairAndParseJson<Record<string, unknown>>(inlineJsonMatch[0]);
      if (parsed && Array.isArray(parsed.shapes)) {
        return {
          shapes: parsed.shapes as Canvas2dShape[],
          explanation: stripMarkdownFences(trimmed.replace(inlineJsonMatch[0], '')),
        };
      }
    } catch {
      // Ignore parse failure
    }
  }

  return { shapes: null, explanation: stripMarkdownFences(trimmed) };
}
