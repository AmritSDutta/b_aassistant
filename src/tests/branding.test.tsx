import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Branding } from '../components/Branding';

describe('Branding Component', () => {
  it('renders branding elements and theme logo in dark mode', () => {
    const { getByText, getByAltText } = render(
      <Branding theme="dark" onToggleTheme={vi.fn()} />
    );

    expect(getByText('bAssistant')).toBeTruthy();
    expect(getByText('WebMCP enabled')).toBeTruthy();
    expect(getByText('☀ light')).toBeTruthy();

    const logo = getByAltText('bAssistant Logo') as HTMLImageElement;
    expect(logo.src).toContain('bassistant_light.jpg');
  });

  it('renders logo and theme toggle in light mode', () => {
    const { getByText, getByAltText } = render(
      <Branding theme="light" onToggleTheme={vi.fn()} />
    );

    expect(getByText('☾ dark')).toBeTruthy();
    const logo = getByAltText('bAssistant Logo') as HTMLImageElement;
    expect(logo.src).toContain('bassistant_dark.jpg');
  });

  it('renders 2-tiered right-aligned action cluster with Tier 1 utility buttons and Tier 2 preferences button', () => {
    const handleVoice = vi.fn();
    const handleTips = vi.fn();
    const handleTheme = vi.fn();
    const handlePreferences = vi.fn();

    const { getByText, getByTitle, getByLabelText } = render(
      <Branding
        theme="dark"
        onToggleTheme={handleTheme}
        onOpenVoiceSettings={handleVoice}
        onOpenTips={handleTips}
        onOpenPreferences={handlePreferences}
      />
    );

    // Tier 1 Buttons
    const voiceBtn = getByText('🎙️ voice');
    expect(voiceBtn).toBeTruthy();
    fireEvent.click(voiceBtn);
    expect(handleVoice).toHaveBeenCalledTimes(1);

    const tipsBtn = getByText('tips');
    expect(tipsBtn).toBeTruthy();
    fireEvent.click(tipsBtn);
    expect(handleTips).toHaveBeenCalledTimes(1);

    const themeBtn = getByText('☀ light');
    fireEvent.click(themeBtn);
    expect(handleTheme).toHaveBeenCalledTimes(1);

    // Tier 2 Long Single Button
    const prefsBtn = getByLabelText('User Preferences');
    expect(prefsBtn).toBeTruthy();
    expect(getByText('user preferences')).toBeTruthy();
    expect(getByTitle('Open custom user preferences dialog')).toBeTruthy();

    fireEvent.click(prefsBtn);
    expect(handlePreferences).toHaveBeenCalledTimes(1);
  });

  it('omits optional buttons when callbacks are omitted', () => {
    const { queryByText, queryByLabelText } = render(
      <Branding theme="dark" onToggleTheme={vi.fn()} />
    );

    expect(queryByText('🎙️ voice')).toBeNull();
    expect(queryByText('tips')).toBeNull();
    expect(queryByLabelText('User Preferences')).toBeNull();
  });
});
