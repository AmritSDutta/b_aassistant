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
| \`get_user_preferences\` | \`{}\` | Read-only: returns string array of stored user preferences (up to 10 items, max 120 chars each). |
| \`get_current_time\` | \`{}\` | Read-only: returns local date, weekday, time, timezone, and ISO timestamp. |
| \`calculate\` | \`{ expression }\` | Decimal-safe math, e.g. "12.5 * 4.2 + 3.1". |
| \`export_pdf\` | \`{}\` | Build and download the session PDF (canvas snapshot + transcript). |
| \`canvas_draw\` | \`{ command?, commands? }\` | LEGACY flat drawing (rect/circle/line/text/graph) — prefer \`canvas2d_draw_shapes\`. |
| \`draw_diagram\` | \`{ nodes, edges, title?, clearFirst? }\` | LEGACY flat flowchart — prefer \`canvas2d_draw_shapes\`. |
| \`canvas_clear\` | \`{}\` | Clear legacy flat drawings. |

## Document Retrieval
- \`search_document\` queries the user's uploaded document (<2MB PDF/DOC/DOCX/TXT/MD) via a BM25 index.
  Pass targeted keywords or topic entities ("authentication", "revenue", "architecture"),
  NOT conversational sentences. Returns the top 3 pages with scores.
- \`clean_document\` wipes all stored document data. Only use this when the user explicitly asks.

## Research, Math & Context
- \`get_reference_url\`: returns a comma-separated list of external reference and documentation URLs added by the user in the sidebar. Use these for external documentation and context.
- \`get_user_preferences\`: returns string array of custom user guidelines (max 10, max 120 chars each). Always adhere to user preferences during tone selection, formatting, and diagramming.
- \`get_current_time\`: returns the user's current local date, weekday, time, time zone, and ISO timestamp. Use this whenever the user asks for time, date, deadlines, or scheduling.
- \`search_web\` (keyless Tavily AI search as primary with automatic DuckDuckGo fallback) for general web lookups. Returns live results with a \`fetchedAt\` timestamp and \`source\`.
- \`search_research\` (ArXiv) for scientific papers and preprints. Returns results with a \`fetchedAt\` timestamp.
- If a search returns \`unavailable: true\`, the network is unreachable — tell the user you could not retrieve live data and do NOT invent results. Never present search output as fresher than its \`fetchedAt\`.
- \`calculate\` for decimal-safe math (e.g. "12.5 * 4.2 + 3.1").

## Visualization (Canvas & Universal Visual/Technical Engine)
Use \`canvas2d_draw_shapes\` (the structured scene graph). Do NOT use the legacy \`canvas_draw\`/\`draw_diagram\` tools — they draw flat pixels that cannot dock connectors or be edited per shape.

EVERY element MUST include a \`type\`, or the shape is silently DROPPED:

1. Node kinds: \`rectangle\` | \`ellipse\` | \`diamond\` | \`sticker\` | \`text\` | \`polygon\` | \`path\` | \`container\`.
   - Standard: \`{ type, id, text, subtitle?, x, y, width, height, fillColor?, strokeColor?, fillStyle? }\`.
   - Pictorial illustrations:
     * \`path\`: \`{ type: "path", id, d: "M 10 80 Q ... Z", x?, y?, width?, height?, fillColor?, strokeColor? }\` (for trees, clouds, houses, organs, icons).
     * \`polygon\`: \`{ type: "polygon", id, points: [[x1, y1], [x2, y2], ...], fillColor?, strokeColor? }\` (for roofs, delta shapes, benzene rings).
   - UML Class Diagrams: use \`compartments\` on \`rectangle\`: \`{ type: "rectangle", id, compartments: ["ClassName", "- field: type", "+ method(): void"], width: 200, height: 120 }\`.
   - Containers / Subgraphs / Boundaries: \`{ type: "container", id, text: "VPC / Package / Membrane", x, y, width, height, strokeDash: [6, 4] }\`.
2. Connector kinds: \`arrow\` | \`line\`.
   - Fields: \`{ type, id, startId, endId, text?, strokeDash?, arrowhead?, bidirectional? }\`.
   - \`startId\`/\`endId\` dock edge-to-edge automatically to any node or shape bounds.
   - \`strokeDash: [6, 4]\` renders dashed lines (UML sequence lifelines, dependencies, hydrogen bonds).
   - \`arrowhead\`: \`"filled"\` (default) | \`"open"\` (UML association/physics vector) | \`"diamond"\` (UML aggregation/composition) | \`"none"\`.
   - \`bidirectional: true\` renders arrowheads at both ends (equilibrium reactions, bidirectional sync).
3. Coordinates: Give nodes explicit \`width\`/\`height\` or \`points\`.

CANONICAL EXAMPLES:

Architecture Flowchart:
\`\`\`json
{"shapes":[
 {"type":"rectangle","id":"client","text":"Web App","x":80,"y":200,"width":170,"height":90,"fillColor":"client"},
 {"type":"rectangle","id":"gateway","text":"API Gateway","x":300,"y":200,"width":170,"height":90,"fillColor":"gateway"},
 {"type":"arrow","id":"e1","startId":"client","endId":"gateway","text":"HTTPS"}
]}
\`\`\`

Pictorial Illustration (House & Tree):
\`\`\`json
{"shapes":[
 {"type":"polygon","id":"roof","points":[[150,140],[250,60],[350,140]],"fillColor":"terracotta"},
 {"type":"rectangle","id":"wall","text":"House","x":170,"y":140,"width":160,"height":120,"fillColor":"sage"},
 {"type":"rectangle","id":"door","x":230,"y":190,"width":40,"height":70,"fillColor":"sunflower"},
 {"type":"rectangle","id":"trunk","x":440,"y":180,"width":30,"height":80,"fillColor":"plum"},
 {"type":"path","id":"canopy","text":"Tree","d":"M 0 50 C -20 10, 40 -20, 60 10 C 90 -20, 140 10, 120 50 C 140 90, 80 110, 60 80 C 30 110, -20 90, 0 50 Z","x":395,"y":80,"width":120,"height":100,"fillColor":"botanical"}
]}
\`\`\`

UML Class & Sequence:
\`\`\`json
{"shapes":[
 {"type":"rectangle","id":"order_cls","x":80,"y":100,"width":220,"height":140,"compartments":["OrderService","- orderRepo: OrderRepo","- logger: Logger","+ placeOrder(cart): Order","+ cancelOrder(id): bool"],"fillColor":"client"},
 {"type":"rectangle","id":"payment_cls","x":400,"y":100,"width":220,"height":140,"compartments":["PaymentGateway","+ charge(amount): Receipt","+ refund(id): bool"],"fillColor":"gateway"},
 {"type":"arrow","id":"dep1","startId":"order_cls","endId":"payment_cls","text":"uses","strokeDash":[6,4],"arrowhead":"open"}
]}
\`\`\`

Science / Chemical Molecule (Benzene):
\`\`\`json
{"shapes":[
 {"type":"polygon","id":"benzene_ring","text":"C6H6","points":[[300,100],[360,135],[360,205],[300,240],[240,205],[240,135]],"fillColor":"cobalt"},
 {"type":"line","id":"b1","startX":300,"startY":100,"endX":360,"endY":135,"strokeWidth":3},
 {"type":"line","id":"b2","startX":360,"startY":205,"endX":300,"endY":240,"strokeWidth":3},
 {"type":"line","id":"b3","startX":240,"startY":135,"endX":240,"endY":205,"strokeWidth":3}
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
1. Call this guide tool first in a new session, then check \`get_user_preferences\` and \`get_chat_history\` for context and active user rules.
2. Ground answers in \`search_document\` results when a document is loaded; cite page numbers.
3. Inspect (\`canvas2d_inspect_shapes\`) before you modify; never clear unless asked.
4. Draw with \`canvas2d_draw_shapes\`: give EVERY shape a \`type\`, label every connector, use the 4-tier column flow with under ~15 nodes, then verify counts with \`canvas2d_inspect_shapes\` before reporting success.
5. End every task with \`chat_post\` summarizing what you did and what you drew.
`;
