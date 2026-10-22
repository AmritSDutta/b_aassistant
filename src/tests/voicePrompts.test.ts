import { describe, it, expect } from 'vitest';
import {
  VOICE_LIVE_AGENT_PROMPT_TEMPLATE,
  SUBAGENT_SYSTEM_PROMPT_TEMPLATE,
  getCurrentDateString,
  resolvePromptWithCurrentDate,
  getVoiceLiveSystemPrompt,
  getSubagentSystemPrompt,
} from '../voice/prompts';

describe('voicePrompts (Centralized & Date-Anchored)', () => {
  it('contains the {current_date} temporal anchor in both templates', () => {
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain('{current_date}');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('{current_date}');
  });

  it('embeds the complete WebMCP tool suite and Voice Bridge Tools in the Live Voice Agent template', () => {
    const requiredTools = [
      'search_web',
      'search_research',
      'search_document',
      'get_reference_url',
      'clean_document',
      'canvas2d_clear',
      'calculate',
      'export_pdf',
      'chat_post',
      'get_chat_history',
      'get_tool_usage_prompt',
    ];
    for (const tool of requiredTools) {
      expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain(tool);
    }
    // Tier 1 never draws shapes itself — visual tools belong to the background subagent
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('canvas2d_draw_shapes');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('canvas2d_inspect_shapes');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('canvas2d_modify_shape');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain('Voice Bridge Tools');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain('generate_diagram_and_explanation');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain('get_background_task_status');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).toContain('Usage Pattern:');
  });

  it('embeds the complete WebMCP tool suite and Canvas2D schema in the Subagent template, omitting Bridge tools', () => {
    const requiredTools = [
      'search_web',
      'search_research',
      'search_document',
      'get_reference_url',
      'clean_document',
      'canvas2d_draw_shapes',
      'canvas2d_inspect_shapes',
      'canvas2d_modify_shape',
      'canvas2d_clear',
      'calculate',
      'export_pdf',
      'chat_post',
      'get_chat_history',
      'get_tool_usage_prompt',
    ];
    for (const tool of requiredTools) {
      expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain(tool);
    }
    // Subagent should NOT contain generate_diagram_and_explanation
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).not.toContain('generate_diagram_and_explanation');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('shapes');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('rectangle');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('arrow');
  });

  it('identifies subagent as general-purpose agent with tech product architecting specialization', () => {
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('general-purpose autonomous agent');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).toContain('architecting tech products');
  });

  it('formats dates in ISO YYYY-MM-DD format', () => {
    const testDate = new Date('2026-10-21T12:00:00Z');
    const formatted = getCurrentDateString(testDate);
    expect(formatted).toBe('2026-10-21');
  });

  it('dynamically replaces {current_date} with the resolved date', () => {
    const customDate = '2026-10-21';
    const livePrompt = getVoiceLiveSystemPrompt(customDate);
    const subagentPrompt = getSubagentSystemPrompt(customDate);

    expect(livePrompt).toContain('You are working as of: 2026-10-21.');
    expect(livePrompt).not.toContain('{current_date}');

    expect(subagentPrompt).toContain('You are working as of: 2026-10-21.');
    expect(subagentPrompt).not.toContain('{current_date}');
  });

  it('resolves live and subagent system prompts with today date by default', () => {
    const today = getCurrentDateString();
    const livePrompt = getVoiceLiveSystemPrompt();
    const subagentPrompt = getSubagentSystemPrompt();

    expect(livePrompt).toContain(`You are working as of: ${today}.`);
    expect(subagentPrompt).toContain(`You are working as of: ${today}.`);
  });

  it('does not leak internal library implementation jargon into prompts', () => {
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('Rough.js');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('Bézier');
    expect(VOICE_LIVE_AGENT_PROMPT_TEMPLATE).not.toContain('Tavily');

    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).not.toContain('Rough.js');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).not.toContain('Bézier');
    expect(SUBAGENT_SYSTEM_PROMPT_TEMPLATE).not.toContain('Tavily');
  });
});
