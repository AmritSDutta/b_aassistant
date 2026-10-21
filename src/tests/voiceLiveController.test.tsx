import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { VoiceLiveController } from '../voice/components/VoiceLiveController';
import { globalTaskManager } from '../voice/tasks/taskManager';

describe('VoiceLiveController', () => {
  it('renders standby state correctly', () => {
    const { getByTestId, getByText } = render(
      <VoiceLiveController
        status="standby"
        statusText="Standby"
        captionPreview=""
        isListening={false}
        onToggleListening={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(getByText('Voice Standby')).toBeTruthy();
    expect(getByTestId('voice-toggle-btn')).toBeTruthy();
    expect(getByTestId('voice-settings-btn')).toBeTruthy();
  });

  it('renders live listening state and triggers toggle on click', () => {
    const handleToggle = vi.fn();
    const { getByTestId, getByText } = render(
      <VoiceLiveController
        status="listening"
        statusText="Listening"
        captionPreview=""
        isListening={true}
        onToggleListening={handleToggle}
        onOpenSettings={() => {}}
      />
    );

    expect(getByText('Live Listening')).toBeTruthy();
    fireEvent.click(getByTestId('voice-toggle-btn'));
    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('renders speaking and executing states', () => {
    const { getByText, rerender } = render(
      <VoiceLiveController
        status="speaking"
        statusText="Speaking"
        captionPreview=""
        isListening={true}
        onToggleListening={() => {}}
        onOpenSettings={() => {}}
      />
    );
    expect(getByText('Live Speaking')).toBeTruthy();

    rerender(
      <VoiceLiveController
        status="executing"
        statusText="Executing Tool"
        captionPreview=""
        isListening={true}
        onToggleListening={() => {}}
        onOpenSettings={() => {}}
      />
    );
    expect(getByText('Executing Tool')).toBeTruthy();
  });

  it('displays transient caption preview when provided', () => {
    const { getByTestId } = render(
      <VoiceLiveController
        status="listening"
        statusText="Listening"
        captionPreview="You: Design an event-driven architecture"
        isListening={true}
        onToggleListening={() => {}}
        onOpenSettings={() => {}}
      />
    );

    const caption = getByTestId('voice-caption-preview');
    expect(caption.textContent).toBe('You: Design an event-driven architecture');
  });

  it('triggers onOpenSettings when settings gear is clicked', () => {
    const handleOpenSettings = vi.fn();
    const { getByTestId } = render(
      <VoiceLiveController
        status="standby"
        statusText="Standby"
        captionPreview=""
        isListening={false}
        onToggleListening={() => {}}
        onOpenSettings={handleOpenSettings}
      />
    );

    fireEvent.click(getByTestId('voice-settings-btn'));
    expect(handleOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('renders reactive background task badge when a task is in progress', () => {
    globalTaskManager.clearTasks();

    const { getByTestId, queryByTestId } = render(
      <VoiceLiveController
        status="standby"
        statusText="Standby"
        captionPreview=""
        isListening={false}
        onToggleListening={() => {}}
        onOpenSettings={() => {}}
      />
    );

    expect(queryByTestId('voice-bg-task-badge')).toBeNull();

    let task: { id: string } = { id: '' };
    act(() => {
      task = globalTaskManager.createTask('diagram_and_explanation', 'Rendering test');
      globalTaskManager.updateTask(task.id, { status: 'in_progress' });
    });

    expect(getByTestId('voice-bg-task-badge')).toBeTruthy();
    expect(getByTestId('voice-bg-task-badge').textContent).toContain('Drawing Architecture');

    act(() => {
      globalTaskManager.updateTask(task.id, { status: 'completed' });
    });

    expect(queryByTestId('voice-bg-task-badge')).toBeNull();
  });
});
