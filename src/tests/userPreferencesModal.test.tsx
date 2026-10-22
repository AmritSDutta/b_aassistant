import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { UserPreferencesModal } from '../components/UserPreferencesModal';

describe('UserPreferencesModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <UserPreferencesModal
        isOpen={false}
        onClose={vi.fn()}
        preferences={[]}
        onAddPreference={vi.fn()}
        onRemovePreference={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title, counter, and existing preferences when open', () => {
    const prefs = ['Prefer Tailwind styling', 'Avoid external icons'];
    const { getByText, getAllByTitle } = render(
      <UserPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        preferences={prefs}
        onAddPreference={vi.fn()}
        onRemovePreference={vi.fn()}
      />
    );

    expect(getByText('User Preferences')).toBeTruthy();
    expect(getByText(/2\s*\/\s*10/)).toBeTruthy();
    expect(getByText('Prefer Tailwind styling')).toBeTruthy();
    expect(getByText('Avoid external icons')).toBeTruthy();
    expect(getAllByTitle('Remove preference')).toHaveLength(2);
  });

  it('updates character counter as user types and adds item', () => {
    const handleAdd = vi.fn().mockReturnValue({ success: true });
    const { getByPlaceholderText, getByText } = render(
      <UserPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        preferences={[]}
        onAddPreference={handleAdd}
        onRemovePreference={vi.fn()}
      />
    );

    const input = getByPlaceholderText('e.g. Always use dark mode for architecture diagrams');
    expect(getByText(/0\s*\/\s*120/)).toBeTruthy();

    fireEvent.change(input, { target: { value: 'Keep diagrams simple' } });
    expect(getByText(/20\s*\/\s*120/)).toBeTruthy();

    const addBtn = getByText('+ Add Preference');
    fireEvent.click(addBtn);

    expect(handleAdd).toHaveBeenCalledWith('Keep diagrams simple');
  });

  it('disables add input and shows 0 slots remaining when 10 items are reached', () => {
    const fullPrefs = Array.from({ length: 10 }, (_, i) => `Pref ${i + 1}`);
    const { getByText, getByPlaceholderText } = render(
      <UserPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        preferences={fullPrefs}
        onAddPreference={vi.fn()}
        onRemovePreference={vi.fn()}
      />
    );

    expect(getByText(/10\s*\/\s*10/)).toBeTruthy();
    expect(getByText(/0 slot\(s\) remaining/)).toBeTruthy();

    const input = getByPlaceholderText('Limit reached (10 max)');
    expect((input as HTMLInputElement).disabled).toBe(true);
  });

  it('calls onRemovePreference when delete button is clicked', () => {
    const handleRemove = vi.fn();
    const { getAllByTitle } = render(
      <UserPreferencesModal
        isOpen={true}
        onClose={vi.fn()}
        preferences={['Pref A', 'Pref B']}
        onAddPreference={vi.fn()}
        onRemovePreference={handleRemove}
      />
    );

    const removeButtons = getAllByTitle('Remove preference');
    fireEvent.click(removeButtons[1]);
    expect(handleRemove).toHaveBeenCalledWith(1);
  });

  it('calls onClose when close or done button is clicked', () => {
    const handleClose = vi.fn();
    const { getByText, getByTitle } = render(
      <UserPreferencesModal
        isOpen={true}
        onClose={handleClose}
        preferences={[]}
        onAddPreference={vi.fn()}
        onRemovePreference={vi.fn()}
      />
    );

    fireEvent.click(getByText('Done'));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(getByTitle('Close'));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
