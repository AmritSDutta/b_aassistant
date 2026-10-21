---
doc: research
status: approved
---

# bAssistant — UI Dwell-Time Research

Web research (October 2026) into what makes users spend long, comfortable sessions in an app like bAssistant — a document + chat + canvas analyst cockpit. Six evidence-backed mechanisms drive the UI enrichment plan; each is implemented in the codebase and cited below.

## 1. Warm surfaces reduce eye fatigue → longer sessions
Sepia/warm display modes reduce blue-light exposure and glare, which users consistently prefer for prolonged reading; display-mode choice measurably alleviates eye strain. Cold blue-black surfaces (`slate-950`) fatigue faster than warm darks; pure black is discouraged for long-form reading.

- [All About Vision — Is dark mode better or worse for your eyes?](https://www.allaboutvision.com/conditions/computer-vision-syndrome/digital-eye-strain/is-dark-mode-better-for-eyes)
- [PMC (2025) — Light vs. dark mode eye-strain study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12027292)
- [Smashing Magazine — Inclusive dark mode design](https://www.smashingmagazine.com/2025/04/inclusive-dark-mode-designing-accessible-dark-themes)
- [Microsoft Design — Semantic color tokens for light/dark](https://medium.com/microsoft-design/designing-for-dark-mode-more-than-flipping-a-switch-c21fb38722d2)

**Implemented:** warm token system in `src/index.css` — light = paper `#fffdf7` / navy ink `#14213d`; dark = warm ink surfaces (`#191714` family), never cold blue-black. Semantic CSS variables (`--paper`, `--panel`, `--card`, `--ink`, `--line`, accent roles) swap per theme.

## 2. Appearance controls + chrome-hiding reading views
Readwise Reader — the app power readers spend the most time in — attributes its comfort to a dedicated "long-form reading view" that hides action chrome, plus user-adjustable appearance settings (text size, theme). Readers stay when the interface adapts to their eyes.

- [Readwise Reader](https://readwise.io/read)
- [Readwise Docs — Appearance & long-form reading view](https://docs.readwise.io/reader/docs/faqs/appearance)

**Implemented:** A- / A+ font steps (15/17/19px, persisted in `localStorage['b_font_size']`) applied to the Lora 72ch reading column; per-region chrome stays minimal (mono kicker header only).

## 3. Zen/popup maximize keeps flow
iA Writer's Focus Mode ("highlights the sentence you're working on and fades everything else") is why writers draft for hours; Obsidian's zen mode hides everything but the text. Removing surrounding chrome while reading sustains immersion ("time disappears" — flow).

- [iA Writer](https://ia.net/writer)
- [Obsidian Forum — Zen mode & typewriter mode](https://forum.obsidian.md/t/zen-mode-and-typewriter-mode-for-focused-writing/2788)
- [UX Mag — Flow State Design](https://uxmag.com/articles/flow-state-design-applying-game-psychology-to-productivity-apps)
- [PMC — A neuroscientific view of flow](https://pmc.ncbi.nlm.nih.gov/articles/PMC7983950)

**Implemented:** ⤢ expand opens the chat as a full-screen reader popup (Escape / ✕ closes), with the same stream, input, and font controls.

## 4. Highlights create personal value → revisits
Highlighting boosts engagement, comprehension, and critical thinking (Hypothesis, used widely in education); Readwise built an entire product on highlights being worth returning to. Personal marks in content give users a reason to come back and a sense of ownership.

- [Hypothesis — Social annotation](https://web.hypothes.is)
- [Readwise Reader](https://readwise.io/read)

**Implemented:** ☆/★ toggle on every message (violet accent); starred messages collect in **Session Highlights** (sidebar Section 3), and clicking an entry scrolls the dialogue to that message — turning the previously blank slot into the revisit loop.

## 5. Progress = sense of investment
Slim reading-progress indicators exploit the goal-gradient effect: visualizing how far you've come motivates completion and orients readers when the end isn't visible. Progress bars reassure and reduce uncertainty (borrowed from game design into UX).

- [UX Collective — From RPGs to UX: progress indicators & engagement](https://uxdesign.cc/from-rpgs-to-ux-how-progress-indicators-affect-user-engagement-8748f02d766a)
- [UX StackExchange — Rationale of progress indicators for articles](https://ux.stackexchange.com/questions/105527/the-rationale-of-progress-indicators-for-online-articles)
- [Userpilot — Progress bar UX in SaaS](https://userpilot.com/blog/progress-bar-ui-ux-saas)

**Implemented:** 2px violet reading-progress bar at the top of the dialogue stream (scroll-position based); gentle session strip (`messages · highlights · minutes`) in the sidebar — investment without countdown pressure.

## 6. Calm, alive feedback (restrained motion)
Micro-interactions measurably improve UX and alter time perception — animations modulate both emotion and perceived wait (peer-reviewed). But over-designed animation harms. Calm-design patterns prescribe one hero action per region, whitespace, and short (0.14–0.2s) transitions. Skeleton/streaming indicators reduce perceived wait; capability transparency (telling users what the agent can do) is a core chatbot-UX pillar; empty states should teach — name the job and model one starter action.

- [Boyd (2021, ACM) — Micro-interactions](https://dl.acm.org/doi/fullHtml/10.1145/3452853.3452865)
- [NN/g — Skeleton screens / perceived performance](https://www.nngroup.com/articles/skeleton-screens)
- [NN/g — Minimize cognitive load](https://www.nngroup.com/articles/minimize-cognitive-load)
- [9 calm-interface design patterns](https://www.carrieharmancreative.co.nz/9-design-patterns-for-calm-focused-interfaces-in-a-noisy-world-with-real-world-examples)
- [NN/g — Chatbot & AI chat design guidelines](https://www.nngroup.com/articles/ai-chatbots-design-guidelines)
- [Excalidraw UX teardown — empty states must teach](https://typenorm.com/articles/excalidraw-ux-teardown)

**Implemented:** "agent is thinking" pulse while the last message is from the user; 0.18s message entrance fades; per-message copy button; dropzone drag-over highlight; first-load **WelcomeModal** with a 7-step how-to-use guide (re-openable via the sidebar "tips" link); `prefers-reduced-motion` kill-switch for all animation.

## Supporting references
- **Chat readability optimum (already met):** 60–75 characters per line with ~1.4–1.6 line-height — bAssistant's Lora 72ch / 1.75 reading column sits at this optimum ([NN/g chatbot guidelines](https://www.nngroup.com/articles/ai-chatbots-design-guidelines), [ai-tldr.dev chatbot UX patterns](https://ai-tldr.dev/learn/building-ai-apps/ai-ux-patterns/chatbot-ux-patterns)).
- **Architecture analogue:** NotebookLM's designer documents the Inputs → Chat → Outputs mental model with a Sources | Chat | Studio panel system — bAssistant maps 1:1 (sidebar | chat | canvas), with chat as the "familiar anchor" ([Designing NotebookLM](https://jasonspielman.com/notebooklm)).
- **Palette reference:** PaperPilot's WebMCP page — warm paper/ink base with coral = agent actions, mint = user/success, violet = annotations, hard offset shadows, mono kickers, dotted-grid graph surface ([spike.css](https://github.com/patrickjcraig/PaperPilot/blob/main/spikes/webmcp-contract/spike.css), [live page](https://patrickjcraig.github.io/PaperPilot/webmcp/)) — adapted here as CSS semantic tokens.

## Where each mechanism landed
| Mechanism | Component(s) |
| :--- | :--- |
| Warm surfaces | `src/index.css` tokens; all surfaces |
| Appearance controls | `ChatArea.tsx` A-/A+ (persisted) |
| Zen popup maximize | `ChatArea.tsx` ⤢ expand overlay |
| Highlights | `ChatArea.tsx` ☆/★, `BlankSlot.tsx` Session Highlights |
| Progress | `ChatArea.tsx` 2px bar; `App.tsx` session strip |
| Calm + alive | thinking pulse, entrance fades, copy, drag-over, `WelcomeModal.tsx`, reduced-motion guard |
| High-Efficiency Parsing | `src/lib/liteparseService.ts`, `src/lib/bm25.ts` |

## 7. Effective Document Parsing & Retrieval (LiteParse & LlamaIndex Research)

Research into agentic document extraction and retrieval based on LlamaIndex's `run-llama/llamaparse-agent-skills` (`liteparse`):

### 7.1 The "Parse Once" Golden Rule
Agent traces frequently reveal severe resource and token exhaustion when LLMs or agents re-parse multi-megabyte PDFs on every query (in real traces, the same PDF was repeatedly parsed up to 9 times).
- **Core Principle:** Extract the document exactly once into a structured, indexed memory store. All subsequent queries, searches, and synthesis runs query the indexed representation rather than triggering full extraction pipelines.
- **bAssistant Implementation:** `bAssistant` uploads PDFs or DOCX files into browser IndexedDB through `LiteParseService`. Content is tokenized into distinct pages, stored locally, and queried instantaneously via the client-side `BM25Index` without repeated disk or stream parsing.

### 7.2 Low-Latency Born-Digital PDFs (`--no-ocr`)
Most enterprise documents, corporate earnings, technical RFCs, and financial whitepapers are born-digital (they possess a native vector text layer).
- **Finding:** Running OCR on born-digital documents wastes immense compute and introduces OCR transcription noise. Passing `--no-ocr` (`ocrEnabled: false`) parses native vector text in milliseconds with 100% character precision.
- **bAssistant Implementation:** `LiteParseService` configures `LiteParse` with `{ outputFormat: 'text' }` and no OCR overhead, utilizing native vector text extraction for instant responses.

### 7.3 Multi-Tier Resilient In-Browser Extraction Architecture
Running document extraction entirely inside the user's browser without backend infrastructure requires fallback resilience across diverse environments and document types:
1. **Tier 1 (WASM Core):** Official `@llamaindex/liteparse-wasm` module initialized with compiled WebAssembly (`/liteparse_wasm_bg.wasm`), providing native Rust performance and layout-aware text extraction.
2. **Tier 2 (Browser Stream PDF Decompressor):** High-throughput fallback utilizing web-standard `DecompressionStream('deflate-raw')` directly on PDF FlateDecode streams. Supports both literal string tokens (`(...) Tj`) and hexadecimal byte streams (`<...> Tj` and `[...] TJ`) for fonts with custom encoding.
3. **Tier 3 (DOCX XML Zip Decompression):** In-browser standard PKZip stream parser for Microsoft Word `.docx` documents. Locates and inflates `word/document.xml` using `DecompressionStream`, stripping XML metadata tags to produce clean document paragraphs.
4. **Tier 4 (Unstructured Fallback):** UTF-8 / Latin1 printable text stream preservation with form-feed (`\f`) page break detection. Never emits generic placeholder strings.

