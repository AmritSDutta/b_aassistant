import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { VoiceSettingsModal } from '../voice/components/VoiceSettingsModal';

describe('VoiceSettingsModal', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders modal with default Gemini settings when open', () => {
    const { getByText, getByDisplayValue } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSy12345"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        onSave={vi.fn()}
      />
    );

    expect(getByText('Voice & Subagent Settings')).toBeTruthy();
    expect(getByText('Tier 1: Live Voice Conversation')).toBeTruthy();
    expect(getByText('Tier 2: Background Diagram & Text Subagent')).toBeTruthy();
    expect(getByDisplayValue('AIzaSy12345')).toBeTruthy();
    expect(getByText('Use Tier 1 Gemini API Key')).toBeTruthy();
  });

  it('reveals dedicated key input when "Use Tier 1 Gemini API Key" is unchecked', () => {
    const { getByLabelText, getAllByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        onSave={vi.fn()}
      />
    );

    const checkbox = getByLabelText('Use Tier 1 Gemini API Key') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    expect(getAllByPlaceholderText('AIzaSy...')).toHaveLength(1);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    // Dedicated input placeholder appears alongside Tier 1 key
    expect(getAllByPlaceholderText('AIzaSy...')).toHaveLength(2);
  });

  it('switches provider and updates model presets and key placeholder', () => {
    const { getByText, getByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        onSave={vi.fn()}
      />
    );

    const providerSelect = document.querySelectorAll('select')[2]; // 3rd select is subagent provider
    fireEvent.change(providerSelect, { target: { value: 'mistral' } });

    expect(getByText('Ministral 14B 2512 (Default)')).toBeTruthy();
    expect(getByPlaceholderText('mis_...')).toBeTruthy();
  });

  it('reveals custom model text input when Custom Model ID is selected', () => {
    const { getByText, getByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        onSave={vi.fn()}
      />
    );

    const modelSelect = document.querySelectorAll('select')[3]; // 4th select is model
    fireEvent.change(modelSelect, { target: { value: '__custom__' } });

    expect(
      getByPlaceholderText('Enter arbitrary model string (e.g. meta-llama/llama-3.3-70b-instruct)')
    ).toBeTruthy();
  });

  it('executes Quick Test and enables Save Settings on success', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
      }),
    });

    const handleSave = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        mistralKey=""
        onSave={handleSave}
      />
    );

    // Switch to mistral -> dirty
    const providerSelect = document.querySelectorAll('select')[2];
    fireEvent.change(providerSelect, { target: { value: 'mistral' } });

    const keyInput = getByPlaceholderText('mis_...');
    fireEvent.change(keyInput, { target: { value: 'valid-mistral-key' } });

    const saveBtn = getByText('Save Settings') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);

    const testBtn = getByText('⚡ Run Quick Test');
    await act(async () => {
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(getByText(/Connection verified/)).toBeTruthy();
    });

    expect(saveBtn.disabled).toBe(false);

    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        subagentProvider: 'mistral',
        mistralKey: 'valid-mistral-key',
        subagentModel: 'ministral-14b-2512',
      })
    );
  });

  it('switches to Requesty AI, renders Router Base URL indicator and saves requesty settings', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
      }),
    });

    const handleSave = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        requestyKey=""
        onSave={handleSave}
      />
    );

    const providerSelect = document.querySelectorAll('select')[2];
    fireEvent.change(providerSelect, { target: { value: 'requesty' } });

    expect(getByText('Google Gemma 4 31B IT (Default)')).toBeTruthy();
    expect(getByText(/https:\/\/router\.requesty\.ai\/v1/)).toBeTruthy();
    expect(getByPlaceholderText('req_...')).toBeTruthy();

    const keyInput = getByPlaceholderText('req_...');
    fireEvent.change(keyInput, { target: { value: 'req_live_key' } });

    const testBtn = getByText('⚡ Run Quick Test');
    await act(async () => {
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(getByText(/Connection verified/)).toBeTruthy();
    });

    const saveBtn = getByText('Save Settings');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        subagentProvider: 'requesty',
        requestyKey: 'req_live_key',
        subagentModel: 'google/gemma-4-31b-it',
      })
    );
  });

  it('switches to OpenAI provider, shows gpt-6-luna default and saves openai settings', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'OK' } }],
      }),
    });

    const handleSave = vi.fn();
    const { getByText, getByPlaceholderText } = render(
      <VoiceSettingsModal
        isOpen={true}
        onClose={vi.fn()}
        apiKey="AIzaSyTier1"
        liveModel="gemini-3.8-live"
        studioVoice="Puck"
        subagentProvider="gemini"
        subagentModel="gemini-3.5-flash-lite"
        useTier1GeminiKey={true}
        openaiKey=""
        onSave={handleSave}
      />
    );

    const providerSelect = document.querySelectorAll('select')[2];
    fireEvent.change(providerSelect, { target: { value: 'openai' } });

    expect(getByText('GPT-6 Luna (Default)')).toBeTruthy();
    expect(getByPlaceholderText('sk-...')).toBeTruthy();

    const keyInput = getByPlaceholderText('sk-...');
    fireEvent.change(keyInput, { target: { value: 'sk-live-openai-key' } });

    const testBtn = getByText('⚡ Run Quick Test');
    await act(async () => {
      fireEvent.click(testBtn);
    });

    await waitFor(() => {
      expect(getByText(/Connection verified/)).toBeTruthy();
    });

    const saveBtn = getByText('Save Settings');
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        subagentProvider: 'openai',
        openaiKey: 'sk-live-openai-key',
        subagentModel: 'gpt-6-luna',
      })
    );
  });
});
