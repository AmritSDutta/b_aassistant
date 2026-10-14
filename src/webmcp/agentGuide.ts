export const AGENT_TOOL_GUIDE = `# bAssistant Agent Operating Guide

You are operating bAssistant, a 100% client-side Business Analyst cockpit.
This guide explains how to use every other tool correctly. Read it before acting.

## Communication
- \`chat_post\` is the ONLY way the user sees your answers. Always post a clear, final answer when done working.
- \`get_chat_history\` returns the dialogue so far; user messages are prefixed with \`user:\`.

## Document Retrieval
- \`search_document\` queries the user's uploaded document (<1MB PDF/DOC/DOCX) via a BM25 index.
  Pass targeted keywords or topic entities ("authentication", "revenue", "architecture"),
  NOT conversational sentences. Returns the top 3 pages with scores.
- \`clean_document\` wipes all stored document data. Only use this when the user explicitly asks.

## Research, Math & Context
- \`get_reference_url\`: returns a comma-separated list of external reference and documentation URLs added by the user in the sidebar. Use these for external documentation and context.
- \`search_web\` (DuckDuckGo) for general web lookups.
- \`search_research\` (ArXiv) for scientific papers and preprints.
- \`calculate\` for decimal-safe math (e.g. "12.5 * 4.2 + 3.1").

## Visualization (Canvas)
Prefer the structured scene graph tools over legacy drawing:
- \`canvas2d_draw_shapes\`: append nodes (\`rectangle\`, \`ellipse\`, \`diamond\`, \`text\`, \`sticker\`)
  with \`id\`, \`text\`, \`x\`, \`y\`.
  Standard 4-Tier Column Architecture (Left-to-Right Flow):
  * Tier 1: Ingress (X ≈ 60-100) — Clients, Mobile App, Browser, Public Consumers.
  * Tier 2: Gateway & Auth (X ≈ 280-320) — Reverse Proxy, API Gateway, CDN, Rate Limiter.
  * Tier 3: Core / Compute (X ≈ 500-560) — Business Microservices, Workflow Engines, Job Processors.
  * Tier 4: Persistence / Egress (X ≈ 720-800) — Primary DB, Redis Cache, S3 Storage, External APIs.
  Node dimensions are 160x80 px. Vertical spacing between rows should be ~120px (e.g. Y = 80, 200, 320).
  Arrows bind cleanly via \`startId\` and \`endId\` with automatic edge-to-edge docking; label them with \`text\`.
  Approved translucent palette:
  * Ingress: "rgba(99,102,241,0.18)"
  * Gateway: "rgba(16,185,129,0.16)"
  * Core: "rgba(14,165,233,0.18)"
  * Persistence: "rgba(168,85,247,0.18)"
  * Queue / Event: "rgba(251,146,60,0.18)"
  * Decision / Security: "rgba(250,204,21,0.16)"
  The live canvas engine automatically centers and fits viewport to your drawn coordinates.
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
4. Keep diagrams readable: 4-tier column flow, under ~15 nodes, label every connector.
5. End every task with \`chat_post\` summarizing what you did and what you drew.
`;
