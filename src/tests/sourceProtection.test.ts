import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initSourceProtection } from '../lib/sourceProtection';

describe('Source & Inspection Protection', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    cleanup = null;
  });

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  });

  it('prevents default on right-click contextmenu event', () => {
    const onBlocked = vi.fn();
    cleanup = initSourceProtection({
      disableContextMenu: true,
      onBlocked,
    });

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    const defaultPrevented = !window.dispatchEvent(event);

    expect(defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith('contextmenu');
  });

  it('prevents F12 keydown shortcut for DevTools', () => {
    const onBlocked = vi.fn();
    cleanup = initSourceProtection({
      disableDevToolsShortcuts: true,
      onBlocked,
    });

    const event = new KeyboardEvent('keydown', {
      key: 'F12',
      keyCode: 123,
      bubbles: true,
      cancelable: true,
    });
    const defaultPrevented = !window.dispatchEvent(event);

    expect(defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith('devtools');
  });

  it('prevents Ctrl+Shift+I, Ctrl+Shift+J, and Ctrl+Shift+C inspection shortcuts', () => {
    const onBlocked = vi.fn();
    cleanup = initSourceProtection({
      disableDevToolsShortcuts: true,
      onBlocked,
    });

    // Ctrl+Shift+I
    const eventI = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(!window.dispatchEvent(eventI)).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith('devtools');

    // Ctrl+Shift+J
    const eventJ = new KeyboardEvent('keydown', {
      key: 'J',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(!window.dispatchEvent(eventJ)).toBe(true);

    // Ctrl+Shift+C
    const eventC = new KeyboardEvent('keydown', {
      key: 'C',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(!window.dispatchEvent(eventC)).toBe(true);
  });

  it('prevents Ctrl+U (View Page Source) shortcut', () => {
    const onBlocked = vi.fn();
    cleanup = initSourceProtection({
      disableDevToolsShortcuts: true,
      onBlocked,
    });

    const eventU = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const defaultPrevented = !window.dispatchEvent(eventU);

    expect(defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith('viewsource');
  });

  it('prevents Ctrl+S (Save Page) shortcut', () => {
    const onBlocked = vi.fn();
    cleanup = initSourceProtection({
      disableDevToolsShortcuts: true,
      onBlocked,
    });

    const eventS = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    const defaultPrevented = !window.dispatchEvent(eventS);

    expect(defaultPrevented).toBe(true);
    expect(onBlocked).toHaveBeenCalledWith('save');
  });

  it('allows events normally when unmounted/cleaned up', () => {
    cleanup = initSourceProtection({
      disableContextMenu: true,
      disableDevToolsShortcuts: true,
    });
    cleanup();
    cleanup = null;

    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    const dispatched = window.dispatchEvent(event);

    expect(dispatched).toBe(true);
  });
});
