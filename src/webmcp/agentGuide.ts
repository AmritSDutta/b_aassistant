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
  with \`id\`, \`text\`, \`x\`, \`y\`. Default node size is 160x80, so space columns ~220px apart.
  Arrows bind via \`startId\`/\`endId\` and stay attached when nodes move; label them with \`text\`.
  Approved translucent palette: client "rgba(99,102,241,0.18)", gateway "rgba(16,185,129,0.16)",
  db "rgba(168,85,247,0.18)", queue "rgba(251,146,60,0.18)", decision "rgba(250,204,21,0.16)".
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
4. Keep diagrams readable: under ~15 nodes, left-to-right flow, label every arrow.
5. End every task with \`chat_post\` summarizing what you did and what you drew.
`;
