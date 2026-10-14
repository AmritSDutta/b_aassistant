import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryModal } from '../components/HistoryModal';
import { SessionSummary } from '../lib/idbStorage';

describe('HistoryModal Component', () => {
  const sampleSessions: SessionSummary[] = [
    {
      sessionId: 'sess_active',
      firstPrompt: 'Design payment gateway topology',
      turnCount: 3,
      createdAt: 1700000000000,
      latestCreatedAt: 1700000500000,
    },
    {
      sessionId: 'sess_archived',
      firstPrompt: 'Analyze Q3 revenue report',
      turnCount: 1,
      createdAt: 1690000000000,
      latestCreatedAt: 1690000000000,
    },
  ];

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <HistoryModal
        isOpen={false}
        onClose={vi.fn()}
        currentSessionId="sess_active"
        sessions={sampleSessions}
        onRestoreSession={vi.fn()}
        onExportSessionPdf={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders sessions list with active badge and handles actions', () => {
    const onRestore = vi.fn();
    const onExport = vi.fn();
    const onDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <HistoryModal
        isOpen={true}
        onClose={onClose}
        currentSessionId="sess_active"
        sessions={sampleSessions}
        onRestoreSession={onRestore}
        onExportSessionPdf={onExport}
        onDeleteSession={onDelete}
      />
    );

    expect(screen.getByText('Deliberation History')).toBeDefined();
    expect(screen.getByText('Design payment gateway topology')).toBeDefined();
    expect(screen.getByText('Analyze Q3 revenue report')).toBeDefined();
    expect(screen.getByText('Active')).toBeDefined();

    // The archived session has a Restore button
    const restoreBtn = screen.getByText('Restore');
    fireEvent.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith('sess_archived');

    // PDF buttons
    const pdfButtons = screen.getAllByText('PDF');
    expect(pdfButtons.length).toBe(2);
    fireEvent.click(pdfButtons[0]);
    expect(onExport).toHaveBeenCalledWith('sess_active');

    // Delete buttons
    const deleteButtons = screen.getAllByText('Delete');
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[1]);
    expect(onDelete).toHaveBeenCalledWith('sess_archived');

    // Close button
    const closeBtn = screen.getByText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows empty placeholder when no sessions exist', () => {
    render(
      <HistoryModal
        isOpen={true}
        onClose={vi.fn()}
        currentSessionId="sess_1"
        sessions={[]}
        onRestoreSession={vi.fn()}
        onExportSessionPdf={vi.fn()}
        onDeleteSession={vi.fn()}
      />
    );

    expect(screen.getByText(/No saved deliberation sessions found/i)).toBeDefined();
  });
});
