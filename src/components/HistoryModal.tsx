import React from 'react';
import { SessionSummary } from '../lib/idbStorage';
import { humanizeSymbols } from '../lib/symbolHumanizer';

export interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSessionId: string;
  sessions: SessionSummary[];
  onRestoreSession: (sessionId: string) => void;
  onExportSessionPdf: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  currentSessionId,
  sessions,
  onRestoreSession,
  onExportSessionPdf,
  onDeleteSession,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl flex flex-col max-h-[85vh] msg-enter"
        style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.09em]" style={{ color: 'var(--accent)' }}>
                Session Vault
              </span>
              <span className="text-xs text-[var(--ink-soft)] font-mono">({sessions.length} saved)</span>
            </div>
            <h2 className="text-lg font-bold mt-0.5" style={{ fontFamily: "'Lora', Georgia, serif" }}>
              Deliberation History
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md border text-sm transition-colors hover:opacity-80"
            style={{ borderColor: 'var(--line)', color: 'var(--ink-soft)' }}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
              <p className="font-mono text-xs">No saved deliberation sessions found in local browser storage.</p>
              <p className="text-xs mt-1 opacity-75">Send a message or draw on the canvas to begin archiving.</p>
            </div>
          ) : (
            sessions.map((s) => {
              const isActive = s.sessionId === currentSessionId;
              const formattedDate = new Date(s.latestCreatedAt || s.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={s.sessionId}
                  className="p-3.5 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  style={{
                    borderColor: isActive ? 'var(--accent)' : 'var(--line)',
                    background: isActive ? 'var(--panel)' : 'var(--card)',
                  }}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate" title={humanizeSymbols(s.firstPrompt)}>
                        {humanizeSymbols(s.firstPrompt)}
                      </p>
                      {isActive && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase"
                          style={{ background: 'var(--accent)', color: '#ffffff' }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-1 flex items-center gap-3 text-xs font-mono"
                      style={{ color: 'var(--ink-soft)' }}
                    >
                      <span>🔄 {s.turnCount} {s.turnCount === 1 ? 'turn' : 'turns'}</span>
                      <span>•</span>
                      <span>🕒 {formattedDate}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onRestoreSession(s.sessionId)}
                        className="px-2.5 py-1 text-xs font-mono rounded border transition-colors hover:opacity-80"
                        style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                        title="Restore this session to canvas and chat"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onExportSessionPdf(s.sessionId)}
                      className="px-2.5 py-1 text-xs font-mono rounded border transition-colors hover:opacity-80"
                      style={{ borderColor: 'var(--you)', color: 'var(--you)' }}
                      title="Export this archived session as PDF"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSession(s.sessionId)}
                      className="px-2 py-1 text-xs font-mono rounded border transition-colors hover:opacity-80 text-red-500 hover:bg-red-500/10"
                      style={{ borderColor: 'var(--line)' }}
                      title="Delete this session from storage"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3 border-t flex items-center justify-between font-mono text-xs"
          style={{ borderColor: 'var(--line)', background: 'var(--card)' }}
        >
          <span style={{ color: 'var(--ink-soft)' }}>
            All sessions persist locally inside client-side IndexedDB
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs font-semibold transition-colors"
            style={{ background: 'var(--ink)', color: 'var(--paper)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
