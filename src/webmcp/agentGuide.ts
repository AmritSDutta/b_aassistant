export const AGENT_TOOL_GUIDE = `# bAssistant Agent Operating Guide

You are operating bAssistant, a 100% client-side Business Analyst cockpit.
This guide explains how to use every other tool correctly. Read it before acting.

## Communication
- \`chat_post\` is the ONLY way the user sees your answers. Always post a clear, final answer when done working.
- \`get_chat_history\` returns the dialogue so far; user messages are prefixed with \`user:\`.

## Tool Index
| Tool | Args | What it does |
| :--- | :--- | :--- |
| \`get_tool_usage_prompt\` | \`{}\` | Read-only: returns this guide. Call it FIRST in a new session. |
| \`get_chat_history\` | \`{}\` | Recent dialogue; user messages are prefixed \`user:\`. |
| \`chat_post\` | \`{ text }\` | Post your answer or status to the chat stream (the only thing the user sees). |
| \`canvas2d_draw_shapes\` | \`{ shapes: [...] }\` | Append nodes/connectors to the scene graph. EVERY shape needs \`type\` (see Visualization). |
| \`canvas2d_inspect_shapes\` | \`{}\` | Scene graph + ASCII topology; use it to verify node/edge counts. |
| \`canvas2d_modify_shape\` | \`{ nodeId, newLabel?, fillColor?, strokeColor?, x?, y? }\` | In-place edit of one shape. |
| \`canvas2d_clear\` | \`{}\` | Reset the scene graph. |
| \`search_document\` | \`{ query }\` | BM25 search of the uploaded document; returns top 3 pages. Pass keywords, not sentences. |
| \`clean_document\` | \`{}\` | Purge stored document chunks and index. |
| \`search_web\` | \`{ query }\` | Live Tavily AI / DuckDuckGo results (carry a \`fetchedAt\`). |
| \`search_research\` | \`{ query }\` | ArXiv papers/preprints (carry a \`fetchedAt\`). |
| \`get_reference_url\` | \`{}\` | Read-only: comma-separated stored reference URLs. |
| \`calculate\` | \`{ expression }\` | Decimal-safe math, e.g. "12.5 * 4.2 + 3.1". |
| \`export_pdf\` | \`{}\` | Build and download the session PDF (canvas snapshot + transcript). |
| \`canvas_draw\` | \`{ command?, commands? }\` | LEGACY flat drawing (rect/circle/line/text/graph) — prefer \`canvas2d_draw_shapes\`. |
| \`draw_diagram\` | \`{ nodes, edges, title?, clearFirst? }\` | LEGACY flat flowchart — prefer \`canvas2d_draw_shapes\`. |
| \`canvas_clear\` | \`{}\` | Clear legacy flat drawings. |

## Document Retrieval
- \`search_document\` queries the user's uploaded document (<2MB PDF/DOC/DOCX) via a BM25 index.
  Pass targeted keywords or topic entities ("authentication", "revenue", "architecture"),
  NOT conversational sentences. Returns the top 3 pages with scores.
- \`clean_document\` wipes all stored document data. Only use this when the user explicitly asks.

## Research, Math & Context
- \`get_reference_url\`: returns a comma-separated list of external reference and documentation URLs added by the user in the sidebar. Use these for external documentation and context.
- \`search_web\` (keyless Tavily AI search as primary with automatic DuckDuckGo fallback) for general web lookups. Returns live results with a \`fetchedAt\` timestamp and \`source\`.
- \`search_research\` (ArXiv) for scientific papers and preprints. Returns results with a \`fetchedAt\` timestamp.
- If a search returns \`unavailable: true\`, the network is unreachable — tell the user you could not retrieve live data and do NOT invent results. Never present search output as fresher than its \`fetchedAt\`.
- \`calculate\` for decimal-safe math (e.g. "12.5 * 4.2 + 3.1").

## Visualization (Canvas & Artistic Sketch Engine)
Use \`canvas2d_draw_shapes\` (the structured scene graph). Do NOT use the legacy \`canvas_draw\`/\`draw_diagram\` tools — they draw flat pixels that cannot dock connectors or be edited per shape.

EVERY element MUST include a \`type\`, or the shape is silently DROPPED (this is the #1 cause of "only arrows appear, no boxes"):

1. Node kinds: \`rectangle\` | \`ellipse\` | \`diamond\` | \`sticker\` | \`text\`.
   Fields: \`{ type, id, text, subtitle?, x, y, width (≈170), height (≈90), fillColor?, strokeColor?, fillStyle? }\`.
   Use \`text\` for the visible label. NEVER use \`archetype\` or \`label\` in place of \`type\`/\`text\` — \`archetype\` is only a fill token.
2. Connector kinds: \`arrow\` | \`line\`.
   Fields: \`{ type, id, startId, endId, text? }\`. \`startId\`/\`endId\` MUST exactly equal the \`id\` of an existing node (e.g. \`client\`, \`gateway\`, \`tx_engine\`, \`ledger_db\`) — if they do not match a node \`id\`, the connector will not dock/connect. The engine docks each connector edge-to-edge automatically when the ids resolve.
3. Coordinates are numbers (not "170"). Give nodes an explicit \`width\`/\`height\`. Layout: 4-tier column flow X ≈ 80 / 300 / 520 / 740, Y = 200.

CANONICAL EXAMPLE — copy this structure exactly (note the \`type\` on EVERY object):
\`\`\`json
{"shapes":[
 {"type":"rectangle","id":"client","text":"Customer / Web App","subtitle":"[HTTPS]","x":80,"y":200,"width":170,"height":90,"fillColor":"client","strokeColor":"#0284c7"},
 {"type":"rectangle","id":"gateway","text":"API Gateway","subtitle":"[JWT]","x":300,"y":200,"width":170,"height":90,"fillColor":"gateway"},
 {"type":"rectangle","id":"tx_engine","text":"Transaction Engine","x":520,"y":200,"width":170,"height":90,"fillColor":"logic"},
 {"type":"rectangle","id":"ledger_db","text":"Ledger DB","subtitle":"[PostgreSQL]","x":740,"y":200,"width":170,"height":90,"fillColor":"db"},
 {"type":"arrow","id":"e1","startId":"client","endId":"gateway","text":"1. Submit"},
 {"type":"arrow","id":"e2","startId":"gateway","endId":"tx_engine","text":"2. Authorize"},
 {"type":"arrow","id":"e3","startId":"tx_engine","endId":"ledger_db","text":"3. Commit"}
]}
\`\`\`

OPTIONAL STYLING:
- \`fillStyle\`: "hachure" (default) | "zigzag" | "cross-hatch" | "solid" | "dots"; \`roughness\` 0-3 (0 = clean vector).
- Fill tokens: "client" (indigo), "gateway" (emerald), "db" (purple), "queue" (orange), "logic" (amber); or a \`palette\` + "terracotta"/"cobalt"/"sage"/"sunflower"/"plum".
- \`subtitle: "[POSTGRES]"\` renders an uppercase monospace micro-badge under the label.

VERIFY BEFORE CLAIMING DONE: after drawing, call \`canvas2d_inspect_shapes\` and confirm \`nodeCount\`/\`edgeCount\` match what you sent. If nodes are missing, re-send them WITH an explicit \`type\` — never fall back to \`canvas_draw\`.
- \`canvas2d_inspect_shapes\`: call BEFORE modifying to see existing layout, node list, and ASCII topology.
- \`canvas2d_modify_shape\`: targeted edits (rename, recolor, reposition) by \`nodeId\` — never redraw everything for small changes.
- \`canvas2d_clear\`: resets the scene graph. Only when the user asks for a fresh canvas.
- Legacy: \`canvas_draw\` (rect/circle/line/text/graph commands) and \`draw_diagram\` (nodes+edges graph)
  render flat pixel history — fine for quick sketches, but shapes are not individually editable.
  \`canvas_clear\` clears legacy drawings.

## Session Artifacts
- \`export_pdf\` generates the executive dual-section PDF (canvas snapshot + chat transcript).
  It FAILS on a blank session — draw something on the canvas or ensure chat messages exist first.

## Conventions
1. Call this guide tool first in a new session, then \`get_chat_history\` for context.
2. Ground answers in \`search_document\` results when a document is loaded; cite page numbers.
3. Inspect (\`canvas2d_inspect_shapes\`) before you modify; never clear unless asked.
4. Draw with \`canvas2d_draw_shapes\`: give EVERY shape a \`type\`, label every connector, use the 4-tier column flow with under ~15 nodes, then verify counts with \`canvas2d_inspect_shapes\` before reporting success.
5. End every task with \`chat_post\` summarizing what you did and what you drew.
`;
