import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { ReferenceUrls } from '../components/ReferenceUrls';

describe('ReferenceUrls Component', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders empty state correctly with 0/10 badge', () => {
    const onAdd = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn();

    render(<ReferenceUrls urls={[]} onAddUrl={onAdd} onRemoveUrl={onRemove} />);

    expect(screen.getByText('REFERENCE URLS')).toBeDefined();
    expect(screen.getByText('0/10')).toBeDefined();
    expect(screen.getByText(/No reference URLs/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /Add reference URL/i })).toBeDefined();
  });

  it('renders list of URLs and calls onRemoveUrl when ✕ is clicked', () => {
    const urls = ['https://example.com/api', 'https://docs.vite.dev'];
    const onAdd = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn();

    render(<ReferenceUrls urls={urls} onAddUrl={onAdd} onRemoveUrl={onRemove} />);

    expect(screen.getByText('2/10')).toBeDefined();
    expect(screen.getByText('https://example.com/api')).toBeDefined();
    expect(screen.getByText('https://docs.vite.dev')).toBeDefined();

    const removeButtons = screen.getAllByRole('button', { name: /Remove/i });
    expect(removeButtons).toHaveLength(2);

    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('https://example.com/api');
  });

  it('opens modal, validates input, checks reachability and calls onAddUrl', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      type: 'opaque',
      status: 0,
      ok: false,
    } as Response);

    const onAdd = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn();

    render(<ReferenceUrls urls={[]} onAddUrl={onAdd} onRemoveUrl={onRemove} />);

    // Click + Add
    fireEvent.click(screen.getByRole('button', { name: /Add reference URL/i }));
    expect(screen.getByRole('heading', { name: /Add Reference URL/i })).toBeDefined();

    // Type URL
    const input = screen.getByPlaceholderText('https://docs.example.com/api');
    fireEvent.change(input, { target: { value: 'https://docs.example.com/api' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Verify & Add/i }));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith('https://docs.example.com/api');
    });
  });

  it('disables + Add button when limit of 10 is reached', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://site${i}.com`);
    const onAdd = vi.fn().mockResolvedValue(true);
    const onRemove = vi.fn();

    render(<ReferenceUrls urls={urls} onAddUrl={onAdd} onRemoveUrl={onRemove} />);

    expect(screen.getByText('10/10')).toBeDefined();
    const addBtn = screen.getByRole('button', { name: /Add reference URL/i }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
  });
});
