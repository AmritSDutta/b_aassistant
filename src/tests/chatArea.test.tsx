import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ChatArea, ChatMessage } from '../components/ChatArea';
import { WelcomeModal } from '../components/WelcomeModal';

beforeAll(() => {
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  localStorage.clear();
});

const userMsg: ChatMessage = {
  id: 'u1',
  sender: 'user',
  text: 'Map the system architecture',
  timestamp: 1000,
};

const agentMsg: ChatMessage = {
  id: 'a1',
  sender: 'agent',
  text: 'Drawing the diagram now.',
  timestamp: 2000,
  highlighted: true,
};

describe('ChatArea long-dwell enrichments', () => {
  it('renders messages with sender badges and reading progress bar', () => {
    const { container, getByText } = render(
      <ChatArea messages={[userMsg, agentMsg]} onSendMessage={() => {}} />
    );

    expect(getByText('user:')).toBeTruthy();
    expect(getByText('agent:')).toBeTruthy();
    expect(getByText('Map the system architecture')).toBeTruthy();

    // 2px reading-progress bar present, starting at 0%
    const bar = container.querySelector<HTMLElement>('.sticky.h-\\[2px\\]');
    expect(bar).not.toBeNull();
    expect(bar?.style.width).toBe('0%');
  });

  it('renders user prompt cleanly without any misleading thinking shimmer', () => {
    const { getByText, queryByText, rerender } = render(
      <ChatArea messages={[userMsg]} onSendMessage={() => {}} />
    );
    expect(getByText('Map the system architecture')).toBeTruthy();
    expect(getByText('user:')).toBeTruthy();
    expect(queryByText('agent is thinking')).toBeNull();

    rerender(<ChatArea messages={[userMsg, agentMsg]} onSendMessage={() => {}} />);
    expect(getByText('Drawing the diagram now.')).toBeTruthy();
    expect(queryByText('agent is thinking')).toBeNull();
  });

  it('reports the message id when the star toggle is clicked', () => {
    const onToggleHighlight = vi.fn();
    const { getByLabelText } = render(
      <ChatArea messages={[userMsg]} onSendMessage={() => {}} onToggleHighlight={onToggleHighlight} />
    );

    fireEvent.click(getByLabelText('Highlight this message'));
    expect(onToggleHighlight).toHaveBeenCalledWith('u1');
  });

  it('offers a copy action per message', () => {
    const { getByLabelText } = render(
      <ChatArea messages={[userMsg]} onSendMessage={() => {}} />
    );
    expect(getByLabelText('Copy message')).toBeTruthy();
  });

  it('steps font size with A-/A+ and persists the choice', () => {
    const { container, getByLabelText } = render(
      <ChatArea messages={[userMsg]} onSendMessage={() => {}} />
    );

    const loraBox = container.querySelectorAll('.font-serif.leading-\\[1\\.75\\]')[0] as HTMLElement;
    expect(loraBox.style.fontSize).toBe('17px');

    fireEvent.click(getByLabelText('Increase font size'));
    expect(loraBox.style.fontSize).toBe('19px');
    expect(localStorage.getItem('b_font_size')).toBe('19');

    fireEvent.click(getByLabelText('Decrease font size'));
    expect(loraBox.style.fontSize).toBe('17px');
    expect(localStorage.getItem('b_font_size')).toBe('17');
  });

  it('maximizes the chat as a popup and Escape closes it', () => {
    const { getByLabelText, queryByText } = render(
      <ChatArea messages={[userMsg]} onSendMessage={() => {}} />
    );

    fireEvent.click(getByLabelText('Maximize chat'));
    expect(queryByText('✕ close')).toBeTruthy();
    // Message renders in both the docked pane and the popup overlay
    const overlay = document.querySelector('.fixed.inset-0');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Map the system architecture');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByText('✕ close')).toBeNull();
  });
});

describe('WelcomeModal onboarding popup', () => {
  it('is hidden when closed and shows the how-to-use steps when open', () => {
    const { queryByText, rerender, getByText, getAllByText } = render(
      <WelcomeModal isOpen={false} onClose={() => {}} />
    );
    expect(queryByText('How to use bAssistant')).toBeNull();

    rerender(<WelcomeModal isOpen={true} onClose={() => {}} />);
    expect(getByText('How to use bAssistant')).toBeTruthy();
    expect(getByText('Connect via WebMCP Inspector or direct tool calls')).toBeTruthy();
    expect(getByText('Ask questions & visualize')).toBeTruthy();
    expect(getByText('Talk to it live (voice mode)')).toBeTruthy();
    expect(getByText('Add context (Optional)')).toBeTruthy();
    expect(getByText('Export your session')).toBeTruthy();
    expect(getByText('Inspector Tip')).toBeTruthy();
    expect(getAllByText(/WebMCP Inspector/).length).toBeGreaterThanOrEqual(1);
  });

  it('dismisses via the Get started button', () => {
    const onClose = vi.fn();
    const { getByText } = render(<WelcomeModal isOpen={true} onClose={onClose} />);
    fireEvent.click(getByText('Get started'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
